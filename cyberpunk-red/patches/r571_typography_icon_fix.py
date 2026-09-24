#!/usr/bin/env python3
from pathlib import Path
import re, sys

if len(sys.argv) != 2:
    raise SystemExit("usage: r571_typography_icon_fix.py <android-root>")

root = Path(sys.argv[1])
app = root / "app/src/main/assets/web/app"
index = app / "index.html"
css = app / "interface_v2.css"
main_activity = root / "app/src/main/java/com/braseiro/cyberpunkred/MainActivity.kt"
gradle = root / "app/build.gradle.kts"

for p in (index, css, main_activity, gradle):
    if not p.is_file():
        raise SystemExit(f"missing required file: {p}")

s = index.read_text(encoding="utf-8")
s = re.sub(r'app\.js\?build=\d+', 'app.js?build=4171', s)
index.write_text(s, encoding="utf-8")

s = css.read_text(encoding="utf-8")
if "R5.71 — TYPOGRAPHY AND ICON PASS" not in s:
    s += r'''

/* ============================================================
   R5.71 — TYPOGRAPHY AND ICON PASS
   Preserve R5.70 composition; raise visual weight to concept scale.
   ============================================================ */

/* Home */
body[data-active-tab="table"] .brand-lockup strong{
  font-size:34px!important;
  letter-spacing:-1.7px!important;
}
body[data-active-tab="table"] .brand-lockup strong b{
  font-size:.8em!important;
  letter-spacing:6px!important;
}
body[data-active-tab="table"] .brand-lockup span{
  font-size:8px!important;
}
.home-tagline{
  font-size:10px!important;
  font-weight:700!important;
}
.home-card .home-icon{
  width:48px!important;
  height:48px!important;
  font-size:25px!important;
  font-weight:900!important;
}
.home-card.home-primary .home-icon{
  font-size:35px!important;
}
.home-card b{
  font-size:14px!important;
  letter-spacing:.2px!important;
}
.home-card small{
  font-size:9.5px!important;
}
.home-card i{
  font-size:25px!important;
  font-weight:900!important;
}
.home-quote{
  font-size:9.5px!important;
  letter-spacing:.2px!important;
}
.home-quote small{
  font-size:7.6px!important;
}

/* Main nav */
.phone.app-shell .tabs.bottom-nav>button{
  font-size:7.6px!important;
  font-weight:800!important;
}
.phone.app-shell .tabs.bottom-nav .nav-glyph{
  font-size:18px!important;
  line-height:19px!important;
  font-weight:900!important;
}

/* Screen headings / subtabs */
#tab-sheet::before,
#tab-atlas::before,
#tab-inventory::before{
  font-size:27px!important;
  font-weight:900!important;
}
body:not(:has(#tab-combat.active)) .concept-subtabs>button{
  font-size:8.4px!important;
  font-weight:800!important;
}

/* Sheet */
#tab-sheet .sheet-identity small{
  font-size:8.5px!important;
  font-weight:700!important;
}
#tab-sheet .sheet-identity h1{
  font-size:24px!important;
  font-weight:900!important;
}
#tab-sheet .sheet-identity b{
  font-size:10px!important;
}
#tab-sheet .panel>.panel-title{
  font-size:8.5px!important;
  font-weight:900!important;
}
#tab-sheet .sheet-stats small{
  font-size:8.2px!important;
  font-weight:800!important;
}
#tab-sheet .sheet-stats b{
  font-size:23px!important;
  font-weight:900!important;
}
#tab-sheet>.sheet-vitals-relocated small{
  font-size:8.1px!important;
  font-weight:800!important;
}
#tab-sheet>.sheet-vitals-relocated b{
  font-size:11.5px!important;
  font-weight:900!important;
}
#tab-sheet .role-summary{
  font-size:9.2px!important;
}
#tab-sheet .role-allocation span{
  font-size:7.8px!important;
  font-weight:700!important;
}
#tab-sheet .role-ability-panel button{
  font-size:8px!important;
  font-weight:900!important;
}
#tab-sheet .role-hint{
  font-size:7.4px!important;
}

/* Map */
#tab-atlas .atlas-toolbar button,
#tab-atlas .atlas-toolbar select{
  font-size:7px!important;
  font-weight:800!important;
}
#tab-atlas .atlas-hint{
  font-size:7px!important;
  font-weight:700!important;
}
#tab-atlas .atlas-token{
  width:56px!important;
  height:56px!important;
}

/* Inventory */
#tab-inventory .equipment-card h3,
#tab-inventory .equipment-row h3,
#tab-inventory .inventory-item h3,
#tab-inventory .equipment-card b,
#tab-inventory .equipment-row b,
#tab-inventory .inventory-item b{
  font-size:10px!important;
  font-weight:900!important;
}
#tab-inventory .equipment-card p,
#tab-inventory .equipment-row p,
#tab-inventory .inventory-item p,
#tab-inventory .equipment-card small,
#tab-inventory .equipment-row small,
#tab-inventory .inventory-item small{
  font-size:7.8px!important;
}

/* Menu */
#moreSheet .more-sheet-head b{
  font-size:29px!important;
  font-weight:900!important;
}
#moreSheet .more-mark{
  font-size:27px!important;
  font-weight:900!important;
}
#moreSheet .more-list-primary b{
  font-size:13px!important;
  font-weight:900!important;
}
#moreSheet .more-list-primary small{
  font-size:9px!important;
}
#moreSheet .more-list-primary i{
  font-size:24px!important;
  font-weight:900!important;
}
#moreSheet .more-advanced summary{
  font-size:7.4px!important;
  font-weight:800!important;
}

@media(max-width:430px){
  .home-card b{font-size:13.5px!important}
  .home-card small{font-size:9.2px!important}
  #moreSheet .more-list-primary b{font-size:12.5px!important}
}
'''
css.write_text(s, encoding="utf-8")

s = main_activity.read_text(encoding="utf-8")
s = re.sub(r'index\.html\?build=\d+', 'index.html?build=4171', s)
main_activity.write_text(s, encoding="utf-8")

s = gradle.read_text(encoding="utf-8")
s = re.sub(r'versionCode\s*=\s*\d+', 'versionCode = 4171', s)
s = re.sub(r'versionName\s*=\s*"[^"]+"', 'versionName = "4.1.71"', s)
gradle.write_text(s, encoding="utf-8")

print("R5_71_TYPOGRAPHY_ICON_FIX_APPLIED")
