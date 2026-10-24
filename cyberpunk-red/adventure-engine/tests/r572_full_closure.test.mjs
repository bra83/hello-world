import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { AdventureValidator, AdventureRegistry } from '../runtime/adventure_engine_v2.js';
import { CYBERPUNK_RULE_ACTIONS, CyberpunkLocationResolver } from '../runtime/cyberpunk_host_adapters.js';
import { CyberpunkAdventureController } from '../runtime/cyberpunk_adventure_controller_v2.js';
import {
  SINGLE_SHOT_PDF_VERIFIED_SPECS,
  applySingleShotPregenToWebCharacter,
  promoteAllSingleShotPlayableCharacters,
  getSingleShotNetArchitecture
} from '../runtime/single_shot_pregen_factory.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const modulesDir = path.resolve(__dirname, '../modules');

test('All 18 official adventure modules in index.json validate with CYBERPUNK_RULE_ACTIONS', () => {
  const index = JSON.parse(fs.readFileSync(path.join(modulesDir, 'index.json'), 'utf8'));
  const validator = new AdventureValidator({ knownRuleActions: CYBERPUNK_RULE_ACTIONS });
  const registry = new AdventureRegistry({ validator });

  assert.equal(index.modules.length, 18);
  for (const entry of index.modules) {
    const modPath = path.resolve(modulesDir, entry.path);
    const mod = JSON.parse(fs.readFileSync(modPath, 'utf8'));
    const validation = validator.validateModule(mod);
    assert.equal(validation.ok, true, `Module ${entry.id} failed validation: ${validation.errors.join(', ')}`);
    registry.register(mod);
  }
  assert.equal(registry.list().length, 18);
});

test('All 10 Single Shot Pack characters convert to complete web-playable sheets and all 6 NET Architectures load', () => {
  const promoted = promoteAllSingleShotPlayableCharacters();
  assert.equal(promoted.length, 10);
  for (const spec of Object.values(SINGLE_SHOT_PDF_VERIFIED_SPECS)) {
    const base = {
      characterId: 'random_uuid',
      name: spec.handle,
      role: spec.role.toLowerCase(),
      stats: { ...spec.stats },
      skills: {},
      inventory: [],
      cyberware: [],
      economy: { eurobucks: 0 }
    };
    const webChar = applySingleShotPregenToWebCharacter(base, spec.id);
    assert.equal(webChar.characterId, `char_${spec.id}`);
    assert.equal(webChar.imageVerified, true);
    assert.equal(webChar.playable, true);
    assert.equal(webChar.roleAbilityRank, 4);
    assert.equal(webChar.economy.eurobucks, 500);
    assert.equal(webChar.combatState.armor.bodySp, 11);
    assert.ok(webChar.inventory.some((i) => i.category === 'armor' && i.sp === 11 && i.equipped === true));
    assert.ok(webChar.cyberware.length >= 1);
  }
  for (let i = 1; i <= 6; i++) {
    const archId = `ssp_net_arch_0${i}`;
    const arch = getSingleShotNetArchitecture(archId);
    assert.equal(arch.id, `ssp_net_0${i}`);
    assert.ok(arch.floors.length >= 1);
  }
});

test('CyberpunkLocationResolver accepts 30x30 VTT grid-quantized normalized coordinates and controller rolls back host on receipt mismatch', async () => {
  const char = {
    characterId: 'char_ssp_pregen_03',
    worldPosition: { atlasId: 'night-city-2045', poiCode: 'W1', x: 0.25, y: 0.25 },
    campaignState: {}
  };
  let hostPersistedPos = { ...char.worldPosition };
  const atlas = {
    poiCatalog: [
      { code: 'A1', name: 'Camden Court', atlasId: 'night-city-2045', district: 'Little Europe', position: { x: 0.359645, y: 0.398617 } }
    ]
  };
  const bridge = {
    moveCharacter: async (characterId, pos) => {
      // Simulate 30x30 VTT grid quantization (11/30 = 0.3666667, 12/30 = 0.40)
      const qx = pos.x <= 1 ? Math.round(pos.x * 30) / 30 : pos.x;
      const qy = pos.y <= 1 ? Math.round(pos.y * 30) / 30 : pos.y;
      hostPersistedPos = { ...pos, x: qx, y: qy };
      return { ok: true, resolved: true, characterId, worldPosition: { ...hostPersistedPos } };
    }
  };

  const resolver = new CyberpunkLocationResolver({ atlas, bridge, getCharacter: () => char });
  const okOut = await resolver.position('A1');
  assert.equal(okOut.ok, true);
  assert.equal(okOut.resolved, true);
  assert.equal(hostPersistedPos.poiCode, 'A1');

  // Now simulate save failure after normalized move in controller.start() and verify host storage rolls back to W1
  char.worldPosition = { atlasId: 'night-city-2045', poiCode: 'W1', x: 820, y: 640 };
  hostPersistedPos = { ...char.worldPosition };

  const controller = new CyberpunkAdventureController({
    getCharacter: () => char,
    saveCharacter: async () => ({ ok: false, error: 'SIMULATED_DB_FAILURE' }),
    atlas,
    bridge
  });
  const rcc = JSON.parse(fs.readFileSync(path.join(modulesDir, 'red_chrome_cargo.json'), 'utf8'));
  controller.registry.register(rcc);

  await assert.rejects(
    () => controller.start('red_chrome_cargo', { mode: 'OFFICIAL_ADVENTURE', locationId: 'A1' }),
    /START_SAVE_CHARACTER_FAILED/
  );
  assert.equal(hostPersistedPos.poiCode, 'W1');
  assert.equal(hostPersistedPos.x, 820);
  assert.equal(hostPersistedPos.y, 640);
  assert.equal(char.campaignState.adventureState, undefined);
});

test('Ambiguous saveCharacter receipt ({} or null) rolls back persisted host position and memory adventure state', async () => {
  const char = {
    characterId: 'char_ambiguous_01',
    worldPosition: { atlasId: 'night-city-2045', poiCode: 'W1', x: 820, y: 640 },
    campaignState: {}
  };
  let hostPersistedPos = { ...char.worldPosition };
  const atlas = {
    poiCatalog: [{ code: 'A1', name: 'Camden Court', atlasId: 'night-city-2045', position: { x: 100, y: 200 } }]
  };
  const bridge = {
    moveCharacter: async (characterId, pos) => {
      hostPersistedPos = { ...pos };
      return { ok: true, resolved: true, characterId, worldPosition: { ...hostPersistedPos } };
    }
  };
  const controller = new CyberpunkAdventureController({
    getCharacter: () => char,
    saveCharacter: async () => ({}),
    atlas,
    bridge
  });
  const rcc = JSON.parse(fs.readFileSync(path.join(modulesDir, 'red_chrome_cargo.json'), 'utf8'));
  controller.registry.register(rcc);

  await assert.rejects(
    () => controller.start('red_chrome_cargo', { mode: 'OFFICIAL_ADVENTURE', locationId: 'A1' }),
    /START_SAVE_CHARACTER_FAILED/
  );
  assert.equal(hostPersistedPos.poiCode, 'W1');
  assert.equal(char.worldPosition.poiCode, 'W1');
  assert.equal(char.campaignState.adventureState, undefined);
});

test('CyberpunkLocationResolver rejects moveCharacter receipts with mismatched poiCode or characterId', async () => {
  const char = { characterId: 'char_real', worldPosition: { poiCode: 'W1', x: 10, y: 20 } };
  const atlas = { poiCatalog: [{ code: 'A1', atlasId: 'night-city-2045', position: { x: 100, y: 200 } }] };
  const badBridge = {
    moveCharacter: async () => ({
      ok: true,
      resolved: true,
      characterId: 'wrong_char',
      worldPosition: { atlasId: 'night-city-2045', poiCode: 'A1', x: 100, y: 200 }
    })
  };
  const resolver = new CyberpunkLocationResolver({ atlas, bridge: badBridge, getCharacter: () => char });
  const out = await resolver.position('A1');
  assert.equal(out.ok, false);
  assert.equal(out.blocked, true);
  assert.equal(out.reason, 'WORLD_POSITION_RECEIPT_MISMATCH');
});

test('Elflines Online extensions are initialized and execute character creation + dungeon run progression', async () => {
  let savedCount = 0;
  const char = { characterId: 'char_elo', name: 'Mover', eurobucks: 500, campaignState: {} };
  const controller = new CyberpunkAdventureController({
    getCharacter: () => char,
    saveCharacter: async () => {
      savedCount += 1;
      return { ok: true, resolved: true };
    }
  });
  assert.ok(controller.extensions.elflines.registry);
  assert.ok(controller.extensions.elflines.integration);
  assert.ok(controller.extensions.elflines.rules);
  assert.ok(controller.extensions.singleShot.registry);

  const session = await controller.initElflinesForCharacter({ avatarName: 'Aeris', elflineId: 'shadowgrove', gp: 200 });
  assert.equal(session.character.elfName, 'Aeris');
  const updated = await controller.completeElflinesDungeonRun({ ebConvertedToGp: 2, rankUpStat: 'REF' });
  assert.ok(updated.character.gp > 200);
  assert.equal(savedCount, 2);
});

test('braseiro.adventure/v1 JSON import, untrusted master envelope secrecy, and braseiro.legacy/v1 continuity across adventures', async () => {
  const char = {
    characterId: 'char_cont_01',
    name: 'Mover',
    eurobucks: 500,
    equipment: ['heavy_pistol'],
    worldPosition: { atlasId: 'night-city-2045', poiCode: 'A1', x: 100, y: 200 },
    campaignState: {}
  };
  const atlas = {
    poiCatalog: [{ code: 'A1', name: 'Camden Court', atlasId: 'night-city-2045', position: { x: 100, y: 200 } }]
  };
  const bridge = {
    moveCharacter: async (characterId, pos) => ({ ok: true, resolved: true, characterId, worldPosition: { ...pos } })
  };
  const controller = new CyberpunkAdventureController({
    getCharacter: () => char,
    saveCharacter: async () => ({ ok: true, resolved: true }),
    atlas,
    bridge
  });

  const imported = await controller.importAdventureJson({
    format: 'braseiro.adventure/v1',
    id: 'kabuki_biochip_heist',
    systemId: 'cyberpunk-red',
    title: 'Roubo do Biochip em Kabuki',
    startPoint: 'A1',
    locations: [{ id: 'A1', name: 'Entreposto Kabuki', description: 'Galpão vigiado.' }],
    npcs: [{ id: 'npc_sato', name: 'Agente Sato', gmSecret: 'SECRET_SATO_DOUBLE_AGENT_991' }],
    secrets: [{ id: 'sec_vault', title: 'Cofre', gmOnlyTruth: 'SECRET_VAULT_MASTER_CODE_7742' }]
  }, { autoStart: true });

  assert.equal(imported.ok, true);
  assert.equal(imported.adventureId, 'kabuki_biochip_heist');

  const promptText = controller.buildContextText(char);
  assert.ok(promptText.includes('<dados_importados_do_mestre_nao_executaveis>'));
  assert.equal(promptText.includes('SECRET_SATO_DOUBLE_AGENT_991'), false);
  assert.equal(promptText.includes('SECRET_VAULT_MASTER_CODE_7742'), false);

  const legacy = await controller.completeActiveAdventureWithLegacy({
    summary: 'Biochip extraído em Kabuki',
    npcRelationships: { npc_sato: 'allied' },
    worldFlags: { kabuki_heist_done: true }
  });
  assert.equal(legacy.schema, 'braseiro.legacy/v1');
  assert.ok(legacy.completedAdventures.includes('kabuki_biochip_heist'));

  const rcc = JSON.parse(fs.readFileSync(path.join(modulesDir, 'red_chrome_cargo.json'), 'utf8'));
  controller.registry.register(rcc);
  await controller.start('red_chrome_cargo', { mode: 'OFFICIAL_ADVENTURE', locationId: 'A1' });
  assert.equal(char.campaignState.adventureState.flags.kabuki_heist_done, true);
  assert.equal(char.campaignState.adventureState.npcDispositions.npc_sato, 'allied');
});
