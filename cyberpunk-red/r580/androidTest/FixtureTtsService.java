package com.braseiro.cyberpunkred;
import android.speech.tts.*;
import android.media.AudioFormat;
import java.util.*;
/** Test APK only. Exercises the Android service binding and callbacks, not Kokoro synthesis. */
public class FixtureTtsService extends TextToSpeechService {
 private volatile boolean stopped;
 protected String[] onGetLanguage(){return new String[]{"por","BRA",""};}
 protected int onIsLanguageAvailable(String l,String c,String v){return ("pt".equals(l)||"por".equals(l))?TextToSpeech.LANG_COUNTRY_AVAILABLE:TextToSpeech.LANG_NOT_SUPPORTED;}
 protected int onLoadLanguage(String l,String c,String v){return onIsLanguageAvailable(l,c,v);}
 public List<Voice> onGetVoices(){return Collections.singletonList(new Voice("fixture-pt-br",new Locale("pt","BR"),Voice.QUALITY_NORMAL,Voice.LATENCY_LOW,false,Collections.emptySet()));}
 public int onLoadVoice(String name){return onIsValidVoiceName(name);}
 public int onIsValidVoiceName(String name){return "fixture-pt-br".equals(name)?TextToSpeech.SUCCESS:TextToSpeech.ERROR;}
 protected void onStop(){stopped=true;}
 protected void onSynthesizeText(SynthesisRequest request,SynthesisCallback callback){
  stopped=false;String text=request.getCharSequenceText().toString();
  android.content.SharedPreferences pref=getSharedPreferences("fixture-tts",0);
  synchronized(FixtureTtsService.class){pref.edit().putString("text",pref.getString("text","")+text+"\n").putInt("calls",pref.getInt("calls",0)+1).putString("voice",request.getVoiceName()).commit();}
  if(text.contains("FORCE_FAIL")){callback.error(TextToSpeech.ERROR_SYNTHESIS);return;}
  callback.start(24000,AudioFormat.ENCODING_PCM_16BIT,1);
  byte[] silence=new byte[2400];
  for(int i=0;i<4;i++){if(stopped){callback.error(TextToSpeech.STOPPED);return;}callback.audioAvailable(silence,0,silence.length);try{Thread.sleep(25);}catch(InterruptedException e){Thread.currentThread().interrupt();return;}}
  callback.done();
 }
}
