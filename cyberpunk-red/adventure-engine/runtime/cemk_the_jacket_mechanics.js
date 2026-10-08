import {validateTheJacketState} from './cemk_the_jacket_registry.js';
const clone = value => JSON.parse(JSON.stringify(value));
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const positiveInt = value => Number.isSafeInteger(value) && value > 0;
const validId = value => typeof value === 'string' && /^[a-zA-Z0-9_.:-]{1,120}$/.test(value);
const blocked = reason => ({ok:false,resolved:false,blocked:true,reason});
const accepted = result => result?.ok !== false && result?.resolved === true && result?.blocked !== true;
export const THE_JACKET_MECHANICS_VERSION = 2;
export const THE_JACKET_RULE_CONTRACTS = Object.freeze({
  falco_human_perception:{type:'SKILL_CHECK',skill:'Human Perception',dv:9},
  falco_trading:{type:'SKILL_CHECK',skill:'Trading',dv:17,modifiers:{fixer:4}},
  first_fight_perception:{type:'SKILL_CHECK',skill:'Perception',dv:13},
  first_fight_floodlight:{type:'NETRUN',interfaceDV:6},
  toms_diner_camera:{type:'NETRUN',skill:'Interface'},
  downtime_medical:{type:'MEDICAL'},downtime_purchase:{type:'PURCHASE'},
  downtime_sale:{type:'SALE'},downtime_repair:{type:'REPAIR'},
  downtime_cyberware:{type:'CYBERWARE_INSTALL'},downtime_rest:{type:'REST'}
});
export const THE_JACKET_ECONOMY = Object.freeze({
  falcoPerRecoveredItemPerPerson:500,completeSetGroupBonus:1000,
  advancePerPerson:500,arasakaBiomonitorOffer:5000
});
export const THE_JACKET_DOWNTIME_ACTIONS = Object.freeze([
  'MEDICAL','PURCHASE','SALE','REPAIR','CYBERWARE_INSTALL','REST','LUCK_RESTORE','REPLACEMENT_EDGERUNNER'
]);
const DOWNTIME_RULE_TYPES = Object.freeze({
  MEDICAL:'MEDICAL',PURCHASE:'PURCHASE',SALE:'SALE',REPAIR:'REPAIR',
  CYBERWARE_INSTALL:'CYBERWARE_INSTALL',REST:'REST',LUCK_RESTORE:'REST',
  REPLACEMENT_EDGERUNNER:'ROLE_ABILITY'
});
const ECONOMY_OPERATIONS = Object.freeze(['FALCO_ITEMS','FALCO_ADVANCE','FALCO_FULL_SET_BONUS','ARASAKA_BIOMONITOR']);
export function createTheJacketMechanicsState(){return {version:2,resolvedRules:[],downtimeActions:{},economicLedger:[],history:[]};}
export function validateTheJacketMechanicsState(state){
  if(!plain(state)||state.version!==2||!Array.isArray(state.resolvedRules)||
     !Array.isArray(state.history)||!plain(state.downtimeActions)||!Array.isArray(state.economicLedger))
    throw new Error('INVALID_THE_JACKET_MECHANICS_STATE');
  for(const [key,action] of Object.entries(state.downtimeActions)){
    if(!validId(key)||!THE_JACKET_DOWNTIME_ACTIONS.includes(action))throw new Error('INVALID_DOWNTIME_ENTRY');
  }
  const ids=new Set(),paidItems=new Set(),singles=new Set();
  for(const entry of state.economicLedger){
    if(!plain(entry)||!validId(entry.transactionId)||!ECONOMY_OPERATIONS.includes(entry.operation)||
       !positiveInt(entry.amount)||!validId(entry.authority)||!Array.isArray(entry.itemIds)||
       entry.itemIds.some(id=>!validId(id))||new Set(entry.itemIds).size!==entry.itemIds.length)
      throw new Error('INVALID_ECONOMIC_LEDGER');
    if(!positiveInt(entry.crewSize)||entry.crewSize>30||
       planTheJacketPayout({operation:entry.operation,crewSize:entry.crewSize,itemIds:entry.itemIds}).amount!==entry.amount)
      throw new Error('ECONOMIC_LEDGER_AMOUNT_MISMATCH');
    if(ids.has(entry.transactionId))throw new Error('DUPLICATE_TRANSACTION_ID');
    ids.add(entry.transactionId);
    if(entry.operation==='FALCO_ITEMS'){
      if(!entry.itemIds.length)throw new Error('EMPTY_FALCO_ITEMS');
      for(const id of entry.itemIds){if(paidItems.has(id))throw new Error('ITEM_REWARDED_TWICE');paidItems.add(id);}
    }else{
      if(entry.itemIds.length)throw new Error('UNEXPECTED_ITEM_IDS');
      if(singles.has(entry.operation))throw new Error('DUPLICATE_SINGLE_PAYOUT');
      singles.add(entry.operation);
    }
  }
  return true;
}
export function loadTheJacketMechanicsState(raw){
  const state=typeof raw==='string'?JSON.parse(raw):clone(raw);
  if(state?.version===1){state.version=2;state.economicLedger=[];}
  validateTheJacketMechanicsState(state);return state;
}
export function serializeTheJacketMechanicsState(state){validateTheJacketMechanicsState(state);return JSON.stringify(state);}
export function recordDowntimeAction(state,{characterId,day,action}){
  validateTheJacketMechanicsState(state);
  if(!validId(characterId))throw new Error('CHARACTER_REQUIRED');
  if(!Number.isInteger(day)||day<1||day>3)throw new Error('DOWNTIME_DAY_1_TO_3');
  if(!THE_JACKET_DOWNTIME_ACTIONS.includes(action))throw new Error('UNKNOWN_DOWNTIME_ACTION');
  const key=characterId+':'+day;
  if(state.downtimeActions[key])throw new Error('DOWNTIME_ACTION_ALREADY_USED');
  const next=clone(state);next.downtimeActions[key]=action;
  next.history.push({type:'downtime_action_recorded',characterId,day,action});
  return next;
}
export async function resolveTheJacketRule(adventureState,mechanicsState,contractId,rulesAdapter,{context={}}={}){
  validateTheJacketState(adventureState);validateTheJacketMechanicsState(mechanicsState);
  const contract=THE_JACKET_RULE_CONTRACTS[contractId];
  if(!contract)throw new Error('UNKNOWN_RULE_CONTRACT');
  if(!rulesAdapter||typeof rulesAdapter.resolve!=='function')return {mechanicsState:clone(mechanicsState),result:blocked('RULES_ADAPTER_REQUIRED')};
  let result;
  try{result=await rulesAdapter.resolve(clone(contract),{adventureState:clone(adventureState),context:{...clone(context),adventure:'CEMK_THE_JACKET',contractId}});}
  catch(error){return {mechanicsState:clone(mechanicsState),result:blocked('RULES_ADAPTER_ERROR')};}
  if(!accepted(result))return {mechanicsState:clone(mechanicsState),result:result||blocked('RULES_RESULT_MISSING')};
  const next=clone(mechanicsState);
  next.resolvedRules.push({contractId,result:clone(result)});
  next.history.push({type:'rule_resolved',contractId,authority:result.authority||'rules_engine'});
  return {mechanicsState:next,result};
}
export async function resolveTheJacketDowntimeAction(adventureState,mechanicsState,{characterId,day,action,context={}},rulesAdapter){
  validateTheJacketState(adventureState);validateTheJacketMechanicsState(mechanicsState);
  recordDowntimeAction(mechanicsState,{characterId,day,action});
  if(!rulesAdapter||typeof rulesAdapter.resolve!=='function')return {mechanicsState:clone(mechanicsState),result:blocked('RULES_ADAPTER_REQUIRED')};
  const rule={type:DOWNTIME_RULE_TYPES[action],operation:action,characterId,day};
  let result;
  try{result=await rulesAdapter.resolve(rule,{adventureState:clone(adventureState),context:{...clone(context),adventure:'CEMK_THE_JACKET',characterId,day}});}
  catch(error){return {mechanicsState:clone(mechanicsState),result:blocked('RULES_ADAPTER_ERROR')};}
  if(!accepted(result)||result.committed!==true)return {mechanicsState:clone(mechanicsState),result:result||blocked('RULES_RESULT_MISSING')};
  const next=recordDowntimeAction(mechanicsState,{characterId,day,action});
  next.history.push({type:'downtime_rule_committed',characterId,day,action,authority:result.authority||'rules_engine'});
  return {mechanicsState:next,result};
}
export function planTheJacketPayout({operation,crewSize,itemIds=[]}={}){
  if(!ECONOMY_OPERATIONS.includes(operation))throw new Error('UNKNOWN_ECONOMIC_OPERATION');
  if(!positiveInt(crewSize)||crewSize>30)throw new Error('INVALID_CREW_SIZE');
  if(!Array.isArray(itemIds)||itemIds.some(id=>!validId(id))||new Set(itemIds).size!==itemIds.length)
    throw new Error('INVALID_ITEM_IDS');
  if(operation==='FALCO_ITEMS'&&!itemIds.length)throw new Error('RECOVERED_ITEMS_REQUIRED');
  if(operation!=='FALCO_ITEMS'&&itemIds.length)throw new Error('ITEM_IDS_NOT_APPLICABLE');
  const amount=operation==='FALCO_ITEMS'?500*crewSize*itemIds.length:
    operation==='FALCO_ADVANCE'?500*crewSize:
    operation==='FALCO_FULL_SET_BONUS'?1000:5000;
  return Object.freeze({operation,crewSize,itemIds:[...itemIds],amount,currency:'EUR'});
}
export async function resolveTheJacketEconomy(adventureState,mechanicsState,request,rulesAdapter){
  validateTheJacketState(adventureState);validateTheJacketMechanicsState(mechanicsState);
  const {transactionId,operation,crewSize,itemIds=[]}=request||{};
  if(!validId(transactionId))throw new Error('INVALID_TRANSACTION_ID');
  const plan=planTheJacketPayout({operation,crewSize,itemIds});
  const existing=mechanicsState.economicLedger.find(e=>e.transactionId===transactionId);
  if(existing){
    if(existing.operation!==operation||existing.amount!==plan.amount||existing.crewSize!==crewSize||
       JSON.stringify(existing.itemIds)!==JSON.stringify(itemIds))throw new Error('TRANSACTION_ID_CONFLICT');
    return {mechanicsState:clone(mechanicsState),result:{ok:true,resolved:true,duplicate:true,committed:true,transactionId}};
  }
  if(operation==='FALCO_ITEMS'&&itemIds.some(id=>mechanicsState.economicLedger.some(e=>e.itemIds.includes(id))))
    throw new Error('ITEM_REWARDED_TWICE');
  if(operation!=='FALCO_ITEMS'&&mechanicsState.economicLedger.some(e=>e.operation===operation))
    throw new Error('PAYOUT_ALREADY_COMMITTED');
  if(!rulesAdapter||typeof rulesAdapter.resolve!=='function')return {mechanicsState:clone(mechanicsState),result:blocked('RULES_ADAPTER_REQUIRED')};
  const rule={type:'SALE',operation:'MISSION_REWARD',adventure:'CEMK_THE_JACKET',
    rewardSource:operation,amount:plan.amount,currency:'EUR',transactionId,itemIds:[...itemIds],crewSize};
  let result;
  try{result=await rulesAdapter.resolve(rule,{adventureState:clone(adventureState),context:{adventure:'CEMK_THE_JACKET',transactionId}});}
  catch(error){return {mechanicsState:clone(mechanicsState),result:blocked('RULES_ADAPTER_ERROR')};}
  if(!accepted(result)||result.committed!==true||result.transactionId!==transactionId||result.amount!==plan.amount)
    return {mechanicsState:clone(mechanicsState),result:result||blocked('ECONOMIC_COMMIT_NOT_ACKNOWLEDGED')};
  const next=clone(mechanicsState);
  next.economicLedger.push({transactionId,operation,crewSize,itemIds:[...itemIds],amount:plan.amount,
    authority:validId(result.authority)?result.authority:'rules_engine'});
  next.history.push({type:'economic_commit',transactionId,operation,amount:plan.amount,authority:result.authority||'rules_engine'});
  validateTheJacketMechanicsState(next);
  return {mechanicsState:next,result};
}
export function theJacketMechanicsAIContext(state){
  validateTheJacketMechanicsState(state);
  return Object.freeze({version:state.version,resolvedRuleCount:state.resolvedRules.length,
    downtimeActionCount:Object.keys(state.downtimeActions).length,economicTransactionCount:state.economicLedger.length,
    authority:Object.freeze({mutateState:false,resolveRules:false,fabricateRoll:false,inventRules:false,
      commitEconomy:false,revealSealedSecrets:false})});
}
