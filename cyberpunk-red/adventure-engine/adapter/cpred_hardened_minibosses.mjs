export const HARDENED_MINIBOSS_ARCHETYPES=Object.freeze([
 'arasaka_assassin','executive_protection','militech_veteran','outrider','pyro','sniper'
]);
export const HARDENED_MINIBOSS_RATIO=Object.freeze({edgerunnersPerMiniBoss:3,replaces:'mini_boss'});
export const MINI_PROMOTIONS=Object.freeze({
 1:{id:'skill_base_17',apply:n=>({...n,skillBaseUpgrade:{minimumOriginal:11,newBase:17}})},
 2:{id:'hp_plus_10',apply:n=>({...n,hp:(n.hp??0)+10})},
 3:{id:'teamwork_3',apply:n=>({...n,teamwork:3,teamMembers:[...(n.teamMembers||[]),{choice:true}]})},
 4:{id:'tech_upgraded_medium_armorjack',apply:n=>({...n,armor:{type:'medium_armorjack',techUpgraded:true,armorPenalty:0}})},
 5:{id:'cyberware_plus_600eb',apply:n=>({...n,cyberwareBudgetEb:(n.cyberwareBudgetEb||0)+600})},
 6:{id:'reputation_5',apply:n=>({...n,reputation:5})},
 7:{id:'emp_grenade_athletics_16',apply:n=>({...n,athleticsBase:16,inventory:[...(n.inventory||[]),'emp_grenade']})},
 8:{id:'combat_drug',apply:(n,{drug='black_lace'}={})=>({...n,preCombatDrug:['black_lace','synthcoke'].includes(drug)?drug:'black_lace'})},
 9:{id:'move_8_or_evasion_18',apply:(n,{choice='move'}={})=>choice==='evasion'?{...n,evasionBase:18}:{...n,move:8}},
 10:{id:'gills_exotic_bodysculpt',apply:(n,{form='shark'}={})=>({...n,gills:true,exoticBodysculpt:form})}
});
export function isHardenedCrew(crew=[]){return crew.length>0&&crew.every(c=>c.hardened===true);}
export function hardenedMiniBossBudget(edgerunners){return Math.max(0,Math.floor(Number(edgerunners||0)/3));}
export function validateHardenedMiniBossEncounter({crew=[],miniBosses=0}={}){
 const hardened=isHardenedCrew(crew), budget=hardenedMiniBossBudget(crew.length);
 return {hardened,budget,miniBosses,balanced:hardened&&miniBosses<=budget,warning:!hardened?'NON_HARDENED_CREW':miniBosses>budget?'OVER_BUDGET':null};
}
export function createHardenedMiniBoss(archetype,{hp=40,...overrides}={}){
 if(!HARDENED_MINIBOSS_ARCHETYPES.includes(archetype)) throw new Error('UNKNOWN_HARDENED_MINIBOSS');
 return {kind:'hardened_miniboss',archetype,hp,...overrides,promotions:[]};
}
export function applyMiniPromotion(npc,roll,options={}){
 const p=MINI_PROMOTIONS[roll]; if(!p) throw new Error('PROMOTION_ROLL_OUT_OF_RANGE');
 const out=p.apply(npc,options); return {...out,promotions:[...(npc.promotions||[]),p.id]};
}
export function replaceCoreMiniBoss(coreNpc,archetype){return createHardenedMiniBoss(archetype,{...coreNpc,replacesCoreMiniBoss:true});}
