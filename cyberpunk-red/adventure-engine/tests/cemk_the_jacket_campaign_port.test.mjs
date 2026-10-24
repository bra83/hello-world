import test from 'node:test';
import assert from 'node:assert/strict';
import {
  THE_JACKET_CAMPAIGN_KEY,createTheJacketCampaignRecord,
  validateTheJacketCampaignRecord,loadTheJacketCampaignRecord,
  serializeTheJacketCampaignRecord,theJacketCampaignAIContext,
  createTheJacketCampaignPort
} from '../runtime/cemk_the_jacket_campaign_port.js';
import {createTheJacketState} from '../runtime/cemk_the_jacket_registry.js';
import {createTheJacketMechanicsState,resolveTheJacketRule} from '../runtime/cemk_the_jacket_mechanics.js';
const clone=x=>JSON.parse(JSON.stringify(x));
function harness({wallet=null,rulesAdapter=null,failSave=false,accountId='crew',verifyRewardEligibility=null,verifyWorldTimeAdvance=null}={}){
 const c={characterId:'pc',campaignState:{session:{campaignId:'camp-1'},worldClock:{day:1}}};
 let persisted=null, saves=0;
 const saveCharacter=async x=>{saves++;if(failSave)throw Error('offline');persisted=clone(x);return {ok:true}};
 const port=createTheJacketCampaignPort({getCharacter:()=>c,saveCharacter,rulesAdapter,wallet,accountId,verifyRewardEligibility,verifyWorldTimeAdvance});
 return {c,port,get persisted(){return persisted},get saves(){return saves},set failSave(v){failSave=v}};
}
async function moveTo(port,beat){
 const route=['first_fight','meeting_falco','toms_diner','downtime'];
 for(const next of route.slice(Math.max(0,route.indexOf(port.snapshot().story.current)+1))){if(port.snapshot().story.current===beat)break;const r=await port.transition(next);assert.equal(r.result.ok,true);}
 assert.equal(port.snapshot().story.current,beat);
}
const worldProof=async({days,operationId,campaignId,characterId})=>({ok:true,committed:true,durable:true,authority:'world_engine',days,operationId,campaignId,characterId});
const passRules={resolve:async action=>({ok:true,resolved:true,blocked:false,committed:true,authority:'rules_engine',transactionId:action.transactionId,amount:action.amount})};
function durableWallet(){
 const ledger=new Map();let credits=0;
 const wallet={supportsIdempotentCredits:true,supportsDurableTransactionLookup:true,
  async getTransaction(k){return clone(ledger.get(JSON.stringify(k))||null)},
  async creditMissionReward(p){credits++;const k=JSON.stringify({campaignId:p.campaignId,accountId:p.accountId,transactionId:p.transactionId});
   if(!ledger.has(k))ledger.set(k,{...clone(p),ok:true,durable:true,status:'committed'});
  }};
 return {wallet,get credits(){return credits}};
}
test('campaign record version, roundtrip, story/mechanics migration and fail-closed version',()=>{
 const r=createTheJacketCampaignRecord();assert.equal(validateTheJacketCampaignRecord(r),true);
 assert.deepEqual(loadTheJacketCampaignRecord(serializeTheJacketCampaignRecord(r)),r);
 const old={version:1,revision:3,story:{...createTheJacketState(),version:1},
  mechanics:{...createTheJacketMechanicsState(),version:1}};
 delete old.mechanics.economicLedger;
 const migrated=loadTheJacketCampaignRecord(old);
 assert.equal(migrated.story.version,2);assert.equal(migrated.mechanics.version,2);
 assert.equal(migrated.revision,3);
 assert.throws(()=>loadTheJacketCampaignRecord({...r,version:2}),/INCOMPATIBLE/);
 assert.throws(()=>loadTheJacketCampaignRecord({...r,revision:-1}),/INVALID/);
});
test('player beat transition writes only The Jacket field in existing campaign and preserves world',async()=>{
 const h=harness();const result=await h.port.transition('first_fight');
 assert.equal(result.result.ok,true);assert.equal(result.record.revision,1);
 assert.equal(h.c.campaignState[THE_JACKET_CAMPAIGN_KEY].story.current,'first_fight');
 assert.deepEqual(h.c.campaignState.worldClock,{day:1});
 assert.equal(h.persisted.campaignState[THE_JACKET_CAMPAIGN_KEY].story.current,'first_fight');
 assert.equal(h.saves,1);
 assert.equal(result.durableSaveVerified,false);
});
test('AI cannot transition or trigger rules; illegal transitions do not save',async()=>{
 const h=harness({rulesAdapter:passRules});
 assert.equal((await h.port.transition('first_fight',{actor:'ai'})).result.reason,'STATE_MUTATION_AUTHORITY_DENIED');
 assert.equal((await h.port.resolveRule('falco_trading',{actor:'ai'})).result.reason,'STATE_MUTATION_AUTHORITY_DENIED');
 assert.equal((await h.port.transition('flatlined')).result.reason,'THE_JACKET_OPERATION_REJECTED');
 assert.equal(h.saves,0);assert.equal(h.c.campaignState[THE_JACKET_CAMPAIGN_KEY],undefined);
});
test('ambiguous Rules result cannot mutate or persist campaign',async()=>{
 const h=harness({rulesAdapter:{resolve:async()=>({resolved:true})}});
 await moveTo(h.port,'meeting_falco');
 const before=h.saves;
 const r=await h.port.resolveRule('falco_trading');
 assert.notEqual(r.result.ok,true);assert.equal(r.result.blocked,true);assert.equal(h.saves,before);
});
test('valid Rules resolution and committed downtime persist once; blocked action does not',async()=>{
 const h=harness({rulesAdapter:passRules,verifyWorldTimeAdvance:worldProof});
 await moveTo(h.port,'meeting_falco');
 assert.equal((await h.port.resolveRule('falco_trading')).record.mechanics.resolvedRules.length,1);
 await moveTo(h.port,'downtime');
 await h.port.advanceDowntime(1,{operationId:'day-1'});
 const before=h.saves;
 const ok=await h.port.resolveDowntime({characterId:'pc',day:1,action:'MEDICAL'});
 assert.equal(ok.record.mechanics.downtimeActions['pc:1'],'MEDICAL');
 const duplicate=await h.port.resolveDowntime({characterId:'pc',day:1,action:'REST'});
 assert.equal(duplicate.result.blocked,true);assert.equal(h.saves,before+1);
});
test('failed character save restores in-memory state, without losing unrelated campaign fields',async()=>{
 const h=harness({failSave:true});const out=await h.port.transition('first_fight');
 assert.equal(out.result.reason,'CHARACTER_SAVE_FAILED');
 assert.equal(h.c.campaignState[THE_JACKET_CAMPAIGN_KEY],undefined);
 assert.deepEqual(h.c.campaignState.worldClock,{day:1});
 h.failSave=false;const retry=await h.port.transition('first_fight');
 assert.equal(retry.record.revision,1);assert.equal(h.saves,2);
});
test('durable wallet receipt survives save failure; retry same transaction credits once',async()=>{
 const w=durableWallet(),h=harness({wallet:w.wallet,failSave:true,
  verifyRewardEligibility:async({request})=>({ok:true,eligible:true,authority:'rules_engine',...clone(request)})});
 const req={transactionId:'falco-item-1',operation:'FALCO_ITEMS',crewSize:3,itemIds:['jacket-a']};
 const first=await h.port.resolveEconomy(req);
 assert.equal(first.result.reason,'CHARACTER_SAVE_FAILED');
 assert.equal(first.retryWithSameTransactionId,true);
 assert.equal(w.credits,1);
 assert.equal(h.c.campaignState[THE_JACKET_CAMPAIGN_KEY],undefined);
 h.failSave=false;
 const retry=await h.port.resolveEconomy(req);
 assert.equal(retry.result.committed,true);
 assert.equal(retry.record.mechanics.economicLedger.length,1);
 assert.equal(w.credits,1);
 const replay=await h.port.resolveEconomy(req);
 assert.equal(replay.result.duplicate,true);
 assert.equal(replay.unchanged,true);assert.equal(replay.record.revision,retry.record.revision);
 assert.equal(h.saves,2);assert.equal(w.credits,1);
});
test('wallet missing capability blocks and does not save or create a fake balance',async()=>{
 const h=harness({verifyRewardEligibility:async({request})=>({ok:true,eligible:true,authority:'rules_engine',...clone(request)})});
 const r=await h.port.resolveEconomy({transactionId:'pay',operation:'FALCO_ADVANCE',crewSize:2});
 assert.equal(r.result.reason,'DURABLE_IDEMPOTENT_WALLET_REQUIRED');
 assert.equal(h.saves,0);assert.equal(h.c.campaignState[THE_JACKET_CAMPAIGN_KEY],undefined);
});
test('read-only narrator context excludes wallet ledger and sealed GM knowledge',async()=>{
 const h=harness();await h.port.transition('first_fight');
 const ctx=h.port.aiContext();assert.equal(ctx.story.currentBeat,'first_fight');
 assert.equal(ctx.authority.mutateState,false);assert.equal(ctx.authority.commitEconomy,false);
 assert.equal('economicLedger' in ctx.mechanics,false);assert.equal('gmKnowledge' in ctx,false);
 assert.equal(theJacketCampaignAIContext(h.port.snapshot()).story.currentBeat,'first_fight');
});
test('in-flight operation serializes same-character mutations',async()=>{
 let release;const pending=new Promise(r=>release=r);
 const h=harness({rulesAdapter:{resolve:async()=>{await pending;return {ok:true,resolved:true,blocked:false}}}});
 await moveTo(h.port,'meeting_falco');
 const before=h.port.snapshot().revision;
 const a=h.port.resolveRule('falco_trading');
 const b=await h.port.transition('first_fight');
 assert.equal(b.result.reason,'THE_JACKET_OPERATION_IN_PROGRESS');
 release();await a;
 assert.equal(h.port.snapshot().revision,before+1);
});
test('missing save host blocks mutation even for valid transition',async()=>{
 const c={campaignState:{}};
 const p=createTheJacketCampaignPort({getCharacter:()=>c});
 assert.equal((await p.transition('first_fight')).result.reason,'CHARACTER_SAVE_HOST_REQUIRED');
 assert.equal(c.campaignState[THE_JACKET_CAMPAIGN_KEY],undefined);
});

test('corrupt campaign save blocks all operations rather than silently resetting',async()=>{
 const h=harness();h.c.campaignState[THE_JACKET_CAMPAIGN_KEY]={version:99};
 await assert.rejects(()=>h.port.transition('first_fight'),/INCOMPATIBLE_THE_JACKET_CAMPAIGN_VERSION/);
 assert.equal(h.saves,0);
});
test('character save returning explicit rejection restores previous record',async()=>{
 const c={campaignState:{worldClock:{day:4}}};
 const p=createTheJacketCampaignPort({getCharacter:()=>c,saveCharacter:async()=>({ok:false})});
 const r=await p.transition('first_fight');
 assert.equal(r.result.reason,'CHARACTER_SAVE_FAILED');
 assert.equal(c.campaignState[THE_JACKET_CAMPAIGN_KEY],undefined);
});

test('wallet cannot credit self-asserted mission rewards without independent Rules/Inventory eligibility',async()=>{
 const w=durableWallet(),req={transactionId:'fake',operation:'FALCO_ITEMS',crewSize:3,itemIds:['invented']};
 const h=harness({wallet:w.wallet});
 assert.equal((await h.port.resolveEconomy(req)).result.reason,'MISSION_REWARD_ELIGIBILITY_HOST_REQUIRED');
 assert.equal(w.credits,0);
 const forged=harness({wallet:w.wallet,verifyRewardEligibility:async()=>({ok:true,eligible:true,authority:'ai',...req})});
 assert.equal((await forged.port.resolveEconomy(req)).result.reason,'MISSION_REWARD_ELIGIBILITY_NOT_CONFIRMED');
 assert.equal(w.credits,0);
 const mismatched=harness({wallet:w.wallet,verifyRewardEligibility:async()=>({ok:true,eligible:true,authority:'rules_engine',...req,crewSize:8})});
 assert.equal((await mismatched.port.resolveEconomy(req)).result.reason,'MISSION_REWARD_ELIGIBILITY_NOT_CONFIRMED');
 assert.equal(w.credits,0);
});

test('story downtime cannot advance without World Engine proof; verified host event can advance',async()=>{
 const h=harness();await moveTo(h.port,'downtime');
 const before=h.saves;
 assert.equal((await h.port.advanceDowntime(1,{operationId:'world-day-1'})).result.reason,'WORLD_TIME_VERIFICATION_HOST_REQUIRED');
 assert.equal(h.saves,before);
 const valid=harness({verifyWorldTimeAdvance:worldProof});await moveTo(valid.port,'downtime');
 const first=await valid.port.advanceDowntime(1,{operationId:'world-day-1'});
 assert.equal(first.record.story.downtimeDays,1);
 assert.equal(valid.saves,5);
 const forged=harness({verifyWorldTimeAdvance:async({days,operationId})=>({ok:true,committed:true,authority:'ai',days,operationId})});
 await moveTo(forged.port,'downtime');
 assert.equal((await forged.port.advanceDowntime(1,{operationId:'world-day-1'})).result.reason,'WORLD_TIME_ADVANCE_NOT_CONFIRMED');
 assert.equal(forged.saves,4);
});

test('wrong Beat blocks source-specific check before Rules Engine is called',async()=>{
 let calls=0;
 const h=harness({rulesAdapter:{resolve:async()=>{calls++;return {ok:true,resolved:true}}}});
 const out=await h.port.resolveRule('falco_trading');
 assert.equal(out.result.reason,'RULE_CONTRACT_BEAT_MISMATCH');
 assert.equal(calls,0);assert.equal(h.saves,0);
 await h.port.transition('first_fight');
 const out2=await h.port.resolveRule('toms_diner_camera');
 assert.equal(out2.result.reason,'RULE_CONTRACT_BEAT_MISMATCH');
 assert.equal(calls,0);
});

test('downtime action cannot occur before World Engine confirms day',async()=>{
 let rules=0;
 const h=harness({rulesAdapter:{resolve:async()=>{rules++;return passRules.resolve({})}}});
 await moveTo(h.port,'downtime');
 const out=await h.port.resolveDowntime({characterId:'pc',day:1,action:'REST'});
 assert.equal(out.result.reason,'DOWNTIME_DAY_NOT_WORLD_CONFIRMED');
 assert.equal(rules,0);
});

test('invalid downtime preflight never calls external World Engine',async()=>{
 let worldCalls=0;
 const h=harness({verifyWorldTimeAdvance:async input=>{worldCalls++;return worldProof(input)}});
 await moveTo(h.port,'downtime');
 const zero=await h.port.advanceDowntime(0,{operationId:'bad-zero'});
 assert.equal(zero.result.reason,'DOWNTIME_PRECONDITION_FAILED');
 const oversized=await h.port.advanceDowntime(4,{operationId:'bad-four'});
 assert.equal(oversized.result.reason,'DOWNTIME_PRECONDITION_FAILED');
 assert.equal(worldCalls,0);
 await h.port.advanceDowntime(3,{operationId:'good-three'});
 assert.equal(worldCalls,1);
 const excess=await h.port.advanceDowntime(1,{operationId:'would-leak-time'});
 assert.equal(excess.result.reason,'DOWNTIME_PRECONDITION_FAILED');
 assert.equal(worldCalls,1);
});

test('World Engine requires durable proof and operationId cannot replay',async()=>{
 let calls=0;
 const h=harness({verifyWorldTimeAdvance:async input=>{calls++;return {...await worldProof(input),durable:false}}});
 await moveTo(h.port,'downtime');
 const noProof=await h.port.advanceDowntime(1,{operationId:'world-op'});
 assert.equal(noProof.result.reason,'WORLD_TIME_ADVANCE_NOT_CONFIRMED');
 assert.equal(h.port.snapshot().story.downtimeDays,0);
 const good=harness({verifyWorldTimeAdvance:async input=>{calls++;return worldProof(input)}});
 await moveTo(good.port,'downtime');
 await good.port.advanceDowntime(1,{operationId:'world-op'});
 const replay=await good.port.advanceDowntime(1,{operationId:'world-op'});
 assert.equal(replay.result.duplicate,true);assert.equal(replay.unchanged,true);
 assert.equal(good.port.snapshot().story.downtimeDays,1);
 assert.equal(calls,3);
});

test('ambiguous save acknowledgment rolls back in-memory state',async()=>{
 const c={campaignState:{worldClock:{day:7}}};
 const p=createTheJacketCampaignPort({getCharacter:()=>c,saveCharacter:async()=>undefined});
 const out=await p.transition('first_fight');
 assert.equal(out.result.reason,'CHARACTER_SAVE_FAILED');
 assert.equal(c.campaignState[THE_JACKET_CAMPAIGN_KEY],undefined);
 assert.deepEqual(c.campaignState.worldClock,{day:7});
});

test('ledger duplicate can be replayed after eligibility changes without new credit',async()=>{
 const w=durableWallet();let eligible=true;
 const h=harness({wallet:w.wallet,verifyRewardEligibility:async({request})=>({ok:true,eligible,authority:'rules_engine',...clone(request)})});
 const req={transactionId:'recover-1',operation:'FALCO_ADVANCE',crewSize:2};
 const first=await h.port.resolveEconomy(req);
 assert.equal(first.result.committed,true);assert.equal(w.credits,1);
 eligible=false;
 const replay=await h.port.resolveEconomy(req);
 assert.equal(replay.result.duplicate,true);assert.equal(w.credits,1);
 const tampered=await h.port.resolveEconomy({...req,crewSize:3});
 assert.equal(tampered.result.reason,'TRANSACTION_ID_CONFLICT');assert.equal(w.credits,1);
});

test('Rules Engine response explicitly attributed to AI cannot commit consequences',async()=>{
 const h=harness({rulesAdapter:{resolve:async()=>({ok:true,resolved:true,blocked:false,committed:true,authority:'ai'})}});
 await moveTo(h.port,'meeting_falco');
 const before=h.saves;
 const out=await h.port.resolveRule('falco_trading');
 assert.equal(out.result.blocked,true);
 assert.equal(h.saves,before);
 assert.equal(out.record.mechanics.resolvedRules.length,0);
});

test('character change during an asynchronous Rules call prevents saving to a stale character',async()=>{
 const a={campaignState:{session:{campaignId:'camp-a'}}};
 const b={campaignState:{session:{campaignId:'camp-b'}}};
 let active=a,release,saveCount=0;
 const wait=new Promise(r=>release=r);
 const p=createTheJacketCampaignPort({getCharacter:()=>active,
  saveCharacter:async()=>{saveCount++;return {ok:true}},
  rulesAdapter:{resolve:async()=>{await wait;return {ok:true,resolved:true,blocked:false}}}});
 await p.transition('first_fight');
 const pending=p.resolveRule('first_fight_perception');
 active=b;release();
 const out=await pending;
 assert.equal(out.result.reason,'ACTIVE_CHARACTER_CHANGED');
 assert.equal(saveCount,1);
 assert.equal(a.campaignState[THE_JACKET_CAMPAIGN_KEY].mechanics.resolvedRules.length,0);
 assert.equal(b.campaignState[THE_JACKET_CAMPAIGN_KEY],undefined);
});

test('composite save rejects forged downtime days without durable World provenance',()=>{
 const r=createTheJacketCampaignRecord();r.story.downtimeDays=2;
 assert.throws(()=>validateTheJacketCampaignRecord(r),/DOWNTIME_WORLD_HISTORY_MISMATCH/);
});
test('composite save rejects duplicate World operation receipts and mismatched totals',()=>{
 const r=createTheJacketCampaignRecord();r.story.downtimeDays=2;
 r.story.history=[{type:'downtime',days:1},{type:'world_time_advance',operationId:'clock:1',days:1,authority:'world_engine'},
  {type:'downtime',days:1},{type:'world_time_advance',operationId:'clock:1',days:1,authority:'world_engine'}];
 assert.throws(()=>validateTheJacketCampaignRecord(r),/INVALID_WORLD_ADVANCE_PROVENANCE/);
 r.story.history[3].operationId='clock:2';assert.equal(validateTheJacketCampaignRecord(r),true);
 r.story.history[3].days=2;assert.throws(()=>validateTheJacketCampaignRecord(r),/DOWNTIME_WORLD_HISTORY_MISMATCH/);
});
test('composite save rejects downtime action on unconfirmed World day',()=>{
 const r=createTheJacketCampaignRecord();r.story.downtimeDays=1;
 r.story.history=[{type:'downtime',days:1},{type:'world_time_advance',operationId:'clock:1',days:1,authority:'world_engine'}];
 r.mechanics.downtimeActions['pc:2']='REST';
 assert.throws(()=>validateTheJacketCampaignRecord(r),/DOWNTIME_ACTION_WITHOUT_WORLD_DAY/);
 r.mechanics.downtimeActions={'pc:1':'REST'};
 assert.equal(validateTheJacketCampaignRecord(r),true);
});
test('saved ledger replay requires durable matching wallet receipt even if local ledger says paid',async()=>{
 const w=durableWallet(),h=harness({wallet:w.wallet,
  verifyRewardEligibility:async({request})=>({ok:true,eligible:true,authority:'rules_engine',...clone(request)})});
 const req={transactionId:'receipt:1',operation:'FALCO_ITEMS',crewSize:2,itemIds:['item:1']};
 assert.equal((await h.port.resolveEconomy(req)).result.committed,true);
 const original=w.wallet.getTransaction;
 w.wallet.getTransaction=async()=>null;
 const result=await h.port.resolveEconomy(req);
 assert.equal(result.result.reason,'LEDGER_WALLET_RECEIPT_NOT_CONFIRMED');
 assert.equal(result.record.mechanics.economicLedger.length,1);
 w.wallet.getTransaction=original;
 assert.equal((await h.port.resolveEconomy(req)).result.duplicate,true);
 assert.equal(w.credits,2); // host mock increments calls; actual host must idempotently credit
});
test('saved ledger replay with conflicting payload fails before wallet contact',async()=>{
 const w=durableWallet(),h=harness({wallet:w.wallet,
  verifyRewardEligibility:async({request})=>({ok:true,eligible:true,authority:'rules_engine',...clone(request)})});
 const req={transactionId:'receipt:2',operation:'FALCO_ITEMS',crewSize:2,itemIds:['item:2']};
 await h.port.resolveEconomy(req);const before=w.credits;
 const result=await h.port.resolveEconomy({...req,crewSize:3});
 assert.equal(result.result.reason,'TRANSACTION_ID_CONFLICT');assert.equal(w.credits,before);
});

test('World operation replay reconciles same receipt at max three-day cap without a second save',async()=>{
 let verifications=0;
 const h=harness({verifyWorldTimeAdvance:async request=>{verifications++;return worldProof(request)}});
 await moveTo(h.port,'downtime');
 const first=await h.port.advanceDowntime(3,{operationId:'world:three-days'});
 assert.equal(first.record.story.downtimeDays,3);
 const saves=h.saves,revision=h.port.snapshot().revision;
 const replay=await h.port.advanceDowntime(3,{operationId:'world:three-days'});
 assert.equal(replay.result.ok,true);assert.equal(replay.result.duplicate,true);
 assert.equal(replay.unchanged,true);assert.equal(h.saves,saves);
 assert.equal(replay.record.revision,revision);assert.equal(verifications,2);
});
test('World operation ID collision with different days fails before contacting host',async()=>{
 let calls=0;const h=harness({verifyWorldTimeAdvance:async req=>{calls++;return worldProof(req)}});
 await moveTo(h.port,'downtime');await h.port.advanceDowntime(1,{operationId:'world:day-1'});
 const collision=await h.port.advanceDowntime(2,{operationId:'world:day-1'});
 assert.equal(collision.result.reason,'WORLD_OPERATION_ID_CONFLICT');assert.equal(calls,1);
});
test('World replay cannot claim duplicate without revalidated durable receipt',async()=>{
 let available=true;const h=harness({verifyWorldTimeAdvance:async req=>available?worldProof(req):null});
 await moveTo(h.port,'downtime');await h.port.advanceDowntime(1,{operationId:'world:day-1'});
 const before=h.saves;available=false;
 const replay=await h.port.advanceDowntime(1,{operationId:'world:day-1'});
 assert.equal(replay.result.reason,'WORLD_TIME_ADVANCE_NOT_CONFIRMED');
 assert.equal(h.saves,before);assert.equal(h.port.snapshot().story.downtimeDays,1);
});
test('save validator rejects forged downtime history even with matching world totals',()=>{
 const r=createTheJacketCampaignRecord();r.story.downtimeDays=1;
 r.story.history=[{type:'world_time_advance',operationId:'world:day-1',days:1,authority:'world_engine'}];
 assert.throws(()=>validateTheJacketCampaignRecord(r),/DOWNTIME_EVENT_HISTORY_MISMATCH/);
 r.story.history.unshift({type:'downtime',days:1});
 assert.equal(validateTheJacketCampaignRecord(r),true);
 r.story.history[0].days=2;
 assert.throws(()=>validateTheJacketCampaignRecord(r),/DOWNTIME_EVENT_HISTORY_MISMATCH/);
});
