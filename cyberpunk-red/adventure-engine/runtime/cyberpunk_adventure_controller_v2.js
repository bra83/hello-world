import {CyberpunkAdventureController as BaseController} from './cyberpunk_adventure_controller.js';
import {AdventureEngine,AdventureRuntime,AdventureRegistry,AdventureValidator,StartMode,migrateAdventureState} from './adventure_engine_v2.js';
import {CYBERPUNK_RULE_ACTIONS} from './cyberpunk_host_adapters.js';
import {createTheJacketCampaignPort} from './cemk_the_jacket_campaign_port.js';

export class CyberpunkAdventureController extends BaseController {
  constructor(options={}){
    super(options);
    this.registry=new AdventureRegistry({validator:new AdventureValidator({knownRuleActions:CYBERPUNK_RULE_ACTIONS})});
    this.theJacket=createTheJacketCampaignPort({
      getCharacter:()=>this.character(),saveCharacter:c=>this.saveCharacter?.(c),
      rulesAdapter:this.rulesAdapter,wallet:options.wallet||options.bridge?.wallet||null,
      accountId:options.walletAccountId||null,
      verifyRewardEligibility:options.verifyTheJacketRewardEligibility||null,
      verifyWorldTimeAdvance:options.verifyTheJacketWorldTimeAdvance||null
    });
  }

  // Production narrator receives public/discovered state only, never sealed GM payload.
  buildContextObject(c=this.character(),options={}){
    const ctx=super.buildContextObject(c,options);
    if(!ctx)return ctx;
    const safe=JSON.parse(JSON.stringify(ctx));
    delete safe.gmKnowledge;
    const jacket=this.theJacket?.aiContext();
    if(jacket)safe.theJacket=jacket;
    return safe;
  }

  // Explicit player/Rules Engine entry points. Narrator output never invokes these.
  theJacketSnapshot(){return this.theJacket.snapshot()}
  theJacketTransition(next,opts={}){return this.theJacket.transition(next,opts)}
  theJacketAdvanceDowntime(days,opts={}){return this.theJacket.advanceDowntime(days,opts)}
  theJacketResolveRule(contractId,opts={}){return this.theJacket.resolveRule(contractId,opts)}
  theJacketResolveDowntime(opts={}){return this.theJacket.resolveDowntime(opts)}
  theJacketResolveEconomy(request,opts={}){return this.theJacket.resolveEconomy(request,opts)}

  runtime(c=this.character()){
    const raw=this.persistedState(c);if(!raw?.adventureId||!this.registry.has(raw.adventureId))return null;
    const module=this.registry.get(raw.adventureId),state=migrateAdventureState(raw,module);
    return new AdventureRuntime(module,{state,persistence:this.persistence(c),mapAdapter:this.mapAdapter(c),worldAdapter:this.worldAdapter(c),rulesAdapter:this.rulesAdapter,validator:this.registry.validator});
  }
}
