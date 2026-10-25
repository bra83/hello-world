package com.braseiro.cyberpunkred

import android.webkit.JavascriptInterface
import org.json.JSONObject
import org.json.JSONArray
import java.util.concurrent.Executors

/** Fronteira mínima JavaScript -> host Android. Sem regra de Cyberpunk na UI. */
class BarbaraJsBridge(
    private val runtime: BarbaraRuntime,
    private val deliver: (String, String) -> Unit,
) {
    private val worker = Executors.newSingleThreadExecutor { task ->
        Thread(task, "cpred-native-requests").apply { isDaemon = true }
    }
    private val network = Executors.newSingleThreadExecutor { task ->
        Thread(task, "cpred-update-requests").apply { isDaemon = true }
    }
    @Volatile private var closed = false

    @JavascriptInterface
    fun request(id: String, method: String, argumentsJson: String) {
        if (closed) return
        val executor = if (method in setOf("checkGitHubUpdate", "downloadAndApplyGitHubUpdate")) network else worker
        executor.execute {
            val result = try {
                require(method != "request") { "INVALID_NATIVE_METHOD" }
                val args = JSONArray(argumentsJson)
                val target = javaClass.declaredMethods.firstOrNull {
                    it.name == method && it.isAnnotationPresent(JavascriptInterface::class.java) && it.parameterCount == args.length()
                } ?: error("UNKNOWN_NATIVE_METHOD")
                require(target.parameterTypes.all { it == String::class.java }) { "INVALID_NATIVE_ARGUMENT_TYPE" }
                val values = Array<Any?>(args.length()) { index -> if (args.isNull(index)) null else args.getString(index) }
                target.invoke(this, *values)?.toString() ?: "null"
            } catch (error: Throwable) {
                errorJson(error.cause ?: error)
            }
            if (!closed) deliver(id, result)
        }
    }

    fun close() {
        closed = true
        worker.shutdownNow()
        network.shutdownNow()
    }


    @JavascriptInterface
    fun status(): String = runtime.status().toString()

    @JavascriptInterface
    fun saveCharacter(characterId: String, characterJson: String): String = try {
        runtime.saveCharacter(characterId, characterJson).toString()
    } catch (t: Throwable) {
        errorJson(t)
    }

    @JavascriptInterface
    fun commitCharacterMechanic(payloadJson: String): String = try {
        runtime.commitCharacterMechanic(JSONObject(payloadJson)).toString()
    } catch (t: Throwable) {
        errorJson(t)
    }

    @JavascriptInterface
    fun getCharacter(characterId: String?): String = try {
        val raw = runtime.loadCharacter(characterId?.takeIf { it.isNotBlank() })
        JSONObject().put("ok", raw != null).put("resolved", raw != null).put("character", raw?.let(::JSONObject)).toString()
    } catch (t: Throwable) {
        errorJson(t)
    }

    @JavascriptInterface
    fun getActiveId(): String = runtime.activeCharacterId().orEmpty()

    @JavascriptInterface
    fun bindEntityToken(payloadJson: String): String = try {
        runtime.bindToken(JSONObject(payloadJson)).toString()
    } catch (t: Throwable) {
        errorJson(t)
    }

    @JavascriptInterface
    fun setPosition(characterId: String, worldPositionJson: String): String = try {
        runtime.updatePosition(characterId, JSONObject(worldPositionJson)).toString()
    } catch (t: Throwable) {
        errorJson(t)
    }

    @JavascriptInterface
    fun enterScene(characterId: String, payloadJson: String): String = try {
        runtime.enterScene(characterId, JSONObject(payloadJson)).toString()
    } catch (t: Throwable) {
        errorJson(t)
    }

    @JavascriptInterface
    fun setScenePosition(characterId: String, payloadJson: String): String = try {
        runtime.updateScenePosition(characterId, JSONObject(payloadJson)).toString()
    } catch (t: Throwable) {
        errorJson(t)
    }

    @JavascriptInterface
    fun exitScene(characterId: String): String = try {
        runtime.exitScene(characterId).toString()
    } catch (t: Throwable) {
        errorJson(t)
    }

    @JavascriptInterface
    fun ensureSceneNpcs(characterId: String, payloadJson: String): String = try {
        runtime.ensureSceneNpcs(characterId, JSONObject(payloadJson)).toString()
    } catch (t: Throwable) {
        errorJson(t)
    }

    @JavascriptInterface
    fun moveSceneNpc(payloadJson: String): String = try {
        runtime.moveSceneNpc(JSONObject(payloadJson)).toString()
    } catch (t: Throwable) {
        errorJson(t)
    }

    @JavascriptInterface
    fun vttSnapshot(): String = try {
        runtime.vttSnapshot().toString()
    } catch (t: Throwable) {
        errorJson(t)
    }

    @JavascriptInterface
    fun playerAction(payloadJson: String): String = try {
        runtime.playerAction(JSONObject(payloadJson)).toString()
    } catch (t: Throwable) {
        errorJson(t)
    }

    @JavascriptInterface
    fun gmHelp(payloadJson: String): String = try {
        runtime.gmHelp(JSONObject(payloadJson)).toString()
    } catch (t: Throwable) {
        errorJson(t)
    }

    @JavascriptInterface
    fun createWorldBackup(label: String): String = try {
        runtime.createWorldBackup(label).toString()
    } catch (t: Throwable) {
        errorJson(t)
    }

    @JavascriptInterface
    fun listWorldBackups(): String = try {
        JSONObject().put("ok", true).put("backups", runtime.listWorldBackups()).toString()
    } catch (t: Throwable) {
        errorJson(t)
    }

    @JavascriptInterface
    fun restoreWorldBackup(name: String): String = try {
        runtime.restoreWorldBackup(name).toString()
    } catch (t: Throwable) {
        errorJson(t)
    }

    @JavascriptInterface
    fun deleteWorldBackup(name: String): String = try {
        runtime.deleteWorldBackup(name).toString()
    } catch (t: Throwable) {
        errorJson(t)
    }

    @JavascriptInterface
    fun geminiSettings(): String = try { runtime.geminiSettings().toString() } catch (t: Throwable) { errorJson(t) }

    @JavascriptInterface
    fun saveGeminiSettings(payloadJson: String): String = try {
        runtime.saveGeminiSettings(JSONObject(payloadJson)).toString()
    } catch (t: Throwable) { errorJson(t) }

    @JavascriptInterface
    fun speakGeminiTts(payloadJson: String): String = try {
        runtime.speakGeminiTts(JSONObject(payloadJson)).toString()
    } catch (t: Throwable) { errorJson(t) }

    @JavascriptInterface
    fun stopGeminiTts(): String = try { runtime.stopGeminiTts().toString() } catch (t: Throwable) { errorJson(t) }

    @JavascriptInterface
    fun walletGetTransaction(payloadJson: String): String = try {
        runtime.walletGetTransaction(JSONObject(payloadJson)).toString()
    } catch (t: Throwable) { errorJson(t) }

    @JavascriptInterface
    fun walletCreditMissionReward(payloadJson: String): String = try {
        runtime.walletCreditMissionReward(JSONObject(payloadJson)).toString()
    } catch (t: Throwable) { errorJson(t) }

    @JavascriptInterface
    fun verifyRewardEligibility(payloadJson: String): String = try {
        runtime.verifyRewardEligibility(JSONObject(payloadJson)).toString()
    } catch (t: Throwable) { errorJson(t) }

    @JavascriptInterface
    fun verifyWorldTimeAdvance(payloadJson: String): String = try {
        runtime.verifyWorldTimeAdvance(JSONObject(payloadJson)).toString()
    } catch (t: Throwable) { errorJson(t) }

    @JavascriptInterface
    fun resolveAdventureRuleAction(payloadJson: String): String = try {
        runtime.resolveAdventureRuleAction(JSONObject(payloadJson)).toString()
    } catch (t: Throwable) { errorJson(t) }

    @JavascriptInterface
    fun updaterStatus(): String = try {
        runtime.updaterStatus().toString()
    } catch (t: Throwable) { errorJson(t) }

    @JavascriptInterface
    fun checkGitHubUpdate(manifestUrl: String?): String = try {
        runtime.checkGitHubUpdate(manifestUrl?.takeIf { it.isNotBlank() }).toString()
    } catch (t: Throwable) { errorJson(t) }

    @JavascriptInterface
    fun downloadAndApplyGitHubUpdate(manifestUrl: String?): String = try {
        runtime.downloadAndApplyGitHubUpdate(manifestUrl?.takeIf { it.isNotBlank() }).toString()
    } catch (t: Throwable) { errorJson(t) }

    @JavascriptInterface
    fun applyUpdatePackage(payloadJson: String): String = try {
        runtime.applyUpdatePackage(JSONObject(payloadJson)).toString()
    } catch (t: Throwable) { errorJson(t) }

    @JavascriptInterface
    fun rollbackUpdatePackage(): String = try {
        runtime.rollbackUpdatePackage().toString()
    } catch (t: Throwable) { errorJson(t) }

    @JavascriptInterface
    fun snapshot(label: String): String = try {
        runtime.createWorldBackup(label).toString()
    } catch (t: Throwable) {
        errorJson(t)
    }

    private fun errorJson(t: Throwable): String = JSONObject()
        .put("ok", false)
        .put("resolved", false)
        .put("error", t.message ?: t.javaClass.simpleName)
        .toString()
}
