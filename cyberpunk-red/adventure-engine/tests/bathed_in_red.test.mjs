import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const p = new URL('../modules/tales_red_bathed_in_red.json', import.meta.url);
const m = JSON.parse(fs.readFileSync(p, 'utf8'));
const flag = k => m.startDefinition.initialFlags[k];
const event = id => m.events.find(x => x.id === id);
const secret = id => m.secrets.find(x => x.id === id);
const encounter = id => m.encounters.find(x => x.id === id);

test('Bathed in Red starts deterministically at Delirium with Red Knight truth sealed',()=>{
 assert.equal(m.id,'tales_red_bathed_in_red');
 assert.equal(m.startDefinition.startingLocation,'bir_delirium');
 assert.equal(flag('bir_red_knight_role_known'),false);
 assert.equal(flag('bir_knight_exchange_started'),false);
 assert.equal(secret('bir_secret_red_knight_murder').revealConditions[0].key,'bir_red_knight_role_known');
});

test('Delirium ransomware and suspicion are persistent authored state',()=>{
 const e=event('bir_event_ransomware');
 assert.ok(e.consequences.some(x=>x.type==='SET_FLAG'&&x.target==='bir_ransomware_active'&&x.value===true));
 assert.ok(e.consequences.some(x=>x.type==='SET_FLAG'&&x.target==='bir_crew_suspected'&&x.value===true));
});

test('Lilah meeting fee and job payment remain separate player-owned offers',()=>{
 assert.equal(event('bir_event_meet_lilah').consequences.find(x=>x.type==='ADD_HISTORY').value.meetingFeePerEdgerunner,250);
 const contract=event('bir_event_accept_lilah_job').consequences.find(x=>x.type==='ADD_HISTORY').value;
 assert.equal(contract.jobPaymentPerEdgerunner,1000);
 assert.equal(contract.megabiteRemovalIfRaised,true);
 assert.equal(contract.owner,'PLAYER');
});

test('Knight Exchange preserves all four player-owned outcomes',()=>{
 for (const id of ['bir_event_save_dave','bir_event_save_lilah','bir_event_save_both','bir_event_save_neither']) {
   assert.equal(event(id).consequences.find(x=>x.type==='ADD_HISTORY').value.owner,'PLAYER');
 }
 assert.equal(m.aiContextPolicy.forbidForcedPlayerChoices,true);
});

test('saving Dave delegates canonical Cybertech DV17 to Rules Engine',()=>{
 const action=event('bir_event_save_dave').ruleActions[0];
 assert.equal(action.type,'CYBERTECH_CHECK');
 assert.equal(action.dv,17);
 assert.equal(action.authority,'RULES_ENGINE');
 assert.equal(encounter('bir_enc_knight_exchange').rulesProfileId,'cpred_combat_cybertech_disarm');
});

test('authored resolutions persist materially different consequences',()=>{
 assert.equal(event('bir_event_resolve_home').consequences.find(x=>x.type==='ADD_HISTORY').value.homeNightMarketDiscountPercent,10);
 assert.equal(event('bir_event_resolve_prickly').consequences.find(x=>x.type==='ADD_HISTORY').value.bonusRewardPerEdgerunner,500);
 const enemy=event('bir_event_resolve_enemy');
 assert.equal(enemy.ruleActions[0].dv,13);
 assert.equal(enemy.ruleActions[0].carryingVictimDv,15);
 assert.equal(enemy.consequences.find(x=>x.type==='ADD_HISTORY').value.warehouseExplosionDamage,'8d6');
 assert.equal(event('bir_event_resolve_jail').consequences.find(x=>x.type==='ADD_HISTORY').value.jailedNights,1);
});

test('part-two escalation is explicit persistent state rather than narration memory',()=>{
 assert.equal(flag('bir_part_two_war'),false);
 assert.ok(event('bir_event_save_both').consequences.some(x=>x.type==='SET_FLAG'&&x.target==='bir_part_two_war'&&x.value===true));
 assert.equal(m.aiContextPolicy.forbidStateMutation,true);
 assert.equal(m.aiContextPolicy.forbidSecretLeakage,true);
});