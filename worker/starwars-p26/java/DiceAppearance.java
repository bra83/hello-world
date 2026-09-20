package com.braseiro.pathfinder2e;

import android.graphics.Color;
import android.graphics.Typeface;
import org.json.JSONObject;

/** Aparência declarativa de um conjunto de dados. Mecânica e física não dependem dela. */
public final class DiceAppearance {
    public String material="obsidian";
    public String pattern="smooth";
    public int baseColor=Color.rgb(26,25,27);
    public int numberColor=Color.rgb(244,232,193);
    public int edgeColor=Color.rgb(210,177,83);
    public String font="serif";
    public float shine=.48f;
    public float transparency=0f;
    public float wear=.12f;
    public float edgeWidth=1.25f;
    public String sound="auto";
    public String faceOneGlyph="";
    public String maxFaceGlyph="";
    public String faceOneImageUri="";
    public String maxFaceImageUri="";
    public String textureImageUri="";
    public String quality="auto";

    public static DiceAppearance defaults(){return new DiceAppearance();}
    public static DiceAppearance fromJson(String raw){DiceAppearance d=defaults();try{return fromJson(new JSONObject(raw==null?"{}":raw),d);}catch(Exception error){AppLog.ignored("Dados3D","Aparência inválida; usando padrão seguro.",error);return d;}}
    public static DiceAppearance fromJson(JSONObject o,DiceAppearance fallback){DiceAppearance d=fallback==null?defaults():fallback.copy();if(o==null)return d;d.material=o.optString("material",d.material);d.pattern=o.optString("pattern",d.pattern);d.baseColor=parseColor(o.optString("base_color",hex(d.baseColor)),d.baseColor);d.numberColor=parseColor(o.optString("number_color",hex(d.numberColor)),d.numberColor);d.edgeColor=parseColor(o.optString("edge_color",hex(d.edgeColor)),d.edgeColor);d.font=o.optString("font",d.font);d.shine=(float)clamp(o.optDouble("shine",d.shine),0,1);d.transparency=(float)clamp(o.optDouble("transparency",d.transparency),0,.82);d.wear=(float)clamp(o.optDouble("wear",d.wear),0,1);d.edgeWidth=(float)clamp(o.optDouble("edge_width",d.edgeWidth),.2,4);d.sound=o.optString("sound",d.sound);d.faceOneGlyph=o.optString("face_one_glyph",d.faceOneGlyph);d.maxFaceGlyph=o.optString("max_face_glyph",d.maxFaceGlyph);d.faceOneImageUri=o.optString("face_one_image_uri",d.faceOneImageUri);d.maxFaceImageUri=o.optString("max_face_image_uri",d.maxFaceImageUri);d.textureImageUri=o.optString("texture_image_uri",d.textureImageUri);d.quality=o.optString("quality",d.quality);return d;}
    public JSONObject toJson(){JSONObject o=new JSONObject();try{o.put("material",material).put("pattern",pattern).put("base_color",hex(baseColor)).put("number_color",hex(numberColor)).put("edge_color",hex(edgeColor)).put("font",font).put("shine",shine).put("transparency",transparency).put("wear",wear).put("edge_width",edgeWidth).put("sound",sound).put("face_one_glyph",faceOneGlyph).put("max_face_glyph",maxFaceGlyph).put("face_one_image_uri",faceOneImageUri).put("max_face_image_uri",maxFaceImageUri).put("texture_image_uri",textureImageUri).put("quality",quality);}catch(Exception error){AppLog.ignored("Dados3D","Falha ao serializar aparência de dados.",error);}return o;}
    public DiceAppearance copy(){DiceAppearance d=new DiceAppearance();d.material=material;d.pattern=pattern;d.baseColor=baseColor;d.numberColor=numberColor;d.edgeColor=edgeColor;d.font=font;d.shine=shine;d.transparency=transparency;d.wear=wear;d.edgeWidth=edgeWidth;d.sound=sound;d.faceOneGlyph=faceOneGlyph;d.maxFaceGlyph=maxFaceGlyph;d.faceOneImageUri=faceOneImageUri;d.maxFaceImageUri=maxFaceImageUri;d.textureImageUri=textureImageUri;d.quality=quality;return d;}
    public Typeface typeface(){String f=font==null?"":font.toLowerCase();if(f.contains("mono"))return Typeface.create(Typeface.MONOSPACE,Typeface.BOLD);if(f.contains("sans"))return Typeface.create(Typeface.SANS_SERIF,Typeface.BOLD);if(f.contains("bold"))return Typeface.DEFAULT_BOLD;return Typeface.create(Typeface.SERIF,Typeface.BOLD);}
    public static int parseColor(String raw,int fallback){try{String s=raw==null?"":raw.trim();if(s.matches("(?i)^[0-9a-f]{6}$"))s="#"+s;if(s.matches("(?i)^#[0-9a-f]{6}$"))return Color.parseColor(s);if(s.matches("(?i)^#[0-9a-f]{8}$"))return Color.parseColor(s);}catch(Exception error){AppLog.ignored("Dados3D","Cor personalizada inválida; mantendo cor anterior.",error);}return fallback;}
    public static String hex(int c){return String.format("#%02X%02X%02X",Color.red(c),Color.green(c),Color.blue(c));}
    private static double clamp(double v,double a,double b){return Math.max(a,Math.min(b,v));}

    public static DiceAppearance preset(String material){DiceAppearance d=defaults();String m=material==null?"obsidian":material.toLowerCase();d.material=m;
        if(m.contains("metal")){d.baseColor=Color.rgb(95,103,110);d.numberColor=Color.rgb(245,245,238);d.edgeColor=Color.rgb(195,202,210);d.shine=.92f;d.sound="metal";d.pattern="brushed";}
        else if(m.contains("stone")||m.contains("pedra")){d.baseColor=Color.rgb(91,87,82);d.numberColor=Color.rgb(232,219,185);d.edgeColor=Color.rgb(66,62,58);d.shine=.12f;d.wear=.48f;d.sound="stone";d.pattern="speckled";}
        else if(m.contains("bone")||m.contains("osso")){d.baseColor=Color.rgb(218,207,168);d.numberColor=Color.rgb(71,54,40);d.edgeColor=Color.rgb(160,143,103);d.shine=.20f;d.wear=.28f;d.sound="bone";d.pattern="grain";}
        else if(m.contains("wood")||m.contains("madeira")){d.baseColor=Color.rgb(112,70,39);d.numberColor=Color.rgb(244,218,170);d.edgeColor=Color.rgb(62,38,23);d.shine=.15f;d.sound="wood";d.pattern="grain";}
        else if(m.contains("crystal")||m.contains("cristal")){d.baseColor=Color.rgb(69,139,165);d.numberColor=Color.WHITE;d.edgeColor=Color.rgb(175,235,248);d.shine=.92f;d.transparency=.34f;d.sound="crystal";d.pattern="smooth";}
        else if(m.contains("glass")||m.contains("vidro")){d.baseColor=Color.rgb(150,198,212);d.numberColor=Color.WHITE;d.edgeColor=Color.rgb(220,248,255);d.shine=1f;d.transparency=.58f;d.sound="glass";d.pattern="smooth";}
        else if(m.contains("ivory")||m.contains("marfim")){d.baseColor=Color.rgb(238,228,194);d.numberColor=Color.rgb(42,37,34);d.edgeColor=Color.rgb(181,160,109);d.shine=.34f;d.sound="ivory";d.pattern="smooth";}
        else if(m.contains("leather")||m.contains("couro")){d.baseColor=Color.rgb(77,45,31);d.numberColor=Color.rgb(226,185,116);d.edgeColor=Color.rgb(45,28,21);d.shine=.08f;d.wear=.42f;d.sound="leather";d.pattern="grain";}
        else if(m.contains("plastic")||m.contains("resin")){d.baseColor=Color.rgb(34,45,58);d.numberColor=Color.WHITE;d.edgeColor=Color.rgb(130,161,190);d.shine=.55f;d.sound="plastic";}
        else{d.material="obsidian";d.baseColor=Color.rgb(20,20,24);d.numberColor=Color.rgb(242,229,190);d.edgeColor=Color.rgb(170,143,73);d.shine=.72f;d.sound="obsidian";d.pattern="smooth";}
        return d;
    }
}
