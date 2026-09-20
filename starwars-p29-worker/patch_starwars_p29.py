#!/usr/bin/env python3
from pathlib import Path
import re,sys

if len(sys.argv)!=2:
    raise SystemExit("usage: patch_starwars_p29.py <android-root>")

root=Path(sys.argv[1]).resolve()
runtime=root/"app/src/main/assets/vtt/r46/final-runtime.js"
gemini=root/"app/src/main/java/com/braseiro/starwarsedge/GeminiBridge.java"
if not runtime.is_file() or not gemini.is_file():
    raise SystemExit("P28 source not found")

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

# 1) Keep narration depth from the good P26 baseline. P27/P28 had reduced it.
gj=gemini.read_text("utf-8")
gj=gj.replace(
    "Produza 280-480 palavras em 4-7 parágrafos na abertura ou cena principal; em transições menores, 120-240 palavras bastam.",
    "Produza 900-1400 palavras em 8-14 parágrafos quando estiver iniciando uma aventura ou narrando uma cena principal; em transições menores, nunca reduza a narração a uma frase de fallback."
)
# If the other shorter contract survived somewhere, restore its original P26 wording too.
gj=gj.replace(
    "Produza 280-480 palavras em 4-7 parágrafos, mantendo foco na situação presente e espaço real para decisão do jogador.",
    "Produza 400-700 palavras em 4-7 parágrafos, mantendo foco na situação presente e espaço real para decisão do jogador."
)
gemini.write_text(gj,"utf-8")

# 2) Much smaller scene-image prompt only. This does NOT alter narrative text.
new_prompt=r'''function sceneGeminiPrompt(){
 const view=playerView()||{},scene=currentSceneRecord()||{};
 const clip=(v,n)=>{let s=String(v||'').replace(/\s+/g,' ').trim();if(!s)return'';return s.length<=n?s:s.slice(0,n).replace(/\s+\S*$/,'')+'…'};
 const neutral=(v,n=110)=>clip(String(v||'')
  .replace(/star\s*wars/ig,'space opera original')
  .replace(/edge\s*of\s*the\s*empire/ig,'fronteira espacial')
  .replace(/age\s*of\s*rebellion/ig,'resistência espacial')
  .replace(/galactic\s*empire|imp[eé]rio\s*gal[aá]ctico/ig,'regime interestelar')
  .replace(/rebel\s*alliance|alian[cç]a\s*rebelde/ig,'resistência clandestina')
  .replace(/stormtroopers?/ig,'soldados futuristas de armadura clara e desenho original')
  .replace(/jedi/ig,'místico guerreiro')
  .replace(/sith/ig,'adepto sombrio')
  .replace(/lightsabers?|sabres?\s*de\s*luz/ig,'arma luminosa de energia com desenho original')
  .replace(/tatooine/ig,'mundo desértico de dois sóis')
  .replace(/mos\s*eisley/ig,'porto espacial poeirento')
  .replace(/nar\s*shaddaa/ig,'metrópole vertical decadente')
  .replace(/bespin/ig,'cidade suspensa nas nuvens')
  .replace(/darth\s*vader/ig,'comandante mascarado de desenho original')
  .replace(/luke\s*skywalker/ig,'jovem aventureiro')
  .replace(/leia\s*organa/ig,'líder diplomática da resistência')
  .replace(/han\s*solo/ig,'piloto contrabandista')
  .replace(/chewbacca/ig,'companheiro alienígena peludo de grande porte')
  .replace(/millennium\s*falcon/ig,'cargueiro espacial civil modificado')
  .replace(/x[- ]?wing/ig,'caça estelar leve original')
  .replace(/tie\s*fighters?/ig,'caça militar compacto original')
  .replace(/star\s*destroyers?|destr[oó]ieres?\s*estelares?/ig,'cruzador militar colossal original')
  .replace(/death\s*star|estrela\s*da\s*morte/ig,'estação espacial militar colossal original')
  .replace(/at[- ]?ats?|at[- ]?sts?/ig,'andador militar articulado original')
  .replace(/blasters?/ig,'arma portátil de energia')
  .replace(/droids?|dr[oó]ides?/ig,'robô utilitário')
  .replace(/the\s*force|a\s*for[cç]a/ig,'energia mística'),n);
 const loc=neutral(view?.scene?.location?.description||view?.scene?.location?.name||scene?.locationName||scene?.title||'',115);
 const moment=neutral(document.querySelector('.scene-situation-paper p')?.textContent||view?.situation||narrationText(),150);
 const n=Array.isArray(view?.participants)?Math.min(view.participants.length,5):0;
 return [
  'Ilustração original 16:9, space opera retrofuturista cinematográfica.',
  loc&&('Local: '+loc+'.'),
  moment&&('Momento: '+moment+'.'),
  n&&('Pessoas/seres visíveis: '+n+'.'),
  'Tecnologia industrial usada, composição clara, luz natural da cena.',
  'Sem texto, HUD ou logos. Não reproduza personagens, naves, uniformes, armas ou designs de franquias existentes.'
 ].filter(Boolean).join(' ').slice(0,620);
}'''
rt=replace_function(rt,'sceneGeminiPrompt',new_prompt)

# 3) Scene illustration uses the same robust pattern as working native image flows:
# stable delegated click + native generated event + status readback. No IMPORT button.
new_button=r'''function enhanceSceneGeminiButton(){
 const media=document.querySelector('.scene-media-slot');if(!media)return;
 let wrap=media.querySelector('.final-scene-gemini');
 if(!wrap){
  wrap=document.createElement('div');wrap.className='final-scene-gemini';
  wrap.innerHTML='<button type="button" data-r54-scene-illustration="1">✦ ILUSTRAÇÃO</button><small aria-live="polite"></small>';
  media.appendChild(wrap);
 }
 const btn=wrap.querySelector('[data-r54-scene-illustration]'),msg=wrap.querySelector('small');
 const apply=()=>{
  const st=geminiStatus(),key=currentSceneKey();
  if(!st?.imageUrl||st?.imageSceneKey!==key)return false;
  let img=media.querySelector('img.scene-media-image:not(.final-scene-library-image)');
  if(!img){img=document.createElement('img');img.className='scene-media-image';img.alt='Ilustração da cena atual';img.decoding='async';media.prepend(img)}
  img.src=String(st.imageUrl)+(String(st.imageUrl).includes('?')?'&':'?')+'v='+Date.now();
  media.querySelector('.final-scene-library-image')?.remove();
  media.classList.add('has-scene-image');media.classList.remove('has-recovered-scene','is-empty');
  const surface=media.querySelector('.scene-media-surface'),caption=media.querySelector('figcaption');if(surface)surface.hidden=true;if(caption)caption.hidden=true;
  if(btn)btn.disabled=false;if(msg)msg.textContent='Ilustração aplicada à cena.';
  return true;
 };
 apply();
 if(!window.__r54SceneImageNativeReturn){
  window.__r54SceneImageNativeReturn=true;
  addEventListener('braseiroGeminiNativeEvent',()=>{
   requestAnimationFrame(()=>{try{document.querySelectorAll('.scene-media-slot').forEach(()=>enhanceSceneGeminiButton())}catch(_){}});
  });
  document.addEventListener('click',ev=>{
   const target=ev.target?.closest?.('[data-r54-scene-illustration]');
   if(!target)return;
   ev.preventDefault();ev.stopPropagation();
   const holder=target.closest('.final-scene-gemini'),note=holder?.querySelector('small');
   const g=window.BraseiroGemini,st=geminiStatus(),prompt=sceneGeminiPrompt(),sceneKey=currentSceneKey();
   if(!g||typeof g.generateSceneImage!=='function'){if(note)note.textContent='Gerador de imagem indisponível.';return}
   if(!st?.configured){if(note)note.textContent='Configure a chave Gemini em AJUSTES → Gemini.';return}
   if(!prompt){if(note)note.textContent='A cena ainda não tem contexto visual suficiente.';return}
   target.disabled=true;if(note)note.textContent='Gerando ilustração…';
   try{
    const r=safeParse(g.generateSceneImage(prompt,sceneKey),{});
    if(!r?.ok){target.disabled=false;if(note)note.textContent=r?.message||'Falha ao iniciar a geração.';return}
    window.__r54SceneImagePendingKey=sceneKey;
    let tries=0;
    const timer=setInterval(()=>{
     tries++;
     try{
      const s=geminiStatus();
      if(s?.imageUrl&&s?.imageSceneKey===sceneKey){
       clearInterval(timer);enhanceSceneGeminiButton();return;
      }
      if(!s?.generating&&tries>3){
       clearInterval(timer);target.disabled=false;if(note)note.textContent=s?.message||'A geração terminou sem imagem.';
      }else if(tries>130){
       clearInterval(timer);target.disabled=false;if(note)note.textContent='A geração demorou demais.';
      }
     }catch(_){if(tries>130){clearInterval(timer);target.disabled=false}}
    },700);
   }catch(err){target.disabled=false;if(note)note.textContent='Falha ao chamar o gerador de imagem.'}
  },true);
 }
}'''
rt=replace_function(rt,'enhanceSceneGeminiButton',new_button)

# Remove every P28 IMPORTAR artifact from runtime if any remained.
rt=rt.replace('⇧ IMPORTAR','')
rt=rt.replace('data-action="import"','data-action="removed-import"')
# Ensure no external Gemini handoff is used by scene illustration.
scene=re.search(r"function enhanceSceneGeminiButton\(\)\{[\s\S]*?\n\}",rt)
if not scene: raise SystemExit("scene button block missing after patch")
sb=scene.group(0)
if 'openGeminiWithPrompt' in sb or 'pickSceneImage' in sb or 'IMPORTAR' in sb:
    raise SystemExit("forbidden scene handoff/import survived")

if "R54_P29_SCENE_IMAGE_NATIVE_EVENT" not in rt:
    rt+="\n/* R54_P29_SCENE_IMAGE_NATIVE_EVENT: delegated button + native generated event, no import button. */\n"
runtime.write_text(rt,"utf-8")

# 4) Bump version.
for bp in [root/"app/build.gradle.kts",root/"app/build.gradle"]:
    if bp.is_file():
        bs=bp.read_text("utf-8")
        bs=re.sub(r"versionCode\s*(?:=\s*)?\d+","versionCode = 10002",bs,count=1)
        bs=re.sub(r'versionName\s*(?:=\s*)?"[^"]+"','versionName = "1.0.2"',bs,count=1)
        bp.write_text(bs,"utf-8")
        break

# 5) Hard regression assertions.
rt=runtime.read_text("utf-8");gj=gemini.read_text("utf-8")
sp=re.search(r"function sceneGeminiPrompt\(\)\{[\s\S]*?\n\}",rt).group(0)
sb=re.search(r"function enhanceSceneGeminiButton\(\)\{[\s\S]*?\n\}",rt).group(0)
assert "slice(0,620)" in sp
assert "data-r54-scene-illustration" in sb
assert "generateSceneImage(prompt,sceneKey)" in sb
assert "braseiroGeminiNativeEvent" in sb
assert "pickSceneImage" not in sb
assert "openGeminiWithPrompt" not in sb
assert "IMPORTAR" not in sb
assert "900-1400 palavras" in gj
assert "280-480 palavras" not in gj
print("STAR_WARS_P29_PATCH_PASS prompt_cap=620 native_event=1 delegated_click=1 import=0 narrative_restored=1")
