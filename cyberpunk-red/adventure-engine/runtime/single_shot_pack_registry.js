/* Cyberpunk RED Single Shot Pack v1.1 — deterministic source registry.
 * Reusable character/NET content, not an authored adventure.
 * Never fabricate missing names, stats, floors, DVs, ICE or nodes.
 */
const freeze=x=>Object.freeze(x);
const freezeRows=rows=>freeze(rows.map(x=>freeze(x)));
export const SINGLE_SHOT_PACK_VERSION=2;
export const SINGLE_SHOT_PACK_SOURCE=freeze({id:'single_shot_pack_v1_1',title:'Cyberpunk RED Single Shot Pack v1.1',kind:'SOURCE_PACK',adventure:false,expectedPregens:10,expectedNetArchitectures:6,authority:'SOURCE_BOUND_ONLY',pregenGeneration:'STREETRAT',pregenNpcTier:'LIEUTENANT'});

export const SINGLE_SHOT_PREGEN_SLOTS=freezeRows(Array.from({length:10},(_,i)=>({id:`ssp_pregen_${String(i+1).padStart(2,'0')}`,ordinal:i+1,kind:'PREGENERATED_CHARACTER',sourceBound:true,promoted:false})));
export const SINGLE_SHOT_NET_SLOTS=freezeRows(Array.from({length:6},(_,i)=>({id:`ssp_net_${String(i+1).padStart(2,'0')}`,ordinal:i+1,kind:'NET_ARCHITECTURE',sourceBound:true,promoted:false})));

export function promoteSingleShotRecord(slot,payload={}){
 if(!slot||slot.sourceBound!==true)throw new Error('invalid Single Shot source slot');
 if(['invented','projected','generated'].some(k=>payload[k]===true))throw new Error('Single Shot canonical promotion cannot use invented/projected/generated data');
 if(!payload.sourceRef)throw new Error('sourceRef required for canonical promotion');
 return freeze({...slot,...payload,promoted:true,canonical:true,sourceBound:true});
}

// Names and top-level architecture facts below are transcribed from the canonical v1.1 source.
// Floor graphs are intentionally NOT inferred here; only source-verified facts are promoted.
const net=(i,p)=>promoteSingleShotRecord(SINGLE_SHOT_NET_SLOTS[i-1],p);
export const SINGLE_SHOT_NET_ARCHITECTURES=freezeRows([
 net(1,{sourceRef:'Single Shot Pack v1.1:p24',name:'Conapt Security',demons:freeze(['Imp']),floorCount:3,verifiedFacts:freeze(['Password DV6','Black ICE: Wisp','Control Node: Ground Drone'])}),
 net(2,{sourceRef:'Single Shot Pack v1.1:p24',name:'Starter Drone Rig',demons:freeze(['Imp']),floorCount:3,verifiedFacts:freeze(['Password DV6','Control Node: Mini Air Drone','Black ICE: Raven'])}),
 net(3,{sourceRef:'Single Shot Pack v1.1:p25',name:'Oasis Security',demons:freeze(['Imp']),floorCount:5,verifiedFacts:freeze(['Password DV6','Control Node DV8 x2','Password DV8'])}),
 net(4,{sourceRef:'Single Shot Pack v1.1:p26',name:'Clinic Security',demons:freeze(['Imp']),floorCount:6,verifiedFacts:freeze(['Password DV6 x2','Control Node DV6','File DV6'])}),
 net(5,{sourceRef:'Single Shot Pack v1.1:p27',name:'Small Corp Facility',demons:freeze(['Imp','Efreet']),floorCount:8,verifiedFacts:freeze(['Cameras: 1/floor','Control Node: Large Air Drone'])}),
 net(6,{sourceRef:'Single Shot Pack v1.1:p28',name:'Vault',demons:freeze(['Balron']),floorCount:9,verifiedFacts:freeze(['Password DV10','File DV6','Control Node DV8','Control Node DV10 x2','File DV10','File DV12','Black ICE: Hellhound x2','Black ICE: Killer','Black ICE: Scorpion'])})
]);

export function validateSingleShotPackRegistry(){
 const errors=[];
 if(SINGLE_SHOT_PREGEN_SLOTS.length!==10)errors.push('expected exactly 10 pregens');
 if(SINGLE_SHOT_NET_SLOTS.length!==6)errors.push('expected exactly 6 NET Architectures');
 const ids=[...SINGLE_SHOT_PREGEN_SLOTS,...SINGLE_SHOT_NET_SLOTS].map(x=>x.id);
 if(new Set(ids).size!==ids.length)errors.push('duplicate registry id');
 if([...SINGLE_SHOT_PREGEN_SLOTS,...SINGLE_SHOT_NET_SLOTS].some(x=>x.sourceBound!==true))errors.push('unbound source row');
 if(SINGLE_SHOT_NET_ARCHITECTURES.length!==6)errors.push('expected six promoted NET Architectures');
 if(SINGLE_SHOT_NET_ARCHITECTURES.some(x=>!x.promoted||!x.canonical||!x.sourceRef))errors.push('NET Architecture missing provenance');
 return freeze({ok:errors.length===0,errors:freeze(errors)});
}

export function buildSingleShotAiContext({pregens=[],netArchitectures=SINGLE_SHOT_NET_ARCHITECTURES}={}){
 const safePregens=pregens.filter(x=>x?.promoted===true&&x?.sourceBound===true);
 const safeNets=netArchitectures.filter(x=>x?.promoted===true&&x?.sourceBound===true);
 return freeze({source:SINGLE_SHOT_PACK_SOURCE.id,readOnly:true,adventure:false,pregens:freeze([...safePregens]),netArchitectures:freeze([...safeNets]),forbidden:freeze(['mutate_state','invent_character_stats','invent_net_floor','invent_dv','invent_black_ice','force_scene','decide_player_choices','fabricate_rolls'])});
}
