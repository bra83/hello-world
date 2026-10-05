import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const p = new URL('../modules/tales_red_staying_vigilant.json', import.meta.url);
const m = JSON.parse(fs.readFileSync(p, 'utf8'));
const flag = k => m.startDefinition.initialFlags[k];
const event = id => m.events.find(x => x.id === id);
const secret = id => m.secrets.find(x => x.id === id);
const encounter = id => m.encounters.find(x => x.id === id);

test('canonical deterministic start preserves investigation state',()=>{
 assert.equal(m.id,'tales_red_staying_vigilant');
 assert.equal(m.startDefinition.startingSceneId,'sv_hook');
 assert.equal(flag('sv_nat_truth_known'),false);
 assert.equal(flag('sv_side_friend'),false);
 assert.equal(flag('sv_side_foe'),false);
});

test('Trace contract and Lowball bounty remain distinct authored offers',()=>{
 assert.equal(event('sv_event_accept_job').consequences.find(x=>x.type==='ADD_HISTORY').value.ebPerEdgerunner,1000);
 assert.equal(event('sv_event_choose_foe').consequences.find(x=>x.type==='ADD_HISTORY').value.bountyPerEdgerunner,2000);
});

test('tent city and alley are independent player-owned route branches',()=>{
 assert.ok(event('sv_event_choose_tent_city'));
 assert.ok(event('sv_event_choose_alley'));
 assert.equal(flag('sv_route_tent_city'),false);
 assert.equal(flag('sv_route_alley'),false);
});

test('warehouse infiltration preserves stealth and loud state',()=>{
 assert.equal(event('sv_event_warehouse_sneaky').consequences[0].value,false);
 assert.equal(event('sv_event_warehouse_loud').consequences[0].value,true);
 assert.equal(encounter('sv_enc_hardhat').rulesProfileId,'cpred_combat');
});

test('Nat truth stays sealed and Friend/Foe belongs to player',()=>{
 assert.equal(secret('sv_secret_nat_truth').revealConditions[0].key,'sv_nat_truth_known');
 assert.ok(event('sv_event_choose_friend').consequences.some(x=>x.type==='ADD_HISTORY'&&x.value.owner==='PLAYER'));
 assert.ok(event('sv_event_choose_foe').consequences.some(x=>x.type==='ADD_HISTORY'&&x.value.owner==='PLAYER'));
 assert.ok(event('sv_event_switch_to_foe'));
 assert.equal(m.aiContextPolicy.forbidForcedPlayerChoices,true);
});

test('Hot Zone chase is Rules Engine owned and authored escape threshold persists',()=>{
 assert.ok(m.rulesDependencies[0].requiredCapabilities.includes('VEHICLE_CHASE'));
 assert.equal(encounter('sv_enc_gyrocopter_chase').rulesProfileId,'cpred_vehicle_chase_combat');
 assert.equal(event('sv_event_chase_escape').consequences.find(x=>x.type==='ADD_HISTORY').value.crewSuccessfulManeuvers,7);
});

test('Nomad Camp and Lowball are mutually meaningful persistent outcomes',()=>{
 const friend=event('sv_event_resolve_nomad_camp').consequences.find(x=>x.type==='ADD_HISTORY').value;
 const foe=event('sv_event_resolve_lowball').consequences.find(x=>x.type==='ADD_HISTORY').value;
 assert.equal(friend.tracePaymentPerEdgerunner,1000);
 assert.equal(friend.natFavor,true);
 assert.equal(foe.lowballPaymentPerEdgerunner,2000);
 assert.equal(foe.tracePayment,0);
 assert.equal(foe.traceExposeWeakened,true);
});