import test from 'node:test';
import assert from 'node:assert/strict';
import {SINGLE_SHOT_PREGEN_SKILL_PROFILES,validateSingleShotSkillProfiles,getSingleShotSkillProfile} from '../runtime/single_shot_pregen_skill_profiles.js';
test('all ten sheets have 20 source-bound validated skills',()=>{
 assert.equal(validateSingleShotSkillProfiles(),true);
 assert.equal(SINGLE_SHOT_PREGEN_SKILL_PROFILES.length,10);
 assert.equal(SINGLE_SHOT_PREGEN_SKILL_PROFILES.reduce((n,p)=>n+p.skills.length,0),200);
 for(const p of SINGLE_SHOT_PREGEN_SKILL_PROFILES){
  assert.equal(new Set(p.skills.map(x=>x[0])).size,20);
  assert.ok(p.skills.every(x=>x[1]+x[2]+x[3]===x[4]));
 }
});
test('five complete stat rows, five extraction gaps never invented',()=>{
 const complete=SINGLE_SHOT_PREGEN_SKILL_PROFILES.filter(x=>x.stats!==null);
 assert.equal(complete.length,5);
 assert.deepEqual(SINGLE_SHOT_PREGEN_SKILL_PROFILES.filter(x=>x.unresolvedStatExtraction).map(x=>x.id),
  ['ssp_pregen_06','ssp_pregen_07','ssp_pregen_08','ssp_pregen_09','ssp_pregen_10']);
 assert.ok(complete.every(x=>x.stats.length===10));
});
test('source references and derived stats remain available',()=>{
 for(let i=0;i<10;i++){
  const p=getSingleShotSkillProfile('ssp_pregen_'+String(i+1).padStart(2,'0'));
  assert.equal(p.sourceRef,'Single Shot Pack v1.1:p'+(4+2*i));
  assert.equal(p.derived.length,4);
  assert.ok(p.derived.every(Number.isInteger));
 }
 assert.equal(getSingleShotSkillProfile('nonexistent'),null);
});
