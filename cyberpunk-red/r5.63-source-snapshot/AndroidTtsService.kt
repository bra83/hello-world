package com.braseiro.cyberpunkred

import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.util.Locale
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicLong

/**
 * Universal TTS V3 Device & Kokoro Neural TTS Service.
 *
 * Explicitly detects installed Android TTS engines including Braseiro Kokoro PT-BR
 * (com.k2fsa.sherpa.onnx.tts.engine / .debug / com.braseiro.kokoro.ptbr), supports engine switching,
 * speed control, vocal tag stripping, and real callback-driven sequential playback.
 */
class AndroidTtsService(private val context: Context) {
    companion object {
        const val TAG = "CPRED_TTS"

        val KOKORO_PACKAGES = listOf(
            "com.k2fsa.sherpa.onnx.tts.engine",
            "com.k2fsa.sherpa.onnx.tts.engine.debug",
            "com.braseiro.kokoro.ptbr",
            "com.braseiro.kokoro.tts",
        )

        private val VOCAL_TAG_REGEX = Regex(
            """(\[(?:sigh|laughs?|chuckle|gasp|whispering|shouting|pause|short pause|long pause|clears throat|cough|breath|groan|grunt|sussurro|risos?|suspiro|pausa|pausa curta|pausa longa|tosse|grito)\]|<(?:short pause|long pause|sigh|laugh|whisper|emphasis)>)""",
            RegexOption.IGNORE_CASE
        )

        fun stripVocalTags(input: String): String =
            VOCAL_TAG_REGEX.replace(input, " ").replace(Regex("\\s{2,}"), " ").trim()
    }

    private val generation = AtomicLong(0)
    @Volatile private var readyLatch = CountDownLatch(1)
    @Volatile private var ready = false
    @Volatile private var state = "initializing"
    @Volatile private var lastError: String? = null
    @Volatile private var lastUtteranceId: String? = null
    @Volatile private var currentUtteranceId: String? = null
    @Volatile private var lastCompletedUtteranceId: String? = null
    @Volatile private var totalChunksQueued: Int = 0
    @Volatile private var startedChunksCount: Int = 0
    @Volatile private var completedChunksCount: Int = 0
    @Volatile private var currentChunkIndex: Int = 0
    @Volatile private var interrupted: Boolean = false
    @Volatile private var interruptedAtChunk: Int = 0
    @Volatile private var pendingChunks: List<String> = emptyList()
    @Volatile private var activeSequenceNonce: Long = 0
    private val chunkEvents = java.util.concurrent.CopyOnWriteArrayList<String>()
    @Volatile private var activeEnginePackage: String? = null
    @Volatile private var tts: TextToSpeech = createEngine(null)

    private fun createEngine(enginePackage: String?): TextToSpeech {
        val latch = CountDownLatch(1)
        readyLatch = latch
        ready = false
        state = "initializing"
        val listener = TextToSpeech.OnInitListener { status ->
            ready = status == TextToSpeech.SUCCESS
            state = if (ready) "idle" else "error"
            if (!ready) {
                lastError = "Android TTS não inicializou (código $status)"
                Log.e(TAG, "TTS init error for package $enginePackage: $lastError")
            } else {
                Log.i(TAG, "TTS engine successfully initialized for package: $enginePackage")
            }
            latch.countDown()
        }
        val instance = if (enginePackage.isNullOrBlank()) {
            TextToSpeech(context.applicationContext, listener)
        } else {
            TextToSpeech(context.applicationContext, listener, enginePackage)
        }
        activeEnginePackage = enginePackage
        instance.setAudioAttributes(
            AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                .build()
        )
        instance.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
            override fun onStart(utteranceId: String?) {
                val activeGen = "cpred-${generation.get()}-"
                if (utteranceId?.startsWith(activeGen) == true) {
                    state = "playing"
                    currentUtteranceId = utteranceId
                    startedChunksCount += 1
                    val parts = utteranceId.removePrefix(activeGen).split("-")
                    currentChunkIndex = parts.firstOrNull()?.toIntOrNull() ?: startedChunksCount
                    chunkEvents.add("start:$utteranceId")
                    Log.i(TAG, "onStart callback: utteranceId=$utteranceId, chunk=$currentChunkIndex/$totalChunksQueued")
                }
            }
            override fun onDone(utteranceId: String?) {
                val curGen = generation.get()
                val activeGen = "cpred-$curGen-"
                if (utteranceId?.startsWith(activeGen) == true) {
                    completedChunksCount += 1
                    lastCompletedUtteranceId = utteranceId
                    chunkEvents.add("done:$utteranceId")
                    Log.i(TAG, "onDone callback: utteranceId=$utteranceId, completed=$completedChunksCount/$totalChunksQueued")
                    val parts = utteranceId.removePrefix(activeGen).split("-")
                    val completedIdx = parts.firstOrNull()?.toIntOrNull() ?: completedChunksCount
                    val total = parts.getOrNull(1)?.toIntOrNull() ?: totalChunksQueued
                    if (completedIdx < total && !interrupted && curGen == activeSequenceNonce) {
                        val nextIdx = completedIdx + 1
                        val nextChunk = pendingChunks.getOrNull(completedIdx)
                        if (nextChunk != null) {
                            val nextId = "cpred-$curGen-$nextIdx-$total"
                            Log.i(TAG, "onDone -> queueNextChunk: index=$nextIdx/$total, id=$nextId, text='$nextChunk'")
                            val code = tts.speak(nextChunk, TextToSpeech.QUEUE_ADD, Bundle(), nextId)
                            if (code == TextToSpeech.ERROR) {
                                state = "error"
                                lastError = "Android TTS recusou o bloco $nextIdx/$total"
                                chunkEvents.add("error:$nextId")
                                Log.e(TAG, "Failed to enqueue next chunk $nextIdx: $lastError")
                            }
                        } else {
                            state = "idle"
                        }
                    } else if (completedIdx >= total || completedChunksCount >= totalChunksQueued) {
                        state = "idle"
                        Log.i(TAG, "Sequence completed: $completedChunksCount/$totalChunksQueued chunks done. State: idle.")
                    }
                }
            }
            override fun onStop(utteranceId: String?, interruptedFlag: Boolean) {
                interrupted = true
                interruptedAtChunk = maxOf(currentChunkIndex, startedChunksCount)
                chunkEvents.add("stop:${utteranceId ?: "active"}")
                Log.i(TAG, "onStop callback: utteranceId=$utteranceId, interruptedAtChunk=$interruptedAtChunk")
                if (state != "error") state = "idle"
            }
            @Deprecated("Deprecated in Java")
            override fun onError(utteranceId: String?) {
                state = "error"
                lastError = "Falha no mecanismo de voz Android"
                chunkEvents.add("error:${utteranceId ?: "unknown"}")
                Log.e(TAG, "onError callback: utteranceId=$utteranceId")
            }
            override fun onError(utteranceId: String?, errorCode: Int) {
                state = "error"
                lastError = "Falha no mecanismo de voz Android (código $errorCode)"
                chunkEvents.add("error:${utteranceId ?: "unknown"}:$errorCode")
                Log.e(TAG, "onError callback: utteranceId=$utteranceId, code=$errorCode")
            }
        })
        return instance
    }

    fun isKokoroEngine(pkg: String? = null): Boolean {
        val p = pkg ?: activeEnginePackage ?: runCatching { tts.defaultEngine }.getOrNull().orEmpty()
        return p in KOKORO_PACKAGES || p.contains("kokoro", ignoreCase = true) || p.contains("sherpa.onnx", ignoreCase = true)
    }

    @Synchronized
    fun ensureEnginePackage(requestedPackage: String?): Boolean {
        val rawTarget = requestedPackage?.trim()?.takeIf { it.isNotEmpty() }
        // Preserve explicit selection strictly without silent substitution
        val target = rawTarget ?: detectKokoroPackage()
        if (target != activeEnginePackage || !ready) {
            runCatching { tts.stop() }
            runCatching { tts.shutdown() }
            tts = createEngine(target)
        }
        if (awaitReady()) return true
        if (rawTarget == null) {
            val fallbackPkg = detectKokoroPackage()
            if (fallbackPkg != null && fallbackPkg != target) {
                runCatching { tts.stop() }
                runCatching { tts.shutdown() }
                tts = createEngine(fallbackPkg)
                if (awaitReady()) return true
            }
        }
        return ready
    }

    private fun awaitReady(): Boolean {
        if (!ready && state == "initializing") readyLatch.await(12000, TimeUnit.MILLISECONDS)
        return ready
    }

    fun detectKokoroPackage(): String? {
        val pm = context.packageManager
        for (pkg in KOKORO_PACKAGES) {
            val installed = runCatching { pm.getPackageInfo(pkg, 0); true }.getOrDefault(false)
            if (installed) return pkg
        }
        val intent = Intent(TextToSpeech.Engine.INTENT_ACTION_TTS_SERVICE)
        val services = runCatching { pm.queryIntentServices(intent, 0) }.getOrNull().orEmpty()
        for (resolveInfo in services) {
            val pkg = resolveInfo.serviceInfo?.packageName.orEmpty()
            if (pkg.contains("kokoro", ignoreCase = true) || pkg.contains("sherpa.onnx", ignoreCase = true)) {
                return pkg
            }
        }
        if (awaitReady()) {
            for (eng in tts.engines.orEmpty()) {
                val pkg = eng.name.orEmpty()
                if (pkg.contains("kokoro", ignoreCase = true) || pkg.contains("sherpa.onnx", ignoreCase = true)) {
                    return pkg
                }
            }
        }
        return null
    }

    fun installedEngines(): JSONArray {
        awaitReady()
        val pm = context.packageManager
        val seen = mutableSetOf<String>()
        val array = JSONArray()
        val kokoroPkg = detectKokoroPackage()

        if (kokoroPkg != null && seen.add(kokoroPkg)) {
            array.put(
                JSONObject()
                    .put("name", kokoroPkg)
                    .put("packageName", kokoroPkg)
                    .put("label", "Braseiro Kokoro PT-BR • neural")
                    .put("isKokoro", true)
                    .put("installed", true)
            )
        }

        for (eng in tts.engines.orEmpty()) {
            val pkg = eng.name ?: continue
            if (!seen.add(pkg)) continue
            val isKokoro = pkg in KOKORO_PACKAGES || pkg.contains("kokoro", ignoreCase = true) || pkg.contains("sherpa.onnx", ignoreCase = true)
            val label = if (isKokoro) "Braseiro Kokoro PT-BR • neural" else (eng.label ?: pkg)
            array.put(
                JSONObject()
                    .put("name", pkg)
                    .put("packageName", pkg)
                    .put("label", label)
                    .put("isKokoro", isKokoro)
                    .put("installed", true)
            )
        }

        val intent = Intent(TextToSpeech.Engine.INTENT_ACTION_TTS_SERVICE)
        val services = runCatching { pm.queryIntentServices(intent, 0) }.getOrNull().orEmpty()
        for (resolveInfo in services) {
            val pkg = resolveInfo.serviceInfo?.packageName ?: continue
            if (!seen.add(pkg)) continue
            val isKokoro = pkg in KOKORO_PACKAGES || pkg.contains("kokoro", ignoreCase = true) || pkg.contains("sherpa.onnx", ignoreCase = true)
            val appLabel = runCatching { resolveInfo.loadLabel(pm).toString() }.getOrDefault(pkg)
            val label = if (isKokoro) "Braseiro Kokoro PT-BR • neural" else appLabel
            array.put(
                JSONObject()
                    .put("name", pkg)
                    .put("packageName", pkg)
                    .put("label", label)
                    .put("isKokoro", isKokoro)
                    .put("installed", true)
            )
        }
        return array
    }

    fun status(): JSONObject {
        val kokoroPkg = detectKokoroPackage()
        val isSpeaking = (state == "playing" || state == "queued" || (startedChunksCount > completedChunksCount && !interrupted) || runCatching { tts.isSpeaking }.getOrDefault(false)) && state != "idle"
        return JSONObject()
            .put("state", state)
            .put("ready", ready)
            .put("speaking", isSpeaking)
            .put("error", lastError ?: JSONObject.NULL)
            .put("engine", if (activeEnginePackage != null && (activeEnginePackage == kokoroPkg || activeEnginePackage in KOKORO_PACKAGES || activeEnginePackage!!.contains("kokoro") || activeEnginePackage!!.contains("sherpa"))) "kokoro" else "android")
            .put("activeEnginePackage", activeEnginePackage ?: (if (ready) tts.defaultEngine else null) ?: JSONObject.NULL)
            .put("defaultEngine", if (ready) tts.defaultEngine ?: JSONObject.NULL else JSONObject.NULL)
            .put("kokoroInstalled", kokoroPkg != null)
            .put("kokoroPackage", kokoroPkg ?: JSONObject.NULL)
            .put("kokoroLabel", if (kokoroPkg != null) "Braseiro Kokoro PT-BR • neural" else JSONObject.NULL)
            .put("installedEngines", installedEngines())
            .put("voice", if (ready) runCatching { tts.voice?.name }.getOrNull() ?: JSONObject.NULL else JSONObject.NULL)
            .put("language", if (ready) runCatching { tts.voice?.locale?.toLanguageTag() }.getOrNull() ?: JSONObject.NULL else JSONObject.NULL)
            .put("totalChunksQueued", totalChunksQueued)
            .put("startedChunksCount", startedChunksCount)
            .put("completedChunksCount", completedChunksCount)
            .put("currentChunkIndex", currentChunkIndex)
            .put("currentUtteranceId", currentUtteranceId ?: JSONObject.NULL)
            .put("lastCompletedUtteranceId", lastCompletedUtteranceId ?: JSONObject.NULL)
            .put("interrupted", interrupted)
            .put("interruptedAtChunk", interruptedAtChunk)
            .put("chunkEvents", JSONArray(chunkEvents))
    }

    fun voices(): JSONArray {
        if (!awaitReady()) return JSONArray()
        val rows = runCatching { tts.voices }.getOrNull().orEmpty()
            .sortedWith(
                compareByDescending<android.speech.tts.Voice> {
                    val tag = it.locale?.toLanguageTag().orEmpty().lowercase()
                    when {
                        tag == "pt-br" -> 3
                        tag.startsWith("pt") -> 2
                        else -> 1
                    }
                }.thenByDescending { it.quality }.thenBy { it.name }
            )
        return JSONArray().apply {
            rows.forEach { voice ->
                put(JSONObject()
                    .put("name", voice.name)
                    .put("locale", voice.locale?.toLanguageTag().orEmpty())
                    .put("quality", voice.quality)
                    .put("latency", voice.latency)
                    .put("networkRequired", voice.isNetworkConnectionRequired))
            }
        }
    }

    fun speakAsync(
        text: String,
        voiceName: String?,
        language: String,
        style: String = "narration",
        speed: Float = 1.0f,
        stripTags: Boolean = true,
        enginePackage: String? = null,
        maxChunkChars: Int = 140,
    ): JSONObject {
        val rawText = text.trim()
        require(rawText.isNotEmpty()) { "Texto TTS obrigatório" }
        require(rawText.length <= 120_000) { "Texto TTS excede o limite de segurança" }
        val clean = if (stripTags) stripVocalTags(rawText).ifBlank { rawText } else rawText

        if (!ensureEnginePackage(enginePackage)) error(lastError ?: "Android TTS indisponível")

        val nonce = generation.incrementAndGet()
        activeSequenceNonce = nonce
        runCatching { tts.stop() }
        lastError = null
        interrupted = false
        interruptedAtChunk = 0
        startedChunksCount = 0
        completedChunksCount = 0
        currentChunkIndex = 0
        currentUtteranceId = null
        lastCompletedUtteranceId = null
        chunkEvents.clear()

        val isKokoro = isKokoroEngine(activeEnginePackage)
        val locale = runCatching { Locale.forLanguageTag(language.ifBlank { "pt-BR" }) }.getOrDefault(Locale("pt", "BR"))
        fun voiceScore(v: android.speech.tts.Voice): Int {
            val tag = v.locale?.toLanguageTag().orEmpty().lowercase()
            val localeScore = when {
                tag == locale.toLanguageTag().lowercase() -> 20_000
                tag == "pt-br" -> 18_000
                v.locale?.language == locale.language -> 12_000
                v.locale?.language == "pt" -> 10_000
                else -> 0
            }
            val offlineScore = if (v.isNetworkConnectionRequired) 0 else 3_000
            return localeScore + offlineScore + v.quality * 10 - v.latency
        }
        val voicesSet = runCatching { tts.voices }.getOrNull()
        val requested = voiceName?.takeIf { it.isNotBlank() }
        val selected = voicesSet?.firstOrNull { it.name == requested }
            ?: voicesSet?.filter { it.locale?.language == locale.language || it.locale?.language == "pt" }
                ?.maxByOrNull(::voiceScore)
            ?: voicesSet?.maxByOrNull(::voiceScore)
        if (selected != null) {
            runCatching { tts.voice = selected }
        } else if (!isKokoro) {
            val languageResult = tts.setLanguage(locale)
            if (languageResult == TextToSpeech.LANG_MISSING_DATA || languageResult == TextToSpeech.LANG_NOT_SUPPORTED) {
                state = "error"
                lastError = "Nenhuma voz compatível com ${locale.toLanguageTag()} instalada no Android"
                error(lastError!!)
            }
        }

        val clampedSpeed = speed.coerceIn(0.5f, 2.0f)
        when (style.lowercase()) {
            "dialogue" -> { tts.setSpeechRate((1.02f * clampedSpeed).coerceIn(0.5f, 2.0f)); tts.setPitch(0.98f) }
            "urgent" -> { tts.setSpeechRate((1.12f * clampedSpeed).coerceIn(0.5f, 2.0f)); tts.setPitch(1.00f) }
            else -> { tts.setSpeechRate((0.96f * clampedSpeed).coerceIn(0.5f, 2.0f)); tts.setPitch(0.96f) }
        }

        val effectiveMaxChars = maxChunkChars.coerceIn(40, 3400)
        val chunks = splitForTts(clean, effectiveMaxChars)
        totalChunksQueued = chunks.size
        pendingChunks = chunks
        val utteranceIds = JSONArray()
        chunks.forEachIndexed { index, _ ->
            utteranceIds.put("cpred-$nonce-${index + 1}-${chunks.size}")
        }
        lastUtteranceId = "cpred-$nonce-${chunks.size}-${chunks.size}"

        if (chunks.isNotEmpty()) {
            val firstId = "cpred-$nonce-1-${chunks.size}"
            Log.i(TAG, "speakAsync: starting sequence nonce=$nonce, chunks=${chunks.size}, engine=$activeEnginePackage, firstId=$firstId")
            val code = tts.speak(chunks[0], TextToSpeech.QUEUE_FLUSH, Bundle(), firstId)
            if (code == TextToSpeech.ERROR) {
                state = "error"
                lastError = "Android TTS recusou o bloco 1/${chunks.size}"
                error(lastError!!)
            }
            state = "playing"
        }

        val kokoroPkg = detectKokoroPackage()
        val engineLabel = if (activeEnginePackage != null && (activeEnginePackage == kokoroPkg || activeEnginePackage in KOKORO_PACKAGES || activeEnginePackage!!.contains("kokoro") || activeEnginePackage!!.contains("sherpa"))) "kokoro" else "android"
        return JSONObject()
            .put("ok", true)
            .put("queued", true)
            .put("engine", engineLabel)
            .put("enginePackage", activeEnginePackage ?: tts.defaultEngine ?: "default")
            .put("voice", selected?.name ?: "default")
            .put("speed", clampedSpeed)
            .put("chunks", chunks.size)
            .put("utteranceIds", utteranceIds)
            .put("cleanText", clean)
    }

    fun stop(): JSONObject {
        val wasActive = state == "playing" || state == "queued" || runCatching { tts.isSpeaking }.getOrDefault(false) || startedChunksCount > completedChunksCount
        generation.incrementAndGet()
        pendingChunks = emptyList()
        runCatching { tts.stop() }
        interrupted = true
        interruptedAtChunk = maxOf(currentChunkIndex, startedChunksCount)
        chunkEvents.add("manual_stop:chunk=$interruptedAtChunk")
        state = if (ready) "idle" else state
        val kokoroPkg = detectKokoroPackage()
        val engineLabel = if (activeEnginePackage != null && (activeEnginePackage == kokoroPkg || activeEnginePackage in KOKORO_PACKAGES || activeEnginePackage!!.contains("kokoro") || activeEnginePackage!!.contains("sherpa"))) "kokoro" else "android"
        Log.i(TAG, "stop: wasActive=$wasActive, interruptedAtChunk=$interruptedAtChunk, state=$state")
        return JSONObject()
            .put("ok", true)
            .put("interrupted", true)
            .put("wasActive", wasActive)
            .put("speakingAfterStop", false)
            .put("state", state)
            .put("engine", engineLabel)
            .put("activeEnginePackage", activeEnginePackage ?: JSONObject.NULL)
            .put("startedChunksCount", startedChunksCount)
            .put("completedChunksCount", completedChunksCount)
            .put("totalChunksQueued", totalChunksQueued)
            .put("interruptedAtChunk", interruptedAtChunk)
            .put("chunkEvents", JSONArray(chunkEvents))
    }

    fun close() {
        runCatching { tts.stop() }
        runCatching { tts.shutdown() }
    }

    internal fun splitForTts(text: String, maxChars: Int = 140): List<String> {
        val clean = text.trim()
        if (clean.isEmpty()) return emptyList()
        val sentences = clean.split(Regex("(?<=[.!?\\n])\\s+")).map { it.trim() }.filter { it.isNotEmpty() }
        if (sentences.size > 1 && clean.length > maxChars) {
            val grouped = mutableListOf<String>()
            var current = ""
            for (s in sentences) {
                if (current.isEmpty()) {
                    current = s
                } else if (current.length + 1 + s.length <= maxChars) {
                    current = "$current $s"
                } else {
                    grouped += current
                    current = s
                }
            }
            if (current.isNotEmpty()) grouped += current
            return grouped.flatMap { chunk ->
                if (chunk.length <= maxChars) listOf(chunk) else splitLongChunk(chunk, maxChars)
            }
        }
        if (clean.length <= maxChars) return listOf(clean)
        return splitLongChunk(clean, maxChars)
    }

    private fun splitLongChunk(clean: String, maxChars: Int): List<String> {
        val out = mutableListOf<String>()
        var rest = clean
        while (rest.length > maxChars) {
            val window = rest.substring(0, maxChars + 1)
            val cuts = listOf(
                window.lastIndexOf("\n\n"), window.lastIndexOf(". "),
                window.lastIndexOf("! "), window.lastIndexOf("? "),
                window.lastIndexOf("\n"), window.lastIndexOf(" ")
            )
            val cut = cuts.firstOrNull { it >= maxChars / 2 } ?: maxChars
            val end = if (cut < window.length && window[cut] in charArrayOf('.', '!', '?')) cut + 1 else cut
            out += rest.substring(0, end).trim()
            rest = rest.substring(end).trimStart()
        }
        if (rest.isNotBlank()) out += rest
        return out.filter { it.isNotBlank() }
    }
}
