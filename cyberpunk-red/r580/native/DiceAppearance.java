package com.braseiro.cyberpunkred.dice;

import android.graphics.Color;
import android.graphics.Typeface;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.util.LinkedHashMap;
import java.util.Map;

/** Aparência declarativa do renderer nativo. A física nunca depende destes campos. */
public final class DiceAppearance {
    public String material="obsidian",pattern="smooth",font="serif",sound="auto",quality="auto";
    public int baseColor=Color.rgb(26,25,27),numberColor=Color.rgb(244,232,193),edgeColor=Color.rgb(210,177,83);
    public float shine=.48f,transparency=0f,wear=.12f,edgeWidth=1.25f;
    public boolean effects=true;
    public String faceOneGlyph="",maxFaceGlyph="";
    public final LinkedHashMap<Integer,String> faceImages=new LinkedHashMap<Integer,String>();
    public final LinkedHashMap<Integer,String> faceLabels=new LinkedHashMap<Integer,String>();

    public static DiceAppearance defaults(){return new DiceAppearance();}

    /** Converte o formato persistente do Ateliê de Dados do Braseiro. */
    public static DiceAppearance fromBraseiroTheme(JSONObject o){
        if(o==null)o=new JSONObject();
        String rawMaterial=o.optString("material","obsidiana");
        DiceAppearance d=preset(rawMaterial);
        d.material=normalizeMaterial(rawMaterial);
        d.pattern=normalizePattern(o.optString("texture",o.optString("pattern",d.pattern)));
        d.font=o.optString("font",d.font);
        String base=o.optString("baseColor","");
        if(validHex(base))d.baseColor=parseColor(base,d.baseColor); else d.baseColor=paletteColor(o.optString("palette","âmbar"),d.baseColor);
        d.numberColor=parseColor(o.optString("numberColor",hex(d.numberColor)),d.numberColor);
        d.edgeColor=parseColor(o.optString("borderColor",hex(d.edgeColor)),d.edgeColor);
        d.shine=(float)clamp(o.optDouble("shine",Math.round(d.shine*100))/100.0,0,1);
        double alpha=clamp(o.optDouble("alpha",100),18,100)/100.0;
        d.transparency=(float)clamp(1.0-alpha,0,.82);
        d.wear=(float)clamp(o.optDouble("wear",Math.round(d.wear*100))/100.0,0,1);
        String edge=o.optString("edge","marcada").toLowerCase();
        d.edgeWidth=edge.contains("met")?2.35f:edge.contains("marc")?1.65f:1.05f;
        d.sound=o.optBoolean("sound",true)?"auto":"silent";
        d.effects=o.optBoolean("effects",true);
        d.maxFaceGlyph=o.optString("critGlyph","");
        d.faceOneGlyph=o.optString("fumbleGlyph","");
        JSONObject labels=o.optJSONObject("faceLabels");
        if(labels!=null){JSONArray names=labels.names();if(names!=null)for(int i=0;i<names.length();i++){String k=names.optString(i);if(!k.matches("\\d{1,3}"))continue;int face=Integer.parseInt(k);String v=labels.optString(k,"").trim();if(v.length()>0)d.faceLabels.put(face,v);}}
        JSONObject paths=o.optJSONObject("faceImagePaths");
        if(paths!=null){JSONArray names=paths.names();if(names!=null)for(int i=0;i<names.length();i++){String k=names.optString(i);if(!k.matches("\\d{1,3}"))continue;int face=Integer.parseInt(k);String v=paths.optString(k,"").trim();if(v.length()>0&&new File(v).isFile())d.faceImages.put(face,v);}}
        return d;
    }

    public String imageForFace(int face){String v=faceImages.get(face);return v==null?"":v;}
    public String labelForFace(int face){String v=faceLabels.get(face);return v==null?"":v;}

    public Typeface typeface(){String f=font==null?"":font.toLowerCase();if(f.contains("mono"))return Typeface.create(Typeface.MONOSPACE,Typeface.BOLD);if(f.contains("sans"))return Typeface.create(Typeface.SANS_SERIF,Typeface.BOLD);return Typeface.create(Typeface.SERIF,Typeface.BOLD);}

    public static DiceAppearance preset(String material){DiceAppearance d=defaults();String m=normalizeMaterial(material);d.material=m;
        if("metal".equals(m)){d.baseColor=Color.rgb(95,103,110);d.numberColor=Color.rgb(245,245,238);d.edgeColor=Color.rgb(195,202,210);d.shine=.92f;d.sound="metal";d.pattern="brushed";}
        else if("stone".equals(m)){d.baseColor=Color.rgb(91,87,82);d.numberColor=Color.rgb(232,219,185);d.edgeColor=Color.rgb(66,62,58);d.shine=.12f;d.wear=.48f;d.sound="stone";d.pattern="speckled";}
        else if("bone".equals(m)){d.baseColor=Color.rgb(218,207,168);d.numberColor=Color.rgb(71,54,40);d.edgeColor=Color.rgb(160,143,103);d.shine=.20f;d.wear=.28f;d.sound="bone";d.pattern="grain";}
        else if("wood".equals(m)){d.baseColor=Color.rgb(112,70,39);d.numberColor=Color.rgb(244,218,170);d.edgeColor=Color.rgb(62,38,23);d.shine=.15f;d.sound="wood";d.pattern="grain";}
        else if("crystal".equals(m)){d.baseColor=Color.rgb(69,139,165);d.numberColor=Color.WHITE;d.edgeColor=Color.rgb(175,235,248);d.shine=.92f;d.transparency=.34f;d.sound="crystal";}
        else if("glass".equals(m)){d.baseColor=Color.rgb(150,198,212);d.numberColor=Color.WHITE;d.edgeColor=Color.rgb(220,248,255);d.shine=1f;d.transparency=.58f;d.sound="glass";}
        else if("ivory".equals(m)){d.baseColor=Color.rgb(232,218,178);d.numberColor=Color.rgb(92,25,22);d.edgeColor=Color.rgb(146,112,55);d.shine=.24f;d.wear=.10f;d.edgeWidth=1.10f;d.pattern="grain";d.sound="ivory";}
        else if("leather".equals(m)){d.baseColor=Color.rgb(77,45,31);d.numberColor=Color.rgb(226,185,116);d.edgeColor=Color.rgb(45,28,21);d.shine=.08f;d.wear=.42f;d.sound="leather";d.pattern="grain";}
        else{d.material="obsidian";d.baseColor=Color.rgb(20,20,24);d.numberColor=Color.rgb(242,229,190);d.edgeColor=Color.rgb(170,143,73);d.shine=.72f;d.sound="obsidian";}
        return d;
    }

    private static String normalizeMaterial(String raw){String s=raw==null?"":raw.toLowerCase();if(s.contains("pedra")||s.contains("stone"))return "stone";if(s.contains("metal"))return "metal";if(s.contains("osso")||s.contains("bone"))return "bone";if(s.contains("madeira")||s.contains("wood"))return "wood";if(s.contains("cristal")||s.contains("crystal"))return "crystal";if(s.contains("vidro")||s.contains("glass"))return "glass";if(s.contains("marfim")||s.contains("ivory"))return "ivory";if(s.contains("couro")||s.contains("leather"))return "leather";return "obsidian";}
    private static String normalizePattern(String raw){String s=raw==null?"":raw.toLowerCase();if(s.contains("gran")||s.contains("speck"))return "speckled";if(s.contains("vei")||s.contains("grain")||s.contains("couro"))return "grain";if(s.contains("rach")||s.contains("crack"))return "cracked";if(s.contains("mart")||s.contains("brush"))return "brushed";return "smooth";}
    private static int paletteColor(String p,int fallback){String s=p==null?"":p.toLowerCase();if(s.contains("marfim"))return Color.rgb(238,224,189);if(s.contains("rubi"))return Color.rgb(179,49,69);if(s.contains("esmeralda"))return Color.rgb(47,138,99);if(s.contains("safira"))return Color.rgb(47,98,166);if(s.contains("violeta"))return Color.rgb(106,63,146);if(s.contains("cinza"))return Color.rgb(116,122,131);if(s.contains("cobre"))return Color.rgb(168,94,60);if(s.contains("âmbar")||s.contains("ambar"))return Color.rgb(212,155,60);return fallback;}
    public static int parseColor(String raw,int fallback){try{String s=raw==null?"":raw.trim();if(s.matches("(?i)^[0-9a-f]{6}$"))s="#"+s;if(s.matches("(?i)^#[0-9a-f]{6}$")||s.matches("(?i)^#[0-9a-f]{8}$"))return Color.parseColor(s);}catch(Exception error){android.util.Log.w("WwnDice3D","Cor de dado inválida; usando fallback.",error);}return fallback;}
    private static boolean validHex(String s){return s!=null&&s.matches("(?i)^#[0-9a-f]{6}$");}
    public static String hex(int c){return String.format("#%02X%02X%02X",Color.red(c),Color.green(c),Color.blue(c));}
    private static double clamp(double v,double a,double b){return Math.max(a,Math.min(b,v));}
}

