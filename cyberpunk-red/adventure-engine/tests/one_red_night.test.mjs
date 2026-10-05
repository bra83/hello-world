import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const p = new URL('../modules/tales_red_one_red_night.json', import.meta.url);
const m = JSON.parse(fs.readFileSync(p, 'utf8'));
const flag = k => m.startDefinition.initialFlags[k];
const event = id => m.events.find(x => x.id === id);
const secret = id => m.secrets.find(x => x.id === id);

test('One Red Night starts deterministically after Bathed in Red with Roman identity sealed',()=>{
 assert.equal(m.id,'tales_red_one_red_night');
 assert.equal(m.startDefinition.startingLocation,'orn_pleasant_valley');
 assert.equal(flag('orn_red_knight_identity_known'),false);
 assert.equal(secret('orn_secret_roman_identity').revealConditions[0].key,'orn_red_knight_identity_known');
});

test('Michael contract is explicit player-owned state',()=>{
 const h=event('orn_event_accept_contract').consequences.find(x=>x.type==='ADD_HISTORY').value;
 assert.equal(h.paymentEb,3000);
 assert.equal(h.apartmentMonths,1);
 assert.equal(h.owner,'PLAYER');
});

test('Protocon misunderstanding preserves alliance and optional 500eb hire without forced combat',()=>{
 const h=event('orn_event_protocon_alliance').consequences.find(x=>x.type==='ADD_HISTORY').value;
 assert.equal(h.optionalHireEb,500);
 assert.equal(h.owner,'PLAYER');
 assert.equal(m.encounters.find(x=>x.id==='orn_enc_rice_guy').type,'MULTI_SOLUTION_SOCIAL_COMBAT');
});

test('concert crowd is persistent bounded state and mechanics remain Rules Engine authority',()=>{
 const e=event('orn_event_concert');
 const crowd=e.consequences.find(x=>x.type==='ADD_HISTORY').value;
 assert.deepEqual(crowd,{initialRating:0,min:-2,max:2});
 assert.ok(e.ruleActions.every(x=>x.authority==='RULES_ENGINE'));
});

test('silver-card investigation supports authored contacts and creative research',()=>{
 const clue=m.clues.find(x=>x.id==='orn_clue_seral_grove');
 assert.ok(clue.discoveryMethods.includes('DIALOGUE'));
 assert.ok(clue.discoveryMethods.includes('LIBRARY_SEARCH'));
 assert.ok(clue.discoveryMethods.includes('FIXER'));
 assert.ok(clue.discoveryMethods.includes('CREATIVE_INVESTIGATION'));
 assert.equal(event('orn_event_locate_grove').ruleActions[0].dv,13);
});

test('Seral Grove combat NET security and medical resolution stay outside AI authority',()=>{
 assert.equal(m.encounters.find(x=>x.id==='orn_enc_grove').rulesProfileId,'cpred_combat_net_security');
 assert.equal(event('orn_event_defeat_red_knight').ruleActions[0].authority,'RULES_ENGINE');
 assert.equal(event('orn_event_save_red_knight').ruleActions[0].authority,'RULES_ENGINE');
 assert.equal(m.aiContextPolicy.forbidInventedRolls,true);
 assert.equal(m.aiContextPolicy.forbidRulesOverride,true);
});

test('final truth choice has distinct persistent consequences and is player-owned',()=>{
 const light=event('orn_event_out_in_light').consequences.find(x=>x.type==='ADD_HISTORY').value;
 const buried=event('orn_event_bury_past').consequences.find(x=>x.type==='ADD_HISTORY').value;
 assert.equal(light.ending,'OUT_IN_THE_LIGHT');
 assert.equal(light.michaelPaymentEb,0);
 assert.equal(light.protoconFriends,true);
 assert.equal(light.owner,'PLAYER');
 assert.equal(buried.ending,'BURIED_PAST');
 assert.equal(buried.michaelPaymentEb,3000);
 assert.equal(buried.evidenceDestroyed,true);
 assert.equal(buried.owner,'PLAYER');
 assert.equal(m.aiContextPolicy.forbidForcedPlayerChoices,true);
});