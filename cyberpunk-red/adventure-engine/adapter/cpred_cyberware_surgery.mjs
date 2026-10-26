import {humanityLossForInstallation,humanityProfile} from './cpred_humanity.mjs';
import {validateCyberwarePrerequisites} from './cpred_cyberware_catalog.mjs';
import {validateCyberwareSlotInstall} from './cpred_cyberware_slots.mjs';
export const CYBERWARE_SURGERY_SOURCE='Cyberpunk RED Core Rulebook Digital v1.25 pp.110-111, 226';
export const INSTALLATION_LEVELS={mall:{dv:13,hospitalCost:100},clinic:{dv:15,hospitalCost:500},hospital:{dv:17,hospitalCost:1000}};
function n(v,d=0){const x=Number(v);return Number.isFinite(x)?x:d}
function d10(rng){const natural=Math.floor(rng()*10)+1;if(natural===10){const extra=Math.floor(rng()*10)+1;return{natural,extra,total:natural+extra,critical:'success'}}if(natural===1){const extra=Math.floor(rng()*10)+1;return{natural,extra,total:natural-extra,critical:'failure'}}return{natural,extra:0,total:natural,critical:null}}
function copy(v){return JSON.parse(JSON.stringify(v??{}))}
export function installationDefinition(level){return INSTALLATION_LEVELS[String(level||'').toLowerCase()]||null}
function validateCommon({item,relatedCriticalInjury=false,character}={}){
  if(!item?.id)return{ok:false,reason:'cyberware-required'};
  const level=String(item.typicalInstall||item.install||'').toLowerCase(),def=installationDefinition(level);if(!def)return{ok:false,reason:'invalid-installation-level'};
  if(relatedCriticalInjury)return{ok:false,reason:'related-critical-injury-blocks-installation'};
  const current=Array.isArray(character?.cyberware)?character.cyberware:[];
  if(item.minBody!=null&&Number(character?.stats?.BODY||0)<Number(item.minBody))return{ok:false,reason:'body-requirement',minBody:Number(item.minBody)};
  const prereq=validateCyberwarePrerequisites(current,item);if(!prereq.ok)return prereq;
  if(item.onePerFoundation===true&&item.targetFoundationInstanceId&&current.some(x=>x?.installed!==false&&x.id===item.id&&String(x.targetFoundationInstanceId||'')===String(item.targetFoundationInstanceId)))return{ok:false,reason:'one-per-foundation'};
  const slot=validateCyberwareSlotInstall({installed:current,candidate:item,targetFoundationInstanceId:item.targetFoundationInstanceId||null});if(!slot.ok)return slot;
  const targetFoundationInstanceId=item.targetFoundationInstanceId||slot.foundationInstanceId||null;
  if(item.targetBorgwareRequired===true){const target=current.find(x=>x?.installed!==false&&x?.borgware===true&&String(x.instanceId||x.id)===String(item.targetBorgwareInstanceId||''));if(!target)return{ok:false,reason:'borgware-target-required'}}
  if(item.onePerFoundation===true&&targetFoundationInstanceId&&current.some(x=>x?.installed!==false&&x.id===item.id&&String(x.targetFoundationInstanceId||'')===String(targetFoundationInstanceId)))return{ok:false,reason:'one-per-foundation'};
  if(item.sameArmAsCyberdeck===true&&targetFoundationInstanceId){const decks=current.filter(x=>x?.installed!==false&&x.id==='cyberarm_cyberdeck'),same=decks.some(x=>String(x.targetFoundationInstanceId||'')===String(targetFoundationInstanceId));if(!same&&!(decks.length===1&&current.filter(x=>x?.installed!==false&&x.foundation===true&&(x.id==='cyberarm'||x.foundationAlias==='cyberarm')).length===1))return{ok:false,reason:'same-arm-cyberdeck-required'}}
  return{ok:true,level,def,current,slot,targetFoundationInstanceId};
}
export function validateCyberwareInstallRequest({item,clinicianId,patientId,clinicianRole,relatedCriticalInjury=false,character}={}){
  const common=validateCommon({item,relatedCriticalInjury,character});if(!common.ok)return common;
  if(String(clinicianRole||'').toLowerCase()!=='medtech')return{ok:false,reason:'medtech-required'};
  if(!clinicianId||!patientId)return{ok:false,reason:'clinician-and-patient-required'};
  if(String(clinicianId)===String(patientId)&&common.level!=='mall')return{ok:false,reason:'self-install-only-mall'};
  return{ok:true,mode:'medtech-surgery',level:common.level,dv:common.def.dv,hospitalCost:common.def.hospitalCost,elapsedMinutes:240,source:CYBERWARE_SURGERY_SOURCE};
}
export function validateProviderInstallation({item,relatedCriticalInjury=false,character,purchasedWithInstallation=true}={}){
  const common=validateCommon({item,relatedCriticalInjury,character});if(!common.ok)return common;
  return{ok:true,mode:'provider',level:common.level,dv:null,extraInstallationCost:purchasedWithInstallation?0:common.def.hospitalCost,purchasedWithInstallation:Boolean(purchasedWithInstallation),elapsedMinutes:null,source:CYBERWARE_SURGERY_SOURCE};
}
function applyInstalledCyberware({item,character,rng=Math.random}={}){
  const out=copy(character||{});out.cyberware=Array.isArray(out.cyberware)?out.cyberware:[];
  const loss=humanityLossForInstallation({atCharacterGeneration:false,presetLoss:n(item.humanityLossPreset),postGenerationLoss:item.humanityLossDice??item.humanityLossPostGeneration??'0',rng});
  const ordinal=out.cyberware.filter(x=>x?.id===item.id).length+1,instanceId=String(item.instanceId||`${item.id}-${ordinal}`);const installed={...copy(item),instanceId,humanityLossApplied:loss,installed:true};out.cyberware.push(installed);
  out.derived=out.derived||{};const baseEmp=n(out.stats?.EMP,out.derived?.baseEmp);const currentHumanity=n(out.derived?.humanity,baseEmp*10);const profile=humanityProfile({baseEmp,currentHumanity:currentHumanity-loss,cyberware:out.cyberware});
  out.derived.humanity=profile.humanity;out.derived.maxHumanity=profile.maxHumanity;out.derived.currentEmp=profile.emp;out.derived.cyberpsychosis=profile.level;out.derived.gmControl=profile.gmControl;
  return{character:out,humanityLoss:loss,installed,profile};
}
export function resolveProviderInstallation({item,relatedCriticalInjury=false,character,purchasedWithInstallation=true,rng=Math.random}={}){
  const valid=validateProviderInstallation({item,relatedCriticalInjury,character,purchasedWithInstallation});if(!valid.ok)return valid;
  const installItem=valid.slot?.foundationInstanceId?{...item,targetFoundationInstanceId:valid.slot.foundationInstanceId}:item;const applied=applyInstalledCyberware({item:installItem,character,rng});
  return{ok:true,success:true,mode:'provider',level:valid.level,dv:null,roll:null,destroyed:false,elapsedMinutes:null,extraInstallationCost:valid.extraInstallationCost,purchasedWithInstallation:valid.purchasedWithInstallation,...applied,source:CYBERWARE_SURGERY_SOURCE};
}
export function resolveCyberwareInstallation({item,clinicianId,patientId,clinicianRole,relatedCriticalInjury=false,tech=0,surgery=0,character,rng=Math.random}={}){
  const valid=validateCyberwareInstallRequest({item,clinicianId,patientId,clinicianRole,relatedCriticalInjury,character});if(!valid.ok)return valid;
  const roll=d10(rng),total=n(tech)+n(surgery)+roll.total,success=total>valid.dv;
  if(!success)return{ok:true,success:false,mode:'medtech-surgery',total,dv:valid.dv,roll,destroyed:true,elapsedMinutes:120,humanityLoss:0,character:copy(character),source:CYBERWARE_SURGERY_SOURCE};
  const installItem=valid.slot?.foundationInstanceId?{...item,targetFoundationInstanceId:valid.slot.foundationInstanceId}:item;const applied=applyInstalledCyberware({item:installItem,character,rng});
  return{ok:true,success:true,mode:'medtech-surgery',total,dv:valid.dv,roll,destroyed:false,elapsedMinutes:240,...applied,source:CYBERWARE_SURGERY_SOURCE};
}
