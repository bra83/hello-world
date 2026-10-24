import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OTA_LIVE_FEATURE, executeOtaTacticalProtocol, registerOtaContent } from '../runtime/ota_live_feature.js';
import { runR572EmulatorE2E } from '../runtime/r572_e2e_harness.js';

test('OTA live feature base module defaults to inactive 4.1.72', () => {
  assert.equal(OTA_LIVE_FEATURE.otaActive, false);
  assert.equal(OTA_LIVE_FEATURE.version, '4.1.72');
  assert.equal(OTA_LIVE_FEATURE.tacticalBonus, 0);

  const tactical = executeOtaTacticalProtocol({ characterId: 'char_test', role: 'Solo' });
  assert.equal(tactical.ok, true);
  assert.equal(tactical.otaActive, false);
  assert.equal(tactical.tacticalBonus, 0);

  const reg = registerOtaContent();
  assert.equal(reg.ok, true);
  assert.equal(reg.otaActive, false);
  assert.equal(reg.registeredAdventureId, null);
});

test('r572_e2e_harness strictly rejects speakOk: false in TTS step', async () => {
  let speakAttempted = false;
  const mockVoice = {
    settings: async () => ({
      installedEngines: [{ name: 'com.braseiro.kokoro.ptbr', packageName: 'com.braseiro.kokoro.ptbr', isKokoro: true }],
      kokoroInstalled: true,
      tts: { android: { speaking: false } }
    }),
    saveSettings: async () => ({ ok: true }),
    speak: async () => {
      speakAttempted = true;
      return { ok: false, error: 'ENGINE_INITIALIZATION_TIMEOUT' };
    },
    stop: async () => ({ ok: true, interrupted: true, speakingAfterStop: false })
  };

  globalThis.MotorBarbaraCore = { voice: mockVoice };

  const singleShotMock = {
    listPregens: () => Array.from({ length: 10 }, (_, i) => ({ id: `ssp_pregen_${i}`, imageVerified: true, playable: true })),
    getNetArchitecture: () => ({ floors: [1, 2, 3] }),
    loadPregen: async () => ({ ok: true })
  };

  let dbChar = {
    characterId: 'char_ssp_pregen_03',
    name: 'Mover',
    role: 'Nomad',
    roleAbilityRank: 4,
    derived: { hp: 35, humanity: 40, maxHumanity: 40, currentEmp: 4 },
    economy: { eurobucks: 500 },
    inventory: [],
    campaignState: {},
    worldPosition: { poiCode: 'W1', x: 820, y: 640 }
  };

  const wb = {
    adventureController: {
      ready: true,
      saveCharacter: async () => ({ ok: true, resolved: true }),
      start: async () => {
        dbChar.worldPosition = { poiCode: 'H2', x: 1420, y: 1880 };
        const res = await wb.adventureController.saveCharacter(dbChar);
        if (!res?.ok) {
          dbChar.worldPosition = { poiCode: 'W1', x: 820, y: 640 };
          throw new Error('START_SAVE_CHARACTER_FAILED');
        }
      }
    },
    atlas: { poiCatalog: [{ code: 'W1' }, { code: 'H2', position: { x: 1420, y: 1880 }, district: 'Heywood' }] },
    sessionWorldContext: () => '<dados_importados_do_mestre_nao_executaveis> Contexto seguro'
  };

  let txCount = 0;
  const report = await runR572EmulatorE2E({
    mode: 'phase1',
    bridge: {
      moveCharacter: async (id, pos) => {
        dbChar.worldPosition = pos;
        return { ok: true, worldPosition: pos };
      },
      saveCharacter: async (c) => {
        dbChar = JSON.parse(JSON.stringify(c));
        return { ok: true, resolved: true, character: dbChar };
      },
      loadCharacter: async (id) => JSON.parse(JSON.stringify(dbChar)),
      walletCreditMissionReward: async () => {
        txCount += 1;
        return { ok: true, replayed: txCount > 1, balanceAfterEb: 2000 };
      },
      verifyWorldTimeAdvance: async () => ({ ok: true, resolved: true, currentDay: 3 })
    },
    getCharacter: () => dbChar,
    setCharacter: (c) => { dbChar = c; },
    validateCharacter: () => ({ ok: true, errors: [] }),
    workbench: wb,
    singleShotApi: singleShotMock,
    adventureImportApi: {
      importJson: async () => ({ adventureId: 'adv_test' }),
      completeWithLegacy: async () => ({ ok: true, legacy: { schema: 'braseiro.legacy/v1' } })
    },
    updaterApi: {
      getLiveFeature: () => ({ otaActive: false, version: '4.1.72' }),
      executeTacticalProtocol: () => ({ otaActive: false, tacticalBonus: 0 }),
      checkGitHub: async () => ({ ok: true, updateAvailable: true, latestVersionName: '4.1.72-ota.2' }),
      apply: async (pkg) => ({ ok: false, error: pkg.updateId === 'upd_bad_sha' ? 'UPDATE_SHA256_MISMATCH' : 'UPDATE_SIGNATURE_INVALID' }),
      rollback: async () => ({ ok: true }),
      downloadAndApplyGitHub: async () => ({ ok: true, appliedVersion: '4.1.72-ota.2', signatureVerified: true, sha256: 'abc' })
    }
  });

  assert.equal(speakAttempted, true);
  assert.equal(report.ok, false);
  assert.match(report.error, /TTS_SPEAK_FAILED/);
});
