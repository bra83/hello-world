// Cyberpunk RED Core v1.25 pp.227-229 + Interface RED Vol.4 Hornet's Pharmacy pp.4-5.
import {campaignMinute} from './cpred_world_clock.js';
export const STREET_DRUG_SOURCE='Cyberpunk RED Core Rulebook Digital v1.25 pp.227-229';
export const INTERFACE_RED_DRUG_SOURCE="Interface RED Vol.4 Hornet's Pharmacy pp.4-5";
export const STREET_DRUGS={
  black_lace:{id:'black_lace',name:'Black Lace',durationMinutes:1440,secondaryDv:17,price:50,primary:'ignore-seriously-wounded',addiction:'ref-minus-2-outside-primary',source:STREET_DRUG_SOURCE},
  blue_glass:{id:'blue_glass',name:'Blue Glass',durationMinutes:240,secondaryDv:15,price:20,primary:'gm-flashout',addiction:'gm-flashout-outside-primary',source:STREET_DRUG_SOURCE},
  boost:{id:'boost',name:'Boost',durationMinutes:1440,secondaryDv:17,price:50,primary:'int-plus-2',addiction:'int-minus-2',source:STREET_DRUG_SOURCE},
  smash:{id:'smash',name:'Smash',durationMinutes:240,secondaryDv:15,price:10,primary:'six-social-skills-plus-2',addiction:'six-social-skills-minus-2',source:STREET_DRUG_SOURCE},
  synthcoke:{id:'synthcoke',name:'Synthcoke',durationMinutes:240,secondaryDv:15,price:20,primary:'ref-plus-1',addiction:'ref-minus-2-outside-primary',source:STREET_DRUG_SOURCE},
  berserker:{id:'berserker',name:'Berserker',durationMinutes:10,secondaryDv:17,price:100,primary:'critical-bonus-none-wound-facedown-halved',addiction:'death-save-penalty-plus-1',moduleId:'interface_red',source:INTERFACE_RED_DRUG_SOURCE},
  prime_time:{id:'prime_time',name:'Prime Time',durationMinutes:240,secondaryDv:17,price:50,primary:'cool-will-plus-2-temp-humanity-4d6',addiction:'cool-minus-2-outside-primary',moduleId:'interface_red',source:INTERFACE_RED_DRUG_SOURCE},
  sixgun:{id:'sixgun',name:'Sixgun',durationMinutes:240,secondaryDv:17,price:100,primary:'ref-move-minus-2-net-speed-plus-2-safe-jackout',addiction:'net-speed-minus-2-outside-primary',moduleId:'interface_red',source:INTERFACE_RED_DRUG_SOURCE},
  timewarp:{id:'timewarp',name:'Timewarp',durationMinutes:1,secondaryDv:17,price:100,primary:'initiative-plus-3',addiction:'initiative-minus-2-outside-primary',moduleId:'interface_red',source:INTERFACE_RED_DRUG_SOURCE},
};
export const SMASH_SKILLS=['dance','contortionist','conversation','human_perception','persuasion','acting'];
function d(sides,rng){return Math.floor(rng()*sides)+1}
function nd(count,sides,rng){let total=0;const rolls=[];for(let i=0;i<count;i++){const v=d(sides,rng);rolls.push(v);total+=v}return{rolls,total}}
export function rollD10Critical(rng=Math.random){
  const natural=d(10,rng);if(natural===10){const extra=d(10,rng);return{natural,extra,total:natural+extra,critical:'success'}}if(natural===1){const extra=d(10,rng);return{natural,extra,total:natural-extra,critical:'failure'}}return{natural,extra:0,total:natural,critical:null};
}
function copy(v){return JSON.parse(JSON.stringify(v??{}))}
export function normalizeStreetDrugState(state={}){
  const out=copy(state);out.active=Array.isArray(out.active)?out.active:[];out.addictions=out.addictions&&typeof out.addictions==='object'?out.addictions:{};out.recovery=out.recovery&&typeof out.recovery==='object'?out.recovery:{};out.history=Array.isArray(out.history)?out.history:[];return out;
}
export function resolveSecondaryEffect({drugId,will,resistTortureDrugs,rng=Math.random}){
  const drug=STREET_DRUGS[drugId];if(!drug)return{ok:false,reason:'unknown-drug'};const roll=rollD10Critical(rng),total=Number(will||0)+Number(resistTortureDrugs||0)+roll.total;return{ok:true,drugId,dv:drug.secondaryDv,roll,total,success:total>drug.secondaryDv,addicted:!(total>drug.secondaryDv),source:drug.source||STREET_DRUG_SOURCE};
}
export function administerStreetDrug({state,clock,drugId,currentHumanity=0,rng=Math.random}){
  const drug=STREET_DRUGS[drugId];if(!drug)return{ok:false,reason:'unknown-drug'};const out=normalizeStreetDrugState(state),now=campaignMinute(clock);let course=out.active.find(x=>x.drugId===drugId&&Number(x.expiresAtMinute)>now);
  let humanityLoss=0,humanityRolls=[];
  if(drugId==='black_lace'){const r=nd(2,6,rng);humanityLoss=r.total;humanityRolls=r.rolls}
  if(drugId==='prime_time'){const r=nd(4,6,rng);humanityLoss=r.total;humanityRolls=r.rolls}
  if(course){course.expiresAtMinute=Number(course.expiresAtMinute)+drug.durationMinutes;course.doses=Number(course.doses||1)+1;course.temporaryHumanityLoss=Number(course.temporaryHumanityLoss||0)+humanityLoss;}
  else{course={drugId,startedAtMinute:now,expiresAtMinute:now+drug.durationMinutes,doses:1,temporaryHumanityLoss:humanityLoss};out.active.push(course)}
  out.history.push({type:'dose',drugId,atMinute:now,expiresAtMinute:course.expiresAtMinute,humanityLoss,humanityRolls});
  return{ok:true,state:out,drug,course:copy(course),humanityLoss,humanityRolls,newHumanity:Math.max(0,Number(currentHumanity||0)-humanityLoss),source:drug.source||STREET_DRUG_SOURCE};
}
export function streetDrugModifiers(state,clock){
  const s=normalizeStreetDrugState(state),now=campaignMinute(clock),activeIds=new Set(s.active.filter(x=>Number(x.expiresAtMinute)>now).map(x=>x.drugId));const statMods={REF:0,INT:0,COOL:0,WILL:0,MOVE:0},statMinimums={},skillMods={},flags={ignoreSeriouslyWounded:false,blueGlassFlashout:false,blueGlassImmuneToFlashout:false,paranoid:false,berserkerNoCriticalBonus:false,berserkerHalfWoundPenalties:false,berserkerHalfFacedownPenalty:false,sixgunSafeJackOut:false,sixgunExtraNetActionHumanityCost:0},initiativeMod=0;let netSpeedMod=0;
  for(const [drugId,addicted] of Object.entries(s.addictions))if(addicted){
    if(drugId==='black_lace'&&!activeIds.has(drugId))statMods.REF-=2;
    if(drugId==='boost')statMods.INT-=2;
    if(drugId==='smash')for(const id of SMASH_SKILLS)skillMods[id]=(skillMods[id]||0)-2;
    if(drugId==='synthcoke'&&!activeIds.has(drugId))statMods.REF-=2;
    if(drugId==='blue_glass'&&!activeIds.has(drugId))flags.blueGlassFlashout=true;
    if(drugId==='prime_time'&&!activeIds.has(drugId))statMods.COOL-=2;
    if(drugId==='sixgun'&&!activeIds.has(drugId))netSpeedMod-=2;
  }
  let initiative=initiativeMod;
  if(s.addictions.timewarp&&!activeIds.has('timewarp'))initiative-=2;
  for(const drugId of activeIds){
    if(drugId==='black_lace')flags.ignoreSeriouslyWounded=true;
    if(drugId==='boost')statMods.INT+=2;
    if(drugId==='smash')for(const id of SMASH_SKILLS)skillMods[id]=(skillMods[id]||0)+2;
    if(drugId==='synthcoke'){statMods.REF+=1;flags.paranoid=true}
    if(drugId==='blue_glass'){if(s.addictions.blue_glass)flags.blueGlassImmuneToFlashout=true;else flags.blueGlassFlashout=true}
    if(drugId==='berserker'){flags.berserkerNoCriticalBonus=true;flags.berserkerHalfWoundPenalties=true;flags.berserkerHalfFacedownPenalty=true}
    if(drugId==='prime_time'){statMods.COOL+=2;statMods.WILL+=2}
    if(drugId==='sixgun'){statMods.REF-=2;statMods.MOVE-=2;statMinimums.REF=1;statMinimums.MOVE=1;netSpeedMod+=2;flags.sixgunSafeJackOut=true;flags.sixgunExtraNetActionHumanityCost=1}
    if(drugId==='timewarp')initiative+=3;
  }
  return{activeIds:[...activeIds],statMods,statMinimums,skillMods,flags,initiativeMod:initiative,netSpeedMod,atMinute:now};
}
export function streetDrugFacedownPenalty({penalty=-2,state={},clock={}}={}){const mods=streetDrugModifiers(state,clock),base=Number(penalty||0);return mods.flags?.berserkerHalfFacedownPenalty?Math.trunc(base/2):base}
export function expireStreetDrugs({state,clock,will,resistTortureDrugs,currentHumanity=0,maxHumanity=Infinity,rng=Math.random}){
  const s=normalizeStreetDrugState(state),now=campaignMinute(clock),expired=s.active.filter(x=>Number(x.expiresAtMinute)<=now),remaining=s.active.filter(x=>Number(x.expiresAtMinute)>now);let humanity=Number(currentHumanity||0),returnedHumanity=0,permanentHumanityLoss=0;const resolutions=[];
  const cap=v=>Number.isFinite(Number(maxHumanity))?Math.min(Number(maxHumanity),v):v;
  for(const course of expired){
    const id=course.drugId,drug=STREET_DRUGS[id];if(!drug)continue;
    if(id==='prime_time'){const amount=Math.max(0,Number(course.temporaryHumanityLoss||0));humanity=cap(humanity+amount);returnedHumanity+=amount}
    if(s.addictions[id]){resolutions.push({drugId:id,alreadyAddicted:true,addicted:true,returnedHumanity:id==='prime_time'?Number(course.temporaryHumanityLoss||0):0});continue}
    const recovery=s.recovery?.[id],forcedRelapse=Number(recovery?.autoFailUntilMinute||0)>now;
    let check;
    if(forcedRelapse)check={ok:true,drugId:id,dv:drug.secondaryDv,success:false,addicted:true,autoFailAfterTherapy:true,recoveryUntilMinute:Number(recovery.autoFailUntilMinute),source:drug.source};
    else check=resolveSecondaryEffect({drugId:id,will,resistTortureDrugs,rng});
    if(!check.ok)continue;
    if(check.addicted){
      s.addictions[id]=true;
      if(id==='berserker'){humanity=Math.max(0,humanity-2);permanentHumanityLoss+=2;check.permanentDeathSavePenalty=1;check.permanentHumanityLoss=2}
      if(id==='prime_time'){humanity=Math.max(0,humanity-1);permanentHumanityLoss+=1;check.permanentHumanityLoss=1}
    }else if(id==='black_lace'){const amount=Math.max(0,Number(course.temporaryHumanityLoss||0));humanity=cap(humanity+amount);returnedHumanity+=amount}
    resolutions.push({...check,temporaryHumanityLoss:Number(course.temporaryHumanityLoss||0),returnedHumanity:id==='prime_time'?Number(course.temporaryHumanityLoss||0):(id==='black_lace'&&!check.addicted?Number(course.temporaryHumanityLoss||0):0)});
    s.history.push({type:'secondary',drugId:id,atMinute:now,total:check.total,dv:check.dv,addicted:check.addicted,permanentHumanityLoss:Number(check.permanentHumanityLoss||0),permanentDeathSavePenalty:Number(check.permanentDeathSavePenalty||0)});
  }
  s.active=remaining;return{ok:true,state:s,resolutions,newHumanity:humanity,returnedHumanity,permanentHumanityLoss,modifiers:streetDrugModifiers(s,clock),source:STREET_DRUG_SOURCE};
}
