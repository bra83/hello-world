package com.braseiro.cyberpunkred
import android.app.Instrumentation
import android.content.*
import android.net.Uri
import android.webkit.WebView
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.FixMethodOrder
import org.junit.runners.MethodSorters
import org.junit.Test
import org.junit.Assert.*
import org.junit.runner.RunWith
import org.json.JSONObject
import java.io.*
import java.net.*
import java.nio.*
import java.util.concurrent.*
import java.util.concurrent.atomic.AtomicReference
import kotlin.math.sin

@FixMethodOrder(MethodSorters.NAME_ASCENDING)
@RunWith(AndroidJUnit4::class)
class MediaDiceSpeechTest {
 private val ins=InstrumentationRegistry.getInstrumentation()
 private val ctx get()=ins.targetContext
 private fun eval(s:ActivityScenario<MainActivity>,code:String):String{
  val latch=CountDownLatch(1);var answer=""
  s.onActivity{a->a.findViewById<WebView>(R.id.webView).evaluateJavascript(code){v->answer=v;latch.countDown()}}
  // A callback scheduled across the initial WebView navigation may be discarded.
  // Retry DOM polling; the enclosing deadline still fails if the UI never becomes ready.
  return if(latch.await(10,TimeUnit.SECONDS))answer else "null"
 }
 private fun waitFor(s:ActivityScenario<MainActivity>,code:String,seconds:Int=50){val end=System.nanoTime()+seconds*1000000000L;while(System.nanoTime()<end){if(eval(s,code)=="true")return;Thread.sleep(250)};throw AssertionError("DOM condition failed: $code; "+eval(s,"document.querySelector('#toast')?.textContent"))}
 private fun shot(name:String){val bmp=ins.uiAutomation.takeScreenshot();File(ctx.filesDir,name).outputStream().use{bmp.compress(android.graphics.Bitmap.CompressFormat.PNG,100,it)};bmp.recycle()}
 @Test fun aImageAndGemini(){

  val intent=Intent(Intent.ACTION_SEND).apply{setClassName(ctx.packageName,MainActivity::class.java.name);type="image/png";putExtra(Intent.EXTRA_STREAM,Uri.parse("content://com.braseiro.cyberpunkred.test.media/scene.png"));addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)}
  var scenario=ActivityScenario.launch<MainActivity>(intent)
  try {
  waitFor(scenario,"window.__cpredUiReady===true")
  waitFor(scenario,"document.querySelector('#sceneIllustration')?.naturalWidth>0")
  assertEquals("true",eval(scenario,"document.querySelector('#sceneIllustration').getBoundingClientRect().top<document.querySelector('#tableNarrative').getBoundingClientRect().top"))
  assertEquals("true",eval(scenario,"document.querySelectorAll('#sessionRecommended button').length>=3 && !document.querySelector('#sessionRecommended').closest('details')"))
  eval(scenario,"document.querySelector('#sessionRecommended button').click()")
  assertEquals("true",eval(scenario,"document.querySelector('#sessionActionInput').value.length>10"))
  waitFor(scenario,"document.querySelector('#toast').textContent.includes('persistida')")
  shot("r580-scene-imported.png")
  // Native ACTION_SEND transports the same prompt that is copied, without a real external send.
  val sent=AtomicReference<Intent>();val monitor=object:Instrumentation.ActivityMonitor(){override fun onStartActivity(i:Intent):Instrumentation.ActivityResult?{if(i.action in listOf(Intent.ACTION_SEND,Intent.ACTION_CHOOSER,Intent.ACTION_VIEW)){sent.set(i);return Instrumentation.ActivityResult(0,null)};return null}}
  ins.addMonitor(monitor)
  eval(scenario,"document.querySelector('#sceneGeminiBtn').click()")
  val stop=System.nanoTime()+10_000_000_000L;while(sent.get()==null&&System.nanoTime()<stop)Thread.sleep(100)
  if(sent.get()==null){shot("r580-gemini-failure.png");println("GEMINI_DIAG: "+eval(scenario,"JSON.stringify({toast:document.querySelector('#toast')?.textContent,bridge:typeof globalThis.AndroidScene?.openGemini,prompt:document.querySelector('#scenePrompt')?.value?.length})"))};assertNotNull("No external prompt intent",sent.get());val outer=sent.get();@Suppress("DEPRECATION") val outbound=if(outer.action==Intent.ACTION_CHOOSER)outer.getParcelableExtra<Intent>(Intent.EXTRA_INTENT)!! else outer
  assertTrue("Prompt absent from intent",outbound.getStringExtra(Intent.EXTRA_TEXT).orEmpty().contains("Cyberpunk RED"));ins.removeMonitor(monitor)
  Thread.sleep(1500);scenario.close();scenario=ActivityScenario.launch(MainActivity::class.java);waitFor(scenario,"window.__cpredUiReady===true");waitFor(scenario,"document.querySelector('#sceneIllustration')?.naturalWidth>0")
  } finally {scenario.close()}
 }
 @Test fun bPhysicalDice(){
  var scenario=ActivityScenario.launch(MainActivity::class.java);waitFor(scenario,"window.__cpredUiReady===true")
  try {
  eval(scenario,"window.__physicalResult=null;window.addEventListener('barbara:dice3d-result',e=>window.__physicalResult=e.detail,{once:true});document.querySelector('#tableDiceBtn').click();document.querySelector('#diceFormula').value='2d10+3';document.querySelector('#diceRollBtn').click()")
  Thread.sleep(1000);shot("r580-dice-moving.png")
  waitFor(scenario,"window.__physicalResult?.authority==='physical_top_face_verified_native'",35)
  assertEquals("true",eval(scenario,"window.__physicalResult.physics==='braseiro-physical-dice-2' && window.__physicalResult.values.reduce((a,b)=>a+b,0)+3===window.__physicalResult.total"))
  shot("r580-dice-result.png")
  } finally {scenario.close()}
 }
 @Test fun cNativeSpeech(){
  var scenario=ActivityScenario.launch(MainActivity::class.java);waitFor(scenario,"window.__cpredUiReady===true")
  try {
  // Real Android binder/service fixture proves selection reaches the backend, not neural quality.
  val probe=AndroidTtsService(ctx);assertFalse(probe.status().getBoolean("ready"));probe.installedEngines();assertFalse(probe.status().getBoolean("ready"));probe.close()
  val mediaUri=Uri.parse("content://com.braseiro.cyberpunkred.test.media/scene.png")
  fun stats(method:String="stats")=ctx.contentResolver.call(mediaUri,method,null,null)!!
  stats("reset")
  eval(scenario,"window.__voiceSaved=null;MotorBarbaraCore.voice.saveSettings({ttsEngine:'android',androidEnginePackage:'com.braseiro.cyberpunkred.test',androidVoice:''}).then(x=>window.__voiceSaved=x)")
  waitFor(scenario,"window.__voiceSaved?.ok===true",100)
  assertEquals("com.braseiro.cyberpunkred.test",SecureSecretStore(ctx).androidTtsEnginePackage())
  eval(scenario,"window.__voiceSaved=null;MotorBarbaraCore.voice.saveSettings({ttsEngine:'android',androidEnginePackage:'com.braseiro.cyberpunkred.test',androidVoice:'fixture-pt-br'}).then(x=>window.__voiceSaved=x)")
  waitFor(scenario,"window.__voiceSaved?.ok===true")
  val longText="Mara observa a bancada em Watson, enquanto Razor aguarda uma resposta. ".repeat(85).trim()
  fun speak(text:String){eval(scenario,"window.__localSpeak=null;MotorBarbaraCore.voice.speak({text:"+JSONObject.quote(text)+",engine:'android'}).then(x=>window.__localSpeak=x)");waitFor(scenario,"window.__localSpeak!==null");assertEquals("true",eval(scenario,"window.__localSpeak.ok===true"))}
  fun pollLocal(){eval(scenario,"MotorBarbaraCore.voice.settings().then(x=>window.__localStatus=x.tts.android)")}
  speak("<speaker name='Mara'>[voz: firme]"+longText+"</speaker>")
  val complete=System.nanoTime()+35_000_000_000L
  while(System.nanoTime()<complete){pollLocal();if(eval(scenario,"window.__localStatus?.state==='idle'")=="true")break;Thread.sleep(200)}
  assertEquals("true",eval(scenario,"window.__localStatus?.completedChunksCount===window.__localStatus?.totalChunksQueued && window.__localStatus?.completedChunksCount>5"))
  assertEquals(longText,stats().getString("text")!!.trim().replace("\n"," "))
  assertEquals("fixture-pt-br",stats().getString("voice"))
  stats("reset");speak(longText)
  eval(scenario,"MotorBarbaraCore.voice.stop().then(x=>window.__stopped=x)");waitFor(scenario,"window.__stopped?.ok===true")
  Thread.sleep(250);val callsAfterStop=stats().getInt("calls");Thread.sleep(500);assertEquals(callsAfterStop,stats().getInt("calls"))
  stats("reset");speak("FORCE_FAIL "+longText)
  val failed=System.nanoTime()+10_000_000_000L
  while(System.nanoTime()<failed){pollLocal();if(eval(scenario,"window.__localStatus?.state==='error'")=="true")break;Thread.sleep(100)}
  assertEquals("true",eval(scenario,"window.__localStatus?.state==='error' && window.__localStatus?.completedChunksCount===0"));assertEquals(1,stats().getInt("calls"))
  println("PASS: lazy catalogue, real Android TextToSpeech package binding and persisted voice, 5k+ narration via callbacks, tags removed, stop invalidates queue, synthesis error never advances blocks; test service is not Kokoro")
  // Use the real native synthesis orchestration + AudioTrack with an HTTP fixture.
  // This does not contact Gemini or use a real API key.
  val requests=CopyOnWriteArrayList<JSONObject>()
  val pcm=ByteBuffer.allocate(24000).order(ByteOrder.LITTLE_ENDIAN).apply{for(i in 0 until 12000)putShort((sin(i*2*Math.PI*220/24000)*1500).toInt().toShort())}.array()
  URL.setURLStreamHandlerFactory{protocol->if(protocol=="https")object:URLStreamHandler(){override fun openConnection(url:URL):URLConnection{
    check(url.host=="generativelanguage.googleapis.com")
    return object:HttpURLConnection(url){val body=ByteArrayOutputStream();override fun connect(){};override fun disconnect(){};override fun usingProxy()=false;override fun getOutputStream():OutputStream=body
     override fun getResponseCode():Int{requests.add(JSONObject(body.toString("UTF-8")));return 200}
     override fun getInputStream():InputStream=ByteArrayInputStream(JSONObject().put("candidates",org.json.JSONArray().put(JSONObject().put("content",JSONObject().put("parts",org.json.JSONArray().put(JSONObject().put("text","metadata")).put(JSONObject().put("inlineData",JSONObject().put("mimeType","audio/l16;rate=24000").put("data",android.util.Base64.encodeToString(pcm,android.util.Base64.NO_WRAP)))))))).toString().toByteArray())
    }
  }}else null}
  val secrets=SecureSecretStore(ctx);val oldKey=secrets.apiKey();secrets.setApiKey("fixture-not-real")
  secrets.savePublicSettings(textModel=null,ttsModel="gemini-3.8-flash-tts",voice="Charon",language="pt-BR",voiceProfile="Perfil de teste",voiceStyle="narration")
  val service=GeminiTtsService(ctx,secrets)
  try{
   service.speakAsync("Night City nunca dorme. ".repeat(100));val end=System.nanoTime()+45_000_000_000L
   while(System.nanoTime()<end){val state=service.status();if(state.optString("state")=="error")throw AssertionError(state.toString());if(state.optString("state")=="idle"&&requests.isNotEmpty())break;Thread.sleep(100)}
   assertEquals("idle",service.status().getString("state"));assertTrue(requests.size>1)
   for(r in requests){assertFalse(r.has("systemInstruction"));assertTrue(r.getJSONArray("contents").getJSONObject(0).getJSONArray("parts").getJSONObject(0).has("speech_metadata"))}
   println("PASS: native Gemini TTS HTTP fixture -> multiple chunks -> real AudioTrack playback -> idle; voice/style metadata preserved, no real key/network")
  }finally{service.close();scenario.close();if(oldKey==null)secrets.clearApiKey()else secrets.setApiKey(oldKey)}
  } finally {scenario.close()}
 }
}
