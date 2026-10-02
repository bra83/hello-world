import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {AdventureValidator,AdventureRuntime,AdventureStatus} from '../runtime/adventure_engine_v2.js';
const module=JSON.parse(fs.readFileSync(new URL('../modules/hope_reborn_welcome_neighborhood.json',import.meta.url),'utf8'));

test('Welcome module validates and starts at open job hub',async()=>{const v=new AdventureValidator().validateModule(module);assert.equal(v.ok,true,JSON.stringify(v.errors));const rt=new AdventureRuntime(module,{rng:{random:()=>0,int:()=>0}});await rt.start();assert.equal(rt.state.currentLocationId,'wtn_future_hope');assert.equal(rt.state.currentSceneId,'wtn_scene_hub');});

test('five neighborhood jobs are explicit peer branches with no forced order',()=>{const hub=module.scenes.find(s=>s.id==='wtn_scene_hub');assert.deepEqual(new Set(hub.exits),new Set(['wtn_scene_shark','wtn_scene_boys','wtn_scene_wheels','wtn_scene_turf','wtn_scene_love']));for(const id of hub.exits)assert.equal(module.scenes.find(s=>s.id===id).prerequisites.length,0);});

test('The Shark preserves multiple infiltration routes and Rules Engine authority',()=>{const clue=module.clues.find(c=>c.id==='wtn_clue_shark_routes');assert.match(clue.information,/Stairs.*elevator.*window.*light wells.*NET/i);const enc=module.encounters.find(e=>e.id==='wtn_enc_shark');assert.equal(enc.ruleActions[0].authority,'RULES_ENGINE');});

test('roller derby remains a mechanical Rules Engine dependency with canonical fallback',()=>{const enc=module.encounters.find(e=>e.id==='wtn_enc_wheels');assert.equal(enc.ruleActions[0].type,'ROLLER_DERBY');assert.equal(enc.ruleActions[0].fallback,'ATHLETICS_OPPOSED');});

test('Turf War betrayal is a real campaign failure branch',async()=>{const rt=new AdventureRuntime(module,{rng:{random:()=>0,int:()=>0}});await rt.start();rt.state.flags.wtn_campaign_ended_betrayal=true;assert.equal(rt.evaluateCompletion(),AdventureStatus.FAILED);assert.ok(module.gmGuidance.some(x=>/ends Hope Reborn/i.test(x)));});

test('Love Lies Dying timer is hidden from player and sealed as GM knowledge',()=>{const clock=module.clocks.find(c=>c.id==='wtn_clock_love');assert.equal(clock.visibleToPlayer,false);const secret=module.secrets.find(s=>s.id==='wtn_secret_love_timer');assert.ok(secret.revealConditions.length>0);});

test('The Report cannot unlock until all five jobs are complete',async()=>{const rt=new AdventureRuntime(module,{rng:{random:()=>0,int:()=>0}});await rt.start();for(const j of ['shark','boys','wheels','turf'])rt.state.flags['wtn_job_'+j+'_complete']=true;let out=await rt.completeObjective('wtn_obj_neighborhood');assert.equal(out.blocked,true);assert.equal(rt.state.flags.wtn_report_unlocked,undefined);rt.state.flags.wtn_job_love_complete=true;out=await rt.completeObjective('wtn_obj_neighborhood');assert.notEqual(out.blocked,true);assert.equal(rt.state.flags.wtn_report_unlocked,true);});

test('final report pays 2000eb each and emits campaign handoff only after unlock',async()=>{const rt=new AdventureRuntime(module,{rng:{random:()=>0,int:()=>0}});await rt.start();rt.state.flags.wtn_report_delivered=true;let rows=await rt.processEvent({type:'ON_FLAG',target:'wtn_report_delivered'});assert.equal(rows.length,0);for(const j of ['shark','boys','wheels','turf','love'])rt.state.flags['wtn_job_'+j+'_complete']=true;await rt.completeObjective('wtn_obj_neighborhood');rt.state.currentLocationId='wtn_future_hope';rows=await rt.processEvent({type:'ON_FLAG',target:'wtn_report_delivered'});assert.equal(rows.length,1);assert.equal(rt.state.flags.hr_mission_welcome_neighborhood_complete,true);assert.equal(rt.state.inventoryChanges.eb_per_edgerunner,2000);assert.equal(rt.evaluateCompletion(),AdventureStatus.COMPLETED);});