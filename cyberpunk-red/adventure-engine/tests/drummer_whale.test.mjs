import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {AdventureRuntime,AdventureValidator} from '../runtime/adventure_engine_v2.js';

const module=JSON.parse(fs.readFileSync(new URL('../modules/tales_red_drummer_whale.json',import.meta.url),'utf8'));

test('Drummer and the Whale validates and starts at Rustys',async()=>{
  const validation=new AdventureValidator().validateModule(module);
  assert.equal(validation.ok,true,validation.errors?.join('\n'));
  const rt=new AdventureRuntime(module,{rng:{random:()=>0,int:()=>0}});
  const state=await rt.start();
  assert.equal(state.currentLocationId,'dw_rustys_dive_bar');
  assert.equal(state.currentSceneId,'dw_hook');
});

test('military truth and scuttle capability remain sealed secrets',()=>{
  const ids=module.secrets.map(x=>x.id);
  assert.ok(ids.includes('dw_secret_macdonnelson'));
  assert.ok(ids.includes('dw_secret_scuttle_program'));
  assert.equal(module.aiContextPolicy.excludeUndiscoveredSecrets,true);
});

test('underwater mechanics remain owned by Rules Engine',()=>{
  const stand=module.encounters.find(x=>x.id==='dw_enc_pacifican_standoff');
  const war=module.encounters.find(x=>x.id==='dw_enc_underwater_war');
  assert.match(stand.resolutionRules.join(' '),/Rules Engine owns/i);
  assert.match(war.resolutionRules.join(' '),/Rules Engine owns/i);
});

test('cargo ownership is a player choice and not an automatic consequence',()=>{
  const recover=module.events.find(x=>x.id==='dw_event_recover_container');
  const surrender=module.events.find(x=>x.id==='dw_event_surrender_container');
  assert.equal(recover.trigger.type,'PLAYER_CHOICE');
  assert.equal(surrender.trigger.type,'PLAYER_CHOICE');
  assert.equal(module.aiContextPolicy.forbidPlayerChoiceFabrication,true);
});

test('multiple authored climaxes remain independently reachable',()=>{
  for(const id of ['dw_takeover','dw_parley','dw_fishy_flight','dw_surfacing']) assert.ok(module.scenes.some(x=>x.id===id),id);
  assert.ok(module.scenes.find(x=>x.id==='dw_pacifican_standoff').exits.includes('dw_fishy_flight'));
  assert.ok(module.scenes.find(x=>x.id==='dw_macdonnelson_scene').exits.includes('dw_takeover'));
});

test('takeover is never implied by boarding',()=>{
  const board=module.events.find(x=>x.id==='dw_event_board_macdonnelson');
  const takeover=module.events.find(x=>x.id==='dw_event_attempt_takeover');
  assert.ok(board.consequences.some(x=>x.target==='dw_boarded_macdonnelson'));
  assert.ok(!board.consequences.some(x=>x.target==='dw_takeover_attempted'));
  assert.equal(takeover.trigger.type,'PLAYER_CHOICE');
});

test('both resolution families persist mission completion',()=>{
  const standard=module.events.find(x=>x.id==='dw_event_complete_standard');
  const takeover=module.events.find(x=>x.id==='dw_event_complete_takeover');
  assert.ok(standard.consequences.some(x=>x.target==='dw_resolution_complete'&&x.value===true));
  assert.ok(takeover.consequences.some(x=>x.target==='dw_resolution_complete'&&x.value===true));
  assert.ok(module.objectives[0].successConditions.some(x=>x.key==='dw_resolution_complete'&&x.value===true));
});