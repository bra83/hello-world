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

for p in (
    runtime_src / "adventure_engine.js",
    runtime_src / "cyberpunk_adventure_controller.js",
    runtime_src / "cyberpunk_host_adapters.js",
    schema_src,
    modules_src / "index.json",
):
    if not p.is_file():
        raise SystemExit(f"missing adventure engine source: {p}")

data_dest = app / "data/adventures"
data_dest.mkdir(parents=True, exist_ok=True)

shutil.copy2(runtime_src / "adventure_engine.js", app / "adventure_engine.js")
shutil.copy2(runtime_src / "cyberpunk_adventure_controller.js", app / "cyberpunk_adventure_controller.js")
shutil.copy2(runtime_src / "cyberpunk_host_adapters.js", app / "cyberpunk_host_adapters.js")
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
if "buildContextText(c)" not in s:
    if old_world not in s:
        raise SystemExit("R572_WORLD_CONTEXT_ANCHOR_NOT_FOUND")
    new_world = "sessionWorldContext(c=this.character()){if(!c)return'';c.campaignState=c.campaignState||{};c.campaignState.worldSystems=c.campaignState.worldSystems||{};c.campaignState.worldSystems.livingWorld=ensureLivingWorldV3State(c.campaignState.worldSystems.livingWorld||{});const p=c.worldPosition||{},w=c.campaignState.worldSystems,clock=c.campaignState.worldClock||{},locationId=p.mode==='interior'?(p.poiCode||p.sceneId||p.locationId||p.district):(p.poiCode||p.district||'Night City');const base=livingWorldMasterContext(w.livingWorld,{clock,locationId,weather:w.weather,playerName:c.name||'Edgerunner'}),adventure=this.adventureController?.buildContextText(c)||'';return adventure?base+'\\n\\n'+adventure:base}"
    s = s.replace(old_world, new_world, 1)

if "await this.adventureController.startDefault({startPoi});" not in s:
    pattern = r"(c\.campaignState\.session=\{status:'active',campaignId:.*?narrativeError:null\};)"
    s, n = re.subn(pattern, r"\1\n    await this.adventureController.startDefault({startPoi});", s, count=1)
    if n != 1:
        raise SystemExit("R572_NEW_ADVENTURE_ANCHOR_NOT_FOUND")

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
    s = s.replace(
        history_anchor,
        "session.history.push({at:new Date().toLocaleString('pt-BR'),kind:mode,narration,action:text,source,reason,adventureAccepted:adventureReview?.accepted?.length||0,adventureRejected:adventureReview?.rejected?.length||0});",
        1,
    )

if "advDebug=this.adventureController" not in s:
    pattern = r"if\(stateLabel\)stateLabel\.textContent=.*?;"
    replacement = "const advDebug=this.adventureController?.debugState(c)||{};if(stateLabel)stateLabel.textContent=(s.status==='active'?'aventura ativa':'pronto')+' • '+(advDebug.adventureId||'sem módulo')+' • dia '+(clock.day||1)+' • '+hh+':'+mm;"
    s, n = re.subn(pattern, replacement, s, count=1)
    if n != 1:
        raise SystemExit("R572_RENDER_STATE_ANCHOR_NOT_FOUND")

render_anchor = "render(){this.renderSheet();this.renderInventory();this.renderJournal();this.renderSession()}"
if "globalThis.BraseiroAdventureDebug" not in s:
    if render_anchor not in s:
        raise SystemExit("R572_RENDER_ANCHOR_NOT_FOUND")
    s = s.replace(
        render_anchor,
        "render(){globalThis.BraseiroAdventureDebug=()=>this.adventureController?.debugState(this.character())||{};this.renderSheet();this.renderInventory();this.renderJournal();this.renderSession()}",
        1,
    )


# Universal start selector and Adventure-Engine-driven opening.
if "renderAdventureStartControls()" not in s:
    methods_anchor = "  async saveSession(c){const out=await this.saveCharacter(c);if(out?.ok===false)throw new Error(out.error||'Não foi possível salvar a campanha');return out}"
    if methods_anchor not in s:
        raise SystemExit("R572_START_SELECTOR_METHOD_ANCHOR_NOT_FOUND")
    universal_methods = """  renderAdventureStartControls(){
    const c=this.character(),moduleEl=$('#adventureModuleSelect'),modeEl=$('#adventureStartMode');if(!moduleEl||!modeEl)return;
    const modules=this.adventureController?.modules?.()||[],saved=c?.campaignState?.adventureSelection||{},active=c?.campaignState?.adventureState||{};
    const selectedModule=saved.moduleId||active.adventureId||moduleEl.value||modules[0]?.id||'cyberpunk_sandbox';
    const signature=modules.map(x=>x.id+':'+x.title).join('|');
    if(moduleEl.dataset.signature!==signature){moduleEl.innerHTML=modules.map(x=>`<option value="${esc(x.id)}">${esc(x.title)}${x.sourceBook?' • '+esc(x.sourceBook):''}</option>`).join('');moduleEl.dataset.signature=signature}
    if([...moduleEl.options].some(x=>x.value===selectedModule))moduleEl.value=selectedModule;
    const modeLabels={OFFICIAL_ADVENTURE:'AVENTURA OFICIAL',GUIDED_CAMPAIGN:'CAMPANHA GUIADA',SOLO:'SOLO',SANDBOX:'SANDBOX • LOCAL DO ATLAS',TAVERN_START:'BAR / LOCAL SOCIAL ALEATÓRIO'};
    const modes=this.adventureController?.startModes?.()||Object.keys(modeLabels),selectedMode=saved.mode||active.startMode||modeEl.value||'SANDBOX';
    if(modeEl.dataset.signature!==modes.join('|')){modeEl.innerHTML=modes.map(x=>`<option value="${x}">${modeLabels[x]||x}</option>`).join('');modeEl.dataset.signature=modes.join('|')}
    modeEl.value=modes.includes(selectedMode)?selectedMode:'SANDBOX';
  }
  adventureStartSelection(){
    const c=this.character(),moduleId=$('#adventureModuleSelect')?.value||'cyberpunk_sandbox';let mode=$('#adventureStartMode')?.value||'SANDBOX';
    if(moduleId==='cyberpunk_sandbox'&&['OFFICIAL_ADVENTURE','GUIDED_CAMPAIGN'].includes(mode))mode='SANDBOX';
    c.campaignState=c.campaignState||{};c.campaignState.adventureSelection={moduleId,mode,updatedAt:new Date().toISOString()};
    return{moduleId,mode};
  }
  async newAdventureUniversal(){
    const c=this.character();if(!c)return;if(this.sessionState(c).status==='active'&&!window.confirm('Iniciar uma nova aventura? O histórico e o estado temporário da aventura atual serão reiniciados. O personagem será preservado.'))return;
    const runtime=await this.geminiRuntimeStatus(),selection=this.adventureStartSelection(),module=this.adventureController?.getModule?.(selection.moduleId);
    const now=Date.now(),seed=`${now.toString(36)}-${this.randomInt(0x7fffffff).toString(36)}`;
    c.campaignState.worldClock={epoch:`campaign-${seed}`,elapsedSeconds:0,elapsedMinutes:0,subMinuteSeconds:0,day:1,minuteOfDay:this.randomInt(24*60),secondOfMinute:0,source:'motor-barbara-game-time'};
    for(const key of ['pendingEvents','activeAdventure','activeScene','sceneImage','netStatus'])delete c.campaignState[key];
    delete c.campaignState.adventureState;
    c.campaignState.worldSystems=c.campaignState.worldSystems||{};c.campaignState.worldSystems.livingWorld=ensureLivingWorldV3State({});c.campaignState.worldSystems.weather=null;if(c.campaignState.worldSystems.streetStories)c.campaignState.worldSystems.streetStories={};
    c.campaignState.session={status:'active',campaignId:`campaign-${seed}`,adventureSeed:seed,startPoi:null,startedAt:new Date().toISOString(),lastAction:'',currentNarration:runtime.configured?this.openingNarration():'MODO LOCAL: chave Gemini não configurada. O Adventure Engine foi iniciado e ficará persistido; configure a API para receber narração.',history:[],sceneImages:{},recommendedActions:this.localRecommendedActions(c),narrationSource:runtime.configured?'pending':'local',narrativeError:null};
    c.combatState={...(c.combatState||{}),initiative:[],flow:{active:false,round:0,index:0,order:[],playerActionUsed:false,playerMoveSpent:0,playerMoveLocked:false,playerMoveLockPending:false}};
    const currentLocation=c.worldPosition?.poiCode||c.worldPosition?.locationId||c.worldPosition?.district||null;
    const startState=await this.adventureController.start(selection.moduleId,{mode:selection.mode,locationId:selection.mode==='SANDBOX'?currentLocation:null,flags:{'campaign:seed':seed}});
    const startCode=c.worldPosition?.poiCode||startState?.currentLocationId||currentLocation||null,startPoi=(this.atlas?.poiCatalog||[]).find(x=>x.code===startCode||x.id===startCode)||null;
    c.campaignState.session.startPoi=startCode;
    this.setNarrationBadge(runtime.configured?'pending':'local');this.renderSession();await this.saveSession(c);
    if(!runtime.configured){this.toast('Adventure Engine ativo; Gemini não está configurado para narrar a abertura.');this.render();return}
    try{
      const where=startPoi?`${startPoi.name} (${startPoi.district}, ${startPoi.code})`:(c.worldPosition?.poiCode||c.worldPosition?.district||startState?.currentLocationId||'Night City');
      const opening=module?.startDefinition?.openingSituation||module?.openingSituation||module?.premise||'Comece a partir do estado atual, sem impor um gancho obrigatório.';
      const modeNote=selection.mode==='SANDBOX'?'SANDBOX: o jogador escolheu/aceitou o local atual do Atlas; não mova o grupo arbitrariamente.':selection.mode==='TAVERN_START'?'INÍCIO SOCIAL ALEATÓRIO: o host já escolheu e persistiu o local; não troque o ponto inicial.':'O AdventureModule é autoridade sobre o ponto e os fatos de abertura.';
      const prompt=`INÍCIO CONTROLADO PELO ADVENTURE ENGINE. Módulo: ${module?.title||selection.moduleId}. Modo: ${selection.mode}. Local já resolvido pelo host: ${where}. Situação de abertura: ${opening}. ${modeNote} Narre a PRIMEIRA CENA VÁLIDA a partir destes fatos. Não altere AdventureState, não revele segredos selados, não invente regra e não escolha pelo jogador. Produza uma cena completa, sensorial e jogável, com NPCs/fatos apenas quando compatíveis com o contexto estruturado. A primeira resposta estruturalmente válida deve ser exibida; enriquecimento visual/TTS vem depois.`;
      const out=await this.bridge.playerAction({characterId:c.characterId,text:prompt,worldContext:this.sessionWorldContext(c),importance:'climax',request_id:`opening-${seed}`,adventureSeed:seed,startPoi:startCode});
      if(out?.ok===false)throw new Error(out.error||'Falha ao iniciar pelo Motor Bárbara');
      const result=out?.result||{},source=result.narration_source||'unknown',reason=result.narrative_fallback_reason||result.narrative_error||'';
      if(source!=='provider'){
        c.campaignState.session.narrationSource=source;c.campaignState.session.narrativeError=reason||'provider_missing';c.campaignState.session.currentNarration=this.narrationFailureMessage(reason||'provider_missing');this.setNarrationBadge('deterministic_fallback',reason);c.campaignState.session.recommendedActions=[];
      }else{
        const remote=result.presentation?.narration||result.narration||result.text||'',cleanRemote=this.sanitizeNarration(remote,'');
        if(!cleanRemote)throw new Error('provider_narration_empty_after_sanitize');
        c.campaignState.session.currentNarration=cleanRemote;c.campaignState.session.narrationSource='provider';c.campaignState.session.narrativeError=null;c.campaignState.session.recommendedActions=this.extractRecommendedActions(result);this.setNarrationBadge('provider');
        await this.adventureController.processHostResult({result,playerAction:'ADVENTURE_START',ruleResult:result?.mechanical_result||result?.rules_result||null,mode:'OPENING'});
      }
    }catch(error){c.campaignState.session.narrationSource='error';c.campaignState.session.narrativeError=error.message||'gemini_error';c.campaignState.session.currentNarration=`GEMINI NÃO GEROU A CENA.\\n\\n${this.narrationFailureMessage(error.message||'gemini_error')}`;this.setNarrationBadge('deterministic_fallback',error.message);this.toast(`Gemini: ${error.message}`)}
    await this.saveSession(c);document.dispatchEvent(new CustomEvent('barbara:world-pulse',{detail:{reason:'new-adventure',seed,startPoi:startCode,adventureId:selection.moduleId,startMode:selection.mode}}));this.renderCharacter();this.render();
  }
"""
    s = s.replace(methods_anchor, universal_methods + methods_anchor, 1)

if "async legacyNewAdventure()" not in s:
    old = "  async newAdventure(){"
    if old not in s:
        raise SystemExit("R572_NEW_ADVENTURE_WRAPPER_ANCHOR_NOT_FOUND")
    s = s.replace(old, "  async newAdventure(){return this.newAdventureUniversal()}\\n  async legacyNewAdventure(){", 1)

# Make the standard render path keep selectors synchronized with active/saved state.
s = s.replace(
    "this.renderJournal();this.renderSession()}",
    "this.renderJournal();this.renderSession();this.renderAdventureStartControls()}",
    1,
)

sheets.write_text(s, encoding="utf-8")

s = index.read_text(encoding="utf-8")
if 'id="adventureModuleSelect"' not in s:
    campaign_anchor = '<div aria-label="Campanha" class="campaign-mini-actions">'
    if campaign_anchor not in s:
        raise SystemExit("R572_ADVENTURE_SELECTOR_HTML_ANCHOR_NOT_FOUND")
    controls = '<div class="free-action-head adventure-start-controls"><label>AVENTURA<select id="adventureModuleSelect" aria-label="Aventura"></select></label><label>MODO<select id="adventureStartMode" aria-label="Modo de início"></select></label></div>'
    s = s.replace(campaign_anchor, controls + campaign_anchor, 1)

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
    "buildContextText(c)",
    "await this.adventureController.startDefault({startPoi});",
    "await this.adventureController.reset();",
    "adventureReview=mode==='PLAYER_ACTION'",
    "globalThis.BraseiroAdventureDebug",
    "newAdventureUniversal()",
    "renderAdventureStartControls()",
]
for needle in checks:
    if needle not in patched:
        raise SystemExit(f"R572_POSTCONDITION_FAILED: {needle}")

print("R5_72_ADVENTURE_ENGINE_CORE_APPLIED")
