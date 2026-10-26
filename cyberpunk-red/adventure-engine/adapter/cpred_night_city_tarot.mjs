const SOURCE='Night City Tarot v1.2 — R. Talsorian Games (2021)';
export const MAJOR_ARCANA=Object.freeze(['fool','magician','high_priestess','empress','emperor','hierophant','lovers','chariot','strength','hermit','wheel_of_fortune','justice','hanged_man','death','temperance','devil','tower','star','moon','sun','judgement','world']);
export const TAROT_EFFECTS=Object.freeze({
 fool:{cyberwareOfflineMinutes:60,fallbackCritical:'foreign_object',fallbackHumanityLoss:'3d6'},
 magician:{destroyCyberwareRepairable:1,deadlyOnFire:true,fallbackWeaponMalfunction:true},
 high_priestess:{critical:'foreign_object',movementPoison:{dv:15,skill:'resist_torture_drugs',damage:'3d6'}},
 empress:{guaranteedCriticalHits:3,singleOpponent:true},
 emperor:{criticalChoices:{head:1,body:1,chooser:'player'}},
 hierophant:{postArmorDamageMultiplier:2,weaponDestroyedBeyondRepair:true},
 lovers:{hitLocation:'head',meleeGrapple:true},
 chariot:{armorAblation:true}, strength:{bonusDamage:25}, hermit:{criticals:['lost_eye','lost_eye']},
 wheel_of_fortune:{rangedRetargetRandom:true,meleeMissAndAttackerProne:true,weaponMalfunction:true},
 justice:{durationMinutes:1,evasionMeleePenalty:-5,cannotDodgeRanged:true},
 hanged_man:{prone:true,criticals:['spinal_injury','whiplash']}, death:{deathSave:true,onFail:{hp:0,unconsciousMinutes:1},humanityGain:'3d6'},
 temperance:{chooseDismemberedLimb:1,chooseBrokenLimb:1}, devil:{criticals:['brain_injury','damaged_ear']},
 tower:{criticals:['brain_injury','crushed_windpipe','spinal_injury'],delayedPenaltyMinutes:60},
 star:{rangedRicochet:true,meleeCriticals:['broken_ribs','collapsed_lung']}, moon:{criticals:['foreign_object','brain_injury']},
 sun:{detonateCarriedExplosive:true,fallbackDestroyNonWeaponGear:true}, judgement:{criticals:['broken_fingers','dismembered_arm']},
 world:{extraTurn:true,skillBonus:5,durationTurns:1}
});
export function newTarotCampaign(deck=MAJOR_ARCANA){const d=[...deck];if(d.length!==22||new Set(d).size!==22||d.some(x=>!TAROT_EFFECTS[x]))throw new Error('INVALID_TAROT_DECK');return{deck:d,seen:[],sessionPulled:false,shuffleLocked:false};}
export function startTarotSession(state){return{...state,sessionPulled:false};}
export function tarotEligible({damageDice=[],attackKind='',singleTarget=true,areaEffect=false,attackerCanCrit=true,defenderCanCrit=true}={}){const sixes=damageDice.filter(x=>x===6).length;return{eligible:sixes>=3&&['melee','ranged'].includes(attackKind)&&singleTarget&&!areaEffect&&attackerCanCrit&&defenderCanCrit,sixes};}
export function drawTarot(state,attack){const e=tarotEligible(attack);if(!e.eligible)return{state,drawn:null,reason:'not-eligible',...e};if(state.sessionPulled)return{state,drawn:null,reason:'session-limit',...e};const card=state.deck[0],deck=[...state.deck.slice(1),card],seen=state.seen.includes(card)?state.seen:[...state.seen,card];return{state:{...state,deck,seen,sessionPulled:true,shuffleLocked:seen.length<22},drawn:card,effect:structuredClone(TAROT_EFFECTS[card]),replacesTypicalCritical:true,...e};}
export function shuffleTarot(state,rng=Math.random){if(state.shuffleLocked||state.seen.length<22)return{state,ok:false,reason:'experience-all-cards-first'};const deck=[...state.deck];for(let i=deck.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}return{state:{...state,deck,seen:[]},ok:true};}
export function criticalBonusDamage(effect){const n=Array.isArray(effect?.criticals)?effect.criticals.length:0;return n*5;}
export {SOURCE};
