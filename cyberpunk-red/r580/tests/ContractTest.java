import com.braseiro.cyberpunkred.GeminiSpeechWire;
import com.braseiro.cyberpunkred.NativeNarrationPlan;
import com.braseiro.cyberpunkred.BraseiroAndroidTtsPolicy;
import com.braseiro.cyberpunkred.dice.*;
import org.json.JSONObject;
import java.nio.*;
import java.util.*;
public class ContractTest {
 static void check(boolean yes,String message){if(!yes)throw new AssertionError(message);}
 public static void main(String[] args)throws Exception{
  List<String> installed=Arrays.asList(BraseiroAndroidTtsPolicy.DEBUG,"com.google.android.tts");
  check(BraseiroAndroidTtsPolicy.migrate(BraseiroAndroidTtsPolicy.LEGACY,installed).equals(BraseiroAndroidTtsPolicy.DEBUG),"Legacy alias not migrated to actual debug provider");
  check(BraseiroAndroidTtsPolicy.migrate("com.google.android.tts",installed).equals("com.google.android.tts"),"Manual Google selection overridden");
  check(BraseiroAndroidTtsPolicy.migrate(BraseiroAndroidTtsPolicy.DEBUG,Arrays.asList(BraseiroAndroidTtsPolicy.DEBUG,BraseiroAndroidTtsPolicy.RELEASE)).equals(BraseiroAndroidTtsPolicy.DEBUG),"Explicit debug preference overwritten");
  check(!BraseiroAndroidTtsPolicy.selectable(Arrays.asList(BraseiroAndroidTtsPolicy.LEGACY,BraseiroAndroidTtsPolicy.DEBUG)).contains(BraseiroAndroidTtsPolicy.LEGACY),"Legacy alias selectable");
  String spoken=NativeNarrationPlan.spoken("<speaker name='Mara'>[voz: firme]Mara diz: Olá, Razor.</speaker> [sfx: chuva] <breath>");
  check(spoken.equals("Mara diz: Olá, Razor."),"Spoken metadata leaked or legitimate name removed: "+spoken);
  String scene=("Mara observa a bancada em Watson, enquanto Razor aguarda uma resposta. ").repeat(85).trim();
  List<NativeNarrationPlan.Chunk> chunks=NativeNarrationPlan.plan(scene);
  check(chunks.size()>5 && chunks.get(0).text.length()<=560,"Incorrect first FL chunk");
  List<String> pieces=new ArrayList<>();for(NativeNarrationPlan.Chunk c:chunks){check(scene.substring(c.offset,c.offset+c.text.length()).equals(c.text),"Wrong spoken offset");check(c.text.length()<=760,"Incorrect next FL chunk");pieces.add(c.text);}
  check(String.join(" ",pieces).equals(scene),"Words lost/reordered across 5k-6k narration");
  check(NativeNarrationPlan.plan("x".repeat(900)).get(0).text.length()==900,"Long word split");
  try{NativeNarrationPlan.plan("x".repeat(3901));throw new AssertionError("Unsafe isolated word accepted");}catch(IllegalArgumentException expected){}
  System.out.println("PASS: supplied Kokoro alias/selection policy, exact debug retained, FL 560/760 chunks/offsets/no lost words, metadata removed only from spoken copy");
  JSONObject req=GeminiSpeechWire.request("gemini-3.8-flash-tts","Charon","pt-BR","calmo","Narrador firme","Texto que deve ser lido.");
  check(!req.has("systemInstruction"),"Unsupported systemInstruction still sent");
  JSONObject part=req.getJSONArray("contents").getJSONObject(0).getJSONArray("parts").getJSONObject(0);
  check(part.getString("text").equals("Texto que deve ser lido."),"Profile leaked into transcript");
  check(part.getJSONObject("speech_metadata").getString("style").contains("Narrador firme"),"Voice profile lost");
  JSONObject config=req.getJSONObject("generationConfig");check(config.getJSONObject("speechConfig").getJSONObject("voiceConfig").getString("voice").equals("Charon"),"Wrong 3.8 voice field");
  check(config.getJSONObject("responseFormat").getJSONObject("audio").getString("mimeType").equals("AUDIO_L16"),"No explicit PCM encoding");
  byte[] pcm={1,0,2,0,3,0,4,0};ByteBuffer wav=ByteBuffer.allocate(44+pcm.length).order(ByteOrder.LITTLE_ENDIAN);
  wav.put("RIFF".getBytes()).putInt(36+pcm.length).put("WAVEfmt ".getBytes()).putInt(16).putShort((short)1).putShort((short)1).putInt(24000).putInt(48000).putShort((short)2).putShort((short)16).put("data".getBytes()).putInt(pcm.length).put(pcm);
  check(Arrays.equals(pcm,GeminiSpeechWire.pcm(wav.array(),"audio/wav")),"WAV header was treated as PCM");
  check(Arrays.equals(pcm,GeminiSpeechWire.pcm(pcm,"audio/l16;rate=24000")),"Raw PCM changed");
  try{GeminiSpeechWire.pcm(new byte[]{1,2,3},"audio/l16");throw new AssertionError("Truncation accepted");}catch(IllegalArgumentException expected){}
  JSONObject response=new JSONObject("{candidates:[{content:{parts:[{text:'metadata'},{inlineData:{mimeType:'audio/wav',data:'fixture'}}]}}]}");
  check(GeminiSpeechWire.audioData(response).getString("data").equals("fixture"),"Audio parser requires first part");
  int total=0;
  for(String formula:new String[]{"1d6","2d10+3","8d6","1d100"})for(int seed=1;seed<=40;seed++){
   PhysicalDiceEngine.Session a=PhysicalDiceEngine.create(DiceRollSpec.parse(formula,"Normal"),seed),b=PhysicalDiceEngine.create(DiceRollSpec.parse(formula,"Normal"),seed);
   check(a.result()==null,"Outcome preselected before simulation");
   for(int step=0;step<1700&&!a.isComplete();step++)a.step();for(int step=0;step<1700&&!b.isComplete();step++)b.step();
   check(a.isComplete()&&b.isComplete(),"Physics never settled");
   check(a.result().dice.equals(b.result().dice),"Seed replay changed");
   check(a.result().dice.equals(a.spec.rollsFromPhysicalFaces(a.physicalFaces())),"Values differ from real top faces");total++;
  }
  System.out.println("PASS: actual speech REST 3.8 request, profile outside transcript, all audio parts, WAV/PCM frame validation; "+total+" physical simulations/top-face/replay cases with no preselected outcome");
 }
}
