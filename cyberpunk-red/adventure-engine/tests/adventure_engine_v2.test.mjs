import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {AdventureRuntime,AdventureValidator,AdventureStatus} from '../runtime/adventure_engine_v2.js';

const source=new URL('../modules/red_chrome_cargo.json',import.meta.url);
const redChrome=JSON.parse(fs.readFileSync(source,'utf8'));
const rng={random:()=>0,int:()=>0};

function mini(){return {
  id:'v2-mini',schemaVersion:1,contentVersion:1,systemId:'cyberpunk-red',title:'V2 Mini',campaignType:'OFFICIAL_ADVENTURE',
  startDefinition:{startingLocation:'a',startingSceneId:null,initialFlags:{},initialObjectives:['o'],initialNpcIds:[],initialConsequences:[]},
  locations:[{id:'a',name:'A',npcIds:[],encounterIds:[],clueIds:[],secretIds:[],sourceReference:{sourceBook:'T'}},{id:'b',name:'B',npcIds:[],encounterIds:[],clueIds:[],secretIds:[],sourceReference:{sourceBook:'T'}}],
  npcs:[],factions:[],creatures:[],items:[],clues:[],secrets:[],rumors:[],quests:[],scenes:[],encounters:[],triggers:[],conditions:[],consequences:[],clocks:[],timers:[],stateFlags:[],relationships:[],transitions:[],rewards:[],randomTables:[],gmGuidance:[],sourceReferences:[{sourceBook:'T'}],
  objectives:[{id:'o',title:'O',description:'',type:'PRIMARY',prerequisites:[],successConditions:[{type:'FLAG',key:'ready'}],failureConditions:[],consequencesSuccess:[{type:'SET_FLAG',target:'rewarded',value:true}],consequencesFailure:[],sourceReference:{sourceBook:'T'}}],
  events:[
    {id:'only-b',trigger:{type:'ON_DIALOGUE'},prerequisites:[],locationRestrictions:['b'],repeatPolicy:'REPEATABLE',ruleActions:[],consequences:[{type:'ADVANCE_CLOCK',target:'c',value:1}],sourceReference:{sourceBook:'T'}},
    {id:'retry',trigger:{type:'ON_FLAG',target:'try'},prerequisites:[],locationRestrictions:[],repeatPolicy:'UNTIL_SUCCESS',ruleActions:[{id:'check',type:'SKILL_CHECK',required:true}],consequences:[{type:'SET_FLAG',target:'passed',value:true}],sourceReference:{sourceBook:'T'}}
  ],
  completionConditions:[{type:'OBJECTIVE_COMPLETED',objectiveId:'o'}],failureConditions:[],
  clocks:[{id:'c',name:'C',current:0,max:5,thresholds:[],sourceReference:{sourceBook:'T'}}]
}}

test('top-level event locationRestrictions are enforced',async()=>{
  const rt=new AdventureRuntime(mini(),{rng});await rt.start();
  await rt.processEvent({type:'ON_DIALOGUE'});assert.equal(rt.state.activeClockStates.c.current,0);
  await rt.enterLocation('b');await rt.processEvent({type:'ON_DIALOGUE'});assert.equal(rt.state.activeClockStates.c.current,1);
});

test('REPEATABLE event applies consequences on every valid occurrence',async()=>{
  const rt=new AdventureRuntime(mini(),{rng});await rt.start();await rt.enterLocation('b');
  await rt.processEvent({type:'ON_DIALOGUE'});await rt.processEvent({type:'ON_DIALOGUE'});
  assert.equal(rt.state.activeClockStates.c.current,2);
});

test('UNTIL_SUCCESS event is retryable after a blocked rules result',async()=>{
  let attempts=0;const rulesAdapter={resolve:async action=>{attempts++;return attempts===1?{ok:false,resolved:false,blocked:true,action}:{ok:true,resolved:true,success:true,action}}};
  const rt=new AdventureRuntime(mini(),{rng,rulesAdapter});await rt.start();
  let rows=await rt.processEvent({type:'ON_FLAG',flag:'try'});assert.equal(rows[0].blockedByRules,true);assert.equal(rt.state.triggeredEventIds.includes('retry'),false);
  rows=await rt.processEvent({type:'ON_FLAG',flag:'try'});assert.equal(rows[0].blockedByRules,false);assert.equal(rt.state.flags.passed,true);assert.equal(rt.state.triggeredEventIds.includes('retry'),true);
});

test('objective success conditions gate completion and success consequences apply once',async()=>{
  const rt=new AdventureRuntime(mini(),{rng});await rt.start();
  let out=await rt.completeObjective('o');assert.equal(out.blocked,true);assert.equal(rt.state.completedObjectiveIds.length,0);
  rt.state.flags.ready=true;out=await rt.completeObjective('o');assert.equal(out.blocked,false);assert.equal(rt.state.flags.rewarded,true);assert.equal(rt.state.status,AdventureStatus.COMPLETED);
  await rt.completeObjective('o');assert.equal(rt.state.campaignConsequences.filter(x=>x.target==='rewarded').length,1);
});

test('Red Chrome Cargo module validates with Cyberpunk rule actions',()=>{
  const known=['SKILL_CHECK','OPPOSED_CHECK','COMBAT_START','COMBAT_RESOLUTION','DAMAGE','REST','TRAVEL','CHASE','NETRUN','NET_ARCHITECTURE','HUMANITY_CHECK','ADDICTION_CHECK','ROLE_ABILITY','PURCHASE','SALE','CYBERWARE_INSTALL','CYBERWARE_REMOVE','REPAIR','CRAFT','MEDICAL','WORLD_TIME_ADVANCE','ITEM_USE'];
  const result=new AdventureValidator({knownRuleActions:known}).validateModule(redChrome);
  assert.equal(result.ok,true,JSON.stringify(result.errors));
  assert.equal(redChrome.startDefinition.startingLocation,'rcc_hornet_train');
  assert.ok(redChrome.locations.length>=6);assert.ok(redChrome.events.length>=6);assert.ok(redChrome.encounters.length>=2);
});

test('Red Chrome Cargo starts deterministically and keeps sealed cargo secret hidden',async()=>{
  const rt=new AdventureRuntime(redChrome,{rng});await rt.start();
  assert.equal(rt.state.currentLocationId,'rcc_hornet_train');assert.equal(rt.state.currentSceneId,'rcc_scene_briefing');
  const ctx=rt.buildAiContext();assert.equal(ctx.playerKnowledge.revealedSecretIds.includes('rcc_secret_cargo'),false);assert.ok(ctx.gmKnowledge.unrevealedSecrets.some(x=>x.id==='rcc_secret_cargo'));
});
