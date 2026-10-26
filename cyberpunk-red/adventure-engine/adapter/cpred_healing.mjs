// Cyberpunk RED Core v1.25 pp.220-223 — wound healing time contracts.
import {woundState} from './cpred_combat.mjs';
export const HEALING_SOURCE='Cyberpunk RED Core Rulebook Digital v1.25 pp.220-223';
export function resolveNaturalHealingDay({hp,maxHp,body,stabilized,restedFullDay,exerted=false}={}){
  const before=Number(hp||0),maximum=Math.max(1,Number(maxHp||1));
  if(before>=maximum)return{ok:true,healing:0,newHp:maximum,stabilized:!!stabilized,reason:'full-hp',source:HEALING_SOURCE};
  if(!stabilized)return{ok:false,reason:'not-stabilized',healing:0,newHp:before,stabilized:false,source:HEALING_SOURCE};
  if(!restedFullDay||exerted)return{ok:true,reason:'day-not-rested',healing:0,newHp:before,stabilized:false,reopened:true,source:HEALING_SOURCE};
  const healing=Math.min(Math.max(0,Number(body||0)),maximum-before),newHp=before+healing;
  return{ok:true,healing,newHp,stabilized:true,reopened:false,woundState:woundState(newHp,maximum),source:HEALING_SOURCE};
}
export function fullRestDaysCrossed({beforeMinute,afterMinute,resting=false}={}){
  if(!resting)return 0;const a=Math.max(0,Math.floor(Number(beforeMinute)||0)),b=Math.max(a,Math.floor(Number(afterMinute)||a));return Math.max(0,Math.floor((b-a)/1440));
}
