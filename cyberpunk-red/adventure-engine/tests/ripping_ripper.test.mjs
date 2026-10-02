import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {AdventureValidator} from '../runtime/adventure_engine.js';

const modulePath=new URL('../modules/hope_reborn_ripping_ripper.json',import.meta.url);
const mod=JSON.parse(fs.readFileSync(modulePath,'utf8'));
const byId=(rows,id)=>(rows||[]).find(x=>x.id===id);

test('Ripping the Ripper validates as an AdventureModule',()=>{
  const out=new AdventureValidator().validateModule(mod);
  assert.equal(out.ok,true,JSON.stringify(out.errors));
  assert.equal(mod.startDefinition.startingSceneId,'rr_hook');
  assert.equal(mod.startDefinition.startingLocation,'rr_forlorn_hope');
});

test('finale preserves the two canonical player-owned paths and track switching',()=>{
  const hook=byId(mod.scenes,'rr_hook');
  assert.ok(hook.exits.includes('rr_busan'));
  assert.ok(hook.exits.includes('rr_bullets'));
  assert.ok(byId(mod.scenes,'rr_busan').exits.includes('rr_bullets'));
  assert.ok(byId(mod.scenes,'rr_redline').exits.includes('rr_bullets'));
  assert.ok(mod.gmGuidance.some(x=>/switch tracks/i.test(x)));
});

test('Busan Back Door keeps the Rocklin destination sealed until that path is selected',()=>{
  const secret=byId(mod.secrets,'rr_secret_busan_target');
  assert.equal(secret.revealConditions[0].key,'rr_busan_selected');
  assert.match(secret.information,/Rocklin Augmentics/i);
});

test('mechanical authority remains in Rules Engine on both paths',()=>{
  const busan=byId(mod.encounters,'rr_enc_busan');
  const assault=byId(mod.encounters,'rr_enc_hideout');
  assert.ok(busan.ruleActions.every(x=>x.authority==='RULES_ENGINE'));
  assert.ok(assault.ruleActions.every(x=>x.authority==='RULES_ENGINE'));
  assert.equal(busan.ruleActions.find(x=>x.type==='COMBAT_IF_TRIGGERED').notMandatory,true);
});

test('early Ripper death diverts to A Different Ending instead of forcing remaining beats',()=>{
  const event=byId(mod.events,'rr_event_early_death');
  assert.equal(event.trigger.target,'rr_ripper_dead');
  assert.ok(event.consequences.some(x=>x.target==='rr_different_ending'&&x.value===true));
  assert.ok(event.consequences.some(x=>x.target==='rr_resolution_reached'&&x.value===true));
});

test('direct assault models the canonical hideout progression without making every beat mandatory',()=>{
  const bullets=byId(mod.scenes,'rr_bullets');
  assert.ok(bullets.exits.includes('rr_walkway'));
  assert.ok(bullets.exits.includes('rr_east_wing'));
  assert.ok(bullets.exits.includes('rr_bridge'));
  assert.ok(bullets.exits.includes('rr_maze'));
  assert.ok(bullets.exits.includes('rr_man_cave'));
});

test('final resolution closes both mission and Hope Reborn campaign deterministically',()=>{
  const obj=byId(mod.objectives,'rr_obj_ripper');
  assert.ok(obj.consequencesSuccess.some(x=>x.target==='hr_mission_ripping_ripper_complete'));
  assert.ok(obj.consequencesSuccess.some(x=>x.target==='hope_reborn_campaign_complete'));
  assert.equal(mod.completionConditions[0].key,'rr_resolution_reached');
});
