import test from 'node:test';
import assert from 'node:assert/strict';
import {
  promoteSingleShotPlayableCharacter,
  promoteAllSingleShotPlayableCharacters,
  SINGLE_SHOT_PDF_VERIFIED_SPECS,
  SINGLE_SHOT_NET_ARCHITECTURES
} from '../runtime/single_shot_pregen_factory.js';

test('Single Shot Pack: Promote all 10 pregenerated characters to playable sheets', () => {
  const characters = promoteAllSingleShotPlayableCharacters();
  assert.equal(characters.length, 10);

  const expectedHandles = [
    'Forty', 'Grease', 'Mover', 'Racer', 'Redeye',
    'Torch', 'Redtail', '24/7', 'Suri "Cavalry" Navarro', 'Chanda Mishra'
  ];

  characters.forEach((char, idx) => {
    assert.equal(char.playable, true);
    assert.equal(char.handle, expectedHandles[idx]);
    assert.ok(char.stats.REF >= 2 && char.stats.REF <= 8);
    assert.ok(char.derived.hp > 0);
    assert.ok(char.derived.humanity > 0);
    assert.ok(char.weapons.length > 0);
    assert.ok(char.armor.head.sp >= 7);
    assert.ok(char.armor.body.sp >= 7);
    assert.ok(Object.keys(char.skills).length >= 20);
  });
});

test('Single Shot Pack: Individual Pregen Verification - Redeye (Netrunner)', () => {
  const redeye = promoteSingleShotPlayableCharacter('ssp_pregen_05');
  assert.equal(redeye.handle, 'Redeye');
  assert.equal(redeye.role, 'Netrunner');
  assert.equal(redeye.roleRank, 4);
  assert.equal(redeye.roleAbility, 'Interface');
  assert.equal(redeye.stats.INT, 6);
  assert.equal(redeye.stats.REF, 6);
  assert.equal(redeye.stats.DEX, 6);
  assert.equal(redeye.stats.TECH, 7);
  assert.equal(redeye.stats.COOL, 8);
  assert.equal(redeye.derived.hp, 35);
  assert.equal(redeye.derived.humanity, 46);
  // Redeye's cyberdeck loadout
  assert.ok(redeye.gear.some(g => g.name.includes('Cyberdeck')));
});

test('Single Shot Pack: Individual Pregen Verification - Forty (Rockerboy)', () => {
  const forty = promoteSingleShotPlayableCharacter('ssp_pregen_01');
  assert.equal(forty.handle, 'Forty');
  assert.equal(forty.role, 'Rockerboy');
  assert.equal(forty.roleRank, 4);
  assert.equal(forty.roleAbility, 'Charismatic Impact');
  assert.equal(forty.stats.COOL, 7);
  assert.equal(forty.derived.hp, 40);
  assert.equal(forty.derived.humanity, 61);
});
