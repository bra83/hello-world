import com.braseiro.cyberpunkred.GeminiSpeechWire;
import com.braseiro.cyberpunkred.dice.*;
import org.json.JSONObject;
import java.nio.*;
import java.util.*;
public class ContractTest {
 static void check(boolean yes,String message){if(!yes)throw new AssertionError(message);}
 public static void main(String[] args)throws Exception{
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
