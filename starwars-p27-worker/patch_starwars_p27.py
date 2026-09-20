#!/usr/bin/env python3
from pathlib import Path
import re, sys

if len(sys.argv)!=2:
    raise SystemExit("usage: patch_starwars_p27.py <android-root>")

root=Path(sys.argv[1]).resolve()
vtt=root/"app/src/main/assets/vtt"
runtime=vtt/"r46/final-runtime.js"
gemini=root/"app/src/main/java/com/braseiro/starwarsedge/GeminiBridge.java"
for p in (runtime,gemini):
    if not p.is_file(): raise SystemExit(f"missing {p}")

def replace_function(src,name,replacement):
    m=re.search(rf"function\s+{re.escape(name)}\s*\([^)]*\)\s*\{{",src)
    if not m: raise SystemExit(f"function not found: {name}")
    brace=src.find("{",m.start()); depth=0; ins=False; quote=""; esc=False
    for i in range(brace,len(src)):
        c=src[i]
        if ins:
            if esc: esc=False
            elif c=="\\": esc=True
            elif c==quote: ins=False
            continue
        if c in ("'",'"','`'): ins=True; quote=c; continue
        if c=="{": depth+=1
        elif c=="}":
            depth-=1
            if depth==0:
                return src[:m.start()]+replacement+src[i+1:]
    raise SystemExit(f"unbalanced function {name}")

rt=runtime.read_text("utf-8")

# Compact, original, copyright-safe visual prompt.
new_prompt=r'''function sceneGeminiPrompt(){
 const view=playerView()||{},scene=currentSceneRecord()||{};
 const clip=(v,n=150)=>{let s=String(v||'').replace(/\s+/g,' ').trim();if(!s)return'';const cut=s.slice(0,n);return s.length>n?cut.replace(/\s+\S*$/,'')+'…':cut};
 const neutral=(v)=>clip(String(v||'')
  .replace(/star\s*wars/ig,'space opera retrofuturista')
  .replace(/edge\s*of\s*the\s*empire/ig,'campanha de fronteira espacial')
  .replace(/age\s*of\s*rebellion/ig,'campanha de resistência espacial')
  .replace(/galactic\s*empire|imp[eé]rio\s*gal[aá]ctico/ig,'regime autoritário interestelar')
  .replace(/rebel\s*alliance|alian[cç]a\s*rebelde/ig,'resistência clandestina')
  .replace(/stormtroopers?/ig,'soldados futuristas de armadura clara com design original')
  .replace(/jedi/ig,'místico guerreiro')
  .replace(/sith/ig,'adepto sombrio')
  .replace(/lightsabers?|sabres?\s*de\s*luz/ig,'arma de energia luminosa com desenho original')
  .replace(/tatooine/ig,'mundo desértico árido de dois sóis')
  .replace(/mos\s*eisley/ig,'porto espacial poeirento de construções baixas')
  .replace(/nar\s*shaddaa/ig,'metrópole vertical decadente em lua industrial')
  .replace(/corellia/ig,'mundo industrial de estaleiros e tráfego orbital')
  .replace(/ryloth/ig,'mundo rochoso de vales secos e assentamentos escavados')
  .replace(/bespin/ig,'cidade suspensa nas nuvens sobre um gigante gasoso')
  .replace(/shantipole/ig,'base remota escondida entre asteroides'),n);
 const loc=neutral(view?.scene?.location?.description||view?.scene?.location?.name||scene?.locationName||scene?.title||'');
 const situation=neutral(document.querySelector('.scene-situation-paper p')?.textContent||view?.situation||'');
 const narration=neutral(narrationText());
 const participants=Array.isArray(view?.participants)?view.participants.length:0;
 const facts=[];
 if(loc)facts.push('Ambiente: '+loc);
 if(situation)facts.push('Momento: '+situation);
 else if(narration)facts.push('Momento: '+narration);
 if(participants)facts.push('Figuras em cena: '+Math.min(participants,6));
 const prompt=[
  'Crie uma ilustração ORIGINAL, horizontal 16:9, de space opera retrofuturista.',
  'Visual: tecnologia analógica industrial, superfícies usadas, materiais gastos, luz cinematográfica e cenário crível.',
  ...facts,
  'Não copie filmes, personagens, uniformes, naves, armas, logos, enquadramentos ou designs de franquias existentes. Crie formas próprias.',
  'Sem texto, letras, HUD, molduras, marca d’água ou interface.'
 ].join('\n');
 return prompt.slice(0,900);
}'''
rt=replace_function(rt,'sceneGeminiPrompt',new_prompt)

# Throttle expensive whole-DOM enhancement observers.
rt=rt.replace(
"let scheduled=false;const observer=new MutationObserver(()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;enhance()})});",
"let scheduled=false,enhanceTimer=0;const observer=new MutationObserver(()=>{if(scheduled)return;scheduled=true;clearTimeout(enhanceTimer);enhanceTimer=setTimeout(()=>{scheduled=false;enhance()},120)});"
)
rt=rt.replace(
"r54Tick();new MutationObserver(()=>r54Tick()).observe(document.documentElement,{subtree:true,childList:true});addEventListener('popstate',()=>setTimeout(r54Tick,0));",
"r54Tick();let r54TickTimer=0;new MutationObserver(()=>{if(r54TickTimer)return;r54TickTimer=setTimeout(()=>{r54TickTimer=0;r54Tick()},160)}).observe(document.documentElement,{subtree:true,childList:true});addEventListener('popstate',()=>setTimeout(r54Tick,0));"
)

# Add a stable marker for QA.
if "R54_P27_COMPACT_GEMINI_PROMPT" not in rt:
    rt += "\n/* R54_P27_COMPACT_GEMINI_PROMPT: <=900 chars, original space-opera wording, no full-scene dump. */\n"

runtime.write_text(rt,"utf-8")

g=gemini.read_text("utf-8")
# Enforce compact visual handoff; keeps normal Master/Gemini bridge untouched.
g=g.replace(
'if (cleanPrompt.length() < 20 || cleanPrompt.length() > 12000) return fail("Prompt de ilustração inválido.");',
'if (cleanPrompt.length() < 20 || cleanPrompt.length() > 2200) return fail("Prompt visual inválido ou excessivo.");'
)
g=g.replace(
'if (cleanPrompt.length() < 20 || cleanPrompt.length() > 5000) return fail("Prompt de cena inválido.");',
'if (cleanPrompt.length() < 20 || cleanPrompt.length() > 2200) return fail("Prompt visual inválido ou excessivo.");'
)

# If the current Master contract still asks for very large responses, reduce output latency without making scenes terse.
g=g.replace(
'Produza 900-1400 palavras em 8-14 parágrafos quando estiver iniciando uma aventura ou narrando uma cena principal; em transições menores, nunca reduza a narração a uma frase de fallback.',
'Produza 280-480 palavras em 4-7 parágrafos na abertura ou cena principal; em transições menores, 120-240 palavras bastam.'
)
g=g.replace(
'Produza 400-700 palavras em 4-7 parágrafos, mantendo foco na situação presente e espaço real para decisão do jogador.',
'Produza 280-480 palavras em 4-7 parágrafos na abertura ou cena principal; em transições menores, 120-240 palavras bastam.'
)
gemini.write_text(g,"utf-8")

# Hard gates.
rt=runtime.read_text("utf-8"); g=gemini.read_text("utf-8")
body=re.search(r"function sceneGeminiPrompt\(\)\{[\s\S]*?\n\}",rt)
assert body, "sceneGeminiPrompt missing"
b=body.group(0)
assert "slice(0,900)" in b
assert "Narração visível ao jogador" not in b
assert "STAR WARS" not in b.upper()
assert "Não copie filmes" in b
assert "R54_P27_COMPACT_GEMINI_PROMPT" in rt
assert "Prompt visual inválido ou excessivo" in g
assert "900-1400 palavras" not in g
print("STAR_WARS_P27_PATCH_PASS compact_prompt=900 master_words=280-480 observers_throttled=1")
