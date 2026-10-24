import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {CyberpunkAdventureController} from '../runtime/cyberpunk_adventure_controller_v2.js';

const moduleData = JSON.parse(fs.readFileSync(new URL('../modules/red_chrome_cargo.json', import.meta.url), 'utf-8'));

test('start() is atomic: atlas failure prevents mutation of campaignState.adventureState', async () => {
  let char = {
    characterId: 'pc1',
    worldPosition: {atlasId: 'night-city-2045', x: 10, y: 10, poiCode: 'old_loc'},
    campaignState: {
      session: {campaignId: 'camp1'},
      adventureState: {adventureId: 'old_adventure', startMode: 'OFFICIAL_ADVENTURE'}
    }
  };
  let saved = false;
  const mockBridge = {
    moveCharacter: async () => ({ok: false, resolved: false, blocked: true})
  };
  const mockAtlas = {
    poiCatalog: [{code: 'red_chrome_cargo_start', position: {x: 50, y: 60}, atlasId: 'night-city-2045'}]
  };
  const ctrl = new CyberpunkAdventureController({
    getCharacter: () => char,
    saveCharacter: async (c) => { saved = true; return {ok: true}; },
    atlas: mockAtlas,
    bridge: mockBridge
  });
  ctrl.registry.register(moduleData);

  await assert.rejects(
    async () => {
      await ctrl.start('red_chrome_cargo', {mode: 'OFFICIAL_ADVENTURE', locationId: 'red_chrome_cargo_start'});
    },
    /START_LOCATION_POSITION_FAILED/
  );

  // Assert memory state was NOT mutated and save was NOT called
  assert.equal(char.campaignState.adventureState.adventureId, 'old_adventure');
  assert.equal(saved, false);
});

test('start() is atomic: null or ambiguous atlas response is rejected and prevents mutation', async () => {
  let char = {
    characterId: 'pc1',
    worldPosition: {atlasId: 'night-city-2045', x: 10, y: 10, poiCode: 'old_loc'},
    campaignState: {
      session: {campaignId: 'camp1'},
      adventureState: {adventureId: 'old_adventure', startMode: 'OFFICIAL_ADVENTURE'}
    }
  };
  let saved = false;
  const mockBridge = {
    moveCharacter: async () => null
  };
  const mockAtlas = {
    poiCatalog: [{code: 'red_chrome_cargo_start', position: {x: 50, y: 60}, atlasId: 'night-city-2045'}]
  };
  const ctrl = new CyberpunkAdventureController({
    getCharacter: () => char,
    saveCharacter: async (c) => { saved = true; return {ok: true}; },
    atlas: mockAtlas,
    bridge: mockBridge
  });
  ctrl.registry.register(moduleData);

  await assert.rejects(
    async () => {
      await ctrl.start('red_chrome_cargo', {mode: 'OFFICIAL_ADVENTURE', locationId: 'red_chrome_cargo_start'});
    },
    /START_LOCATION_POSITION_FAILED/
  );

  assert.equal(char.campaignState.adventureState.adventureId, 'old_adventure');
  assert.equal(saved, false);
});

test('start() is atomic: saveCharacter returning {ok:false} rolls back memory state and throws error', async () => {
  let char = {
    characterId: 'pc1',
    worldPosition: {atlasId: 'night-city-2045', x: 10, y: 10, poiCode: 'old_loc'},
    campaignState: {
      session: {campaignId: 'camp1'},
      adventureState: {adventureId: 'old_adventure', startMode: 'OFFICIAL_ADVENTURE'}
    }
  };
  const mockBridge = {
    moveCharacter: async (id, pos) => ({ok: true, resolved: true, worldPosition: {...pos, atlasId: 'night-city-2045'}})
  };
  const mockAtlas = {
    poiCatalog: [{code: 'red_chrome_cargo_start', position: {x: 50, y: 60}, atlasId: 'night-city-2045'}]
  };
  const ctrl = new CyberpunkAdventureController({
    getCharacter: () => char,
    saveCharacter: async () => ({ok: false, error: 'disk_full'}),
    atlas: mockAtlas,
    bridge: mockBridge
  });
  ctrl.registry.register(moduleData);

  await assert.rejects(
    async () => {
      await ctrl.start('red_chrome_cargo', {mode: 'OFFICIAL_ADVENTURE', locationId: 'red_chrome_cargo_start'});
    },
    /START_SAVE_CHARACTER_FAILED/
  );

  // Assert memory state was rolled back to previous state
  assert.equal(char.campaignState.adventureState.adventureId, 'old_adventure');
});

test('start() is atomic: saveCharacter throwing exception rolls back memory state', async () => {
  let char = {
    characterId: 'pc1',
    worldPosition: {atlasId: 'night-city-2045', x: 10, y: 10, poiCode: 'old_loc'},
    campaignState: {
      session: {campaignId: 'camp1'},
      adventureState: {adventureId: 'old_adventure', startMode: 'OFFICIAL_ADVENTURE'}
    }
  };
  const mockBridge = {
    moveCharacter: async (id, pos) => ({ok: true, resolved: true, worldPosition: {...pos, atlasId: 'night-city-2045'}})
  };
  const mockAtlas = {
    poiCatalog: [{code: 'red_chrome_cargo_start', position: {x: 50, y: 60}, atlasId: 'night-city-2045'}]
  };
  const ctrl = new CyberpunkAdventureController({
    getCharacter: () => char,
    saveCharacter: async () => { throw new Error('database_locked'); },
    atlas: mockAtlas,
    bridge: mockBridge
  });
  ctrl.registry.register(moduleData);

  await assert.rejects(
    async () => {
      await ctrl.start('red_chrome_cargo', {mode: 'OFFICIAL_ADVENTURE', locationId: 'red_chrome_cargo_start'});
    },
    /database_locked/
  );

  // Assert memory state was rolled back to previous state
  assert.equal(char.campaignState.adventureState.adventureId, 'old_adventure');
});

test('controller v2 instantiates AdventureEngine v2 and connects loadSavedCharacter to storage', async () => {
  const activeChar = {
    characterId: 'pc1',
    campaignState: {
      session: {campaignId: 'camp1'}
    }
  };
  let storage = {
    'pc1': JSON.parse(JSON.stringify(activeChar))
  };
  const mockBridge = {
    loadCharacter: async (id) => storage[id] || null
  };
  const ctrl = new CyberpunkAdventureController({
    getCharacter: () => activeChar,
    saveCharacter: async (c) => { storage[c.characterId] = JSON.parse(JSON.stringify(c)); return {ok: true}; },
    bridge: mockBridge
  });

  assert.equal(ctrl.theJacket.snapshot().story.version, 2);
  // Perform transition
    const res = await ctrl.theJacketTransition('first_fight');
  assert.equal(res.result.ok, true);
  assert.equal(res.durableSaveVerified, true);
});

