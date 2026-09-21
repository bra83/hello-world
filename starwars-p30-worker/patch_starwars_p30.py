#!/usr/bin/env python3
from pathlib import Path
import re,sys

if len(sys.argv)!=2:
    raise SystemExit("usage: patch_starwars_p30.py <android-root>")

root=Path(sys.argv[1]).resolve()
vtt=root/"app/src/main/assets/vtt"
main=root/"app/src/main/java/com/braseiro/starwarsedge/MainActivity.java"
shell=vtt/"r46-shell.html"
runtime=vtt/"r46/final-runtime.js"
p0=vtt/"r54-device-p0.js"
p1=vtt/"r54-device-p1.js"
for p in (main,shell,runtime):
    if not p.is_file(): raise SystemExit(f"missing {p}")

# ------------------------------------------------------------------
# 1) REAL Android system-bar containment.
# Android 15 edge-to-edge enforcement made the old "CSS only" solution
# insufficient on S23 Ultra. Keep the whole WebView inside a natively
# inset FrameLayout, so fixed headers/modals can never render below the
# status or navigation bars.
# ------------------------------------------------------------------
s=main.read_text("utf-8")
if "import android.widget.FrameLayout;" not in s:
    anchor="import android.view.WindowInsets;\n"
    if anchor not in s: raise SystemExit("WindowInsets import anchor missing")
    s=s.replace(anchor,anchor+"import android.widget.FrameLayout;\nimport android.graphics.Color;\n",1)

old='''        webView = new WebView(this);
        WebView.setWebContentsDebuggingEnabled(false);
        webView.setFitsSystemWindows(false);
        webView.setOnApplyWindowInsetsListener((view, insets) -> {
            systemInsetLeft = insets.getSystemWindowInsetLeft();
            systemInsetTop = insets.getSystemWindowInsetTop();
            systemInsetRight = insets.getSystemWindowInsetRight();
            systemInsetBottom = insets.getSystemWindowInsetBottom();
            applySystemInsetsToWeb();
            return insets;
        });
        setContentView(webView);
        webView.requestApplyInsets();
'''
new='''        FrameLayout contentRoot = new FrameLayout(this);
        contentRoot.setBackgroundColor(Color.rgb(5, 9, 12));
        webView = new WebView(this);
        WebView.setWebContentsDebuggingEnabled(false);
        webView.setFitsSystemWindows(false);
        webView.setBackgroundColor(Color.rgb(5, 9, 12));
        contentRoot.addView(webView, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT));
        contentRoot.setOnApplyWindowInsetsListener((view, insets) -> {
            systemInsetLeft = Math.max(0, insets.getSystemWindowInsetLeft());
            systemInsetTop = Math.max(0, insets.getSystemWindowInsetTop());
            systemInsetRight = Math.max(0, insets.getSystemWindowInsetRight());
            systemInsetBottom = Math.max(0, insets.getSystemWindowInsetBottom());
            view.setPadding(systemInsetLeft, systemInsetTop, systemInsetRight, systemInsetBottom);
            applySystemInsetsToWeb();
            return insets;
        });
        setContentView(contentRoot);
        contentRoot.requestApplyInsets();
        getWindow().setStatusBarColor(Color.rgb(5, 9, 12));
        getWindow().setNavigationBarColor(Color.rgb(5, 9, 12));
'''
if old in s:
    s=s.replace(old,new,1)
elif "FrameLayout contentRoot = new FrameLayout(this);" not in s:
    raise SystemExit("MainActivity inset block changed unexpectedly")

# Native container now owns the safe area. Prevent a second CSS inset.
m=re.search(r"    private void applySystemInsetsToWeb\(\) \{[\s\S]*?\n    \}",s)
if not m: raise SystemExit("applySystemInsetsToWeb not found")
replacement='''    private void applySystemInsetsToWeb() {
        if (webView == null) return;
        final String js = "(function(){var r=document.documentElement;if(!r)return;"
                + "r.style.setProperty('--android-safe-left','0px');"
                + "r.style.setProperty('--android-safe-top','0px');"
                + "r.style.setProperty('--android-safe-right','0px');"
                + "r.style.setProperty('--android-safe-bottom','0px');"
                + "r.dataset.nativeInsets='container';"
                + "})();";
        runOnUiThread(() -> webView.evaluateJavascript(js, null));
    }'''
s=s[:m.start()]+replacement+s[m.end():]
main.write_text(s,"utf-8")

sh=shell.read_text("utf-8")
sh=sh.replace("viewport-fit=cover","viewport-fit=contain")
shell.write_text(sh,"utf-8")

# ------------------------------------------------------------------
# 2) GALACTIC MAP: use the packaged 5042 x 3263 map rather than the
# lower-resolution reddit copy, and preserve its aspect ratio.
# ------------------------------------------------------------------
for path in (p0,p1,runtime):
    if not path.is_file(): continue
    js=path.read_text("utf-8")
    js=js.replace("assets/maps/9752360iy2h61.png","assets/maps/galaxy_map.jpg")
    js=js.replace("aspect-ratio:2700/2425","aspect-ratio:5042/3263")
    js=js.replace("object-fit:fill!important","object-fit:contain!important")
    # Do not expose internal loc_UUID values to the player.
    js=js.replace("||id||'Local atual'","||(String(id||'').startsWith('loc_')?'Local atual':id)||'Local atual'")
    path.write_text(js,"utf-8")

# ------------------------------------------------------------------
# 3) UI hardening: broken local-map image never renders; diagnostics
# always shows live bridge state; route 30 cannot be visually blank.
# ------------------------------------------------------------------
rt=runtime.read_text("utf-8")
addon=r'''
/* R54 P30 — S23 Ultra containment, diagnostics and map hardening. */
(()=>{'use strict';
 if(window.__R54_P30_DEVICE_FIX__)return;window.__R54_P30_DEVICE_FIX__=true;
 const route=()=>new URLSearchParams(location.search).get('screen')||'00';
 const parse=(v,f={})=>{try{return typeof v==='string'?JSON.parse(v):(v??f)}catch{return f}};
 const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

 function localMapUnavailable(img){
  if(!img||img.dataset.p30Broken==='1')return;
  img.dataset.p30Broken='1';
  img.hidden=true;img.style.display='none';
  const host=img.closest('figure,section,div')||img.parentElement;
  if(host&&!host.querySelector('.r54-p30-map-note')){
   const n=document.createElement('p');n.className='r54-p30-map-note';
   n.textContent='Mapa local indisponível para este local.';
   n.style.cssText='margin:8px 0;color:#9eabb2;font-size:.86rem;line-height:1.4';
   host.appendChild(n);
  }
 }
 function repairLocalMaps(){
  document.querySelectorAll('img').forEach(img=>{
   if(!/mapa local/i.test(img.alt||''))return;
   const src=String(img.getAttribute('src')||'').trim();
   const note=(img.closest('figure,section,div')||img.parentElement)?.querySelector?.('.r54-p30-map-note');
   const badSrc=!src||/^(undefined|null|about:blank)$/i.test(src);
   if(badSrc||(img.complete&&img.naturalWidth===0)){localMapUnavailable(img);return}
   img.addEventListener('error',()=>localMapUnavailable(img),{once:true});
   img.addEventListener('load',()=>{
    if(img.naturalWidth>0){img.hidden=false;img.style.display='';img.dataset.p30Broken='0';note?.remove()}
   },{once:true});
  });
 }

 function bridgeState(){
  const out={};
  out.motor=!!window.BraseiroGameBridge;
  out.gemini=!!window.BraseiroGemini;
  out.tts=!!window.BraseiroTts;
  out.library=!!window.BraseiroLibrary;
  out.images=!!window.BraseiroImages;
  try{out.geminiStatus=window.BraseiroGemini?.getStatus?parse(window.BraseiroGemini.getStatus(),{}):{}}catch(e){out.geminiError=String(e?.message||e)}
  try{const raw=window.BraseiroGameBridge?.readState?.();const state=parse(raw,{});out.campaign=state?.ok===false?'erro':(state?.data||state)?'pronta':'sem estado'}catch(e){out.campaign='erro'}
  try{const docs=window.BraseiroLibrary?.listDocuments?parse(window.BraseiroLibrary.listDocuments(),[]):[];out.documents=Array.isArray(docs)?docs.length:0}catch(e){out.documents=0}
  return out;
 }
 function statusLine(label,value,tone='ok'){
  return '<div class="r54-p30-row"><span>'+label+'</span><strong class="'+tone+'">'+value+'</strong></div>';
 }
 function mountDiagnostics(){
  if(route()!=='30')return;
  const host=document.querySelector('.app-content,main')||document.body;
  let panel=document.querySelector('.r54-p30-diagnostics');
  if(!panel){panel=document.createElement('section');panel.className='r54-p30-diagnostics';host.prepend(panel)}
  const st=bridgeState(),g=st.geminiStatus||{};
  const yes=v=>v?'DISPONÍVEL':'INDISPONÍVEL';
  panel.innerHTML='<div class="r54-p30-head"><div><small>DIAGNÓSTICO REAL DO APARELHO</small><h2>Estado do aplicativo</h2></div><button type="button" data-p30-refresh>ATUALIZAR</button></div>'+
   statusLine('Motor / dados',yes(st.motor),st.motor?'ok':'bad')+
   statusLine('Gemini bridge',yes(st.gemini),st.gemini?'ok':'bad')+
   statusLine('Gemini chave',g.configured?'CONFIGURADA':'NÃO CONFIGURADA',g.configured?'ok':'warn')+
   statusLine('Gemini geração',g.generating?'EM ANDAMENTO':'OCIOSO',g.generating?'warn':'ok')+
   statusLine('TTS Android',yes(st.tts),st.tts?'ok':'bad')+
   statusLine('Biblioteca PDF',yes(st.library),st.library?'ok':'bad')+
   statusLine('Documentos locais',String(st.documents||0),'ok')+
   statusLine('Bridge de imagens',yes(st.images),st.images?'ok':'bad')+
   statusLine('Campanha',String(st.campaign||'sem estado').toUpperCase(),st.campaign==='erro'?'bad':'ok')+
   '<p class="r54-p30-version">R54 P30 · Android 1.0.3 · diagnóstico calculado neste aparelho.</p>';
  panel.querySelector('[data-p30-refresh]')?.addEventListener('click',mountDiagnostics,{once:true});
 }
 function style(){
  if(document.getElementById('r54-p30-style'))return;
  const e=document.createElement('style');e.id='r54-p30-style';e.textContent=
  '.r54-p30-diagnostics{margin:12px 16px 110px;padding:14px;border:1px solid #4b6570;border-radius:12px;background:#0b1115;color:#e9eef0;box-shadow:0 10px 28px #0008}'+
  '.r54-p30-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}.r54-p30-head small{color:#64cce6;font-weight:900;letter-spacing:.08em}.r54-p30-head h2{margin:3px 0 0;font-size:1.25rem}.r54-p30-head button{min-height:38px;padding:0 10px;border:1px solid #94713d;border-radius:8px;background:#25170f;color:#f1d29b;font-weight:900}'+
  '.r54-p30-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;padding:9px 0;border-top:1px solid #26343a;font-size:.86rem}.r54-p30-row strong{font-size:.77rem;letter-spacing:.05em}.r54-p30-row .ok{color:#79e6ad}.r54-p30-row .warn{color:#f0c567}.r54-p30-row .bad{color:#ff8e8e}.r54-p30-version{margin:12px 0 0;color:#84969e;font-size:.72rem}'+
  '.r54-p1-map-canvas>img{image-rendering:auto!important;object-fit:contain!important}.r54-p1-map-viewport{aspect-ratio:5042/3263!important;background:#030507!important}';
  document.head.appendChild(e);
 }
 function tick(){style();repairLocalMaps();mountDiagnostics()}
 tick();let timer=0;new MutationObserver(()=>{if(timer)return;timer=setTimeout(()=>{timer=0;tick()},150)}).observe(document.documentElement,{subtree:true,childList:true});
 addEventListener('popstate',()=>setTimeout(tick,0));
})();
'''
if "R54 P30 — S23 Ultra containment" not in rt:
    rt+="\n"+addon+"\n"
runtime.write_text(rt,"utf-8")

# ------------------------------------------------------------------
# 4) Version bump.
# ------------------------------------------------------------------
for bp in [root/"app/build.gradle.kts",root/"app/build.gradle"]:
    if not bp.is_file(): continue
    bs=bp.read_text("utf-8")
    if bp.suffix==".kts":
        bs=re.sub(r"versionCode\s*=\s*\d+","versionCode = 10003",bs,count=1)
        bs=re.sub(r'versionName\s*=\s*"[^"]+"','versionName = "1.0.3"',bs,count=1)
    else:
        bs=re.sub(r"versionCode\s+\d+","versionCode 10003",bs,count=1)
        bs=re.sub(r'versionName\s+"[^"]+"','versionName "1.0.3"',bs,count=1)
    bp.write_text(bs,"utf-8")
    break

# Hard gates.
m=main.read_text("utf-8");rt=runtime.read_text("utf-8")
assert "FrameLayout contentRoot = new FrameLayout(this);" in m
assert "view.setPadding(systemInsetLeft, systemInsetTop, systemInsetRight, systemInsetBottom);" in m
assert "dataset.nativeInsets='container'" in m
assert "viewport-fit=cover" not in shell.read_text("utf-8")
assert "assets/maps/9752360iy2h61.png" not in (p1.read_text("utf-8") if p1.is_file() else "")
assert "assets/maps/galaxy_map.jpg" in (p1.read_text("utf-8") if p1.is_file() else rt)
assert "R54 P30 — S23 Ultra containment" in rt
assert "Mapa local indisponível para este local." in rt
assert "DIAGNÓSTICO REAL DO APARELHO" in rt
assert "R54 P30 · Android 1.0.3" in rt
print("STAR_WARS_P30_PATCH_PASS native_insets=1 broken_map_hidden=1 diagnostics=1 hi_res_galaxy=1")
