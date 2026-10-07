import {CEMK_THE_JACKET_VERSION,validateTheJacketState} from "./cemk_the_jacket_registry.js";
const clone=v=>JSON.parse(JSON.stringify(v));
export const THE_JACKET_MECHANICS_VERSION=1;
export const THE_JACKET_RULE_CONTRACTS=Object.freeze({
 falco_human_perception:{type:"SKILL_CHECK",skill:"Human Perception",dv:9},
 falco_trading:{type:"SKILL_CHECK",skill:"Trading",dv:17,modifiers:{fixer:4}},
 first_fight_perception:{type:"SKILL_CHECK",skill:"Perception",dv:13},
 first_fight_floodlight:{type:"NETRUN",interfaceDV:6},
 toms_diner_camera:{type:"NETRUN",skill:"Interface"},
 downtime_medical:{type:"MEDICAL"},downtime_purchase:{type:"PURCHASE"},downtime_sale:{type:"SALE"},
 downtime_repair:{type:"REPAIR"},downtime_cyberware:{type:"CYBERWARE_INSTALL"},downtime_rest:{type:"REST"}
});
export const THE_JACKET_ECONOMY=Object.freeze({falcoPerRecoveredItemPerPerson:500,completeSetGroupBonus:1000,advancePerPerson:500,arasakaBiomonitorOffer:5000});
export const THE_JACKET_DOWNTIME_ACTIONS=Object.freeze(["MEDICAL","PURCHASE","SALE","REPAIR","CYBERWARE_INSTALL","REST","LUCK_RESTORE","REPLACEMENT_EDGERUNNER"]);
export function createTheJacketMechanicsState(){return{version:THE_JACKET_MECHANICS_VERSION,resolvedRules:[],downtimeActions:{},history:[]};}
export function validateTheJacketMechanicsState(s){if(!s||s.version!==1||!Array.isArray(s.resolvedRules)||!Array.isArray(s.history)||!s.downtimeActions||typeof s.downtimeActions!=="object")throw new Error("INVALID_THE_JACKET_MECHANICS_STATE");return true;}
export function recordDowntimeAction(state,{characterId,day,action}){validateTheJacketMechanicsState(state);if(!characterId)throw new Error("CHARACTER_REQUIRED");if(!Number.isInteger(day)||day<1||day>3)throw new Error("DOWNTIME_DAY_1_TO_3");if(!THE_JACKET_DOWNTIME_ACTIONS.includes(action))throw new Error("UNKNOWN_DOWNTIME_ACTION");const key=characterId+":"+day;if(state.downtimeActions[key])throw new Error("DOWNTIME_ACTION_ALREADY_USED");const s=clone(state);s.downtimeActions[key]=action;s.history.push({type:"downtime_action",characterId,day,action});return s;}
export async function resolveTheJacketRule(adventureState,mechanicsState,contractId,rulesAdapter,{context={}}={}){validateTheJacketState(adventureState);validateTheJacketMechanicsState(mechanicsState);const contract=THE_JACKET_RULE_CONTRACTS[contractId];if(!contract)throw new Error("UNKNOWN_RULE_CONTRACT");if(!rulesAdapter||typeof rulesAdapter.resolve!=="function")return{mechanicsState:clone(mechanicsState),result:{ok:false,resolved:false,blocked:true,reason:"RULES_ADAPTER_REQUIRED"}};const result=await rulesAdapter.resolve(clone(contract),{adventureState,context:{...clone(context),adventure:"CEMK_THE_JACKET",contractId}});if(!result?.resolved||result?.blocked)return{mechanicsState:clone(mechanicsState),result};const s=clone(mechanicsState);s.resolvedRules.push({contractId,result:clone(result)});s.history.push({type:"rule_resolved",contractId,authority:result.authority||"rules_engine"});return{mechanicsState:s,result};}
export function theJacketMechanicsAIContext(state){validateTheJacketMechanicsState(state);return Object.freeze({version:state.version,resolvedRuleCount:state.resolvedRules.length,authority:Object.freeze({mutateState:false,resolveRules:false,fabricateRoll:false,inventRules:false})});}
