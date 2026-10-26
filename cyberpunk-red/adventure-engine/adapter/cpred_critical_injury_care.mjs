import {rollD10Critical} from './cpred_combat.mjs';
export const CRITICAL_CARE_SOURCE='Cyberpunk RED Core Rulebook Digital v1.25 pp.221-223';
const q=(skills,dv)=>({skills,dv});
export const CRITICAL_CARE={
 'dismembered-arm':{quick:null,treatment:q(['surgery'],17)},
 'dismembered-hand':{quick:null,treatment:q(['surgery'],17)},
 'collapsed-lung':{quick:q(['paramedic'],15),treatment:q(['surgery'],15)},
 'broken-ribs':{quick:q(['paramedic'],13),treatment:{options:[q(['paramedic'],15),q(['surgery'],13)]}},
 'broken-arm':{quick:q(['paramedic'],13),treatment:{options:[q(['paramedic'],15),q(['surgery'],13)]}},
 'foreign-object-body':{quick:q(['first_aid','paramedic'],13),quickPermanent:true,treatment:null},
 'broken-leg':{quick:q(['paramedic'],13),treatment:{options:[q(['paramedic'],15),q(['surgery'],13)]}},
 'torn-muscle':{quick:q(['first_aid','paramedic'],13),quickPermanent:true,treatment:null},
 'spinal-injury':{quick:q(['paramedic'],15),treatment:q(['surgery'],15)},
 'crushed-fingers':{quick:q(['paramedic'],13),treatment:q(['surgery'],15)},
 'dismembered-leg':{quick:null,treatment:q(['surgery'],17)},
 'lost-eye':{quick:null,treatment:q(['surgery'],17)},
 'brain-injury':{quick:null,treatment:q(['surgery'],17)},
 'damaged-eye':{quick:q(['paramedic'],15),treatment:q(['surgery'],13)},
 'concussion':{quick:q(['first_aid','paramedic'],13),quickPermanent:true,treatment:null},
 'broken-jaw':{quick:q(['paramedic'],13),treatment:q(['paramedic','surgery'],13)},
 'foreign-object-head':{quick:q(['first_aid','paramedic'],13),quickPermanent:true,treatment:null},
 'whiplash':{quick:q(['paramedic'],13),treatment:q(['paramedic','surgery'],13)},
 'cracked-skull':{quick:q(['paramedic'],15),treatment:q(['paramedic','surgery'],15)},
 'damaged-ear':{quick:q(['paramedic'],13),treatment:q(['surgery'],13)},
 'crushed-windpipe':{quick:null,treatment:q(['surgery'],15)},
 'lost-ear':{quick:null,treatment:q(['surgery'],17)},
};
function chooseRule(rule,skill,substitutesFor){if(!rule)return null;const options=rule.options||[rule];if(skill==='cybertech'){const base=String(substitutesFor||'');return options.find(x=>x.skills.includes(base))||null}return options.find(x=>x.skills.includes(skill))||null}
export function careRule(injuryId,mode,skill,{cyberReplaced=false,substitutesFor=null}={}){const row=CRITICAL_CARE[injuryId];if(!row)return{ok:false,reason:'unknown-injury'};const key=mode==='quick'?'quick':'treatment',rule=chooseRule(row[key],skill,substitutesFor);if(!rule&&skill==='cybertech'&&cyberReplaced){const raw=row[key];const options=raw?.options||[raw].filter(Boolean);const chosen=options.find(x=>x?.skills?.includes(String(substitutesFor||'')));if(chosen)return{ok:true,dv:chosen.dv,skill,substitutesFor,mode,durationMinutes:mode==='quick'?1:240,permanent:mode==='treatment'||!!row.quickPermanent}}
 if(!rule)return{ok:false,reason:row[key]?'skill-not-allowed':'care-mode-unavailable'};if(skill==='cybertech'&&!cyberReplaced)return{ok:false,reason:'cybertech-requires-cyber-replaced-part'};return{ok:true,dv:rule.dv,skill,substitutesFor:skill==='cybertech'?substitutesFor:null,mode,durationMinutes:mode==='quick'?1:240,permanent:mode==='treatment'||!!row.quickPermanent}}
export function resolveCriticalInjuryCare({injuryId,mode='quick',skill,tech=0,skillLevel=0,isSelf=false,cyberReplaced=false,substitutesFor=null,rng=Math.random}={}){if(mode==='treatment'&&isSelf)return{ok:false,reason:'self-treatment-forbidden'};const rule=careRule(injuryId,mode,skill,{cyberReplaced,substitutesFor});if(!rule.ok)return rule;const roll=rollD10Critical(rng),total=Number(tech||0)+Number(skillLevel||0)+roll.total,success=total>rule.dv;return{...rule,roll,total,success,injuryId,effectRemoved:success,source:CRITICAL_CARE_SOURCE}}
