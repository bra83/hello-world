package com.braseiro.cyberpunkred.dice;

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

import java.io.File;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Random;

/**
 * Renderizador projetivo nativo da mesa física madura do Braseiro.
 * A malha e a orientação desenhadas são as mesmas que produzem a face autoritativa.
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
    private double focal=700,visualCenterX=0,visualCenterY=0,visualZoom=1;

    public Dice3DView(Context c){super(c);setLayerType(View.LAYER_TYPE_HARDWARE,null);setBackgroundColor(Color.TRANSPARENT);fill.setStyle(Paint.Style.FILL);edge.setStyle(Paint.Style.STROKE);text.setTextAlign(Paint.Align.CENTER);shadow.setStyle(Paint.Style.FILL);rebuildCamera();}
    public void setSession(PhysicalDiceEngine.Session s){session=s;invalidate();}
    public PhysicalDiceEngine.Session getSession(){return session;}
    public void setAppearance(int bodyId,DiceAppearance d){appearances.put(bodyId,d==null?DiceAppearance.defaults():d);invalidate();}
    public int visualQuality(){return quality;}
    public String visualQualityLabel(){return quality>=2?"alta":quality==1?"média":"econômica";}
    private void rebuildCamera(){camForward=target.sub(camera).normalized();camRight=camForward.cross(worldUp).normalized();camUp=camRight.cross(camForward).normalized();}

    @Override protected void onSizeChanged(int w,int h,int ow,int oh){focal=Math.max(430,Math.min(w,h)*1.18);}
    @Override protected void onDraw(Canvas c){super.onDraw(c);long now=System.nanoTime();if(lastFrameNs>0){double ms=(now-lastFrameNs)/1e6;frameEmaMs=frameEmaMs*.94+ms*.06;frameCount++;if("auto".equalsIgnoreCase(qualityMode)&&frameCount%45==0){if(frameEmaMs>25&&quality>0)quality--;else if(frameEmaMs<14.5&&quality<2)quality++;}}lastFrameNs=now;
        if(session!=null)updateVisualFraming();drawFloor(c);if(session!=null){for(PhysicalDiceEngine.DieBody d:session.bodies)drawShadow(c,d);ArrayList<FaceDraw> faces=new ArrayList<FaceDraw>();for(PhysicalDiceEngine.DieBody d:session.bodies)collectFaces(d,faces);Collections.sort(faces,new Comparator<FaceDraw>(){public int compare(FaceDraw a,FaceDraw b){return Double.compare(b.depth,a.depth);}});for(FaceDraw f:faces)drawFace(c,f);}drawParticles(c);}

    private void drawFloor(Canvas c){Paint p=new Paint(Paint.ANTI_ALIAS_FLAG);p.setColor(Color.argb(24,10,9,8));c.drawRect(0,0,getWidth(),getHeight(),p);if(quality==0||session==null)return;double hw=Math.max(3.7,session.halfWidth),hd=Math.max(2.6,session.halfDepth);Path plane=new Path();PointF a=project(new PhysicalDiceEngine.Vec3(-hw,-hd,0)),b=project(new PhysicalDiceEngine.Vec3(hw,-hd,0)),d=project(new PhysicalDiceEngine.Vec3(hw,hd,0)),e=project(new PhysicalDiceEngine.Vec3(-hw,hd,0));if(a==null||b==null||d==null||e==null)return;plane.moveTo(a.x,a.y);plane.lineTo(b.x,b.y);plane.lineTo(d.x,d.y);plane.lineTo(e.x,e.y);plane.close();RectF bounds=new RectF();plane.computeBounds(bounds,true);p.setShader(new LinearGradient(bounds.left,bounds.top,bounds.left,bounds.bottom,Color.argb(165,36,31,27),Color.argb(178,22,20,18),Shader.TileMode.CLAMP));c.drawPath(plane,p);p.setShader(null);p.setStyle(Paint.Style.STROKE);p.setStrokeWidth(Math.max(1,getResources().getDisplayMetrics().density*.65f));p.setColor(Color.argb(60,190,156,96));c.drawPath(plane,p);if(quality>=2){p.setStrokeWidth(Math.max(.7f,getResources().getDisplayMetrics().density*.48f));p.setColor(Color.argb(38,220,190,120));int xLines=Math.max(6,(int)Math.ceil(hw*2));for(int i=1;i<xLines;i++){double x=-hw+(2*hw*i/xLines);PointF p1=project(new PhysicalDiceEngine.Vec3(x,-hd+.08,.005)),p2=project(new PhysicalDiceEngine.Vec3(x,hd-.08,.005));if(p1!=null&&p2!=null)c.drawLine(p1.x,p1.y,p2.x,p2.y,p);}int yLines=Math.max(5,(int)Math.ceil(hd*2));for(int i=1;i<yLines;i++){double y=-hd+(2*hd*i/yLines);PointF p1=project(new PhysicalDiceEngine.Vec3(-hw+.08,y,.005)),p2=project(new PhysicalDiceEngine.Vec3(hw-.08,y,.005));if(p1!=null&&p2!=null)c.drawLine(p1.x,p1.y,p2.x,p2.y,p);}}}
    private void drawShadow(Canvas c,PhysicalDiceEngine.DieBody d){PointF p=projectDie(new PhysicalDiceEngine.Vec3(d.position.x,d.position.y,.015));if(p==null)return;PointF px=projectDie(new PhysicalDiceEngine.Vec3(d.position.x+d.scale,d.position.y,.015));if(px==null)return;float r=Math.max(8,Math.abs(px.x-p.x));float height=(float)Math.max(0,d.position.z-d.scale);float alpha=(float)(88/(1+height*.8));shadow.setColor(Color.argb((int)alpha,0,0,0));RectF oval=new RectF(p.x-r*1.12f,p.y-r*.34f,p.x+r*1.12f,p.y+r*.34f);c.drawOval(oval,shadow);}
    private void collectFaces(PhysicalDiceEngine.DieBody body,List<FaceDraw> out){DiceAppearance style=appearances.containsKey(body.id)?appearances.get(body.id):DiceAppearance.defaults();for(PhysicalDiceEngine.Face f:body.mesh.faces){PhysicalDiceEngine.Vec3 center=body.position.add(body.orientation.rotate(f.center.mul(body.scale)));PhysicalDiceEngine.Vec3 normal=body.worldNormal(f);PhysicalDiceEngine.Vec3 renderCenter=new PhysicalDiceEngine.Vec3(center.x-visualCenterX,center.y-visualCenterY,center.z);PhysicalDiceEngine.Vec3 toCam=camera.sub(renderCenter);if(normal.dot(toCam)<=0)continue;PointF[] pts=new PointF[f.indices.length];double depth=0;boolean valid=true;for(int i=0;i<f.indices.length;i++){PhysicalDiceEngine.Vec3 w=body.worldVertex(f.indices[i]);Projected q=projectDieFull(w);if(q==null){valid=false;break;}pts[i]=new PointF(q.x,q.y);depth+=q.depth;}if(!valid)continue;out.add(new FaceDraw(body,f,style,pts,center,normal,depth/f.indices.length));}}
    private void drawFace(Canvas c,FaceDraw fd){
        Path path=polygonPath(fd.points);float light=(float)Math.max(0,fd.normal.dot(new PhysicalDiceEngine.Vec3(-.35,-.45,.82).normalized()));float facing=(float)Math.max(0,fd.normal.dot(camera.sub(fd.center).normalized()));int base=fd.style.baseColor;float brightness=.48f+.48f*light;int col=scaleColor(base,brightness);int alpha=(int)(255*(1-Math.max(0,Math.min(.82,fd.style.transparency))));
        // Outer ring is deliberately darker: a projected chamfer makes the die feel cut from a solid material.
        fill.setShader(null);fill.setAlpha(alpha);fill.setColor(withAlpha(scaleColor(col,.78f),alpha));c.drawPath(path,fill);
        PointF[] innerPts=insetPolygon(fd.points,.865f);Path inner=polygonPath(innerPts);RectF bb=bounds(innerPts);int hi=blend(col,Color.WHITE,Math.min(.32f,fd.style.shine*.24f*facing));if(quality>=1){fill.setShader(new LinearGradient(bb.left,bb.top,bb.right,bb.bottom,hi,col,Shader.TileMode.CLAMP));}else fill.setColor(withAlpha(col,alpha));fill.setAlpha(alpha);c.drawPath(inner,fill);fill.setShader(null);
        drawPattern(c,inner,new FaceDraw(fd.body,fd.face,fd.style,innerPts,fd.center,fd.normal,fd.depth));boolean custom=drawFaceImage(c,inner,new FaceDraw(fd.body,fd.face,fd.style,innerPts,fd.center,fd.normal,fd.depth));
        edge.setStrokeWidth(Math.max(.8f,fd.style.edgeWidth*getResources().getDisplayMetrics().density*.78f));edge.setColor(withAlpha(fd.style.edgeColor,Math.max(118,alpha)));c.drawPath(path,edge);edge.setStrokeWidth(Math.max(.55f,getResources().getDisplayMetrics().density*.45f));edge.setColor(withAlpha(blend(fd.style.edgeColor,Color.WHITE,.22f),Math.min(175,alpha)));c.drawPath(inner,edge);
        drawLabel(c,new FaceDraw(fd.body,fd.face,fd.style,innerPts,fd.center,fd.normal,fd.depth),custom);
    }
    private void drawPattern(Canvas c,Path clip,FaceDraw fd){if(quality==0)return;String p=fd.style.pattern==null?"":fd.style.pattern.toLowerCase();if((p.length()==0||"smooth".equals(p))&&fd.style.wear<.2f)return;RectF b=bounds(fd.points);c.save();c.clipPath(clip);Paint q=new Paint(Paint.ANTI_ALIAS_FLAG);q.setStrokeWidth(1.2f);long seed=fd.body.id*1009L+fd.face.value*7919L;Random r=new Random(seed);int count=quality>=2?10:5;float wear=fd.style.wear;if("speckled".equals(p)||wear>.35f){q.setColor(Color.argb((int)(18+wear*45),255,255,255));for(int i=0;i<count;i++){float x=b.left+r.nextFloat()*b.width(),y=b.top+r.nextFloat()*b.height();c.drawCircle(x,y,1+r.nextFloat()*2,q);}}if("grain".equals(p)||"brushed".equals(p)){q.setColor(Color.argb("brushed".equals(p)?35:24,255,255,255));for(int i=0;i<(quality>=2?6:3);i++){float y=b.top+(i+1)*b.height()/7;c.drawLine(b.left,y,b.right,y+(r.nextFloat()-.5f)*8,q);}}if("cracked".equals(p)||wear>.68f){q.setColor(Color.argb(60,10,10,10));for(int i=0;i<3;i++){float x=b.centerX(),y=b.centerY();c.drawLine(x,y,b.left+r.nextFloat()*b.width(),b.top+r.nextFloat()*b.height(),q);}}c.restore();}
    private boolean drawFaceImage(Canvas c,Path clip,FaceDraw fd){String uri=fd.style.imageForFace(fd.face.value);if(uri==null||uri.length()==0)return false;Bitmap bm=bitmap(uri);if(bm==null)return false;RectF full=bounds(fd.points),b=new RectF(full);float pad=Math.min(b.width(),b.height())*.16f;b.inset(pad,pad);c.save();c.clipPath(clip);Paint p=new Paint(Paint.ANTI_ALIAS_FLAG|Paint.FILTER_BITMAP_FLAG);p.setAlpha(228);c.drawBitmap(bm,null,b,p);c.restore();return true;}
    // A face-local glyph texture is projected by the SAME body quaternion as
    // the polygon. Numbers tilt/rotate with the die instead of facing the screen.
    private final HashMap<String,Bitmap> glyphTextures=new HashMap<String,Bitmap>();
    private void drawLabel(Canvas c,FaceDraw fd,boolean customImage){
        PhysicalDiceEngine.Face f=fd.face;
        PhysicalDiceEngine.Vec3 first=fd.body.mesh.vertices.get(f.indices[0]);
        PhysicalDiceEngine.Vec3 next=fd.body.mesh.vertices.get(f.indices[1]);
        PhysicalDiceEngine.Vec3 u=next.sub(first).normalized(),v=f.normal.cross(u).normalized();
        double radius=Double.MAX_VALUE;
        for(int i=0;i<f.indices.length;i++){
            PhysicalDiceEngine.Vec3 a=fd.body.mesh.vertices.get(f.indices[i]),b=fd.body.mesh.vertices.get(f.indices[(i+1)%f.indices.length]);
            radius=Math.min(radius,b.sub(a).cross(f.center.sub(a)).len()/b.sub(a).len());
        }
        double extent=radius*.63;
        float[] dst=new float[8];double[][] corners={{-1,1},{1,1},{1,-1},{-1,-1}};
        for(int i=0;i<4;i++){
            PhysicalDiceEngine.Vec3 local=f.center.add(u.mul(corners[i][0]*extent)).add(v.mul(corners[i][1]*extent));
            Projected q=projectDieFull(fd.body.position.add(fd.body.orientation.rotate(local.mul(fd.body.scale))));
            if(q==null)return;dst[i*2]=q.x;dst[i*2+1]=q.y;
        }
        String label=fd.body.displayValue(f),special=fd.style.labelForFace(f.value);
        if(special!=null&&!special.isEmpty())label=special;
        String key=label+":"+fd.style.numberColor+":"+fd.style.font;
        Bitmap glyph=glyphTextures.get(key);
        if(glyph==null){
            glyph=Bitmap.createBitmap(256,256,Bitmap.Config.ARGB_8888);
            Canvas face=new Canvas(glyph);Paint ink=new Paint(Paint.ANTI_ALIAS_FLAG);
            ink.setTypeface(fd.style.typeface());ink.setTextAlign(Paint.Align.CENTER);ink.setTextSize(160);
            while(ink.measureText(label)>214)ink.setTextSize(ink.getTextSize()*.9f);
            float baseline=128-(ink.ascent()+ink.descent())*.5f;
            ink.setStyle(Paint.Style.STROKE);ink.setStrokeWidth(3);ink.setColor(Color.argb(180,0,0,0));face.drawText(label,128,baseline+2,ink);
            ink.setStyle(Paint.Style.FILL);ink.setColor(fd.style.numberColor);face.drawText(label,128,baseline,ink);
            glyphTextures.put(key,glyph);
        }
        android.graphics.Matrix matrix=new android.graphics.Matrix();
        if(!matrix.setPolyToPoly(new float[]{0,0,256,0,256,256,0,256},0,dst,0,4))return;
        Path clip=new Path();clip.moveTo(fd.points[0].x,fd.points[0].y);for(int i=1;i<fd.points.length;i++)clip.lineTo(fd.points[i].x,fd.points[i].y);clip.close();
        c.save();c.clipPath(clip);c.drawBitmap(glyph,matrix,new Paint(Paint.ANTI_ALIAS_FLAG|Paint.FILTER_BITMAP_FLAG));c.restore();
    }
    private float fitTextSize(String label,float faceRadius,float preferred){
        float size=Math.max(5,preferred),usable=Math.max(1,faceRadius*.72f);android.graphics.Rect ib=new android.graphics.Rect();for(int i=0;i<5;i++){text.setTextSize(size);text.getTextBounds(label,0,label.length(),ib);float w=Math.max(1,ib.width()),h=Math.max(1,ib.height()),halfDiagonal=(float)(Math.hypot(w,h)*.5);if(halfDiagonal<=usable)return size;if(size<=5)return 0;size*=Math.max(.45f,Math.min(.94f,usable/Math.max(1,halfDiagonal)*.94f));if(size<5)return 0;}return 0;
    }
    private float polygonSafeRadius(PointF c,PointF[] pts){float best=Float.MAX_VALUE;for(int i=0;i<pts.length;i++){PointF a=pts[i],b=pts[(i+1)%pts.length];best=Math.min(best,distancePointSegment(c,a,b));}return best==Float.MAX_VALUE?0:best;}
    private float distancePointSegment(PointF p,PointF a,PointF b){float dx=b.x-a.x,dy=b.y-a.y,l2=dx*dx+dy*dy;if(l2<1e-6f)return (float)Math.hypot(p.x-a.x,p.y-a.y);float t=((p.x-a.x)*dx+(p.y-a.y)*dy)/l2;t=Math.max(0,Math.min(1,t));float x=a.x+t*dx,y=a.y+t*dy;return (float)Math.hypot(p.x-x,p.y-y);}
    private PointF[] insetPolygon(PointF[] pts,float factor){float cx=0,cy=0;for(PointF p:pts){cx+=p.x;cy+=p.y;}cx/=pts.length;cy/=pts.length;PointF[] out=new PointF[pts.length];for(int i=0;i<pts.length;i++)out[i]=new PointF(cx+(pts[i].x-cx)*factor,cy+(pts[i].y-cy)*factor);return out;}
    private Path polygonPath(PointF[] pts){Path p=new Path();p.moveTo(pts[0].x,pts[0].y);for(int i=1;i<pts.length;i++)p.lineTo(pts[i].x,pts[i].y);p.close();return p;}
    private Bitmap bitmap(String uri){if(bitmapCache.containsKey(uri))return bitmapCache.get(uri);Bitmap bm=null;try{File f=new File(uri);if(f.isFile())bm=BitmapFactory.decodeFile(f.getAbsolutePath());else{InputStream in=getContext().getContentResolver().openInputStream(Uri.parse(uri));if(in!=null){bm=BitmapFactory.decodeStream(in);in.close();}}}catch(Exception error){android.util.Log.w("WwnDice3D","Não foi possível abrir imagem personalizada do dado.",error);}bitmapCache.put(uri,bm);return bm;}
    private RectF bounds(PointF[] p){float l=Float.MAX_VALUE,t=Float.MAX_VALUE,r=-Float.MAX_VALUE,b=-Float.MAX_VALUE;for(PointF q:p){l=Math.min(l,q.x);t=Math.min(t,q.y);r=Math.max(r,q.x);b=Math.max(b,q.y);}return new RectF(l,t,r,b);}
    private void updateVisualFraming(){if(session==null||session.bodies.isEmpty()){visualCenterX=visualCenterY=0;visualZoom=1;return;}double cx=0,cy=0;for(PhysicalDiceEngine.DieBody d:session.bodies){cx+=d.position.x;cy+=d.position.y;}cx/=session.bodies.size();cy/=session.bodies.size();double spread=0;for(PhysicalDiceEngine.DieBody d:session.bodies)spread=Math.max(spread,Math.hypot(d.position.x-cx,d.position.y-cy));int n=session.bodies.size();double base=n==1?2.65:n<=2?2.05:n<=4?1.64:n<=6?1.36:1.08;double wanted=base/Math.max(1.0,1.0+(spread-1.15)*.18);wanted=Math.max(.92,Math.min(2.70,wanted));visualCenterX=visualCenterX*.84+cx*.16;visualCenterY=visualCenterY*.84+cy*.16;visualZoom=visualZoom*.86+wanted*.14;}
    private PointF project(PhysicalDiceEngine.Vec3 w){Projected p=projectFull(w);return p==null?null:new PointF(p.x,p.y);}
    private PointF projectDie(PhysicalDiceEngine.Vec3 w){Projected p=projectDieFull(w);return p==null?null:new PointF(p.x,p.y);}
    private Projected projectDieFull(PhysicalDiceEngine.Vec3 w){return projectFullScaled(new PhysicalDiceEngine.Vec3(w.x-visualCenterX,w.y-visualCenterY,w.z),visualZoom);}
    private Projected projectFull(PhysicalDiceEngine.Vec3 w){return projectFullScaled(w,1.0);}
    private Projected projectFullScaled(PhysicalDiceEngine.Vec3 w,double zoom){PhysicalDiceEngine.Vec3 rel=w.sub(camera);double cx=rel.dot(camRight),cy=rel.dot(camUp),cz=rel.dot(camForward);if(cz<.18)return null;double sessionScale=1.0;if(session!=null&&session.halfWidth>4.0)sessionScale=Math.max(.78,4.0/session.halfWidth);double f=focal*sessionScale*zoom/cz;return new Projected((float)(getWidth()*.5+cx*f),(float)(getHeight()*.54-cy*f),cz);}
    private int scaleColor(int c,float s){return Color.argb(Color.alpha(c),clamp255(Color.red(c)*s),clamp255(Color.green(c)*s),clamp255(Color.blue(c)*s));}
    private int blend(int a,int b,float t){return Color.rgb(clamp255(Color.red(a)*(1-t)+Color.red(b)*t),clamp255(Color.green(a)*(1-t)+Color.green(b)*t),clamp255(Color.blue(a)*(1-t)+Color.blue(b)*t));}
    private int withAlpha(int c,int a){return Color.argb(Math.max(0,Math.min(255,a)),Color.red(c),Color.green(c),Color.blue(c));}
    private int clamp255(double v){return (int)Math.max(0,Math.min(255,Math.round(v)));}

    public void triggerOutcome(String critical){particles.clear();String o=critical==null?"":critical.toLowerCase();boolean success=o.contains("20 natural")||o.contains("critical_success")||o.contains("sucesso crítico");boolean failure=o.contains("1 natural")||o.contains("critical_failure")||o.contains("falha crítica");int n=success?28:failure?12:0;if(n==0)return;float cx=getWidth()*.5f,cy=getHeight()*.42f;for(int i=0;i<n;i++){double a=visualRandom.nextDouble()*Math.PI*2;float speed=(float)(40+visualRandom.nextDouble()*170);Particle p=new Particle();p.x=cx;p.y=cy;p.vx=(float)Math.cos(a)*speed;p.vy=(float)Math.sin(a)*speed-(success?70:0);p.life=1;p.gold=success;particles.add(p);}invalidate();}
    private void drawParticles(Canvas c){if(particles.isEmpty())return;for(int i=particles.size()-1;i>=0;i--){Particle p=particles.get(i);p.x+=p.vx/60f;p.y+=p.vy/60f;p.vy+=3.5f;p.life-=.025f;if(p.life<=0){particles.remove(i);continue;}fx.setColor(p.gold?Color.argb((int)(220*p.life),230,190,75):Color.argb((int)(170*p.life),110,90,75));c.drawCircle(p.x,p.y,p.gold?3.2f:4.2f,fx);}if(!particles.isEmpty())postInvalidateOnAnimation();}
    @Override protected void onDetachedFromWindow(){super.onDetachedFromWindow();for(Bitmap bm:bitmapCache.values())if(bm!=null&&!bm.isRecycled())bm.recycle();bitmapCache.clear();particles.clear();}
    private static final class Projected{float x,y;double depth;Projected(float x,float y,double d){this.x=x;this.y=y;depth=d;}}
    private static final class FaceDraw{PhysicalDiceEngine.DieBody body;PhysicalDiceEngine.Face face;DiceAppearance style;PointF[] points;PhysicalDiceEngine.Vec3 center,normal;double depth;FaceDraw(PhysicalDiceEngine.DieBody b,PhysicalDiceEngine.Face f,DiceAppearance s,PointF[] p,PhysicalDiceEngine.Vec3 c,PhysicalDiceEngine.Vec3 n,double d){body=b;face=f;style=s;points=p;center=c;normal=n;depth=d;}}
    private static final class Particle{float x,y,vx,vy,life;boolean gold;}
}

