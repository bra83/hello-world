import test from 'node:test';
import assert from 'node:assert/strict';
import {createTheJacketState} from '../runtime/cemk_the_jacket_registry.js';
import {createTheJacketMechanicsState,resolveTheJacketEconomy} from '../runtime/cemk_the_jacket_mechanics.js';
import {createTheJacketWalletRulesAdapter} from '../runtime/cemk_the_jacket_wallet_port.js';
const adventure=createTheJacketState();
const request={transactionId:'falco-01',operation:'FALCO_ITEMS',crewSize:3,itemIds:['jacket-a']};
const scope={campaignId:'save-42',accountId:'crew-wallet'};
function host({throwAfterCommit=false}={}){
 const receipts=new Map();let credits=0,lookups=0;
 const wallet={supportsIdempotentCredits:true,supportsDurableTransactionLookup:true,
  async getTransaction(k){lookups++;return receipts.get(JSON.stringify(k))||null;},
  async creditMissionReward(p){credits++;const key=JSON.stringify({campaignId:p.campaignId,accountId:p.accountId,transactionId:p.transactionId});
   if(!receipts.has(key))receipts.set(key,{...p,status:'committed',durable:true,ok:true});
   if(throwAfterCommit)throw Error('network response lost');
  }};
 return {wallet,receipts,get credits(){return credits},get lookups(){return lookups}};
}
const pay=(adapter,s=createTheJacketMechanicsState(),req=request)=>resolveTheJacketEconomy(adventure,s,req,{resolve:(action,meta)=>adapter.resolve(action,{...meta,context:{...meta.context,...scope}})});
test('durable wallet credits exactly once and supports replay',async()=>{
 const h=host(),a=createTheJacketWalletRulesAdapter({wallet:h.wallet});
 const r=await pay(a);assert.equal(r.result.committed,true);assert.equal(r.mechanicsState.economicLedger[0].amount,1500);
 assert.equal((await pay(a)).result.committed,true);assert.equal(h.credits,1);
});
test('lost network response reconciles via durable receipt',async()=>{
 const h=host({throwAfterCommit:true}),a=createTheJacketWalletRulesAdapter({wallet:h.wallet});
 assert.equal((await pay(a)).result.committed,true);assert.equal((await pay(a)).result.committed,true);assert.equal(h.credits,1);
});
test('no idempotency capability blocks credit and ledger mutation',async()=>{
 const a=createTheJacketWalletRulesAdapter({wallet:{creditMissionReward:async()=>{throw Error('called')}}});
 const r=await pay(a);assert.equal(r.result.reason,'DURABLE_IDEMPOTENT_WALLET_REQUIRED');
 assert.equal(r.mechanicsState.economicLedger.length,0);
});
test('ambiguous commit blocks and preserves mechanics state',async()=>{
 const h=host();h.wallet.creditMissionReward=async()=>{throw Error('offline')};
 const r=await pay(createTheJacketWalletRulesAdapter({wallet:h.wallet}));
 assert.equal(r.result.blocked,true);assert.equal(r.mechanicsState.economicLedger.length,0);
});
test('receipt mismatch blocks without issuing another credit',async()=>{
 const h=host(),key=JSON.stringify({...scope,transactionId:'falco-01'});
 h.receipts.set(key,{status:'committed',durable:true,ok:true,...scope,transactionId:'falco-01',amount:9000});
 const r=await pay(createTheJacketWalletRulesAdapter({wallet:h.wallet}));
 assert.equal(r.result.reason,'WALLET_RECEIPT_MISMATCH');assert.equal(h.credits,0);
});
test('missing scope and lookup failures block',async()=>{
 const h=host(),a=createTheJacketWalletRulesAdapter({wallet:h.wallet});
 const r=await resolveTheJacketEconomy(adventure,createTheJacketMechanicsState(),request,a);
 assert.equal(r.result.reason,'WALLET_SCOPE_REQUIRED');
 h.wallet.getTransaction=async()=>{throw Error('offline')};
 assert.equal((await pay(a)).result.reason,'WALLET_LOOKUP_FAILED');assert.equal(h.credits,0);
});
test('pending and non-durable receipts never count as success',async()=>{
 const h=host(),key=JSON.stringify({...scope,transactionId:'falco-01'});
 for(const bad of [{status:'pending'},{status:'committed',ok:true,durable:false}]){
  h.receipts.set(key,{...scope,transactionId:'falco-01',...bad});
  assert.equal((await pay(createTheJacketWalletRulesAdapter({wallet:h.wallet}))).result.blocked,true);
 }
 assert.equal(h.credits,0);
});
test('other actions delegate to existing Rules Engine',async()=>{
 const h=host();let called=false;
 const a=createTheJacketWalletRulesAdapter({wallet:h.wallet,rulesAdapter:{resolve:async act=>{called=true;return {ok:true,resolved:true,type:act.type}}}});
 assert.equal((await a.resolve({type:'NETRUN'})).resolved,true);assert.equal(called,true);assert.equal(h.credits,0);
});
