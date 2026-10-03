import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const p = new URL('../modules/tales_red_stitch_to_wear.json', import.meta.url);
const m = JSON.parse(fs.readFileSync(p, 'utf8'));

const flag = k => m.startDefinition.initialFlags[k];
const event = id => m.events.find(x => x.id === id);
const scene = id => m.scenes.find(x => x.id === id);

test('module identity and deterministic start are canonical', () => {
  assert.equal(m.id, 'tales_red_stitch_to_wear');
  assert.equal(m.startDefinition.startingSceneId, 'stw_hook');
  assert.equal(flag('stw_suits_returned'), false);
  assert.equal(flag('stw_suits_sold'), false);
  assert.equal(m.startDefinition.initialClocks[0].max, 3);
});

test('three-day contract and authored reward persist as data', () => {
  const ret = event('stw_event_return_suits');
  const reward = ret.consequences.find(x => x.type === 'ADD_HISTORY').value;
  assert.equal(reward.ebPerEdgerunner, 500);
  assert.equal(reward.freeTailoredBusinesswearCount, 1);
  assert.equal(m.clocks[0].max, 3);
});

test('blockade and Rambling Rose do not force combat', () => {
  assert.equal(m.encounters.find(x=>x.id==='stw_enc_blockade').type, 'MULTI_SOLUTION');
  assert.equal(m.encounters.find(x=>x.id==='stw_enc_rose_security').rulesProfileId, 'stealth_or_combat');
  assert.ok(scene('stw_lightning_climax').availableEvents.includes('stw_event_resolve_negotiation'));
  assert.ok(scene('stw_lightning_climax').availableEvents.includes('stw_event_resolve_creative'));
});

test('John Doe disposition is explicit persistent player consequence', () => {
  assert.ok(event('stw_event_john_doe_join'));
  assert.ok(event('stw_event_john_doe_hostile'));
  assert.equal(flag('stw_john_doe_hostile'), false);
  assert.equal(m.npcs.find(x=>x.id==='stw_john_doe').persistencePolicy, 'PERSIST');
});

test('Streetwise DV13 clue remains Rules Engine information, not narrator auto-success', () => {
  const c = m.clues.find(x=>x.id==='stw_clue_john_doe_reputation');
  assert.match(c.information, /DV13 Streetwise/);
  assert.ok(m.rulesDependencies[0].requiredCapabilities.includes('SKILL_CHECKS'));
});

test('Lightning Logistics climax supports social, combat and creative resolution', () => {
  const s = scene('stw_lightning_climax');
  assert.deepEqual(new Set(s.availableEvents), new Set(['stw_event_resolve_negotiation','stw_event_resolve_combat','stw_event_resolve_creative']));
  assert.equal(m.encounters.find(x=>x.id==='stw_enc_lightning_climax').rulesProfileId, 'social_or_combat');
});

test('final suit custody belongs to players and both endings complete persistent state', () => {
  const ret = event('stw_event_return_suits');
  const sell = event('stw_event_sell_suits');
  assert.ok(ret.triggerConditions.some(x=>x.key==='stw_suits_recovered' && x.value===true));
  assert.ok(sell.triggerConditions.some(x=>x.key==='stw_suits_recovered' && x.value===true));
  assert.ok(ret.consequences.some(x=>x.target==='stw_resolution_complete' && x.value===true));
  assert.ok(sell.consequences.some(x=>x.target==='stw_resolution_complete' && x.value===true));
});
