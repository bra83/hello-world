import {rollD10Critical,rollDamage,rangeDv} from './cpred_combat.mjs';

export const CORE_COMPLETION_SOURCE={
  grapple:'Cyberpunk RED Core Rulebook Digital v1.25 pp.176-177',
  hazards:'Cyberpunk RED Core Rulebook Digital v1.25 pp.180-181 + Errata v1.25 p.3',
  reputation:'Cyberpunk RED Core Rulebook Digital v1.25 pp.193-194',
  improvement:'Cyberpunk RED Core Rulebook Digital v1.25 pp.408-411',
};
const n=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

export function resolveGrab({attackerDex=0,attackerBrawling=0,defenderDex=0,defenderBrawling=0,rng=Math.random}={}){
  const attackerRoll=rollD10Critical(rng),defenderRoll=rollD10Critical(rng);
  const attacker=n(attackerDex)+n(attackerBrawling)+attackerRoll.total;
  const defender=n(defenderDex)+n(defenderBrawling)+defenderRoll.total;
  const success=attacker>defender;
  return {ok:true,success,attacker,defender,attackerRoll,defenderRoll,actionPenalty:success?-2:0,defenderMoveLocked:success,twoHandedWeaponsBlocked:success,source:CORE_COMPLETION_SOURCE.grapple};
}
export function resolveChoke({body=0,targetHp=0,consecutiveRounds=1}={}){
  const damage=Math.max(0,Math.trunc(n(body))),beforeHp=n(targetHp),rawAfter=beforeHp-damage;
  let newHp=rawAfter,unconscious=Math.max(0,Math.trunc(n(consecutiveRounds,1)))>=3;
  if(beforeHp>1&&rawAfter<0){newHp=1;unconscious=true}
  return {ok:true,damage,directHpDamage:damage,beforeHp,newHp,unconscious,consecutiveRounds:Math.max(1,Math.trunc(n(consecutiveRounds,1))),ignoresArmor:true,ablatesArmor:false,criticalInjury:false,source:CORE_COMPLETION_SOURCE.grapple};
}
export function resolveThrowPerson({body=0,targetHp=0}={}){
  const damage=Math.max(0,Math.trunc(n(body))),beforeHp=n(targetHp);
  return {ok:true,damage,directHpDamage:damage,beforeHp,newHp:beforeHp-damage,ignoresArmor:true,ablatesArmor:false,criticalInjury:false,prone:true,grappleEnds:true,source:CORE_COMPLETION_SOURCE.grapple};
}
export function resolveThrownObject({dex=0,athletics=0,distance=0,targetDex=0,targetEvasion=0,targetCanDodge=false,damageDice=0,targetSp=0,targetHp=0,rng=Math.random}={}){
  const attackRoll=rollD10Critical(rng),attack=n(dex)+n(athletics)+attackRoll.total;
  let dv=rangeDv('grenadeLauncher',n(distance)),defenseRoll=null,defense='range';
  if(dv==null||n(distance)>25)return{ok:false,reason:'out-of-range',source:CORE_COMPLETION_SOURCE.grapple};
  if(targetCanDodge){defenseRoll=rollD10Critical(rng);dv=n(targetDex)+n(targetEvasion)+defenseRoll.total;defense='evasion'}
  const hit=attack>dv;if(!hit)return{ok:true,hit:false,attack,dv,attackRoll,defenseRoll,defense,source:CORE_COMPLETION_SOURCE.grapple};
  const damage=rollDamage(Math.max(0,Math.trunc(n(damageDice))),rng),penetration=Math.max(0,damage.total-n(targetSp));
  return{ok:true,hit:true,attack,dv,attackRoll,defenseRoll,defense,damage,armor:{penetration,directDamage:penetration,newHp:n(targetHp)-penetration,newSp:penetration>0?Math.max(0,n(targetSp)-1):n(targetSp),ablated:penetration>0},meleeThrownDoesNotHalveArmor:true,source:CORE_COMPLETION_SOURCE.grapple};
}

export function reputationAwareness({reputation=0,rng=Math.random}={}){
  const level=clamp(Math.trunc(n(reputation)),0,10),roll=Math.floor(rng()*10)+1;
  return{ok:true,level,roll,heardOf:roll<level,source:CORE_COMPLETION_SOURCE.reputation};
}
export function resolveFacedown({a={cool:0,reputation:0,negative:false,id:'a'},b={cool:0,reputation:0,negative:false,id:'b'},rng=Math.random}={}){
  const ar=rollD10Critical(rng),br=rollD10Critical(rng),arep=n(a.reputation)*(a.negative?-1:1),brep=n(b.reputation)*(b.negative?-1:1),at=n(a.cool)+arep+ar.total,bt=n(b.cool)+brep+br.total;
  if(at===bt)return{ok:true,tie:true,aTotal:at,bTotal:bt,aRoll:ar,bRoll:br,source:CORE_COMPLETION_SOURCE.reputation};
  const winner=at>bt?a:b,loser=at>bt?b:a;
  return{ok:true,tie:false,winnerId:winner.id,loserId:loser.id,aTotal:at,bTotal:bt,aRoll:ar,bRoll:br,loserPenalty:-2,penaltyEndsWhenLoserDefeatsWinner:true,source:CORE_COMPLETION_SOURCE.reputation};
}
export function normalizeReputation(value){const r=value&&typeof value==='object'?value:{};return{level:clamp(Math.trunc(n(r.level)),0,10),event:String(r.event||''),negative:!!r.negative}}
export function awardReputation(current,{level,event='',negative=false}={}){
  const before=normalizeReputation(current),candidate={level:clamp(Math.trunc(n(level)),0,10),event:String(event||''),negative:!!negative};
  if(candidate.level<before.level)return{changed:false,reputation:before,reason:'lower-level-does-not-replace'};
  return{changed:candidate.level>before.level||candidate.negative!==before.negative||candidate.event!==before.event,reputation:candidate,source:CORE_COMPLETION_SOURCE.reputation};
}

export function improvementCost({kind='skill',nextLevel=1,difficult=false}={}){
  const level=Math.trunc(n(nextLevel));if(level<1||level>10)return null;
  const multiplier=kind==='role'?60:(difficult?40:20);return multiplier*level;
}
export function spendSkillImprovement(character,{skillId,difficult=false}={}){
  if(!character||!skillId)return{ok:false,reason:'invalid-character-or-skill'};const current=Math.max(0,Math.trunc(n(character.skills?.[skillId]))),next=current+1;if(next>10)return{ok:false,reason:'max-level'};const cost=improvementCost({kind:'skill',nextLevel:next,difficult}),available=Math.max(0,Math.trunc(n(character.improvementPoints)));if(available<cost)return{ok:false,reason:'insufficient-ip',cost,available};character.skills=character.skills||{};character.skills[skillId]=next;character.improvementPoints=available-cost;return{ok:true,skillId,before:current,after:next,cost,remaining:character.improvementPoints,source:CORE_COMPLETION_SOURCE.improvement};
}
export function normalizeRoleHistory(character){
  const input=Array.isArray(character?.roleHistory)?character.roleHistory:[],rows=input.map(x=>({role:String(x.role||''),rank:clamp(Math.trunc(n(x.rank,1)),1,10),active:!!x.active})).filter(x=>x.role);
  if(!rows.length&&character?.role)rows.push({role:String(character.role),rank:clamp(Math.trunc(n(character.roleAbilityRank,4)),1,10),active:true});
  if(rows.length&&!rows.some(x=>x.active))rows[rows.length-1].active=true;let seen=false;for(const row of rows){if(row.active&&!seen)seen=true;else if(row.active)row.active=false}return rows;
}
export function spendRoleAbilityImprovement(character,{role=null}={}){
  if(!character)return{ok:false,reason:'invalid-character'};const rows=normalizeRoleHistory(character),active=rows.find(x=>x.active),target=rows.find(x=>x.role===(role||active?.role));if(!target)return{ok:false,reason:'role-not-found'};const next=target.rank+1;if(next>10)return{ok:false,reason:'max-rank'};const cost=improvementCost({kind:'role',nextLevel:next}),available=Math.max(0,Math.trunc(n(character.improvementPoints)));if(available<cost)return{ok:false,reason:'insufficient-ip',cost,available};target.rank=next;character.improvementPoints=available-cost;character.roleHistory=rows;if(target.active){character.role=target.role;character.roleAbilityRank=target.rank}return{ok:true,role:target.role,before:next-1,after:next,cost,remaining:character.improvementPoints,source:CORE_COMPLETION_SOURCE.improvement};
}
export function multiclassEligibility(character,newRole){const rows=normalizeRoleHistory(character),active=rows.find(x=>x.active);if(!active)return{ok:false,reason:'no-active-role'};if(!newRole||newRole===active.role)return{ok:false,reason:'same-or-invalid-role'};if(active.rank<4)return{ok:false,reason:'active-role-below-4',activeRole:active.role,activeRank:active.rank};const cost=improvementCost({kind:'role',nextLevel:1});return{ok:true,cost,activeRole:active.role,activeRank:active.rank}}
export function buyNewRole(character,newRole){const gate=multiclassEligibility(character,newRole);if(!gate.ok)return gate;const available=Math.max(0,Math.trunc(n(character.improvementPoints)));if(available<gate.cost)return{ok:false,reason:'insufficient-ip',cost:gate.cost,available};const rows=normalizeRoleHistory(character);for(const r of rows)r.active=false;let target=rows.find(x=>x.role===newRole);if(!target){target={role:newRole,rank:1,active:true};rows.push(target)}else{target.rank=Math.max(1,target.rank);target.active=true}character.improvementPoints=available-gate.cost;character.roleHistory=rows;character.role=newRole;character.roleAbilityRank=target.rank;return{ok:true,role:newRole,rank:target.rank,cost:gate.cost,remaining:character.improvementPoints,source:CORE_COMPLETION_SOURCE.improvement}}

export const FIRE_DAMAGE={mild:2,strong:4,deadly:6};
export const POISON_DV={mild:11,strong:13,deadly:15};
export const POISON_DICE={mild:1,strong:2,deadly:3};
export function resolveOnFire({intensity='mild',hp=0}={}){const damage=FIRE_DAMAGE[intensity]??FIRE_DAMAGE.mild;return{ok:true,intensity,directHpDamage:damage,newHp:n(hp)-damage,ignoresArmor:true,ablatesArmor:false,criticalInjury:false,source:CORE_COMPLETION_SOURCE.hazards}}
export function resolveDrowningTurn({body=0,hp=0,minutesWithoutAir=0}={}){const breathMinutes=Math.max(0,n(body)),drowning=n(minutesWithoutAir)>=breathMinutes,damage=drowning?Math.max(0,n(body)):0;return{ok:true,breathMinutes,drowning,directHpDamage:damage,newHp:n(hp)-damage,ignoresArmor:true,ablatesArmor:false,criticalInjury:false,source:CORE_COMPLETION_SOURCE.hazards}}
export function resolveVacuumTurn({body=0,hp=0,minutesWithoutAir=0,int=0,ref=0,dex=0,rng=Math.random}={}){const drown=resolveDrowningTurn({body,hp,minutesWithoutAir}),roll=rollDamage(1,rng),statDamage=drown.drowning?roll.total:0;return{...drown,vacuumStatDamage:statDamage,stats:{INT:Math.max(0,n(int)-statDamage),REF:Math.max(0,n(ref)-statDamage),DEX:Math.max(0,n(dex)-statDamage)},deadFromInt:drown.drowning&&n(int)-statDamage<=0,statDamageReversesAfterBreath:true}}
export function resolveElectrocution({hp=0,sp=0,rng=Math.random}={}){const damage=rollDamage(6,rng),penetration=Math.max(0,damage.total-n(sp));return{ok:true,damage,armor:{penetration,directDamage:penetration,newHp:n(hp)-penetration,newSp:penetration>0?Math.max(0,n(sp)-1):n(sp),ablated:penetration>0},repeatAtEndOfTurnUntilMovedAway:true,source:CORE_COMPLETION_SOURCE.hazards}}
export function resolveExposureDay({hp=0,properEquipment=false,rng=Math.random}={}){if(properEquipment)return{ok:true,damage:{rolls:[],total:0},newHp:n(hp),naturalHealingBlocked:false,source:CORE_COMPLETION_SOURCE.hazards};const damage=rollDamage(1,rng);return{ok:true,damage,directHpDamage:damage.total,newHp:n(hp)-damage.total,ignoresArmor:true,ablatesArmor:false,naturalHealingBlocked:true,source:CORE_COMPLETION_SOURCE.hazards}}
export function resolvePoisonIntensity({intensity='strong',resistBase=0,hp=0,rng=Math.random}={}){const key=POISON_DV[intensity]!=null?intensity:'strong',roll=rollD10Critical(rng),total=n(resistBase)+roll.total,dv=POISON_DV[key],affected=total<=dv,damage=affected?rollDamage(POISON_DICE[key],rng):{rolls:[],total:0,critical:false};return{ok:true,intensity:key,check:{roll,total,dv,success:!affected},affected,damage,directHpDamage:damage.total,newHp:n(hp)-damage.total,ignoresArmor:true,ablatesArmor:false,criticalInjury:false,source:CORE_COMPLETION_SOURCE.hazards}}
export function radiationFireIntensity(extreme=false){return extreme?'deadly':'mild'}
export function resolveFalling({meters=0,hp=0,sp=0,twoCyberlegs=false,athleticsTotal=null,rng=Math.random}={}){const distance=Math.max(0,n(meters));if(distance<10)return{ok:true,distance,damage:{rolls:[],total:0},newHp:n(hp),brokenLeg:false,source:CORE_COMPLETION_SOURCE.hazards};if(twoCyberlegs&&distance<=30)return{ok:true,distance,damage:{rolls:[],total:0},newHp:n(hp),brokenLeg:false,cyberlegsNegated:true,source:CORE_COMPLETION_SOURCE.hazards};const dice=2*Math.floor(distance/10),damage=rollDamage(dice,rng),penetration=Math.max(0,damage.total-n(sp)),brokenLeg=athleticsTotal==null?true:n(athleticsTotal)<=15;return{ok:true,distance,damage,armor:{penetration,directDamage:penetration,newHp:n(hp)-penetration,newSp:penetration>0?Math.max(0,n(sp)-1):n(sp),ablated:penetration>0},newHp:n(hp)-penetration,brokenLeg,criticalInjury:brokenLeg?'broken-leg':null,source:CORE_COMPLETION_SOURCE.hazards}}
