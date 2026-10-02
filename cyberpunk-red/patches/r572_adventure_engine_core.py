#!/usr/bin/env python3
from pathlib import Path
import json
import re
import shutil
import sys

if len(sys.argv) != 2:
    raise SystemExit("usage: r572_adventure_engine_core.py <android-root>")

root = Path(sys.argv[1])
app = root / "app/src/main/assets/web/app"
sheets = app / "sheets.js"
index = app / "index.html"
main_activity = root / "app/src/main/java/com/braseiro/cyberpunkred/MainActivity.kt"
gradle = root / "app/build.gradle.kts"

for p in (sheets, index, main_activity, gradle):
    if not p.is_file():
        raise SystemExit(f"missing required file: {p}")

repo_cyberpunk = Path(__file__).resolve().parents[1]
bundle = repo_cyberpunk / "adventure-engine"
runtime_src = bundle / "runtime"
schema_src = bundle / "schema/adventure-module.schema.json"
modules_src = bundle / "modules"

for p in (runtime_src / "adventure_engine.js", runtime_src / "cyberpunk_adventure_controller.js", schema_src, modules_src / "index.json"):
    if not p.is_file():
        raise SystemExit(f"missing adventure engine source: {p}")

data_dest = app / "data/adventures"
data_dest.mkdir(parents=True, exist_ok=True)

shutil.copy2(runtime_src / "adventure_engine.js", app / "adventure_engine.js")
shutil.copy2(runtime_src / "cyberpunk_adventure_controller.js", app / "cyberpunk_adventure_controller.js")
shutil.copy2(schema_src, data_dest / "adventure-module.schema.json")
for src in modules_src.glob("*.json"):
    shutil.copy2(src, data_dest / src.name)

for p in data_dest.glob("*.json"):
    json.loads(p.read_text(encoding="utf-8"))

s = sheets.read_text(encoding="utf-8")
import_line = "import {CyberpunkAdventureController} from './cyberpunk_adventure_controller.js';"
if import_line not in s:
    anchor = "import {ensureLivingWorldV3State,livingWorldMasterContext,livingWorldPlayerBrief,consumeLivingWorldMasterEvents} from '../adapter/cpred_living_world_v3.js';"
    if anchor not in s:
        raise SystemExit("R572_SHEETS_IMPORT_ANCHOR_NOT_FOUND")
    s = s.replace(anchor, anchor + "\n" + import_line, 1)

old_ctor = "this.coreCatalog=[];this.blackChromeCatalog=[];this.interfaceRedCatalog=[];this.toggleTempleCatalog=[];this.cyberchairCatalog=[];this.goingQuietCatalog=[];this.hopeRebornCatalog=[];this.cemkCatalog=[];this.catalog=[];this.sessionBusy=false;this.selectedSceneNpc=null;"
if "this.adventureController=new CyberpunkAdventureController" not in s:
    if old_ctor not in s:
        raise SystemExit("R572_CONSTRUCTOR_ANCHOR_NOT_FOUND")
    new_ctor = old_ctor + "\n    this.adventureController=new CyberpunkAdventureController({getCharacter:()=>this.character(),saveCharacter:c=>this.saveCharacter(c),atlas:this.atlas,bridge:this.bridge,toast:t=>this.toast(t)});"
    s = s.replace(old_ctor, new_ctor, 1)

init_anchor = "this.bind();this.render();document.dispatchEvent(new CustomEvent('barbara:loadout-changed'));"
if "await this.adventureController.init();" not in s:
    if init_anchor not in s:
        raise SystemExit("R572_INIT_ANCHOR_NOT_FOUND")
    s = s.replace(init_anchor, "await this.adventureController.init();\n    " + init_anchor, 1)

old_world = "sessionWorldContext(c=this.character()){if(!c)return'';c.campaignState=c.campaignState||{};c.campaignState.worldSystems=c.campaignState.worldSystems||{};c.campaignState.worldSystems.livingWorld=ensureLivingWorldV3State(c.campaignState.worldSystems.livingWorld||{});const p=c.worldPosition||{},w=c.campaignState.worldSystems,clock=c.campaignState.worldClock||{},locationId=p.mode==='interior'?(p.poiCode||p.sceneId||p.locationId||p.district):(p.poiCode||p.district||'Night City');return livingWorldMasterContext(w.livingWorld,{clock,locationId,weather:w.weather,playerName:c.name||'Edgerunner'})}"
if "ADVENTURE_ENGINE_CONTEXT" not in s:
    if old_world not in s:
        raise SystemExit("R572_WORLD_CONTEXT_ANCHOR_NOT_FOUND")
    new_world = "sessionWorldContext(c=this.character()){if(!c)return'';c.campaignState=c.campaignState||{};c.campaignState.worldSystems=c.campaignState.worldSystems||{};c.campaignState.worldSystems.livingWorld=ensureLivingWorldV3State(c.campaignState.worldSystems.livingWorld||{});const p=c.worldPosition||{},w=c.campaignState.worldSystems,clock=c.campaignState.worldClock||{},locationId=p.mode==='interior'?(p.poiCode||p.sceneId||p.locationId||p.district):(p.poiCode||p.district||'Night City');const base=livingWorldMasterContext(w.livingWorld,{clock,locationId,weather:w.weather,playerName:c.name||'Edgerunner'}),adventure=this.adventureController?.buildContextText(c)||'';return adventure?base+'\\n\\n'+adventure:base}"
    s = s.replace(old_world, new_world, 1)

session_anchor = "c.campaignState.session={status:'active',campaignId:\`campaign-\${seed}\`,adventureSeed:seed,startPoi:startPoi?.code||null,startedAt:new Date().toISOString(),lastAction:'',currentNarration:runtime.configured?this.openingNarration():'MODO LOCAL: chave Gemini não configurada. Abra Mais → Áudio para configurar a API antes de iniciar a aventura.',history:[],sceneImages:{},recommendedActions:this.localRecommendedActions(c),narrationSource:runtime.configured?'pending':'local',narrativeError:null};"
if "startDefault({startPoi" not in s:
    if session_anchor not in s:
        raise SystemExit("R572_NEW_ADVENTURE_ANCHOR_NOT_FOUND")
    s = s.replace(session_anchor, session_anchor + "\n    await this.adventureController.startDefault({startPoi});", 1)

old_restart = "this.sessionState(c).status='ready';await this.newAdventure();this.toast('Aventura reiniciada com o mesmo personagem.')"
if "await this.adventureController.reset();" not in s:
    if old_restart not in s:
        raise SystemExit("R572_RESTART_ANCHOR_NOT_FOUND")
    s = s.replace(old_restart, "this.sessionState(c).status='ready';await this.adventureController.reset();await this.newAdventure();this.toast('Aventura reiniciada com o mesmo personagem.')", 1)

result_anchor = "const result=out.result||{},phase=result.phase||'COMPLETED',source=result.narration_source||'unknown',reason=result.narrative_fallback_reason||result.narrative_error||'';"
if "adventureReview=mode==='PLAYER_ACTION'" not in s:
    if result_anchor not in s:
        raise SystemExit("R572_SEND_RESULT_ANCHOR_NOT_FOUND")
    replacement = result_anchor + "\n      const adventureReview=mode==='PLAYER_ACTION'?await this.adventureController.processHostResult({result,playerAction:text,ruleResult:result?.mechanical_result||result?.rules_result||null,mode}):{accepted:[],rejected:[]};"
    s = s.replace(result_anchor, replacement, 1)

history_anchor = "session.history.push({at:new Date().toLocaleString('pt-BR'),kind:mode,narration,action:text,source,reason});"
if "adventureRejected" not in s:
    if history_anchor not in s:
        raise SystemExit("R572_HISTORY_ANCHOR_NOT_FOUND")
    s = s.replace(history_anchor, "session.history.push({at:new Date().toLocaleString('pt-BR'),kind:mode,narration,action:text,source,reason,adventureAccepted:adventureReview?.accepted?.length||0,adventureRejected:adventureReview?.rejected?.length||0});", 1)

state_anchor = "if(stateLabel)stateLabel.textContent=\`\${s.status==='active'?'aventura ativa':'pronto'} • dia \${clock.day||1} • \${hh}:\${mm}\`;"
if "advDebug=this.adventureController" not in s:
    if state_anchor not in s:
        raise SystemExit("R572_RENDER_STATE_ANCHOR_NOT_FOUND")
    replacement = "const advDebug=this.adventureController?.debugState(c)||{};if(stateLabel)stateLabel.textContent=\`\${s.status==='active'?'aventura ativa':'pronto'} • \${advDebug.adventureId||'sem módulo'} • dia \${clock.day||1} • \${hh}:\${mm}\`;"
    s = s.replace(state_anchor, replacement, 1)

render_anchor = "render(){this.renderSheet();this.renderInventory();this.renderJournal();this.renderSession()}"
if "globalThis.BraseiroAdventureDebug" not in s:
    if render_anchor not in s:
        raise SystemExit("R572_RENDER_ANCHOR_NOT_FOUND")
    s = s.replace(render_anchor, "render(){globalThis.BraseiroAdventureDebug=()=>this.adventureController?.debugState(this.character())||{};this.renderSheet();this.renderInventory();this.renderJournal();this.renderSession()}", 1)

sheets.write_text(s, encoding="utf-8")

s = index.read_text(encoding="utf-8")
s = re.sub(r'app\.js\?build=\d+', 'app.js?build=4172', s)
index.write_text(s, encoding="utf-8")

s = main_activity.read_text(encoding="utf-8")
s = re.sub(r'index\.html\?build=\d+', 'index.html?build=4172', s)
main_activity.write_text(s, encoding="utf-8")

s = gradle.read_text(encoding="utf-8")
s = re.sub(r'versionCode\s*=\s*\d+', 'versionCode = 4172', s)
s = re.sub(r'versionName\s*=\s*"[^"]+"', 'versionName = "4.1.72"', s)
gradle.write_text(s, encoding="utf-8")

patched = sheets.read_text(encoding="utf-8")
checks = [
    import_line,
    "this.adventureController=new CyberpunkAdventureController",
    "await this.adventureController.init();",
    "ADVENTURE_ENGINE_CONTEXT",
    "await this.adventureController.startDefault({startPoi});",
    "await this.adventureController.reset();",
    "adventureReview=mode==='PLAYER_ACTION'",
    "globalThis.BraseiroAdventureDebug",
]
for needle in checks:
    if needle not in patched:
        raise SystemExit(f"R572_POSTCONDITION_FAILED: {needle}")

print("R5_72_ADVENTURE_ENGINE_CORE_APPLIED")
