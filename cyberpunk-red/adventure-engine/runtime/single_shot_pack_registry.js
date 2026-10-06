/* Cyberpunk RED Single Shot Pack v1.1 — deterministic source registry.
 * The pack is reusable character/NET content, not an authored adventure.
 * Never fabricate missing names, stats, floors, DVs, ICE or nodes.
 */
const freeze=x=>Object.freeze(x);
const freezeRows=rows=>freeze(rows.map(x=>freeze(x)));
export const SINGLE_SHOT_PACK_VERSION=1;
export const SINGLE_SHOT_PACK_SOURCE=freeze({
  id:'single_shot_pack_v1_1',
  title:'Cyberpunk RED Single Shot Pack v1.1',
  kind:'SOURCE_PACK',
  adventure:false,
  expectedPregens:10,
  expectedNetArchitectures:6,
  authority:'SOURCE_BOUND_ONLY'
});

// Slots are deliberately identity-neutral until their full source records are promoted.
// This makes the historical 10+6 contract deterministic without hallucinating content.
export const SINGLE_SHOT_PREGEN_SLOTS=freezeRows(Array.from({length:10},(_,i)=>({
  id:`ssp_pregen_${String(i+1).padStart(2,'0')}`,
  ordinal:i+1,
  kind:'PREGENERATED_CHARACTER',
  sourceBound:true,
  promoted:false
})));
export const SINGLE_SHOT_NET_SLOTS=freezeRows(Array.from({length:6},(_,i)=>({
  id:`ssp_net_${String(i+1).padStart(2,'0')}`,
  ordinal:i+1,
  kind:'NET_ARCHITECTURE',
  sourceBound:true,
  promoted:false
})));

export function validateSingleShotPackRegistry(){
  const errors=[];
  if(SINGLE_SHOT_PREGEN_SLOTS.length!==10)errors.push('expected exactly 10 pregens');
  if(SINGLE_SHOT_NET_SLOTS.length!==6)errors.push('expected exactly 6 NET Architectures');
  const ids=[...SINGLE_SHOT_PREGEN_SLOTS,...SINGLE_SHOT_NET_SLOTS].map(x=>x.id);
  if(new Set(ids).size!==ids.length)errors.push('duplicate registry id');
  if([...SINGLE_SHOT_PREGEN_SLOTS,...SINGLE_SHOT_NET_SLOTS].some(x=>x.sourceBound!==true))errors.push('unbound source row');
  return freeze({ok:errors.length===0,errors:freeze(errors)});
}

export function promoteSingleShotRecord(slot,payload={}){
  if(!slot||slot.sourceBound!==true)throw new Error('invalid Single Shot source slot');
  const forbidden=['invented','projected','generated'];
  if(forbidden.some(k=>payload[k]===true))throw new Error('Single Shot canonical promotion cannot use invented/projected/generated data');
  if(!payload.sourceRef)throw new Error('sourceRef required for canonical promotion');
  return freeze({...slot,...payload,promoted:true,canonical:true,sourceBound:true});
}

export function buildSingleShotAiContext({pregens=[],netArchitectures=[]}={}){
  const safePregens=pregens.filter(x=>x?.promoted===true&&x?.sourceBound===true);
  const safeNets=netArchitectures.filter(x=>x?.promoted===true&&x?.sourceBound===true);
  return freeze({
    source:SINGLE_SHOT_PACK_SOURCE.id,
    readOnly:true,
    adventure:false,
    pregens:freeze([...safePregens]),
    netArchitectures:freeze([...safeNets]),
    forbidden:freeze(['mutate_state','invent_character_stats','invent_net_floor','invent_dv','invent_black_ice','force_scene','decide_player_choices','fabricate_rolls'])
  });
}
