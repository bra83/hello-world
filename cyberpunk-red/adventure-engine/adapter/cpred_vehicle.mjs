import {rollD10Critical,rollDamage,CRITICAL_INJURIES} from './cpred_combat.mjs';

export const VEHICLE_RULE_SOURCE='Cyberpunk RED Core Rulebook v1.25 pp.190-192';
export const VEHICLES={
  roadbike:{id:'roadbike',name:'Roadbike',kind:'land',sdp:35,seats:2,combatMove:20,narrativeMph:100,narrativeKph:161,cost:20000},
  superbike:{id:'superbike',name:'Superbike',kind:'land',sdp:35,seats:2,combatMove:60,narrativeMph:300,narrativeKph:483,cost:100000},
  compactGroundcar:{id:'compactGroundcar',name:'Compact Groundcar',kind:'land',sdp:50,seats:4,combatMove:20,narrativeMph:100,narrativeKph:161,cost:30000},
  highPerformanceGroundcar:{id:'highPerformanceGroundcar',name:'High Performance Groundcar',kind:'land',sdp:50,seats:4,combatMove:40,narrativeMph:200,narrativeKph:322,cost:50000},
  superGroundcar:{id:'superGroundcar',name:'Super Groundcar',kind:'land',sdp:50,seats:2,combatMove:60,narrativeMph:300,narrativeKph:483,cost:100000},
};
export const MANEUVER_DV={swerve:13,sharpTurn:13,emergencyStop:13,bootlegTurn:17,jump:17,airLanding:13,aerobatic:17};
export function resolveBasicDriving({ref,controlSkill,rng=Math.random}){const base=Number(ref||0)+Number(controlSkill||0);if(base>9)return{ok:true,automatic:true,success:true,base,dv:null,consumesAction:false,lostControl:false};const roll=rollD10Critical(rng),total=base+roll.total,success=total>10;return{ok:true,automatic:false,success,base,roll,total,dv:10,consumesAction:true,lostControl:!success}}
export function resolveVehicleManeuver({ref,controlSkill,maneuver,rng=Math.random}){const dv=MANEUVER_DV[maneuver];if(!dv)return{ok:false,reason:'unknown-maneuver'};const roll=rollD10Critical(rng),total=Number(ref||0)+Number(controlSkill||0)+roll.total,success=total>dv;return{ok:true,maneuver,dv,roll,total,success,lostControl:!success,consumesAction:true,consumesMove:true}}
export function resolveRamming({vehicleSdp,targetHp,targetDex=0,targetEvasion=0,targetCanDodge=false,rng=Math.random}){if(targetCanDodge){const dodgeRoll=rollD10Critical(rng),dodgeTotal=Number(targetDex)+Number(targetEvasion)+dodgeRoll.total;if(dodgeTotal>13)return{ok:true,dodged:true,dodgeRoll,dodgeTotal,dv:13,damage:0,newVehicleSdp:Number(vehicleSdp),newTargetHp:Number(targetHp),whiplash:false}}const damage=rollDamage(6,rng),amount=damage.total;return{ok:true,dodged:false,damage:amount,damageRoll:damage,newVehicleSdp:Math.max(0,Number(vehicleSdp)-amount),newTargetHp:Number(targetHp)-amount,whiplash:true,criticalInjury:{...CRITICAL_INJURIES.head[8],id:'whiplash',location:'head',source:'CP:R Core v1.25 p.192'}}}
export function vehicleRepairBand({sdp,maxSdp}){const lost=Math.max(0,Number(maxSdp)-Number(sdp));if(Number(sdp)<1)return{kind:'destroyed',dv:17,time:'1 semana'};if(lost<=Math.max(1,Number(maxSdp)*.25))return{kind:'minor',dv:9,time:'3 horas'};return{kind:'major',dv:13,time:'1 dia'}}
