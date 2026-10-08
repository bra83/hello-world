import {planTheJacketPayout} from './cemk_the_jacket_mechanics.js';
export const THE_JACKET_WALLET_PORT_VERSION=1;
const deny=reason=>({ok:false,resolved:false,blocked:true,committed:false,reason});
const id=x=>typeof x==='string'&&/^[a-zA-Z0-9_.:-]{1,120}$/.test(x);
const reward=a=>a?.type==='SALE'&&a?.operation==='MISSION_REWARD'&&a?.adventure==='CEMK_THE_JACKET';
const copy=x=>JSON.parse(JSON.stringify(x));
export function createTheJacketWalletRulesAdapter({wallet=null,rulesAdapter=null}={}){
 return Object.freeze({async resolve(action,{context={},...rest}={}){
  if(!reward(action))return typeof rulesAdapter?.resolve==='function'?rulesAdapter.resolve(action,{context,...rest}):deny('RULES_ADAPTER_REQUIRED');
  const {campaignId,accountId}=context,{transactionId,rewardSource,crewSize,itemIds=[],amount,currency}=action;
  if(!id(campaignId)||!id(accountId)||!id(transactionId))return deny('WALLET_SCOPE_REQUIRED');
  let plan;
  try{plan=planTheJacketPayout({operation:rewardSource,crewSize,itemIds});}
  catch(_){return deny('INVALID_REWARD');}
  if(amount!==plan.amount||currency!=='EUR')return deny('REWARD_PLAN_MISMATCH');
  if(wallet?.supportsIdempotentCredits!==true||wallet?.supportsDurableTransactionLookup!==true||
     typeof wallet?.getTransaction!=='function'||typeof wallet?.creditMissionReward!=='function')
   return deny('DURABLE_IDEMPOTENT_WALLET_REQUIRED');
  const payload={campaignId,accountId,transactionId,rewardSource,crewSize,itemIds:[...itemIds],amount,currency,adventure:'CEMK_THE_JACKET'};
  const key={campaignId,accountId,transactionId};
  const check=receipt=>{
   if(!receipt)return null;
   const ok=receipt.ok===true&&receipt.durable===true&&receipt.status==='committed'&&
     Object.keys(payload).every(k=>JSON.stringify(receipt[k])===JSON.stringify(payload[k]));
   return ok?{ok:true,resolved:true,blocked:false,committed:true,transactionId,amount,authority:'durable_wallet_host'}:deny('WALLET_RECEIPT_MISMATCH');
  };
  let before;
  try{before=await wallet.getTransaction(copy(key));}catch(_){return deny('WALLET_LOOKUP_FAILED');}
  if(before)return check(before);
  try{await wallet.creditMissionReward(copy(payload));}catch(_){}
  let after;
  try{after=await wallet.getTransaction(copy(key));}catch(_){return deny('WALLET_RECONCILIATION_UNAVAILABLE');}
  return check(after)||deny('WALLET_COMMIT_UNCONFIRMED');
 }});
}
