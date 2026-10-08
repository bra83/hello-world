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
test('ten stat rows visually verified; derived HP, death save and humanity agree',()=>{
 const complete=SINGLE_SHOT_PREGEN_SKILL_PROFILES.filter(x=>x.statsVerifiedFromPageImage);
 assert.equal(complete.length,10);
 assert.ok(complete.every(x=>x.stats.length===10&&!x.unresolvedStatExtraction));
 for(const p of complete){
  assert.equal(p.derived[0],10+5*Math.ceil((p.stats[5]+p.stats[8])/2));
  assert.equal(p.derived[2],p.stats[8]);
  assert.equal(Math.floor(p.derived[3]/10),p.stats[9]);
  assert.equal(p.humanityMaximum,p.empathyMaximum*10);
 }
 assert.equal(complete[0].stats[9],6);
 assert.equal(complete[5].stats[0],8);
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
