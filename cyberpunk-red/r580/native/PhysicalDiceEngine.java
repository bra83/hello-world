package com.braseiro.cyberpunkred.dice;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Random;

/**
 * Motor de dados poliédricos físicos do Braseiro.
 *
 * O resultado NÃO é sorteado antes da animação. A fonte aleatória cria somente
 * as condições iniciais (posição, impulso e rotação). O valor autoritativo é
 * calculado da face que termina orientada para cima depois que o corpo rígido
 * estabiliza. Isso permite replay determinístico por seed e mantém separadas
 * física (este núcleo) e regra do RPG (sempre no host).
 *
 * Não depende de Android, Three.js ou cannon-es; pode ser exercitado em JVM.
 */
public final class PhysicalDiceEngine {
    public static final String ENGINE_ID="braseiro-physical-dice-2";
    public static final double FIXED_DT=1.0/120.0;
    private static final double EPS=1e-7;

    public static final class Vec3 {
        public double x,y,z;
        public Vec3(){this(0,0,0);} public Vec3(double x,double y,double z){this.x=x;this.y=y;this.z=z;}
        public Vec3 set(double X,double Y,double Z){x=X;y=Y;z=Z;return this;}
        public Vec3 copy(){return new Vec3(x,y,z);} public Vec3 add(Vec3 v){return new Vec3(x+v.x,y+v.y,z+v.z);} public Vec3 sub(Vec3 v){return new Vec3(x-v.x,y-v.y,z-v.z);} public Vec3 mul(double s){return new Vec3(x*s,y*s,z*s);}
        public double dot(Vec3 v){return x*v.x+y*v.y+z*v.z;} public Vec3 cross(Vec3 v){return new Vec3(y*v.z-z*v.y,z*v.x-x*v.z,x*v.y-y*v.x);} public double len2(){return x*x+y*y+z*z;} public double len(){return Math.sqrt(len2());}
        public Vec3 normalized(){double l=len();return l<EPS?new Vec3():mul(1.0/l);} public void addIn(Vec3 v){x+=v.x;y+=v.y;z+=v.z;} public void mulIn(double s){x*=s;y*=s;z*=s;}
    }
    public static final class Quat {
        public double w,x,y,z;
        public Quat(){this(1,0,0,0);} public Quat(double w,double x,double y,double z){this.w=w;this.x=x;this.y=y;this.z=z;}
        public Quat copy(){return new Quat(w,x,y,z);} public Quat normalized(){double l=Math.sqrt(w*w+x*x+y*y+z*z);return l<EPS?new Quat():new Quat(w/l,x/l,y/l,z/l);}
        public Quat mul(Quat b){return new Quat(w*b.w-x*b.x-y*b.y-z*b.z,w*b.x+x*b.w+y*b.z-z*b.y,w*b.y-x*b.z+y*b.w+z*b.x,w*b.z+x*b.y-y*b.x+z*b.w);}
        public Vec3 rotate(Vec3 v){Quat p=new Quat(0,v.x,v.y,v.z);Quat c=new Quat(w,-x,-y,-z);Quat r=this.mul(p).mul(c);return new Vec3(r.x,r.y,r.z);}
        public static Quat axisAngle(Vec3 axis,double angle){Vec3 n=axis.normalized();double h=angle*.5,s=Math.sin(h);return new Quat(Math.cos(h),n.x*s,n.y*s,n.z*s);}
        public static Quat random(Random r){double u1=r.nextDouble(),u2=r.nextDouble(),u3=r.nextDouble();double a=Math.sqrt(1-u1),b=Math.sqrt(u1),t2=2*Math.PI*u2,t3=2*Math.PI*u3;return new Quat(b*Math.cos(t3),a*Math.sin(t2),a*Math.cos(t2),b*Math.sin(t3)).normalized();}
        public static Quat fromTo(Vec3 from,Vec3 to){Vec3 a=from.normalized(),b=to.normalized();double d=a.dot(b);if(d>0.999999)return new Quat();if(d<-0.999999){Vec3 axis=Math.abs(a.x)<.7?a.cross(new Vec3(1,0,0)):a.cross(new Vec3(0,1,0));return axisAngle(axis,Math.PI);}Vec3 c=a.cross(b);return new Quat(1+d,c.x,c.y,c.z).normalized();}
        public static Quat slerp(Quat a,Quat b,double t){double dot=a.w*b.w+a.x*b.x+a.y*b.y+a.z*b.z;Quat bb=b;if(dot<0){dot=-dot;bb=new Quat(-b.w,-b.x,-b.y,-b.z);}if(dot>.9995)return new Quat(a.w+(bb.w-a.w)*t,a.x+(bb.x-a.x)*t,a.y+(bb.y-a.y)*t,a.z+(bb.z-a.z)*t).normalized();double th=Math.acos(Math.max(-1,Math.min(1,dot))),s=Math.sin(th);double p=Math.sin((1-t)*th)/s,q=Math.sin(t*th)/s;return new Quat(a.w*p+bb.w*q,a.x*p+bb.x*q,a.y*p+bb.y*q,a.z*p+bb.z*q);}
        public void integrate(Vec3 omega,double dt){Quat spin=new Quat(0,omega.x,omega.y,omega.z).mul(this);w+=.5*spin.w*dt;x+=.5*spin.x*dt;y+=.5*spin.y*dt;z+=.5*spin.z*dt;double l=Math.sqrt(w*w+x*x+y*y+z*z);if(l>EPS){w/=l;x/=l;y/=l;z/=l;}}
    }
    public static final class Face {
        public final int[] indices; public Vec3 normal; public Vec3 center; public int value;
        Face(int[] idx,Vec3 n,Vec3 c){indices=idx;normal=n;center=c;}
    }
    public static final class Mesh {
        public final int sides; public final List<Vec3> vertices; public final List<Face> faces; public double radius;
        Mesh(int sides,List<Vec3> v,List<Face> f){this.sides=sides;vertices=v;faces=f;normalize();assignValues();}
        private void normalize(){double r=0;for(Vec3 v:vertices)r=Math.max(r,v.len());if(r<EPS)r=1;for(Vec3 v:vertices){v.x/=r;v.y/=r;v.z/=r;}for(Face f:faces){f.center=new Vec3();for(int i:f.indices)f.center.addIn(vertices.get(i));f.center.mulIn(1.0/f.indices.length);Vec3 a=vertices.get(f.indices[1]).sub(vertices.get(f.indices[0])),b=vertices.get(f.indices[2]).sub(vertices.get(f.indices[0]));Vec3 n=a.cross(b).normalized();if(n.dot(f.center)<0)n=n.mul(-1);f.normal=n;}radius=1;}
        private void assignValues(){for(Face f:faces)f.value=0;int lo=1,hi=sides;for(Face f:faces){if(f.value!=0)continue;Face opp=null;double best=1;for(Face g:faces){if(g==f||g.value!=0)continue;double d=f.normal.dot(g.normal);if(d<best){best=d;opp=g;}}f.value=lo++;if(opp!=null&&best<-.92)opp.value=hi--;}
            for(Face f:faces)if(f.value==0)f.value=lo++;
        }
    }
    public static final class DieBody {
        public final int id,termIndex,logicalIndex,themeSides; public final Mesh mesh; public final int sides; public final boolean percentileTens,percentileOnes;
        public Vec3 position=new Vec3(),velocity=new Vec3(),angularVelocity=new Vec3(); public Quat orientation=new Quat();
        public double scale=.68,mass=1,inertia=.18,restitution=.43,friction=.37,linearDamping=.28,angularDamping=.55;
        public boolean settled=false,aligning=false; public int stillFrames=0; public double impact=0; public long lastImpactNanos=0; private Quat targetOrientation; private Face targetFace; private int alignFrames=0;
        DieBody(int id,int termIndex,int logicalIndex,int themeSides,Mesh mesh,boolean tens,boolean ones){this.id=id;this.termIndex=termIndex;this.logicalIndex=logicalIndex;this.themeSides=themeSides;this.mesh=mesh;this.sides=mesh.sides;percentileTens=tens;percentileOnes=ones;}
        public Vec3 worldVertex(int i){return position.add(orientation.rotate(mesh.vertices.get(i).mul(scale)));}
        public Vec3 worldNormal(Face f){return orientation.rotate(f.normal).normalized();}
        public Face topFace(){Face best=null;double z=-999;for(Face f:mesh.faces){double n=worldNormal(f).z;if(n>z){z=n;best=f;}}return best;}
        public int rawTopValue(){Face f=topFace();return f==null?1:f.value;}
        public int physicalFaceValue(){int v=rawTopValue();return (percentileTens||percentileOnes)?(v==10?0:v):v;}
        public String displayValue(Face f){int v=f==null?1:f.value;if(percentileTens)return v==sides?"00":String.valueOf(v*10);if(percentileOnes)return v==sides?"0":String.valueOf(v);return String.valueOf(v);}
        void beginAlign(){Face f=topFace();if(f==null){settled=true;return;}targetFace=f;alignFrames=0;Vec3 n=worldNormal(f);Quat delta=Quat.fromTo(n,new Vec3(0,0,1));targetOrientation=delta.mul(orientation).normalized();aligning=true;velocity.set(0,0,0);angularVelocity.set(0,0,0);}
        void alignStep(){alignFrames++;orientation=Quat.slerp(orientation,targetOrientation,.22).normalized();if(alignFrames>=36||targetFace==null||Math.abs(worldNormal(targetFace).z-1)<.001){orientation=targetOrientation;aligning=false;settled=true;}}
        void wake(){settled=false;aligning=false;stillFrames=0;alignFrames=0;targetFace=null;targetOrientation=null;}
    }
    public static final class RollResult {
        public final DiceRollSpec spec; public final List<Integer> dice,physicalFaces; public final int total,natural; public final String detail,critical; public final long seed; public final boolean forcedSettle; public final int physicsSteps;
        RollResult(DiceRollSpec spec,List<Integer> dice,List<Integer> physicalFaces,DiceRollSpec.Result resolved,long seed,boolean forced,int steps){this.spec=spec;this.dice=dice;this.physicalFaces=physicalFaces;this.total=resolved.total;this.natural=resolved.natural;this.detail=resolved.detail;this.critical=resolved.critical;this.seed=seed;forcedSettle=forced;physicsSteps=steps;}
    }
    public static final class Session {
        public final DiceRollSpec spec; public final long seed; public final List<DieBody> bodies=new ArrayList<DieBody>(); public final double halfWidth,halfDepth;
        private final Random random; private int steps=0; private boolean complete=false,forced=false; private RollResult result;
        Session(DiceRollSpec spec,long seed,double halfWidth,double halfDepth){if(spec==null)throw new IllegalArgumentException("Especificação de dados ausente.");if(!spec.supportsPhysical3d())throw new IllegalArgumentException("A fórmula excede os dados físicos suportados.");this.spec=spec;this.seed=seed;this.halfWidth=halfWidth;this.halfDepth=halfDepth;random=new Random(seed);spawn();}
        private void spawn(){int id=1,total=spec.physicalBodyCount();
            if(spec.isAdvantage()){for(int i=0;i<2;i++){DieBody d=newBody(id++,0,i,20,20,false,false,total);setup(d,i,total);bodies.add(d);}return;}
            int logical=0;for(int ti=0;ti<spec.terms.size();ti++){DiceRollSpec.Term term=spec.terms.get(ti);for(int li=0;li<term.count;li++){if(term.sides==100){DieBody tens=newBody(id++,ti,logical,100,10,true,false,total),ones=newBody(id++,ti,logical,100,10,false,true,total);setup(tens,bodies.size(),total);bodies.add(tens);setup(ones,bodies.size(),total);bodies.add(ones);}else{DieBody d=newBody(id++,ti,logical,term.sides,term.sides,false,false,total);setup(d,bodies.size(),total);bodies.add(d);}logical++;}}
        }
        private DieBody newBody(int id,int termIndex,int logicalIndex,int themeSides,int meshSides,boolean tens,boolean ones,int total){DieBody d=new DieBody(id,termIndex,logicalIndex,themeSides,mesh(meshSides),tens,ones);double base=meshSides==4?.76:meshSides==20?.74:meshSides==12?.72:meshSides==10?.72:.70;double crowd=total<=4?1.0:total<=8?.90:total<=12?.80:.70;d.scale=Math.max(.46,base*crowd);d.mass=.95+d.scale*.38;d.inertia=Math.max(.12,.42*d.mass*d.scale*d.scale);return d;}
        private void setup(DieBody d,int index,int total){int cols=total<=4?Math.max(1,total):(int)Math.ceil(Math.sqrt(total*1.32));int rows=(int)Math.ceil(total/(double)cols);int row=index/cols,col=index%cols;double usableX=Math.max(1.4,halfWidth*2-1.2),usableY=Math.max(1.2,halfDepth*1.45);double x=cols<=1?0:-usableX*.5+usableX*(col+.5)/cols;double y=rows<=1?0:-usableY*.5+usableY*(row+.5)/rows;d.position.set(x+(random.nextDouble()-.5)*.28,y+(random.nextDouble()-.5)*.32,3.7+random.nextDouble()*2.35+row*.12);d.orientation=Quat.random(random);d.velocity.set((random.nextDouble()-.5)*5.4,(random.nextDouble()-.5)*4.8,1.7+random.nextDouble()*2.8);d.angularVelocity.set(randSigned(9,20),randSigned(9,20),randSigned(9,20));}
        private double randSigned(double lo,double hi){double v=lo+random.nextDouble()*(hi-lo);return random.nextBoolean()?v:-v;}
        public int steps(){return steps;} public boolean isComplete(){return complete;} public RollResult result(){return result;}
        public List<Integer> physicalFaces(){ArrayList<Integer> out=new ArrayList<Integer>();for(DieBody d:bodies)out.add(d.physicalFaceValue());return Collections.unmodifiableList(out);}
        public void step(){if(complete)return;steps++;for(DieBody d:bodies)d.impact=0;
            for(DieBody d:bodies)stepBody(d,FIXED_DT);
            for(int i=0;i<bodies.size();i++)for(int j=i+1;j<bodies.size();j++)collideDice(bodies.get(i),bodies.get(j));
            boolean all=true;for(DieBody d:bodies){if(!d.settled)all=false;}
            if(all)finish(false);else if(steps>FIXED_DT_INV()*12){forceSettle();}
        }
        private int FIXED_DT_INV(){return (int)Math.round(1.0/FIXED_DT);}
        private void stepBody(DieBody d,double dt){if(d.settled)return;if(d.aligning){d.alignStep();liftToFloor(d);return;}d.velocity.z-=9.81*dt;d.position.addIn(d.velocity.mul(dt));d.orientation.integrate(d.angularVelocity,dt);double ld=Math.exp(-d.linearDamping*dt),ad=Math.exp(-d.angularDamping*dt);d.velocity.mulIn(ld);d.angularVelocity.mulIn(ad);collidePlane(d,new Vec3(0,0,1),0);collideWallX(d,-halfWidth,1);collideWallX(d,halfWidth,-1);collideWallY(d,-halfDepth,1);collideWallY(d,halfDepth,-1);
            double speed=d.velocity.len(),ang=d.angularVelocity.len();double minZ=minZ(d);if(speed<.16&&ang<.42&&Math.abs(minZ)<.016){d.stillFrames++;if(d.stillFrames>18)d.beginAlign();}else d.stillFrames=0;if(steps>840&&speed<1.0&&ang<2.0&&!d.aligning)d.beginAlign();
        }
        private void collidePlane(DieBody d,Vec3 normal,double plane){double min=Double.POSITIVE_INFINITY;for(int i=0;i<d.mesh.vertices.size();i++){double q=d.worldVertex(i).z-plane;if(q<min)min=q;}if(min>=0)return;d.position.z-=min;double tolerance=Math.max(.010,d.scale*.035);Vec3 contact=new Vec3();int contacts=0;for(int i=0;i<d.mesh.vertices.size();i++){Vec3 w=d.worldVertex(i);if(w.z-plane<=tolerance){contact.addIn(w);contacts++;}}if(contacts<=0)return;contact.mulIn(1.0/contacts);Vec3 r=contact.sub(d.position);applyContactImpulse(d,r,normal,Math.max(0,-min));}
        private void collideWallX(DieBody d,double wall,double direction){int idx=-1;double penetration=0;for(int i=0;i<d.mesh.vertices.size();i++){double x=d.worldVertex(i).x;double p=direction>0?wall-x:x-wall;if(p>penetration){penetration=p;idx=i;}}if(penetration<=0||idx<0)return;d.position.x+=direction*penetration;Vec3 r=d.worldVertex(idx).sub(d.position);applyContactImpulse(d,r,new Vec3(direction,0,0),penetration);}
        private void collideWallY(DieBody d,double wall,double direction){int idx=-1;double penetration=0;for(int i=0;i<d.mesh.vertices.size();i++){double y=d.worldVertex(i).y;double p=direction>0?wall-y:y-wall;if(p>penetration){penetration=p;idx=i;}}if(penetration<=0||idx<0)return;d.position.y+=direction*penetration;Vec3 r=d.worldVertex(idx).sub(d.position);applyContactImpulse(d,r,new Vec3(0,direction,0),penetration);}
        private void applyContactImpulse(DieBody d,Vec3 r,Vec3 n,double penetration){Vec3 vc=d.velocity.add(d.angularVelocity.cross(r));double vn=vc.dot(n);if(vn>=0)return;double rn2=r.cross(n).len2(),den=1.0/d.mass+rn2/d.inertia;double j=-(1+d.restitution)*vn/Math.max(EPS,den);Vec3 impulse=n.mul(j);d.velocity.addIn(impulse.mul(1.0/d.mass));d.angularVelocity.addIn(r.cross(impulse).mul(1.0/d.inertia));Vec3 tangent=vc.sub(n.mul(vn));double tl=tangent.len();if(tl>EPS){Vec3 t=tangent.mul(1.0/tl);double rt2=r.cross(t).len2();double jt=-tl/Math.max(EPS,1.0/d.mass+rt2/d.inertia);double max=d.friction*j;jt=Math.max(-max,Math.min(max,jt));Vec3 fi=t.mul(jt);d.velocity.addIn(fi.mul(1.0/d.mass));d.angularVelocity.addIn(r.cross(fi).mul(1.0/d.inertia));}if(n.z>.8){d.velocity.x*=.985;d.velocity.y*=.985;d.angularVelocity.mulIn(.992);}d.impact=Math.max(d.impact,Math.abs(j));}
        private void collideDice(DieBody a,DieBody b){if(a.settled&&b.settled)return;double ra=a.scale*.91,rb=b.scale*.91;Vec3 diff=b.position.sub(a.position);double dist=diff.len(),sum=ra+rb;if(dist>=sum||dist<EPS)return;Vec3 n=diff.mul(1.0/dist);double pen=sum-dist;Vec3 rv=b.velocity.sub(a.velocity);double vn=rv.dot(n);boolean meaningfulHit=vn<-.08||pen>.025;if(meaningfulHit){if(a.settled||a.aligning)a.wake();if(b.settled||b.aligning)b.wake();}a.position.addIn(n.mul(-pen*.5));b.position.addIn(n.mul(pen*.5));if(vn>=0)return;double e=Math.min(a.restitution,b.restitution),j=-(1+e)*vn/(1.0/a.mass+1.0/b.mass);Vec3 imp=n.mul(j);a.velocity.addIn(imp.mul(-1.0/a.mass));b.velocity.addIn(imp.mul(1.0/b.mass));Vec3 tang=rv.sub(n.mul(vn));if(tang.len()>EPS){Vec3 twirl=n.cross(tang).normalized();a.angularVelocity.addIn(twirl.mul(-j*.18/a.inertia));b.angularVelocity.addIn(twirl.mul(j*.18/b.inertia));}a.impact=Math.max(a.impact,Math.abs(j));b.impact=Math.max(b.impact,Math.abs(j));}
        private double minZ(DieBody d){double min=999;for(int i=0;i<d.mesh.vertices.size();i++)min=Math.min(min,d.worldVertex(i).z);return min;}
        private void liftToFloor(DieBody d){double z=minZ(d);if(z<0)d.position.z-=z;else if(z>.004)d.position.z-=Math.min(z,.02);}
        private void forceSettle(){forced=true;for(DieBody d:bodies)if(!d.settled){d.velocity.set(0,0,0);d.angularVelocity.set(0,0,0);if(!d.aligning)d.beginAlign();for(int i=0;i<80&&!d.settled;i++){d.alignStep();liftToFloor(d);}}finish(true);}
        private void finish(boolean wasForced){if(complete)return;List<Integer> faces=physicalFaces();List<Integer> values=spec.rollsFromPhysicalFaces(faces);DiceRollSpec.Result resolved=spec.resolve(values);result=new RollResult(spec,Collections.unmodifiableList(new ArrayList<Integer>(values)),faces,resolved,seed,wasForced||forced,steps);complete=true;}
    }

    private static final LinkedHashMap<Integer,Mesh> CACHE=new LinkedHashMap<Integer,Mesh>();
    public static synchronized Mesh mesh(int sides){Mesh m=CACHE.get(sides);if(m!=null)return m;switch(sides){case 4:m=tetra();break;case 6:m=cube();break;case 8:m=octa();break;case 10:m=d10();break;case 12:m=dodeca();break;case 20:m=icosa();break;default:throw new IllegalArgumentException("Dado não suportado: d"+sides);}CACHE.put(sides,m);return m;}
    public static Session create(DiceRollSpec spec,long seed){int total=spec.physicalBodyCount();double hw=total<=4?3.7:total<=10?4.25:4.8,hd=total<=4?2.6:total<=10?3.0:3.45;return new Session(spec,seed,hw,hd);}
    public static Session create(DiceRollSpec spec,long seed,double halfWidth,double halfDepth){return new Session(spec,seed,halfWidth,halfDepth);}

    private static Mesh tetra(){List<Vec3> v=list(new Vec3(1,1,1),new Vec3(-1,-1,1),new Vec3(-1,1,-1),new Vec3(1,-1,-1));return hull(4,v);}
    private static Mesh cube(){List<Vec3> v=list(new Vec3(-1,-1,-1),new Vec3(1,-1,-1),new Vec3(1,1,-1),new Vec3(-1,1,-1),new Vec3(-1,-1,1),new Vec3(1,-1,1),new Vec3(1,1,1),new Vec3(-1,1,1));return hull(6,v);}
    private static Mesh octa(){List<Vec3> v=list(new Vec3(1,0,0),new Vec3(-1,0,0),new Vec3(0,1,0),new Vec3(0,-1,0),new Vec3(0,0,1),new Vec3(0,0,-1));return hull(8,v);}
    private static Mesh icosa(){double p=(1+Math.sqrt(5))/2;List<Vec3> v=new ArrayList<Vec3>();for(int a:new int[]{-1,1})for(int b:new int[]{-1,1}){v.add(new Vec3(0,a,b*p));v.add(new Vec3(a,b*p,0));v.add(new Vec3(b*p,0,a));}return hull(20,v);}
    private static Mesh dodeca(){double p=(1+Math.sqrt(5))/2,ip=1/p;List<Vec3> v=new ArrayList<Vec3>();for(int x:new int[]{-1,1})for(int y:new int[]{-1,1})for(int z:new int[]{-1,1})v.add(new Vec3(x,y,z));for(int a:new int[]{-1,1})for(int b:new int[]{-1,1}){v.add(new Vec3(0,a*ip,b*p));v.add(new Vec3(a*ip,b*p,0));v.add(new Vec3(b*p,0,a*ip));}return hull(12,v);}
    private static Mesh d10(){List<Vec3> v=new ArrayList<Vec3>();v.add(new Vec3(0,0,1.25));v.add(new Vec3(0,0,-1.25));double r=1,z=.24;for(int i=0;i<10;i++){double a=2*Math.PI*i/10;v.add(new Vec3(r*Math.cos(a),r*Math.sin(a),(i%2==0?z:-z)));}List<Face> faces=new ArrayList<Face>();for(int k=0;k<5;k++){int e=2+2*k,odd=2+(2*k+1)%10,nextEven=2+(2*k+2)%10;faces.add(face(new int[]{0,e,odd,nextEven},v));int oddA=2+(2*k+1)%10,evenB=2+(2*k+2)%10,oddC=2+(2*k+3)%10;faces.add(face(new int[]{1,oddC,evenB,oddA},v));}return new Mesh(10,v,faces);}
    @SafeVarargs private static <T> List<T> list(T... a){ArrayList<T> out=new ArrayList<T>();Collections.addAll(out,a);return out;}
    private static Face face(int[] idx,List<Vec3> v){Vec3 c=new Vec3();for(int i:idx)c.addIn(v.get(i));c.mulIn(1.0/idx.length);Vec3 n=v.get(idx[1]).sub(v.get(idx[0])).cross(v.get(idx[2]).sub(v.get(idx[0]))).normalized();if(n.dot(c)<0){int[] rev=new int[idx.length];for(int i=0;i<idx.length;i++)rev[i]=idx[idx.length-1-i];idx=rev;n=n.mul(-1);}return new Face(idx,n,c);}
    private static Mesh hull(int sides,List<Vec3> verts){List<Plane> planes=new ArrayList<Plane>();int n=verts.size();for(int i=0;i<n;i++)for(int j=i+1;j<n;j++)for(int k=j+1;k<n;k++){Vec3 a=verts.get(i),b=verts.get(j),c=verts.get(k);Vec3 normal=b.sub(a).cross(c.sub(a));if(normal.len()<1e-7)continue;normal=normal.normalized();double d=normal.dot(a);boolean pos=false,neg=false;for(int q=0;q<n;q++){double s=normal.dot(verts.get(q))-d;if(s>1e-6)pos=true;if(s<-1e-6)neg=true;}if(pos&&neg)continue;if(pos){normal=normal.mul(-1);d=-d;}Vec3 centroid=new Vec3();ArrayList<Integer> ids=new ArrayList<Integer>();for(int q=0;q<n;q++)if(Math.abs(normal.dot(verts.get(q))-d)<1e-5){ids.add(q);centroid.addIn(verts.get(q));}if(ids.size()<3)continue;centroid.mulIn(1.0/ids.size());if(normal.dot(centroid)<0){normal=normal.mul(-1);d=-d;}boolean duplicate=false;for(Plane p:planes)if(p.normal.dot(normal)>.99999&&Math.abs(p.d-d)<1e-4){duplicate=true;break;}if(!duplicate)planes.add(new Plane(normal,d,ids,centroid));}
        List<Face> faces=new ArrayList<Face>();for(Plane p:planes){Vec3 ref=Math.abs(p.normal.z)<.85?new Vec3(0,0,1):new Vec3(0,1,0);Vec3 u=ref.cross(p.normal).normalized(),w=p.normal.cross(u).normalized();final Vec3 cc=p.centroid;final Vec3 uu=u,ww=w;Collections.sort(p.ids,new Comparator<Integer>(){public int compare(Integer ia,Integer ib){Vec3 a=verts.get(ia).sub(cc),b=verts.get(ib).sub(cc);double aa=Math.atan2(a.dot(ww),a.dot(uu)),bb=Math.atan2(b.dot(ww),b.dot(uu));return Double.compare(aa,bb);}});int[] idx=new int[p.ids.size()];for(int t=0;t<idx.length;t++)idx[t]=p.ids.get(t);Face f=face(idx,verts);faces.add(f);}if(faces.size()!=sides)throw new IllegalStateException("Malha d"+sides+" inválida: "+faces.size()+" faces");return new Mesh(sides,verts,faces);}
    private static final class Plane{Vec3 normal;double d;ArrayList<Integer> ids;Vec3 centroid;Plane(Vec3 n,double d,List<Integer> ids,Vec3 c){normal=n;this.d=d;this.ids=new ArrayList<Integer>(ids);centroid=c;}}

    public static String valuesText(RollResult r){if(r==null)return "";return r.spec.physicalDetail(r.dice,r.physicalFaces,new DiceRollSpec.Result(r.total,r.natural,r.detail,r.critical));}
    public static String debugSummary(Session s){RollResult r=s.result();return r==null?(s.spec.formula+" em movimento; "+s.steps()+" passos"):(s.spec.formula+" -> "+valuesText(r)+" seed="+r.seed+" steps="+r.physicsSteps+(r.forcedSettle?" forced":""));}

}

