import test from 'node:test';
import assert from 'node:assert/strict';
import {
  planPurchase,
  applyPurchase,
  planSale,
  applySale
} from '../../../../cpred_4.1.80_source/android/app/src/main/assets/web/adapter/cpred_economy.js';
import {
  CyberpunkRulesAdapter
} from '../../../../cpred_4.1.80_source/android/app/src/main/assets/web/app/cyberpunk_host_adapters.js';

test('Negative: Unknown rule action types fail-closed with UNKNOWN_RULE_ACTION', async () => {
  const adapter = new CyberpunkRulesAdapter();
  
  const unknownActions = [
    { type: 'FABRICATED_MAGIC_SPELL', spellName: 'Fireball' },
    { type: 'SUPER_HERO_FLYING_ACTION' },
    { type: 'CHEAT_INSTANT_WIN' },
    { type: '' }
  ];

  for (const act of unknownActions) {
    const res = await adapter.resolve(act);
    assert.equal(res.ok, false);
    assert.equal(res.resolved, false);
    assert.equal(res.blocked, true);
    assert.equal(res.reason, 'UNKNOWN_RULE_ACTION');
  }
});

test('Negative: Economy - Purchase rejected when funds are insufficient', () => {
  const character = {
    role: 'solo',
    roleAbilityRank: 4,
    economy: {
      equipmentBudget: 0,
      eurobucks: 50
    },
    inventory: []
  };

  // Item costs 500eb, character has 50eb -> Must return ok: false
  const res = planPurchase({
    character,
    item: { id: 'heavy_pistol', price: 500 },
    quantity: 1
  });
  assert.equal(res.ok, false);
  assert.ok(res.reason === 'insufficient-funds' || res.reason === 'market-access-required');
});

test('Negative: Economy - Sale rejected when item is not in inventory', () => {
  const character = {
    role: 'solo',
    roleAbilityRank: 4,
    economy: { eurobucks: 100 },
    inventory: []
  };

  // Item not in inventory
  const res = planSale({
    character,
    item: { id: 'sniper_rifle', price: 1000 },
    quantity: 1
  });
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'insufficient-owned-quantity');
});
