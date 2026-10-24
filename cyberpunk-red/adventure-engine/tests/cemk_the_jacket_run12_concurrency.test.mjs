import test from 'node:test';
import assert from 'node:assert/strict';
import {createTheJacketCampaignPort,THE_JACKET_CAMPAIGN_KEY} from '../runtime/cemk_the_jacket_campaign_port.js';
const clone=x=>JSON.parse(JSON.stringify(x));
const character=()=>({characterId:'pc',campaignState:{session:{campaignId:'camp-1'},worldClock:{day:1}}});
const deferred=()=>{let release;const promise=new Promise(r=>release=r);return {promise,release};};
const pass=async()=>({ok:true,resolved:true,blocked:false,authority:'rules_engine'});
async function toBeat(port,beat){for(const b of ['first_fight','meeting_falco','toms_diner','downtime']){if(port.snapshot().story.current===beat)break;const r=await port.transition(b);assert.equal(r.result.ok,true);}}

test('World receipt must bind operation to the exact campaign and character',async()=>{
 const c=character();let worldCalls=0;
 const port=createTheJacketCampaignPort({getCharacter:()=>c,saveCharacter:async()=>({ok:true}),
  verifyWorldTimeAdvance:async req=>{worldCalls++;return {...req,ok:true,committed:true,durable:true,authority:'world_engine',campaignId:'other-campaign'};}});
 await toBeat(port,'downtime');const old=clone(port.snapshot());
 const out=await port.advanceDowntime(1,{operationId:'day-1'});
 assert.equal(out.result.reason,'WORLD_TIME_ADVANCE_NOT_CONFIRMED');
 assert.deepEqual(port.snapshot(),old);assert.equal(worldCalls,1);
});

test('two hydrated objects with the same campaign/character identity cannot write concurrently',async()=>{
 const gate=deferred(),c1=character(),c2=character();
 const first=createTheJacketCampaignPort({getCharacter:()=>c1,saveCharacter:async()=>{await gate.promise;return {ok:true};}});
 const second=createTheJacketCampaignPort({getCharacter:()=>c2,saveCharacter:async()=>({ok:true})});
 const pending=first.transition('first_fight');await Promise.resolve();await Promise.resolve();
 const denied=await second.transition('first_fight');
 assert.equal(denied.result.reason,'THE_JACKET_OPERATION_IN_PROGRESS');
 gate.release();assert.equal((await pending).result.ok,true);
 assert.equal((await second.transition('first_fight')).result.ok,true);
});

test('Rules callback cannot overwrite a newer The Jacket record written during await',async()=>{
 const c=character(),gate=deferred();let signal;const entered=new Promise(r=>signal=r);
 const port=createTheJacketCampaignPort({getCharacter:()=>c,saveCharacter:async()=>({ok:true}),
  rulesAdapter:{resolve:async()=>{signal();await gate.promise;return pass();}}});
 await toBeat(port,'meeting_falco');
 const pending=port.resolveRule('falco_trading');await entered;
 const externallyUpdated=clone(port.snapshot());externallyUpdated.revision+=1;
 c.campaignState[THE_JACKET_CAMPAIGN_KEY]=externallyUpdated;
 gate.release();const out=await pending;
 assert.equal(out.result.reason,'THE_JACKET_STATE_CHANGED_DURING_OPERATION');
 assert.deepEqual(c.campaignState[THE_JACKET_CAMPAIGN_KEY],externallyUpdated);
});

test('failed save never rolls back another subsystem newer record',async()=>{
 const c=character();let concurrent;
 const port=createTheJacketCampaignPort({getCharacter:()=>c,saveCharacter:async()=>{
  concurrent=clone(c.campaignState[THE_JACKET_CAMPAIGN_KEY]);concurrent.revision+=1;
  c.campaignState[THE_JACKET_CAMPAIGN_KEY]=concurrent;throw Error('disk full');
 }});
 const out=await port.transition('first_fight');
 assert.equal(out.result.reason,'CHARACTER_SAVE_CONFLICT');
 assert.deepEqual(c.campaignState[THE_JACKET_CAMPAIGN_KEY],concurrent);
});

test('switching active character during save never reports success for the new character',async()=>{
 const c1=character(),c2={...character(),characterId:'other-pc'},gate=deferred();let active=c1;
 const port=createTheJacketCampaignPort({getCharacter:()=>active,saveCharacter:async()=>{await gate.promise;return {ok:true};}});
 const pending=port.transition('first_fight');await Promise.resolve();await Promise.resolve();
 active=c2;gate.release();const out=await pending;
 assert.equal(out.result.reason,'ACTIVE_CHARACTER_CHANGED_AFTER_SAVE');
 assert.equal(out.savedToCharacter,true);
 assert.equal(c2.campaignState[THE_JACKET_CAMPAIGN_KEY],undefined);
 assert.equal(c1.campaignState[THE_JACKET_CAMPAIGN_KEY].story.current,'first_fight');
});
