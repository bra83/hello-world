import test from 'node:test';
import assert from 'node:assert/strict';
import {
  netActionsForInterface,
  interfaceCheck,
  pathfinder,
  safeJackOut,
  unsafeJackOut
} from '../adapter/cpred_netrun.js';
import { SINGLE_SHOT_NET_ARCHITECTURES } from '../runtime/single_shot_pregen_factory.js';

test('Netrunning: Actions per Turn based on Interface Rank (Core p. 197)', () => {
  assert.equal(netActionsForInterface(1), 2);
  assert.equal(netActionsForInterface(2), 2);
  assert.equal(netActionsForInterface(3), 2);
  assert.equal(netActionsForInterface(4), 3);
  assert.equal(netActionsForInterface(6), 3);
  assert.equal(netActionsForInterface(7), 4);
  assert.equal(netActionsForInterface(9), 4);
  assert.equal(netActionsForInterface(10), 5);
});

test('Netrunning: Interface Checks (Core p. 198) - Beat the DV', () => {
  // Check succeeds if Total > DV (Core p. 129: Beat the DV)
  // Interface 4 + roll 6 = 10 vs DV 6 -> Success
  const checkPass = interfaceCheck(4, 6, () => 0.5); // 0.5 * 10 = 5+1 = 6
  assert.equal(checkPass.success, true);
  assert.equal(checkPass.dv, 6);

  // Interface 4 + roll 2 = 6 vs DV 8 -> Fail
  const checkFail = interfaceCheck(4, 8, () => 0.1);
  assert.equal(checkFail.success, false);
});

test('Netrunning: 6 Single Shot Pack NET Architectures validation', () => {
  const archKeys = Object.keys(SINGLE_SHOT_NET_ARCHITECTURES);
  assert.equal(archKeys.length, 6);

  // Arch 1: Conapt Security (3 floors, Imp, Ground Drone, Wisp)
  const arch1 = SINGLE_SHOT_NET_ARCHITECTURES['ssp_net_arch_01'];
  assert.equal(arch1.floorCount, 3);
  assert.equal(arch1.demons[0], 'Imp');

  // Arch 6: Vault (9 floors, Balron, 2x Hellhound, Killer, Scorpion)
  const arch6 = SINGLE_SHOT_NET_ARCHITECTURES['ssp_net_arch_06'];
  assert.equal(arch6.floorCount, 9);
  assert.equal(arch6.demons[0], 'Balron');
  assert.ok(arch6.floors.length === 9);
});

test('Netrunning: Safe vs Unsafe Jack Out', () => {
  const state = {
    jackedIn: true,
    currentFloor: 2,
    actionsRemaining: 1,
    activeBlackIce: [{ iceId: 'wisp_1', name: 'Wisp', derezzed: false, slid: false }]
  };

  // Safe Jack Out clears state
  const safe = safeJackOut(state);
  assert.equal(safe.ok, true);
  assert.equal(safe.safe, true);

  // Unsafe Jack Out triggers active Black ICE attacks
  const state2 = {
    jackedIn: true,
    currentFloor: 2,
    actionsRemaining: 1,
    activeBlackIce: [{ iceId: 'wisp_1', name: 'Wisp', derezzed: false, slid: false }]
  };
  const unsafe = unsafeJackOut(state2);
  assert.equal(unsafe.ok, true);
  assert.equal(unsafe.unsafe, true);
  assert.equal(unsafe.count, 1);
  assert.ok(unsafe.blackIceEffects.includes('wisp_1'));
});
