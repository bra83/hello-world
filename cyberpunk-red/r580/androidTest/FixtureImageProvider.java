package com.braseiro.cyberpunkred;
import android.content.*;
import android.database.Cursor;
import android.graphics.*;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import java.io.*;
/** Test-only image provider also runs in the separate test APK process. No target-app Kotlin dependency. */
public class FixtureImageProvider extends ContentProvider {
 public boolean onCreate(){return true;}
 public String getType(Uri u){return "image/png";}
 public ParcelFileDescriptor openFile(Uri u,String mode) throws FileNotFoundException {
  if(!"/scene.png".equals(u.getPath())||!"r".equals(mode))throw new FileNotFoundException("Unsupported fixture path/mode");
  File f=new File(getContext().getCacheDir(),"fixture-scene.png");
  Bitmap image=Bitmap.createBitmap(720,450,Bitmap.Config.ARGB_8888);Canvas c=new Canvas(image);c.drawColor(Color.rgb(120,25,45));Paint p=new Paint();p.setColor(Color.CYAN);p.setTextSize(56);c.drawText("CENA IMPORTADA",60,220,p);
  try(FileOutputStream out=new FileOutputStream(f)){image.compress(Bitmap.CompressFormat.PNG,100,out);}catch(IOException e){throw new FileNotFoundException(e.getMessage());}finally{image.recycle();}
  return ParcelFileDescriptor.open(f,ParcelFileDescriptor.MODE_READ_ONLY);
 }
 public android.os.Bundle call(String method,String arg,android.os.Bundle extras){
  android.content.SharedPreferences p=getContext().getSharedPreferences("fixture-tts",0);
  if("reset".equals(method))p.edit().clear().commit();
  android.os.Bundle out=new android.os.Bundle();out.putString("text",p.getString("text",""));out.putString("voice",p.getString("voice",""));out.putInt("calls",p.getInt("calls",0));return out;
 }
 public Cursor query(Uri u,String[] p,String s,String[] a,String o){return null;}
 public Uri insert(Uri u,ContentValues v){return null;}
 public int update(Uri u,ContentValues v,String s,String[] a){return 0;}
 public int delete(Uri u,String s,String[] a){return 0;}
}
