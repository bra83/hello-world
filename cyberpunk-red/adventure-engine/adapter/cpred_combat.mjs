// Cyberpunk RED combat subset grounded in the user's Core Rulebook v1.25, Friday Night Firefight.
// Rules kept in adapter layer; UI only consumes these functions.
export const RANGE_BANDS=[6,12,25,50,100,200,400,800];
export const SINGLE_SHOT_DV={
  pistol:[13,15,20,25,30,30,null,null],
  smg:[15,13,15,20,25,25,30,null],
  shotgun:[13,15,20,25,30,35,null,null],
  assaultRifle:[17,16,15,13,15,20,25,30],
  sniperRifle:[30,25,25,20,15,16,17,20],
  bow:[15,13,15,17,20,22,null,null],
  grenadeLauncher:[16,15,15,17,20,22,25,null],
  rocketLauncher:[17,16,15,15,20,20,25,30],
};
export const AUTOFIRE_DV={smg:[20,17,20,25,30],assaultRifle:[22,20,17,20,25]};
export const WEAPONS={
  mediumPistol:{label:'Pistola Média',type:'pistol',skill:'handgun',damageDice:2,rof:2,mag:12,hands:1},
  airPistol:{label:'Air Pistol',type:'pistol',skill:'handgun',damageDice:0,rof:2,mag:12,hands:1,ammoType:'paintball',exotic:true,nonDamage:true},
  heavyPistol:{label:'Pistola Pesada',type:'pistol',skill:'handgun',damageDice:3,rof:2,mag:8,hands:1},
  veryHeavyPistol:{label:'Pistola Muito Pesada',type:'pistol',skill:'handgun',damageDice:4,rof:1,mag:8,hands:1},
  smg:{label:'SMG',type:'smg',skill:'handgun',damageDice:2,rof:1,mag:30,autofire:3,suppressive:true,hands:1},
  heavySmg:{label:'SMG Pesada',type:'smg',skill:'handgun',damageDice:3,rof:1,mag:40,autofire:3,suppressive:true,hands:2},
  shotgun:{label:'Escopeta (Slug)',type:'shotgun',skill:'shoulder_arms',damageDice:5,rof:1,mag:4,hands:2},
  assaultRifle:{label:'Rifle de Assalto',type:'assaultRifle',skill:'shoulder_arms',damageDice:5,rof:1,mag:25,autofire:4,suppressive:true,hands:2},
  sniperRifle:{label:'Rifle de Precisão',type:'sniperRifle',skill:'shoulder_arms',damageDice:5,rof:1,mag:4,hands:2},
  bow:{label:'Arco / Besta',type:'bow',skill:'archery',damageDice:4,rof:1,mag:1,hands:2},
  grenadeLauncher:{label:'Lança-granadas',type:'grenadeLauncher',skill:'heavy_weapons',damageDice:6,rof:1,mag:2,explosive:true,ammoType:'grenade',hands:2},
  rocketLauncher:{label:'Lança-foguetes',type:'rocketLauncher',skill:'heavy_weapons',damageDice:8,rof:1,mag:1,explosive:true,ammoType:'rocket',hands:2},
};
export const MELEE_WEAPONS={
  lightMelee:{label:'Arma Corpo a Corpo Leve',type:'melee',skill:'melee',damageDice:1,rof:2,armorRule:'half-sp',hands:1},
  mediumMelee:{label:'Arma Corpo a Corpo Média',type:'melee',skill:'melee',damageDice:2,rof:2,armorRule:'half-sp',hands:1},
  heavyMelee:{label:'Arma Corpo a Corpo Pesada',type:'melee',skill:'melee',damageDice:3,rof:2,armorRule:'half-sp',hands:2},
  veryHeavyMelee:{label:'Arma Corpo a Corpo Muito Pesada',type:'melee',skill:'melee',damageDice:4,rof:1,armorRule:'half-sp',hands:2},
};
export const CRITICAL_INJURIES={
  body:{
    2:{id:'dismembered-arm',label:'Braço decepado',deathPenalty:1,dropHeld:true},
    3:{id:'dismembered-hand',label:'Mão decepada',deathPenalty:1,dropHeld:true},
    4:{id:'collapsed-lung',label:'Pulmão colapsado',move:-2,deathPenalty:1},
    5:{id:'broken-ribs',label:'Costelas quebradas',moveTrauma:true},
    6:{id:'broken-arm',label:'Braço quebrado',dropHeld:true},
    7:{id:'foreign-object-body',label:'Objeto estranho',moveTrauma:true},
    8:{id:'broken-leg',label:'Perna quebrada',move:-4},
    9:{id:'torn-muscle',label:'Músculo rompido',melee:-2},
    10:{id:'spinal-injury',label:'Lesão espinhal',skipNextAction:true,deathPenalty:1},
    11:{id:'crushed-fingers',label:'Dedos esmagados',handActions:-4},
    12:{id:'dismembered-leg',label:'Perna decepada',move:-6,cannotDodge:true,deathPenalty:1},
  },
  head:{
    2:{id:'lost-eye',label:'Olho perdido',ranged:-4,vision:-4,deathPenalty:1},
    3:{id:'brain-injury',label:'Lesão cerebral',actions:-2,deathPenalty:1},
    4:{id:'damaged-eye',label:'Olho danificado',ranged:-2,vision:-2},
    5:{id:'concussion',label:'Concussão',actions:-2},
    6:{id:'broken-jaw',label:'Mandíbula quebrada',speech:-4},
    7:{id:'foreign-object-head',label:'Objeto estranho',moveTrauma:true},
    8:{id:'whiplash',label:'Chicote cervical',deathPenalty:1},
    9:{id:'cracked-skull',label:'Crânio rachado',headMultiplier:3,deathPenalty:1},
    10:{id:'damaged-ear',label:'Ouvido danificado',hearing:-2,moveLocksNext:true},
    11:{id:'crushed-windpipe',label:'Traqueia esmagada',cannotSpeak:true,deathPenalty:1},
    12:{id:'lost-ear',label:'Orelha perdida',hearing:-4,moveLocksNext:true,deathPenalty:1},
  },
};
export function bandIndex(distance){for(let i=0;i<RANGE_BANDS.length;i++)if(distance<=RANGE_BANDS[i])return i;return -1}
export function rangeDv(type,distance,{autofire=false}={}){
  const idx=bandIndex(distance);if(idx<0)return null;
  const table=autofire?AUTOFIRE_DV[type]:SINGLE_SHOT_DV[type];
  if(!table||idx>=table.length)return null;return table[idx];
}
export function d(sides=10,rng=Math.random){return 1+Math.floor(rng()*sides)}
export function rollD10Critical(rng=Math.random){
  const first=d(10,rng);let extra=0,total=first,kind='normal';
  if(first===10){extra=d(10,rng);total=10+extra;kind='critical-success'}
  else if(first===1){extra=d(10,rng);total=1-extra;kind='critical-failure'}
  return {first,extra,total,kind};
}
export function attackRollD10(rng=Math.random,recoverFumble=false){const roll=rollD10Critical(rng);if(recoverFumble&&roll.first===1)return{...roll,extra:0,total:1,kind:'fumble-recovered'};return roll}
export function rollDamage(dice,rng=Math.random){const rolls=Array.from({length:dice},()=>d(6,rng));return {rolls,total:rolls.reduce((a,b)=>a+b,0),critical:rolls.filter(x=>x===6).length>=2}}
export function rollCriticalInjury({location='body',current=[],rng=Math.random}={}){
  const table=CRITICAL_INJURIES[location]||CRITICAL_INJURIES.body,owned=new Set((current||[]).map(x=>typeof x==='string'?x:x?.id));let rolled=2,row=table[2];
  for(let attempt=0;attempt<40;attempt++){rolled=d(6,rng)+d(6,rng);row=table[rolled];if(!owned.has(row.id))break}
  return {...row,roll:rolled,location,source:'CP:R Core v1.25 pp.187-188'};
}
export function injuryModifiers(injuries=[]){
  const out={actions:0,ranged:0,melee:0,move:0,vision:0,hearing:0,speech:0,handActions:0,deathPenalty:0,cannotDodge:false,cannotSpeak:false,skipNextAction:false,dropHeld:false,moveTrauma:0,moveLocksNext:false,headMultiplier:2};
  for(const injury of injuries||[]){const row=typeof injury==='string'?Object.values(CRITICAL_INJURIES.body).concat(Object.values(CRITICAL_INJURIES.head)).find(x=>x.id===injury):injury;if(!row)continue;for(const key of ['actions','ranged','melee','move','vision','hearing','speech','handActions','deathPenalty'])out[key]+=Number(row[key]||0);out.cannotDodge||=!!row.cannotDodge;out.cannotSpeak||=!!row.cannotSpeak;out.skipNextAction||=!!row.skipNextAction;out.dropHeld||=!!row.dropHeld;out.moveTrauma+=row.moveTrauma?1:0;out.moveLocksNext||=!!row.moveLocksNext;if(row.headMultiplier)out.headMultiplier=Math.max(out.headMultiplier,row.headMultiplier)}return out;
}
export function applyArmor({damage,sp,hp,head=false,critical=false}){
  const penetration=Math.max(0,damage-sp);const doubled=head?penetration*2:penetration;const bonus=critical?5:0;
  return {penetration,directDamage:doubled+bonus,newHp:hp-doubled-bonus,newSp:penetration>0?Math.max(0,sp-1):sp,ablated:penetration>0,criticalBonus:bonus};
}
export function resolveSingleShot({ref,skill,distance,weapon,targetSp=11,targetHp=35,aimedHead=false,targetInjuries=[],defender=null,ammoEffect='basic',smartEligible=true,damageBonus=0,recoverFumble=false,rng=Math.random}){
  const w=typeof weapon==='string'?WEAPONS[weapon]:weapon;if(!w)throw new Error('Arma desconhecida');if(ammoEffect==='smart'&&!smartEligible)return{ok:false,reason:'targeting-scope-required'};
  let dv=rangeDv(w.type,distance),defenseRoll=null,defense='range';if(dv==null)return {ok:false,reason:'out-of-range'};if(defender?.dodge){defenseRoll=rollD10Critical(rng);dv=Number(defender.dex||0)+Number(defender.evasion||0)+defenseRoll.total;defense='evasion'}
  const roll=attackRollD10(rng,recoverFumble),qualityBonus=w.quality==='excellent'?1:0,attack=ref+skill+roll.total+qualityBonus;if((w.quality==='poor'||w.poorReliability===true)&&roll.first===1)return{ok:true,hit:false,dv,attack,roll,weapon:w,defense,defenseRoll,smartRetry:null,ammoEffect,malfunction:true,qualityBonus};let hit=attack>dv,smartRetry=null;
  if(!hit&&ammoEffect==='smart'&&(dv-attack)<=4){let retryDv=dv,retryDefenseRoll=null;if(defense==='evasion'){retryDefenseRoll=rollD10Critical(rng);retryDv=Number(defender.dex||0)+Number(defender.evasion||0)+retryDefenseRoll.total}const d10=d(10,rng),retryAttack=10+d10;hit=retryAttack>retryDv;smartRetry={d10,attack:retryAttack,dv:retryDv,hit,defenseRoll:retryDefenseRoll}}
  if(!hit)return {ok:true,hit:false,dv,attack,roll,weapon:w,defense,defenseRoll,smartRetry,ammoEffect};
  const nondamage=['biotoxin','emp','flashbang','poison','sleep','smoke','teargas','paint','acidPaint'].includes(ammoEffect);if(nondamage)return{ok:true,hit:true,dv,attack,roll,weapon:w,defense,defenseRoll,smartRetry,ammoEffect,nonDamage:true,armor:{penetration:0,directDamage:0,newHp:targetHp,newSp:targetSp,ablated:false,criticalBonus:0},criticalInjury:null,damage:{rolls:[],total:0,critical:false},mortallyWounded:targetHp<1};
  const dmg=rollDamage(w.damageDice,rng),spotBonus=Math.max(0,Number(damageBonus)||0),rawDamage=dmg.total+spotBonus,mortallyWounded=targetHp<1,mods=injuryModifiers(targetInjuries),headMultiplier=aimedHead?mods.headMultiplier:1,ignoreThreshold=Number(w.ignoreArmorBelowSp||0),armorIgnored=ignoreThreshold>0&&Number(targetSp)<ignoreThreshold,effectiveSp=armorIgnored?0:Number(targetSp),penetration=Math.max(0,rawDamage-effectiveSp),locationDamage=penetration*headMultiplier,criticalRaw=dmg.critical||(mortallyWounded&&locationDamage>0),critical=w.noCriticalInjury?false:criticalRaw,bonus=critical?5:0,armor={penetration,directDamage:locationDamage+bonus,newHp:targetHp-locationDamage-bonus,newSp:armorIgnored?Number(targetSp):(penetration>0?Math.max(0,targetSp-1):targetSp),ablated:armorIgnored?false:penetration>0,criticalBonus:bonus,armorIgnored,ignoreArmorBelowSp:ignoreThreshold||null},criticalInjury=critical?rollCriticalInjury({location:aimedHead?'head':'body',current:targetInjuries,rng}):null;
  if(w.noAblation){armor.newSp=Number(targetSp);armor.ablated=false}
  let unconscious=false;if(w.floorHpAtOne&&Number(armor.newHp)<1){armor.newHp=1;armor.directDamage=Math.max(0,Number(targetHp)-1);unconscious=Boolean(w.unconsciousAtFloor)}
  return applySpecialAmmoToDamage({effect:ammoEffect,damageResult:{ok:true,hit:true,dv,attack,roll,damage:{...dmg,baseTotal:dmg.total,total:rawDamage,spotWeaknessBonus:spotBonus},rawDamage,armor,criticalInjury,mortallyWounded,unconscious,weapon:w,aimedHead,defense,defenseRoll,smartRetry},targetHp,targetSp,targetInjuries,rng});
}
export function resolveRofAttack({ref,skill,distance,weapon,targetSp=11,targetHp=35,aimedHead=false,targetInjuries=[],defender=null,ammoAvailable=Infinity,ammoEffect='basic',smartEligible=true,damageBonus=0,recoverFumble=false,rng=Math.random}){
  const w=typeof weapon==='string'?WEAPONS[weapon]:weapon;if(!w)throw new Error('Arma desconhecida');
  const requested=aimedHead?1:Number(w.rof||1),shots=Math.max(0,Math.min(requested,Math.floor(Number(ammoAvailable))));
  if(shots<1)return{ok:false,reason:'no-ammo',shots:[],ammoSpent:0,targetSp,targetHp};
  const results=[];let sp=targetSp,hp=targetHp,injuries=[...(targetInjuries||[])],bonusAvailable=Math.max(0,Number(damageBonus)||0);
  for(let i=0;i<shots;i++){
    const result=resolveSingleShot({ref,skill,distance,weapon:w,targetSp:sp,targetHp:hp,aimedHead,targetInjuries:injuries,defender,ammoEffect,smartEligible,damageBonus:bonusAvailable,recoverFumble,rng});
    results.push(result);if(result.ok===false)return{ok:false,reason:result.reason,shots:results,ammoSpent:i,targetSp:sp,targetHp:hp};
    if(result.hit){if(bonusAvailable>0)bonusAvailable=0;sp=result.armor.newSp;hp=result.armor.newHp;if(result.criticalInjury)injuries.push(result.criticalInjury);if(result.expansiveCriticalInjury)injuries.push(result.expansiveCriticalInjury)}
    if(hp<1)break;
  }
  return{ok:true,weapon:w,shots:results,ammoSpent:results.length,targetSp:sp,targetHp:hp,targetInjuries:injuries,hits:results.filter(x=>x.hit).length};
}
export function resolveAutofire({ref,autofireSkill,distance,weapon,targetSp=11,targetHp=35,targetInjuries=[],defender=null,ammoEffect='basic',damageBonus=0,recoverFumble=false,rng=Math.random}){
  const w=typeof weapon==='string'?WEAPONS[weapon]:weapon;if(!w?.autofire)throw new Error('Arma sem Autofire');let dv=rangeDv(w.type,distance,{autofire:true}),defenseRoll=null,defense='range';if(dv==null)return {ok:false,reason:'out-of-range'};if(defender?.dodge){defenseRoll=rollD10Critical(rng);dv=Number(defender.dex||0)+Number(defender.evasion||0)+defenseRoll.total;defense='evasion'}
  const ammoCost=Math.max(1,Number(w.autofireAmmoCost||10)),roll=attackRollD10(rng,recoverFumble),qualityBonus=w.quality==='excellent'?1:0,attack=ref+autofireSkill+roll.total+qualityBonus;if((w.quality==='poor'||w.poorReliability===true)&&roll.first===1)return{ok:true,hit:false,dv,attack,roll,ammoCost,weapon:w,defense,defenseRoll,malfunction:true,qualityBonus};const margin=attack-dv,hit=margin>0;
  if(!hit)return {ok:true,hit:false,dv,attack,roll,ammoCost,weapon:w,defense,defenseRoll,qualityBonus};
  const base=rollDamage(2,rng),mult=Math.min(w.autofire,margin),spotBonus=Math.max(0,Number(damageBonus)||0),raw=base.total*mult+spotBonus,mortallyWounded=targetHp<1,penetration=Math.max(0,raw-targetSp),critical=base.critical||(mortallyWounded&&penetration>0),armor=applyArmor({damage:raw,sp:targetSp,hp:targetHp,critical}),criticalInjury=critical?rollCriticalInjury({location:'body',current:targetInjuries,rng}):null;
  const applied=applySpecialAmmoToDamage({effect:ammoEffect,damageResult:{ok:true,hit:true,dv,attack,roll,ammoCost,baseDamage:base,multiplier:mult,spotWeaknessBonus:spotBonus,rawDamage:raw,armor,criticalInjury,mortallyWounded,weapon:w,defense,defenseRoll,qualityBonus},targetHp,targetSp,targetInjuries,rng});applied.targetInjuries=[...targetInjuries];if(applied.criticalInjury)applied.targetInjuries.push(applied.criticalInjury);if(applied.expansiveCriticalInjury)applied.targetInjuries.push(applied.expansiveCriticalInjury);return applied;
}
export function woundState(hp,maxHp){if(hp<1)return 'Mortally Wounded';if(hp<Math.ceil(maxHp/2))return 'Seriously Wounded';if(hp<maxHp)return 'Lightly Wounded';return 'Unhurt'}
export function woundPenalty(hp,maxHp){if(hp<1)return{actions:-4,move:-6,deathSave:true};if(hp<Math.ceil(maxHp/2))return{actions:-2,move:0,deathSave:false};return{actions:0,move:0,deathSave:false}}
export function resolveDeathSave({body,penalty=0,rng=Math.random}){const roll=d(10,rng),total=roll+Math.max(0,Number(penalty)||0),success=roll!==10&&total<Number(body);return{roll,total,body:Number(body),penalty:Math.max(0,Number(penalty)||0),success,dead:!success,nextPenalty:Math.max(0,Number(penalty)||0)+1,source:'CP:R Core v1.25 p.188'}}
export function brawlingDamageDice(body,{cyberarm=false}={}){body=Number(body)||0;const dice=body<=4?1:body<=6?2:body<=10?3:4;return cyberarm?Math.max(2,dice):dice}
export function resolveMeleeAttack({dex,skill,damageDice,targetDex,targetEvasion,targetSp=11,targetHp=35,targetInjuries=[],brawling=false,damageBonus=0,recoverFumble=false,quality='average',ignoreArmorBelowSp=0,noCriticalInjury=false,noAblation=false,floorHpAtOne=false,unconsciousAtFloor=false,replaceForeignObject=false,secondCriticalOnForeignObject=false,secondCriticalBonusDamage=false,poorReliability=false,rng=Math.random}){
  const attackRoll=attackRollD10(rng,recoverFumble),defenseRoll=rollD10Critical(rng),qualityBonus=quality==='excellent'?1:0,attack=Number(dex)+Number(skill)+attackRoll.total+qualityBonus,defense=Number(targetDex)+Number(targetEvasion)+defenseRoll.total,malfunction=(quality==='poor'||poorReliability===true)&&attackRoll.first===1,hit=!malfunction&&attack>defense;
  if(!hit)return{ok:true,hit:false,attack,defense,attackRoll,defenseRoll,malfunction};
  const damage=rollDamage(Number(damageDice),rng),spotBonus=Math.max(0,Number(damageBonus)||0),rawDamage=damage.total+spotBonus,armorIgnored=Number(ignoreArmorBelowSp)>0&&Number(targetSp)<Number(ignoreArmorBelowSp),effectiveSp=armorIgnored?0:(brawling?targetSp:Math.ceil(targetSp/2)),mortallyWounded=targetHp<1,penetration=Math.max(0,rawDamage-effectiveSp),critical=!noCriticalInjury&&(damage.critical||(mortallyWounded&&penetration>0)),bonus=critical?5:0;
  let newHp=targetHp-penetration-bonus,unconscious=false;if(floorHpAtOne&&targetHp>0&&newHp<1){newHp=1;unconscious=Boolean(unconsciousAtFloor)}const ablated=penetration>0&&!noAblation&&!armorIgnored,armor={effectiveSp,armorIgnored,penetration,directDamage:Math.max(0,targetHp-newHp),newHp,newSp:ablated?Math.max(0,targetSp-1):targetSp,ablated,criticalBonus:bonus};
  let criticalInjury=critical?rollCriticalInjury({location:'body',current:targetInjuries,rng}):null,secondCriticalInjury=null,secondCriticalDamage=0;if(criticalInjury?.id?.startsWith('foreign-object')&&replaceForeignObject){for(let i=0;i<40;i++){const reroll=rollCriticalInjury({location:criticalInjury.location||'body',current:targetInjuries,rng});if(!reroll.id.startsWith('foreign-object')){criticalInjury=reroll;break}}}else if(criticalInjury?.id?.startsWith('foreign-object')&&secondCriticalOnForeignObject){for(let i=0;i<40;i++){const reroll=rollCriticalInjury({location:criticalInjury.location||'body',current:[...targetInjuries,criticalInjury],rng});if(!reroll.id.startsWith('foreign-object')){secondCriticalInjury=reroll;break}}if(secondCriticalInjury&&secondCriticalBonusDamage){secondCriticalDamage=5;armor.newHp-=5;armor.directDamage+=5}}
  return{ok:true,hit:true,attack,defense,attackRoll,defenseRoll,damage:{...damage,baseTotal:damage.total,total:rawDamage,spotWeaknessBonus:spotBonus},rawDamage,armor,criticalInjury,secondCriticalInjury,secondCriticalDamage,unconscious,mortallyWounded,brawling,quality,malfunction};
}
export function resolveThrownAttack({dex,athletics,distance,damageDice,targetDex=0,targetEvasion=0,targetCanDodge=false,targetSp=11,targetHp=35,targetInjuries=[],halvesSp=false,quality='average',damageBonus=0,recoverFumble=false,secondCriticalOnForeignObject=false,secondCriticalBonusDamage=false,poorReliability=false,rng=Math.random}){
  if(Number(distance)>25)return{ok:false,reason:'out-of-range'};let dv=rangeDv('grenadeLauncher',Number(distance)),defenseRoll=null,defense='range';if(dv==null)return{ok:false,reason:'out-of-range'};if(targetCanDodge){defenseRoll=rollD10Critical(rng);dv=Number(targetDex)+Number(targetEvasion)+defenseRoll.total;defense='evasion'}
  const attackRoll=attackRollD10(rng,recoverFumble),qualityBonus=quality==='excellent'?1:0,attack=Number(dex)+Number(athletics)+attackRoll.total+qualityBonus,malfunction=(quality==='poor'||poorReliability===true)&&attackRoll.first===1,hit=!malfunction&&attack>dv;if(!hit)return{ok:true,hit:false,attack,dv,attackRoll,defense,defenseRoll,malfunction};
  const damage=rollDamage(Number(damageDice),rng),spotBonus=Math.max(0,Number(damageBonus)||0),rawDamage=damage.total+spotBonus,effectiveSp=halvesSp?Math.ceil(Number(targetSp)/2):Number(targetSp),mortallyWounded=Number(targetHp)<1,penetration=Math.max(0,rawDamage-effectiveSp),critical=damage.critical||(mortallyWounded&&penetration>0),bonus=critical?5:0,armor={effectiveSp,penetration,directDamage:penetration+bonus,newHp:Number(targetHp)-penetration-bonus,newSp:penetration>0?Math.max(0,Number(targetSp)-1):Number(targetSp),ablated:penetration>0,criticalBonus:bonus};
  let criticalInjury=critical?rollCriticalInjury({location:'body',current:targetInjuries,rng}):null,secondCriticalInjury=null,secondCriticalDamage=0;if(criticalInjury?.id?.startsWith('foreign-object')&&secondCriticalOnForeignObject){for(let i=0;i<40;i++){const reroll=rollCriticalInjury({location:criticalInjury.location||'body',current:[...targetInjuries,criticalInjury],rng});if(!reroll.id.startsWith('foreign-object')){secondCriticalInjury=reroll;break}}if(secondCriticalInjury&&secondCriticalBonusDamage){secondCriticalDamage=5;armor.newHp-=5;armor.directDamage+=5}}
  return{ok:true,hit:true,attack,dv,attackRoll,defense,defenseRoll,damage:{...damage,baseTotal:damage.total,total:rawDamage,spotWeaknessBonus:spotBonus},rawDamage,armor,criticalInjury,secondCriticalInjury,secondCriticalDamage,mortallyWounded,malfunction,source:'CP:R Core v1.25 p.177'};
}
export function resolveSuppressiveFire({ref,autofireSkill,targets=[],rng=Math.random}){
  const attackRoll=rollD10Critical(rng),attack=Number(ref)+Number(autofireSkill)+attackRoll.total;
  return{ammoCost:10,attack,attackRoll,targets:targets.map(target=>{const roll=rollD10Critical(rng),defense=Number(target.will||0)+Number(target.concentration||0)+roll.total;return{id:target.id,eligible:target.onFoot!==false&&target.inLos!==false&&target.inCover!==true&&Number(target.distance||0)<=25,defense,roll,forcedToCover:target.onFoot!==false&&target.inLos!==false&&target.inCover!==true&&Number(target.distance||0)<=25&&defense<attack}}),source:'CP:R Core v1.25 p.174'};
}
export function applyCoverDamage({damage,coverHp,explosive=false}){const destroyed=Number(damage)>=Number(coverHp);return{destroyed,newCoverHp:Math.max(0,Number(coverHp)-Number(damage)),targetDamage:explosive&&destroyed?Number(damage):0}}
export function resolveCoverAttack({ref,skill,distance,weapon,coverHp,mode='single',ammoAvailable=Infinity,rng=Math.random}){
  const w=typeof weapon==='string'?WEAPONS[weapon]:weapon;if(!w)throw new Error('Arma desconhecida');let hp=Math.max(0,Number(coverHp)||0);if(hp<1)return{ok:false,reason:'cover-destroyed',shots:[],ammoSpent:0,newCoverHp:0,destroyed:true};
  if(mode==='autofire'){
    const ammoCost=Math.max(1,Number(w.autofireAmmoCost||10));if(!w.autofire)throw new Error('Arma sem Autofire');if(Number(ammoAvailable)<ammoCost)return{ok:false,reason:'no-ammo',shots:[],ammoSpent:0,newCoverHp:hp,destroyed:false};const dv=rangeDv(w.type,distance,{autofire:true});if(dv==null)return{ok:false,reason:'out-of-range',shots:[],ammoSpent:0,newCoverHp:hp,destroyed:false};const roll=rollD10Critical(rng),qualityBonus=w.quality==='excellent'?1:0,attack=Number(ref)+Number(skill)+roll.total+qualityBonus;if((w.quality==='poor'||w.poorReliability===true)&&roll.first===1)return{ok:true,shots:[{hit:false,attack,dv,roll,malfunction:true}],ammoSpent:ammoCost,newCoverHp:hp,destroyed:false,malfunction:true};const margin=attack-dv,hit=margin>0;if(!hit)return{ok:true,shots:[{hit:false,attack,dv,roll}],ammoSpent:ammoCost,newCoverHp:hp,destroyed:false};const baseDamage=rollDamage(2,rng),multiplier=Math.min(Number(w.autofire),margin),damage=baseDamage.total*multiplier,cover=applyCoverDamage({damage,coverHp:hp});return{ok:true,shots:[{hit:true,attack,dv,roll,baseDamage,multiplier,damage}],ammoSpent:ammoCost,newCoverHp:cover.newCoverHp,destroyed:cover.destroyed};
  }
  const available=Math.max(0,Math.min(Number(w.rof||1),Math.floor(Number(ammoAvailable))));if(available<1)return{ok:false,reason:'no-ammo',shots:[],ammoSpent:0,newCoverHp:hp,destroyed:false};const dv=rangeDv(w.type,distance);if(dv==null)return{ok:false,reason:'out-of-range',shots:[],ammoSpent:0,newCoverHp:hp,destroyed:false};const shots=[];for(let index=0;index<available&&hp>0;index++){const roll=rollD10Critical(rng),qualityBonus=w.quality==='excellent'?1:0,attack=Number(ref)+Number(skill)+roll.total+qualityBonus;if((w.quality==='poor'||w.poorReliability===true)&&roll.first===1){shots.push({hit:false,attack,dv,roll,malfunction:true});break}const hit=attack>dv;if(!hit){shots.push({hit:false,attack,dv,roll});continue}const damage=rollDamage(w.damageDice,rng),cover=applyCoverDamage({damage:damage.total,coverHp:hp});hp=cover.newCoverHp;shots.push({hit:true,attack,dv,roll,damage,cover});if(cover.destroyed)break}return{ok:true,shots,ammoSpent:shots.length,newCoverHp:hp,destroyed:hp<1,malfunction:shots.some(x=>x.malfunction)};
}
export function resolveExplosiveDamage({damageDice=6,targets=[],rng=Math.random}){
  const damage=rollDamage(damageDice,rng);return{damage,areaMeters:10,targets:targets.map(target=>{const cover=Number(target.coverHp||0);if(cover>0){const coverResult=applyCoverDamage({damage:damage.total,coverHp:cover,explosive:true});if(!coverResult.destroyed)return{id:target.id,hit:false,protectedByCover:true,cover:coverResult}}
    if(target.dodge){const roll=rollD10Critical(rng),total=Number(target.dex||0)+Number(target.evasion||0)+roll.total;if(total>Number(target.attackCheck||0))return{id:target.id,hit:false,dodged:true,roll,total}}
    const hp=Number(target.hp||0),sp=Number(target.sp||0),penetration=Math.max(0,damage.total-sp),critical=damage.critical||(hp<1&&penetration>0),armor=applyArmor({damage:damage.total,sp,hp,critical}),criticalInjury=critical?rollCriticalInjury({location:'body',current:target.criticalInjuries||[],rng}):null;return{id:target.id,hit:true,armor,criticalInjury,targetInjuries:criticalInjury?[...(target.criticalInjuries||[]),criticalInjury]:[...(target.criticalInjuries||[])]};}),source:'CP:R Core v1.25 pp.174-175'};
}

export const AMMO_EFFECTS={
  basic:{id:'basic',label:'Básica'},
  armorPiercing:{id:'armorPiercing',label:'Armor-Piercing'},
  biotoxin:{id:'biotoxin',label:'Biotoxin'},
  emp:{id:'emp',label:'EMP'},
  expansive:{id:'expansive',label:'Expansive'},
  flashbang:{id:'flashbang',label:'Flashbang'},
  incendiary:{id:'incendiary',label:'Incendiary'},
  poison:{id:'poison',label:'Poison'},
  rubber:{id:'rubber',label:'Rubber'},
  sleep:{id:'sleep',label:'Sleep'},
  smart:{id:'smart',label:'Smart'},
  smoke:{id:'smoke',label:'Smoke'},
  teargas:{id:'teargas',label:'Teargas'},
  paint:{id:'paint',label:'Paintball'},
  acidPaint:{id:'acidPaint',label:'Acid Paintball'},
};
export const AMMO_EFFECT_COMPATIBILITY={
  basic:['pistol','rifle','shotgun','arrow'],
  armorPiercing:['pistol','rifle','arrow','grenade','rocket'],
  biotoxin:['arrow','grenade'],emp:['grenade'],expansive:['pistol','rifle','arrow'],flashbang:['grenade'],
  incendiary:['pistol','rifle','arrow','grenade','shotgun'],poison:['arrow','grenade'],rubber:['pistol','rifle','arrow'],
  sleep:['arrow','grenade'],smart:['pistol','rifle','shotgun','arrow','rocket'],smoke:['grenade'],teargas:['grenade'],paint:['paintball'],acidPaint:['paintball'],
};
export function ammoEffectCompatible(effect,ammoType){return(AMMO_EFFECT_COMPATIBILITY[effect]||[]).includes(String(ammoType||''))}
export function ammoCountsAsBasicForExotic(effect){return ['basic','rubber'].includes(String(effect||''))}
export function weaponAllowsAmmoEffect(weaponId,effect,ammoType=null){const weapon=WEAPONS[weaponId];if(!weapon)return false;const type=String(ammoType||weapon.ammoType||weapon.type||'');if(!ammoEffectCompatible(effect,type))return false;if(!weapon.exotic)return true;if(weaponId==='airPistol')return ['paint','acidPaint'].includes(String(effect||''));return ammoCountsAsBasicForExotic(effect)}
export function resolveResistanceCheck({base,dv,rng=Math.random}){const roll=rollD10Critical(rng),total=Number(base||0)+roll.total;return{roll,total,dv:Number(dv),success:total>Number(dv)}}
export function applySpecialAmmoToDamage({effect='basic',damageResult,targetHp,targetSp,targetInjuries=[],rng=Math.random}={}){
  if(!damageResult?.hit)return{...damageResult,ammoEffect:effect};
  const out=typeof structuredClone==='function'?structuredClone(damageResult):JSON.parse(JSON.stringify(damageResult)),armor=out.armor||{},beforeHp=Number(targetHp||0),beforeSp=Number(targetSp||0);
  if(effect==='armorPiercing'&&armor.ablated)armor.newSp=Math.max(0,beforeSp-2);
  if(effect==='rubber'){
    armor.newSp=beforeSp;armor.ablated=false;armor.criticalBonus=0;out.criticalInjury=null;
    if(beforeHp>1&&Number(armor.newHp)<1){armor.newHp=1;armor.directDamage=Math.max(0,beforeHp-1)}
  }
  if(effect==='incendiary'&&Number(armor.penetration||0)>0)out.ignite=true;
  if(effect==='expansive'&&out.criticalInjury?.id?.startsWith('foreign-object')){
    let second=null;for(let i=0;i<40;i++){second=rollCriticalInjury({location:out.criticalInjury.location||'body',current:[...(targetInjuries||[]),out.criticalInjury],rng});if(!second.id.startsWith('foreign-object'))break}
    if(second&&!second.id.startsWith('foreign-object'))out.expansiveCriticalInjury={...second,bonusDamage:0};
  }
  out.ammoEffect=effect;return out;
}
export function resolveNonDamageAmmoEffect({effect,target={},rng=Math.random}={}){
  const meat=target.meat!==false,meatEyes=target.meatEyes!==false;
  if(effect==='biotoxin'){if(!meat)return{effect,affected:false,reason:'not-meat'};const check=resolveResistanceCheck({base:target.resistTortureDrugsBase,dv:15,rng});const damage=check.success?0:rollDamage(3,rng).total;return{effect,affected:!check.success,check,directHpDamage:damage}}
  if(effect==='poison'){if(!meat)return{effect,affected:false,reason:'not-meat'};const check=resolveResistanceCheck({base:target.resistTortureDrugsBase,dv:13,rng});const damage=check.success?0:rollDamage(2,rng).total;return{effect,affected:!check.success,check,directHpDamage:damage}}
  if(effect==='sleep'){if(!meat)return{effect,affected:false,reason:'not-meat'};const check=resolveResistanceCheck({base:target.resistTortureDrugsBase,dv:13,rng});return{effect,affected:!check.success,check,prone:!check.success,unconsciousRounds:!check.success?20:0}}
  if(effect==='emp'){const check=resolveResistanceCheck({base:target.cybertechBase,dv:15,rng});return{effect,affected:!check.success,check,disableCount:!check.success?2:0,durationRounds:!check.success?20:0,gmChoice:true}}
  if(effect==='flashbang'){const check=resolveResistanceCheck({base:target.resistTortureDrugsBase,dv:15,rng});return{effect,affected:!check.success,check,temporaryInjuries:!check.success?['damaged-eye','damaged-ear']:[],durationRounds:!check.success?20:0}}
  if(effect==='teargas'){if(!meatEyes)return{effect,affected:false,reason:'no-meat-eyes'};const check=resolveResistanceCheck({base:target.resistTortureDrugsBase,dv:13,rng});return{effect,affected:!check.success,check,temporaryInjuries:!check.success?['damaged-eye']:[],durationRounds:!check.success?20:0}}
  if(effect==='paint')return{effect,affected:true,directHpDamage:0,criticalInjury:false};
  if(effect==='acidPaint')return{effect,affected:true,directHpDamage:0,spLoss:1,criticalInjury:false};
  if(effect==='smoke')return{effect,affected:true,areaSquares:5,durationRounds:20,obscuredPenalty:-4};
  return{effect,affected:false,reason:'not-nondamage'};
}

export function stabilizationDv(hp,maxHp){const state=woundState(hp,maxHp);return state==='Mortally Wounded'?15:state==='Seriously Wounded'?13:10}
export function resolveStabilization({tech,medicalSkill,hp,maxHp,baseDeathPenalty=0,rng=Math.random}){const dv=stabilizationDv(hp,maxHp),roll=rollD10Critical(rng),total=Number(tech)+Number(medicalSkill)+roll.total,success=total>dv;return{roll,total,dv,success,newHp:success&&hp<1?1:hp,deathSavePenalty:success&&hp<1?Number(baseDeathPenalty||0):null,unconsciousMinutes:success&&hp<1?1:0,source:'CP:R Core v1.25 pp.186, 188, 222'}}
export function resolveSpeedheal({isMedtech,hp,maxHp,body,will,currentDay,lastUsedDay=null}){
  const before=Number(hp),maximum=Number(maxHp),day=Math.max(1,Math.floor(Number(currentDay)||1));if(!isMedtech)return{ok:false,reason:'medtech-required'};if(before<1)return{ok:false,reason:'mortally-wounded'};if(before>=maximum)return{ok:false,reason:'unhurt'};if(Number(lastUsedDay)===day)return{ok:false,reason:'daily-limit'};const healing=Math.max(0,Number(body)||0)+Math.max(0,Number(will)||0),newHp=Math.min(maximum,before+healing);return{ok:true,healing:newHp-before,newHp,currentDay:day,source:'CP:R Core v1.25 p.150'};
}
