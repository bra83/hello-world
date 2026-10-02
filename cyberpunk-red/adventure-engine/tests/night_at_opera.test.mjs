import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {AdventureRuntime,AdventureValidator} from '../runtime/adventure_engine_v2.js';

const module=JSON.parse(fs.readFileSync(new URL('../modules/tales_red_night_at_opera.json',import.meta.url),'utf8'));

test('Night at the Opera validates and starts in University District',async()=>{
  const validation=new AdventureValidator().validateModule(module);
  assert.equal(validation.ok,true,validation.errors?.join('\n'));
  const rt=new AdventureRuntime(module,{rng:{random:()=>0,int:()=>0}});
  const state=await rt.start();
  assert.equal(state.currentLocationId,'nat_opera_university_district');
  assert.equal(state.currentSceneId,'nat_opera_hook');
  assert.equal(state.flags.nat_contract_offered,true);
});

test('GM truth about Ruthven and Master starts sealed',async()=>{
  const rt=new AdventureRuntime(module,{rng:{random:()=>0,int:()=>0}});await rt.start();
  const ctx=rt.buildAiContext({worldState:{}});
  const secrets=ctx.gmKnowledge.unrevealedSecrets.map(x=>x.id);
  assert.ok(secrets.includes('nat_secret_master_scheme'));
  assert.ok(secrets.includes('nat_secret_ruthven_truth'));
  assert.equal(ctx.playerKnowledge.clues.length,0);
});

test('Empty Office Hours remains optional and cannot gate church path',()=>{
  const optional=module.scenes.find(x=>x.id==='nat_opera_empty_office');
  const clue=module.clues.find(x=>x.id==='nat_clue_ruthven_path');
  assert.ok(optional);
  assert.ok(clue.locationIds.includes('nat_opera_noodle_shop'));
  assert.ok(clue.locationIds.includes('nat_opera_office'));
  assert.ok(module.gmGuidance.some(x=>/optional/i.test(x)));
});

test('Campus Security observation belongs to Rules Engine at DV9',()=>{
  const e=module.events.find(x=>x.id==='nat_event_security_perception');
  assert.equal(e.repeatPolicy,'UNTIL_SUCCESS');
  assert.equal(e.ruleActions[0].type,'SKILL_CHECK');
  assert.equal(e.ruleActions[0].skill,'Perception');
  assert.equal(e.ruleActions[0].difficulty,9);
  assert.equal(e.ruleActions[0].required,true);
});

test('contract money is split into advance and recovery balance',()=>{
  const accept=module.events.find(x=>x.id==='nat_event_contract');
  const finish=module.events.find(x=>x.id==='nat_event_epilogue');
  assert.equal(accept.consequences.find(x=>x.type==='UPDATE_WORLD_STATE').value.ebPerCharacter,500);
  assert.equal(finish.consequences.find(x=>x.type==='UPDATE_WORLD_STATE').value.ebPerCharacter,1500);
  assert.equal(module.objectives[0].rewards[0].value,2000);
});

test('Philharmonic Vampyres are not forced into combat',()=>{
  assert.equal(module.encounters.some(x=>x.participants?.includes('nat_vampyres')),false);
  assert.ok(module.gmGuidance.some(x=>/not treat Philharmonic Vampyres as automatically hostile/i.test(x)));
});

test('mission cannot complete before Lucy recovery and epilogue state',async()=>{
  const rt=new AdventureRuntime(module,{rng:{random:()=>0,int:()=>0}});await rt.start();
  assert.notEqual(rt.evaluateCompletion(),'COMPLETED');
  rt.state.flags.nat_contract_signed=true;
  rt.state.flags.nat_lucy_recovered=true;
  await rt.processEvent({type:'ON_FLAG',target:'nat_lucy_recovered'},{source:'test'});
  assert.equal(rt.state.flags.nat_mission_complete,true);
  assert.equal(rt.evaluateCompletion(),'COMPLETED');
});
