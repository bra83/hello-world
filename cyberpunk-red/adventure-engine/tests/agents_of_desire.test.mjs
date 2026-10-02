import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {AdventureRuntime,AdventureValidator} from '../runtime/adventure_engine_v2.js';

const module=JSON.parse(fs.readFileSync(new URL('../modules/tales_red_agents_of_desire.json',import.meta.url),'utf8'));

test('Agents of Desire validates and starts at Rogue hook',async()=>{
  const validation=new AdventureValidator().validateModule(module);
  assert.equal(validation.ok,true,validation.errors?.join('\n'));
  const rt=new AdventureRuntime(module,{rng:{random:()=>0,int:()=>0}});
  const state=await rt.start();
  assert.equal(state.currentLocationId,'aod_afterlife');
  assert.equal(state.currentSceneId,'aod_hook');
  assert.equal(state.flags.aod_ai_truth_known,false);
});

test('Ai death and Agent history begin sealed from player knowledge',async()=>{
  const rt=new AdventureRuntime(module,{rng:{random:()=>0,int:()=>0}});await rt.start();
  const ctx=rt.buildAiContext({worldState:{}});
  assert.ok(ctx.gmKnowledge.unrevealedSecrets.some(x=>x.id==='aod_secret_ai_dead'));
  assert.equal(ctx.playerKnowledge.clues.some(x=>x.id==='aod_clue_soulkiller_truth'),false);
});

test('investigation has multiple authored routes to server farm',()=>{
  const address=module.clues.find(x=>x.id==='aod_clue_server_address');
  assert.ok(address.npcIds.includes('aod_jane'));
  assert.ok(address.npcIds.includes('aod_lamarch'));
  assert.ok(module.gmGuidance.some(x=>/single investigation route/i.test(x)));
});

test('difficult historical image search is Rules Engine DV24',()=>{
  const e=module.events.find(x=>x.id==='aod_event_dead_ends_check');
  assert.equal(e.repeatPolicy,'UNTIL_SUCCESS');
  assert.equal(e.ruleActions[0].type,'SKILL_CHECK');
  assert.equal(e.ruleActions[0].skill,'Library Search');
  assert.equal(e.ruleActions[0].difficulty,24);
  assert.equal(e.ruleActions[0].required,true);
});

test('Maurice crime/operations disclosure is social Rules Engine DV17',()=>{
  const e=module.events.find(x=>x.id==='aod_event_maurice_check');
  assert.equal(e.ruleActions[0].difficulty,17);
  assert.match(e.ruleActions[0].skill,/Conversation/);
  assert.match(e.ruleActions[0].skill,/Persuasion/);
  assert.equal(module.encounters.some(x=>x.participants?.includes('aod_maurice')),false);
});

test('all three authored resolutions are explicit player choices',()=>{
  const ids=['aod_event_till_death','aod_event_charade','aod_event_broken_masquerade'];
  for(const id of ids){
    const e=module.events.find(x=>x.id===id);
    assert.equal(e.trigger.type,'ON_PLAYER_CHOICE');
    assert.ok(e.prerequisites.some(x=>x.type==='FLAG_EQUALS'&&x.key==='aod_agent_recovered'));
  }
  assert.ok(module.gmGuidance.some(x=>/final disposition is a player moral choice/i.test(x)));
});

test('mission cannot complete before Agent recovery and chosen resolution',async()=>{
  const rt=new AdventureRuntime(module,{rng:{random:()=>0,int:()=>0}});await rt.start();
  assert.notEqual(rt.evaluateCompletion(),'COMPLETED');
  rt.state.flags.aod_agent_recovered=true;
  assert.notEqual(rt.evaluateCompletion(),'COMPLETED');
  rt.state.flags.aod_resolution='CHARADE_CONTINUES';
  rt.state.flags.aod_resolution_complete=true;
  await rt.completeObjective('aod_obj_find_ai');
  assert.equal(rt.state.flags.aod_mission_complete,true);
  assert.equal(rt.evaluateCompletion(),'COMPLETED');
});