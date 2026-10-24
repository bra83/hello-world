import test from 'node:test';
import assert from 'node:assert/strict';
import {SINGLE_SHOT_PREGEN_LOADOUTS,validateSingleShotLoadouts,getSingleShotLoadout} from '../runtime/single_shot_pregen_loadouts.js';
test('ten source-bound pregen loadouts are structurally validated',()=>{
 assert.equal(validateSingleShotLoadouts(),true);
 assert.equal(SINGLE_SHOT_PREGEN_LOADOUTS.length,10);
 assert.equal(new Set(SINGLE_SHOT_PREGEN_LOADOUTS.map(x=>x.id)).size,10);
 assert.equal(SINGLE_SHOT_PREGEN_LOADOUTS.every(x=>x.armor.length===2&&x.cashEb===500),true);
});
test('loadouts preserve known role abilities, starter weapons and cyberware',()=>{
 assert.equal(getSingleShotLoadout('ssp_pregen_01').roleAbility,'Charismatic Impact');
 assert.equal(getSingleShotLoadout('ssp_pregen_04').roleAbility,'Moto');
 assert.equal(getSingleShotLoadout('ssp_pregen_05').gear.includes('Cyberdeck'),true);
 assert.equal(getSingleShotLoadout('ssp_pregen_06').weapons[0].ammo,4);
 assert.equal(getSingleShotLoadout('ssp_pregen_09').name,'Suri “Cavalry” Navarro');
 assert.equal(getSingleShotLoadout('ssp_pregen_10').roleAbility,'Teamwork');
});
test('source pages are odd/even alternating, gear records cannot silently be promoted',()=>{
 for(const row of SINGLE_SHOT_PREGEN_LOADOUTS){
  assert.equal(row.imageVerified,false);
  assert.equal(row.playablePromotion,'BLOCKED_PENDING_RUNTIME_AND_VISUAL_REVIEW');
 }
 const tampered=structuredClone(SINGLE_SHOT_PREGEN_LOADOUTS);
 tampered[0].imageVerified=true;
 assert.throws(()=>validateSingleShotLoadouts(tampered),/UNVERIFIED_PROMOTION/);
});
test('loadout getter returns isolated data, no shared mutable runtime state',()=>{
 const x=getSingleShotLoadout('ssp_pregen_02');x.weapons[0].name='invented';
 assert.equal(getSingleShotLoadout('ssp_pregen_02').weapons[0].name,'Light Melee Weapon');
 assert.equal(getSingleShotLoadout('missing'),null);
});
test('validator rejects invalid source, armor and weapons',()=>{
 const bad=structuredClone(SINGLE_SHOT_PREGEN_LOADOUTS);
 bad[2].sourceRef='R5.63';assert.throws(()=>validateSingleShotLoadouts(bad),/SOURCE_ID/);
 bad[2].sourceRef='Single Shot Pack v1.1:p8';bad[2].armor[0].sp=99;
 assert.throws(()=>validateSingleShotLoadouts(bad),/ARMOR/);
 bad[2].armor[0].sp=11;bad[2].weapons[0].rof=0;
 assert.throws(()=>validateSingleShotLoadouts(bad),/WEAPONS/);
});
