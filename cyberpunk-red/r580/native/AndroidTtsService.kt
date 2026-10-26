package com.braseiro.cyberpunkred

import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.provider.Settings
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
 * (real Sherpa release/debug services; legacy aliases are migrated by policy), supports engine switching,
 * speed control, vocal tag stripping, and real callback-driven sequential playback.
 */
class AndroidTtsService(private val context: Context) {
    companion object {
        const val TAG = "CPRED_TTS"

        val KOKORO_PACKAGES = listOf(
            BraseiroAndroidTtsPolicy.RELEASE,
            "com.k2fsa.sherpa.onnx.tts.engine.debug",
        )

        private val VOCAL_TAG_REGEX = Regex(
            """(\[(?:sigh|laughs?|chuckle|gasp|whispering|shouting|pause|short pause|long pause|clears throat|cough|breath|groan|grunt|sussurro|risos?|suspiro|pausa|pausa curta|pausa longa|tosse|grito)\]|<(?:short pause|long pause|sigh|laugh|whisper|emphasis)>)""",
            RegexOption.IGNORE_CASE
        )

        fun stripVocalTags(input: String): String =
            NativeNarrationPlan.spoken(VOCAL_TAG_REGEX.replace(input, " "))
    }

    private val generation = AtomicLong(0)
    private val sequenceLock=Any()
    private val completedIds=java.util.concurrent.ConcurrentHashMap.newKeySet<String>()
    @Volatile private var readyLatch = CountDownLatch(1)
    @Volatile private var ready = false
    @Volatile private var state = "idle"
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
    @Volatile private var instance: TextToSpeech? = null
    private val tts: TextToSpeech get() = instance ?: error("Motor Android ainda não inicializado")
    private val engineGeneration = AtomicLong(0)
    @Volatile private var spokenOffset = 0
    @Volatile private var plannedChunks: List<NativeNarrationPlan.Chunk> = emptyList()
    private val audio = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    private val focusListener = AudioManager.OnAudioFocusChangeListener { change ->
        if (change == AudioManager.AUDIOFOCUS_LOSS || change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT) stop()
    }
    @Suppress("DEPRECATION")
    private fun takeFocus() { check(audio.requestAudioFocus(focusListener, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED) { "Foco de áudio indisponível" } }
    @Suppress("DEPRECATION")
    private fun releaseFocus() { audio.abandonAudioFocus(focusListener) }


    private fun createEngine(enginePackage: String?): TextToSpeech {
        val epoch = engineGeneration.incrementAndGet()
        val latch = CountDownLatch(1)
        readyLatch = latch
        ready = false
        lastError = null
        state = "initializing"
        val listener = TextToSpeech.OnInitListener { status ->
            if (epoch != engineGeneration.get()) { latch.countDown(); return@OnInitListener }
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
            override fun onRangeStart(utteranceId: String?, start: Int, end: Int, frame: Int) {
                if (utteranceId?.startsWith("cpred-${generation.get()}-") == true) {
                    val index=utteranceId.removePrefix("cpred-${generation.get()}-").substringBefore("-").toIntOrNull() ?: return
                    spokenOffset=(plannedChunks.getOrNull(index-1)?.offset ?: 0)+start
                }
            }
            override fun onDone(utteranceId: String?) {
                synchronized(sequenceLock) {
                val curGen = generation.get()
                val activeGen = "cpred-$curGen-"
                if (utteranceId?.startsWith(activeGen) == true && completedIds.add(utteranceId)) {
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
                                Log.e(TAG, "Failed to enqueue next chunk $nextIdx: $lastError");releaseFocus()
                            }
                        } else {
                            state = "error"; lastError="Bloco de voz ausente na sequência"; releaseFocus()
                        }
                    } else if (completedIdx >= total || completedChunksCount >= totalChunksQueued) {
                        state = "idle"
                        releaseFocus()
                        Log.i(TAG, "Sequence completed: $completedChunksCount/$totalChunksQueued chunks done. State: idle.")
                    }
                }
            }
            }
            override fun onStop(utteranceId: String?, interruptedFlag: Boolean) {
                if (utteranceId?.startsWith("cpred-${generation.get()}-") != true) return
                interrupted = true
                interruptedAtChunk = maxOf(currentChunkIndex, startedChunksCount)
                chunkEvents.add("stop:${utteranceId ?: "active"}")
                Log.i(TAG, "onStop callback: utteranceId=$utteranceId, interruptedAtChunk=$interruptedAtChunk")
                if (state != "error") state = "stopped"
                releaseFocus()
            }
            @Deprecated("Deprecated in Java")
            override fun onError(utteranceId: String?) {
                if (utteranceId?.startsWith("cpred-${generation.get()}-") != true) return
                state = "error"
                lastError = "Falha no mecanismo de voz Android"
                chunkEvents.add("error:${utteranceId ?: "unknown"}");releaseFocus()
                Log.e(TAG, "onError callback: utteranceId=$utteranceId")
            }
            override fun onError(utteranceId: String?, errorCode: Int) {
                if (utteranceId?.startsWith("cpred-${generation.get()}-") != true) return
                state = "error"
                lastError = "Falha no mecanismo de voz Android (código $errorCode)"
                chunkEvents.add("error:${utteranceId ?: "unknown"}:$errorCode");releaseFocus()
                Log.e(TAG, "onError callback: utteranceId=$utteranceId, code=$errorCode")
            }
        })
        return instance
    }

    fun isKokoroEngine(pkg: String? = null): Boolean {
        val p = pkg ?: activeEnginePackage ?: runCatching { tts.defaultEngine }.getOrNull().orEmpty()
        return p in KOKORO_PACKAGES
    }

    @Synchronized
    fun ensureEnginePackage(requestedPackage: String?): Boolean {
        val target = requestedPackage?.trim()?.takeIf { it.isNotEmpty() }
            ?: Settings.Secure.getString(context.contentResolver, "tts_default_synth")?.takeIf { it.isNotBlank() }
            ?: error("Selecione um serviço de voz Android instalado")
        val available=installedEngines()
        require((0 until available.length()).any { available.getJSONObject(it).getString("packageName")==target }) { "Motor TTS não instalado: $target" }
        if (activeEnginePackage != target && state in listOf("playing","queued")) error("Pare a narração antes de trocar o motor de voz")
        if (instance == null || activeEnginePackage != target || (!ready && state != "initializing")) {
            runCatching { instance?.stop() };runCatching { instance?.shutdown() }
            instance = createEngine(target)
        }
        // Same explicit-package + OnInit policy as the provided Java Activity port.
        // Public Android APIs cannot independently attest which internal service answered.
        return awaitReady()
    }

    private fun awaitReady(): Boolean {
        val epoch=engineGeneration.get();val until=System.nanoTime()+90_000_000_000L
        while (!ready && state == "initializing" && epoch==engineGeneration.get() && System.nanoTime()<until) readyLatch.await(250,TimeUnit.MILLISECONDS)
        if (!ready && state=="initializing" && epoch==engineGeneration.get()) {state="error";lastError="Inicialização neural não terminou. Pare e tente novamente."}
        return ready
    }

    fun detectKokoroPackage(): String? {
        val rows=installedEngines();val packages=(0 until rows.length()).map { rows.getJSONObject(it).getString("packageName") }
        return BraseiroAndroidTtsPolicy.preferredKokoro(packages).takeIf { it.isNotEmpty() }
    }

    // Catalogue discovery never constructs TextToSpeech or loads neural weights.
    fun installedEngines(): JSONArray {
        val pm=context.packageManager
        val services=pm.queryIntentServices(Intent(TextToSpeech.Engine.INTENT_ACTION_TTS_SERVICE),0)
        val seen=mutableSetOf<String>();val out=JSONArray()
        for (row in services) {
            val pkg=row.serviceInfo?.packageName ?: continue
            if (pkg==BraseiroAndroidTtsPolicy.LEGACY || !seen.add(pkg)) continue
            out.put(JSONObject().put("packageName",pkg).put("name",pkg).put("label",row.loadLabel(pm).toString()).put("isKokoro",BraseiroAndroidTtsPolicy.isKokoro(pkg)).put("installed",true))
        }
        return out
    }

    fun validateVoice(name: String?) {
        if (name.isNullOrBlank()) return
        require(ready) { "Aguarde o motor de voz inicializar" }
        require(tts.voices.orEmpty().any { it.name==name }) { "Voz não encontrada no motor selecionado: $name" }
    }

    fun status(): JSONObject {
        val kokoroPkg = detectKokoroPackage()
        val isSpeaking = (state == "playing" || state == "queued" || (startedChunksCount > completedChunksCount && !interrupted) || runCatching { tts.isSpeaking }.getOrDefault(false)) && state in listOf("playing","queued")
        return JSONObject()
            .put("state", state)
            .put("ready", ready)
            .put("speaking", isSpeaking)
            .put("error", lastError ?: JSONObject.NULL)
            .put("engine", if (activeEnginePackage != null && (activeEnginePackage == kokoroPkg || activeEnginePackage in KOKORO_PACKAGES)) "kokoro" else "android")
            .put("activeEnginePackage", activeEnginePackage ?: JSONObject.NULL)
            .put("defaultEngine", Settings.Secure.getString(context.contentResolver,"tts_default_synth") ?: JSONObject.NULL)
            .put("engineConfirmationPolicy","explicit-package-OnInit")
            .put("independentEngineVerification",false)
            .put("spokenOffset",spokenOffset)
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
        if (!ready) return JSONArray()
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
        maxChunkChars: Int = 650,
    ): JSONObject {
        val rawText = text.trim()
        require(rawText.isNotEmpty()) { "Texto TTS obrigatório" }
        require(rawText.length <= 120_000) { "Texto TTS excede o limite de segurança" }
        val clean = stripVocalTags(rawText)
        require(clean.isNotBlank()) { "Texto sem conteúdo pronunciável" }

        if (!ensureEnginePackage(enginePackage)) error(lastError ?: "Android TTS indisponível")

        synchronized(sequenceLock) {
        completedIds.clear()
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
        val locale = if(isKokoro) Locale("pt","BR") else runCatching { Locale.forLanguageTag(language.ifBlank { "pt-BR" }) }.getOrDefault(Locale("pt", "BR"))
        fun voiceScore(v: android.speech.tts.Voice): Int {
            val tag = v.locale?.toLanguageTag().orEmpty().lowercase()
            val localeScore = when {
                tag == locale.toLanguageTag().lowercase() -> 20_000
                tag == "pt-br" -> 18_000
                v.locale?.language == locale.language -> 12_000
                v.locale?.language in listOf("pt", "por") -> 10_000
                else -> 0
            }
            val offlineScore = if (v.isNetworkConnectionRequired) 0 else 3_000
            return localeScore + offlineScore + v.quality * 10 - v.latency
        }
        val voicesSet = runCatching { tts.voices }.getOrNull()
        val requested = voiceName?.takeIf { it.isNotBlank() }
        validateVoice(requested)
        val selected = voicesSet?.firstOrNull { it.name == requested }
            ?: voicesSet?.filter { it.locale?.language == locale.language || it.locale?.language in listOf("pt", "por") }
                ?.maxByOrNull(::voiceScore)
            ?: if (!isKokoro) voicesSet?.maxByOrNull(::voiceScore) else null
        if (selected != null) {
            check(tts.setVoice(selected)==TextToSpeech.SUCCESS) { "O motor recusou a voz selecionada" }
        } else {
            val languageResult = tts.setLanguage(locale)
            if (languageResult == TextToSpeech.LANG_MISSING_DATA || languageResult == TextToSpeech.LANG_NOT_SUPPORTED) {
                state = "error"
                lastError = "Nenhuma voz compatível com ${locale.toLanguageTag()} instalada no Android"
                error(lastError!!)
            }
        }

        val clampedSpeed = speed.coerceIn(0.65f, 1.50f)
        check(tts.setSpeechRate(clampedSpeed)==TextToSpeech.SUCCESS) { "Motor recusou velocidade" }
        check(tts.setPitch(1.0f)==TextToSpeech.SUCCESS) { "Motor recusou pitch" }
        plannedChunks=NativeNarrationPlan.plan(clean)
        val chunks=plannedChunks.map { it.text }
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
            takeFocus()
            state = "queued"
            val code = tts.speak(chunks[0], TextToSpeech.QUEUE_ADD, Bundle(), firstId)
            if (code == TextToSpeech.ERROR) {
                state = "error"
                lastError = "Android TTS recusou o bloco 1/${chunks.size}"
                releaseFocus()
                error(lastError!!)
            }
        }

        val kokoroPkg = detectKokoroPackage()
        val engineLabel = if (activeEnginePackage != null && (activeEnginePackage == kokoroPkg || activeEnginePackage in KOKORO_PACKAGES)) "kokoro" else "android"
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

    }
    fun stop(): JSONObject {
        synchronized(sequenceLock) {
        val wasActive = state == "playing" || state == "queued" || runCatching { tts.isSpeaking }.getOrDefault(false) || startedChunksCount > completedChunksCount
        generation.incrementAndGet()
        if (state=="initializing") {engineGeneration.incrementAndGet();runCatching {instance?.shutdown()};instance=null;ready=false;readyLatch.countDown()}
        releaseFocus()
        pendingChunks = emptyList()
        runCatching { tts.stop() }
        interrupted = true
        interruptedAtChunk = maxOf(currentChunkIndex, startedChunksCount)
        chunkEvents.add("manual_stop:chunk=$interruptedAtChunk")
        state = "stopped"
        val kokoroPkg = detectKokoroPackage()
        val engineLabel = if (activeEnginePackage != null && (activeEnginePackage == kokoroPkg || activeEnginePackage in KOKORO_PACKAGES)) "kokoro" else "android"
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

    }
    fun close() { stop();engineGeneration.incrementAndGet();runCatching {instance?.shutdown()};instance=null;ready=false }

    internal fun splitForTts(text: String, maxChars: Int = 760): List<String> = NativeNarrationPlan.plan(text).map { it.text }
}
