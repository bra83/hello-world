#!/usr/bin/env python3
from pathlib import Path
import re, sys

if len(sys.argv) != 2:
    raise SystemExit("usage: r568_concept_structure_fix.py <android-root>")

root = Path(sys.argv[1])
app = root / "app/src/main/assets/web/app"
index = app / "index.html"
appjs = app / "app.js"
css = app / "interface_v2.css"
main_activity = root / "app/src/main/java/com/braseiro/cyberpunkred/MainActivity.kt"
gradle = root / "app/build.gradle.kts"

for p in (index, appjs, css, main_activity, gradle):
    if not p.is_file():
        raise SystemExit(f"missing required file: {p}")

# ---------------------------------------------------------------------------
# index.html — concept authority structure without deleting any VTT surface.
# ---------------------------------------------------------------------------
s = index.read_text(encoding="utf-8")

nav = '''<nav aria-label="Navegação principal" class="tabs bottom-nav">
<button class="active" data-tab="table"><span class="nav-glyph">⌂</span><span>INÍCIO</span></button>
<button data-tab="sheet"><span class="nav-glyph">▤</span><span>FICHA</span></button>
<button data-tab="atlas"><span class="nav-glyph">◇</span><span>MAPA</span></button>
<button data-tab="inventory"><span class="nav-glyph">▣</span><span>MOCHILA</span></button>
<button aria-controls="moreSheet" aria-haspopup="dialog" class="more-nav" id="moreNavBtn" type="button"><span class="nav-glyph">☰</span><span>MENU</span></button>
<button class="secondary-tab nav-target-only" data-tab="game" tabindex="-1">Mundo</button>
<button class="secondary-tab nav-target-only" data-tab="stories" tabindex="-1">Street Stories</button>
<button class="secondary-tab nav-target-only" data-tab="vehicle" tabindex="-1">Veículo</button>
<button class="secondary-tab nav-target-only" data-tab="combat" tabindex="-1">Combate</button>
<button class="secondary-tab nav-target-only" data-tab="net" tabindex="-1">Netrun</button>
<button class="secondary-tab nav-target-only" data-tab="journal" tabindex="-1">Diário</button>
<button class="secondary-tab nav-target-only" data-tab="create" tabindex="-1">Criação</button>
<button class="secondary-tab nav-target-only" data-tab="life" tabindex="-1">Caminho</button>
<button class="secondary-tab nav-target-only" data-tab="skills" tabindex="-1">Perícias</button>
<button class="secondary-tab nav-target-only" data-tab="library" tabindex="-1">Biblioteca</button>
<button class="secondary-tab nav-target-only" data-tab="audio" tabindex="-1">Áudio</button>
<button class="secondary-tab nav-target-only" data-tab="portrait" tabindex="-1">Retrato</button>
<button class="secondary-tab nav-target-only" data-tab="json" tabindex="-1">Dados</button>
</nav>'''
s, n = re.subn(r'<nav aria-label="Navegação principal" class="tabs bottom-nav">.*?</nav>', nav, s, count=1, flags=re.S)
if n != 1:
    raise SystemExit("R568_NAV_NOT_FOUND")

home = '''<div class="home-dashboard" id="homeDashboard">
<div class="home-tagline">NO FUTURE.<br/>JUST MORE OPTIONS.</div>
<div class="home-actions">
<button class="home-card home-primary" id="homeContinueBtn" type="button"><span class="home-icon">▷</span><span><b>CONTINUAR</b><small id="homeContinueMeta">Retomar a última cena</small></span><i>›</i></button>
<button class="home-card" id="homeNewBtn" type="button"><span class="home-icon">◈</span><span><b>NOVA SESSÃO</b><small>Gere uma nova situação</small></span><i>›</i></button>
<button class="home-card" id="homeStoriesBtn" type="button"><span class="home-icon">▣</span><span><b>STREET STORIES</b><small>Trabalhos, contatos e ganchos</small></span><i>›</i></button>
<button class="home-card" id="homeMapBtn" type="button"><span class="home-icon">◇</span><span><b>MAPA</b><small>Explore Night City</small></span><i>›</i></button>
<button class="home-card" id="homeTeamBtn" type="button"><span class="home-icon">●</span><span><b>EQUIPE</b><small>Personagens, NPCs e aliados</small></span><i>›</i></button>
<button class="home-card" id="homeInventoryBtn" type="button"><span class="home-icon">▣</span><span><b>MOCHILA</b><small>Equipamentos e inventário</small></span><i>›</i></button>
<button class="home-card" id="homeDatabaseBtn" type="button"><span class="home-icon">▤</span><span><b>BANCO DE DADOS</b><small>Locais, NPCs, veículos e regras</small></span><i>›</i></button>
</div>
<div class="home-quote">“AINDA TEM TRABALHO POR AQUI.”<small>— NIGHT CITY</small></div>
</div>
<div class="session-live-stack" id="sessionLiveStack">'''
needle = '<section class="tab active session-screen" id="tab-table">'
if 'id="homeDashboard"' not in s:
    if needle not in s:
        raise SystemExit("R568_SESSION_ROOT_NOT_FOUND")
    s = s.replace(needle, needle + "\n" + home, 1)
    close_needle = '<div aria-hidden="true" class="session-runtime-anchors">'
    if close_needle not in s:
        raise SystemExit("R568_SESSION_CLOSE_ANCHOR_NOT_FOUND")
    s = s.replace(close_needle, '</div>\n' + close_needle, 1)

more_markup = '''<div class="more-list more-list-primary">
<button data-open-tab="journal"><span class="more-mark">▤</span><div><b>DIÁRIO</b><small>Notas, pistas e contatos</small></div><i>›</i></button>
<button data-open-tab="game"><span class="more-mark">●</span><div><b>NPCs</b><small>Conhecidos, aliados e encontros</small></div><i>›</i></button>
<button data-open-tab="atlas"><span class="more-mark">◆</span><div><b>LOCAIS</b><small>Bares, fixers e pontos de interesse</small></div><i>›</i></button>
<button data-open-tab="library"><span class="more-mark">◉</span><div><b>REGRAS</b><small>Consultas rápidas e biblioteca</small></div><i>›</i></button>
<button data-open-tab="audio"><span class="more-mark">⚙</span><div><b>CONFIGURAÇÕES</b><small>TTS, IA, aparência e idioma</small></div><i>›</i></button>
<button data-open-tab="json"><span class="more-mark">▣</span><div><b>EXPORTAR DADOS</b><small>Backup da campanha e intercâmbio</small></div><i>›</i></button>
<button id="moreHomeBtn" type="button"><span class="more-mark danger-mark">⌾</span><div><b>INÍCIO</b><small>Voltar ao painel principal</small></div><i>›</i></button>
</div>
<details class="more-advanced">
<summary>FERRAMENTAS AVANÇADAS</summary>
<div class="more-list more-list-advanced">
<button data-open-tab="inventory"><span class="more-mark">▣</span><div><b>MOCHILA</b><small>Armas, armaduras, munição e equipamentos</small></div><i>›</i></button>
<button data-open-tab="combat"><span class="more-mark">◎</span><div><b>COMBATE</b><small>Iniciativa, ações, dano e condições</small></div><i>›</i></button>
<button data-open-tab="net"><span class="more-mark">⌬</span><div><b>NET</b><small>Arquitetura, programas e ações NET</small></div><i>›</i></button>
<button data-open-tab="vehicle"><span class="more-mark">▰</span><div><b>VEÍCULO</b><small>Condução, recursos e perseguições</small></div><i>›</i></button>
<button data-open-tab="stories"><span class="more-mark">◇</span><div><b>STREET STORIES</b><small>Trabalhos, objetivos e histórico</small></div><i>›</i></button>
<button data-open-tab="life"><span class="more-mark">◇</span><div><b>CAMINHO DE VIDA</b><small>Histórico, vínculos e origem</small></div><i>›</i></button>
<button data-open-tab="create"><span class="more-mark">＋</span><div><b>CRIAÇÃO</b><small>Método, função e ajustes</small></div><i>›</i></button>
<button data-open-tab="skills"><span class="more-mark">▥</span><div><b>PERÍCIAS</b><small>Lista completa e níveis</small></div><i>›</i></button>
<button data-open-tab="portrait"><span class="more-mark">◉</span><div><b>RETRATOS E TOKENS</b><small>Identidade visual persistente</small></div><i>›</i></button>
</div>
</details>'''
pattern = r'<div class="more-list">.*?</div>\s*<div class="more-diagnostics">'
s, n = re.subn(pattern, more_markup + '\n<div class="more-diagnostics">', s, count=1, flags=re.S)
if n != 1:
    raise SystemExit("R568_MORE_LIST_NOT_FOUND")

s = re.sub(r'app\.js\?build=\d+', 'app.js?build=4168', s)
index.write_text(s, encoding="utf-8")

# ---------------------------------------------------------------------------
# app.js — wire the concept dashboard to the existing mechanics.
# ---------------------------------------------------------------------------
s = appjs.read_text(encoding="utf-8")
s = s.replace("const labels={table:'SESSÃO',game:'MUNDO',atlas:'MAPA',sheet:'FICHA',inventory:'MOCHILA'",
              "const labels={table:'INÍCIO',game:'MUNDO',atlas:'MAPA',sheet:'FICHA',inventory:'MOCHILA'", 1)

anchor = "bind('#coreBadge','click',()=>{activateTab('audio');requestAnimationFrame(()=>window.scrollTo({top:0,left:0,behavior:'auto'}));});"
addon = r'''
const openLiveSession=()=>{
  const narrative=$('#tableNarrative')?.textContent||'';
  if(/A cidade está pronta/i.test(narrative)) $('#sessionContinueBtn')?.click();
  setTimeout(()=>$('#sessionLiveStack')?.scrollIntoView({behavior:'smooth',block:'start'}),180);
};
bind('#homeContinueBtn','click',openLiveSession);
bind('#homeNewBtn','click',()=>{$('#sessionNewBtn')?.click();setTimeout(()=>$('#sessionLiveStack')?.scrollIntoView({behavior:'smooth',block:'start'}),180)});
bind('#homeStoriesBtn','click',()=>activateTab('stories'));
bind('#homeMapBtn','click',()=>activateTab('atlas'));
bind('#homeTeamBtn','click',()=>activateTab('game'));
bind('#homeInventoryBtn','click',()=>activateTab('inventory'));
bind('#homeDatabaseBtn','click',()=>activateTab('library'));
bind('#moreHomeBtn','click',()=>activateTab('table'));
const syncHomeMeta=()=>{const out=$('#homeContinueMeta'),loc=$('#tableLocation')?.textContent?.trim(),scene=$('#tableScene')?.textContent?.trim();if(out)out.textContent=[loc,scene].filter(Boolean).join(' • ')||'Retomar a última cena'};
syncHomeMeta();
new MutationObserver(syncHomeMeta).observe($('#tab-table')||document.body,{subtree:true,childList:true,characterData:true});
'''
if "bind('#homeContinueBtn'" not in s:
    if anchor not in s:
        raise SystemExit("R568_APP_BIND_ANCHOR_NOT_FOUND")
    s = s.replace(anchor, anchor + "\n" + addon, 1)
appjs.write_text(s, encoding="utf-8")

# ---------------------------------------------------------------------------
# CSS — match supplied concept hierarchy; mechanics remain present below/inside.
# ---------------------------------------------------------------------------
s = css.read_text(encoding="utf-8")
if "R5.68 — CONCEPT STRUCTURE PASS" not in s:
    s += r'''

/* ============================================================
   R5.68 — CONCEPT STRUCTURE PASS
   Supplied concept is presentation authority. Functional surfaces
   remain intact: the dashboard routes into the existing VTT.
   ============================================================ */
:root{
  --r568-bg:#02070a;
  --r568-card:#06151a;
  --r568-card2:#071a20;
  --r568-line:#12343d;
  --r568-red:#ff2142;
  --r568-cyan:#18d9f3;
  --r568-muted:#82969d;
}

/* Concept navigation: INÍCIO / FICHA / MAPA / MOCHILA / MENU. */
.phone.app-shell .tabs.bottom-nav{
  grid-template-columns:repeat(4,minmax(0,1fr))!important;
  height:56px!important;
}
.phone.app-shell .tabs.bottom-nav>button:not(.nav-target-only){
  display:flex!important;
}
.phone.app-shell .tabs.bottom-nav>button.nav-target-only{
  display:none!important;
}
.phone.app-shell .tabs.bottom-nav>button{
  position:relative!important;
  flex-direction:column!important;
  justify-content:center!important;
  gap:2px!important;
  font-size:6px!important;
}
.phone.app-shell .tabs.bottom-nav .nav-glyph{font-size:13px!important}

/* Home concept. The operational Session is preserved immediately below. */
#tab-table{padding-top:0!important}
.home-dashboard{
  min-height:calc(100dvh - 124px - env(safe-area-inset-bottom))!important;
  padding:10px 6px 20px!important;
  display:flex!important;
  flex-direction:column!important;
  justify-content:flex-start!important;
  background:
    linear-gradient(180deg,rgba(2,7,10,.2),rgba(2,7,10,.98)),
    radial-gradient(circle at 16% 100%,rgba(255,33,66,.10),transparent 26%)!important;
}
.home-tagline{
  margin:2px 2px 14px!important;
  color:#6e858d!important;
  font-size:6.5px!important;
  line-height:1.35!important;
  letter-spacing:.45px!important;
}
.home-actions{display:grid!important;gap:5px!important}
body:not(:has(#tab-combat.active)) .phone.app-shell .home-card{
  min-height:53px!important;
  display:grid!important;
  grid-template-columns:32px minmax(0,1fr) 14px!important;
  align-items:center!important;
  gap:8px!important;
  padding:6px 9px!important;
  text-align:left!important;
  background:linear-gradient(180deg,#07191f,#061419)!important;
  border:1px solid #12323b!important;
  border-radius:4px!important;
  color:#eaf2f4!important;
  box-shadow:0 3px 10px rgba(0,0,0,.22)!important;
}
body:not(:has(#tab-combat.active)) .phone.app-shell .home-card.home-primary{
  min-height:60px!important;
  border-color:var(--r568-red)!important;
  background:linear-gradient(90deg,rgba(255,33,66,.13),#090d10 52%,rgba(255,33,66,.06))!important;
  box-shadow:0 0 11px rgba(255,33,66,.26),inset 0 0 10px rgba(255,33,66,.06)!important;
}
.home-card .home-icon{
  width:28px!important;height:28px!important;display:grid!important;place-items:center!important;
  color:var(--r568-cyan)!important;border:1px solid #176070!important;border-radius:3px!important;
  font-size:15px!important;
}
.home-card.home-primary .home-icon{color:var(--r568-red)!important;border-color:transparent!important;font-size:21px!important}
.home-card b{display:block!important;font-size:8.5px!important;line-height:1.05!important;color:#f0f4f5!important;letter-spacing:.15px!important}
.home-card small{display:block!important;margin-top:3px!important;font-size:6.2px!important;color:#7f949b!important;font-weight:500!important}
.home-card i{font-style:normal!important;font-size:16px!important;color:#91a4aa!important}
.home-quote{margin:auto 0 0!important;padding:16px 4px 0!important;text-align:center!important;color:#9caaae!important;font-size:6.3px!important}
.home-quote small{display:block!important;margin-top:3px!important;color:#647a82!important;font-size:5.6px!important}
.session-live-stack{padding-top:8px!important}

/* The supplied concept keeps the large brand only on INÍCIO. */
body[data-active-tab="sheet"] .app-header,
body[data-active-tab="atlas"] .app-header,
body[data-active-tab="inventory"] .app-header,
body[data-active-tab="game"] .app-header,
body[data-active-tab="stories"] .app-header,
body[data-active-tab="vehicle"] .app-header,
body[data-active-tab="combat"] .app-header,
body[data-active-tab="net"] .app-header,
body[data-active-tab="journal"] .app-header,
body[data-active-tab="library"] .app-header,
body[data-active-tab="audio"] .app-header,
body[data-active-tab="json"] .app-header{display:none!important}
body[data-active-tab="table"] .app-header .header-actions{display:none!important}
body[data-active-tab="table"] .app-header{min-height:82px!important;padding:16px 14px 8px!important}
body[data-active-tab="table"] .brand-lockup strong{font-size:21px!important;font-style:italic!important}
body[data-active-tab="table"] .brand-lockup span{font-size:6px!important;letter-spacing:2.1px!important}

/* Ficha: concept proportions while retaining all ten RED stats. */
#tab-sheet::before{margin-top:7px!important}
#tab-sheet .sheet-concept-subtabs{margin-bottom:7px!important}
#tab-sheet .sheet-identity{
  min-height:126px!important;
  display:grid!important;
  grid-template-columns:minmax(0,1fr) 92px!important;
  align-items:center!important;
  gap:8px!important;
  padding:10px!important;
}
#tab-sheet .sheet-identity>img{
  grid-column:2!important;grid-row:1!important;
  width:82px!important;height:82px!important;border-radius:50%!important;
  border:2px solid var(--r568-red)!important;
}
#tab-sheet .sheet-identity>div{grid-column:1!important;grid-row:1!important;min-width:0!important}
#tab-sheet .sheet-identity h1{font-size:15px!important;margin:3px 0!important}
#tab-sheet .sheet-identity .sheet-vitals{
  grid-column:1 / -1!important;
  display:grid!important;
  grid-template-columns:repeat(2,minmax(0,1fr))!important;
  gap:4px!important;
  margin-top:7px!important;
}
#tab-sheet .sheet-vitals>div{min-height:35px!important;padding:5px 7px!important}
#tab-sheet .sheet-stats{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:4px!important;padding:6px!important}
#tab-sheet .sheet-stats>div{min-height:47px!important;padding:5px 3px!important}
#tab-sheet .sheet-stats b{font-size:14px!important}
#tab-sheet .panel{margin-bottom:7px!important}

/* Map: map first, controls compact. Canonical map remains the authority. */
#tab-atlas::before{margin-top:7px!important}
#tab-atlas .map-concept-subtabs{position:relative!important;z-index:3!important;margin-bottom:5px!important}
#tab-atlas .atlas-panel>.panel-title{display:none!important}
#tab-atlas .atlas-toolbar{
  display:grid!important;
  grid-template-columns:minmax(0,1.2fr) minmax(0,.8fr) 34px 34px 44px!important;
  gap:3px!important;
  padding:4px!important;
  background:#031015!important;
}
#tab-atlas #atlasFit{display:none!important}
#tab-atlas .atlas-toolbar select{min-width:0!important;padding:2px 4px!important}
#tab-atlas .atlas-viewport{
  min-height:calc(100dvh - 154px - env(safe-area-inset-bottom))!important;
  max-height:calc(100dvh - 154px - env(safe-area-inset-bottom))!important;
  border:1px solid #17343d!important;
  border-radius:3px!important;
  background:#02080b!important;
}
#tab-atlas #atlasTiles{filter:saturate(.58) brightness(.63) contrast(1.15)!important}
#tab-atlas .atlas-hint{font-size:6px!important;background:rgba(2,9,12,.88)!important}
#tab-atlas .atlas-panel{border:0!important;background:transparent!important;padding:0!important}
#tab-atlas .atlas-panel + .panel{margin-top:7px!important}

/* MENU: supplied first-level hierarchy, everything else remains under Advanced. */
#moreSheet.more-sheet{padding:calc(12px + env(safe-area-inset-top)) 12px 8px!important}
#moreSheet .more-sheet-head{height:42px!important}
#moreSheet .more-sheet-head b{font-size:17px!important}
#moreSheet .more-list-primary{gap:5px!important}
#moreSheet .more-list-primary>button{
  min-height:48px!important;
  grid-template-columns:28px minmax(0,1fr) 13px!important;
  padding:6px 8px!important;
}
#moreSheet .more-list-primary .danger-mark,
#moreSheet .more-list-primary>button:last-child b{color:var(--r568-red)!important}
#moreSheet .more-advanced{
  margin-top:9px!important;
  border-top:1px solid #102d35!important;
  padding-top:7px!important;
}
#moreSheet .more-advanced summary{
  color:#6f858d!important;
  font-size:6px!important;
  letter-spacing:.6px!important;
  padding:7px 2px!important;
  cursor:pointer!important;
}
#moreSheet .more-list-advanced{margin-top:4px!important;gap:4px!important}
#moreSheet .more-list-advanced>button{min-height:42px!important}
#moreSheet .more-diagnostics{display:none!important}
#moreSheet.more-sheet{
  align-items:flex-start!important;
  justify-content:flex-start!important;
}
body.more-sheet-open .phone.app-shell .tabs.bottom-nav>button.active:not(#moreNavBtn)::after{
  display:none!important;
}
body.more-sheet-open .phone.app-shell .tabs.bottom-nav>button.active:not(#moreNavBtn){
  color:#758991!important;
}
body.more-sheet-open .phone.app-shell #moreNavBtn{
  color:var(--r568-red)!important;
}


/* Keep operational Session dense once the user scrolls from dashboard. */
.session-live-stack .session-world-card,
.session-live-stack .session-npc-card,
.session-live-stack .session-scene-card,
.session-live-stack .session-master-card{margin-bottom:6px!important}

/* Phone-width concept alignment. */
@media(max-width:430px){
  .home-dashboard{padding-left:4px!important;padding-right:4px!important}
  #tab-sheet .sheet-stats{grid-template-columns:repeat(4,minmax(0,1fr))!important}
}
'''
css.write_text(s, encoding="utf-8")

# ---------------------------------------------------------------------------
# Android cache/version.
# ---------------------------------------------------------------------------
s = main_activity.read_text(encoding="utf-8")
s = re.sub(r'index\.html\?build=\d+', 'index.html?build=4168', s)
main_activity.write_text(s, encoding="utf-8")

s = gradle.read_text(encoding="utf-8")
s = re.sub(r'versionCode\s*=\s*\d+', 'versionCode = 4168', s)
s = re.sub(r'versionName\s*=\s*"[^"]+"', 'versionName = "4.1.68"', s)
gradle.write_text(s, encoding="utf-8")

print("R5_68_CONCEPT_STRUCTURE_FIX_APPLIED")
