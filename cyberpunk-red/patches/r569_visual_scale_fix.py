#!/usr/bin/env python3
from pathlib import Path
import re, sys

if len(sys.argv) != 2:
    raise SystemExit("usage: r569_visual_scale_fix.py <android-root>")

root = Path(sys.argv[1])
app = root / "app/src/main/assets/web/app"
index = app / "index.html"
css = app / "interface_v2.css"
main_activity = root / "app/src/main/java/com/braseiro/cyberpunkred/MainActivity.kt"
gradle = root / "app/build.gradle.kts"

for p in (index, css, main_activity, gradle):
    if not p.is_file():
        raise SystemExit(f"missing required file: {p}")

# Menu title follows the supplied concept wording.
s = index.read_text(encoding="utf-8")
s = s.replace('<div class="more-sheet-head"><div><small>NIGHT CITY</small><b>MAIS</b></div>',
              '<div class="more-sheet-head"><div><small>NIGHT CITY</small><b>MENU</b></div>', 1)
s = s.replace('<b>INÍCIO</b><small>Voltar ao painel principal</small>',
              '<b>SAIR</b><small>Voltar ao painel principal</small>', 1)
s = re.sub(r'app\.js\?build=\d+', 'app.js?build=4169', s)
index.write_text(s, encoding="utf-8")

s = css.read_text(encoding="utf-8")
if "R5.69 — VISUAL SCALE AND DENSITY PASS" not in s:
    s += r'''

/* ============================================================
   R5.69 — VISUAL SCALE AND DENSITY PASS
   Preserve mechanics; make the actual phone composition match
   the supplied concepts at the same visual scale.
   ============================================================ */

/* ---------- INÍCIO ---------- */
body[data-active-tab="table"] .app-header{
  min-height:98px!important;
  padding:20px 15px 10px!important;
}
body[data-active-tab="table"] .brand-lockup strong{
  font-size:26px!important;
  line-height:.92!important;
  letter-spacing:-1.2px!important;
}
body[data-active-tab="table"] .brand-lockup span{
  margin-top:5px!important;
  font-size:7px!important;
  letter-spacing:2.4px!important;
}
.home-dashboard{
  min-height:calc(100dvh - 154px - env(safe-area-inset-bottom))!important;
  padding:7px 7px 17px!important;
}
.home-tagline{
  margin:1px 4px 16px!important;
  font-size:8px!important;
  line-height:1.4!important;
  letter-spacing:.5px!important;
}
.home-actions{gap:7px!important}
body:not(:has(#tab-combat.active)) .phone.app-shell .home-card{
  min-height:66px!important;
  grid-template-columns:40px minmax(0,1fr) 17px!important;
  gap:10px!important;
  padding:8px 11px!important;
  border-radius:5px!important;
}
body:not(:has(#tab-combat.active)) .phone.app-shell .home-card.home-primary{
  min-height:74px!important;
  border-width:1.5px!important;
  box-shadow:0 0 14px rgba(255,33,66,.34),inset 0 0 15px rgba(255,33,66,.08)!important;
}
.home-card .home-icon{
  width:36px!important;
  height:36px!important;
  font-size:18px!important;
  border-radius:4px!important;
}
.home-card.home-primary .home-icon{font-size:27px!important}
.home-card b{
  font-size:10.5px!important;
  line-height:1.1!important;
  letter-spacing:.1px!important;
}
.home-card small{
  margin-top:4px!important;
  font-size:7.5px!important;
  line-height:1.22!important;
}
.home-card i{font-size:20px!important}
.home-quote{
  padding-top:18px!important;
  font-size:7.5px!important;
  line-height:1.35!important;
}
.home-quote small{font-size:6.3px!important}

/* ---------- PRIMARY NAV ---------- */
.phone.app-shell .tabs.bottom-nav{
  height:60px!important;
  min-height:60px!important;
  padding-bottom:calc(3px + env(safe-area-inset-bottom))!important;
}
.phone.app-shell .tabs.bottom-nav>button{
  height:52px!important;
  min-height:52px!important;
  font-size:6.8px!important;
  gap:3px!important;
}
.phone.app-shell .tabs.bottom-nav .nav-glyph{
  font-size:15px!important;
  line-height:16px!important;
}

/* ---------- SCREEN TITLES / SUBTABS ---------- */
#tab-sheet::before,
#tab-atlas::before,
#tab-inventory::before{
  font-size:21px!important;
  line-height:1!important;
  margin:10px 3px 10px!important;
  letter-spacing:-.4px!important;
}
.concept-subtabs{
  gap:4px!important;
  margin-bottom:8px!important;
}
body:not(:has(#tab-combat.active)) .concept-subtabs>button{
  height:34px!important;
  min-height:34px!important;
  font-size:6.9px!important;
  border-radius:4px!important;
}

/* ---------- FICHA ---------- */
#tab-sheet .sheet-identity{
  min-height:148px!important;
  grid-template-columns:minmax(0,1fr) 110px!important;
  gap:10px!important;
  padding:12px!important;
  border-radius:5px!important;
}
#tab-sheet .sheet-identity>img{
  width:100px!important;
  height:100px!important;
  border-width:2px!important;
  box-shadow:0 0 14px rgba(255,33,66,.18)!important;
}
#tab-sheet .sheet-identity small{font-size:6.8px!important}
#tab-sheet .sheet-identity h1{
  font-size:18px!important;
  line-height:1!important;
  margin:5px 0!important;
}
#tab-sheet .sheet-identity b{font-size:7.8px!important}
#tab-sheet .sheet-identity .sheet-vitals{
  gap:5px!important;
  margin-top:9px!important;
}
#tab-sheet .sheet-vitals>div{
  min-height:40px!important;
  padding:6px 8px!important;
}
#tab-sheet .sheet-vitals small{font-size:6.2px!important}
#tab-sheet .sheet-vitals b{font-size:11px!important}
#tab-sheet .panel>.panel-title{
  min-height:31px!important;
  padding:7px 9px!important;
  font-size:7px!important;
}
#tab-sheet .sheet-stats{
  grid-template-columns:repeat(5,minmax(0,1fr))!important;
  gap:5px!important;
  padding:8px!important;
}
#tab-sheet .sheet-stats>div{
  min-height:58px!important;
  padding:7px 4px!important;
  border-radius:5px!important;
}
#tab-sheet .sheet-stats small{font-size:6.7px!important}
#tab-sheet .sheet-stats b{
  font-size:18px!important;
  line-height:1.05!important;
}
#tab-sheet .role-summary{
  font-size:8px!important;
  line-height:1.45!important;
}
#tab-sheet .role-allocation{gap:5px!important}
#tab-sheet .role-allocation label{
  min-height:38px!important;
  padding:5px 7px!important;
}
#tab-sheet .role-allocation span{font-size:6.7px!important}
#tab-sheet .role-allocation input{font-size:8px!important}
#tab-sheet .role-ability-panel button{
  min-height:34px!important;
  font-size:6.8px!important;
}
#tab-sheet .role-hint{font-size:6.5px!important;line-height:1.35!important}

/* ---------- MAPA ---------- */
#tab-atlas .map-concept-subtabs{margin-bottom:7px!important}
#tab-atlas .atlas-toolbar{
  min-height:34px!important;
  gap:4px!important;
  padding:5px!important;
}
#tab-atlas .atlas-toolbar button,
#tab-atlas .atlas-toolbar select{
  height:30px!important;
  min-height:30px!important;
  font-size:6.2px!important;
}
#tab-atlas .atlas-viewport{
  min-height:calc(100dvh - 176px - env(safe-area-inset-bottom))!important;
  max-height:calc(100dvh - 176px - env(safe-area-inset-bottom))!important;
}
#tab-atlas .atlas-district-labels{font-size:7px!important}
#tab-atlas .atlas-token{
  width:46px!important;
  height:46px!important;
  filter:drop-shadow(0 0 8px rgba(24,217,243,.65))!important;
}

/* ---------- MOCHILA ---------- */
#tab-inventory .equipment-list{gap:7px!important;padding:7px 2px!important}
#tab-inventory .equipment-card,
#tab-inventory .equipment-row,
#tab-inventory .inventory-item{
  min-height:68px!important;
  grid-template-columns:56px minmax(0,1fr) auto!important;
  gap:10px!important;
  padding:7px 9px!important;
}
#tab-inventory .equipment-card img,
#tab-inventory .equipment-row img,
#tab-inventory .inventory-item img{
  width:52px!important;
  height:52px!important;
}
#tab-inventory .equipment-card h3,
#tab-inventory .equipment-row h3,
#tab-inventory .inventory-item h3,
#tab-inventory .equipment-card b,
#tab-inventory .equipment-row b,
#tab-inventory .inventory-item b{font-size:8.8px!important}
#tab-inventory .equipment-card p,
#tab-inventory .equipment-row p,
#tab-inventory .inventory-item p,
#tab-inventory .equipment-card small,
#tab-inventory .equipment-row small,
#tab-inventory .inventory-item small{font-size:6.8px!important}

/* ---------- MENU ---------- */
#moreSheet.more-sheet{
  padding:calc(18px + env(safe-area-inset-top)) 13px 10px!important;
}
#moreSheet .more-sheet-head{
  height:52px!important;
  padding:0 2px 10px!important;
  align-items:flex-end!important;
}
#moreSheet .more-sheet-head b{
  font-size:22px!important;
  line-height:1!important;
  letter-spacing:-.5px!important;
}
#moreSheet .more-list-primary{gap:7px!important}
#moreSheet .more-list-primary>button{
  min-height:58px!important;
  grid-template-columns:38px minmax(0,1fr) 16px!important;
  gap:9px!important;
  padding:8px 10px!important;
  border-radius:5px!important;
}
#moreSheet .more-mark{
  font-size:19px!important;
}
#moreSheet .more-list-primary b{
  font-size:9.4px!important;
  line-height:1.1!important;
}
#moreSheet .more-list-primary small{
  margin-top:3px!important;
  font-size:7px!important;
  line-height:1.25!important;
}
#moreSheet .more-list-primary i{
  font-size:18px!important;
}
#moreSheet .more-advanced{
  margin-top:12px!important;
  padding-top:9px!important;
}
#moreSheet .more-advanced summary{
  padding:8px 2px!important;
  font-size:6.5px!important;
}
#moreSheet .more-list-advanced>button{
  min-height:48px!important;
}
#moreSheet .more-sheet-card.app-more-card::after{
  content:'NIGHT CITY NEVER SLEEPS.';
  display:block;
  margin:18px 0 4px;
  text-align:center;
  color:#526971;
  font-size:6px;
  letter-spacing:.45px;
}

/* Android 415-ish phone widths: keep large concept scale without clipping. */
@media(max-width:430px){
  .home-card b{font-size:10px!important}
  .home-card small{font-size:7.2px!important}
  #tab-sheet .sheet-identity{grid-template-columns:minmax(0,1fr) 104px!important}
  #tab-sheet .sheet-identity>img{width:94px!important;height:94px!important}
}
'''
css.write_text(s, encoding="utf-8")

s = main_activity.read_text(encoding="utf-8")
s = re.sub(r'index\.html\?build=\d+', 'index.html?build=4169', s)
main_activity.write_text(s, encoding="utf-8")

s = gradle.read_text(encoding="utf-8")
s = re.sub(r'versionCode\s*=\s*\d+', 'versionCode = 4169', s)
s = re.sub(r'versionName\s*=\s*"[^"]+"', 'versionName = "4.1.69"', s)
gradle.write_text(s, encoding="utf-8")

print("R5_69_VISUAL_SCALE_FIX_APPLIED")
