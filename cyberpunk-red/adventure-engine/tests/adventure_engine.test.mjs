import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AdventureValidator,AdventureRegistry,AdventureRuntime,AdventurePersistence,
  AdventureStatus,TriggerType,StartMode
} from '../runtime/adventure_engine.js';

function fixture(){
  return {
    id:'fixture',schemaVersion:1,contentVersion:1,systemId:'cyberpunk-red',title:'Fixture',campaignType:'OFFICIAL_ADVENTURE',
    startDefinition:{
      startingLocation:'loc.a',startingSceneId:'scene.a',initialFlags:{opened:true},
      initialObjectives:['obj.main'],initialNpcIds:['npc.a'],initialConsequences:[]
    },
    locations:[
      {id:'loc.a',name:'A',npcIds:['npc.a'],clueIds:['clue.a'],encounterIds:[],secretIds:['secret.a'],sourceReference:{sourceBook:'Fixture'}},
      {id:'loc.b',name:'B',npcIds:[],clueIds:[],encounterIds:[],secretIds:[],sourceReference:{sourceBook:'Fixture'}}
    ],
    npcs:[{id:'npc.a',name:'NPC A',sourceReference:{sourceBook:'Fixture'}}],
    factions:[],creatures:[],items:[],
    clues:[{
      id:'clue.a',title:'Clue',locationIds:['loc.a'],npcIds:['npc.a'],discoveryMethods:['SEARCH','DIALOGUE'],
      prerequisites:[],information:'Fact A',unlocks:['secret-path'],repeatable:false,required:true,sourceReference:{sourceBook:'Fixture'}
    }],
    secrets:[{
      id:'secret.a',information:'Secret A',prerequisites:[],revealConditions:[{type:'CLUE_DISCOVERED',clueId:'clue.a'}],
      relatedNpcIds:['npc.a'],relatedLocationIds:['loc.a'],sourceReference:{sourceBook:'Fixture'}
    }],
    rumors:[],
    objectives:[{
      id:'obj.main',title:'Objective',description:'Do thing',type:'PRIMARY',prerequisites:[],
      successConditions:[{type:'FLAG_EQUALS',key:'objective_ok',value:true}],failureConditions:[],
      sourceReference:{sourceBook:'Fixture'}
    }],
    quests:[],
    scenes:[{
      id:'scene.a',locationId:'loc.a',purpose:'Opening',participants:['npc.a'],knownFacts:['Fact visible'],
      hiddenFacts:['Hidden'],availableClues:['clue.a'],availableEvents:['event.arrive'],availableEncounters:[],possibleTriggers:[],exits:['loc.b'],
      completionConditions:[],sourceReference:{sourceBook:'Fixture'}
    }],
    encounters:[],
    events:[{
      id:'event.arrive',trigger:{type:'ON_ENTER_LOCATION'},prerequisites:[],locationRestrictions:['loc.b'],probability:1,repeatPolicy:'ONCE',
      content:'Arrival consequence',ruleActions:[],consequences:[{type:'SET_FLAG',target:'arrived_b',value:true}],sourceReference:{sourceBook:'Fixture'}
    }],
    triggers:[],conditions:[],consequences:[],
    clocks:[{id:'clock.threat',name:'Threat',current:0,max:3,advanceTriggers:[],regressTriggers:[],thresholds:[2,3],thresholdEvents:[],visibleToPlayer:false,sourceReference:{sourceBook:'Fixture'}}],
    timers:[],stateFlags:[],relationships:[],transitions:[],
    completionConditions:[{type:'OBJECTIVE_COMPLETED',objectiveId:'obj.main'}],failureConditions:[],rewards:[],
    randomTables:[{
      id:'table.test',entries:[
        {id:'one',weight:1,conditions:[]},{id:'two',weight:0,conditions:[]}
      ],sourceReference:{sourceBook:'Fixture'}
    }],
    gmGuidance:[],sourceReferences:[{sourceBook:'Fixture'}]
  };
}

test('validator rejects duplicate ids',()=>{
  const m=fixture();m.locations.push({...m.locations[0]});
  const out=new AdventureValidator().validateModule(m);
  assert.equal(out.ok,false);
  assert.ok(out.errors.some(x=>x.includes('duplicate id loc.a')));
});

test('state starts from immutable module and persists separately',async()=>{
  let saved=null;
  const persistence=new AdventurePersistence({readState:()=>saved,writeState:s=>{saved=s}});
  const rt=new AdventureRuntime(fixture(),{persistence,rng:{random:()=>0,int:()=>0}});
  const state=await rt.start({campaignId:'campaign-1'});
  assert.equal(state.status,AdventureStatus.ACTIVE);
  assert.equal(state.currentLocationId,'loc.a');
  assert.equal(state.currentSceneId,'scene.a');
  assert.equal(state.flags.opened,true);
  assert.ok(saved);
  assert.equal(saved.adventureId,'fixture');
  assert.equal(saved.campaignId,'campaign-1');
});

test('clue discovery is persistent and non-repeatable',async()=>{
  const rt=new AdventureRuntime(fixture(),{rng:{random:()=>0,int:()=>0}});
  await rt.start();
  const one=await rt.discoverClue('clue.a',{method:'SEARCH'});
  const two=await rt.discoverClue('clue.a',{method:'DIALOGUE'});
  assert.equal(one.discovered,true);
  assert.equal(two.repeat,true);
  assert.deepEqual(rt.state.discoveredClueIds,['clue.a']);
  assert.equal(rt.state.flags['unlocked:secret-path'],true);
});

test('sealed secret cannot reveal before prerequisite and can after clue',async()=>{
  const rt=new AdventureRuntime(fixture(),{rng:{random:()=>0,int:()=>0}});
  await rt.start();
  assert.equal(rt.revealSecret('secret.a').blocked,true);
  await rt.discoverClue('clue.a',{method:'SEARCH'});
  assert.equal(rt.revealSecret('secret.a').revealed,true);
  assert.ok(rt.state.revealedSecretIds.includes('secret.a'));
});

test('consequences are idempotent under repeated source key',async()=>{
  const rt=new AdventureRuntime(fixture(),{rng:{random:()=>0,int:()=>0}});
  await rt.start();
  const c=[{type:'ADD_ITEM',target:'item.x',value:1}];
  rt.applyConsequences(c,{sourceId:'button:1',idempotencyPrefix:'button:1'});
  rt.applyConsequences(c,{sourceId:'button:1',idempotencyPrefix:'button:1'});
  assert.equal(rt.state.inventoryChanges['item.x'],1);
});

test('entering a location triggers matching event and only once',async()=>{
  const rt=new AdventureRuntime(fixture(),{rng:{random:()=>0,int:()=>0}});
  await rt.start();
  await rt.enterLocation('loc.b');
  assert.equal(rt.state.flags.arrived_b,true);
  assert.ok(rt.state.triggeredEventIds.includes('event.arrive'));
  const count=rt.state.campaignConsequences.filter(x=>x.sourceId==='event:event.arrive').length;
  await rt.enterLocation('loc.b');
  assert.equal(rt.state.campaignConsequences.filter(x=>x.sourceId==='event:event.arrive').length,count);
});

test('clock changes deterministically and clamps at max',async()=>{
  const rt=new AdventureRuntime(fixture(),{rng:{random:()=>0,int:()=>0}});
  await rt.start();
  rt.advanceClock('clock.threat',2);
  assert.equal(rt.state.activeClockStates['clock.threat'].current,2);
  rt.advanceClock('clock.threat',99);
  assert.equal(rt.state.activeClockStates['clock.threat'].current,3);
  assert.deepEqual(rt.state.activeClockStates['clock.threat'].thresholdsTriggered,[2,3]);
});

test('AI may propose but cannot directly kill NPC or complete unmet objective',async()=>{
  const rt=new AdventureRuntime(fixture(),{rng:{random:()=>0,int:()=>0}});
  await rt.start();
  let out=rt.validateAiIntent({narration:'Narration',proposedConsequences:[
    {type:'KILL_NPC',target:'npc.a'},
    {type:'COMPLETE_OBJECTIVE',target:'obj.main'},
    {type:'SET_FLAG',target:'color',value:'red'}
  ]});
  assert.equal(out.accepted.length,1);
  assert.equal(out.rejected.length,2);
  rt.state.flags.objective_ok=true;
  out=rt.validateAiIntent({proposedConsequences:[{type:'COMPLETE_OBJECTIVE',target:'obj.main'}]});
  assert.equal(out.accepted.length,1);
});

test('AI context separates player knowledge from unrevealed GM secret',async()=>{
  const rt=new AdventureRuntime(fixture(),{rng:{random:()=>0,int:()=>0}});
  await rt.start();
  const ctx=rt.buildAiContext({worldState:{day:1}});
  assert.equal(ctx.playerKnowledge.clues.length,0);
  assert.equal(ctx.gmKnowledge.unrevealedSecrets.length,1);
  assert.equal(ctx.gmKnowledge.unrevealedSecrets[0].visibility,'GM_ONLY');
  await rt.discoverClue('clue.a',{method:'SEARCH'});
  const ctx2=rt.buildAiContext({worldState:{day:1}});
  assert.equal(ctx2.playerKnowledge.clues.length,1);
});

test('objective completion is engine-controlled and closes adventure by state graph',async()=>{
  const rt=new AdventureRuntime(fixture(),{rng:{random:()=>0,int:()=>0}});
  await rt.start();
  rt.state.flags.objective_ok=true;
  await rt.completeObjective('obj.main');
  assert.equal(rt.evaluateCompletion(),AdventureStatus.COMPLETED);
});

test('random table uses host RNG, not AI narration',async()=>{
  const rt=new AdventureRuntime(fixture(),{rng:{random:()=>0,int:()=>0}});
  await rt.start();
  assert.equal(rt.rollTable('table.test').id,'one');
});

test('registry supports reusable modules and start mode remains explicit',async()=>{
  const registry=new AdventureRegistry();registry.register(fixture());
  const rt=new AdventureRuntime(registry.get('fixture'),{rng:{random:()=>0,int:()=>0}});
  const state=await rt.start({mode:StartMode.OFFICIAL_ADVENTURE});
  assert.equal(state.startMode,StartMode.OFFICIAL_ADVENTURE);
});


test('required ruleAction blocks consequences when Rules Engine cannot resolve it',async()=>{
  const m=fixture();
  m.events.push({
    id:'event.rule.blocked',trigger:{type:'ON_DIALOGUE'},prerequisites:[],locationRestrictions:[],repeatPolicy:'ONCE',
    content:'Needs a check',ruleActions:[{id:'check.1',type:'SKILL_CHECK',skill:'perception',difficulty:14,required:true}],
    consequences:[{type:'SET_FLAG',target:'passed_rule_event',value:true}],sourceReference:{sourceBook:'Fixture'}
  });
  const rulesAdapter={resolve:async action=>({ok:false,resolved:false,blocked:true,reason:'NO_RULES',type:action.type,action})};
  const rt=new AdventureRuntime(m,{rulesAdapter,rng:{random:()=>0,int:()=>0}});
  await rt.start();
  const rows=await rt.processEvent({type:'ON_DIALOGUE'});
  assert.equal(rows[0].blockedByRules,true);
  assert.equal(rt.state.flags.passed_rule_event,undefined);
  assert.equal(rt.state.pendingRuleActions.length,1);
});

test('resolved ruleAction allows event consequences and persists mechanical result',async()=>{
  const m=fixture();
  m.events.push({
    id:'event.rule.ok',trigger:{type:'ON_DIALOGUE'},prerequisites:[],locationRestrictions:[],repeatPolicy:'ONCE',
    content:'Check resolves',ruleActions:[{id:'check.2',type:'SKILL_CHECK',skill:'perception',difficulty:14,required:true}],
    consequences:[{type:'SET_FLAG',target:'rule_event_resolved',value:true}],sourceReference:{sourceBook:'Fixture'}
  });
  const rulesAdapter={resolve:async action=>({ok:true,resolved:true,total:18,success:true,type:action.type,action})};
  const rt=new AdventureRuntime(m,{rulesAdapter,rng:{random:()=>0,int:()=>0}});
  await rt.start();
  const rows=await rt.processEvent({type:'ON_DIALOGUE'});
  assert.equal(rows[0].blockedByRules,false);
  assert.equal(rt.state.flags.rule_event_resolved,true);
  assert.equal(rt.state.ruleResults.length,1);
  assert.equal(rt.state.ruleResults[0].success,true);
});
