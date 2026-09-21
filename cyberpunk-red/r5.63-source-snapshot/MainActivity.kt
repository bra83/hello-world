package com.braseiro.cyberpunkred

import android.annotation.SuppressLint
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.os.Bundle
import android.text.InputType
import android.util.Base64
import android.widget.EditText
import androidx.appcompat.app.AlertDialog
import android.view.View
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.FrameLayout
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.core.view.WindowCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.webkit.WebViewAssetLoader
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.ByteArrayOutputStream

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private lateinit var runtime: BarbaraRuntime
    private lateinit var diceOverlay: FrameLayout
    private lateinit var diceController: Dice3DWebViewController
    private var pendingDiceRequest: JSONObject? = null
    private var fileCallback: ValueCallback<Array<android.net.Uri>>? = null
    private var sharedImageUri: android.net.Uri? = null

    private val filePicker = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        val callback = fileCallback ?: return@registerForActivityResult
        callback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result.resultCode, result.data))
        fileCallback = null
    }

    // Native image picker used by the scene workflow. Relying only on the WebView
    // <input type=file> path was unreliable on several Android providers and did not
    // emit the same event used by ACTION_SEND imports.
    private val sceneImagePicker = registerForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri == null) return@registerForActivityResult
        sharedImageUri = uri
        runCatching {
            contentResolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        dispatchSharedImageAvailable()
    }

    private val ruleDocumentPicker = registerForActivityResult(ActivityResultContracts.OpenMultipleDocuments()) { uris ->
        if (uris.isEmpty()) {
            dispatchContentEvent("barbara:rules-import-error", JSONObject().put("message", "Importação cancelada."))
            return@registerForActivityResult
        }
        lifecycleScope.launch {
            dispatchContentEvent("barbara:rules-import-progress", JSONObject().put("count", uris.size))
            try {
                val result = withContext(Dispatchers.IO) { runtime.importRuleDocuments(uris) }
                dispatchContentEvent("barbara:rules-import-result", result)
            } catch (error: Exception) {
                dispatchContentEvent(
                    "barbara:rules-import-error",
                    JSONObject().put("message", error.message ?: "Falha ao indexar os manuais."),
                )
            }
        }
    }

    private val ruleManifestExporter = registerForActivityResult(ActivityResultContracts.CreateDocument("application/json")) { uri ->
        if (uri == null) {
            dispatchContentEvent("barbara:rules-manifest-export-error", JSONObject().put("message", "Exportação cancelada."))
            return@registerForActivityResult
        }
        lifecycleScope.launch {
            try {
                val result = withContext(Dispatchers.IO) { runtime.exportRuleSourceManifest(uri) }
                dispatchContentEvent("barbara:rules-manifest-exported", result)
            } catch (error: Exception) {
                dispatchContentEvent(
                    "barbara:rules-manifest-export-error",
                    JSONObject().put("message", error.message ?: "Falha ao exportar o manifesto."),
                )
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, true)
        setContentView(R.layout.activity_main)

        runtime = BarbaraRuntime(applicationContext)
        webView = findViewById(R.id.webView)
        diceOverlay = findViewById(R.id.diceOverlay)
        // R5.46: Android 15/16 enforce edge-to-edge for recent target SDKs. Apply the
        // real system-bar/display-cutout insets to the native root instead of relying on
        // CSS env(safe-area-inset-*), which Android WebView reports inconsistently.
        WindowCompat.setDecorFitsSystemWindows(window, false)
        window.statusBarColor = Color.rgb(7, 9, 12)
        window.navigationBarColor = Color.rgb(7, 9, 12)
        val root = findViewById<View>(R.id.root)
        ViewCompat.setOnApplyWindowInsetsListener(root) { view, insets ->
            val bars = insets.getInsets(
                WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout()
            )
            view.setPadding(0, bars.top, 0, bars.bottom)
            insets
        }
        ViewCompat.requestApplyInsets(root)
        captureIncomingImage(intent)
        webView.isVerticalScrollBarEnabled = false
        webView.isHorizontalScrollBarEnabled = false
        webView.overScrollMode = WebView.OVER_SCROLL_IF_CONTENT_SCROLLS
        webView.isNestedScrollingEnabled = true

        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = false
            allowContentAccess = false
            mediaPlaybackRequiresUserGesture = false
            cacheMode = android.webkit.WebSettings.LOAD_NO_CACHE
            setSupportZoom(false)
        }
        webView.addJavascriptInterface(BarbaraJsBridge(runtime), "AndroidBarbara")
        webView.addJavascriptInterface(DiceRequestBridge(), "AndroidDice3D")
        webView.addJavascriptInterface(ContentImportBridge(), "AndroidContent")
        webView.addJavascriptInterface(SecretConfigBridge(), "AndroidSecrets")
        webView.addJavascriptInterface(SceneBridge(), "AndroidScene")
        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): android.webkit.WebResourceResponse? {
                val response = assetLoader.shouldInterceptRequest(request.url) ?: return null
                val path = request.url.path.orEmpty().lowercase()
                // ES modules are MIME-strict in Android System WebView. Some Android MIME maps
                // do not recognize .mjs consistently, so normalize JavaScript responses here.
                if (path.endsWith(".js") || path.endsWith(".mjs")) {
                    response.mimeType = "text/javascript"
                    response.encoding = "utf-8"
                }
                return response
            }

            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                return request.url.host != "appassets.androidplatform.net"
            }
        }
        webView.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(consoleMessage: android.webkit.ConsoleMessage): Boolean {
                android.util.Log.e(
                    "CPRED_WEBVIEW",
                    "${consoleMessage.messageLevel()} ${consoleMessage.sourceId()}:${consoleMessage.lineNumber()} ${consoleMessage.message()}",
                )
                return true
            }
            override fun onShowFileChooser(
                webView: WebView,
                filePathCallback: ValueCallback<Array<android.net.Uri>>,
                fileChooserParams: FileChooserParams,
            ): Boolean {
                fileCallback?.onReceiveValue(null)
                fileCallback = filePathCallback
                filePicker.launch(fileChooserParams.createIntent())
                return true
            }
        }

        diceController = Dice3DWebViewController(this, object : Dice3DWebViewController.Listener {
            override fun onReady() = Unit

            override fun onResult(raw: JSONObject) {
                val request = pendingDiceRequest
                try {
                    val verified = Dice3DProtocol.verify(request, raw)
                    pendingDiceRequest = null
                    webView.evaluateJavascript(
                        "window.dispatchEvent(new CustomEvent('barbara:dice3d-result',{detail:${verified}}))",
                        null,
                    )
                    diceOverlay.postDelayed({ diceOverlay.visibility = View.GONE }, 950L)
                } catch (error: Exception) {
                    pendingDiceRequest = null
                    diceOverlay.visibility = View.GONE
                    dispatchDiceError("Rolagem 3D descartada: ${error.message}")
                }
            }

            override fun onError(message: String) {
                pendingDiceRequest = null
                diceOverlay.visibility = View.GONE
                dispatchDiceError(message)
            }
        })
        findViewById<FrameLayout>(R.id.diceSurface).addView(
            diceController.view(),
            FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT),
        )
        findViewById<Button>(R.id.diceClose).setOnClickListener { cancelDiceRoll() }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (diceOverlay.visibility == View.VISIBLE) cancelDiceRoll()
                else if (webView.canGoBack()) webView.goBack()
                else finish()
            }
        })

        webView.loadUrl("https://appassets.androidplatform.net/assets/web/app/index.html?build=4005")
    }

    override fun onDestroy() {
        if (::diceController.isInitialized) diceController.destroy()
        if (::runtime.isInitialized) runtime.close()
        webView.removeJavascriptInterface("AndroidBarbara")
        webView.removeJavascriptInterface("AndroidDice3D")
        webView.removeJavascriptInterface("AndroidContent")
        webView.removeJavascriptInterface("AndroidSecrets")
        webView.removeJavascriptInterface("AndroidScene")
        webView.destroy()
        super.onDestroy()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        if (captureIncomingImage(intent)) dispatchSharedImageAvailable()
    }

    private fun dispatchSharedImageAvailable() {
        if (!::webView.isInitialized) return
        webView.post {
            webView.evaluateJavascript(
                "window.dispatchEvent(new CustomEvent('barbara:shared-image-available'))",
                null,
            )
        }
    }

    private fun captureIncomingImage(intent: Intent?): Boolean {
        if (intent?.action != Intent.ACTION_SEND || !intent.type.orEmpty().startsWith("image/")) return false
        @Suppress("DEPRECATION")
        val stream = intent.getParcelableExtra<android.net.Uri>(Intent.EXTRA_STREAM)
        val uri = stream ?: intent.clipData?.takeIf { it.itemCount > 0 }?.getItemAt(0)?.uri ?: return false
        sharedImageUri = uri
        try {
            contentResolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
        } catch (_: SecurityException) {
            // Most ACTION_SEND providers grant one-shot read permission only.
        }
        return true
    }

    private fun sceneImageDataUrl(uri: android.net.Uri): JSONObject {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, bounds) }
            ?: error("Não foi possível abrir a imagem compartilhada")
        require(bounds.outWidth > 0 && bounds.outHeight > 0) { "Arquivo de imagem inválido" }

        val maxSide = 1600
        var sample = 1
        while (bounds.outWidth / sample > maxSide * 2 || bounds.outHeight / sample > maxSide * 2) sample *= 2
        val options = BitmapFactory.Options().apply {
            inSampleSize = sample.coerceAtLeast(1)
            inPreferredConfig = Bitmap.Config.ARGB_8888
        }
        val decoded = contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, options) }
            ?: error("Não foi possível decodificar a imagem compartilhada")
        val scale = minOf(1.0, maxSide.toDouble() / maxOf(decoded.width, decoded.height).toDouble())
        val bitmap = if (scale < 1.0) {
            Bitmap.createScaledBitmap(
                decoded,
                (decoded.width * scale).toInt().coerceAtLeast(1),
                (decoded.height * scale).toInt().coerceAtLeast(1),
                true,
            ).also { if (it !== decoded) decoded.recycle() }
        } else decoded

        val output = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.JPEG, 88, output)
        bitmap.recycle()
        val bytes = output.toByteArray()
        require(bytes.size <= 5 * 1024 * 1024) { "Imagem ainda excede 5 MB após otimização" }
        return JSONObject()
            .put("ok", true)
            .put("mimeType", "image/jpeg")
            .put("bytes", bytes.size)
            .put("width", if (scale < 1.0) (bounds.outWidth * scale).toInt() else bounds.outWidth)
            .put("height", if (scale < 1.0) (bounds.outHeight * scale).toInt() else bounds.outHeight)
            .put("dataUrl", "data:image/jpeg;base64,${Base64.encodeToString(bytes, Base64.NO_WRAP)}")
    }

    private fun startDiceRoll(formula: String, actorId: String, setId: String) {
        if (!diceController.isReady) {
            dispatchDiceError("Motor de dados 3D ainda está carregando.")
            return
        }
        if (pendingDiceRequest != null) {
            dispatchDiceError("Aguarde os dados atuais pararem.")
            return
        }
        try {
            val request = Dice3DProtocol.request(
                formula,
                System.nanoTime() xor formula.hashCode().toLong(),
                actorId,
                setId.ifBlank { "cyberpunk-red-default" },
            )
            request.put(
                "theme",
                JSONObject()
                    .put("color", "vermelho")
                    .put("material", "metal")
                    .put("texture", "gravada")
                    .put("font", "monospace")
                    .put("brightness", 0.92)
                    .put("transparency", 0.08)
                    .put("wear", 0.34)
                    .put("border", 1.4)
                    .put("glyph_1", "☠")
                    .put("glyph_max", "★")
                    .put("quality", "auto")
                    .put("sound", true),
            )
            pendingDiceRequest = request
            diceOverlay.visibility = View.VISIBLE
            diceController.setQuality("auto")
            diceController.roll(request)
        } catch (error: Exception) {
            pendingDiceRequest = null
            diceOverlay.visibility = View.GONE
            dispatchDiceError(error.message ?: "Fórmula 3D inválida.")
        }
    }

    private fun cancelDiceRoll() {
        diceController.cancel(pendingDiceRequest?.optString("roll_id") ?: "")
        pendingDiceRequest = null
        diceOverlay.visibility = View.GONE
        dispatchDiceError("Rolagem física cancelada.")
    }

    private fun dispatchDiceError(message: String) {
        webView.evaluateJavascript(
            "window.dispatchEvent(new CustomEvent('barbara:dice3d-error',{detail:{message:${JSONObject.quote(message)}}}))",
            null,
        )
    }

    private fun dispatchContentEvent(name: String, detail: JSONObject) {
        webView.evaluateJavascript(
            "window.dispatchEvent(new CustomEvent(${JSONObject.quote(name)},{detail:${detail}}))",
            null,
        )
    }

    private inner class ContentImportBridge {
        @JavascriptInterface
        fun pickRuleDocuments(): String {
            runOnUiThread { ruleDocumentPicker.launch(arrayOf("application/pdf")) }
            return JSONObject().put("ok", true).put("picker", "android-saf").toString()
        }

        @JavascriptInterface
        fun exportRuleManifest(): String {
            runOnUiThread { ruleManifestExporter.launch("cyberpunk-red-source-manifest.json") }
            return JSONObject().put("ok", true).put("picker", "android-saf-create-document").toString()
        }

        @JavascriptInterface
        fun ruleCorpusStatus(): String = try { runtime.ruleCorpusStatus().toString() }
        catch (error: Exception) { JSONObject().put("ok", false).put("error", error.message).toString() }
    }

    private inner class SecretConfigBridge {
        @JavascriptInterface
        fun configureGeminiKey(): String {
            runOnUiThread {
                val input = EditText(this@MainActivity).apply {
                    inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
                    hint = "Gemini API key"
                    setSingleLine(true)
                }
                AlertDialog.Builder(this@MainActivity)
                    .setTitle("Configurar chave Gemini")
                    .setMessage("A chave é salva diretamente no Android Keystore e nunca é enviada à WebView.")
                    .setView(input)
                    .setNegativeButton("Cancelar", null)
                    .setPositiveButton("Salvar") { _, _ ->
                        lifecycleScope.launch(Dispatchers.IO) {
                            val result = runCatching { runtime.saveGeminiApiKeyNative(input.text.toString()) }
                                .getOrElse { JSONObject().put("ok", false).put("error", it.message ?: "Falha ao salvar") }
                            withContext(Dispatchers.Main) { dispatchContentEvent("barbara:gemini-key-updated", result) }
                        }
                    }.show()
            }
            return JSONObject().put("ok", true).put("queued", true).toString()
        }

        @JavascriptInterface
        fun clearGeminiKey(): String {
            runOnUiThread {
                AlertDialog.Builder(this@MainActivity)
                    .setTitle("Remover chave Gemini?")
                    .setMessage("A chave será apagada do armazenamento protegido.")
                    .setNegativeButton("Cancelar", null)
                    .setPositiveButton("Remover") { _, _ ->
                        lifecycleScope.launch(Dispatchers.IO) {
                            val result = runCatching { runtime.clearGeminiApiKeyNative() }
                                .getOrElse { JSONObject().put("ok", false).put("error", it.message ?: "Falha ao remover") }
                            withContext(Dispatchers.Main) { dispatchContentEvent("barbara:gemini-key-updated", result) }
                        }
                    }.show()
            }
            return JSONObject().put("ok", true).put("queued", true).toString()
        }
    }

    private inner class SceneBridge {
        @JavascriptInterface
        fun openGemini(prompt: String): String {
            val clean = prompt.trim()
            if (clean.isEmpty()) return JSONObject().put("ok", false).put("error", "Prompt vazio").toString()
            val clipboard = getSystemService(CLIPBOARD_SERVICE) as ClipboardManager
            clipboard.setPrimaryClip(ClipData.newPlainText("Prompt da cena Cyberpunk RED", clean))
            runOnUiThread {
                val send = Intent(Intent.ACTION_SEND).apply {
                    type = "text/plain"
                    putExtra(Intent.EXTRA_TEXT, clean)
                    putExtra(Intent.EXTRA_SUBJECT, "Cena Cyberpunk RED")
                    clipData = ClipData.newPlainText("Prompt da cena Cyberpunk RED", clean)
                }
                // Gemini can be installed as the standalone app or exposed through the
                // Google app depending on device/region. Try both before showing a chooser.
                val candidates = listOf(
                    "com.google.android.apps.bard",
                    "com.google.android.googlequicksearchbox",
                )
                val direct = candidates
                    .asSequence()
                    .map { pkg -> Intent(send).setPackage(pkg) }
                    .firstOrNull { packageManager.resolveActivity(it, 0) != null }
                if (direct != null) startActivity(direct)
                else startActivity(Intent.createChooser(send, "Abrir prompt da cena com…"))
            }
            return JSONObject()
                .put("ok", true)
                .put("clipboard", true)
                .put("prefillRequested", true)
                .put("mode", "android-share-intent")
                .toString()
        }

        @JavascriptInterface
        fun pickImage(): String {
            runOnUiThread { sceneImagePicker.launch("image/*") }
            return JSONObject().put("ok", true).put("queued", true).put("mode", "native-image-picker").toString()
        }

        @JavascriptInterface
        fun consumeSharedImage(): String {
            val uri = sharedImageUri
                ?: return JSONObject().put("ok", false).put("error", "Nenhuma imagem compartilhada").toString()
            return try {
                val result = sceneImageDataUrl(uri)
                sharedImageUri = null
                result.toString()
            } catch (error: Exception) {
                JSONObject()
                    .put("ok", false)
                    .put("error", error.message ?: "Falha ao ler imagem compartilhada")
                    .toString()
            }
        }
    }

    private inner class DiceRequestBridge {
        @JavascriptInterface
        fun roll(formula: String, actorId: String, setId: String): String {
            runOnUiThread { startDiceRoll(formula, actorId, setId) }
            return JSONObject().put("ok", true).put("queued", true).toString()
        }

        @JavascriptInterface
        fun cancel(): String {
            runOnUiThread { cancelDiceRoll() }
            return JSONObject().put("ok", true).toString()
        }
    }
}
