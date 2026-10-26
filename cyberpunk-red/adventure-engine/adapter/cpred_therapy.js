import {maximumHumanity} from './cpred_humanity.js';
// Cyberpunk RED Core v1.25 pp.229-230 — Therapy.
export const THERAPY_SOURCE='Cyberpunk RED Core Rulebook Digital v1.25 pp.229-230';
export const THERAPY_DURATION_MINUTES=7*24*60;
// Operational calendar projection: Core says “1 year”; Motor Barbara exposes abstract elapsed time, not calendar years.
export const ADDICTION_RECOVERY_WINDOW_MINUTES=365*24*60;
export const THERAPIES={
  addiction:{id:'addiction',name:'Addiction',dv:15,cost:1000,materials:500,humanityDice:0},
  humanity_standard:{id:'humanity_standard',name:'Standard Humanity Loss',dv:15,cost:500,materials:100,humanityDice:2},
  humanity_extreme:{id:'humanity_extreme',name:'Extreme Humanity Loss',dv:17,cost:1000,materials:500,humanityDice:4},
};
function d(sides,rng){return Math.floor(rng()*sides)+1}
function criticalD10(rng){const natural=d(10,rng);if(natural===10){const extra=d(10,rng);return{natural,extra,total:natural+extra,critical:'success'}}if(natural===1){const extra=d(10,rng);return{natural,extra,total:natural-extra,critical:'failure'}}return{natural,extra:0,total:natural,critical:null}}
function copy(v){return JSON.parse(JSON.stringify(v??{}))}
export function therapyDefinition(id){return THERAPIES[id]||null}
export function startTherapy({therapyId,clinicianId,patientId,clinicianRole,startedAtMinute,addictionDrugId=null}={}){
  const def=THERAPIES[therapyId];if(!def)return{ok:false,reason:'unknown-therapy'};
  if(String(clinicianRole||'').toLowerCase()!=='medtech')return{ok:false,reason:'medtech-required'};
  if(!clinicianId||!patientId||String(clinicianId)===String(patientId))return{ok:false,reason:'self-therapy-forbidden'};
  if(!Number.isInteger(Number(startedAtMinute))||Number(startedAtMinute)<0)return{ok:false,reason:'invalid-start-time'};
  if(therapyId==='addiction'&&!addictionDrugId)return{ok:false,reason:'addiction-source-required'};
  return{ok:true,plan:{therapyId,clinicianId:String(clinicianId),patientId:String(patientId),startedAtMinute:Number(startedAtMinute),completesAtMinute:Number(startedAtMinute)+THERAPY_DURATION_MINUTES,addictionDrugId:addictionDrugId||null,dv:def.dv,cost:def.cost,materials:def.materials},source:THERAPY_SOURCE};
}
export function resolveTherapy({plan,nowMinute,tech,medicalTech,currentHumanity=0,maxHumanity=null,baseEmp=null,cyberware=[],streetDrugState={},rng=Math.random}={}){
  const def=THERAPIES[plan?.therapyId];if(!def)return{ok:false,reason:'unknown-therapy'};
  if(!plan?.clinicianId||!plan?.patientId||String(plan.clinicianId)===String(plan.patientId))return{ok:false,reason:'self-therapy-forbidden'};
  if(Number(nowMinute)<Number(plan.completesAtMinute))return{ok:false,reason:'therapy-not-complete',remainingMinutes:Number(plan.completesAtMinute)-Number(nowMinute)};
  const roll=criticalD10(rng),total=Number(tech||0)+Number(medicalTech||0)+roll.total,success=total>def.dv;
  const state=copy(streetDrugState);state.active=Array.isArray(state.active)?state.active:[];state.addictions=state.addictions&&typeof state.addictions==='object'?state.addictions:{};state.recovery=state.recovery&&typeof state.recovery==='object'?state.recovery:{};state.history=Array.isArray(state.history)?state.history:[];
  let humanity=Math.max(0,Number(currentHumanity||0)),humanityRegained=0;
  if(success&&def.id==='addiction'){
    const drugId=String(plan.addictionDrugId||'');if(!drugId)return{ok:false,reason:'addiction-source-required'};
    delete state.addictions[drugId];
    state.recovery[drugId]={cleanedAtMinute:Number(nowMinute),autoFailUntilMinute:Number(nowMinute)+ADDICTION_RECOVERY_WINDOW_MINUTES,calendarProjection:'365-day-operational-year'};
  }
  if(success&&def.humanityDice>0){
    for(let i=0;i<def.humanityDice;i++)humanityRegained+=d(6,rng);
    const cap=maxHumanity===null||maxHumanity===undefined?maximumHumanity({baseEmp:Number(baseEmp||0),cyberware}):Math.max(0,Number(maxHumanity||0));humanity=Math.min(cap,humanity+humanityRegained);humanityRegained=Math.max(0,humanity-Number(currentHumanity||0));
  }
  state.history.push({type:'therapy',therapyId:def.id,atMinute:Number(nowMinute),success,total,dv:def.dv,materialsConsumed:def.materials,materialsLost:success?0:def.materials,addictionDrugId:plan.addictionDrugId||null,humanityRegained});
  return{ok:true,success,total,dv:def.dv,roll,state,newHumanity:humanity,humanityRegained,materialsConsumed:def.materials,materialsLost:success?0:def.materials,cost:def.cost,source:THERAPY_SOURCE};
}
