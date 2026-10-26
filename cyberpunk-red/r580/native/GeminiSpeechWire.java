package com.braseiro.cyberpunkred;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.Arrays;

/** REST speech contract + strict audio decoding, separated from playback/credentials. */
public final class GeminiSpeechWire {
    public static JSONObject request(String model,String voice,String language,String style,String profile,String text)throws Exception{
        boolean modern=model.startsWith("gemini-3.8-");
        JSONObject part=new JSONObject().put("text",text);
        if(modern)part.put("speech_metadata",new JSONObject().put("style",(style+"; "+profile+"; português brasileiro, dicção natural").trim()));
        JSONObject vc=modern?new JSONObject().put("voice",voice):new JSONObject().put("prebuiltVoiceConfig",new JSONObject().put("voiceName",voice));
        JSONObject config=new JSONObject().put("responseModalities",new JSONArray().put("AUDIO"))
            .put("speechConfig",new JSONObject().put("languageCode",language).put("voiceConfig",vc));
        if(modern)config.put("responseFormat",new JSONObject().put("audio",new JSONObject().put("mimeType","AUDIO_L16")));
        return new JSONObject().put("contents",new JSONArray().put(new JSONObject().put("role","user").put("parts",new JSONArray().put(part)))).put("generationConfig",config);
    }
    public static JSONObject audioData(JSONObject root)throws Exception{
        JSONArray candidates=root.optJSONArray("candidates");
        if(candidates!=null)for(int i=0;i<candidates.length();i++){
            JSONObject c=candidates.optJSONObject(i);JSONObject content=c==null?null:c.optJSONObject("content");JSONArray parts=content==null?null:content.optJSONArray("parts");
            if(parts!=null)for(int j=0;j<parts.length();j++){JSONObject p=parts.optJSONObject(j);if(p==null)continue;JSONObject data=p.optJSONObject("inlineData");if(data==null)data=p.optJSONObject("inline_data");if(data!=null&&!data.optString("data").isEmpty())return data;}
        }
        throw new IllegalArgumentException("Gemini TTS não retornou áudio: "+root.optString("promptFeedback",root.optString("error","resposta sem dados de áudio")));
    }
    private static int u16(byte[] b,int p){return(b[p]&255)|((b[p+1]&255)<<8);}
    private static long u32(byte[] b,int p){return(u16(b,p)&65535L)|((long)u16(b,p+2)<<16);}
    private static boolean tag(byte[] b,int p,String s){return p+4<=b.length&&b[p]==s.charAt(0)&&b[p+1]==s.charAt(1)&&b[p+2]==s.charAt(2)&&b[p+3]==s.charAt(3);}
    public static byte[] pcm(byte[] bytes,String mime){
        if(bytes==null||bytes.length<2)throw new IllegalArgumentException("Áudio vazio");
        if(tag(bytes,0,"RIFF")){
            if(!tag(bytes,8,"WAVE"))throw new IllegalArgumentException("WAV inválido");
            boolean format=false;int dataAt=-1,dataSize=0;
            for(int p=12;p+8<=bytes.length;){long n=u32(bytes,p+4);if(n>bytes.length-p-8)throw new IllegalArgumentException("WAV truncado");
                if(tag(bytes,p,"fmt ")){if(n<16||u16(bytes,p+8)!=1||u16(bytes,p+10)!=1||u32(bytes,p+12)!=24000||u16(bytes,p+22)!=16)throw new IllegalArgumentException("WAV exige PCM 24 kHz mono 16 bits");format=true;}
                if(tag(bytes,p,"data")){dataAt=p+8;dataSize=(int)n;}p+=8+(int)n+((int)n&1);
            }
            if(!format||dataAt<0||dataSize<2||(dataSize&1)!=0)throw new IllegalArgumentException("WAV sem frames PCM válidos");
            return Arrays.copyOfRange(bytes,dataAt,dataAt+dataSize);
        }
        String type=mime==null?"":mime.toLowerCase();
        if(!(type.contains("l16")||type.contains("pcm")))throw new IllegalArgumentException("Formato de áudio não suportado: "+mime);
        if((bytes.length&1)!=0)throw new IllegalArgumentException("PCM truncado");return bytes;
    }
}
