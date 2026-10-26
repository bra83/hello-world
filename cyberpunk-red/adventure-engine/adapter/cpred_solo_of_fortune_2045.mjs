export const SOLO_OF_FORTUNE_2045_SOURCE='Cyberpunk RED Interface RED Volume 5 v1.1 • Solo of Fortune 2045 pp.105–149';
export const MERCENARY_MISSIONS=Object.freeze({
 easy:{label:'Easy',budget:[1000,5000],pay:[3000,4000]},
 typical:{label:'Typical',budget:[2000,7000],pay:[4000,7000]},
 dangerous:{label:'Dangerous',budget:[10000,30000],pay:[6000,9000]}
});
const n=v=>Math.max(0,Math.trunc(Number(v)||0));
export function ensureSoloFortuneState(value={}){const s=value&&typeof value==='object'?value:{};s.version=1;s.missions=Array.isArray(s.missions)?s.missions:[];s.activeMission=s.activeMission||null;s.history=Array.isArray(s.history)?s.history:[];return s}
export function createMercenaryMission({tier='typical',crewSize=1,budgetPerPerson=null,payPerPerson=null,objective='Mercenary objective',id=`merc-${Date.now()}`}={}){const def=MERCENARY_MISSIONS[tier]||MERCENARY_MISSIONS.typical,size=Math.max(1,n(crewSize)),budget=Math.max(def.budget[0],Math.min(def.budget[1],n(budgetPerPerson??def.budget[0]))),pay=Math.max(def.pay[0],Math.min(def.pay[1],n(payPerPerson??def.pay[0])));return{id,tier,label:def.label,objective:String(objective||'Mercenary objective'),crewSize:size,budgetPerPerson:budget,payPerPerson:pay,operationalBudget:budget*size,budgetRemaining:budget*size,missionPay:pay*size,temporaryPurchases:[],status:'planning',hardened:true,source:SOLO_OF_FORTUNE_2045_SOURCE}}
export function startMercenaryMission(state,input={}){const mission=createMercenaryMission(input);state.missions=[...(state.missions||[]),mission].slice(-20);state.activeMission=mission;return mission}
export function spendOperationalBudget(mission,{itemId='',name='',cost=0,quantity=1}={}){if(!mission||mission.status==='complete')return{ok:false,reason:'mission-inactive'};const qty=Math.max(1,n(quantity)),total=n(cost)*qty;if(total<1||total>n(mission.budgetRemaining))return{ok:false,reason:'insufficient-operational-budget'};const purchase={itemId:String(itemId),name:String(name||itemId),cost:n(cost),quantity:qty,total,temporary:true};mission.temporaryPurchases.push(purchase);mission.budgetRemaining-=total;return{ok:true,purchase,budgetRemaining:mission.budgetRemaining}}
export function completeMercenaryMission(mission,{success=true}={}){if(!mission)return{ok:false,reason:'mission-required'};mission.status='complete';mission.success=Boolean(success);mission.completedAt=Date.now();mission.returnedTemporaryPurchases=mission.temporaryPurchases.map(x=>({...x,returned:true}));mission.temporaryPurchases=[];mission.budgetRemaining=0;return{ok:true,success:mission.success,payAwarded:mission.success?n(mission.missionPay):0,state:mission}}
export function catalogBySection(catalog,section='all'){const rows=Array.isArray(catalog?.items)?catalog.items:[];return section==='all'?rows:rows.filter(x=>x.section===section)}

// R5.31 source-bound equipment mechanics closure.
export const SOLO_ATTACHMENT_RULES=Object.freeze({
 ammunition_compatibility_internals:{dv:17,skill:'Weaponstech',slotCost:0,permanent:true,unique:true,effect:'non_basic_ammo_compatibility'},
 reinforced_string:{dv:17,skill:'Archery|Weaponstech',slotCost:0,permanent:true,unique:true,effect:'damage_plus_1d6_max_5d6_two_hands_outside_kyudo'},
 sniper_rifle_rechamber:{dv:17,skill:'Weaponstech',slotCost:0,permanent:true,unique:true,effect:'damage_plus_1d6_max_6d6'},
 compatibility_rail:{dv:17,skill:'Weaponstech',slotCost:0,permanent:false,unique:true,effect:'scope_only_slot_plus_1'},
 range_table_modification:{dv:null,skill:null,slotCost:0,permanent:false,unique:true,effect:'replace_range_table'},
 pistol_autosear:{dv:null,skill:null,slotCost:0,permanent:false,unique:true,effect:'autofire_machine_pistol'},
 smg_cyclic_internals:{dv:17,skill:'Weaponstech',slotCost:0,permanent:false,unique:true,effect:'replace_smg_autofire'},
 shotgun_automatic_control_group:{dv:17,skill:'Weaponstech',slotCost:0,permanent:false,unique:true,effect:'shotgun_autofire'}
});
const clone=v=>JSON.parse(JSON.stringify(v||{}));
export function installSoloAttachment(weapon,{attachmentId,checkTotal=null,choice=null}={}){
 const rule=SOLO_ATTACHMENT_RULES[attachmentId]; if(!rule)return{ok:false,reason:'unknown-attachment'};
 const w=clone(weapon); w.attachments=Array.isArray(w.attachments)?w.attachments:[];
 if(rule.unique&&w.attachments.some(a=>(a.id||a)===attachmentId))return{ok:false,reason:'already-installed'};
 if(rule.dv!=null && Number(checkTotal)<rule.dv)return{ok:false,reason:'skill-check-failed',dv:rule.dv,skill:rule.skill};
 w.attachments.push({id:attachmentId,permanent:rule.permanent,effect:rule.effect,choice:choice||null});
 if(attachmentId==='sniper_rifle_rechamber')w.damageDice=Math.min(6,n(w.damageDice)+1);
 if(attachmentId==='reinforced_string'){w.damageDice=Math.min(5,n(w.damageDice)+1);w.hands=Math.max(2,n(w.hands));}
 if(attachmentId==='compatibility_rail')w.scopeOnlySlots=n(w.scopeOnlySlots)+1;
 if(attachmentId==='range_table_modification'&&choice)w.rangeTable=String(choice);
 if(attachmentId==='pistol_autosear'){const q=String(w.quality||'').toLowerCase();const current=n(w.autofire);w.autofire=(q==='excellent'||current>0)?4:3;w.autofireProfile='Machine Pistol';w.suppressiveFire=true;}
 if(attachmentId==='smg_cyclic_internals'){w.autofire=4;w.autofireProfile=choice==='machine_pistol'?'Machine Pistol':'SMG';}
 if(attachmentId==='shotgun_automatic_control_group'){w.autofire=Math.max(3,n(w.autofire));w.suppressiveFire=true;}
 if(attachmentId==='ammunition_compatibility_internals')w.nonBasicAmmoCompatible=true;
 return{ok:true,weapon:w,rule};
}
export function canFireSoloWeapon(weapon,{body=0,prone=false,mounted=false,mode='single'}={}){
 const req=n(weapon?.bodyRequirement); if(req&&n(body)<req&&!mounted&&!prone)return{ok:false,reason:'body-requirement',required:req};
 const only=Array.isArray(weapon?.onlyFireModes)?weapon.onlyFireModes:[]; if(only.length&&!only.includes(mode))return{ok:false,reason:'fire-mode-restricted'};
 return{ok:true};
}
export function applyBurrowingAmmunition(critical={}){return{...critical,quickFixDV:n(critical.quickFixDV)+2,treatmentDV:n(critical.treatmentDV)+2,quickFixRestricted:true,source:SOLO_OF_FORTUNE_2045_SOURCE}}
export function machineGunAttachmentClass(weapon={}){return String(weapon.classification||weapon.category||'').toLowerCase().includes('machine gun')?'Assault Rifle':(weapon.category||null)}

// R5.32 ACPA executable subsystem — source-bound to Solo of Fortune 2045 pp.133–136.
export const ACPA_FRAMES=Object.freeze({
 salvaged:{cost:1000,body:10,hp:14,move:0},sigma:{cost:2000,body:12,hp:22,move:1},beta:{cost:10000,body:14,hp:27,move:2},omega:{cost:20000,body:16,hp:32,move:3}
});
export const ACPA_SHELLS=Object.freeze({
 salvaged:{cost:1000,sp:14,hp:2,move:-1},light:{cost:2000,sp:16,hp:3,move:0},hybrid:{cost:5124,sp:17,hp:10,move:-1},metalgear:{cost:10000,sp:18,hp:17,move:-3},heavy:{cost:10000,sp:19,hp:21,move:-4}
});
export const ACPA_REPAIR=Object.freeze({minor:{dv:9,hours:4},major:{dv:13,hours:24},destroyed:{dv:17,hours:168}});
export function buildAcpa({frame='salvaged',shell='salvaged',tuning={},weapons=[],cyberware=[]}={}){
 const f=ACPA_FRAMES[frame],s=ACPA_SHELLS[shell];if(!f||!s)return{ok:false,reason:'invalid-frame-or-shell'};
 if(weapons.length>6||cyberware.length>6)return{ok:false,reason:'onboard-limit'};
 const t={acceleration:tuning.acceleration||'a',hydraulics:tuning.hydraulics||'a',maneuverability:tuning.maneuverability||'a',weight:tuning.weight||'a'};
 let hp=f.hp+s.hp,sp=s.sp,ref=0,dex=0,move=f.move+s.move;
 if(t.acceleration==='a')hp-=7;else dex-=1;
 if(t.hydraulics==='a')sp-=1;else move-=1;
 if(t.maneuverability==='a')hp-=7;else ref-=1;
 if(t.weight==='a')hp+=7;else move+=1;
 const componentCost=[...weapons,...cyberware].reduce((a,x)=>a+n(x.cost),0),cost=4000+f.cost+s.cost+componentCost+500*(weapons.length+cyberware.length);
 return{ok:true,acpa:{frame,shell,tuning:t,hp,maxHp:hp,sp,maxSp:sp,body:f.body,refModifier:ref,dexModifier:dex,moveModifier:move,weapons:clone(weapons),cyberware:clone(cyberware),cost,destroyed:false,pilot:null,operationHoursToday:0,source:SOLO_OF_FORTUNE_2045_SOURCE}};
}
export function acpaEnter(acpa,{pilotId='pilot',authorized=true,interfacePlugInstallations=2}={}){const a=clone(acpa);if(a.destroyed)return{ok:false,reason:'destroyed',acpa:a};if(a.pilot)return{ok:false,reason:'occupied',acpa:a};if(!authorized)return{ok:false,reason:'unauthorized',acpa:a};if(n(interfacePlugInstallations)<2)return{ok:false,reason:'interface-plugs-required',acpa:a};a.pilot=String(pilotId);return{ok:true,actionCost:1,acpa:a}}
export function acpaExit(acpa){const a=clone(acpa);if(!a.pilot)return{ok:false,reason:'unoccupied',acpa:a};a.pilot=null;return{ok:true,actionCost:a.destroyed?0:1,acpa:a}}
export function acpaApplyDamage(acpa,{damage=0,critical=false,fullBodyConversion=false}={}){const a=clone(acpa);const penetrating=Math.max(0,n(damage)-n(a.sp));if(penetrating>0)a.hp=Math.max(0,n(a.hp)-penetrating);const pilotDamage=critical&&!fullBodyConversion?5:0;if(a.hp===0)a.destroyed=true;return{ok:true,penetrating,pilotDamage,criticalEffectApplied:false,acpa:a}}
export function acpaOperationPenalty({hours=0,isFbc=false,motoRank=0,interfaceRank=0}={}){const h=Number(hours)||0;if(h>8)return-2;if(h>4&&!isFbc&&n(motoRank)<4&&n(interfaceRank)<4)return-1;return 0}
export function acpaCanDodgeBullets({moveBonus=0,ref=0,dex=0,reflexCoProcessor=false,refPenalty=0,dexPenalty=0,movePenalty=0,combatAwarenessRank=0}={}){return n(moveBonus)>=3||(n(ref)>=8&&reflexCoProcessor&&n(refPenalty)===0)||(n(dex)>=8&&n(refPenalty)===0&&n(dexPenalty)===0&&n(movePenalty)===0)||n(combatAwarenessRank)>=6}
export function acpaRepair(acpa,{damageClass='minor',checkTotal=0}={}){const rule=ACPA_REPAIR[damageClass];if(!rule)return{ok:false,reason:'invalid-damage-class'};if(Number(checkTotal)<rule.dv)return{ok:false,reason:'skill-check-failed',dv:rule.dv,hours:rule.hours};const a=clone(acpa);a.hp=a.maxHp;a.sp=a.maxSp;a.destroyed=false;return{ok:true,dv:rule.dv,hours:rule.hours,acpa:a,onboardRestored:true}}
export function acpaAssemblyQuote({frameCost=0,shellCost=0,weapons=[],cyberware=[],techAssembly=false}={}){const parts=n(frameCost)+n(shellCost)+[...weapons,...cyberware].reduce((a,x)=>a+n(x.cost),0);return techAssembly?{cost:parts+2000,dv:24,hours:24}:{cost:4000+parts+500*(weapons.length+cyberware.length),dv:null,hours:0}}
