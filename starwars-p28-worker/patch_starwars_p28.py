#!/usr/bin/env python3
from pathlib import Path
import re,sys

if len(sys.argv)!=2:
    raise SystemExit("usage: patch_starwars_p28.py <android-root>")

root=Path(sys.argv[1]).resolve()
runtime=root/"app/src/main/assets/vtt/r46/final-runtime.js"
gemini=root/"app/src/main/java/com/braseiro/starwarsedge/GeminiBridge.java"
shell=root/"app/src/main/assets/vtt/r46/r46-shell.bundle.js"
for p in (runtime,gemini,shell):
    if not p.is_file(): raise SystemExit(f"missing {p}")

def replace_function(src,name,replacement):
    m=re.search(rf"function\s+{re.escape(name)}\s*\([^)]*\)\s*\{{",src)
    if not m: raise SystemExit(f"function not found: {name}")
    brace=src.find("{",m.start());depth=0;quote=None;esc=False
    for i in range(brace,len(src)):
        c=src[i]
        if quote:
            if esc: esc=False
            elif c=="\\": esc=True
            elif c==quote: quote=None
            continue
        if c in ("'",'"','`'): quote=c;continue
        if c=="{": depth+=1
        elif c=="}":
            depth-=1
            if depth==0:return src[:m.start()]+replacement+src[i+1:]
    raise SystemExit(f"unbalanced {name}")

rt=runtime.read_text("utf-8")
new_button=r'''function enhanceSceneGeminiButton(){
 const media=document.querySelector('.scene-media-slot');if(!media||media.querySelector('.final-scene-gemini'))return;
 const wrap=document.createElement('div');wrap.className='final-scene-gemini';wrap.innerHTML='<div class="final-scene-button-row"><button type="button" data-action="gemini">✦ ILUSTRAÇÃO</button><button type="button" data-action="import">⇧ IMPORTAR</button></div><small aria-live="polite"></small>';media.appendChild(wrap);
 const btn=wrap.querySelector('[data-action="gemini"]'),importBtn=wrap.querySelector('[data-action="import"]'),msg=wrap.querySelector('small');
 const applyNativeImage=(st)=>{
  if(!st||!st.imageUrl||st.imageSceneKey!==currentSceneKey())return false;
  let img=media.querySelector('img.scene-media-image:not(.final-scene-library-image)');
  if(!img){img=document.createElement('img');img.className='scene-media-image';img.alt='Ilustração gerada para a cena atual';img.decoding='async';media.prepend(img)}
  const src=String(st.imageUrl)+(String(st.imageUrl).includes('?')?'&':'?')+'scenev='+Date.now();
  img.src=src;
  media.querySelector('.final-scene-library-image')?.remove();
  media.classList.add('has-scene-image');media.classList.remove('has-recovered-scene','is-empty');
  const surface=media.querySelector('.scene-media-surface'),caption=media.querySelector('figcaption');if(surface)surface.hidden=true;if(caption)caption.hidden=true;
  return true;
 };
 const watch=(sceneKey)=>{
  let tries=0;
  const timer=setInterval(()=>{
   tries++;
   try{
    const st=geminiStatus();
    if(st.imageUrl&&st.imageSceneKey===sceneKey){
     clearInterval(timer);applyNativeImage(st);btn.disabled=false;msg.textContent='Imagem gerada e aplicada à cena.';return;
    }
    if(!st.generating&&tries>2){
     clearInterval(timer);btn.disabled=false;msg.textContent='A geração terminou sem imagem. Se o provedor recusou, use IMPORTAR como fallback.';
    }else if(tries>=100){clearInterval(timer);btn.disabled=false;msg.textContent='A geração demorou demais. Tente novamente ou use IMPORTAR.'}
   }catch(_){if(tries>=100){clearInterval(timer);btn.disabled=false}}
  },700);
 };
 btn.onclick=()=>{
  const g=window.BraseiroGemini,st=geminiStatus(),prompt=sceneGeminiPrompt(),sceneKey=currentSceneKey();
  if(!g||typeof g.generateSceneImage!=='function'){msg.textContent='Geração nativa de imagem indisponível.';return}
  if(!st.configured){msg.textContent='Configure a chave Gemini em AJUSTES → Gemini.';return}
  if(!prompt){msg.textContent='Inicie a aventura para descrever a cena.';return}
  btn.disabled=true;msg.textContent='Gemini está gerando a imagem dentro do VTT…';
  try{
   const r=safeParse(g.generateSceneImage(prompt,sceneKey),{});
   if(!r.ok){btn.disabled=false;msg.textContent=r.message||'Falha ao iniciar a geração.';return}
   watch(sceneKey);
  }catch(err){btn.disabled=false;msg.textContent='Falha ao chamar o gerador de imagem.'}
 };
 importBtn.onclick=()=>{
  const g=window.BraseiroGemini,sceneKey=currentSceneKey();if(!g||typeof g.pickSceneImage!=='function'){msg.textContent='Importação de imagem indisponível.';return}
  importBtn.disabled=true;msg.textContent='Escolha uma imagem da galeria…';
  try{
   const r=safeParse(g.pickSceneImage(sceneKey),{});if(!r.ok){msg.textContent=r.message||'Não foi possível abrir suas imagens.';importBtn.disabled=false;return}
   let tries=0;const timer=setInterval(()=>{tries++;try{const st=geminiStatus();if(st.imageUrl&&st.imageSceneKey===sceneKey){clearInterval(timer);applyNativeImage(st);importBtn.disabled=false;msg.textContent='Imagem importada e aplicada à cena.'}else if(tries>45){clearInterval(timer);importBtn.disabled=false}}catch(_){if(tries>45){clearInterval(timer);importBtn.disabled=false}}},500);
  }catch{msg.textContent='Falha ao abrir suas imagens.';importBtn.disabled=false}
 };
 const initial=geminiStatus();applyNativeImage(initial);
}'''
rt=replace_function(rt,'enhanceSceneGeminiButton',new_button)
if "R54_P28_SCENE_IMAGE_NATIVE_RETURN" not in rt:
    rt+="\n/* R54_P28_SCENE_IMAGE_NATIVE_RETURN: scene image uses generateSceneImage and is applied directly to scene media. */\n"
runtime.write_text(rt,"utf-8")

g=gemini.read_text("utf-8")
# Keep direct image API enabled with the P27 compact prompt cap.
assert "public String generateSceneImage(String prompt, String sceneKey)" in g
assert "persistSceneImage" in g and "openSceneImageResponse" in g
# Increase image read timeout slightly for slower mobile networks without touching Master/TTS.
needle="connection.setReadTimeout(60000);\n            connection.setRequestMethod(\"POST\");"
if needle in g:
    # only first occurrence is generateRemote in current source
    g=g.replace(needle,"connection.setReadTimeout(90000);\n            connection.setRequestMethod(\"POST\");",1)
gemini.write_text(g,"utf-8")

# Bump app version so the corrected APK is distinguishable from P26/P27.
build=root/"app/build.gradle"
build_kts=root/"app/build.gradle.kts"
bp=build_kts if build_kts.is_file() else build
if bp.is_file():
    bs=bp.read_text("utf-8")
    bs=re.sub(r"versionCode\s*[= ]\s*\d+","versionCode = 10001",bs,count=1)
    bs=re.sub(r'versionName\s*[= ]\s*"[^"]+"','versionName = "1.0.1"',bs,count=1)
    bp.write_text(bs,"utf-8")

rt=runtime.read_text("utf-8");g=gemini.read_text("utf-8");sh=shell.read_text("utf-8")
assert "g.generateSceneImage(prompt,sceneKey)" in rt
assert "g.openGeminiWithPrompt(prompt)" not in re.search(r"function enhanceSceneGeminiButton\(\)\{[\s\S]*?\n\}",rt).group(0)
assert "applyNativeImage" in rt
assert "imageSceneKey===sceneKey" in rt
assert "pickSceneImage(sceneKey)" in rt
assert "R54_P28_SCENE_IMAGE_NATIVE_RETURN" in rt
assert "notifyEvent(successEvent" in g
assert "braseiroGeminiNativeEvent" in sh
print("STAR_WARS_P28_PATCH_PASS direct_scene_generation=1 auto_apply=1 import_fallback=1")
