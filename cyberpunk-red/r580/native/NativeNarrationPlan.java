package com.braseiro.cyberpunkred;
import java.text.Normalizer;
import java.util.*;

/** Port of FL NarrationChunkPlanner ab084713 + spokenTranscript 4af3994f. */
public final class NativeNarrationPlan {
 public static final class Chunk {
  public final String text; public final int offset;
  Chunk(String text,int offset){this.text=text;this.offset=offset;}
 }
 public static String spoken(String input){
  return Normalizer.normalize(input==null?"":input,Normalizer.Form.NFC)
   .replaceAll("(?i)<\\s*/?\\s*(?:sigh|breath|short[ -]pause|laugh|cough|speaker|voice)(?:\\s+[^>]*)?\\s*/?\\s*>"," ")
   .replaceAll("(?i)\\[\\s*(?:voz|voice|speaker|perfil\\s+vocal|estilo\\s+vocal|voice\\s+profile|voice\\s+style|emotion|emoção|tom|tone|sfx|pause|pausa|style|profile)\\s*[:=][^\\]\\r\\n]{0,200}\\]"," ")
   .replaceAll("(?im)^(?:Speaker\\s*\\d+|Locutor\\s*\\d+|NARRADOR|VOICE|PERFIL\\s+VOCAL|ESTILO\\s+VOCAL)\\s*:\\s*","")
   .replaceAll("\\s+"," ").trim();
 }
 private static boolean white(char c){return Character.isWhitespace(c)||Character.isSpaceChar(c);}
 public static List<Chunk> plan(String input){
  ArrayList<Chunk> out=new ArrayList<>();int cursor=0;
  while(cursor<input.length()){
   while(cursor<input.length()&&white(input.charAt(cursor)))cursor++;
   if(cursor>=input.length())break;
   int max=out.isEmpty()?560:760,end=Math.min(cursor+max,input.length()),cut=end;
   if(end<input.length()){
    int lower=Math.min(end,cursor+Math.min(350,max-20)),candidate=-1;
    for(int i=end;i>=lower;i--){
     if(".!?…".indexOf(input.charAt(i-1))<0)continue;
     int sentenceEnd=i;
     while(sentenceEnd<input.length()&&"\"'”’»)}]".indexOf(input.charAt(sentenceEnd))>=0)sentenceEnd++;
     if(sentenceEnd<=end&&(sentenceEnd==input.length()||white(input.charAt(sentenceEnd)))){candidate=sentenceEnd;break;}
    }
    if(candidate<0)for(int i=end;i>=lower;i--)if(";:,\n".indexOf(input.charAt(i-1))>=0&&(i==input.length()||white(input.charAt(i)))){candidate=i;break;}
    if(candidate<0)for(int i=end;i>=lower;i--)if(white(input.charAt(i))){candidate=i;break;}
    if(candidate<0){candidate=end;while(candidate<input.length()&&!white(input.charAt(candidate)))candidate++;}
    cut=candidate;
   }
   int trim=cut;while(trim>cursor&&white(input.charAt(trim-1)))trim--;
   if(trim>cursor){if(trim-cursor>3900)throw new IllegalArgumentException("Uma palavra isolada ultrapassa o limite seguro do TTS Android.");out.add(new Chunk(input.substring(cursor,trim),cursor));}
   if(cut<=cursor)throw new IllegalStateException("Segmentação de voz sem progresso");cursor=cut;
  }
  return out;
 }
}
