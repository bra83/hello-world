/*
 * Braseiro Universal Adventure Engine v1
 * Deterministic state authority for adventures. No RAG dependency.
 * The AI narrator may describe/propose; this engine alone commits adventure state.
 */

const deepClone = value => value == null ? value : JSON.parse(JSON.stringify(value));
const list = value => Array.isArray(value) ? value : [];
const obj = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const nowIso = () => new Date().toISOString();
const norm = value => String(value ?? '').trim();
const idMap = rows => new Map(list(rows).map(row => [norm(row?.id), row]).filter(([id]) => id));
const statusOfObjective = (state,id) => state.completedObjectiveIds.includes(id) ? 'COMPLETED' : state.failedObjectiveIds.includes(id) ? 'FAILED' : 'ACTIVE';

export const ADVENTURE_SCHEMA_VERSION = 1;
export const ADVENTURE_STATE_VERSION = 1;

export const AdventureStatus = Object.freeze({
  NOT_STARTED:'NOT_STARTED', ACTIVE:'ACTIVE', PAUSED:'PAUSED', COMPLETED:'COMPLETED', FAILED:'FAILED'
});

export const StartMode = Object.freeze({
  OFFICIAL_ADVENTURE:'OFFICIAL_ADVENTURE',
  GUIDED_CAMPAIGN:'GUIDED_CAMPAIGN',
  SOLO:'SOLO',
  SANDBOX:'SANDBOX',
  TAVERN_START:'TAVERN_START'
});

export const TriggerType = Object.freeze({
  ON_ENTER_LOCATION:'ON_ENTER_LOCATION',
  ON_LEAVE_LOCATION:'ON_LEAVE_LOCATION',
  ON_TIME_ELAPSED:'ON_TIME_ELAPSED',
  ON_DAY_CHANGED:'ON_DAY_CHANGED',
  ON_NPC_MET:'ON_NPC_MET',
  ON_NPC_DEATH:'ON_NPC_DEATH',
  ON_CLUE_DISCOVERED:'ON_CLUE_DISCOVERED',
  ON_OBJECTIVE_COMPLETED:'ON_OBJECTIVE_COMPLETED',
  ON_OBJECTIVE_FAILED:'ON_OBJECTIVE_FAILED',
  ON_ITEM_FOUND:'ON_ITEM_FOUND',
  ON_COMBAT_END:'ON_COMBAT_END',
  ON_REST:'ON_REST',
  ON_TRAVEL:'ON_TRAVEL',
  ON_DIALOGUE:'ON_DIALOGUE',
  ON_FLAG:'ON_FLAG',
  ON_CLOCK_THRESHOLD:'ON_CLOCK_THRESHOLD',
  ON_RANDOM_CHECK:'ON_RANDOM_CHECK'
});

export const ConsequenceType = Object.freeze({
  SET_FLAG:'SET_FLAG',
  ADVANCE_CLOCK:'ADVANCE_CLOCK',
  REGRESS_CLOCK:'REGRESS_CLOCK',
  MOVE_NPC:'MOVE_NPC',
  REMOVE_NPC:'REMOVE_NPC',
  KILL_NPC:'KILL_NPC',
  MISSING_NPC:'MISSING_NPC',
  CHANGE_RELATIONSHIP:'CHANGE_RELATIONSHIP',
  ADD_CLUE:'ADD_CLUE',
  REVEAL_SECRET:'REVEAL_SECRET',
  ADD_RUMOR:'ADD_RUMOR',
  COMPLETE_OBJECTIVE:'COMPLETE_OBJECTIVE',
  FAIL_OBJECTIVE:'FAIL_OBJECTIVE',
  ADD_ITEM:'ADD_ITEM',
  REMOVE_ITEM:'REMOVE_ITEM',
  CHANGE_LOCATION:'CHANGE_LOCATION',
  CHANGE_SCENE:'CHANGE_SCENE',
  CHANGE_FACTION_STATE:'CHANGE_FACTION_STATE',
  TRIGGER_EVENT:'TRIGGER_EVENT',
  RESOLVE_ENCOUNTER:'RESOLVE_ENCOUNTER',
  UPDATE_WORLD_STATE:'UPDATE_WORLD_STATE',
  APPEND_HISTORY:'APPEND_HISTORY'
});

const COLLECTIONS = Object.freeze([
  'locations','npcs','factions','creatures','items','clues','secrets','rumors','objectives','quests',
  'scenes','encounters','events','triggers','conditions','consequences','clocks','timers','transitions',
  'rewards','randomTables'
]);

export class AdventureError extends Error {
  constructor(code,message,detail=null){
    super(message); this.name='AdventureError'; this.code=code; this.detail=detail;
  }
}

export class AdventureValidator {
  constructor({knownRuleActions=null,locationResolver=null}={}){
    this.knownRuleActions=knownRuleActions;
    this.locationResolver=locationResolver;
  }

  validateModule(module){
    const errors=[], warnings=[];
    const m=obj(module);
    if(!norm(m.id)) errors.push('module.id is required');
    if(!norm(m.systemId)) errors.push('module.systemId is required');
    if(!norm(m.title)) errors.push('module.title is required');
    if(Number(m.schemaVersion||ADVENTURE_SCHEMA_VERSION)!==ADVENTURE_SCHEMA_VERSION) warnings.push('schemaVersion differs from runtime schema');
    if(!m.startDefinition && !m.startingLocation) warnings.push('start definition is absent');

    const maps={};
    for(const key of COLLECTIONS){
      const rows=list(m[key]);
      const seen=new Set();
      maps[key]=new Set();
      rows.forEach((row,index)=>{
        const id=norm(row?.id);
        if(!id){errors.push(key+'['+index+'] missing id');return}
        if(seen.has(id)) errors.push('duplicate id '+id+' in '+key);
        seen.add(id); maps[key].add(id);
        if(!row.sourceReference && !list(m.sourceReferences).length) warnings.push(key+':'+id+' missing sourceReference');
      });
    }

    const requireRef=(collection,id,owner)=>{
      if(!id)return;
      if(!maps[collection]?.has(id)) errors.push(owner+' references missing '+collection+':'+id);
    };

    list(m.scenes).forEach(s=>{
      requireRef('locations',s.locationId,'scene:'+s.id);
      list(s.participants).forEach(id=>requireRef('npcs',id,'scene:'+s.id));
      list(s.availableClues).forEach(id=>requireRef('clues',id,'scene:'+s.id));
      list(s.availableEvents).forEach(id=>requireRef('events',id,'scene:'+s.id));
      list(s.availableEncounters).forEach(id=>requireRef('encounters',id,'scene:'+s.id));
    });
    list(m.locations).forEach(loc=>{
      list(loc.npcIds).forEach(id=>requireRef('npcs',id,'location:'+loc.id));
      list(loc.encounterIds).forEach(id=>requireRef('encounters',id,'location:'+loc.id));
      list(loc.clueIds).forEach(id=>requireRef('clues',id,'location:'+loc.id));
      list(loc.secretIds).forEach(id=>requireRef('secrets',id,'location:'+loc.id));
    });
    list(m.clues).forEach(clue=>{
      list(clue.locationIds).forEach(id=>requireRef('locations',id,'clue:'+clue.id));
      list(clue.npcIds).forEach(id=>requireRef('npcs',id,'clue:'+clue.id));
    });
    list(m.secrets).forEach(secret=>{
      list(secret.relatedNpcIds).forEach(id=>requireRef('npcs',id,'secret:'+secret.id));
      list(secret.relatedLocationIds).forEach(id=>requireRef('locations',id,'secret:'+secret.id));
    });
    list(m.encounters).forEach(enc=>requireRef('locations',enc.locationId,'encounter:'+enc.id));

    const objectives=[...list(m.objectives),...list(m.quests)];
    objectives.forEach(o=>{
      if(!list(o.successConditions).length && !list(o.failureConditions).length) warnings.push('objective '+o.id+' has no explicit resolution conditions');
    });

    list(m.clocks).forEach(clock=>{
      const max=Number(clock.max);
      if(!Number.isFinite(max)||max<=0) errors.push('clock '+clock.id+' has invalid max');
      list(clock.thresholds).forEach(t=>{if(Number(t)<0||Number(t)>max)errors.push('clock '+clock.id+' invalid threshold '+t)});
    });

    const ruleActions=[];
    [...list(m.events),...list(m.encounters)].forEach(owner=>list(owner.ruleActions).forEach(action=>ruleActions.push({owner:owner.id,action})));
    if(this.knownRuleActions){
      const known=new Set(this.knownRuleActions);
      ruleActions.forEach(({owner,action})=>{
        const type=norm(action?.type);
        if(type&&!known.has(type)) errors.push('unknown ruleAction '+type+' requested by '+owner);
      });
    }

    const start=m.startDefinition||{};
    const startLocation=norm(start.startingLocation||m.startingLocation);
    if(startLocation && maps.locations.size && !maps.locations.has(startLocation)){
      warnings.push('startingLocation '+startLocation+' is not declared in module locations; world resolver must resolve it externally');
    }

    return {ok:errors.length===0,errors,warnings};
  }

  assertModule(module){
    const result=this.validateModule(module);
    if(!result.ok) throw new AdventureError('INVALID_MODULE','AdventureModule validation failed',result);
    return result;
  }
}

export class AdventureRegistry {
  constructor({validator=new AdventureValidator()}={}){
    this.validator=validator; this.modules=new Map();
  }
  register(module){
    this.validator.assertModule(module);
    const id=norm(module.id);
    this.modules.set(id,deepClone(module));
    return this.get(id);
  }
  unregister(id){return this.modules.delete(norm(id))}
  get(id){const row=this.modules.get(norm(id));return row?deepClone(row):null}
  has(id){return this.modules.has(norm(id))}
  list(){return [...this.modules.values()].map(m=>({id:m.id,title:m.title,version:m.version||m.contentVersion||1,campaignType:m.campaignType||null,sourceBook:m.sourceBook||null}))}
  clear(){this.modules.clear()}
  async loadIndex(indexUrl,{fetcher=globalThis.fetch}={}){
    if(typeof fetcher!=='function')throw new AdventureError('NO_FETCH','No fetch implementation available');
    const index=await (await fetcher(indexUrl)).json();
    const base=new URL(indexUrl,globalThis.location?.href||'https://local.invalid/').href;
    for(const entry of list(index.modules)){
      const url=new URL(entry.path,base).href;
      const res=await fetcher(url);
      if(!res.ok)throw new AdventureError('MODULE_FETCH_FAILED','Failed to load '+url,{status:res.status});
      this.register(await res.json());
    }
    return this.list();
  }
}

export class AdventurePersistence {
  constructor({readState,writeState}={}){
    this.readState=readState||(()=>null);
    this.writeState=writeState||(()=>{});
  }
  load(){const state=this.readState();return state?deepClone(state):null}
  save(state){this.writeState(deepClone(state));return state}
}

export class AdventureConditionEngine {
  constructor({externalEvaluator=null}={}){this.externalEvaluator=externalEvaluator}

  evaluate(condition,state,ctx={}){
    if(condition==null)return true;
    if(typeof condition==='boolean')return condition;
    if(Array.isArray(condition))return condition.every(c=>this.evaluate(c,state,ctx));
    if(typeof condition==='string')return !!state.flags?.[condition];
    const c=obj(condition),type=norm(c.type).toUpperCase();
    switch(type){
      case 'ALL': return list(c.conditions).every(x=>this.evaluate(x,state,ctx));
      case 'ANY': return list(c.conditions).some(x=>this.evaluate(x,state,ctx));
      case 'NOT': return !this.evaluate(c.condition,state,ctx);
      case 'FLAG': return !!state.flags?.[c.key||c.target];
      case 'FLAG_EQUALS': return state.flags?.[c.key||c.target]===c.value;
      case 'LOCATION_IS': return state.currentLocationId===c.locationId;
      case 'SCENE_IS': return state.currentSceneId===c.sceneId;
      case 'CLUE_DISCOVERED': return state.discoveredClueIds.includes(c.clueId||c.target);
      case 'SECRET_REVEALED': return state.revealedSecretIds.includes(c.secretId||c.target);
      case 'RUMOR_KNOWN': return state.knownRumorIds.includes(c.rumorId||c.target);
      case 'OBJECTIVE_COMPLETED': return state.completedObjectiveIds.includes(c.objectiveId||c.target);
      case 'OBJECTIVE_FAILED': return state.failedObjectiveIds.includes(c.objectiveId||c.target);
      case 'OBJECTIVE_STATUS': return statusOfObjective(state,c.objectiveId||c.target)===norm(c.status).toUpperCase();
      case 'NPC_DEAD': return state.deadNpcIds.includes(c.npcId||c.target);
      case 'NPC_MISSING': return state.missingNpcIds.includes(c.npcId||c.target);
      case 'NPC_ENCOUNTERED': return state.encounteredNpcIds.includes(c.npcId||c.target);
      case 'EVENT_TRIGGERED': return state.triggeredEventIds.includes(c.eventId||c.target);
      case 'ENCOUNTER_RESOLVED': return state.resolvedEncounterIds.includes(c.encounterId||c.target);
      case 'CLOCK_GTE': return Number(state.activeClockStates?.[c.clockId||c.target]?.current||0)>=Number(c.value||0);
      case 'CLOCK_LTE': return Number(state.activeClockStates?.[c.clockId||c.target]?.current||0)<=Number(c.value||0);
      case 'CONTEXT_EQUALS': return ctx?.[c.key]===c.value;
      default:
        if(this.externalEvaluator)return !!this.externalEvaluator(c,state,ctx);
        return false;
    }
  }

  all(conditions,state,ctx={}){return list(conditions).every(c=>this.evaluate(c,state,ctx))}
}

export class AdventureClockManager {
  constructor(module){this.module=module;this.clocks=idMap(module.clocks)}
  initialize(state){
    for(const clock of list(this.module.clocks)){
      if(!state.activeClockStates[clock.id]){
        state.activeClockStates[clock.id]={current:Number(clock.current||0),max:Number(clock.max||1),thresholdsTriggered:[],updatedAt:nowIso()};
      }
    }
    return state;
  }
  change(state,clockId,delta){
    const def=this.clocks.get(clockId);
    if(!def)throw new AdventureError('CLOCK_NOT_FOUND','Unknown clock '+clockId);
    const row=state.activeClockStates[clockId]||{current:0,max:Number(def.max||1),thresholdsTriggered:[],updatedAt:nowIso()};
    const before=Number(row.current||0),max=Number(row.max||def.max||1);
    row.current=Math.max(0,Math.min(max,before+Number(delta||0))); row.updatedAt=nowIso();
    const crossed=list(def.thresholds).map(Number).filter(t=>before<t&&row.current>=t&&!row.thresholdsTriggered.includes(t));
    row.thresholdsTriggered=[...new Set([...row.thresholdsTriggered,...crossed])];
    state.activeClockStates[clockId]=row;
    return crossed;
  }
}

export class AdventureConsequenceEngine {
  constructor({conditionEngine=new AdventureConditionEngine(),worldAdapter=null}={}){
    this.conditionEngine=conditionEngine;this.worldAdapter=worldAdapter;
  }

  apply(state,consequence,{module,sourceId=null,idempotencyKey=null,context={}}={}){
    const c=obj(consequence),type=norm(c.type).toUpperCase();
    if(!type)throw new AdventureError('CONSEQUENCE_TYPE_REQUIRED','Consequence type is required');
    const key=norm(idempotencyKey||c.idempotencyKey||[sourceId,type,c.target??'',JSON.stringify(c.value??null)].join('|'));
    state.appliedConsequenceKeys=Array.isArray(state.appliedConsequenceKeys)?state.appliedConsequenceKeys:[];
    if(key&&state.appliedConsequenceKeys.includes(key))return {state,applied:false,idempotent:true,events:[]};
    if(c.conditions&&!this.conditionEngine.all(c.conditions,state,context))return {state,applied:false,blocked:true,events:[]};

    const events=[];
    const target=norm(c.target||c.id);
    switch(type){
      case ConsequenceType.SET_FLAG: state.flags[target]=c.value; break;
      case ConsequenceType.ADVANCE_CLOCK:
      case ConsequenceType.REGRESS_CLOCK: {
        const clocks=new AdventureClockManager(module);
        const delta=Math.abs(Number(c.value||1))*(type===ConsequenceType.REGRESS_CLOCK?-1:1);
        const crossed=clocks.change(state,target,delta);
        crossed.forEach(threshold=>events.push({type:TriggerType.ON_CLOCK_THRESHOLD,clockId:target,threshold}));
        break;
      }
      case ConsequenceType.MOVE_NPC:
        state.npcLocations[target]=norm(c.value||c.locationId)||null; break;
      case ConsequenceType.REMOVE_NPC:
        state.removedNpcIds=[...new Set([...state.removedNpcIds,target])]; break;
      case ConsequenceType.KILL_NPC:
        state.deadNpcIds=[...new Set([...state.deadNpcIds,target])];
        state.missingNpcIds=state.missingNpcIds.filter(id=>id!==target);
        events.push({type:TriggerType.ON_NPC_DEATH,npcId:target}); break;
      case ConsequenceType.MISSING_NPC:
        if(!state.deadNpcIds.includes(target))state.missingNpcIds=[...new Set([...state.missingNpcIds,target])]; break;
      case ConsequenceType.CHANGE_RELATIONSHIP:
        state.relationshipStates[target]={...(state.relationshipStates[target]||{}),...(typeof c.value==='object'?c.value:{value:c.value}),updatedAt:nowIso()}; break;
      case ConsequenceType.ADD_CLUE:
        if(!state.discoveredClueIds.includes(target)){
          state.discoveredClueIds.push(target); events.push({type:TriggerType.ON_CLUE_DISCOVERED,clueId:target});
        } break;
      case ConsequenceType.REVEAL_SECRET:
        if(!state.revealedSecretIds.includes(target))state.revealedSecretIds.push(target); break;
      case ConsequenceType.ADD_RUMOR:
        if(!state.knownRumorIds.includes(target))state.knownRumorIds.push(target); break;
      case ConsequenceType.COMPLETE_OBJECTIVE:
        if(!state.completedObjectiveIds.includes(target))state.completedObjectiveIds.push(target);
        state.failedObjectiveIds=state.failedObjectiveIds.filter(id=>id!==target);
        events.push({type:TriggerType.ON_OBJECTIVE_COMPLETED,objectiveId:target}); break;
      case ConsequenceType.FAIL_OBJECTIVE:
        if(!state.failedObjectiveIds.includes(target))state.failedObjectiveIds.push(target);
        state.completedObjectiveIds=state.completedObjectiveIds.filter(id=>id!==target);
        events.push({type:TriggerType.ON_OBJECTIVE_FAILED,objectiveId:target}); break;
      case ConsequenceType.ADD_ITEM:
        state.inventoryChanges[target]=Number(state.inventoryChanges[target]||0)+Number(c.value??1);
        events.push({type:TriggerType.ON_ITEM_FOUND,itemId:target}); break;
      case ConsequenceType.REMOVE_ITEM:
        state.inventoryChanges[target]=Number(state.inventoryChanges[target]||0)-Number(c.value??1); break;
      case ConsequenceType.CHANGE_LOCATION:
        state.currentLocationId=target||norm(c.value); break;
      case ConsequenceType.CHANGE_SCENE:
        state.currentSceneId=target||norm(c.value); break;
      case ConsequenceType.CHANGE_FACTION_STATE:
        state.factionStates[target]={...(state.factionStates[target]||{}),...(typeof c.value==='object'?c.value:{value:c.value}),updatedAt:nowIso()}; break;
      case ConsequenceType.TRIGGER_EVENT:
        if(!state.triggeredEventIds.includes(target))state.triggeredEventIds.push(target); break;
      case ConsequenceType.RESOLVE_ENCOUNTER:
        if(!state.resolvedEncounterIds.includes(target))state.resolvedEncounterIds.push(target); break;
      case ConsequenceType.UPDATE_WORLD_STATE:
        state.worldChanges[target||'world']={...(state.worldChanges[target||'world']||{}),...(typeof c.value==='object'?c.value:{value:c.value}),updatedAt:nowIso()};
        if(this.worldAdapter?.applyAdventureWorldChange)this.worldAdapter.applyAdventureWorldChange({target,value:c.value,reason:c.reason,sourceId}); break;
      case ConsequenceType.APPEND_HISTORY:
        state.history.push({...obj(c.value),timestamp:c.timestamp||nowIso(),sourceId:sourceId||c.sourceId||null}); break;
      default: throw new AdventureError('UNKNOWN_CONSEQUENCE','Unsupported consequence '+type,c);
    }
    if(key)state.appliedConsequenceKeys.push(key);
    state.updatedAt=nowIso();
    return {state,applied:true,idempotent:false,events};
  }
}

export class AdventureTriggerEngine {
  constructor({conditionEngine=new AdventureConditionEngine(),rng=null}={}){
    this.conditionEngine=conditionEngine;this.rng=rng||{random:()=>Math.random()};
  }
  matches(trigger,event,state,context={}){
    if(norm(trigger?.type).toUpperCase()!==norm(event?.type).toUpperCase())return false;
    if(trigger.target && !Object.values(event).includes(trigger.target))return false;
    if(!this.conditionEngine.all(trigger.prerequisites||trigger.conditions,state,{...context,event}))return false;
    if(trigger.locationRestrictions?.length && !trigger.locationRestrictions.includes(state.currentLocationId))return false;
    if(Number.isFinite(Number(trigger.probability))){
      const p=Math.max(0,Math.min(1,Number(trigger.probability)));
      if(this.rng.random()>=p)return false;
    }
    return true;
  }
  matching(module,event,state,context={}){
    return list(module.events).filter(ev=>{
      const trig=ev.trigger||{};
      return this.matches(typeof trig==='string'?{type:trig}:trig,event,state,context) &&
        this.conditionEngine.all(ev.prerequisites,state,{...context,event});
    });
  }
}

export function createAdventureState(module,{campaignId=null,startMode=null,locationId=null,sceneId=null,flags={},worldSnapshot=null}={}){
  const start=module.startDefinition||{};
  const state={
    stateVersion:ADVENTURE_STATE_VERSION,
    schemaVersion:Number(module.schemaVersion||ADVENTURE_SCHEMA_VERSION),
    contentVersion:Number(module.contentVersion||module.version||1),
    adventureId:module.id,
    campaignId:campaignId||null,
    status:AdventureStatus.ACTIVE,
    startMode:startMode||module.campaignType||StartMode.OFFICIAL_ADVENTURE,
    currentLocationId:locationId||start.startingLocation||module.startingLocation||null,
    currentSceneId:sceneId||start.startingSceneId||null,
    visitedLocations:[],
    encounteredNpcIds:[], deadNpcIds:[], missingNpcIds:[], removedNpcIds:[],
    discoveredClueIds:[], revealedSecretIds:[], knownRumorIds:[],
    completedObjectiveIds:[], failedObjectiveIds:[],
    triggeredEventIds:[], resolvedEncounterIds:[],
    activeClockStates:{}, flags:{...obj(start.initialFlags),...obj(flags)},
    relationshipStates:{}, inventoryChanges:{}, worldChanges:{}, factionStates:{}, npcLocations:{},
    campaignConsequences:[], history:[], appliedConsequenceKeys:[],
    createdAt:nowIso(), updatedAt:nowIso(), lastEventAt:null,
    startSnapshot:{world:worldSnapshot?deepClone(worldSnapshot):null}
  };
  if(state.currentLocationId)state.visitedLocations.push(state.currentLocationId);
  new AdventureClockManager(module).initialize(state);
  for(const id of list(start.initialObjectives)) state.flags['objective_active:'+id]=true;
  return state;
}

export class AdventureAiContextBuilder {
  constructor({historyLimit=12}={}){this.historyLimit=historyLimit}
  build(module,state,{worldState=null,mechanicalResults=null,narrativeProfile=null,presentNpcIds=null}={}){
    const scenes=idMap(module.scenes),locations=idMap(module.locations),npcs=idMap(module.npcs),objectives=idMap([...list(module.objectives),...list(module.quests)]);
    const scene=scenes.get(state.currentSceneId)||null,location=locations.get(state.currentLocationId)||null;
    const presentIds=presentNpcIds||list(scene?.participants).filter(id=>!state.deadNpcIds.includes(id)&&!state.removedNpcIds.includes(id));
    const present=presentIds.map(id=>npcs.get(id)).filter(Boolean).map(n=>({
      id:n.id,name:n.name,role:n.role||null,factionId:n.factionId||null,personality:n.personality||null,
      motivation:n.motivation||null,goals:n.goals||[],fears:n.fears||[],publicKnowledge:n.publicKnowledge||null,
      dialogueGuidance:n.dialogueGuidance||null,relationship:state.relationshipStates[n.id]||null
    }));
    const activeObjectives=[...objectives.values()].filter(o=>statusOfObjective(state,o.id)==='ACTIVE' && (!o.prerequisites?.length || o.prerequisites.every(p=>state.flags[p]||state.completedObjectiveIds.includes(p))));
    const knownClues=list(module.clues).filter(c=>state.discoveredClueIds.includes(c.id)).map(c=>({id:c.id,title:c.title,information:c.information}));
    const knownRumors=list(module.rumors).filter(r=>state.knownRumorIds.includes(r.id)).map(r=>({id:r.id,content:r.content,truth:'RUMOR_UNVERIFIED'}));
    const unrevealedSecrets=list(module.secrets).filter(s=>!state.revealedSecretIds.includes(s.id)).map(s=>({id:s.id,information:s.information,visibility:'GM_ONLY',revealConditions:s.revealConditions||[]}));
    const availableEvents=list(module.events).filter(e=>!state.triggeredEventIds.includes(e.id)||e.repeatPolicy==='REPEATABLE').map(e=>({id:e.id,content:e.content||null,trigger:e.trigger||null})).slice(0,12);
    return {
      adventure:{id:module.id,title:module.title,status:state.status,contentVersion:state.contentVersion},
      currentScene:scene?{id:scene.id,purpose:scene.purpose,knownFacts:scene.knownFacts||[],availableClues:scene.availableClues||[],exits:scene.exits||[]}:null,
      currentLocation:location?{id:location.id,name:location.name,type:location.type,descriptionPublic:location.descriptionPublic,arrivalDescription:location.arrivalDescription,exits:location.exits||[]}:state.currentLocationId?{id:state.currentLocationId}:null,
      objectives:activeObjectives.map(o=>({id:o.id,title:o.title,description:o.description,type:o.type||'PRIMARY'})),
      clocks:deepClone(state.activeClockStates),
      presentNpcs:present,
      playerKnowledge:{clues:knownClues,rumors:knownRumors,revealedSecretIds:[...state.revealedSecretIds]},
      gmKnowledge:{unrevealedSecrets,availableEvents},
      worldState:worldState?deepClone(worldState):null,
      rulesContext:mechanicalResults?deepClone(mechanicalResults):null,
      narrativeProfile:narrativeProfile||null,
      recentHistory:state.history.slice(-this.historyLimit).map(h=>({timestamp:h.timestamp,turn:h.turn,sceneId:h.sceneId,locationId:h.locationId,playerAction:h.playerAction,ruleResult:h.ruleResult,consequences:h.consequences,summary:h.summary})),
      contract:{
        aiMay:['narrate','interpret_npcs','improvise','propose_actions','propose_consequences'],
        aiMustNot:['mutate_adventure_state','invent_rules','reveal_sealed_secret','complete_objective_without_engine','move_npc_permanently_without_valid_consequence','alter_canonical_map','choose_for_player','force_scene_order']
      }
    };
  }
  toPromptFragment(context){return 'ADVENTURE_ENGINE_CONTEXT\n'+JSON.stringify(context)}
}

export class AdventureRuntime {
  constructor(module,{state=null,persistence=null,validator=new AdventureValidator(),conditionEngine=null,triggerEngine=null,consequenceEngine=null,worldAdapter=null,mapAdapter=null,rulesAdapter=null,rng=null}={}){
    validator.assertModule(module);
    this.module=deepClone(module);
    this.persistence=persistence||new AdventurePersistence();
    this.conditionEngine=conditionEngine||new AdventureConditionEngine();
    this.rng=rng||{random:()=>Math.random(),int:max=>Math.floor(Math.random()*max)};
    this.triggerEngine=triggerEngine||new AdventureTriggerEngine({conditionEngine:this.conditionEngine,rng:this.rng});
    this.consequenceEngine=consequenceEngine||new AdventureConsequenceEngine({conditionEngine:this.conditionEngine,worldAdapter});
    this.worldAdapter=worldAdapter;this.mapAdapter=mapAdapter;this.rulesAdapter=rulesAdapter;
    this.contextBuilder=new AdventureAiContextBuilder();
    this.state=state?deepClone(state):null;
  }

  persist(){if(this.state)this.persistence.save(this.state);return this.state}
  load(){const s=this.persistence.load();if(s&&s.adventureId===this.module.id)this.state=s;return this.state}

  async resolveStart({mode=null,campaignId=null,locationId=null,sceneId=null,flags={},worldSnapshot=null}={}){
    const start=this.module.startDefinition||{};
    const resolvedMode=mode||this.module.campaignType||StartMode.OFFICIAL_ADVENTURE;
    let resolvedLocation=locationId||null,resolvedScene=sceneId||null;
    if(!resolvedLocation){
      if([StartMode.OFFICIAL_ADVENTURE,StartMode.GUIDED_CAMPAIGN].includes(resolvedMode)){
        resolvedLocation=start.startingLocation||this.module.startingLocation||null;
      }else if(resolvedMode===StartMode.SANDBOX && this.mapAdapter?.choosePlayerStart){
        resolvedLocation=await this.mapAdapter.choosePlayerStart();
      }else if(resolvedMode===StartMode.TAVERN_START && this.mapAdapter?.randomValidStart){
        resolvedLocation=await this.mapAdapter.randomValidStart({type:'tavern'});
      }else if(resolvedMode===StartMode.SOLO && this.worldAdapter?.resolveSoloStart){
        const out=await this.worldAdapter.resolveSoloStart({module:this.module});resolvedLocation=out?.locationId||null;resolvedScene=out?.sceneId||null;
      }
    }
    if(!resolvedScene)resolvedScene=start.startingSceneId||null;
    return {mode:resolvedMode,campaignId,locationId:resolvedLocation,sceneId:resolvedScene,flags,worldSnapshot};
  }

  async start(options={}){
    const resolved=await this.resolveStart(options);
    this.state=createAdventureState(this.module,resolved);
    const start=this.module.startDefinition||{};
    const initialConsequences=[
      ...list(start.initialConsequences),
      ...list(start.initialNpcIds).map(id=>({type:'SET_FLAG',target:'npc_present:'+id,value:true}))
    ];
    this.applyConsequences(initialConsequences,{sourceId:'adventure:start',idempotencyPrefix:'start'});
    this.recordHistory({playerAction:'ADVENTURE_START',summary:'Adventure started',consequences:initialConsequences});
    await this.processEvent({type:TriggerType.ON_ENTER_LOCATION,locationId:this.state.currentLocationId},{source:'start'});
    return this.persist();
  }

  pause(){this.requireState();this.state.status=AdventureStatus.PAUSED;this.state.updatedAt=nowIso();return this.persist()}
  resume(){this.requireState();this.state.status=AdventureStatus.ACTIVE;this.state.updatedAt=nowIso();return this.persist()}
  requireState(){if(!this.state)throw new AdventureError('NO_STATE','Adventure has not been started or loaded');return this.state}

  applyConsequences(consequences,{sourceId=null,idempotencyPrefix=null,context={}}={}){
    this.requireState();const applied=[],events=[];
    list(consequences).forEach((c,index)=>{
      const key=(idempotencyPrefix||sourceId||'consequence')+':'+index+':'+norm(c?.idempotencyKey||'');
      const out=this.consequenceEngine.apply(this.state,c,{module:this.module,sourceId,idempotencyKey:key,context});
      if(out.applied){applied.push(deepClone(c));events.push(...out.events);this.state.campaignConsequences.push({type:c.type,target:c.target??null,value:deepClone(c.value),reason:c.reason||null,sourceId,timestamp:nowIso()})}
    });
    this.persist();
    return {applied,events};
  }

  async processEvent(event,context={}){
    this.requireState();this.state.lastEventAt=nowIso();
    const matched=this.triggerEngine.matching(this.module,event,this.state,context);
    const results=[];
    for(const ev of matched){
      const once=ev.repeatPolicy!=='REPEATABLE';
      if(once&&this.state.triggeredEventIds.includes(ev.id))continue;
      if(once)this.state.triggeredEventIds.push(ev.id);
      const out=this.applyConsequences(ev.consequences,{sourceId:'event:'+ev.id,idempotencyPrefix:'event:'+ev.id,context:{...context,event}});
      results.push({eventId:ev.id,ruleActions:deepClone(ev.ruleActions||[]),...out});
      for(const chained of out.events)await this.processEvent(chained,{...context,parentEventId:ev.id});
    }
    this.persist();return results;
  }

  async enterLocation(locationId,{sceneId=null,reason='travel'}={}){
    this.requireState();const before=this.state.currentLocationId;
    if(before&&before!==locationId)await this.processEvent({type:TriggerType.ON_LEAVE_LOCATION,locationId:before},{reason});
    this.state.currentLocationId=locationId;
    if(sceneId!==undefined)this.state.currentSceneId=sceneId;
    if(locationId&&!this.state.visitedLocations.includes(locationId))this.state.visitedLocations.push(locationId);
    this.persist();
    return this.processEvent({type:TriggerType.ON_ENTER_LOCATION,locationId},{reason});
  }

  async meetNpc(npcId,context={}){
    this.requireState();if(this.state.deadNpcIds.includes(npcId))throw new AdventureError('NPC_DEAD','Cannot meet dead NPC '+npcId);
    if(!this.state.encounteredNpcIds.includes(npcId))this.state.encounteredNpcIds.push(npcId);
    this.persist();return this.processEvent({type:TriggerType.ON_NPC_MET,npcId},context);
  }

  async discoverClue(clueId,{method=null,context={}}={}){
    this.requireState();const clue=idMap(this.module.clues).get(clueId);
    if(!clue)throw new AdventureError('CLUE_NOT_FOUND','Unknown clue '+clueId);
    if(this.state.discoveredClueIds.includes(clueId)&&!clue.repeatable)return {discovered:false,repeat:true};
    if(!this.conditionEngine.all(clue.prerequisites,this.state,{...context,method}))return {discovered:false,blocked:true};
    if(!this.state.discoveredClueIds.includes(clueId))this.state.discoveredClueIds.push(clueId);
    for(const id of list(clue.unlocks))this.state.flags['unlocked:'+id]=true;
    this.persist();await this.processEvent({type:TriggerType.ON_CLUE_DISCOVERED,clueId},{method,...context});
    return {discovered:true,clue:deepClone(clue)};
  }

  revealSecret(secretId,{context={}}={}){
    this.requireState();const secret=idMap(this.module.secrets).get(secretId);
    if(!secret)throw new AdventureError('SECRET_NOT_FOUND','Unknown secret '+secretId);
    if(!this.conditionEngine.all(secret.prerequisites,this.state,context) || !this.conditionEngine.all(secret.revealConditions,this.state,context))return {revealed:false,blocked:true};
    if(!this.state.revealedSecretIds.includes(secretId))this.state.revealedSecretIds.push(secretId);
    this.persist();return {revealed:true,secret:deepClone(secret)};
  }

  async completeObjective(id,context={}){const out=this.applyConsequences([{type:'COMPLETE_OBJECTIVE',target:id}],{sourceId:'objective:'+id,idempotencyPrefix:'objective-complete:'+id,context});for(const e of out.events)await this.processEvent(e,context);return out}
  async failObjective(id,context={}){const out=this.applyConsequences([{type:'FAIL_OBJECTIVE',target:id}],{sourceId:'objective:'+id,idempotencyPrefix:'objective-fail:'+id,context});for(const e of out.events)await this.processEvent(e,context);return out}
  advanceClock(id,amount=1,context={}){const out=this.applyConsequences([{type:'ADVANCE_CLOCK',target:id,value:amount}],{sourceId:'clock:'+id,idempotencyPrefix:'clock:'+id+':'+nowIso(),context});return out}

  rollTable(tableId,{context={}}={}){
    this.requireState();const table=idMap(this.module.randomTables).get(tableId);
    if(!table)throw new AdventureError('TABLE_NOT_FOUND','Unknown random table '+tableId);
    const entries=list(table.entries).filter(e=>this.conditionEngine.all(e.conditions,this.state,context));
    if(!entries.length)throw new AdventureError('TABLE_EMPTY','No eligible entries in '+tableId);
    const weights=entries.map(e=>Math.max(0,Number(e.weight??1))),total=weights.reduce((a,b)=>a+b,0);
    let pick=(this.rng.random?.()??Math.random())*total;
    let chosen=entries[entries.length-1];
    for(let i=0;i<entries.length;i++){pick-=weights[i];if(pick<0){chosen=entries[i];break}}
    return deepClone(chosen);
  }

  recordHistory({turn=null,playerAction=null,ruleResult=null,consequences=[],revealedInformation=[],summary=null}={}){
    this.requireState();this.state.history.push({
      timestamp:nowIso(),turn,sceneId:this.state.currentSceneId,locationId:this.state.currentLocationId,
      playerAction,ruleResult:deepClone(ruleResult),consequences:deepClone(consequences),revealedInformation:deepClone(revealedInformation),summary
    });
    this.state.history=this.state.history.slice(-250);this.persist();return this.state.history.at(-1);
  }

  buildAiContext(options={}){this.requireState();return this.contextBuilder.build(this.module,this.state,options)}
  buildAiPromptFragment(options={}){return this.contextBuilder.toPromptFragment(this.buildAiContext(options))}

  validateAiIntent(intent){
    this.requireState();const i=obj(intent),accepted=[],rejected=[];
    for(const c of list(i.proposedConsequences)){
      const type=norm(c?.type).toUpperCase();
      if(!Object.values(ConsequenceType).includes(type)){rejected.push({consequence:c,reason:'UNKNOWN_TYPE'});continue}
      if(type===ConsequenceType.REVEAL_SECRET){
        const secret=idMap(this.module.secrets).get(norm(c.target));
        if(!secret || !this.conditionEngine.all(secret.revealConditions,this.state,{source:'ai'})){rejected.push({consequence:c,reason:'SECRET_SEALED'});continue}
      }
      if([ConsequenceType.COMPLETE_OBJECTIVE,ConsequenceType.FAIL_OBJECTIVE].includes(type)){
        const objective=idMap([...list(this.module.objectives),...list(this.module.quests)]).get(norm(c.target));
        if(!objective){rejected.push({consequence:c,reason:'OBJECTIVE_UNKNOWN'});continue}
        const conditions=type===ConsequenceType.COMPLETE_OBJECTIVE?objective.successConditions:objective.failureConditions;
        if(list(conditions).length&&!this.conditionEngine.all(conditions,this.state,{source:'ai'})){rejected.push({consequence:c,reason:'OBJECTIVE_CONDITION_NOT_MET'});continue}
      }
      if(type===ConsequenceType.KILL_NPC){rejected.push({consequence:c,reason:'RULES_ENGINE_REQUIRED'});continue}
      accepted.push(c);
    }
    return {narration:norm(i.narration),proposedActions:list(i.proposedActions),accepted,rejected,npcIntentions:list(i.npcIntentions),possibleTriggers:list(i.possibleTriggers)};
  }

  acceptAiIntent(intent,{sourceId='ai:intent',context={}}={}){
    const checked=this.validateAiIntent(intent);
    const out=this.applyConsequences(checked.accepted,{sourceId,idempotencyPrefix:sourceId,context});
    return {...checked,applied:out.applied,events:out.events};
  }

  evaluateCompletion(context={}){
    this.requireState();
    const complete=list(this.module.completionConditions);
    const fail=list(this.module.failureConditions);
    if(fail.length&&this.conditionEngine.all(fail,this.state,context))this.state.status=AdventureStatus.FAILED;
    else if(complete.length&&this.conditionEngine.all(complete,this.state,context))this.state.status=AdventureStatus.COMPLETED;
    this.persist();return this.state.status;
  }

  snapshot(){return deepClone(this.requireState())}
}

export class AdventureEngine {
  constructor({registry=new AdventureRegistry(),persistenceFactory=null,validator=null,worldAdapter=null,mapAdapter=null,rulesAdapter=null,rng=null}={}){
    this.registry=registry;this.persistenceFactory=persistenceFactory;this.validator=validator||registry.validator;
    this.worldAdapter=worldAdapter;this.mapAdapter=mapAdapter;this.rulesAdapter=rulesAdapter;this.rng=rng;this.runtime=null;
  }
  runtimeFor(adventureId,{state=null,persistence=null}={}){
    const module=this.registry.get(adventureId);
    if(!module)throw new AdventureError('ADVENTURE_NOT_FOUND','Unknown adventure '+adventureId);
    const store=persistence||this.persistenceFactory?.(adventureId)||new AdventurePersistence();
    return new AdventureRuntime(module,{state,persistence:store,validator:this.validator,worldAdapter:this.worldAdapter,mapAdapter:this.mapAdapter,rulesAdapter:this.rulesAdapter,rng:this.rng});
  }
  async start(adventureId,options={}){this.runtime=this.runtimeFor(adventureId);await this.runtime.start(options);return this.runtime.snapshot()}
  load(adventureId){this.runtime=this.runtimeFor(adventureId);this.runtime.load();return this.runtime.state?this.runtime.snapshot():null}
  active(){return this.runtime}
}

export function migrateAdventureState(raw,module){
  if(!raw)return null;
  const state=deepClone(raw);
  state.stateVersion=Number(state.stateVersion||1);
  state.schemaVersion=Number(state.schemaVersion||module?.schemaVersion||1);
  state.contentVersion=Number(state.contentVersion||module?.contentVersion||module?.version||1);
  for(const key of ['visitedLocations','encounteredNpcIds','deadNpcIds','missingNpcIds','removedNpcIds','discoveredClueIds','revealedSecretIds','knownRumorIds','completedObjectiveIds','failedObjectiveIds','triggeredEventIds','resolvedEncounterIds','campaignConsequences','history','appliedConsequenceKeys'])state[key]=list(state[key]);
  for(const key of ['activeClockStates','flags','relationshipStates','inventoryChanges','worldChanges','factionStates','npcLocations'])state[key]=obj(state[key]);
  state.updatedAt=nowIso();
  return state;
}
