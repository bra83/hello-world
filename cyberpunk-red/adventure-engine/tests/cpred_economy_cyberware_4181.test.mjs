import test from 'node:test';
import assert from 'node:assert/strict';
import {
  priceCategoryFor,
  marketAccess
} from '../../../../cpred_4.1.80_source/android/app/src/main/assets/web/adapter/cpred_economy.js';
import {
  validateCyberwareInstallRequest,
  resolveCyberwareInstallation
} from '../../../../cpred_4.1.80_source/android/app/src/main/assets/web/adapter/cpred_cyberware_surgery.js';

test('Economy: 8 Price Categories and Fixer Market Reach (Core p. 376)', () => {
  // Category ranks 1..8
  assert.equal(priceCategoryFor(10).rank, 1);   // Everyday (<= 10eb)
  assert.equal(priceCategoryFor(20).rank, 2);   // Costly (20eb)
  assert.equal(priceCategoryFor(50).rank, 3);   // Premium (50eb)
  assert.equal(priceCategoryFor(100).rank, 4);  // Expensive (100eb)
  assert.equal(priceCategoryFor(500).rank, 5);  // Very Expensive (500eb)
  assert.equal(priceCategoryFor(1000).rank, 6); // Luxury (1000eb)
  assert.equal(priceCategoryFor(5000).rank, 7); // Major Items (5000eb)
  assert.equal(priceCategoryFor(10000).rank, 8);// Super Luxury (> 5000eb)

  // Standard non-Fixer market access is max category 4 (<= 100eb)
  const nonFixer = marketAccess({ role: 'solo', roleAbilityRank: 4, nightMarketActive: false });
  assert.equal(nonFixer.maxCategoryRank, 4);

  // Fixer rank 5 gives category 5 reach, Night Market boosts to 8
  const fixerStandard = marketAccess({ role: 'fixer', roleAbilityRank: 5, nightMarketActive: false });
  assert.equal(fixerStandard.maxCategoryRank, 5);

  const fixerNight = marketAccess({ role: 'fixer', roleAbilityRank: 5, nightMarketActive: true });
  assert.equal(fixerNight.maxCategoryRank, 8);
});

test('Cyberware: Surgery requirements and Humanity Loss (Core p. 111, 226)', () => {
  const character = {
    stats: { EMP: 6 },
    derived: { humanity: 60, maxHumanity: 60 },
    cyberware: []
  };

  const req = validateCyberwareInstallRequest({
    item: {
      id: 'cyberaudio_suite',
      name: 'Cyberaudio Suite',
      typicalInstall: 'clinic',
      humanityLoss: 7
    },
    clinicianRole: 'medtech',
    clinicianId: 'medtech-01',
    patientId: 'char-01',
    character
  });
  assert.equal(req.ok, true);

  // Resolve installation with competent Medtech (TECH 8 + Surgery 8 = 16 vs DV 15)
  const installed = resolveCyberwareInstallation({
    item: {
      id: 'cyberaudio_suite',
      name: 'Cyberaudio Suite',
      typicalInstall: 'clinic',
      humanityLoss: 7
    },
    clinicianRole: 'medtech',
    clinicianId: 'medtech-01',
    patientId: 'char-01',
    tech: 8,
    surgery: 8,
    character,
    rng: () => 0.5
  });
  assert.equal(installed.ok, true);
  assert.equal(installed.success, true);
  assert.ok(installed.character.cyberware.some(c => c.id === 'cyberaudio_suite'));
});
