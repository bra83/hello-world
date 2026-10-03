import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const p = new URL('../modules/tales_red_reaping_reaper.json', import.meta.url);
const m = JSON.parse(fs.readFileSync(p, 'utf8'));
const flag = k => m.startDefinition.initialFlags[k];
const event = id => m.events.find(x => x.id === id);
const secret = id => m.secrets.find(x => x.id === id);
const encounter = id => m.encounters.find(x => x.id === id);

test('module identity and deterministic start are canonical', () => {
  assert.equal(m.id, 'tales_red_reaping_reaper');
  assert.equal(m.startDefinition.startingSceneId, 'rtr_hook');
  assert.equal(flag('rtr_prime_destroyed'), false);
  assert.equal(flag('rtr_prime_escaped'), false);
  assert.equal(m.startDefinition.initialClocks[0].max, 5);
});

test('authored two-stage contracts and equipment persist as data', () => {
  const first = event('rtr_event_accept_job').consequences.find(x => x.type === 'ADD_HISTORY').value;
  const second = event('rtr_event_collect_scramblers').consequences.find(x => x.type === 'ADD_HISTORY').value;
  assert.equal(first.ebPerEdgerunner, 1000);
  assert.equal(second.ebPerEdgerunner, 2000);
  assert.equal(second.scramblers, 3);
  assert.equal(second.empGrenades, 2);
  assert.equal(second.wristDetectors, 1);
});

test('five-round broadcast consequence persists into final encounter state', () => {
  const e = event('rtr_event_broadcast_succeeds');
  const h = e.consequences.find(x => x.type === 'ADD_HISTORY').value;
  assert.equal(m.clocks.find(x => x.id === 'rtr_clock_broadcast').max, 5);
  assert.equal(h.additionalBiodrones, 5);
  assert.ok(secret('rtr_secret_broadcast_consequence'));
});

test('mechanical resolution remains Rules Engine authority', () => {
  assert.ok(m.rulesDependencies[0].requiredCapabilities.includes('COMBAT'));
  assert.ok(m.rulesDependencies[0].requiredCapabilities.includes('NETRUNNING'));
  assert.ok(m.rulesDependencies[0].requiredCapabilities.includes('SKILL_CHECKS'));
  assert.equal(encounter('rtr_enc_biodrone_blitz').rulesProfileId, 'cpred_combat_tech_netrunning');
  assert.equal(encounter('rtr_enc_reaper_prime').rulesProfileId, 'cpred_combat_and_netrunning');
});

test('Renzer is optional and declining him preserves an alternate route', () => {
  assert.ok(event('rtr_event_accept_renzer'));
  assert.ok(event('rtr_event_decline_renzer'));
  const alt = event('rtr_event_locate_prime_alternate');
  assert.ok(alt.triggerConditions.some(x => x.key === 'rtr_renzer_declined' && x.value === true));
  assert.ok(alt.consequences.some(x => x.target === 'rtr_prime_location_found' && x.value === true));
});

test('Reaper truth remains sealed until state legitimately reveals it', () => {
  assert.equal(secret('rtr_secret_reaper_copies').revealConditions[0].key, 'rtr_first_operation_complete');
  assert.equal(secret('rtr_secret_prime_location').revealConditions[0].key, 'rtr_prime_location_found');
  assert.equal(secret('rtr_secret_prime_identity').revealConditions[0].key, 'rtr_final_assault_started');
  assert.equal(m.aiContextPolicy.forbidUnrevealedSecrets, true);
});

test('final success and escape are independent persistent authored endings', () => {
  const win = event('rtr_event_resolve_success');
  const escape = event('rtr_event_resolve_escape');
  assert.ok(win.triggerConditions.some(x => x.key === 'rtr_prime_destroyed' && x.value === true));
  assert.ok(escape.triggerConditions.some(x => x.key === 'rtr_prime_escaped' && x.value === true));
  assert.ok(win.consequences.some(x => x.target === 'rtr_resolution_complete' && x.value === true));
  assert.ok(escape.consequences.some(x => x.target === 'rtr_resolution_complete' && x.value === true));
});