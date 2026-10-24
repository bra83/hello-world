/*
 * The Jacket campaign-state port for the existing character save seam.
 * Does not introduce a parallel character database, credit a wallet by itself,
 * or grant narrator authority over state. Native save durability remains a host contract.
 */
import {
  createTheJacketState,loadTheJacketState,validateTheJacketState,
  transitionTheJacket,recordTheJacketDowntime,theJacketAIContext
} from './cemk_the_jacket_registry.js';
import {
  createTheJacketMechanicsState,loadTheJacketMechanicsState,
  validateTheJacketMechanicsState,resolveTheJacketRule,
  resolveTheJacketDowntimeAction,resolveTheJacketEconomy,theJacketMechanicsAIContext
} from './cemk_the_jacket_mechanics.js';
import {createTheJacketWalletRulesAdapter} from './cemk_the_jacket_wallet_port.js';

export const THE_JACKET_CAMPAIGN_RECORD_VERSION=1;
export const THE_JACKET_CAMPAIGN_KEY='theJacketCampaign';
const clone=x=>x==null?x:JSON.parse(JSON.stringify(x));
const validActor=a=>a==='player'||a==='rules_engine';
const deny=reason=>({ok:false,resolved:false,blocked:true,reason});
const busyCharacters=new WeakSet();
// A rehydrated character object may represent the same campaign/character while
// a previous async save is in flight. Lock both the object and stable identity.
const busyScopes=new Set();
const scopeFor=c=>{
  const campaignId=c?.campaignState?.session?.campaignId||c?.campaignState?.campaignId;
  return id(campaignId)&&id(c?.characterId)?JSON.stringify([campaignId,c.characterId]):null;
};
const CONTRACT_BEATS=Object.freeze({
  falco_human_perception:['meeting_falco'],falco_trading:['meeting_falco'],
  first_fight_perception:['first_fight'],first_fight_floodlight:['first_fight'],
  toms_diner_camera:['toms_diner'],
  downtime_medical:['downtime'],downtime_purchase:['downtime'],
  downtime_sale:['downtime'],downtime_repair:['downtime'],
  downtime_cyberware:['downtime'],downtime_rest:['downtime']
});
const id=x=>typeof x==='string'&&/^[a-zA-Z0-9_.:-]{1,120}$/.test(x);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);


export function createTheJacketCampaignRecord(){
  return {version:THE_JACKET_CAMPAIGN_RECORD_VERSION,revision:0,
    story:createTheJacketState(),mechanics:createTheJacketMechanicsState()};
}
export function validateTheJacketCampaignRecord(raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||
    raw.version!==THE_JACKET_CAMPAIGN_RECORD_VERSION||
    !Number.isSafeInteger(raw.revision)||raw.revision<0)
    throw Error('INVALID_THE_JACKET_CAMPAIGN_RECORD');
  validateTheJacketState(raw.story);
  validateTheJacketMechanicsState(raw.mechanics);
  // Campaign port is the only authority that joins a World Engine clock commit
  // to a downtime day. Reject forged/incomplete saves rather than trusting a
  // day counter that was never durably acknowledged by the world host.
  const worldEvents=raw.story.history.filter(h=>h?.type==='world_time_advance');
  const operations=new Set();
  let total=0;
  for(const event of worldEvents){
    if(!id(event.operationId)||event.authority!=='world_engine'||
       !Number.isSafeInteger(event.days)||event.days<1||event.days>3||
       operations.has(event.operationId))throw Error('INVALID_WORLD_ADVANCE_PROVENANCE');
    operations.add(event.operationId);total+=event.days;
  }
  if(total!==raw.story.downtimeDays)throw Error('DOWNTIME_WORLD_HISTORY_MISMATCH');
  const downtimeEvents=raw.story.history.filter(h=>h?.type==='downtime');
  if(downtimeEvents.length!==worldEvents.length||
     downtimeEvents.some(h=>!Number.isSafeInteger(h.days)||h.days<1||h.days>3)||
     downtimeEvents.reduce((sum,h)=>sum+h.days,0)!==total)
    throw Error('DOWNTIME_EVENT_HISTORY_MISMATCH');
  // Each clock receipt must immediately follow its own downtime increment.
  // Matching totals alone would allow a forged receipt for a different day.
  for(let i=0;i<raw.story.history.length;i++){
    const h=raw.story.history[i];
    if(h?.type==='downtime'){
      const receipt=raw.story.history[i+1];
      if(receipt?.type!=='world_time_advance'||receipt.days!==h.days)
        throw Error('DOWNTIME_WORLD_EVENT_PAIR_MISMATCH');
    }else if(h?.type==='world_time_advance'){
      const downtime=raw.story.history[i-1];
      if(downtime?.type!=='downtime'||downtime.days!==h.days)
        throw Error('DOWNTIME_WORLD_EVENT_PAIR_MISMATCH');
    }
  }
  for(const key of Object.keys(raw.mechanics.downtimeActions)){
    const match=/^(.+):(\d+)$/.exec(key);
    if(!match||Number(match[2])<1||Number(match[2])>total)
      throw Error('DOWNTIME_ACTION_WITHOUT_WORLD_DAY');
  }
  return true;
}
export function loadTheJacketCampaignRecord(raw){
  if(raw==null)return createTheJacketCampaignRecord();
  const record=typeof raw==='string'?JSON.parse(raw):clone(raw);
  if(record?.version!==THE_JACKET_CAMPAIGN_RECORD_VERSION)
    throw Error('INCOMPATIBLE_THE_JACKET_CAMPAIGN_VERSION');
  record.story=loadTheJacketState(record.story);
  record.mechanics=loadTheJacketMechanicsState(record.mechanics);
  validateTheJacketCampaignRecord(record);
  return record;
}
export function serializeTheJacketCampaignRecord(record){
  validateTheJacketCampaignRecord(record);
  return JSON.stringify(record);
}
export function theJacketCampaignAIContext(record){
  validateTheJacketCampaignRecord(record);
  return Object.freeze({
    adventure:'CEMK_THE_JACKET',
    story:theJacketAIContext(record.story),
    mechanics:theJacketMechanicsAIContext(record.mechanics),
    authority:Object.freeze({mutateState:false,resolveRules:false,commitEconomy:false,
      decideForPlayer:false,forceScene:false,fabricateRoll:false,revealSealedSecrets:false})
  });
}

/**
 * Operations are serialized per live character object. This is NOT a distributed lock.
 * Wallet host must provide its own durable idempotency, and saveCharacter must persist
 * the whole character. Failed saves restore the in-memory record; a committed wallet
 * payment is recovered on retry through the same transactionId and durable receipt.
 */
export function createTheJacketCampaignPort({getCharacter,saveCharacter,rulesAdapter=null,
  wallet=null,accountId=null,verifyRewardEligibility=null,verifyWorldTimeAdvance=null,
  loadSavedCharacter=null,requireDurableSave=false}={}){
  const character=()=>typeof getCharacter==='function'?getCharacter():null;
  const snapshot=()=>loadTheJacketCampaignRecord(character()?.campaignState?.[THE_JACKET_CAMPAIGN_KEY]);
  const aiContext=()=>character()?.campaignState?.[THE_JACKET_CAMPAIGN_KEY]==null
    ?null:theJacketCampaignAIContext(snapshot());

  async function execute(operation,fn,{actor='player'}={}){
    if(!validActor(actor))return {result:deny('STATE_MUTATION_AUTHORITY_DENIED'),record:snapshot()};
    const c=character();
    if(!c||typeof c!=='object')return {result:deny('CHARACTER_REQUIRED'),record:createTheJacketCampaignRecord()};
    if(typeof saveCharacter!=='function')return {result:deny('CHARACTER_SAVE_HOST_REQUIRED'),record:snapshot()};
    // Strict hosts must supply independent durable readback before any external
    // Rules/World/Wallet side effect. A save callback's optimistic {ok:true}
    // is not evidence of a durable persisted record.
    if(requireDurableSave&&typeof loadSavedCharacter!=='function')
      return {result:deny('DURABLE_SAVE_READBACK_HOST_REQUIRED'),record:snapshot()};
    const scope=scopeFor(c);
    if(busyCharacters.has(c)||(scope&&busyScopes.has(scope)))
      return {result:deny('THE_JACKET_OPERATION_IN_PROGRESS'),record:loadTheJacketCampaignRecord(c.campaignState?.[THE_JACKET_CAMPAIGN_KEY])};
    busyCharacters.add(c);
    if(scope)busyScopes.add(scope);
    try{
      const original=clone(c.campaignState?.[THE_JACKET_CAMPAIGN_KEY]);
      const current=loadTheJacketCampaignRecord(original);
      let out;
      try{out=await fn(clone(current),c);}catch(error){
        return {result:deny('THE_JACKET_OPERATION_REJECTED'),record:current,errorCode:String(error?.message||error)};
      }
      const result=out?.result;
      if(result?.ok!==true||result?.resolved!==true||result?.blocked===true)
        return {result:{...(result&&typeof result==='object'?clone(result):{}),
          ok:false,resolved:false,blocked:true,
          reason:result?.reason||'THE_JACKET_OPERATION_UNRESOLVED'},record:current};
      if(character()!==c)return {result:deny('ACTIVE_CHARACTER_CHANGED'),record:current};
      // Other subsystems may mutate the same character while the Rules/World
      // host is awaiting. Do not overwrite a newer campaign record.
      if(!same(c.campaignState?.[THE_JACKET_CAMPAIGN_KEY],original))
        return {result:deny('THE_JACKET_STATE_CHANGED_DURING_OPERATION'),record:current};
      if(same(out.record,current))
        return {result,record:current,unchanged:true};
      const next=clone(out.record);
      next.revision=current.revision+1;
      validateTheJacketCampaignRecord(next);
      const oldCampaign=c.campaignState;
      const oldRecord=oldCampaign?.[THE_JACKET_CAMPAIGN_KEY];
      c.campaignState=c.campaignState||{};
      const assigned=clone(next);
      c.campaignState[THE_JACKET_CAMPAIGN_KEY]=assigned;
      try{
        const saveResult=await saveCharacter(c,{operation,scope,
          expectedJacketRevision:current.revision,nextJacketRevision:next.revision});
        // Reject acknowledgments that claim a different character or revision.
        // The host is responsible for implementing an atomic compare-and-swap;
        // these hints alone do not make a non-atomic save safe.
        if(saveResult?.ok!==true||
          (saveResult.characterId!=null&&saveResult.characterId!==c.characterId)||
          (saveResult.campaignId!=null&&saveResult.campaignId!==(c.campaignState?.session?.campaignId||c.campaignState?.campaignId))||
          (saveResult.jacketRevision!=null&&saveResult.jacketRevision!==next.revision))
          throw Error('SAVE_NOT_ACKNOWLEDGED');
      }catch(_){
        // Roll back only our own pending write. A concurrent host update must
        // never be destroyed by a failed save callback.
        const stillOurs=c.campaignState?.[THE_JACKET_CAMPAIGN_KEY]===assigned;
        if(stillOurs){
          if(oldCampaign==null)c.campaignState=oldCampaign;
          else if(oldRecord===undefined)delete c.campaignState[THE_JACKET_CAMPAIGN_KEY];
          else c.campaignState[THE_JACKET_CAMPAIGN_KEY]=oldRecord;
        }
        return {result:deny(stillOurs?'CHARACTER_SAVE_FAILED':'CHARACTER_SAVE_CONFLICT'),record:current,
          saveMayHaveCommitted:true,worldMayHaveCommitted:operation==='downtime-days',
          walletMayHaveCommitted:operation==='economy',
          retryWithSameOperationId:operation==='downtime-days',
          retryWithSameTransactionId:operation==='economy'};
      }
      // The operation may have saved the original character after a UI switch.
      // Never report success for the newly active character.
      if(character()!==c)return {result:deny('ACTIVE_CHARACTER_CHANGED_AFTER_SAVE'),
        record:clone(next),savedToCharacter:true,durableSaveVerified:false};
      let durableSaveVerified=false;
      if(typeof loadSavedCharacter==='function'){
        try{
          // Read from the authoritative persisted store, not the same in-memory
          // object returned by getCharacter. A mismatched readback cannot be
          // reported as success; do NOT roll back a potentially committed save.
          const persisted=await loadSavedCharacter({characterId:c.characterId,
            campaignId:c.campaignState?.session?.campaignId||c.campaignState?.campaignId,
            expectedJacketRevision:next.revision});
          const persistedCampaignId=persisted?.campaignState?.session?.campaignId||persisted?.campaignState?.campaignId;
          const campaignId=c.campaignState?.session?.campaignId||c.campaignState?.campaignId;
          durableSaveVerified=persisted?.characterId===c.characterId&&
            persistedCampaignId===campaignId&&
            same(persisted?.campaignState?.[THE_JACKET_CAMPAIGN_KEY],next);
        }catch(_){durableSaveVerified=false;}
      }
      if(character()!==c)return {result:deny('ACTIVE_CHARACTER_CHANGED_AFTER_READBACK'),
        record:clone(next),savedToCharacter:true,durableSaveVerified};
      if(requireDurableSave&&!durableSaveVerified)
        return {result:deny('SAVE_DURABILITY_NOT_CONFIRMED'),record:clone(next),
          savedToCharacter:true,durableSaveVerified:false,
          externalCommitMayHaveOccurred:operation==='economy'||operation==='downtime-days'};
      return {result,record:clone(next),savedToCharacter:true,durableSaveVerified};
    }finally{busyCharacters.delete(c);if(scope)busyScopes.delete(scope);}
  }
  const success={ok:true,resolved:true,blocked:false};
  const walletAdapter=createTheJacketWalletRulesAdapter({wallet,rulesAdapter});
  return Object.freeze({
    snapshot,aiContext,
    transition(next,{actor='player'}={}){
      return execute('transition',async r=>({result:success,record:{...r,story:transitionTheJacket(r.story,next,{actor})}}),{actor});
    },
    advanceDowntime(days,{actor='player',operationId=null}={}){
      return execute('downtime-days',async (r,c)=>{
        if(r.story.current!=='downtime')return {result:deny('DOWNTIME_BEAT_REQUIRED'),record:r};
        if(!id(operationId))return {result:deny('WORLD_OPERATION_ID_REQUIRED'),record:r};
        // A retry of an already-saved operation is a receipt reconciliation,
        // not another World Engine time advance. Match the original days first.
        const existing=r.story.history.find(h=>h?.type==='world_time_advance'&&h.operationId===operationId);
        if(existing&&existing.days!==days)
          return {result:deny('WORLD_OPERATION_ID_CONFLICT'),record:r};
        // Preflight local invariants only for a NEW operation. A valid replay
        // must still work after the three-day limit has already been reached.
        let planned=null;
        if(!existing){
          try{planned=recordTheJacketDowntime(r.story,days,{actor});}
          catch(_){return {result:deny('DOWNTIME_PRECONDITION_FAILED'),record:r};}
        }
        if(typeof verifyWorldTimeAdvance!=='function')
          return {result:deny('WORLD_TIME_VERIFICATION_HOST_REQUIRED'),record:r};
        const campaignId=c.campaignState?.session?.campaignId||c.campaignState?.campaignId;
        const characterId=c.characterId;
        if(!id(campaignId)||!id(characterId))
          return {result:deny('WORLD_TIME_SCOPE_REQUIRED'),record:r};
        let proof;
        try{proof=await verifyWorldTimeAdvance({days,operationId,campaignId,characterId,
          story:clone(r.story),worldClock:clone(c.campaignState?.worldClock||null)});}
        catch(_){return {result:deny('WORLD_TIME_VERIFICATION_FAILED'),record:r};}
        if(proof?.ok!==true||proof?.committed!==true||proof?.durable!==true||
          proof?.authority!=='world_engine'||proof?.days!==days||
          proof?.operationId!==operationId||proof?.campaignId!==campaignId||
          proof?.characterId!==characterId)
          return {result:deny('WORLD_TIME_ADVANCE_NOT_CONFIRMED'),record:r};
        if(existing)return {result:{...success,committed:true,duplicate:true,operationId},record:r};
        planned.history.push({type:'world_time_advance',operationId,days,authority:'world_engine'});
        return {result:success,record:{...r,story:planned}};
      },{actor});
    },
    resolveRule(contractId,{context={},actor='player'}={}){
      return execute('rules',async r=>{
        if(CONTRACT_BEATS[contractId]&&!CONTRACT_BEATS[contractId].includes(r.story.current))
          return {result:deny('RULE_CONTRACT_BEAT_MISMATCH'),record:r};
        const out=await resolveTheJacketRule(r.story,r.mechanics,contractId,rulesAdapter,{context});
        return {result:out.result,record:{...r,mechanics:out.mechanicsState}};
      },{actor});
    },
    resolveDowntime({characterId,day,action,context={},actor='player'}={}){
      return execute('downtime-rule',async (r,c)=>{
        if(characterId!==c.characterId)return {result:deny('DOWNTIME_CHARACTER_SCOPE_MISMATCH'),record:r};
        if(r.story.current!=='downtime')return {result:deny('DOWNTIME_BEAT_REQUIRED'),record:r};
        if(!Number.isSafeInteger(day)||day<1||day>r.story.downtimeDays)
          return {result:deny('DOWNTIME_DAY_NOT_WORLD_CONFIRMED'),record:r};
        const out=await resolveTheJacketDowntimeAction(r.story,r.mechanics,
          {characterId,day,action,context},rulesAdapter);
        return {result:out.result,record:{...r,mechanics:out.mechanicsState}};
      },{actor});
    },
    resolveEconomy(request,{actor='player'}={}){
      return execute('economy',async (r,c)=>{
        // A matching ledger entry is already verified and must replay idempotently
        // even if inventory has since consumed the recovered item.
        const prior=r.mechanics.economicLedger.find(e=>e.transactionId===request?.transactionId);
        if(prior){
          const exact=prior.operation===request.operation&&prior.crewSize===request.crewSize&&
            same(prior.itemIds,request.itemIds||[]);
          if(!exact)return {result:deny('TRANSACTION_ID_CONFLICT'),record:r};
          // A saved ledger is not a substitute for the wallet's durable receipt.
          // Reconciliation must not re-run item eligibility (items may have been
          // consumed after payout), and may not manufacture a second credit.
          const campaignId=c.campaignState?.session?.campaignId||c.campaignState?.campaignId;
          const confirmation=await walletAdapter.resolve({type:'SALE',operation:'MISSION_REWARD',
            adventure:'CEMK_THE_JACKET',rewardSource:prior.operation,
            transactionId:prior.transactionId,crewSize:prior.crewSize,
            itemIds:[...prior.itemIds],amount:prior.amount,currency:'EUR'},
            {context:{campaignId,accountId}});
          if(confirmation?.ok!==true||confirmation?.committed!==true||
             confirmation?.transactionId!==prior.transactionId||confirmation?.amount!==prior.amount)
            return {result:deny('LEDGER_WALLET_RECEIPT_NOT_CONFIRMED'),record:r};
          return {result:{...success,committed:true,duplicate:true,
            transactionId:prior.transactionId},record:r};
        }
        // A player-supplied item ID or crew size is NOT proof of a recovered item.
        // Require independent Rules/Inventory host eligibility before any credit.
        if(typeof verifyRewardEligibility!=='function')
          return {result:deny('MISSION_REWARD_ELIGIBILITY_HOST_REQUIRED'),record:r};
        let proof;
        try{proof=await verifyRewardEligibility({
          request:clone(request),story:clone(r.story),mechanics:clone(r.mechanics),
          campaignId:c.campaignState?.session?.campaignId||c.campaignState?.campaignId
        });}catch(_){return {result:deny('MISSION_REWARD_ELIGIBILITY_CHECK_FAILED'),record:r};}
        if(proof?.ok!==true||proof?.eligible!==true||proof?.authority!=='rules_engine'||
          proof?.transactionId!==request?.transactionId||proof?.operation!==request?.operation||
          proof?.crewSize!==request?.crewSize||
          JSON.stringify(proof?.itemIds||[])!==JSON.stringify(request?.itemIds||[]))
          return {result:deny('MISSION_REWARD_ELIGIBILITY_NOT_CONFIRMED'),record:r};
        const campaignId=c.campaignState?.session?.campaignId||c.campaignState?.campaignId;
        const walletRules={resolve:(action,meta={})=>walletAdapter.resolve(action,{
          ...meta,context:{...(meta.context||{}),campaignId,accountId}
        })};
        const out=await resolveTheJacketEconomy(r.story,r.mechanics,request,walletRules);
        return {result:out.result,record:{...r,mechanics:out.mechanicsState}};
      },{actor});
    }
  });
}
