package com.braseiro.pathfinder2e;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.PointF;
import android.graphics.RectF;
import android.graphics.Shader;
import android.net.Uri;
import android.view.View;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

/**
 * Renderizador 3D projetivo para os corpos físicos do PhysicalDiceEngine.
 * A malha e orientação usadas para desenhar são exatamente as usadas para
 * escolher a face autoritativa. Não há sprite/resultado visual independente.
 */
public final class Dice3DView extends View {
    private PhysicalDiceEngine.Session session;
    private final Paint fill=new Paint(Paint.ANTI_ALIAS_FLAG),edge=new Paint(Paint.ANTI_ALIAS_FLAG),text=new Paint(Paint.ANTI_ALIAS_FLAG),shadow=new Paint(Paint.ANTI_ALIAS_FLAG),fx=new Paint(Paint.ANTI_ALIAS_FLAG);
    private final HashMap<Integer,DiceAppearance> appearances=new HashMap<Integer,DiceAppearance>();
    private final HashMap<String,Bitmap> bitmapCache=new HashMap<String,Bitmap>();
    private final ArrayList<Particle> particles=new ArrayList<Particle>();
    private final Random visualRandom=new Random(918273L);
    private int quality=2; private String qualityMode="auto"; private long lastFrameNs=0; private double frameEmaMs=16; private int frameCount=0;
    private final PhysicalDiceEngine.Vec3 camera=new PhysicalDiceEngine.Vec3(0,-8.8,6.4),target=new PhysicalDiceEngine.Vec3(0,0,.75),worldUp=new PhysicalDiceEngine.Vec3(0,0,1);
    private PhysicalDiceEngine.Vec3 camForward,camRight,camUp;
    private double focal=700;

    public Dice3DView(Context c){super(c);setLayerType(View.LAYER_TYPE_HARDWARE,null);fill.setStyle(Paint.Style.FILL);edge.setStyle(Paint.Style.STROKE);text.setTextAlign(Paint.Align.CENTER);shadow.setStyle(Paint.Style.FILL);rebuildCamera();}
    public void setSession(PhysicalDiceEngine.Session s){session=s;invalidate();}
    public PhysicalDiceEngine.Session getSession(){return session;}
    public void setAppearance(int bodyId,DiceAppearance d){appearances.put(bodyId,d==null?DiceAppearance.defaults():d);if(d!=null&&d.quality!=null){qualityMode=d.quality;String q=d.quality.toLowerCase();if("high".equals(q))quality=2;else if("medium".equals(q))quality=1;else if("low".equals(q))quality=0;}invalidate();}
    public int visualQuality(){return quality;}
    public String visualQualityLabel(){return quality>=2?"alta":quality==1?"média":"econômica";}
    private void rebuildCamera(){camForward=target.sub(camera).normalized();camRight=camForward.cross(worldUp).normalized();camUp=camRight.cross(camForward).normalized();}

    protected void onSizeChanged(int w,int h,int ow,int oh){focal=Math.max(430,Math.min(w,h)*1.18);}
    protected void onDraw(Canvas c){super.onDraw(c);long now=System.nanoTime();if(lastFrameNs>0){double ms=(now-lastFrameNs)/1e6;frameEmaMs=frameEmaMs*.94+ms*.06;frameCount++;if("auto".equalsIgnoreCase(qualityMode)&&frameCount%45==0){if(frameEmaMs>25&&quality>0)quality--;else if(frameEmaMs<14.5&&quality<2)quality++;}}lastFrameNs=now;
        drawFloor(c);if(session!=null){for(PhysicalDiceEngine.DieBody d:session.bodies)drawShadow(c,d);ArrayList<FaceDraw> faces=new ArrayList<FaceDraw>();for(PhysicalDiceEngine.DieBody d:session.bodies)collectFaces(d,faces);Collections.sort(faces,new Comparator<FaceDraw>(){public int compare(FaceDraw a,FaceDraw b){return Double.compare(b.depth,a.depth);}});for(FaceDraw f:faces)drawFace(c,f);}drawParticles(c);}

    private void drawFloor(Canvas c){Paint p=new Paint(Paint.ANTI_ALIAS_FLAG);p.setColor(Color.argb(28,15,14,13));c.drawRect(0,0,getWidth(),getHeight(),p);if(quality==0)return;Path plane=new Path();PointF a=project(new PhysicalDiceEngine.Vec3(-4,-2.8,0)),b=project(new PhysicalDiceEngine.Vec3(4,-2.8,0)),d=project(new PhysicalDiceEngine.Vec3(4,3,0)),e=project(new PhysicalDiceEngine.Vec3(-4,3,0));if(a==null||b==null||d==null||e==null)return;plane.moveTo(a.x,a.y);plane.lineTo(b.x,b.y);plane.lineTo(d.x,d.y);plane.lineTo(e.x,e.y);plane.close();p.setColor(Color.argb(150,38,33,28));c.drawPath(plane,p);if(quality>=2){p.setStyle(Paint.Style.STROKE);p.setStrokeWidth(1);p.setColor(Color.argb(34,220,190,120));for(int i=-3;i<=3;i++){PointF p1=project(new PhysicalDiceEngine.Vec3(i,-2.5,.005)),p2=project(new PhysicalDiceEngine.Vec3(i,2.8,.005));if(p1!=null&&p2!=null)c.drawLine(p1.x,p1.y,p2.x,p2.y,p);}for(int i=-2;i<=2;i++){PointF p1=project(new PhysicalDiceEngine.Vec3(-3.8,i,.005)),p2=project(new PhysicalDiceEngine.Vec3(3.8,i,.005));if(p1!=null&&p2!=null)c.drawLine(p1.x,p1.y,p2.x,p2.y,p);}}}
    private void drawShadow(Canvas c,PhysicalDiceEngine.DieBody d){PointF p=project(new PhysicalDiceEngine.Vec3(d.position.x,d.position.y,.015));if(p==null)return;PointF px=project(new PhysicalDiceEngine.Vec3(d.position.x+d.scale,d.position.y,.015));if(px==null)return;float r=Math.max(8,Math.abs(px.x-p.x));float height=(float)Math.max(0,d.position.z-d.scale);float alpha=(float)(85/(1+height*.8));shadow.setColor(Color.argb((int)alpha,0,0,0));RectF oval=new RectF(p.x-r*1.12f,p.y-r*.34f,p.x+r*1.12f,p.y+r*.34f);c.drawOval(oval,shadow);}
    private void collectFaces(PhysicalDiceEngine.DieBody body,List<FaceDraw> out){DiceAppearance style=appearances.containsKey(body.id)?appearances.get(body.id):DiceAppearance.defaults();for(PhysicalDiceEngine.Face f:body.mesh.faces){PhysicalDiceEngine.Vec3 center=body.position.add(body.orientation.rotate(f.center.mul(body.scale)));PhysicalDiceEngine.Vec3 normal=body.worldNormal(f);PhysicalDiceEngine.Vec3 toCam=camera.sub(center);if(normal.dot(toCam)<=0)continue;PointF[] pts=new PointF[f.indices.length];double depth=0;boolean valid=true;for(int i=0;i<f.indices.length;i++){PhysicalDiceEngine.Vec3 w=body.worldVertex(f.indices[i]);Projected q=projectFull(w);if(q==null){valid=false;break;}pts[i]=new PointF(q.x,q.y);depth+=q.depth;}if(!valid)continue;out.add(new FaceDraw(body,f,style,pts,center,normal,depth/f.indices.length));}}
    private void drawFace(Canvas c,FaceDraw fd){Path path=new Path();path.moveTo(fd.points[0].x,fd.points[0].y);for(int i=1;i<fd.points.length;i++)path.lineTo(fd.points[i].x,fd.points[i].y);path.close();float light=(float)Math.max(0,fd.normal.dot(new PhysicalDiceEngine.Vec3(-.35,-.45,.82).normalized()));float facing=(float)Math.max(0,fd.normal.dot(camera.sub(fd.center).normalized()));int base=fd.style.baseColor;float brightness=.48f+.46f*light;int col=scaleColor(base,brightness);int alpha=(int)(255*(1-Math.max(0,Math.min(.82,fd.style.transparency))));fill.setShader(null);if(quality>=1&&fd.style.shine>.35f){RectF bb=bounds(fd.points);int hi=blend(col,Color.WHITE,Math.min(.34f,fd.style.shine*.26f*facing));fill.setShader(new LinearGradient(bb.left,bb.top,bb.right,bb.bottom,hi,col,Shader.TileMode.CLAMP));}else fill.setColor(withAlpha(col,alpha));fill.setAlpha(alpha);c.drawPath(path,fill);fill.setShader(null);drawPattern(c,path,fd);drawFaceImage(c,path,fd);edge.setStrokeWidth(Math.max(1,fd.style.edgeWidth*getResources().getDisplayMetrics().density));edge.setColor(withAlpha(fd.style.edgeColor,Math.max(90,alpha)));c.drawPath(path,edge);drawLabel(c,fd);}
    private void drawPattern(Canvas c,Path clip,FaceDraw fd){if(quality==0)return;String p=fd.style.pattern==null?"":fd.style.pattern.toLowerCase();if((p.length()==0||"smooth".equals(p))&&fd.style.wear<.2f)return;RectF b=bounds(fd.points);c.save();c.clipPath(clip);Paint q=new Paint(Paint.ANTI_ALIAS_FLAG);q.setStrokeWidth(1.2f);long seed=fd.body.id*1009L+fd.face.value*7919L;Random r=new Random(seed);int count=quality>=2?10:5;float wear=fd.style.wear;if("speckled".equals(p)||wear>.35f){q.setColor(Color.argb((int)(18+wear*45),255,255,255));for(int i=0;i<count;i++){float x=b.left+r.nextFloat()*b.width(),y=b.top+r.nextFloat()*b.height();c.drawCircle(x,y,1+r.nextFloat()*2,q);}}if("grain".equals(p)||"brushed".equals(p)){q.setColor(Color.argb("brushed".equals(p)?35:24,255,255,255));for(int i=0;i<(quality>=2?6:3);i++){float y=b.top+(i+1)*b.height()/7;c.drawLine(b.left,y,b.right,y+(r.nextFloat()-.5f)*8,q);}}if("cracked".equals(p)||wear>.68f){q.setColor(Color.argb(60,10,10,10));for(int i=0;i<3;i++){float x=b.centerX(),y=b.centerY();c.drawLine(x,y,b.left+r.nextFloat()*b.width(),b.top+r.nextFloat()*b.height(),q);}}c.restore();}
    private void drawFaceImage(Canvas c,Path clip,FaceDraw fd){RectF full=bounds(fd.points);if(fd.style.textureImageUri!=null&&fd.style.textureImageUri.length()>0&&quality>0){Bitmap tex=bitmap(fd.style.textureImageUri);if(tex!=null){c.save();c.clipPath(clip);Paint tp=new Paint(Paint.ANTI_ALIAS_FLAG|Paint.FILTER_BITMAP_FLAG);tp.setAlpha(quality>=2?90:55);c.drawBitmap(tex,null,full,tp);c.restore();}}String uri="";if(fd.face.value==1)uri=fd.style.faceOneImageUri;if(fd.face.value==fd.body.sides&&fd.style.maxFaceImageUri!=null&&fd.style.maxFaceImageUri.length()>0)uri=fd.style.maxFaceImageUri;if(uri==null||uri.length()==0)return;Bitmap bm=bitmap(uri);if(bm==null)return;RectF b=new RectF(full);float pad=Math.min(b.width(),b.height())*.16f;b.inset(pad,pad);c.save();c.clipPath(clip);Paint p=new Paint(Paint.ANTI_ALIAS_FLAG|Paint.FILTER_BITMAP_FLAG);p.setAlpha(220);c.drawBitmap(bm,null,b,p);c.restore();}
    private void drawLabel(Canvas c,FaceDraw fd){PointF pc=project(fd.center);if(pc==null)return;RectF b=bounds(fd.points);float size=Math.max(9,Math.min(b.width(),b.height())*.43f);String glyph="";if(fd.face.value==1)glyph=fd.style.faceOneGlyph;if(fd.face.value==fd.body.sides&&fd.style.maxFaceGlyph!=null&&fd.style.maxFaceGlyph.length()>0)glyph=fd.style.maxFaceGlyph;String label=fd.body.displayValue(fd.face);text.setTypeface(fd.style.typeface());text.setColor(fd.style.numberColor);text.setShadowLayer(2,0,1,Color.argb(150,0,0,0));if(glyph!=null&&glyph.trim().length()>0){text.setTextSize(size*.82f);c.drawText(glyph.trim(),pc.x,pc.y+size*.18f,text);text.setTextSize(Math.max(8,size*.28f));c.drawText(label,pc.x,pc.y+size*.54f,text);}else{text.setTextSize(size);Paint.FontMetrics fm=text.getFontMetrics();c.drawText(label,pc.x,pc.y-(fm.ascent+fm.descent)/2,text);}text.clearShadowLayer();}
    private Bitmap bitmap(String uri){if(bitmapCache.containsKey(uri))return bitmapCache.get(uri);Bitmap bm=null;try{InputStream in=getContext().getContentResolver().openInputStream(Uri.parse(uri));if(in!=null){bm=BitmapFactory.decodeStream(in);in.close();}}catch(Exception error){AppLog.ignored("Dados3D","Não foi possível abrir textura/imagem personalizada do dado.",error);}bitmapCache.put(uri,bm);return bm;}
    private RectF bounds(PointF[] p){float l=Float.MAX_VALUE,t=Float.MAX_VALUE,r=-Float.MAX_VALUE,b=-Float.MAX_VALUE;for(PointF q:p){l=Math.min(l,q.x);t=Math.min(t,q.y);r=Math.max(r,q.x);b=Math.max(b,q.y);}return new RectF(l,t,r,b);}
    private PointF project(PhysicalDiceEngine.Vec3 w){Projected p=projectFull(w);return p==null?null:new PointF(p.x,p.y);}
    private Projected projectFull(PhysicalDiceEngine.Vec3 w){PhysicalDiceEngine.Vec3 rel=w.sub(camera);double cx=rel.dot(camRight),cy=rel.dot(camUp),cz=rel.dot(camForward);if(cz<.18)return null;double f=focal/cz;return new Projected((float)(getWidth()*.5+cx*f),(float)(getHeight()*.54-cy*f),cz);}
    private int scaleColor(int c,float s){return Color.argb(Color.alpha(c),clamp255(Color.red(c)*s),clamp255(Color.green(c)*s),clamp255(Color.blue(c)*s));}
    private int blend(int a,int b,float t){return Color.rgb(clamp255(Color.red(a)*(1-t)+Color.red(b)*t),clamp255(Color.green(a)*(1-t)+Color.green(b)*t),clamp255(Color.blue(a)*(1-t)+Color.blue(b)*t));}
    private int withAlpha(int c,int a){return Color.argb(Math.max(0,Math.min(255,a)),Color.red(c),Color.green(c),Color.blue(c));}private int clamp255(double v){return (int)Math.max(0,Math.min(255,Math.round(v)));}

    public void triggerOutcome(String outcome){particles.clear();String o=outcome==null?"":outcome.toLowerCase();int n=o.contains("critical_success")||o.contains("sucesso decisivo")?30:o.contains("critical_failure")||o.contains("falha crítica")?12:0;if(n==0)return;float cx=getWidth()*.5f,cy=getHeight()*.42f;for(int i=0;i<n;i++){double a=visualRandom.nextDouble()*Math.PI*2;float speed=(float)(40+visualRandom.nextDouble()*170);Particle p=new Particle();p.x=cx;p.y=cy;p.vx=(float)Math.cos(a)*speed;p.vy=(float)Math.sin(a)*speed-(o.contains("success")?70:0);p.life=1;p.gold=o.contains("success");particles.add(p);}invalidate();}
    private void drawParticles(Canvas c){if(particles.isEmpty())return;for(int i=particles.size()-1;i>=0;i--){Particle p=particles.get(i);p.x+=p.vx/60f;p.y+=p.vy/60f;p.vy+=3.5f;p.life-=.025f;if(p.life<=0){particles.remove(i);continue;}fx.setColor(p.gold?Color.argb((int)(220*p.life),230,190,75):Color.argb((int)(170*p.life),110,90,75));c.drawCircle(p.x,p.y,p.gold?3.2f:4.2f,fx);}if(!particles.isEmpty())postInvalidateOnAnimation();}
    private static final class Projected{float x,y;double depth;Projected(float x,float y,double d){this.x=x;this.y=y;depth=d;}}
    private static final class FaceDraw{PhysicalDiceEngine.DieBody body;PhysicalDiceEngine.Face face;DiceAppearance style;PointF[] points;PhysicalDiceEngine.Vec3 center,normal;double depth;FaceDraw(PhysicalDiceEngine.DieBody b,PhysicalDiceEngine.Face f,DiceAppearance s,PointF[] p,PhysicalDiceEngine.Vec3 c,PhysicalDiceEngine.Vec3 n,double d){body=b;face=f;style=s;points=p;center=c;normal=n;depth=d;}}
    private static final class Particle{float x,y,vx,vy,life;boolean gold;}
}
