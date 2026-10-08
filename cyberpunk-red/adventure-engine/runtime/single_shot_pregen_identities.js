// Source-verified identities only. Full sheets remain unpromoted until transcribed.
export const SINGLE_SHOT_PREGEN_IDENTITIES=Object.freeze([
 ['Forty','Rockerboy'],['Grease','Fixer'],['Mover','Solo'],['Racer','Nomad'],
 ['Redeye','Netrunner'],['Torch','Tech'],['Redtail','Medtech'],['24/7','Media'],
 ['Suri “Cavalry” Navarro','Lawman'],['Chanda Mishra','Exec']
].map(([handle,role],i)=>Object.freeze({
 id:'ssp_pregen_'+String(i+1).padStart(2,'0'),ordinal:i+1,handle,role,
 sourceRef:'Single Shot Pack v1.1:p'+(4+2*i),
 sourceBound:true,identityVerified:true,fullSheetPromoted:false
})));
export function getSingleShotPregenIdentity(id){
 return typeof id==='string'?SINGLE_SHOT_PREGEN_IDENTITIES.find(x=>x.id===id)||null:null;
}
export function buildSingleShotPregenIdentityAiContext(discoveredIds=[]){
 if(!Array.isArray(discoveredIds))throw new Error('INVALID_DISCOVERY_LIST');
 const ids=new Set(discoveredIds.filter(x=>typeof x==='string'));
 return Object.freeze({readOnly:true,fullSheetPromoted:false,
 identities:Object.freeze(SINGLE_SHOT_PREGEN_IDENTITIES.filter(x=>ids.has(x.id))),
 forbidden:Object.freeze(['invent_character_stats','mutate_state','force_scene','fabricate_rolls'])});
}
