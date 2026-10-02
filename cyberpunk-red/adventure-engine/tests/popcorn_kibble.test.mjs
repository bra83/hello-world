import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {AdventureRuntime,AdventureValidator} from '../runtime/adventure_engine_v2.js';

const module=JSON.parse(fs.readFileSync(new URL('../modules/tales_red_popcorn_kibble.json',import.meta.url),'utf8'));

test('Popcorn-Flavored Kibble validates and starts at audition warehouse',async()=>{
  const validation=new AdventureValidator().validateModule(module);
  assert.equal(validation.ok,true,validation.errors?.join('\n'));
  const rt=new AdventureRuntime(module,{rng:{random:()=>0,int:()=>0}});
  const state=await rt.start();
  assert.equal(state.currentLocationId,'pfk_audition_warehouse');
  assert.equal(state.currentSceneId,'pfk_hook');
});

test('Rival Crew preserves non-combat routes and DV13 authority',()=>{
  const e=module.events.find(x=>x.id==='pfk_event_rival_check');
  assert.equal(e.repeatPolicy,'UNTIL_SUCCESS');
  assert.equal(e.ruleActions[0].difficulty,13);
  assert.match(e.ruleActions[0].skill,/Local Expert/);
  assert.match(e.ruleActions[0].skill,/Persuasion/);
  assert.match(e.ruleActions[0].skill,/Bribery/);
  assert.match(module.encounters.find(x=>x.id==='pfk_enc_rival_crew').gmGuidance,/Do not force combat/i);
});

test('organic diet is four-entry DV15 sourcing with creative alternatives',()=>{
  const clue=module.clues.find(x=>x.id==='pfk_clue_organic_list');
  assert.match(clue.information,/Four all-organic categories/i);
  const e=module.events.find(x=>x.id==='pfk_event_organic_check');
  assert.equal(e.ruleActions[0].difficulty,15);
  assert.match(e.ruleActions[0].skill,/plausible alternative/i);
});

test('Cybersnake consultation is Rules Engine DV17',()=>{
  const e=module.events.find(x=>x.id==='pfk_event_snake_check');
  assert.equal(e.ruleActions[0].difficulty,17);
  assert.match(e.ruleActions[0].skill,/Tactics/);
  assert.match(e.ruleActions[0].skill,/Cybertech/);
});

test('script theft and bug planting remain optional player choices with authored DVs',()=>{
  const script=module.events.find(x=>x.id==='pfk_event_script_theft');
  const bug=module.events.find(x=>x.id==='pfk_event_bug_plant');
  assert.equal(script.trigger.type,'ON_PLAYER_CHOICE');
  assert.equal(bug.trigger.type,'ON_PLAYER_CHOICE');
  assert.equal(script.ruleActions[0].difficulty,17);
  assert.equal(bug.ruleActions[0].difficulty,13);
  assert.ok(module.gmGuidance.some(x=>/never be auto-selected/i.test(x)));
});

test('Lovely House permits creative social/nonlethal/combat resolution',()=>{
  const enc=module.encounters.find(x=>x.id==='pfk_enc_lovely_house');
  assert.match(enc.gmGuidance,/deception/i);
  assert.match(enc.gmGuidance,/counter-filming/i);
  assert.match(enc.gmGuidance,/nonlethal/i);
  assert.match(enc.gmGuidance,/combat/i);
});

test('Spotlight persists dirty-deed consequence and Rules Engine owns 1d10',()=>{
  assert.ok(module.gmGuidance.some(x=>/both script theft and bug planting/i.test(x)));
  const e=module.events.find(x=>x.id==='pfk_event_spotlight');
  assert.equal(e.ruleActions[0].type,'DICE_ROLL');
  assert.equal(e.ruleActions[0].formula,'1d10');
});