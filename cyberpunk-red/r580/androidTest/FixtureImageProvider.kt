package com.braseiro.cyberpunkred
import android.content.*
import android.database.Cursor
import android.graphics.*
import android.net.Uri
import android.os.ParcelFileDescriptor
import java.io.File
class FixtureImageProvider:ContentProvider(){
 override fun onCreate()=true
 override fun getType(uri:Uri)="image/png"
 override fun openFile(uri:Uri,mode:String):ParcelFileDescriptor{
  require(uri.path=="/scene.png"&&mode=="r")
  val f=File(context!!.cacheDir,"fixture-scene.png")
  val image=Bitmap.createBitmap(720,450,Bitmap.Config.ARGB_8888);val c=Canvas(image);c.drawColor(Color.rgb(120,25,45));val p=Paint().apply{color=Color.CYAN;textSize=56f};c.drawText("CENA IMPORTADA",60f,220f,p);f.outputStream().use{image.compress(Bitmap.CompressFormat.PNG,100,it)};image.recycle()
  return ParcelFileDescriptor.open(f,ParcelFileDescriptor.MODE_READ_ONLY)
 }
 override fun query(u:Uri,p:Array<out String>?,s:String?,a:Array<out String>?,o:String?):Cursor?=null
 override fun insert(u:Uri,v:ContentValues?):Uri?=null
 override fun update(u:Uri,v:ContentValues?,s:String?,a:Array<out String>?)=0
 override fun delete(u:Uri,s:String?,a:Array<out String>?)=0
}
