import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {AdventureValidator,AdventureRuntime,AdventureStatus} from '../runtime/adventure_engine_v2.js';
const module=JSON.parse(fs.readFileSync(new URL('../modules/hope_reborn_hopes_calling.json',import.meta.url),'utf8'));

test("Hope's Calling validates and starts in open task hub",async()=>{const v=new AdventureValidator().validateModule(module);assert.equal(v.ok,true,JSON.stringify(v.errors));const rt=new AdventureRuntime(module,{rng:{random:()=>0,int:()=>0}});await rt.start();assert.equal(rt.state.currentLocationId,'hc_forlorn_hope');assert.equal(rt.state.currentSceneId,'hc_task_hub');assert.ok(module.scenes.find(s=>s.id==='hc_task_hub').exits.length>=4);});

test('infiltrator identities stay sealed until evidence',async()=>{const rt=new AdventureRuntime(module,{rng:{random:()=>0,int:()=>0}});await rt.start();assert.equal(rt.revealSecret('hc_secret_infiltrators').blocked,true);await rt.discoverClue('hc_clue_annie',{method:'DEDUCTION'});assert.equal(rt.revealSecret('hc_secret_infiltrators').revealed,true);});

test('preparation order remains player-owned and unfinished tasks persist',()=>{assert.ok(module.startDefinition.openingConstraints.includes('PLAYER_AGENCY'));assert.ok(module.startDefinition.openingConstraints.includes('UNFINISHED_TASKS_PERSIST'));const hub=module.scenes.find(s=>s.id==='hc_task_hub');for(const id of ['hc_supplies','hc_gentleman','hc_sabotage','hc_opening'])assert.ok(hub.exits.includes(id));});

test('Gentleman encounter allows social or player-chosen violence under Rules Engine',()=>{const a=module.encounters.find(e=>e.id==='hc_enc_gentleman').ruleActions[0];assert.equal(a.authority,'RULES_ENGINE');assert.equal(a.playerChoice,true);assert.match(a.type,/SOCIAL_OR_COMBAT/);});

test('opening night preserves opposed bar brawl and timed chaos mechanics',()=>{const actions=module.encounters.find(e=>e.id==='hc_enc_opening').ruleActions;assert.ok(actions.some(a=>a.type==='BAR_BRAWL_OPPOSED_CHECK'&&a.eachRound));assert.ok(actions.some(a=>a.type==='TIMED_CHAOS_SEQUENCE'&&a.preserveUnfinishedTasks));assert.ok(actions.every(a=>a.authority==='RULES_ENGINE'));});

test('mission only completes after opening night resolution',async()=>{const rt=new AdventureRuntime(module,{rng:{random:()=>0,int:()=>0}});await rt.start();assert.equal(rt.evaluateCompletion(),AdventureStatus.ACTIVE);rt.state.currentLocationId='hc_forlorn_hope';rt.state.flags.hc_opening_resolved=true;const rows=await rt.processEvent({type:'ON_FLAG',target:'hc_opening_resolved'});assert.equal(rows.length,1);assert.equal(rt.state.flags.hr_mission_hopes_calling_complete,true);assert.equal(rt.evaluateCompletion(),AdventureStatus.COMPLETED);});