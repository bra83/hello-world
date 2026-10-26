// Cyberpunk RED Netrunning subset grounded in the user's Core Rulebook v1.25 pp.197-200.
// Architecture layouts generated here are campaign/VTT content, not canonical Night City floorplans.
import {rollD10Critical,d} from './cpred_combat.mjs';

export const NETRUN_RULE_SOURCE='Cyberpunk RED Core Rulebook v1.25 pp.197-204; Errata v1.25 p.3';
export function netActionsForInterface(rank){
  rank=Number(rank)||0;
  if(rank<1)return 0;
  if(rank<=3)return 2;
  if(rank<=6)return 3;
  if(rank<=9)return 4;
  return 5;
}
export function interfaceCheck(interfaceRank,dv,rng=Math.random){
  const roll=rollD10Critical(rng),total=Number(interfaceRank||0)+roll.total;
  return {roll,total,dv:Number(dv),success:total>Number(dv)};
}
export function zap({interfaceRank,targetDefense,targetRez=5,rng=Math.random}){
  const attackRoll=rollD10Critical(rng),defenseRoll=rollD10Critical(rng);
  const attack=Number(interfaceRank||0)+attackRoll.total,defense=Number(targetDefense||0)+defenseRoll.total;
  const hit=attack>defense,damage=hit?d(6,rng):0;
  return {hit,attack,defense,attackRoll,defenseRoll,damage,newRez:Math.max(0,Number(targetRez||0)-damage)};
}
function hash32(s){let h=2166136261>>>0;for(const ch of String(s)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)>>>0;}return h>>>0}
function seeded(seed){let x=(seed||1)>>>0;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296}}
const LABELS={password:'Password',file:'File',control:'Control Node',blackIce:'Black ICE',root:'Root'};
const BLACK_ICE_POOLS={1:['asp','raven','wisp','scorpion'],2:['hellhound','skunk','asp','raven','wisp'],3:['hellhound','kraken','liche','killer','dragon','sabertooth'],4:['giant','kraken','liche','dragon','sabertooth']};
function chooseBlackIce(danger,rng){const pool=BLACK_ICE_POOLS[Math.max(1,Math.min(4,Math.trunc(Number(danger)||1)))]||BLACK_ICE_POOLS[1];return pool[Math.floor(rng()*pool.length)]||'asp'}
export function generateArchitecture({key='generic',kind='generic',danger=1}={}){
  const rng=seeded(hash32(`${key}:${kind}:v30`)),floors=[];
  const n=5+Math.floor(rng()*4)+Math.max(0,Number(danger)-1);
  for(let i=0;i<n;i++){
    let type;
    if(i===0)type='password'; else if(i===n-1)type='root';
    else {const r=rng();type=r<.24?'password':r<.48?'file':r<.72?'control':'blackIce';}
    const dv=type==='root'?null:Math.min(15,6+Math.floor(rng()*5)+Math.max(0,Number(danger)-1));
    const iceId=type==='blackIce'?chooseBlackIce(danger,rng):null,ice=iceId?BLACK_ICE[iceId]:null;
    floors.push({id:`f${i+1}`,floor:i+1,type,label:type==='blackIce'&&iceId?`Black ICE • ${iceId.toUpperCase()}`:LABELS[type],dv,revealed:i===0,passed:false,identified:false,controlled:false,
      iceId,encountered:false,active:false,rez:ice?.rez??null,maxRez:ice?.rez??null,defense:ice?.def??null,perception:ice?.per??null,speed:ice?.spd??null,attack:ice?.atk??null});
  }
  return {version:1,key,kind,danger,generated:true,canonical:false,jackedIn:false,currentFloor:0,actionsUsed:0,turn:1,cloak:null,floors,log:[]};
}


const SOURCE_KIND_TO_NETRUN={password:'password',file:'file',control_node:'control',black_ice:'blackIce',root:'root'};
const normIceLabel=s=>String(s||'').toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9, x-]+/g,' ').replace(/\s+/g,' ').trim();
export function sourceBlackIceIds(label){
  const raw=normIceLabel(label),out=[];
  for(const part0 of raw.split(',').map(x=>x.trim()).filter(Boolean)){
    const m=part0.match(/^(.*?)(?:\s*x(\d+))?$/),name=(m?.[1]||part0).trim().replace(/[ -]+/g,'_'),count=Math.max(1,Math.min(8,Number(m?.[2]||1)));
    const id=Object.keys(BLACK_ICE).find(k=>k===name||k.replaceAll('_',' ')===name.replaceAll('_',' '));
    if(id)for(let i=0;i<count;i++)out.push(id);
  }
  return out;
}
function makeIceInstance(id,index){const ice=BLACK_ICE[id];return{id:`${id}-${index+1}`,iceId:id,encountered:false,active:false,slid:false,stealthBypassed:false,rez:ice?.rez??0,maxRez:ice?.rez??0,defense:ice?.def??0,perception:ice?.per??0,speed:ice?.spd??0,attack:ice?.atk??0}}
function syncIceScalar(f){if(!f||f.type!=='blackIce'||!Array.isArray(f.iceInstances)||!f.iceInstances.length)return f;let i=Math.max(0,Math.min(f.iceInstances.length-1,Number(f.activeIceIndex||0)));while(i<f.iceInstances.length-1&&(f.iceInstances[i].rez<=0||f.iceInstances[i].slid||f.iceInstances[i].stealthBypassed))i++;f.activeIceIndex=i;const x=f.iceInstances[i];Object.assign(f,{iceId:x.iceId,encountered:!!x.encountered,active:!!x.active,rez:x.rez,maxRez:x.maxRez,defense:x.defense,perception:x.perception,speed:x.speed,attack:x.attack});return f}
function currentIceInstance(f){if(!f||f.type!=='blackIce')return null;if(Array.isArray(f.iceInstances)&&f.iceInstances.length){syncIceScalar(f);return f.iceInstances[f.activeIceIndex||0]}return f}
function iceCleared(x){return Number(x?.rez||0)<=0||!!x?.slid||!!x?.stealthBypassed}
function sourceIceFloorCleared(f){return Array.isArray(f?.iceInstances)&&f.iceInstances.length?f.iceInstances.every(iceCleared):Number(f?.rez||0)<=0||!!f?.slid||!!f?.stealthBypassed}
function advanceAfterIce(state,f){if(Array.isArray(f?.iceInstances)&&f.iceInstances.length){const next=f.iceInstances.findIndex((x,i)=>i>Number(f.activeIceIndex||0)&&!iceCleared(x));if(next>=0){f.activeIceIndex=next;syncIceScalar(f);return{advancedFloor:false,nextIceId:f.iceId}}f.passed=true}if(state.currentFloor<state.floors.length-1){state.currentFloor++;state.floors[state.currentFloor].revealed=true;return{advancedFloor:true,nextIceId:null}}return{advancedFloor:false,nextIceId:null}}
export function importSourceArchitecture(architecture,{nodeIndex=0}={}){
  if(!architecture?.id||!Array.isArray(architecture.nodes)||architecture.nodes.length<2)return null;
  const floors=architecture.nodes.map((n,i)=>{const type=SOURCE_KIND_TO_NETRUN[n.kind]||'source';const floor={id:`src-${architecture.id}-${i}`,floor:String(n.floor??i+1),type,label:String(n.label||n.kind||`Floor ${i+1}`),dv:n.dv==null?null:Number(n.dv),revealed:i===0,passed:false,identified:false,controlled:false,sourceBound:true,sourceKind:n.kind,sourceLabel:n.label??null};if(type==='blackIce'){const ids=sourceBlackIceIds(n.label);floor.iceInstances=ids.map(makeIceInstance);floor.sourceGuarded=ids.length===0;floor.activeIceIndex=0;if(ids.length)syncIceScalar(floor)}return floor});
  const ds=architecture.demonStats||{},controller=architecture.controller||{},watchers=[];if(controller.type&&controller.type!=='none'&&Number(ds.interface)>0)watchers.push({id:`controller:${architecture.id}`,name:String(controller.name||architecture.demon||controller.type),kind:controller.type,interface:Number(ds.interface),pathfinderBonus:0,sourceBound:true,location:'gm-determined'});
  const idx=Math.max(0,Math.min(floors.length-1,Math.trunc(Number(nodeIndex)||0)));for(let i=0;i<=idx;i++)floors[i].revealed=true;
  return{version:2,key:`street-stories:${architecture.id}`,kind:'source',danger:0,generated:false,canonical:true,sourceBound:true,source:'Tales of the RED: Street Stories Digital v1.2',sourceArchitectureId:architecture.id,sourcePage:architecture.sourcePage,sourceMissionId:architecture.missionId,sourceName:architecture.name,graphComplete:architecture.graphComplete===true,jackedIn:false,currentFloor:idx,actionsUsed:0,turn:1,cloak:null,floors,watchers,log:[]};
}
export function setSourceArchitectureFloor(state,nodeIndex=0){if(!state?.sourceBound||!Array.isArray(state.floors)||!state.floors.length)return{ok:false,reason:'not-source-architecture'};const i=Math.max(0,Math.min(state.floors.length-1,Math.trunc(Number(nodeIndex)||0)));state.currentFloor=i;for(let n=0;n<=i;n++)state.floors[n].revealed=true;return{ok:true,state,floor:state.floors[i],nodeIndex:i}}
export function markCurrentBlackIceStealthBypassed(state,iceId){const f=state?.floors?.[state.currentFloor];if(!f||f.type!=='blackIce')return{ok:false,reason:'not-black-ice'};const x=Array.isArray(f.iceInstances)?f.iceInstances.find(v=>v.iceId===iceId&&!iceCleared(v)):null;if(x)x.stealthBypassed=true;else if(!f.iceInstances)f.stealthBypassed=true;syncIceScalar(f);return{ok:true,state,allBypassed:sourceIceFloorCleared(f)}}
export function clearBlackIceStealthBypass(state){for(const f of state?.floors||[]){if(f.type!=='blackIce')continue;f.stealthBypassed=false;for(const x of f.iceInstances||[])x.stealthBypassed=false;syncIceScalar(f)}return state}

export function startNetTurn(state,interfaceRank){state.actionsUsed=0;const penalty=Math.max(0,Math.trunc(Number(state.nextNetActionPenalty)||0));state.actionsMax=Math.max(2,netActionsForInterface(interfaceRank)-penalty);state.nextNetActionPenalty=0;state.turn=(state.turn||0)+1;return state}
export function spendNetAction(state){const max=state.actionsMax??0;if((state.actionsUsed||0)>=max)return false;state.actionsUsed=(state.actionsUsed||0)+1;return true}
export function pathfinder(state,interfaceRank,rng=Math.random){
  if(!spendNetAction(state))return {ok:false,reason:'no-actions'};
  const roll=rollD10Critical(rng),check=Number(interfaceRank||0)+roll.total;let revealed=0;
  for(let i=state.currentFloor;i<state.floors.length;i++){
    const f=state.floors[i];f.revealed=true;revealed++;
    if(f.type==='password'&&Number(f.dv)>check)break;
    // Core says number of floors equal to Check or first higher-DV obstruction; floor count is naturally capped here.
    if(revealed>=check)break;
  }
  return {ok:true,check,roll,revealed};
}
export function backdoor(state,interfaceRank,rng=Math.random){
  const f=state.floors[state.currentFloor];if(!f||f.type!=='password')return {ok:false,reason:'not-password'};
  if(!spendNetAction(state))return {ok:false,reason:'no-actions'};
  const check=interfaceCheck(interfaceRank,f.dv,rng);if(check.success){f.passed=true;if(state.currentFloor<state.floors.length-1)state.currentFloor++;state.floors[state.currentFloor].revealed=true;}
  return {ok:true,...check};
}
export function eyeDee(state,interfaceRank,rng=Math.random){
  const f=state.floors[state.currentFloor];if(!f||f.type!=='file')return {ok:false,reason:'not-file'};
  if(!spendNetAction(state))return {ok:false,reason:'no-actions'};
  const check=interfaceCheck(interfaceRank,f.dv,rng);if(check.success)f.identified=true;return {ok:true,...check};
}
export function controlNode(state,interfaceRank,rng=Math.random){
  const f=state.floors[state.currentFloor];if(!f||f.type!=='control')return {ok:false,reason:'not-control'};
  if(!spendNetAction(state))return {ok:false,reason:'no-actions'};
  const check=interfaceCheck(interfaceRank,f.dv,rng);if(check.success)f.controlled=true;return {ok:true,...check};
}
export function zapCurrent(state,interfaceRank,rng=Math.random){
  const f=state.floors[state.currentFloor],ice=currentIceInstance(f);if(!f||f.type!=='blackIce'||!ice||ice.rez<=0)return {ok:false,reason:'not-black-ice'};
  if(!spendNetAction(state))return {ok:false,reason:'no-actions'};
  const out=zap({interfaceRank,targetDefense:ice.defense,targetRez:ice.rez,rng});ice.rez=out.newRez;if(ice!==f)syncIceScalar(f);else f.rez=out.newRez;let progress={advancedFloor:false,nextIceId:null};if(ice.rez<=0){ice.derezzed=true;progress=advanceAfterIce(state,f)}return {ok:true,...out,iceId:ice.iceId||f.iceId,...progress};
}
export function scanner(state,interfaceRank,dv=6,rng=Math.random){const check=interfaceCheck(interfaceRank,dv,rng);state.accessPointScanned=check.success;return{ok:true,...check,found:check.success,meatAction:true}}
export function slideCurrent(state,interfaceRank,rng=Math.random){const f=state.floors[state.currentFloor],ice=currentIceInstance(f);if(!f||f.type!=='blackIce'||!ice||ice.rez<=0)return{ok:false,reason:'not-black-ice'};if(!spendNetAction(state))return{ok:false,reason:'no-actions'};const attackRoll=rollD10Critical(rng),defenseRoll=rollD10Critical(rng),attack=Number(interfaceRank||0)+attackRoll.total,defense=Number(ice.perception??ice.defense??0)+defenseRoll.total,success=attack>defense;let progress={advancedFloor:false,nextIceId:null};if(success){ice.slid=true;if(ice===f)f.slid=true;progress=advanceAfterIce(state,f)}return{ok:true,success,attack,defense,attackRoll,defenseRoll,iceId:ice.iceId||f.iceId,...progress}}
export function installVirus(state,interfaceRank,{dv,requiredActions,effect},rng=Math.random){const f=state.floors[state.currentFloor];if(!f||f.type!=='root')return{ok:false,reason:'not-root'};const required=Math.max(1,Math.min(10,Math.floor(Number(requiredActions)||1))),targetDv=Math.max(6,Math.min(30,Math.floor(Number(dv)||6)));if(!spendNetAction(state))return{ok:false,reason:'no-actions'};state.virusDraft=state.virusDraft||{effect:String(effect||'alteração definida pelo Mestre'),dv:targetDv,requiredActions:required,spent:0};const draft=state.virusDraft;if(draft.dv!==targetDv||draft.requiredActions!==required||draft.effect!==String(effect||'alteração definida pelo Mestre'))return{ok:false,reason:'virus-draft-mismatch'};draft.spent++;if(draft.spent<draft.requiredActions)return{ok:true,complete:false,spent:draft.spent,requiredActions:draft.requiredActions};const check=interfaceCheck(interfaceRank,draft.dv,rng);if(check.success){state.viruses=state.viruses||[];state.viruses.push({effect:draft.effect,dv:draft.dv,installedAtTurn:state.turn||1});delete state.virusDraft}return{ok:true,complete:true,...check,effect:draft.effect}}
export function advanceFloor(state){
  const f=state.floors[state.currentFloor];if(!f)return false;
  if(f.type==='password'&&!f.passed)return false;if(f.type==='blackIce'&&!sourceIceFloorCleared(f))return false;
  if(state.currentFloor<state.floors.length-1){state.currentFloor++;state.floors[state.currentFloor].revealed=true;return true;}return false;
}

export const NET_PROGRAMS={
 eraser:{id:'eraser',class:'booster',slots:1,rez:7,cost:20,effect:'cloak_plus_2'},see_ya:{id:'see_ya',class:'booster',slots:1,rez:7,cost:20,effect:'pathfinder_plus_2'},speedy_gonzalvez:{id:'speedy_gonzalvez',class:'booster',slots:1,rez:7,cost:100,effect:'speed_plus_2'},worm:{id:'worm',class:'booster',slots:1,rez:7,cost:50,effect:'backdoor_plus_2'},
 armor:{id:'armor',class:'defender',slots:1,rez:7,cost:50,effect:'brain_damage_minus_4'},flak:{id:'flak',class:'defender',slots:1,rez:7,cost:50,effect:'attacker_atk_zero'},shield:{id:'shield',class:'defender',slots:1,rez:7,cost:20,effect:'block_first_brain_damage'},
 banhammer:{id:'banhammer',class:'attacker',slots:1,atk:1,def:0,rez:0,cost:50,target:'program',effect:'banhammer_rez_damage'},sword:{id:'sword',class:'attacker',slots:1,atk:1,def:0,rez:0,cost:50,target:'program',effect:'sword_rez_damage'},deckkrash:{id:'deckkrash',class:'attacker',slots:1,atk:0,def:0,rez:0,cost:100,target:'person',effect:'unsafe_jackout'},hellbolt:{id:'hellbolt',class:'attacker',slots:1,atk:2,def:0,rez:0,cost:100,target:'person',effect:'brain_2d6_fire'},nervescrub:{id:'nervescrub',class:'attacker',slots:1,atk:0,def:0,rez:0,cost:100,target:'person',effect:'int_ref_dex_minus_1d6'},poison_flatline:{id:'poison_flatline',class:'attacker',slots:1,atk:0,def:0,rez:0,cost:100,target:'person',effect:'destroy_random_program'},superglue:{id:'superglue',class:'attacker',slots:1,atk:2,def:0,rez:0,cost:100,target:'person',effect:'depth_safe_jackout_lock_1d6',oncePerNetrun:true},vrizzbolt:{id:'vrizzbolt',class:'attacker',slots:1,atk:1,def:0,rez:0,cost:50,target:'person',effect:'brain_1d6_next_actions_minus_1'}
};
export const BLACK_ICE={
 asp:{id:'asp',target:'person',per:4,spd:6,atk:2,def:2,rez:15,cost:100,effect:'destroy_random_program'},
 giant:{id:'giant',target:'person',per:2,spd:2,atk:8,def:4,rez:25,cost:1000,effect:'brain_3d6_unsafe_jackout'},
 hellhound:{id:'hellhound',target:'person',per:6,spd:6,atk:6,def:2,rez:20,cost:500,effect:'brain_2d6_fire'},
 kraken:{id:'kraken',target:'person',per:6,spd:2,atk:8,def:4,rez:30,cost:1000,effect:'brain_3d6_lock'},
 liche:{id:'liche',target:'person',per:8,spd:2,atk:6,def:2,rez:25,cost:500,effect:'int_ref_dex_minus_1d6'},
 raven:{id:'raven',target:'person',per:6,spd:4,atk:4,def:2,rez:15,cost:50,effect:'derez_defender_brain_1d6'},
 scorpion:{id:'scorpion',target:'person',per:2,spd:6,atk:2,def:2,rez:15,cost:100,effect:'move_minus_1d6'},
 skunk:{id:'skunk',target:'person',per:2,spd:4,atk:4,def:2,rez:10,cost:500,effect:'slide_minus_2'},
 wisp:{id:'wisp',target:'person',per:4,spd:4,atk:4,def:2,rez:15,cost:50,effect:'brain_1d6_next_actions_minus_1'},
 dragon:{id:'dragon',target:'program',per:6,spd:4,atk:6,def:6,rez:30,cost:1000,effect:'program_6d6_destroy'},
 killer:{id:'killer',target:'program',per:4,spd:8,atk:6,def:2,rez:20,cost:500,effect:'program_4d6_destroy'},
 sabertooth:{id:'sabertooth',target:'program',per:8,spd:6,atk:6,def:2,rez:25,cost:1000,effect:'program_6d6_destroy'}
};
export function deckSlotsUsed({programs=[],blackIce=[],hardware=[]}={}){return programs.reduce((s,id)=>s+(NET_PROGRAMS[id]?.slots||1),0)+blackIce.reduce((s,id)=>s+(BLACK_ICE[id]?2:0),0)+hardware.length}
export function validateCyberdeckLoadout(loadout={}){const capacity=Math.max(1,Number(loadout.capacity||7));const used=deckSlotsUsed(loadout);return{ok:used<=capacity,used,capacity,free:capacity-used}}

function deckOf(state){state.cyberdeck=state.cyberdeck||{programs:[],rezzedPrograms:[],programRez:{}};state.cyberdeck.programs=Array.isArray(state.cyberdeck.programs)?state.cyberdeck.programs:[];state.cyberdeck.rezzedPrograms=Array.isArray(state.cyberdeck.rezzedPrograms)?state.cyberdeck.rezzedPrograms:[];state.cyberdeck.programRez=state.cyberdeck.programRez||{};state.cyberdeck.programUseRound=state.cyberdeck.programUseRound||{};state.cyberdeck.oncePerNetrunUsed=state.cyberdeck.oncePerNetrunUsed||{};return state.cyberdeck}
function currentMeatRound(state){return Math.max(1,Math.trunc(Number(state?.meatRound??state?.turn??1)))}
export function canActivateProgram(state,programId){
 const program=NET_PROGRAMS[programId],deck=deckOf(state||{});if(!program)return{ok:false,reason:'unknown-program'};if(!deck.programs.includes(programId))return{ok:false,reason:'program-not-installed'};if(deck.rezzedPrograms.includes(programId))return{ok:false,reason:'program-already-rezzed'};const round=currentMeatRound(state);if(Number(deck.programUseRound[programId]||0)===round)return{ok:false,reason:'program-already-activated-this-round',round};if(program.oncePerNetrun&&deck.oncePerNetrunUsed[programId])return{ok:false,reason:'program-once-per-netrun-used'};return{ok:true,program,round}}
export function activateProgram(state,programId,{spendAction=true}={}){const can=canActivateProgram(state,programId);if(!can.ok)return can;if(spendAction&&!spendNetAction(state))return{ok:false,reason:'no-actions'};const deck=deckOf(state);deck.rezzedPrograms.push(programId);deck.programUseRound[programId]=can.round;const program=NET_PROGRAMS[programId];if(program.rez)deck.programRez[programId]=Number(deck.programRez[programId]??program.rez);return{ok:true,programId,program,round:can.round,spentNetAction:Boolean(spendAction)}}
export function deactivateProgram(state,programId,{spendAction=true}={}){const deck=deckOf(state||{});if(!deck.rezzedPrograms.includes(programId))return{ok:false,reason:'program-not-rezzed'};if(spendAction&&!spendNetAction(state))return{ok:false,reason:'no-actions'};deck.rezzedPrograms=deck.rezzedPrograms.filter(id=>id!==programId);return{ok:true,programId,spentNetAction:Boolean(spendAction)}}
export function resetProgramForNetrun(state){const deck=deckOf(state||{});deck.oncePerNetrunUsed={};deck.programUseRound={};deck.rezzedPrograms=[];return deck}
function targetNetStatus(character){return character?netStatus(character):{temporary:[],burning:false}}
function targetBrainDamage({character,state,damage,source}){if(!character)return{beforeHp:null,afterHp:null,brainDamage:damage};const status=targetNetStatus(character),deck=state?deckOf(state):null,defs=deck?.rezzedPrograms||[];let remaining=Math.max(0,Number(damage)||0),blockedBy=null;
 if(defs.includes('shield')&&remaining>0){remaining=0;blockedBy='shield';deck.rezzedPrograms=defs.filter(x=>x!=='shield');deck.programRez.shield=0}
 else if(defs.includes('armor')&&remaining>0){remaining=Math.max(0,remaining-4);blockedBy='armor'}
 const beforeHp=runnerHp(character),afterHp=setRunnerHp(character,beforeHp-remaining);status.lastBrainDamage={source,raw:Number(damage)||0,applied:remaining};return{beforeHp,afterHp,brainDamage:remaining,rawBrainDamage:Number(damage)||0,blockedBy}}
function resolveProgramAttackRoll({interfaceRank,program,targetDefense=0,targetInterface=0,targetKind,rng=Math.random}){const attackRoll=rollD10Critical(rng),defenseRoll=rollD10Critical(rng),attack=Number(interfaceRank||0)+Number(program?.atk||0)+attackRoll.total,defense=Number(targetKind==='person'?targetInterface:targetDefense)+defenseRoll.total;return{attackRoll,defenseRoll,attack,defense,hit:attack>defense}}
export function resolveAttackProgram({state,character=null,interfaceRank=0,programId,targetKind='person',target=null,targetCharacter=null,targetState=null,targetInterface=0,rng=Math.random}={}){
 const program=NET_PROGRAMS[programId];if(!state||!program)return{ok:false,reason:program?'state-required':'unknown-program'};if(program.class!=='attacker')return{ok:false,reason:'not-attacker-program'};if((program.target==='person'&&targetKind!=='person')||(program.target==='program'&&!['program','blackIce'].includes(targetKind)))return{ok:false,reason:'invalid-target-kind'};
 const can=canActivateProgram(state,programId);if(!can.ok)return can;if(!spendNetAction(state))return{ok:false,reason:'no-actions'};const deck=deckOf(state);deck.programUseRound[programId]=can.round;if(program.oncePerNetrun)deck.oncePerNetrunUsed[programId]=true;
 // Attacker Programs activate as the attack is made, then automatically deactivate after use (Core p.201 / Errata p.3).
 let effectiveAtk=Number(program.atk||0);const targetDeck=targetState?deckOf(targetState):null;if(targetKind==='person'&&(targetDeck?.rezzedPrograms||[]).includes('flak'))effectiveAtk=0;const attackProgram={...program,atk:effectiveAtk};const defense=targetKind==='blackIce'?Number(target?.def??target?.defense??0):targetKind==='program'?Number(target?.def??target?.defense??0):0;const roll=resolveProgramAttackRoll({interfaceRank,program:attackProgram,targetDefense:defense,targetInterface,targetKind,rng});const out={ok:true,programId,targetKind,...roll,autoDeactivated:true,spentNetAction:true,effect:program.effect};if(!roll.hit)return out;
 if(programId==='banhammer'||programId==='sword'){
   const black=targetKind==='blackIce',dice=programId==='banhammer'?(black?2:3):(black?3:2),damage=nd6(dice,rng),before=Math.max(0,Number(target?.rez||0)),after=Math.max(0,before-damage.total);if(target)target.rez=after;Object.assign(out,{damageRoll:damage,rezDamage:damage.total,targetRezBefore:before,targetRezAfter:after,derezzed:after<=0});return out;
 }
 if(programId==='deckkrash'){if(targetState)out.unsafeJackOut=unsafeJackOut(targetState);else out.unsafeJackOut={ok:true,unsafe:true};return out}
 if(programId==='hellbolt'){const damage=nd6(2,rng),brain=targetBrainDamage({character:targetCharacter,state:targetState,damage:damage.total,source:programId});Object.assign(out,{damageRoll:damage,...brain});if(targetCharacter){const status=targetNetStatus(targetCharacter);status.burning=true;status.netFireDamage=2}out.burning=true;return out}
 if(programId==='nervescrub'){const r=nd6(1,rng);if(targetCharacter)targetNetStatus(targetCharacter).temporary.push({kind:'net-stat-penalty',stats:['INT','REF','DEX'],amount:r.total,minimum:1,expiresAtSecond:nowSeconds(targetCharacter)+3600,source:programId});out.penalty=r.total;return out}
 if(programId==='poison_flatline'){const installed=targetDeck?.programs||[];const candidates=installed.filter(id=>NET_PROGRAMS[id]);const i=randomIndex(candidates.length,rng);if(i>=0){const destroyed=candidates[i];targetDeck.programs=installed.filter(id=>id!==destroyed);targetDeck.rezzedPrograms=(targetDeck.rezzedPrograms||[]).filter(id=>id!==destroyed);delete targetDeck.programRez[destroyed];out.destroyedProgram=destroyed}return out}
 if(programId==='superglue'){const rounds=nd6(1,rng).total;if(targetState){targetState.safeJackOutLockedUntilTurn=Math.max(Number(targetState.safeJackOutLockedUntilTurn||0),(targetState.turn||1)+rounds);targetState.depthLockedUntilTurn=Math.max(Number(targetState.depthLockedUntilTurn||0),(targetState.turn||1)+rounds)}out.lockRounds=rounds;return out}
 if(programId==='vrizzbolt'){const damage=nd6(1,rng),brain=targetBrainDamage({character:targetCharacter,state:targetState,damage:damage.total,source:programId});Object.assign(out,{damageRoll:damage,...brain});if(targetState)targetState.nextNetActionPenalty=Math.max(1,Number(targetState.nextNetActionPenalty||0));out.nextNetActionPenalty=1;return out}
 return out;
}
export function encounterBlackIce({interfaceRank,speedBonus=0,iceId,rng=Math.random}={}){const ice=BLACK_ICE[iceId];if(!ice)return{ok:false,reason:'unknown-black-ice'};const runnerRoll=rollD10Critical(rng),iceRoll=rollD10Critical(rng),runner=Number(interfaceRank||0)+Number(speedBonus||0)+runnerRoll.total,opponent=ice.spd+iceRoll.total;return{ok:true,iceId,runner,opponent,freeHit:opponent>runner,runnerRoll,iceRoll,ice}}
export function blackIceAttack({interfaceRank,iceId,programDefense=null,rng=Math.random}={}){const ice=BLACK_ICE[iceId];if(!ice)return{ok:false,reason:'unknown-black-ice'};const attackRoll=rollD10Critical(rng),defenseRoll=rollD10Critical(rng),attack=ice.atk+attackRoll.total,defense=(ice.target==='program'?Number(programDefense||0):Number(interfaceRank||0))+defenseRoll.total;return{ok:true,iceId,hit:attack>defense,attack,defense,effect:ice.effect,attackRoll,defenseRoll,ice}}
function resetAfterJackOut(state){state.jackedIn=false;state.currentFloor=0;state.floors?.forEach((f,i)=>{f.revealed=i===0;if(f.type==='password')f.passed=false});return state}
export function safeJackOut(state,{source='manual'}={}){resetAfterJackOut(state);return{ok:true,unsafe:false,safe:true,source}}
export function unsafeJackOut(state){const active=(state?.activeBlackIce||[]).filter(x=>!x.derezzed&&!x.slid);resetAfterJackOut(state);return{ok:true,unsafe:true,blackIceEffects:active.map(x=>x.iceId||x.id),count:active.length}}


function nd6(count,rng=Math.random){const rolls=Array.from({length:count},()=>d(6,rng));return{rolls,total:rolls.reduce((a,b)=>a+b,0)}}
function runnerHp(character){return Number(character?.combatState?.player?.hp??character?.derived?.hp??character?.derived?.maxHp??0)}
function setRunnerHp(character,value){const hp=Number(value);character.combatState=character.combatState||{};if(character.combatState.player)character.combatState.player.hp=hp;character.derived=character.derived||{};character.derived.hp=hp;return hp}
function nowSeconds(character){return Math.max(0,Number(character?.campaignState?.worldClock?.elapsedSeconds||0))}
function netStatus(character){character.campaignState=character.campaignState||{};character.campaignState.netStatus=character.campaignState.netStatus||{temporary:[],burning:false};return character.campaignState.netStatus}
function randomIndex(length,rng){return length>0?Math.min(length-1,Math.floor(rng()*length)):-1}
export function applyBlackIceEffect({character,state,iceId,rng=Math.random,safeUnsafeJackOut=false}={}){
 const ice=BLACK_ICE[iceId];if(!ice||!character||!state)return{ok:false,reason:'invalid-black-ice-effect'};const status=netStatus(character),beforeHp=runnerHp(character),out={ok:true,iceId,effect:ice.effect,beforeHp,brainDamage:0};
 const brain=(count)=>{const roll=nd6(count,rng);out.damageRoll=roll;out.brainDamage=roll.total;out.afterHp=setRunnerHp(character,beforeHp-roll.total)};
 if(ice.effect==='destroy_random_program'){const deck=state.cyberdeck||{},installed=deck.programs||[];const i=randomIndex(installed.length,rng);if(i>=0){out.destroyedProgram=installed[i];installed.splice(i,1)} }
 else if(ice.effect==='brain_3d6_unsafe_jackout'){brain(3);if(safeUnsafeJackOut){out.safeJackOutInstead=true;out.jackOut=safeJackOut(state,{source:'sixgun'})}else{out.unsafeJackOut=true;out.jackOut=unsafeJackOut(state)}}
 else if(ice.effect==='brain_2d6_fire'){brain(2);status.burning=true;out.burning=true}
 else if(ice.effect==='brain_3d6_lock'){brain(3);state.safeJackOutLockedUntilTurn=(state.turn||1)+1;state.depthLockedUntilTurn=(state.turn||1)+1}
 else if(ice.effect==='int_ref_dex_minus_1d6'){const r=nd6(1,rng);status.temporary.push({kind:'net-stat-penalty',stats:['INT','REF','DEX'],amount:r.total,minimum:1,expiresAtSecond:nowSeconds(character)+3600,source:iceId});out.penalty=r.total}
 else if(ice.effect==='derez_defender_brain_1d6'){const deck=state.cyberdeck||{},rezzed=deck.rezzedPrograms||[],defs=rezzed.filter(id=>NET_PROGRAMS[id]?.class==='defender');if(defs.length){const id=defs[randomIndex(defs.length,rng)];deck.rezzedPrograms=rezzed.filter(x=>x!==id);out.derezzedProgram=id}brain(1)}
 else if(ice.effect==='move_minus_1d6'){const r=nd6(1,rng);status.temporary.push({kind:'net-move-penalty',amount:r.total,minimum:1,expiresAtSecond:nowSeconds(character)+3600,source:iceId});out.penalty=r.total}
 else if(ice.effect==='slide_minus_2'){state.slidePenalty=Math.max(0,Number(state.slidePenalty||0))+2;out.slidePenalty=state.slidePenalty}
 else if(ice.effect==='brain_1d6_next_actions_minus_1'){brain(1);state.nextNetActionPenalty=Math.max(1,Number(state.nextNetActionPenalty||0));out.nextNetActionPenalty=1}
 else if(ice.effect.startsWith('program_')){const deck=state.cyberdeck||{},rezzed=deck.rezzedPrograms||[];if(rezzed.length){const id=rezzed[randomIndex(rezzed.length,rng)],program=NET_PROGRAMS[id],dice=ice.effect.includes('6d6')?6:4,roll=nd6(dice,rng);deck.programRez=deck.programRez||{};const before=Number(deck.programRez[id]??program?.rez??7),after=before-roll.total;out.programTarget=id;out.programDamage=roll.total;out.programRezAfter=Math.max(0,after);if(after<=0){deck.rezzedPrograms=rezzed.filter(x=>x!==id);deck.programs=(deck.programs||[]).filter(x=>x!==id);out.destroyedProgram=id}else deck.programRez[id]=after}}
 if(out.afterHp==null)out.afterHp=runnerHp(character);return out;
}
export function encounterCurrentBlackIce({state,character,interfaceRank,rng=Math.random,speedBonus=0,safeUnsafeJackOut=false}={}){const f=state?.floors?.[state.currentFloor],ice=currentIceInstance(f);if(!f||f.type!=='blackIce'||!ice||ice.rez<=0||ice.stealthBypassed)return{ok:false,reason:'not-black-ice'};if(ice.encountered)return{ok:true,alreadyEncountered:true,iceId:ice.iceId};ice.encountered=true;ice.active=true;if(ice!==f)syncIceScalar(f);const programSpeedBonus=(state.cyberdeck?.rezzedPrograms||[]).includes('speedy_gonzalvez')?2:0,encounter=encounterBlackIce({interfaceRank,speedBonus:programSpeedBonus+Number(speedBonus||0),iceId:ice.iceId,rng});let effect=null;if(encounter.freeHit)effect=applyBlackIceEffect({character,state,iceId:ice.iceId,rng,safeUnsafeJackOut});return{ok:true,encounter,effect,freeHit:encounter.freeHit,iceId:ice.iceId,speedBonus:programSpeedBonus+Number(speedBonus||0)}}
export function resolveCurrentBlackIceTurn({state,character,interfaceRank,rng=Math.random,safeUnsafeJackOut=false}={}){const f=state?.floors?.[state.currentFloor],ice=currentIceInstance(f);if(!f||f.type!=='blackIce'||!ice||ice.rez<=0||ice.slid||ice.stealthBypassed)return{ok:false,reason:'no-active-black-ice'};const attack=blackIceAttack({interfaceRank,iceId:ice.iceId,programDefense:null,rng});const effect=attack.hit?applyBlackIceEffect({character,state,iceId:ice.iceId,rng,safeUnsafeJackOut}):null;return{ok:true,attack,effect,iceId:ice.iceId}}
export function cleanExpiredNetStatus(character){const now=nowSeconds(character),status=netStatus(character);status.temporary=(status.temporary||[]).filter(x=>Number(x.expiresAtSecond||0)>now);return status}
