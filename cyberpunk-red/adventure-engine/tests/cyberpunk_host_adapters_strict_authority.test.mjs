import test from 'node:test';
import assert from 'node:assert/strict';
import {CyberpunkRulesAdapter,CyberpunkLocationResolver} from '../runtime/cyberpunk_host_adapters.js';
test('host must explicitly acknowledge ok and resolved; reject AI-attributed result',()=>{
 const adapter=new CyberpunkRulesAdapter();
 for(const payload of [{resolved:true},{ok:true},{ok:false,resolved:true},
  {ok:true,resolved:true,authority:'ai'},
  {ok:true,resolved:true,authority:'narrator'},
  {ok:true,resolved:true,authority:'gemini'}]){
   const result=adapter.normalizeResult(payload,'SKILL_CHECK',{type:'SKILL_CHECK'},'bridge');
   assert.equal(result.ok,false,JSON.stringify(payload));
   assert.equal(result.blocked,true,JSON.stringify(payload));
 }
 assert.equal(adapter.normalizeResult({ok:true,resolved:true,blocked:false,authority:'rules_engine'},
  'SKILL_CHECK',{type:'SKILL_CHECK'},'bridge').ok,true);
});
test('Atlas does not mutate world position without explicit host acknowledgment',async()=>{
 const atlas={poiCatalog:[{code:'p',position:{x:10,y:20}}]};
 for(const receipt of [{worldPosition:{x:10,y:20}},
  {ok:true,worldPosition:{x:10,y:20}},
  {ok:false,resolved:true,worldPosition:{x:10,y:20}}]){
  const c={characterId:'pc',worldPosition:{x:0,y:0}};
  const adapter=new CyberpunkLocationResolver({atlas,getCharacter:()=>c,
   bridge:{moveCharacter:async()=>receipt}});
  assert.equal((await adapter.position('p')).ok,false);
  assert.deepEqual(c.worldPosition,{x:0,y:0});
 }
 const c={characterId:'pc',worldPosition:{x:0,y:0}};
 const adapter=new CyberpunkLocationResolver({atlas,getCharacter:()=>c,
  bridge:{moveCharacter:async()=>({ok:true,resolved:true,worldPosition:{x:10,y:20}})}});
 assert.equal((await adapter.position('p')).ok,true);
 assert.deepEqual(c.worldPosition,{x:10,y:20});
});
