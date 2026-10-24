import test from 'node:test';
import assert from 'node:assert/strict';
import {SINGLE_SHOT_PREGEN_LOADOUTS,getSingleShotLoadout} from '../runtime/single_shot_pregen_loadouts.js';
import {validateSingleShotPregenPair,prepareSingleShotPregenPreview,
 prepareSingleShotRosterPreviews,assertSingleShotPlayablePromotion} from '../runtime/single_shot_pregen_preview.js';
const profile=(id='ssp_pregen_01')=>({id,sourceRef:getSingleShotLoadout(id).sourceRef,
 statsVerifiedFromPageImage:true,unresolvedStatExtraction:false,
 stats:[5,6,7,5,7,8,5,7,3,6],derived:[40,20,3,61],
 empathyMaximum:7,humanityMaximum:70,
 skills:Array.from({length:20},(_,i)=>[`Skill ${i+1}`,5,2,0,7])});

test('source-bound preview contains no gameplay mutations or playable flag',()=>{
 const p=prepareSingleShotPregenPreview({id:'ssp_pregen_01',skillProfile:profile()});
 assert.equal(p.name,'Forty');assert.equal(p.stats.INT,5);assert.equal(p.stats.EMP,6);
 assert.equal(p.skills.length,20);assert.equal(p.playable,false);
 assert.equal(p.inventoryCommitted,false);assert.equal(p.walletCredited,false);
 assert.equal(p.blockers.length,6);assert.equal(Object.isFrozen(p),true);
});

test('source pages must match between numeric sheet and loadout',()=>{
 const p=profile();p.sourceRef='R5.63';
 assert.throws(()=>prepareSingleShotPregenPreview({id:p.id,skillProfile:p}),/SOURCE_ID_MISMATCH/);
});

test('tampered stats cannot create a preview',()=>{
 const p=profile();p.stats[0]=99;
 assert.throws(()=>validateSingleShotPregenPair(p,getSingleShotLoadout(p.id)),/NUMERIC_PROFILE_INVALID/);
});

test('tampered skill totals cannot create a preview',()=>{
 const p=profile();p.skills[0][4]=999;
 assert.throws(()=>prepareSingleShotPregenPreview({id:p.id,skillProfile:p}),/SKILL_MATH_INVALID/);
});

test('derived HP/Humanity inconsistencies are blocked',()=>{
 const p=profile();p.derived[0]=999;
 assert.throws(()=>prepareSingleShotPregenPreview({id:p.id,skillProfile:p}),/DERIVED_MATH_INVALID/);
});

test('loadout cannot be marked visually verified by accident',()=>{
 const l=getSingleShotLoadout('ssp_pregen_01');l.imageVerified=true;
 assert.throws(()=>prepareSingleShotPregenPreview({id:l.id,skillProfile:profile(),loadout:l}),/SOURCE_VERIFICATION_INCOMPLETE/);
});

test('roster preview requires 10 source-matched unique characters',()=>{
 const profiles=SINGLE_SHOT_PREGEN_LOADOUTS.map(l=>profile(l.id));
 const roster=prepareSingleShotRosterPreviews({profiles,loadouts:SINGLE_SHOT_PREGEN_LOADOUTS});
 assert.equal(roster.length,10);assert.equal(roster[9].role,'Exec');
 assert.equal(roster.every(x=>x.playable===false),true);
 assert.throws(()=>prepareSingleShotRosterPreviews({profiles:profiles.slice(1),loadouts:SINGLE_SHOT_PREGEN_LOADOUTS}),/ROSTER_INVALID/);
});

test('no preview can bypass native character factory through a promoted flag',()=>{
 const p=prepareSingleShotPregenPreview({id:'ssp_pregen_01',skillProfile:profile()});
 assert.throws(()=>assertSingleShotPlayablePromotion(p),/PROMOTION_BLOCKED/);
 assert.throws(()=>assertSingleShotPlayablePromotion({...p,playable:true}),/NOT_IMPLEMENTED/);
});
