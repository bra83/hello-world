import test from 'node:test';
import assert from 'node:assert/strict';
import {createTheJacketState} from '../runtime/cemk_the_jacket_registry.js';
import {createTheJacketMechanicsState,resolveTheJacketRule,resolveTheJacketDowntimeAction} from '../runtime/cemk_the_jacket_mechanics.js';
const a=createTheJacketState(),m=createTheJacketMechanicsState();
test('The Jacket rules authority requires explicit ok=true, not just resolved=true',async()=>{
 for(const response of [{resolved:true},{ok:null,resolved:true},{ok:false,resolved:true},null]){
  const r=await resolveTheJacketRule(a,m,'falco_trading',{resolve:async()=>response});
  assert.deepEqual(r.mechanicsState,m);
 }
 const valid=await resolveTheJacketRule(a,m,'falco_trading',{resolve:async()=>({ok:true,resolved:true,blocked:false})});
 assert.equal(valid.mechanicsState.resolvedRules.length,1);
});
test('The Jacket downtime rejects ambiguous committed host response',async()=>{
 const r=await resolveTheJacketDowntimeAction(a,m,{characterId:'pc',day:1,action:'REST'},
  {resolve:async()=>({resolved:true,committed:true})});
 assert.deepEqual(r.mechanicsState,m);
});
