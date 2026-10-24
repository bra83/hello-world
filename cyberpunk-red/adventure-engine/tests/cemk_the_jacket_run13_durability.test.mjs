import test from 'node:test';
import assert from 'node:assert/strict';
import {
 createTheJacketCampaignPort,createTheJacketCampaignRecord,
 validateTheJacketCampaignRecord,THE_JACKET_CAMPAIGN_KEY
} from '../runtime/cemk_the_jacket_campaign_port.js';
const clone=x=>JSON.parse(JSON.stringify(x));
const makeCharacter=(characterId='pc')=>({characterId,campaignState:{session:{campaignId:'camp'},worldClock:{day:1}}});
const make=(opts={})=>{
 const c=makeCharacter();let stored=clone(c),calls=0,saveOptions=null;
 const saveCharacter=async(char,hints)=>{calls++;saveOptions=hints;stored=clone(char);return {ok:true,characterId:'pc',campaignId:'camp',jacketRevision:char.campaignState[THE_JACKET_CAMPAIGN_KEY].revision};};
 const port=createTheJacketCampaignPort({getCharacter:()=>c,saveCharacter,
  loadSavedCharacter:async()=>clone(stored),...opts});
 return {c,port,get stored(){return stored;},get calls(){return calls;},get hints(){return saveOptions;}};
};
const toDowntime=async p=>{for(const beat of ['first_fight','meeting_falco','toms_diner','downtime'])assert.equal((await p.transition(beat)).result.ok,true);};

test('strict durability preflight rejects missing readback host before any save or world mutation',async()=>{
 const c=makeCharacter();let saves=0,world=0;
 const p=createTheJacketCampaignPort({getCharacter:()=>c,saveCharacter:async()=>{saves++;return {ok:true}},
  requireDurableSave:true,verifyWorldTimeAdvance:async()=>{world++;return {ok:true}}});
 assert.equal((await p.transition('first_fight')).result.reason,'DURABLE_SAVE_READBACK_HOST_REQUIRED');
 assert.equal(saves,0);assert.equal(world,0);assert.equal(c.campaignState[THE_JACKET_CAMPAIGN_KEY],undefined);
});

test('strict durable readback matches character, campaign and entire record',async()=>{
 const h=make({requireDurableSave:true});const out=await h.port.transition('first_fight');
 assert.equal(out.result.ok,true);assert.equal(out.durableSaveVerified,true);
 assert.equal(h.hints.expectedJacketRevision,0);assert.equal(h.hints.nextJacketRevision,1);
 assert.equal(h.hints.scope,JSON.stringify(['camp','pc']));
 assert.deepEqual(h.stored.campaignState[THE_JACKET_CAMPAIGN_KEY],out.record);
});

test('strict readback mismatch blocks success without falsely rolling back an acknowledged write',async()=>{
 const h=make({requireDurableSave:true,loadSavedCharacter:async()=>makeCharacter()});
 const out=await h.port.transition('first_fight');
 assert.equal(out.result.reason,'SAVE_DURABILITY_NOT_CONFIRMED');
 assert.equal(out.savedToCharacter,true);assert.equal(out.durableSaveVerified,false);
 assert.equal(h.c.campaignState[THE_JACKET_CAMPAIGN_KEY].revision,1);
 assert.equal(h.calls,1);
});

test('readback exception blocks strict success without losing local state',async()=>{
 const h=make({requireDurableSave:true,loadSavedCharacter:async()=>{throw Error('offline')}});
 const out=await h.port.transition('first_fight');
 assert.equal(out.result.reason,'SAVE_DURABILITY_NOT_CONFIRMED');
 assert.equal(h.port.snapshot().story.current,'first_fight');
});

test('optimistic mode explicitly reports durableSaveVerified=false when readback fails',async()=>{
 const h=make({loadSavedCharacter:async()=>null});const out=await h.port.transition('first_fight');
 assert.equal(out.result.ok,true);assert.equal(out.durableSaveVerified,false);
});

test('wrong character identity in readback is not durable evidence',async()=>{
 const h=make({requireDurableSave:true,loadSavedCharacter:async()=>({
  ...makeCharacter('other'),campaignState:{...makeCharacter().campaignState,
   [THE_JACKET_CAMPAIGN_KEY]:{...createTheJacketCampaignRecord(),revision:1}}
 })});
 assert.equal((await h.port.transition('first_fight')).result.reason,'SAVE_DURABILITY_NOT_CONFIRMED');
});

test('save acknowledgement with wrong character scope is rejected and rolled back',async()=>{
 const c=makeCharacter();const p=createTheJacketCampaignPort({getCharacter:()=>c,
  saveCharacter:async()=>({ok:true,characterId:'other'})});
 const out=await p.transition('first_fight');assert.equal(out.result.reason,'CHARACTER_SAVE_FAILED');
 assert.equal(c.campaignState[THE_JACKET_CAMPAIGN_KEY],undefined);
});

test('save acknowledgement with wrong campaign scope is rejected',async()=>{
 const c=makeCharacter();const p=createTheJacketCampaignPort({getCharacter:()=>c,
  saveCharacter:async()=>({ok:true,campaignId:'other'})});
 assert.equal((await p.transition('first_fight')).result.reason,'CHARACTER_SAVE_FAILED');
});

test('save acknowledgement with wrong revision is rejected',async()=>{
 const c=makeCharacter();const p=createTheJacketCampaignPort({getCharacter:()=>c,
  saveCharacter:async()=>({ok:true,jacketRevision:999})});
 assert.equal((await p.transition('first_fight')).result.reason,'CHARACTER_SAVE_FAILED');
});

test('downtime rules cannot be committed for another character identity',async()=>{
 const h=make({rulesAdapter:{resolve:async()=>({ok:true,resolved:true,committed:true,authority:'rules_engine'})}});
 await toDowntime(h.port);const out=await h.port.resolveDowntime({characterId:'another-pc',day:1,action:'REST'});
 assert.equal(out.result.reason,'DOWNTIME_CHARACTER_SCOPE_MISMATCH');
 assert.equal(h.port.snapshot().mechanics.history.length,0);
});

test('history validator rejects mismatched world receipt days despite equal totals',()=>{
 const r=createTheJacketCampaignRecord();r.story.downtimeDays=3;
 r.story.history.push({type:'downtime',days:1},{type:'world_time_advance',days:2,operationId:'one',authority:'world_engine'},
  {type:'downtime',days:2},{type:'world_time_advance',days:1,operationId:'two',authority:'world_engine'});
 assert.throws(()=>validateTheJacketCampaignRecord(r),/DOWNTIME_WORLD_EVENT_PAIR_MISMATCH/);
});

test('history validator rejects reordered receipt and unrelated intervening events',()=>{
 const r=createTheJacketCampaignRecord();r.story.downtimeDays=1;
 r.story.history.push({type:'downtime',days:1},{type:'transition',from:'hook',to:'first_fight',actor:'player'},
  {type:'world_time_advance',days:1,operationId:'one',authority:'world_engine'});
 assert.throws(()=>validateTheJacketCampaignRecord(r),/DOWNTIME_WORLD_EVENT_PAIR_MISMATCH/);
});

test('history validator accepts paired World receipts after a successful durable operation',async()=>{
 const h=make({requireDurableSave:true,verifyWorldTimeAdvance:async q=>({...q,ok:true,committed:true,durable:true,authority:'world_engine'})});
 await toDowntime(h.port);
 const out=await h.port.advanceDowntime(2,{operationId:'world-day-2'});
 assert.equal(out.result.ok,true);assert.equal(out.durableSaveVerified,true);
 assert.equal(validateTheJacketCampaignRecord(out.record),true);
});

test('readback cannot validate a record belonging to another campaign',async()=>{
 const h=make({requireDurableSave:true,loadSavedCharacter:async()=>({...makeCharacter(),campaignState:{session:{campaignId:'other'}}})});
 assert.equal((await h.port.transition('first_fight')).result.reason,'SAVE_DURABILITY_NOT_CONFIRMED');
});

test('world time save failure discloses possible external clock commit and same-operation retry',async()=>{
 const c=makeCharacter();let calls=0;
 const p=createTheJacketCampaignPort({getCharacter:()=>c,
  saveCharacter:async()=>{calls++;if(calls>4)throw Error('disk full');return {ok:true}},
  verifyWorldTimeAdvance:async q=>({...q,ok:true,committed:true,durable:true,authority:'world_engine'})});
 await toDowntime(p);const out=await p.advanceDowntime(1,{operationId:'world-day-1'});
 assert.equal(out.result.reason,'CHARACTER_SAVE_FAILED');
 assert.equal(out.worldMayHaveCommitted,true);assert.equal(out.retryWithSameOperationId,true);
 assert.equal(out.saveMayHaveCommitted,true);
 assert.equal(p.snapshot().story.downtimeDays,0);
});
