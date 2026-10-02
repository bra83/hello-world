import * as Core from './adventure_engine.js';

export {
  ADVENTURE_SCHEMA_VERSION,ADVENTURE_STATE_VERSION,AdventureStatus,StartMode,TriggerType,ConsequenceType,
  AdventureError,AdventureValidator,AdventureRegistry,AdventurePersistence,AdventureConditionEngine,
  AdventureClockManager,AdventureConsequenceEngine,AdventureTriggerEngine,AdventureAiContextBuilder,
  createAdventureState,migrateAdventureState
} from './adventure_engine.js';

const list=value=>Array.isArray(value)?value:[];
const clone=value=>value==null?value:JSON.parse(JSON.stringify(value));
const norm=value=>String(value??'').trim();

export class AdventureRuntime extends Core.AdventureRuntime {
  matchingEvents(event,context={}){
    return this.triggerEngine.matching(this.module,event,this.state,context).filter(ev=>{
      if(list(ev.locationRestrictions).length&&!ev.locationRestrictions.includes(this.state.currentLocationId))return false;
      if(list(ev.timeRestrictions).length){
        const clock=context.worldClock||context.clock||{};
        const hour=Number(clock.hour??context.hour);
        const ok=ev.timeRestrictions.some(rule=>{
          if(typeof rule==='number')return hour===rule;
          if(!rule||typeof rule!=='object')return true;
          const from=Number(rule.fromHour??0),to=Number(rule.toHour??24);
          return Number.isFinite(hour)&&hour>=from&&hour<to;
        });
        if(!ok)return false;
      }
      return true;
    });
  }

  async processEvent(event,context={}){
    this.requireState();this.state.lastEventAt=new Date().toISOString();
    const matched=this.matchingEvents(event,context),results=[];
    for(const ev of matched){
      const policy=norm(ev.repeatPolicy||'ONCE').toUpperCase();
      const already=this.state.triggeredEventIds.includes(ev.id);
      if(policy==='ONCE'&&already)continue;
      if(policy==='UNTIL_SUCCESS'&&already)continue;

      const ruleResults=await this.resolveRuleActions(ev.ruleActions,{event:ev,context:{...context,event}});
      const requiredBlocked=ruleResults.some((r,index)=>list(ev.ruleActions)[index]?.required!==false&&(r?.ok!==true||r?.resolved===false||r?.blocked));
      if(requiredBlocked){
        results.push({eventId:ev.id,repeatPolicy:policy,ruleActions:clone(ev.ruleActions||[]),ruleResults,blockedByRules:true,applied:[],events:[]});
        this.persist();continue;
      }

      const key=policy==='REPEATABLE'?this.nextOperationKey('event:'+ev.id):'event:'+ev.id;
      const out=this.applyConsequences(ev.consequences,{sourceId:'event:'+ev.id,idempotencyPrefix:key,context:{...context,event,ruleResults}});
      if((policy==='ONCE'||policy==='UNTIL_SUCCESS')&&!this.state.triggeredEventIds.includes(ev.id))this.state.triggeredEventIds.push(ev.id);
      results.push({eventId:ev.id,repeatPolicy:policy,ruleActions:clone(ev.ruleActions||[]),ruleResults,blockedByRules:false,...out});
      for(const chained of out.events)await this.processEvent(chained,{...context,parentEventId:ev.id});
    }
    this.persist();return results;
  }

  objective(id){
    return [...list(this.module.objectives),...list(this.module.quests)].find(row=>row.id===id)||null;
  }

  async completeObjective(id,context={}){
    const objective=this.objective(id);
    if(!objective)throw new Core.AdventureError('OBJECTIVE_NOT_FOUND','Unknown objective '+id);
    if(list(objective.successConditions).length&&!this.conditionEngine.all(objective.successConditions,this.state,context)){
      return {applied:[],events:[],blocked:true,reason:'SUCCESS_CONDITIONS_NOT_MET'};
    }
    const primary=this.applyConsequences([{type:'COMPLETE_OBJECTIVE',target:id}],{sourceId:'objective:'+id,idempotencyPrefix:'objective-complete:'+id,context});
    const follow=this.applyConsequences(objective.consequencesSuccess,{sourceId:'objective:'+id+':success',idempotencyPrefix:'objective-success:'+id,context});
    const events=[...primary.events,...follow.events];
    for(const e of events)await this.processEvent(e,context);
    this.evaluateCompletion(context);
    return {applied:[...primary.applied,...follow.applied],events,blocked:false};
  }

  async failObjective(id,context={}){
    const objective=this.objective(id);
    if(!objective)throw new Core.AdventureError('OBJECTIVE_NOT_FOUND','Unknown objective '+id);
    if(list(objective.failureConditions).length&&!this.conditionEngine.all(objective.failureConditions,this.state,context)){
      return {applied:[],events:[],blocked:true,reason:'FAILURE_CONDITIONS_NOT_MET'};
    }
    const primary=this.applyConsequences([{type:'FAIL_OBJECTIVE',target:id}],{sourceId:'objective:'+id,idempotencyPrefix:'objective-fail:'+id,context});
    const follow=this.applyConsequences(objective.consequencesFailure,{sourceId:'objective:'+id+':failure',idempotencyPrefix:'objective-failure:'+id,context});
    const events=[...primary.events,...follow.events];
    for(const e of events)await this.processEvent(e,context);
    this.evaluateCompletion(context);
    return {applied:[...primary.applied,...follow.applied],events,blocked:false};
  }
}

export class AdventureEngine extends Core.AdventureEngine {
  runtimeFor(adventureId,{state=null,persistence=null}={}){
    const module=this.registry.get(adventureId);
    if(!module)throw new Core.AdventureError('ADVENTURE_NOT_FOUND','Unknown adventure '+adventureId);
    const store=persistence||this.persistenceFactory?.(adventureId)||new Core.AdventurePersistence();
    return new AdventureRuntime(module,{state,persistence:store,validator:this.validator,worldAdapter:this.worldAdapter,mapAdapter:this.mapAdapter,rulesAdapter:this.rulesAdapter,rng:this.rng});
  }
}