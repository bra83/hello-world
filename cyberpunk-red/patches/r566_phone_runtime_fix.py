#!/usr/bin/env python3
from pathlib import Path
import re, sys

root=Path(sys.argv[1])
app=root/'app/src/main/assets/web/app'

# ---------- index.html ----------
p=app/'index.html'
s=p.read_text(encoding='utf-8')
s=s.replace(
    '<div class="core-badge" id="coreBadge">GEMINI • VERIFICANDO</div>',
    '<button aria-label="Abrir configuração Gemini" class="core-badge" id="coreBadge" title="Configurar Gemini e voz" type="button">GEMINI • VERIFICANDO</button>'
)
s=re.sub(r'app\.js\?build=\d+','app.js?build=4166',s)
p.write_text(s,encoding='utf-8')

# ---------- app.js ----------
p=app/'app.js'
s=p.read_text(encoding='utf-8')

old="document.querySelector('main')?.scrollIntoView({block:'start'});return true;"
new="const scroller=document.scrollingElement||document.documentElement;scroller.scrollTop=0;document.body.scrollTop=0;requestAnimationFrame(()=>window.scrollTo({top:0,left:0,behavior:'auto'}));return true;"
if old in s:
    s=s.replace(old,new,1)

anchor="bind('#moreNavBtn','click',openMoreSheet);bind('#moreSheetClose','click',closeMoreSheet);"
inject=anchor+"\nbind('#coreBadge','click',()=>{activateTab('audio');requestAnimationFrame(()=>window.scrollTo({top:0,left:0,behavior:'auto'}));});"
if "bind('#coreBadge','click'" not in s:
    if anchor not in s: raise SystemExit('APP_MORE_BIND_ANCHOR_NOT_FOUND')
    s=s.replace(anchor,inject,1)

p.write_text(s,encoding='utf-8')

# ---------- sheets.js ----------
p=app/'sheets.js'
s=p.read_text(encoding='utf-8')
old="importIncomingSceneImage(){const native=globalThis.AndroidScene?.consumeSharedImage;if(!native)return;try{const out=JSON.parse(native());"
new="importIncomingSceneImage(){if(!globalThis.AndroidScene?.consumeSharedImage)return;try{const out=JSON.parse(globalThis.AndroidScene.consumeSharedImage());"
if old not in s:
    raise SystemExit('SHEETS_SHARED_IMAGE_PATTERN_NOT_FOUND')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')

# ---------- CSS ----------
p=app/'interface_v2.css'
s=p.read_text(encoding='utf-8')
addon=r'''

/* ============================================================
   R5.66 — PHYSICAL PHONE INTERACTION FIX
   Real vertical scrolling, Gemini status opens settings,
   denser Session without hiding game information.
   ============================================================ */
html,body{
  width:100%!important;
  min-height:100%!important;
  height:auto!important;
  max-height:none!important;
  overflow-x:hidden!important;
  overflow-y:auto!important;
  overscroll-behavior-x:none!important;
  overscroll-behavior-y:auto!important;
  touch-action:pan-y!important;
  -webkit-overflow-scrolling:touch!important;
}
body{
  position:static!important;
  min-height:100dvh!important;
}
.phone.app-shell{
  position:relative!important;
  height:auto!important;
  max-height:none!important;
  min-height:100dvh!important;
  overflow:visible!important;
  touch-action:pan-y!important;
}
main,
.tab.active,
.session-screen{
  position:relative!important;
  height:auto!important;
  max-height:none!important;
  overflow:visible!important;
  touch-action:pan-y!important;
}
main{padding-bottom:calc(66px + env(safe-area-inset-bottom))!important}
.session-screen>section{overflow:visible!important}
.scene-media-frame,.scene-person-avatar{overflow:hidden!important}
.scene-npc-strip{touch-action:pan-x pan-y!important}
.atlas-viewport{touch-action:none!important}

/* Gemini status is an actual control, but visually remains a status chip. */
#coreBadge{
  appearance:none!important;
  -webkit-appearance:none!important;
  cursor:pointer!important;
  font-family:inherit!important;
  text-align:center!important;
}
#coreBadge:active{transform:scale(.97)!important}

/* Session density: details belong to MUNDO; Session shows only what matters now. */
.session-world-card{padding:7px!important}
.session-world-card .section-kicker{padding:3px 4px 6px!important;margin:0!important}
.session-world-card .world-pulse-text{display:none!important}
.session-world-card .world-now-grid{gap:3px!important}
.session-world-card .world-now-grid>div{min-height:31px!important;padding:4px 6px!important}
.session-world-card .world-now-line{margin:4px 3px 0!important}
.session-npc-card{min-height:0!important;padding:7px!important}
.session-npc-card .section-kicker{padding:3px 4px 6px!important;margin:0!important}
.session-npc-card:has(.empty-inline){padding-bottom:5px!important}
.session-npc-card:has(.empty-inline) .scene-npc-strip{min-height:18px!important}
.session-npc-card .empty-inline{padding:2px 3px!important}

/* Empty scene media must not consume half a phone screen. An actual image remains 16:9. */
.session-scene-card:has(#sceneIllustration.hidden) .scene-media-frame{
  min-height:76px!important;
  height:76px!important;
  max-height:76px!important;
}
.session-scene-card:has(#sceneIllustration.hidden) .scene-illustration-empty{
  min-height:76px!important;
  height:76px!important;
  max-height:76px!important;
}
.session-scene-card:has(#sceneIllustration:not(.hidden)) .scene-media-frame{
  min-height:0!important;
  height:auto!important;
  max-height:none!important;
  aspect-ratio:16/9!important;
}
.session-scene-card:has(#sceneIllustration:not(.hidden)) .scene-illustration{
  width:100%!important;
  height:100%!important;
  min-height:0!important;
  max-height:none!important;
  object-fit:cover!important;
}
.scene-media-actions{grid-template-columns:repeat(3,minmax(0,1fr))!important}
.scene-media-actions button{white-space:nowrap!important}
.session-master-card{margin-bottom:8px!important}
.master-narrative{min-height:0!important}

/* Secondary configuration screens must also scroll under the fixed bottom navigation. */
#tab-audio,#tab-library,#tab-inventory,#tab-sheet,#tab-game,#tab-stories,#tab-vehicle,#tab-combat,#tab-net{
  padding-bottom:18px!important;
  overflow:visible!important;
}
.more-sheet{
  overscroll-behavior-y:contain!important;
  touch-action:pan-y!important;
  -webkit-overflow-scrolling:touch!important;
}
'''
if 'R5.66 — PHYSICAL PHONE INTERACTION FIX' not in s:
    s += addon
p.write_text(s,encoding='utf-8')

# ---------- MainActivity ----------
p=root/'app/src/main/java/com/braseiro/cyberpunkred/MainActivity.kt'
s=p.read_text(encoding='utf-8')
s=re.sub(r'index\.html\?build=\d+','index.html?build=4166',s)
p.write_text(s,encoding='utf-8')

# ---------- Android version ----------
p=root/'app/build.gradle.kts'
s=p.read_text(encoding='utf-8')
s=re.sub(r'versionCode\s*=\s*\d+','versionCode = 4166',s)
s=re.sub(r'versionName\s*=\s*"[^"]+"','versionName = "4.1.66"',s)
p.write_text(s,encoding='utf-8')

print('R5_66_PHONE_RUNTIME_FIX_APPLIED')
