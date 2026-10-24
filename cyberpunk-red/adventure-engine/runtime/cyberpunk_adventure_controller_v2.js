import {CyberpunkAdventureController as BaseController} from './cyberpunk_adventure_controller.js';
import {AdventureEngine,AdventureRuntime,AdventureRegistry,AdventureValidator,StartMode,migrateAdventureState,AdventurePersistence} from './adventure_engine_v2.js';
import {CYBERPUNK_RULE_ACTIONS} from './cyberpunk_host_adapters.js';
import {createTheJacketCampaignPort} from './cemk_the_jacket_campaign_port.js';

const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));

export class CyberpunkAdventureController extends BaseController {
  constructor(options={}){
    super(options);
    this.registry=new AdventureRegistry({validator:new AdventureValidator({knownRuleActions:CYBERPUNK_RULE_ACTIONS})});
    
    // Resolve durable character loader from host bridge if available
    const nativeLoader = options.loadSavedCharacter || 
      (typeof options.bridge?.loadCharacter === 'function' ? (async (opts) => {
        const id = typeof opts === 'string' ? opts : opts?.characterId;
        const out = await options.bridge.loadCharacter(id);
        return out?.character ?? out;
      }) : null) ||
      (typeof globalThis.MotorBarbaraCore?.characters?.get === 'function' ? (async (opts) => {
        const id = typeof opts === 'string' ? opts : opts?.characterId;
        return globalThis.MotorBarbaraCore.characters.get(id);
      }) : null);

    const requireDurableSave = options.requireDurableSave ?? (typeof nativeLoader === 'function');

    this.theJacket=createTheJacketCampaignPort({
      getCharacter:()=>this.character(),
      saveCharacter:c=>this.saveCharacter?.(c),
      loadSavedCharacter:nativeLoader,
      requireDurableSave,
      rulesAdapter:this.rulesAdapter,
      wallet:options.wallet||options.bridge?.wallet||null,
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

  // Start preserving v2 AdventureEngine instance and strict atomic rollback on Atlas or save failure
  async start(adventureId,{mode=null,locationId=null,sceneId=null,flags={}}={}){
    const c=this.character();if(!c)throw new Error('Personagem/campanha não carregado');
    if(!this.registry.has(adventureId))throw new Error('AdventureModule não registrado: '+adventureId);
    let stagedState = null;
    const stagingPersistence = new AdventurePersistence({
      readState: () => this.persistedState(c),
      writeState: state => { stagedState = clone(state); }
    });
    const engine=new AdventureEngine({
      registry:this.registry,validator:this.registry.validator,mapAdapter:this.mapAdapter(c),
      worldAdapter:this.worldAdapter(c),rulesAdapter:this.rulesAdapter,
      persistenceFactory:()=>stagingPersistence
    });
    const campaignId=c.campaignState?.session?.campaignId||c.campaignState?.campaignId||null;
    const state=await engine.start(adventureId,{mode,campaignId,locationId,sceneId,flags,worldSnapshot:this.worldSnapshot(c)});
    if([StartMode.OFFICIAL_ADVENTURE,StartMode.GUIDED_CAMPAIGN,StartMode.SOLO,StartMode.TAVERN_START].includes(state.startMode)&&state.currentLocationId){
      const posOut = await this.positionAtModuleLocation(adventureId,state.currentLocationId);
      if(!posOut || posOut.ok !== true || posOut.resolved !== true || posOut.blocked === true){
        throw new Error('START_LOCATION_POSITION_FAILED: ' + (posOut?.reason || 'unresolved'));
      }
    }
    const targetState = stagedState || clone(state);
    const campaign=this.campaign(c);
    const previousState = campaign ? clone(campaign.adventureState) : null;
    if(campaign) campaign.adventureState = targetState;
    if(typeof this.saveCharacter === 'function'){
      try{
        const saveRes = await this.saveCharacter(c);
        if(saveRes && typeof saveRes === 'object' && saveRes.ok === false){
          if(campaign){
            if(previousState != null) campaign.adventureState = previousState;
            else delete campaign.adventureState;
          }
          throw new Error('START_SAVE_CHARACTER_FAILED: ' + (saveRes.error || saveRes.reason || 'save rejected'));
        }
      }catch(err){
        if(campaign){
          if(previousState != null) campaign.adventureState = previousState;
          else delete campaign.adventureState;
        }
        throw err;
      }
    }
    this.hostEvents.seedClock();
    return state;
  }
}
