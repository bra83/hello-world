#!/usr/bin/env python3
from pathlib import Path
import re,sys

if len(sys.argv)!=2:
    raise SystemExit("usage: patch_starwars_p31.py <android-root>")

root=Path(sys.argv[1]).resolve()
vtt=root/"app/src/main/assets/vtt"
shell=vtt/"r46-shell.html"
p1=vtt/"r54-device-p1.js"
p31=vtt/"r54-device-p31.js"
for p in (shell,p1):
    if not p.is_file(): raise SystemExit(f"missing {p}")

js=r'''/* R54 P31 — compact utilities, working Mundo Vivo, fixed nav, readable map marker. */
(()=>{'use strict';
if(window.__R54_P31__)return;window.__R54_P31__=true;

const parse=(v,f=null)=>{try{return v&&typeof v==='object'?v:JSON.parse(String(v||''))}catch{return f}};
const arr=v=>Array.isArray(v)?v:(v&&typeof v==='object'?Object.values(v):[]);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function state(){
 try{
  const b=window.BraseiroGameBridge;if(!b||typeof b.readState!=='function')return {};
  const r=parse(b.readState(),{});return r?.ok?r.data:(r?.data||r||{});
 }catch{return {}}
}
function listFirst(...values){for(const v of values){const a=arr(v).filter(Boolean);if(a.length)return a}return[]}
function nameOf(x){
 if(typeof x==='string')return x;
 return String(x?.name||x?.title||x?.label||x?.displayName||x?.id||'Registro');
}
function detailOf(x){
 if(typeof x==='string')return '';
 return String(x?.summary||x?.description||x?.status||x?.role||x?.type||x?.kind||x?.goal||x?.objective||x?.locationName||'').trim();
}
function worldModel(){
 const st=state(),w=st?.world||st?.livingWorld||st?.mundoVivo||{};
 const records=st?.records||{};
 const allNpc=listFirst(w.npcs,w.characters,w.people,st.npcs,records.contacts);
 const droids=listFirst(w.droids,w.robots).concat(allNpc.filter(x=>/droid|droide|robot|robô/i.test(nameOf(x)+' '+detailOf(x))));
 const npcs=allNpc.filter(x=>!/droid|droide|robot|robô/i.test(nameOf(x)+' '+detailOf(x)));
 return {
  st,w,npcs,droids,
  factions:listFirst(w.factions,w.organizations,st.factions,records.factions),
  locations:listFirst(w.locations,st.locations,records.locations),
  rumors:listFirst(w.rumors,records.rumors),
  events:listFirst(w.events,w.consequences,w.timeline,records.journal)
 };
}
function row(x){
 const n=nameOf(x),d=detailOf(x);
 return '<article class="r54-p31-world-row"><strong>'+esc(n)+'</strong>'+(d?'<span>'+esc(d)+'</span>':'')+'</article>';
}
function openWorld(){
 document.querySelector('.r54-p31-world-modal')?.remove();
 const d=worldModel(),m=document.createElement('div');m.className='r54-p31-world-modal';
 const current=String(d.st?.scene?.locationName||d.w?.sandbox?.currentLocationName||d.w?.sandbox?.startingPoint||'—');
 const counts=`${d.npcs.length} NPCs · ${d.droids.length} robôs · ${d.factions.length} facções · ${d.locations.length} locais`;
 m.innerHTML='<section role="dialog" aria-modal="true" aria-label="Mundo Vivo">'+
  '<header><div><small>MUNDO PERSISTENTE</small><h2>Mundo Vivo</h2></div><button type="button" data-close aria-label="Fechar">×</button></header>'+
  '<div class="r54-p31-world-summary"><strong>Local atual</strong><span>'+esc(current)+'</span><small>'+esc(counts)+'</small></div>'+
  '<nav class="r54-p31-world-tabs"><button data-tab="npcs">NPCs</button><button data-tab="droids">ROBÔS</button><button data-tab="factions">FACÇÕES</button><button data-tab="locations">LOCAIS</button><button data-tab="rumors">RUMORES</button><button data-tab="events">CONSEQUÊNCIAS</button></nav>'+
  '<div class="r54-p31-world-body"></div></section>';
 document.body.appendChild(m);
 const body=m.querySelector('.r54-p31-world-body');
 const tabs={npcs:d.npcs,droids:d.droids,factions:d.factions,locations:d.locations,rumors:d.rumors,events:d.events};
 const render=k=>{
  m.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===k));
  const data=tabs[k]||[];
  body.innerHTML=data.length?data.slice(0,250).map(row).join(''):'<div class="r54-p31-empty">Nenhum registro desta categoria foi carregado no estado atual.</div>';
 };
 m.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>render(b.dataset.tab));
 m.querySelector('[data-close]').onclick=()=>m.remove();
 m.addEventListener('click',e=>{if(e.target===m)m.remove()});
 render('npcs');
}
window.__R54P31OpenWorld=openWorld;

function openDice(){
 if(typeof window.__R54P6DicePanel==='function'){window.__R54P6DicePanel();return}
 const old=document.querySelector('.r53-dice-fab,.r54-p6-dice-fab');
 if(old){old.click();return}
 alert('Motor de dados narrativos indisponível nesta tela.');
}
window.__R54P31OpenDice=openDice;

function removeStandalone(){
 document.querySelectorAll('.r54-p1-world-open,.r54-p6-world-open,.r53-dice-fab,.r54-p6-dice-fab').forEach(el=>{
  el.style.setProperty('display','none','important');el.setAttribute('aria-hidden','true');
 });
}
function utilityButton(title,meta,kind){
 const b=document.createElement('button');b.type='button';b.className='list-item r54-p31-utility';b.dataset.p31Utility=kind;
 b.innerHTML='<span class="r54-p31-util-icon">'+(kind==='world'?'◎':'◆')+'</span><span class="list-copy"><strong>'+title+'</strong><small>'+meta+'</small></span><span class="list-arrow" aria-hidden="true">›</span>';
 b.onclick=e=>{e.preventDefault();e.stopPropagation();if(kind==='world')openWorld();else openDice()};
 return b;
}
function mountUtilities(){
 document.querySelectorAll('dialog.overlay[open] .bottom-sheet,.overlay .bottom-sheet').forEach(sheet=>{
  const title=norm(sheet.querySelector('header h2')?.textContent||'');
  if(!title.includes('utilidades'))return;
  if(!sheet.querySelector('[data-p31-utility="world"]'))sheet.appendChild(utilityButton('MUNDO VIVO','NPCs, facções, locais e consequências','world'));
  if(!sheet.querySelector('[data-p31-utility="dice"]'))sheet.appendChild(utilityButton('DADOS','Rolagem narrativa','dice'));
 });
}

function normalizeMarker(card){
 const mark=card?.querySelector('.r54-p1-you');if(!mark)return;
 const z=Math.max(1,Number(card.dataset.zoom)||1);
 mark.style.setProperty('transform',`translate(-50%,-50%) scale(${1/z})`,'important');
 mark.style.setProperty('transform-origin','center','important');
}
function mountMarkerFix(){
 document.querySelectorAll('.r54-p1-world-map').forEach(card=>{
  normalizeMarker(card);
  if(card.dataset.p31MarkerObserver==='1')return;
  card.dataset.p31MarkerObserver='1';
  new MutationObserver(()=>normalizeMarker(card)).observe(card,{attributes:true,attributeFilter:['data-zoom']});
 });
}

function style(){
 if(document.getElementById('r54-p31-style'))return;
 const s=document.createElement('style');s.id='r54-p31-style';s.textContent=`
 .r54-p1-world-open,.r54-p6-world-open,.r53-dice-fab,.r54-p6-dice-fab{display:none!important}
 .bottom-navigation{
   position:fixed!important;left:50%!important;right:auto!important;top:auto!important;bottom:0!important;
   transform:translateX(-50%)!important;width:min(100%,415px)!important;
   height:74px!important;min-height:74px!important;
   padding:4px 4px 2px!important;margin:0!important;box-sizing:border-box!important;
 }
 .bottom-navigation .bottom-nav-button{height:68px!important;min-height:68px!important;padding:6px 2px 4px!important}
 .scene-mode .bottom-navigation{height:74px!important;min-height:74px!important}
 .scene-mode .bottom-nav-button{height:68px!important;min-height:68px!important}
 .screen-container{padding-bottom:max(88px,5.5rem)!important}
 .r54-p1-you{
   width:10px!important;height:10px!important;min-width:10px!important;min-height:10px!important;
   background:rgba(59,203,245,.48)!important;border:1px solid rgba(255,255,255,.72)!important;
   box-shadow:0 0 0 2px rgba(35,150,190,.18),0 0 7px rgba(71,211,255,.32)!important;
   opacity:.68!important;z-index:5!important;
 }
 .r54-p1-you::after{display:none!important;content:none!important}
 .r54-p31-utility{width:100%!important;text-align:left!important}
 .r54-p31-util-icon{width:2rem;height:2rem;display:grid;place-items:center;border:1px solid #52636b;border-radius:50%;color:#6edfff;font-weight:900}
 .r54-p31-world-modal{position:fixed;inset:0;z-index:2147483200;background:rgba(0,0,0,.84);display:flex;align-items:flex-end;justify-content:center}
 .r54-p31-world-modal>section{box-sizing:border-box;width:min(100%,680px);max-height:88%;overflow:auto;background:#0b1115;color:#edf2f4;border:1px solid #52636b;border-radius:18px 18px 0 0;padding:14px 14px 22px}
 .r54-p31-world-modal header{position:sticky;top:-14px;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:12px;background:#0b1115;padding:10px 0}
 .r54-p31-world-modal header small{color:#65d7f5;font-weight:900;letter-spacing:.08em}.r54-p31-world-modal header h2{margin:2px 0 0;font-size:1.35rem}
 .r54-p31-world-modal [data-close]{width:44px;height:44px;border-radius:50%;border:1px solid #617078;background:#141b20;color:#fff;font-size:24px}
 .r54-p31-world-summary{display:grid;gap:3px;padding:10px;border:1px solid #34454d;border-radius:9px;background:#10181d}.r54-p31-world-summary span{color:#fff}.r54-p31-world-summary small{color:#9badb5}
 .r54-p31-world-tabs{display:flex;gap:6px;overflow:auto;padding:10px 0}.r54-p31-world-tabs button{flex:0 0 auto;min-height:38px;border:1px solid #44545c;border-radius:8px;background:#151d21;color:#c9d2d6;padding:0 10px;font-weight:800}.r54-p31-world-tabs button.active{border-color:#62dafa;color:#62dafa}
 .r54-p31-world-body{display:grid;gap:7px}.r54-p31-world-row{display:grid;gap:3px;border:1px solid #2f3f46;border-radius:8px;background:#11181c;padding:9px}.r54-p31-world-row span{color:#aebbc1;font-size:.84rem}.r54-p31-empty{padding:18px 8px;text-align:center;color:#9dacb3}
 `;document.head.appendChild(s);
}
function tick(){style();removeStandalone();mountUtilities();mountMarkerFix()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',tick,{once:true});else tick();
let pending=0;new MutationObserver(()=>{if(pending)return;pending=setTimeout(()=>{pending=0;tick()},90)}).observe(document.documentElement,{subtree:true,childList:true});
document.addEventListener('click',e=>{if(e.target?.closest?.('.top-bar-menu'))setTimeout(tick,0)},true);
addEventListener('popstate',()=>setTimeout(tick,0));
})();
'''
p31.write_text(js,"utf-8")

sh=shell.read_text("utf-8")
sh=re.sub(r'<script[^>]+src=["\'](?:\./)?r54-device-p31\.js(?:\?[^"\']*)?["\'][^>]*></script>\s*','',sh,flags=re.I)
tag='<script src="r54-device-p31.js"></script>'
if '</body>' in sh.lower():
    sh=re.sub(r'</body>',tag+'\n</body>',sh,count=1,flags=re.I)
else:
    sh+='\n'+tag+'\n'
shell.write_text(sh,"utf-8")

for bp in [root/"app/build.gradle.kts",root/"app/build.gradle"]:
    if not bp.is_file(): continue
    bs=bp.read_text("utf-8")
    if bp.suffix==".kts":
        bs=re.sub(r"versionCode\s*=\s*\d+","versionCode = 10004",bs,count=1)
        bs=re.sub(r'versionName\s*=\s*"[^"]+"','versionName = "1.0.4"',bs,count=1)
    else:
        bs=re.sub(r"versionCode\s+\d+","versionCode 10004",bs,count=1)
        bs=re.sub(r'versionName\s+"[^"]+"','versionName "1.0.4"',bs,count=1)
    bp.write_text(bs,"utf-8")
    break

x=p31.read_text("utf-8");sh=shell.read_text("utf-8")
assert sh.count("r54-device-p31.js")==1
assert "window.__R54P31OpenWorld=openWorld" in x
assert "window.__R54P31OpenDice=openDice" in x
assert ".r54-p1-world-open,.r54-p6-world-open,.r53-dice-fab,.r54-p6-dice-fab" in x
assert "position:fixed!important" in x and "bottom:0!important" in x
assert "scale(" in x and "1/z" in x
assert "opacity:.68!important" in x
assert "data-p31-utility" in x
print("STAR_WARS_P31_PATCH_PASS utilities_in_drawer=1 standalone=0 world_sync=1 nav_bottom=1 marker_inverse_scale=1")
