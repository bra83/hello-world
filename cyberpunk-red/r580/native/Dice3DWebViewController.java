package com.braseiro.cyberpunkred;

import android.app.Activity;
import android.view.View;
import android.widget.FrameLayout;
import com.braseiro.cyberpunkred.dice.*;
import org.json.JSONObject;
import org.json.JSONArray;
import java.util.List;

/** Native physical table ported from Forbidden Lands; no secondary WebView/RNG. */
public final class Dice3DWebViewController {
    public interface Listener { void onReady(); void onResult(JSONObject raw); void onError(String message); }
    private final Activity activity; private final Listener listener; private final FrameLayout placeholder;
    private JSONObject issued; private boolean closed=false;
    public Dice3DWebViewController(Activity a,Listener l){activity=a;listener=l;placeholder=new FrameLayout(a);placeholder.post(()->listener.onReady());}
    public View view(){return placeholder;} public boolean isReady(){return !closed;}
    public void setQuality(String quality){}
    public void roll(JSONObject request){
        if(closed){listener.onError("Mesa física encerrada.");return;}
        issued=null;
        BraseiroDice3DOverlay.roll(activity,request.optString("formula"),"metal","Cyberpunk RED · rolagem manual","PLAYER_VISIBLE_MANUAL",new BraseiroDice3DOverlay.Callback(){
            @Override public void onResult(BraseiroDice3DOverlay.RollResult r){try{
                if(r.forcedSettle)throw new IllegalStateException("Os dados não estabilizaram no prazo; role novamente.");
                List<Integer> actual=r.session.spec.requirePhysicalAgreement(r.rolls,r.session.physicalFaces());
                int sum=0;for(int value:actual)sum+=value;
                issued=new JSONObject().put("ok",true).put("roll_id",request.getString("roll_id")).put("formula",request.getString("formula"))
                    .put("values",new JSONArray(actual)).put("physical_faces",new JSONArray(r.physicalFaces)).put("sum",sum).put("modifier",r.session.spec.modifier)
                    .put("total",sum+r.session.spec.modifier).put("seed",r.seed).put("duration_ms",r.physicsMs).put("settled",true).put("watchdog",false)
                    .put("physics",PhysicalDiceEngine.ENGINE_ID).put("authority","physical_top_face_verified_native");
                listener.onResult(issued);
            }catch(Exception e){issued=null;listener.onError(e.getMessage());}}
            @Override public void onCancel(){issued=null;listener.onError("Rolagem física cancelada.");}
            @Override public void onError(String error){issued=null;listener.onError(error);}
        },request.optLong("seed"));
    }
    /** Only this native callback can issue a result. A JS packet cannot forge it. */
    public JSONObject verify(JSONObject request,JSONObject raw){
        if(request==null||raw!=issued||issued==null||!request.optString("roll_id").equals(issued.optString("roll_id"))||request.optLong("seed")!=issued.optLong("seed"))throw new IllegalStateException("Resultado sem sessão física nativa.");
        JSONObject result=issued;issued=null;return result;
    }
    public void cancel(String id){BraseiroDice3DOverlay.cancelActive();issued=null;}
    public void destroy(){closed=true;BraseiroDice3DOverlay.cancelActive();issued=null;}
}
