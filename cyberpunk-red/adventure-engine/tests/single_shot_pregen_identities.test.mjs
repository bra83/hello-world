import test from 'node:test';
import assert from 'node:assert/strict';
import {SINGLE_SHOT_PREGEN_IDENTITIES,getSingleShotPregenIdentity,buildSingleShotPregenIdentityAiContext} from '../runtime/single_shot_pregen_identities.js';
import {SINGLE_SHOT_PREGEN_SLOTS} from '../runtime/single_shot_pack_registry.js';
test('ten source-bound identities map to ten still-unpromoted character sheets',()=>{
 assert.equal(SINGLE_SHOT_PREGEN_IDENTITIES.length,10);
 assert.deepEqual(SINGLE_SHOT_PREGEN_IDENTITIES.map(x=>x.id),SINGLE_SHOT_PREGEN_SLOTS.map(x=>x.id));
 assert.deepEqual(SINGLE_SHOT_PREGEN_IDENTITIES.map(x=>x.role),['Rockerboy','Fixer','Solo','Nomad','Netrunner','Tech','Medtech','Media','Lawman','Exec']);
 assert.equal(new Set(SINGLE_SHOT_PREGEN_IDENTITIES.map(x=>x.id)).size,10);
 for(const row of SINGLE_SHOT_PREGEN_IDENTITIES){
  assert.equal(row.sourceBound,true);assert.equal(row.identityVerified,true);assert.equal(row.fullSheetPromoted,false);
  assert.equal('stats' in row,false);assert.equal('skills' in row,false);
 }
});
test('canonical sheet page provenance is stable',()=>{
 for(let i=0;i<10;i++)assert.equal(SINGLE_SHOT_PREGEN_IDENTITIES[i].sourceRef,'Single Shot Pack v1.1:p'+(4+i*2));
 assert.equal(getSingleShotPregenIdentity('ssp_pregen_08').handle,'24/7');
 assert.equal(getSingleShotPregenIdentity('ssp_pregen_09').handle,'Suri “Cavalry” Navarro');
 assert.equal(getSingleShotPregenIdentity('missing'),null);
});
test('AI sees only explicitly discovered identities and no invented sheets',()=>{
 const none=buildSingleShotPregenIdentityAiContext();
 assert.equal(none.identities.length,0);assert.equal(none.readOnly,true);
 const one=buildSingleShotPregenIdentityAiContext(['ssp_pregen_01','not-real']);
 assert.equal(one.identities.length,1);assert.equal(one.identities[0].handle,'Forty');
 assert.equal(one.fullSheetPromoted,false);
 assert.ok(one.forbidden.includes('invent_character_stats'));
});
