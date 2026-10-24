import test from 'node:test';
import assert from 'node:assert/strict';
import {CyberpunkRulesAdapter,CyberpunkLocationResolver} from '../runtime/cyberpunk_host_adapters.js';
const atlas={poiCatalog:[{code:'NIGHT-MARKET',atlasId:'night-city-2045',position:{x:5,y:9}}]};
const original=()=>({characterId:'char-a',worldPosition:{atlasId:'night-city-2045',x:0,y:0}});
test('Rules adapter blocks ambiguous bridge receipts and narrator attribution',async()=>{
 for(const reply of [null,{resolved:true},{ok:true},{ok:true,resolved:true,authority:'ai'},
   {ok:true,resolved:true,authority:'Gemini'},{ok:true,resolved:true,blocked:true}]){
  const adapter=new CyberpunkRulesAdapter({bridge:{resolveAdventureRuleAction:async()=>reply}});
  const out=await adapter.resolve({type:'SKILL_CHECK'});
  assert.equal(out.ok,false,JSON.stringify(reply));
  assert.equal(out.resolved,false,JSON.stringify(reply));
  assert.equal(out.blocked,true,JSON.stringify(reply));
 }
});
test('Rules adapter allows explicit authoritative bridge acknowledgment',async()=>{
 const adapter=new CyberpunkRulesAdapter({bridge:{resolveAdventureRuleAction:async()=>({ok:true,resolved:true,authority:'rules_engine',total:14})}});
 const out=await adapter.resolve({type:'SKILL_CHECK'});
 assert.equal(out.ok,true);assert.equal(out.total,14);
});
test('Atlas host receipt cannot reposition a character after active character changes',async()=>{
 const a=original(),b={characterId:'char-b',worldPosition:{x:33,y:44}};
 let active=a,finish;
 const gate=new Promise(r=>finish=r);
 const resolver=new CyberpunkLocationResolver({atlas,getCharacter:()=>active,
  bridge:{moveCharacter:async()=>{await gate;return {ok:true,resolved:true,worldPosition:{atlasId:'night-city-2045',x:5,y:9}}}}});
 const pending=resolver.position('NIGHT-MARKET');
 active=b;finish();const out=await pending;
 assert.equal(out.ok,false);assert.equal(out.reason,'ACTIVE_CHARACTER_CHANGED');
 assert.deepEqual(a.worldPosition,{atlasId:'night-city-2045',x:0,y:0});
 assert.deepEqual(b.worldPosition,{x:33,y:44});
});
test('Atlas rejects host receipts for different coordinates or atlas',async()=>{
 for(const worldPosition of [{x:99,y:9},{x:5,y:9,atlasId:'other'}]){
  const c=original();const resolver=new CyberpunkLocationResolver({atlas,getCharacter:()=>c,
   bridge:{moveCharacter:async()=>({ok:true,resolved:true,worldPosition})}});
  const out=await resolver.position('NIGHT-MARKET');
  assert.equal(out.reason,'WORLD_POSITION_RECEIPT_MISMATCH');
  assert.equal(c.worldPosition.x,0);
 }
});
test('Atlas accepts matching authoritative host receipt without overwriting other fields',async()=>{
 const c=original();const resolver=new CyberpunkLocationResolver({atlas,getCharacter:()=>c,
  bridge:{moveCharacter:async()=>({ok:true,resolved:true,worldPosition:{atlasId:'night-city-2045',x:5,y:9,travelMode:'walk'}})}});
 const out=await resolver.position('NIGHT-MARKET');
 assert.equal(out.ok,true);assert.equal(c.worldPosition.x,5);assert.equal(c.worldPosition.travelMode,'walk');
});
