#!/usr/bin/env python3
from pathlib import Path
import re, sys

if len(sys.argv)!=2:
    raise SystemExit("usage: r570_visual_composition_fix.py <android-root>")

root=Path(sys.argv[1])
app=root/"app/src/main/assets/web/app"
index=app/"index.html"
appjs=app/"app.js"
css=app/"interface_v2.css"
main_activity=root/"app/src/main/java/com/braseiro/cyberpunkred/MainActivity.kt"
gradle=root/"app/build.gradle.kts"

for p in (index,appjs,css,main_activity,gradle):
    if not p.is_file():
        raise SystemExit(f"missing required file: {p}")

s=index.read_text(encoding="utf-8")
s=re.sub(r'app\.js\?build=\d+','app.js?build=4170',s)
index.write_text(s,encoding="utf-8")

s=appjs.read_text(encoding="utf-8")
anchor="new MutationObserver(syncHomeMeta).observe($('#tab-table')||document.body,{subtree:true,childList:true,characterData:true});"
inject=r'''
const relocateSheetVitals=()=>{
  const vitals=$('#sheetVitals'),stats=$('#sheetStats')?.closest('.panel');
  if(!vitals||!stats||vitals.dataset.r570Relocated==='1')return;
  stats.insertAdjacentElement('afterend',vitals);
  vitals.dataset.r570Relocated='1';
  vitals.classList.add('sheet-vitals-relocated');
};
relocateSheetVitals();
document.addEventListener('barbara:character-restored',()=>requestAnimationFrame(relocateSheetVitals));
'''
if "sheet-vitals-relocated" not in s:
    if anchor not in s: raise SystemExit("R570_APP_ANCHOR_NOT_FOUND")
    s=s.replace(anchor,anchor+"\n"+inject,1)
appjs.write_text(s,encoding="utf-8")

s=css.read_text(encoding="utf-8")
if "R5.70 — CONCEPT COMPOSITION PASS" not in s:
    s+=r'''

/* ============================================================
   R5.70 — CONCEPT COMPOSITION PASS
   Structural visual correction against supplied target screens.
   No mechanics removed; Sheet vitals are relocated, not hidden.
   ============================================================ */

/* ---------------- HOME / BRAND ---------------- */
body[data-active-tab="table"] .app-header{
  min-height:126px!important;
  padding:20px 16px 11px!important;
  align-items:flex-start!important;
}
body[data-active-tab="table"] .brand-lockup{
  width:100%!important;
  position:relative!important;
  display:block!important;
}
body[data-active-tab="table"] .brand-lockup strong{
  display:block!important;
  width:max-content!important;
  font-size:31px!important;
  line-height:.82!important;
  letter-spacing:-1.5px!important;
  white-space:normal!important;
}
body[data-active-tab="table"] .brand-lockup strong b{
  display:block!important;
  width:max-content!important;
  margin-top:8px!important;
  font-size:.76em!important;
  letter-spacing:5px!important;
  font-style:normal!important;
}
body[data-active-tab="table"] .brand-lockup span{
  position:absolute!important;
  right:0!important;
  top:10px!important;
  margin:0!important;
  font-size:7.2px!important;
  letter-spacing:1.5px!important;
  text-align:right!important;
}
.home-dashboard{
  min-height:calc(100dvh - 185px - env(safe-area-inset-bottom))!important;
  padding:9px 7px 21px!important;
}
.home-tagline{
  margin:0 5px 19px!important;
  font-size:9px!important;
  line-height:1.35!important;
  letter-spacing:.55px!important;
}
.home-actions{gap:8px!important}
body:not(:has(#tab-combat.active)) .phone.app-shell .home-card{
  min-height:82px!important;
  grid-template-columns:48px minmax(0,1fr) 18px!important;
  gap:11px!important;
  padding:10px 12px!important;
  border-radius:6px!important;
}
body:not(:has(#tab-combat.active)) .phone.app-shell .home-card.home-primary{
  min-height:91px!important;
  border-width:2px!important;
  box-shadow:0 0 18px rgba(255,33,66,.38),inset 0 0 18px rgba(255,33,66,.09)!important;
}
.home-card .home-icon{
  width:44px!important;
  height:44px!important;
  font-size:22px!important;
  border-radius:5px!important;
}
.home-card.home-primary .home-icon{font-size:32px!important}
.home-card b{
  font-size:13px!important;
  line-height:1.08!important;
}
.home-card small{
  margin-top:5px!important;
  font-size:9px!important;
  line-height:1.2!important;
}
.home-card i{font-size:22px!important}
.home-quote{
  padding-top:20px!important;
  font-size:8.8px!important;
}
.home-quote small{font-size:7px!important}
.session-live-stack{margin-top:28px!important}

/* ---------------- FICHA ---------------- */
#tab-sheet::before{
  font-size:24px!important;
  margin:12px 3px 12px!important;
}
#tab-sheet .sheet-concept-subtabs{margin-bottom:10px!important}
body:not(:has(#tab-combat.active)) #tab-sheet .concept-subtabs>button{
  height:40px!important;
  min-height:40px!important;
  font-size:7.8px!important;
}
#tab-sheet .sheet-identity{
  min-height:190px!important;
  grid-template-columns:minmax(0,1fr) 124px!important;
  gap:13px!important;
  padding:15px!important;
}
#tab-sheet .sheet-identity>img{
  width:114px!important;
  height:114px!important;
  border-width:3px!important;
}
#tab-sheet .sheet-identity>div{align-self:center!important}
#tab-sheet .sheet-identity small{font-size:7.8px!important}
#tab-sheet .sheet-identity h1{
  font-size:22px!important;
  margin:7px 0!important;
}
#tab-sheet .sheet-identity b{font-size:9px!important}
#tab-sheet .sheet-identity .sheet-vitals{display:none!important}

/* The same vitals node is moved after attributes; no data is removed. */
#tab-sheet>.sheet-vitals-relocated{
  display:grid!important;
  grid-template-columns:1fr!important;
  gap:5px!important;
  margin:-1px 0 9px!important;
  padding:8px!important;
  background:#050d11!important;
  border:1px solid #16323a!important;
  border-radius:5px!important;
}
#tab-sheet>.sheet-vitals-relocated>div{
  position:relative!important;
  min-height:33px!important;
  display:flex!important;
  align-items:center!important;
  justify-content:space-between!important;
  padding:4px 8px 8px!important;
  border:0!important;
  border-radius:0!important;
  background:transparent!important;
  overflow:hidden!important;
}
#tab-sheet>.sheet-vitals-relocated>div::after{
  content:""!important;
  position:absolute!important;
  left:8px!important;right:8px!important;bottom:2px!important;
  height:4px!important;
  background:#12cfea!important;
  border-radius:3px!important;
  opacity:.78!important;
}
#tab-sheet>.sheet-vitals-relocated>div:first-child::after{background:#ff2142!important}
#tab-sheet>.sheet-vitals-relocated small{font-size:7.5px!important}
#tab-sheet>.sheet-vitals-relocated b{font-size:10px!important}

#tab-sheet .panel>.panel-title{
  min-height:36px!important;
  padding:8px 10px!important;
  font-size:7.6px!important;
}
#tab-sheet .sheet-stats{
  grid-template-columns:repeat(5,minmax(0,1fr))!important;
  gap:6px!important;
  padding:9px!important;
}
#tab-sheet .sheet-stats>div{
  min-height:69px!important;
  padding:8px 4px!important;
}
#tab-sheet .sheet-stats small{font-size:7.5px!important}
#tab-sheet .sheet-stats b{font-size:21px!important}
#tab-sheet .role-summary{font-size:8.6px!important}
#tab-sheet .role-allocation label{min-height:43px!important}
#tab-sheet .role-allocation span{font-size:7.1px!important}
#tab-sheet .role-ability-panel button{min-height:38px!important;font-size:7.2px!important}
#tab-sheet .role-hint{font-size:6.9px!important}

/* ---------------- MENU ---------------- */
#moreSheet.more-sheet{
  padding:calc(20px + env(safe-area-inset-top)) 13px 11px!important;
}
#moreSheet .more-sheet-head{
  height:58px!important;
  padding:0 3px 11px!important;
}
#moreSheet .more-sheet-head b{
  font-size:26px!important;
}
#moreSheet .more-list-primary{gap:8px!important}
#moreSheet .more-list-primary>button{
  min-height:78px!important;
  grid-template-columns:46px minmax(0,1fr) 18px!important;
  gap:11px!important;
  padding:10px 11px!important;
  border-radius:6px!important;
}
#moreSheet .more-mark{font-size:23px!important}
#moreSheet .more-list-primary b{font-size:12px!important}
#moreSheet .more-list-primary small{
  margin-top:4px!important;
  font-size:8.5px!important;
}
#moreSheet .more-list-primary i{font-size:21px!important}
#moreSheet .more-advanced{margin-top:22px!important}
#moreSheet .more-sheet-card.app-more-card::after{
  margin:22px 0 8px!important;
  font-size:7px!important;
}

/* ---------------- MAP ---------------- */
#tab-atlas::before{
  font-size:24px!important;
  margin:12px 3px 12px!important;
}
body:not(:has(#tab-combat.active)) #tab-atlas .concept-subtabs>button{
  height:40px!important;
  min-height:40px!important;
  font-size:7.5px!important;
}
#tab-atlas #atlasTiles{
  filter:grayscale(.35) saturate(.55) brightness(.48) contrast(1.28)!important;
}
#tab-atlas .atlas-viewport{
  min-height:calc(100dvh - 190px - env(safe-area-inset-bottom))!important;
  max-height:calc(100dvh - 190px - env(safe-area-inset-bottom))!important;
  border-color:#5f1824!important;
}
#tab-atlas .atlas-token{
  width:52px!important;
  height:52px!important;
  border:2px solid #18d9f3!important;
  border-radius:50%!important;
}

/* ---------------- INVENTORY ---------------- */
#tab-inventory::before{
  font-size:24px!important;
  margin:12px 3px 12px!important;
}
#tab-inventory .equipment-card,
#tab-inventory .equipment-row,
#tab-inventory .inventory-item{
  min-height:78px!important;
  grid-template-columns:62px minmax(0,1fr) auto!important;
}
#tab-inventory .equipment-card img,
#tab-inventory .equipment-row img,
#tab-inventory .inventory-item img{
  width:58px!important;
  height:58px!important;
}

@media(max-width:430px){
  body[data-active-tab="table"] .brand-lockup strong{font-size:30px!important}
  .home-card b{font-size:12.5px!important}
  .home-card small{font-size:8.6px!important}
  #tab-sheet .sheet-identity{grid-template-columns:minmax(0,1fr) 118px!important}
  #tab-sheet .sheet-identity>img{width:108px!important;height:108px!important}
}
'''
css.write_text(s,encoding="utf-8")

s=main_activity.read_text(encoding="utf-8")
s=re.sub(r'index\.html\?build=\d+','index.html?build=4170',s)
main_activity.write_text(s,encoding="utf-8")

s=gradle.read_text(encoding="utf-8")
s=re.sub(r'versionCode\s*=\s*\d+','versionCode = 4170',s)
s=re.sub(r'versionName\s*=\s*"[^"]+"','versionName = "4.1.70"',s)
gradle.write_text(s,encoding="utf-8")

print("R5_70_VISUAL_COMPOSITION_FIX_APPLIED")
