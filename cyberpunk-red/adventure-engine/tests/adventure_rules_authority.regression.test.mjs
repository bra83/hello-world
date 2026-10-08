import test from 'node:test';
import assert from 'node:assert/strict';
import {AdventureRuntime} from '../runtime/adventure_engine_v2.js';
const module={id:'rules-authority-regression',schemaVersion:1,contentVersion:1,systemId:'cyberpunk-red',
 title:'Rules authority',campaignType:'OFFICIAL_ADVENTURE',
 startDefinition:{startingLocation:'start',initialConsequences:[]},
 locations:[{id:'start',name:'Start',sourceReference:{sourceBook:'Test'}}],
 events:[{id:'event-check',trigger:{type:'ON_FLAG',target:'go'},repeatPolicy:'UNTIL_SUCCESS',
 ruleActions:[{id:'check',type:'SKILL_CHECK',required:true}],
 consequences:[{type:'SET_FLAG',target:'paid',value:true}],sourceReference:{sourceBook:'Test'}}],
 objectives:[],scenes:[],npcs:[],clues:[],secrets:[],clocks:[],completionConditions:[],failureConditions:[]};
const rng={random:()=>0,int:()=>0};
async function run(resolve){
 const rt=new AdventureRuntime(module,{rng,rulesAdapter:{resolve}});
 await rt.start();const rows=await rt.processEvent({type:'ON_FLAG',flag:'go'});
 return {rt,row:rows[0]};
}
test('ambiguous ok=true without resolved=true cannot trigger consequences',async()=>{
 const {rt,row}=await run(async()=>({ok:true}));
 assert.equal(row.blockedByRules,true);assert.equal(rt.state.flags.paid,undefined);
 assert.equal(rt.state.ruleResults.length,0);assert.equal(rt.state.pendingRuleActions.length,1);
 assert.equal(rt.state.triggeredEventIds.includes('event-check'),false);
});
test('host exception fails closed, remains retryable, no leaked exception',async()=>{
 const {rt,row}=await run(async()=>{throw Error('secret host details')});
 assert.equal(row.blockedByRules,true);assert.equal(rt.state.flags.paid,undefined);
 assert.equal(rt.state.pendingRuleActions[0].reason,'RULES_ADAPTER_ERROR');
});
test('null, blocked, and resolved=false are never success',async()=>{
 for(const result of [null,{ok:true,resolved:false},{ok:true,resolved:true,blocked:true}]){
  const {rt,row}=await run(async()=>result);
  assert.equal(row.blockedByRules,true);assert.equal(rt.state.flags.paid,undefined);
 }
});
test('explicit Rules Engine success applies exactly once',async()=>{
 const {rt,row}=await run(async()=>({ok:true,resolved:true,blocked:false,authority:'rules_engine'}));
 assert.equal(row.blockedByRules,false);assert.equal(rt.state.flags.paid,true);
 assert.equal(rt.state.ruleResults.length,1);assert.equal(rt.state.pendingRuleActions.length,0);
 await rt.processEvent({type:'ON_FLAG',flag:'go'});
 assert.equal(rt.state.campaignConsequences.filter(x=>x.target==='paid').length,1);
});
