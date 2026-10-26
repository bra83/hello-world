import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceWorldClock,
  advanceWorldClockSeconds
} from '../adapter/cpred_world_clock.js';
import {
  resolveNaturalHealingDay,
  fullRestDaysCrossed
} from '../adapter/cpred_healing.js';

test('World Clock: Advance time deterministically and compute day/minutes', () => {
  const clock = { elapsedMinutes: 0, day: 1 };
  
  // Advance 120 minutes (2 hours)
  const res2h = advanceWorldClock(clock, 120);
  assert.equal(res2h.ok, true);
  assert.equal(res2h.after.elapsedMinutes, 120);
  assert.equal(res2h.after.day, 1);

  // Advance to exceed 1440 minutes (Day 2)
  const resDay = advanceWorldClock(res2h.after, 1400); // Total 1520 minutes
  assert.equal(resDay.ok, true);
  assert.equal(resDay.after.elapsedMinutes, 1520);
  assert.equal(resDay.after.day, 2); // 1520 / 1440 + 1 = 2
});

test('World Clock: Rest healing per full day crossed (Core p. 222)', () => {
  // If player is stabilized and rests for 1 full day (1440 min) with resting: true
  const crossed = fullRestDaysCrossed({ beforeMinute: 0, afterMinute: 1440, resting: true });
  assert.equal(crossed, 1);

  // 3 full days rest
  const crossed3 = fullRestDaysCrossed({ beforeMinute: 0, afterMinute: 4320, resting: true });
  assert.equal(crossed3, 3);

  // Partial day (12 hours = 720 min) gives 0 full rest days
  const partial = fullRestDaysCrossed({ beforeMinute: 0, afterMinute: 720, resting: true });
  assert.equal(partial, 0);

  // Natural healing: 1 day rest with BODY 6 heals 6 HP
  const heal = resolveNaturalHealingDay({
    hp: 15,
    maxHp: 40,
    body: 6,
    stabilized: true,
    restedFullDay: true
  });
  assert.equal(heal.ok, true);
  assert.equal(heal.healing, 6);
  assert.equal(heal.newHp, 21);

  // Natural healing cannot exceed maxHp
  const healMax = resolveNaturalHealingDay({
    hp: 38,
    maxHp: 40,
    body: 6,
    stabilized: true,
    restedFullDay: true
  });
  assert.equal(healMax.ok, true);
  assert.equal(healMax.healing, 2);
  assert.equal(healMax.newHp, 40);
});
