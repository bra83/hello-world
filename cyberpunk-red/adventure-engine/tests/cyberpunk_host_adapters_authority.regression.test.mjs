import test from 'node:test';
import assert from 'node:assert/strict';
import {CyberpunkRulesAdapter,CyberpunkLocationResolver} from '../runtime/cyberpunk_host_adapters.js';
test('empty and ambiguous Rules host results are blocked',()=>{
 const a=new CyberpunkRulesAdapter();
 for(const payload of [{},{ok:true},{resolved:false},{resolved:true,blocked:true},{resolved:true,ok:false}]){
  const r=a.normalizeResult(payload,'SKILL_CHECK',{type:'SKILL_CHECK'},'host');
  assert.equal(r.resolved,false,JSON.stringify(payload));assert.equal(r.blocked,true);
 }
 assert.equal(a.normalizeResult({resolved:true,ok:true,blocked:false},'SKILL_CHECK',{},'host').resolved,true);
});
test('Atlas host exception cannot mutate worldPosition',async()=>{
 const old={atlasId:'night-city-2045',x:1,y:2};
 const c={characterId:'pc1',worldPosition:{...old}},atlas={poiCatalog:[{code:'test-poi',position:{x:99,y:88}}]};
 const resolver=new CyberpunkLocationResolver({atlas,bridge:{moveCharacter:async()=>{throw Error('offline')}},getCharacter:()=>c});
 assert.equal((await resolver.position('test-poi')).resolved,false);assert.deepEqual(c.worldPosition,old);
});
test('Atlas host rejection cannot mutate worldPosition',async()=>{
 const old={atlasId:'night-city-2045',x:1,y:2};
 const c={characterId:'pc1',worldPosition:{...old}},atlas={poiCatalog:[{code:'test-poi',position:{x:99,y:88}}]};
 const resolver=new CyberpunkLocationResolver({atlas,bridge:{moveCharacter:async()=>({ok:false,blocked:true})},getCharacter:()=>c});
 assert.equal((await resolver.position('test-poi')).resolved,false);assert.deepEqual(c.worldPosition,old);
});
test('Atlas host unavailable cannot mutate worldPosition',async()=>{
 const old={atlasId:'night-city-2045',x:1,y:2};
 const c={characterId:'pc1',worldPosition:{...old}},atlas={poiCatalog:[{code:'test-poi',position:{x:99,y:88}}]};
 const resolver=new CyberpunkLocationResolver({atlas,getCharacter:()=>c});
 assert.equal((await resolver.position('test-poi')).resolved,false);assert.deepEqual(c.worldPosition,old);
});
test('Atlas confirmed position commits after host acknowledgment',async()=>{
 const c={characterId:'pc1',worldPosition:{atlasId:'old',x:1,y:2}},atlas={poiCatalog:[{code:'test-poi',position:{x:99,y:88}}]};
 const resolver=new CyberpunkLocationResolver({atlas,bridge:{moveCharacter:async(id,pos)=>({worldPosition:pos})},getCharacter:()=>c});
 assert.equal((await resolver.position('test-poi')).resolved,true);assert.equal(c.worldPosition.x,99);
});
