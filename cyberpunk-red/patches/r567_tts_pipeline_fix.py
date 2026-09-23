#!/usr/bin/env python3
from pathlib import Path
import re, sys

if len(sys.argv) != 2:
    raise SystemExit("usage: r567_tts_pipeline_fix.py <android-root>")

root = Path(sys.argv[1])
app = root / "app/src/main/assets/web/app"
src = root / "app/src/main/java/com/braseiro/cyberpunkred"
tts = src / "GeminiTtsService.kt"
gradle = root / "app/build.gradle.kts"
index = app / "index.html"

for p in (tts, gradle, index):
    if not p.is_file():
        raise SystemExit(f"missing required file: {p}")

service = r'''package com.braseiro.cyberpunkred

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import android.util.Base64
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.ExecutionException
import java.util.concurrent.Executors
import java.util.concurrent.Future
import java.util.concurrent.atomic.AtomicLong

/** Native-only Gemini TTS. The API key never crosses the WebView boundary.
 *
 * R5.67 uses a single AudioTrack for the entire narration and prefetches the next Gemini chunk
 * while the current PCM is playing. This avoids both inter-chunk network stalls and truncation
 * caused by stopping/releasing a new AudioTrack immediately after each write.
 */
class GeminiTtsService(
    private val context: Context,
    private val secrets: SecureSecretStore,
) {
    private data class ChunkAudio(val pcm: ByteArray, val cached: Boolean)

    private val orchestrator = Executors.newCachedThreadPool()
    private val synthesisExecutor = Executors.newFixedThreadPool(2)
    private val activeConnections = ConcurrentHashMap.newKeySet<HttpURLConnection>()
    private val generation = AtomicLong(0)

    @Volatile private var audioTrack: AudioTrack? = null
    @Volatile private var state: String = "idle"
    @Volatile private var lastError: String? = null
    @Volatile private var lastCached = false
    @Volatile private var lastChunks = 0

    fun status(): JSONObject = JSONObject()
        .put("state", state)
        .put("cached", lastCached)
        .put("chunks", lastChunks)
        .put("pipeline", "single-track-prefetch-r567")
        .put("error", lastError ?: JSONObject.NULL)

    fun speakAsync(text: String, style: String = "narration"): JSONObject {
        val clean = text.trim()
        require(clean.isNotEmpty()) { "Texto TTS obrigatório" }
        require(clean.length <= 120_000) { "Texto TTS excede o limite de segurança de 120.000 caracteres" }
        val apiKey = secrets.apiKey() ?: error("Configure a chave Gemini em Áudio / Voz")

        val token = generation.incrementAndGet()
        stopPlaybackOnly()
        disconnectActiveRequests()
        state = "queued"
        lastError = null
        lastCached = false
        lastChunks = 0

        orchestrator.execute {
            try {
                if (token != generation.get()) return@execute
                streamLongNarration(
                    token = token,
                    apiKey = apiKey,
                    model = secrets.ttsModel(),
                    voice = secrets.ttsVoice(),
                    language = secrets.ttsLanguage(),
                    style = style,
                    text = clean,
                )
            } catch (t: Throwable) {
                if (token == generation.get()) {
                    val cause = if (t is ExecutionException) t.cause ?: t else t
                    lastError = (cause.message ?: cause.javaClass.simpleName).take(400)
                    state = "error"
                }
            }
        }
        return JSONObject()
            .put("ok", true)
            .put("queued", true)
            .put("pipeline", "single-track-prefetch-r567")
    }

    fun stop(): JSONObject {
        generation.incrementAndGet()
        disconnectActiveRequests()
        stopPlaybackOnly()
        state = "idle"
        return JSONObject().put("ok", true).put("state", state)
    }

    fun close() {
        stop()
        orchestrator.shutdownNow()
        synthesisExecutor.shutdownNow()
    }

    private fun cacheFile(model: String, voice: String, language: String, style: String, text: String): File {
        val digest = MessageDigest.getInstance("SHA-256")
            .digest("$model\n$voice\n$language\n$style\n$text".toByteArray())
            .joinToString("") { "%02x".format(it) }
        return File(context.cacheDir, "gemini-tts/$digest.pcm")
    }

    /** Fast first audio + larger following chunks. */
    internal fun splitForStreaming(text: String): List<String> {
        val clean = text.trim()
        if (clean.length <= 760) return listOf(clean)
        val firstParts = splitForTts(clean, 320)
        val first = firstParts.first()
        val rest = clean.substring(first.length).trimStart()
        return buildList {
            add(first)
            if (rest.isNotBlank()) addAll(splitForTts(rest, 760))
        }.filter { it.isNotBlank() }
    }

    internal fun splitForTts(text: String, maxChars: Int = 760): List<String> {
        val clean = text.trim()
        if (clean.length <= maxChars) return listOf(clean)
        val chunks = mutableListOf<String>()
        var rest = clean
        while (rest.length > maxChars) {
            val window = rest.substring(0, maxChars + 1)
            val candidates = listOf(
                window.lastIndexOf("\n\n"),
                window.lastIndexOf(". "),
                window.lastIndexOf("! "),
                window.lastIndexOf("? "),
                window.lastIndexOf("\n"),
                window.lastIndexOf(" "),
            )
            val cut = candidates.firstOrNull { it >= maxChars / 2 } ?: maxChars
            val end = if (cut < window.length && window[cut] in charArrayOf('.', '!', '?')) cut + 1 else cut
            chunks += rest.substring(0, end).trim()
            rest = rest.substring(end).trimStart()
        }
        if (rest.isNotBlank()) chunks += rest
        return chunks.filter { it.isNotBlank() }
    }

    private fun streamLongNarration(
        token: Long,
        apiKey: String,
        model: String,
        voice: String,
        language: String,
        style: String,
        text: String,
    ) {
        val chunks = splitForStreaming(text)
        require(chunks.isNotEmpty()) { "Nenhum bloco TTS foi produzido" }
        lastChunks = chunks.size

        state = "generating 1/${chunks.size}"
        var currentFuture: Future<ChunkAudio> = submitChunk(
            apiKey, model, voice, language, style, chunks[0]
        )

        var current = awaitChunk(currentFuture)
        if (token != generation.get()) return

        val track = newAudioTrack()
        audioTrack = track
        track.play()
        var cacheHits = 0
        var totalFramesWritten = 0L

        try {
            for (index in chunks.indices) {
                if (token != generation.get()) return

                if (index > 0) {
                    state = "buffering ${index + 1}/${chunks.size}"
                    current = awaitChunk(currentFuture)
                    if (token != generation.get()) return
                }

                val nextFuture = if (index + 1 < chunks.size) {
                    submitChunk(apiKey, model, voice, language, style, chunks[index + 1])
                } else null

                if (current.cached) cacheHits++
                lastCached = cacheHits == index + 1
                state = "playing ${index + 1}/${chunks.size}"

                writePcm(track, token, current.pcm)
                totalFramesWritten += current.pcm.size / 2L

                if (nextFuture != null) currentFuture = nextFuture
            }

            drainPlayback(track, token, totalFramesWritten)
            if (token == generation.get()) state = "idle"
        } finally {
            if (audioTrack === track) audioTrack = null
            runCatching { track.stop() }
            runCatching { track.release() }
        }
    }

    private fun submitChunk(
        apiKey: String,
        model: String,
        voice: String,
        language: String,
        style: String,
        text: String,
    ): Future<ChunkAudio> = synthesisExecutor.submit<ChunkAudio> {
        val cache = cacheFile(model, voice, language, style, text)
        if (cache.isFile && cache.length() >= MIN_PCM_BYTES && cache.length() % 2L == 0L) {
            return@submit ChunkAudio(cache.readBytes(), true)
        }
        if (cache.exists()) runCatching { cache.delete() }

        val pcm = synthesizePcm(apiKey, model, voice, language, style, text)
        require(pcm.size >= MIN_PCM_BYTES && pcm.size % 2 == 0) {
            "Gemini TTS retornou PCM inválido (${pcm.size} bytes)"
        }
        cache.parentFile?.mkdirs()
        cache.writeBytes(pcm)
        ChunkAudio(pcm, false)
    }

    private fun awaitChunk(future: Future<ChunkAudio>): ChunkAudio = try {
        future.get()
    } catch (e: ExecutionException) {
        throw (e.cause ?: e)
    }

    private fun synthesizePcm(
        apiKey: String,
        model: String,
        voice: String,
        language: String,
        style: String,
        text: String,
    ): ByteArray {
        val endpoint = URL("https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent")
        val conn = endpoint.openConnection() as HttpURLConnection
        activeConnections.add(conn)
        try {
            conn.requestMethod = "POST"
            conn.connectTimeout = 15_000
            conn.readTimeout = 75_000
            conn.doOutput = true
            conn.setRequestProperty("Content-Type", "application/json")
            conn.setRequestProperty("x-goog-api-key", apiKey)

            val prompt = when (style.lowercase()) {
                "dialogue" -> "Leia em português brasileiro, como diálogo natural de Night City, sem anunciar instruções: $text"
                "urgent" -> "Leia em português brasileiro com urgência controlada e dicção clara, sem anunciar instruções: $text"
                else -> "Narre em português brasileiro, tom informativo e cinematográfico, ritmo natural, sem anunciar instruções: $text"
            }
            val body = JSONObject()
                .put("contents", JSONArray().put(JSONObject()
                    .put("parts", JSONArray().put(JSONObject().put("text", prompt)))))
                .put("generationConfig", JSONObject()
                    .put("responseModalities", JSONArray().put("AUDIO"))
                    .put("speechConfig", JSONObject()
                        .put("languageCode", language)
                        .put("voiceConfig", JSONObject()
                            .put("prebuiltVoiceConfig", JSONObject().put("voiceName", voice)))))

            conn.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
            val code = conn.responseCode
            val raw = (if (code in 200..299) conn.inputStream else conn.errorStream)
                ?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()

            if (code !in 200..299) {
                val message = runCatching {
                    JSONObject(raw).optJSONObject("error")?.optString("message")
                }.getOrNull()
                error("Gemini TTS HTTP $code${message?.let { ": $it" } ?: ""}")
            }

            val root = JSONObject(raw)
            val data = root.optJSONArray("candidates")?.optJSONObject(0)
                ?.optJSONObject("content")?.optJSONArray("parts")?.optJSONObject(0)
                ?.optJSONObject("inlineData")?.optString("data")
                ?.takeIf { it.isNotBlank() }
                ?: error("Gemini TTS não retornou áudio")

            return Base64.decode(data, Base64.DEFAULT)
        } finally {
            activeConnections.remove(conn)
            runCatching { conn.disconnect() }
        }
    }

    private fun newAudioTrack(): AudioTrack {
        val min = AudioTrack.getMinBufferSize(
            SAMPLE_RATE,
            AudioFormat.CHANNEL_OUT_MONO,
            AudioFormat.ENCODING_PCM_16BIT,
        )
        require(min > 0) { "AudioTrack buffer inválido: $min" }
        return AudioTrack(
            AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                .build(),
            AudioFormat.Builder()
                .setSampleRate(SAMPLE_RATE)
                .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                .build(),
            maxOf(min, 32_768),
            AudioTrack.MODE_STREAM,
            AudioManager.AUDIO_SESSION_ID_GENERATE,
        ).also {
            require(it.state == AudioTrack.STATE_INITIALIZED) { "AudioTrack não inicializou" }
        }
    }

    private fun writePcm(track: AudioTrack, token: Long, pcm: ByteArray) {
        var offset = 0
        while (offset < pcm.size && token == generation.get()) {
            val count = track.write(
                pcm,
                offset,
                minOf(16_384, pcm.size - offset),
                AudioTrack.WRITE_BLOCKING,
            )
            require(count > 0) { "AudioTrack recusou PCM ($count)" }
            offset += count
        }
    }

    private fun drainPlayback(track: AudioTrack, token: Long, expectedFrames: Long) {
        if (token != generation.get() || expectedFrames <= 0L) return
        val durationMs = ((expectedFrames * 1000L) / SAMPLE_RATE).coerceAtLeast(250L)
        val deadline = System.nanoTime() + (durationMs + 2_000L) * 1_000_000L
        while (token == generation.get() && System.nanoTime() < deadline) {
            val played = track.playbackHeadPosition.toLong() and 0xffffffffL
            if (played >= expectedFrames) return
            Thread.sleep(12L)
        }
    }

    private fun disconnectActiveRequests() {
        activeConnections.toList().forEach { conn ->
            runCatching { conn.disconnect() }
        }
        activeConnections.clear()
    }

    private fun stopPlaybackOnly() {
        val current = audioTrack
        audioTrack = null
        if (current != null) {
            runCatching { current.pause() }
            runCatching { current.flush() }
            runCatching { current.stop() }
            runCatching { current.release() }
        }
    }

    private companion object {
        const val SAMPLE_RATE = 24_000
        const val MIN_PCM_BYTES = 4_800
    }
}
'''

tts.write_text(service, encoding="utf-8")

g = gradle.read_text(encoding="utf-8")
g = re.sub(r"versionCode\s*=\s*\d+", "versionCode = 4167", g)
g = re.sub(r'versionName\s*=\s*"[^"]+"', 'versionName = "4.1.67"', g)
gradle.write_text(g, encoding="utf-8")

h = index.read_text(encoding="utf-8")
h = re.sub(r"app\.js\?build=\d+", "app.js?build=4167", h)
index.write_text(h, encoding="utf-8")

out = tts.read_text(encoding="utf-8")
assert 'single-track-prefetch-r567' in out
assert 'splitForStreaming' in out
assert 'submitChunk' in out
assert 'disconnectActiveRequests' in out
assert 'AudioTrack.WRITE_BLOCKING' in out
assert 'drainPlayback' in out
assert 'newSingleThreadExecutor' not in out
assert "versionCode = 4167" in gradle.read_text(encoding="utf-8")
assert 'versionName = "4.1.67"' in gradle.read_text(encoding="utf-8")
assert "app.js?build=4167" in index.read_text(encoding="utf-8")

print("R5_67_TTS_PIPELINE_FIX_APPLIED")
