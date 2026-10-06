import test from 'node:test';
import assert from 'node:assert/strict';
import {
 SINGLE_SHOT_PACK_SOURCE,SINGLE_SHOT_PREGEN_SLOTS,SINGLE_SHOT_NET_SLOTS,
 validateSingleShotPackRegistry,promoteSingleShotRecord,buildSingleShotAiContext
} from '../runtime/single_shot_pack_registry.js';

test('Single Shot Pack is source content, not a fabricated adventure',()=>{
 assert.equal(SINGLE_SHOT_PACK_SOURCE.adventure,false);
 assert.equal(SINGLE_SHOT_PACK_SOURCE.kind,'SOURCE_PACK');
});

test('canonical pack contract exposes exactly 10 pregens and 6 NET Architectures',()=>{
 assert.equal(SINGLE_SHOT_PREGEN_SLOTS.length,10);
 assert.equal(SINGLE_SHOT_NET_SLOTS.length,6);
 assert.deepEqual(validateSingleShotPackRegistry(),{ok:true,errors:[]});
});

test('unpromoted slots contain no fabricated source detail',()=>{
 for(const row of [...SINGLE_SHOT_PREGEN_SLOTS,...SINGLE_SHOT_NET_SLOTS]){
  assert.equal(row.promoted,false);
  assert.equal(row.sourceBound,true);
  assert.equal('name' in row,false);
  assert.equal('stats' in row,false);
  assert.equal('floors' in row,false);
  assert.equal('dv' in row,false);
 }
});

test('canonical promotion requires provenance and rejects generated data',()=>{
 const slot=SINGLE_SHOT_PREGEN_SLOTS[0];
 assert.throws(()=>promoteSingleShotRecord(slot,{name:'x'}),/sourceRef/);
 assert.throws(()=>promoteSingleShotRecord(slot,{sourceRef:'p1',generated:true}),/cannot use/);
 const promoted=promoteSingleShotRecord(slot,{sourceRef:'Single Shot Pack v1.1:p1',name:'source-name'});
 assert.equal(promoted.canonical,true);
 assert.equal(promoted.promoted,true);
});

test('AI context exposes only promoted source-bound records and remains read-only',()=>{
 const promoted=promoteSingleShotRecord(SINGLE_SHOT_PREGEN_SLOTS[0],{sourceRef:'p1',name:'source-name'});
 const ctx=buildSingleShotAiContext({pregens:[SINGLE_SHOT_PREGEN_SLOTS[1],promoted],netArchitectures:SINGLE_SHOT_NET_SLOTS});
 assert.equal(ctx.readOnly,true);
 assert.equal(ctx.adventure,false);
 assert.equal(ctx.pregens.length,1);
 assert.equal(ctx.netArchitectures.length,0);
 assert.ok(ctx.forbidden.includes('mutate_state'));
 assert.ok(ctx.forbidden.includes('invent_net_floor'));
 assert.ok(ctx.forbidden.includes('fabricate_rolls'));
});
