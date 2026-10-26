import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyArmor,
  rollDamage,
  woundState,
  woundPenalty,
  resolveMeleeAttack,
  resolveDeathSave
} from '../../../../cpred_4.1.80_source/android/app/src/main/assets/web/adapter/cpred_combat.js';

test('Combat: Damage vs Armor SP - penetration, ablation and HP deduction', () => {
  // Case 1: Damage less than or equal to SP (No penetration, no HP loss, no SP ablation)
  const stopped = applyArmor({ damage: 10, sp: 11, hp: 40 });
  assert.equal(stopped.penetration, 0);
  assert.equal(stopped.directDamage, 0);
  assert.equal(stopped.newHp, 40);
  assert.equal(stopped.newSp, 11);
  assert.equal(stopped.ablated, false);

  // Case 2: Damage exceeds SP (Penetrates: directDamage = damage - SP, SP ablates by 1)
  const penetrated = applyArmor({ damage: 15, sp: 11, hp: 40 });
  assert.equal(penetrated.penetration, 4); // 15 - 11 = 4
  assert.equal(penetrated.directDamage, 4);
  assert.equal(penetrated.newHp, 36);
  assert.equal(penetrated.newSp, 10); // 11 - 1 = 10
  assert.equal(penetrated.ablated, true);

  // Case 3: Critical damage bonus (+5 HP damage)
  const crit = applyArmor({ damage: 15, sp: 11, hp: 40, critical: true });
  assert.equal(crit.penetration, 4);
  assert.equal(crit.directDamage, 9); // 4 + 5 = 9
  assert.equal(crit.newHp, 31);
  assert.equal(crit.criticalBonus, 5);
});

test('Combat: Critical Injury Trigger - two or more 6s rolled on d6s', () => {
  // When rolling damage, two or more 6s flag critical = true
  // Simulate rng returning 6 for dice
  const result = rollDamage(3, () => 0.95); // 0.95 * 6 = 5+1 = 6 for all 3 dice
  assert.equal(result.total, 18);
  assert.equal(result.critical, true);

  // Roll without two 6s
  const result2 = rollDamage(3, () => 0.4); // 0.4 * 6 = 2+1 = 3
  assert.equal(result2.total, 9);
  assert.equal(result2.critical, false);
});

test('Combat: Wound States and Penalties (Core p. 186)', () => {
  const maxHp = 40;
  // Unhurt: HP = 40
  assert.equal(woundState(40, maxHp), 'Unhurt');
  assert.equal(woundPenalty(40, maxHp).actions, 0);

  // Lightly Wounded: HP between 20 and 39
  assert.equal(woundState(25, maxHp), 'Lightly Wounded');
  assert.equal(woundPenalty(25, maxHp).actions, 0);

  // Seriously Wounded: HP < (maxHp / 2) -> hp < 20, penalty = -2
  assert.equal(woundState(19, maxHp), 'Seriously Wounded');
  assert.equal(woundPenalty(19, maxHp).actions, -2);

  // Mortally Wounded: HP < 1, penalty = -4, deathSave = true
  assert.equal(woundState(0, maxHp), 'Mortally Wounded');
  assert.equal(woundPenalty(0, maxHp).actions, -4);
  assert.equal(woundPenalty(0, maxHp).deathSave, true);
});

test('Combat: Opposed Check Tie Breaker - Defender Wins Ties (Core p. 129)', () => {
  // Attacker total 15 vs Defender total 15
  // Core Book p. 129: "If the Attacker equals the Defender's check, the Defender wins."
  const tieAttack = resolveMeleeAttack({
    dex: 6,
    skill: 4, // 10 base
    damageDice: 3,
    targetDex: 6,
    targetEvasion: 4, // 10 base
    targetSp: 7,
    rng: () => 0.45 // fixed roll
  });
  // Equal rolls -> Defender wins
  assert.equal(tieAttack.attack === tieAttack.defense, true);
  assert.equal(tieAttack.hit, false); // Defender wins tie!

  // Attacker beats defender -> Hit!
  const hitAttack = resolveMeleeAttack({
    dex: 7,
    skill: 5, // 12 base
    damageDice: 3,
    targetDex: 5,
    targetEvasion: 4, // 9 base
    targetSp: 7,
    rng: () => 0.5
  });
  assert.equal(hitAttack.attack > hitAttack.defense, true);
  assert.equal(hitAttack.hit, true);
});

test('Combat: Death Save resolution (Core p. 186)', () => {
  // Roll 4 < BODY 8 -> Survived
  const pass = resolveDeathSave({
    body: 8,
    penalty: 0,
    rng: () => 0.35 // 0.35 * 10 = 3 + 1 = 4
  });
  assert.equal(pass.success, true);
  assert.equal(pass.dead, false);

  // Natural 10 on Death Save is immediate death
  const critFail = resolveDeathSave({
    body: 8,
    penalty: 0,
    rng: () => 0.95 // natural 10
  });
  assert.equal(pass.success, true);
  assert.equal(critFail.dead, true);
});
