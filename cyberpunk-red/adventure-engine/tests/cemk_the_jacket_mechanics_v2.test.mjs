import test from 'node:test';
import assert from 'node:assert/strict';
import {createTheJacketState} from '../runtime/cemk_the_jacket_registry.js';
import {THE_JACKET_MECHANICS_VERSION,THE_JACKET_RULE_CONTRACTS,THE_JACKET_ECONOMY,createTheJacketMechanicsState,validateTheJacketMechanicsState,loadTheJacketMechanicsState,serializeTheJacketMechanicsState,recordDowntimeAction,resolveTheJacketRule,resolveTheJacketDowntimeAction,planTheJacketPayout,resolveTheJacketEconomy,theJacketMechanicsAIContext} from '../runtime/cemk_the_jacket_mechanics.js';
const adventure=createTheJacketState();
const committed=a=>({ok:true,resolved:true,blocked:false,committed:true,transactionId:a.transactionId,amount:a.amount,authority:'rules_engine'});
const adapter={resolve:async a=>committed(a)};
test('contracts source-bound and mechanics version 2',()=>{
 assert.equal(THE_JACKET_MECHANICS_VERSION,2);
 assert.equal(THE_JACKET_RULE_CONTRACTS.falco_trading.dv,17);
 assert.equal(THE_JACKET_RULE_CONTRACTS.first_fight_floodlight.interfaceDV,6);
 assert.equal(THE_JACKET_ECONOMY.arasakaBiomonitorOffer,5000);
});
test('migrate v1 and roundtrip v2',()=>{
 const legacy={version:1,resolvedRules:[],downtimeActions:{'pc:1':'REST'},history:[]};
 const state=loadTheJacketMechanicsState(legacy);
 assert.equal(state.version,2);assert.deepEqual(state.economicLedger,[]);
 assert.deepEqual(loadTheJacketMechanicsState(serializeTheJacketMechanicsState(state)),state);
 assert.throws(()=>loadTheJacketMechanicsState({version:3}));
});
test('downtime requires committed host and one action per day',async()=>{
 const s=createTheJacketMechanicsState(),r={characterId:'pc',day:1,action:'MEDICAL'};
 const fail=await resolveTheJacketDowntimeAction(adventure,s,r,{resolve:async()=>({ok:true,resolved:true})});
 assert.deepEqual(fail.mechanicsState,s);
 const ok=await resolveTheJacketDowntimeAction(adventure,s,r,adapter);
 assert.equal(ok.mechanicsState.downtimeActions['pc:1'],'MEDICAL');
 assert.throws(()=>recordDowntimeAction(ok.mechanicsState,{...r,action:'REST'}));
 assert.throws(()=>recordDowntimeAction(s,{...r,day:4}));
});
test('Rules result requires explicit resolution and no failure',async()=>{
 const s=createTheJacketMechanicsState();
 const bad=await resolveTheJacketRule(adventure,s,'falco_trading',{resolve:async()=>({ok:false,resolved:true})});
 assert.deepEqual(bad.mechanicsState,s);
 const good=await resolveTheJacketRule(adventure,s,'falco_trading',{resolve:async()=>({ok:true,resolved:true,authority:'rules_engine'})});
 assert.equal(good.mechanicsState.resolvedRules.length,1);
});
test('source-bound payout amounts',()=>{
 assert.equal(planTheJacketPayout({operation:'FALCO_ITEMS',crewSize:4,itemIds:['a','b']}).amount,4000);
 assert.equal(planTheJacketPayout({operation:'FALCO_ADVANCE',crewSize:4}).amount,2000);
 assert.equal(planTheJacketPayout({operation:'FALCO_FULL_SET_BONUS',crewSize:4}).amount,1000);
 assert.equal(planTheJacketPayout({operation:'ARASAKA_BIOMONITOR',crewSize:4}).amount,5000);
 assert.throws(()=>planTheJacketPayout({operation:'FALCO_ITEMS',crewSize:4,itemIds:[]}));
});
test('economy fail-closed on missing or forged host commit',async()=>{
 const s=createTheJacketMechanicsState(),req={transactionId:'pay-1',operation:'FALCO_ITEMS',crewSize:4,itemIds:['item-a']};
 const a=await resolveTheJacketEconomy(adventure,s,req,{resolve:async()=>({ok:true,resolved:true})});
 assert.deepEqual(a.mechanicsState,s);
 const b=await resolveTheJacketEconomy(adventure,s,req,{resolve:async action=>({...committed(action),amount:999})});
 assert.deepEqual(b.mechanicsState,s);
});
test('economy idempotency and replay',async()=>{
 const s=createTheJacketMechanicsState(),req={transactionId:'pay-1',operation:'FALCO_ITEMS',crewSize:4,itemIds:['item-a']};
 const a=await resolveTheJacketEconomy(adventure,s,req,adapter);
 assert.equal(a.mechanicsState.economicLedger[0].amount,2000);
 const b=await resolveTheJacketEconomy(adventure,a.mechanicsState,req,{resolve:()=>{throw Error('not invoked')}});
 assert.equal(b.result.duplicate,true);
 await assert.rejects(()=>resolveTheJacketEconomy(adventure,a.mechanicsState,{...req,transactionId:'pay-2'},adapter),/ITEM_REWARDED_TWICE/);
 await assert.rejects(()=>resolveTheJacketEconomy(adventure,a.mechanicsState,{...req,itemIds:['other']},adapter),/TRANSACTION_ID_CONFLICT/);
});
test('single payouts cannot be duplicated under another transaction',async()=>{
 const req={transactionId:'advance-1',operation:'FALCO_ADVANCE',crewSize:3};
 const a=await resolveTheJacketEconomy(adventure,createTheJacketMechanicsState(),req,adapter);
 await assert.rejects(()=>resolveTheJacketEconomy(adventure,a.mechanicsState,{...req,transactionId:'advance-2'},adapter),/PAYOUT_ALREADY_COMMITTED/);
});
test('load rejects tampered or duplicated ledger',()=>{
 const s=createTheJacketMechanicsState();
 s.economicLedger.push({transactionId:'t1',operation:'FALCO_ITEMS',crewSize:2,itemIds:['a'],amount:1000,authority:'rules_engine'});
 s.economicLedger.push({transactionId:'t2',operation:'FALCO_ITEMS',crewSize:2,itemIds:['a'],amount:1000,authority:'rules_engine'});
 assert.throws(()=>validateTheJacketMechanicsState(s),/ITEM_REWARDED_TWICE/);
 s.economicLedger.pop();s.economicLedger[0].amount=9999;
 assert.throws(()=>loadTheJacketMechanicsState(s),/ECONOMIC_LEDGER_AMOUNT_MISMATCH/);
});
test('AI context cannot commit or see ledger details',()=>{
 const c=theJacketMechanicsAIContext(createTheJacketMechanicsState());
 assert.equal(c.authority.commitEconomy,false);
 assert.equal(c.authority.resolveRules,false);
 assert.equal(c.authority.mutateState,false);
 assert.equal('economicLedger' in c,false);
});
