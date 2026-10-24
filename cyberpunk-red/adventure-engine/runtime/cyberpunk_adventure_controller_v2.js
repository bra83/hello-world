import {CyberpunkAdventureController as BaseController} from './cyberpunk_adventure_controller.js';
import {AdventureEngine,AdventureRuntime,AdventureRegistry,AdventureValidator,StartMode,migrateAdventureState,AdventurePersistence} from './adventure_engine_v2.js';
import {CYBERPUNK_RULE_ACTIONS} from './cyberpunk_host_adapters.js';
import {createTheJacketCampaignPort} from './cemk_the_jacket_campaign_port.js';

const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));

export class CyberpunkAdventureController extends BaseController {
  constructor(options={}){
    super(options);
    this.registry=new AdventureRegistry({validator:new AdventureValidator({knownRuleActions:CYBERPUNK_RULE_ACTIONS})});
    
    // Resolve durable character loader from host bridge if explicitly provided and available
    const nativeLoader = typeof options.loadSavedCharacter === 'function' ? options.loadSavedCharacter :
      (typeof options.bridge?.loadCharacter === 'function' ? (async (opts) => {
        const id = typeof opts === 'string' ? opts : opts?.characterId;
        const out = await options.bridge.loadCharacter(id);
        return out?.character ?? out;
      }) : (typeof globalThis.MotorBarbaraCore?.characters?.get === 'function' ? (async (opts) => {
        const id = typeof opts === 'string' ? opts : opts?.characterId;
        return globalThis.MotorBarbaraCore.characters.get(id);
      }) : null));

    // requireDurableSave is strictly fail-closed: requires explicit durable reader
    const requireDurableSave = options.requireDurableSave ?? Boolean(nativeLoader);

    const defaultWallet = options.wallet || options.bridge?.wallet || (
      typeof options.bridge?.walletCreditMissionReward === 'function' ? {
        getTransaction: (req) => options.bridge.walletGetTransaction?.(req),
        creditMissionReward: (req) => options.bridge.walletCreditMissionReward(req)
      } : null
    );
    const defaultVerifyReward = options.verifyTheJacketRewardEligibility || (
      typeof options.bridge?.verifyRewardEligibility === 'function'
        ? (req) => options.bridge.verifyRewardEligibility(req)
        : null
    );
    const defaultVerifyWorldTime = options.verifyTheJacketWorldTimeAdvance || (
      typeof options.bridge?.verifyWorldTimeAdvance === 'function'
        ? (req) => options.bridge.verifyWorldTimeAdvance(req)
        : null
    );

    this.theJacket=createTheJacketCampaignPort({
      getCharacter:()=>this.character(),
      saveCharacter:(c,opts)=>this.saveCharacter?.(c,opts),
      loadSavedCharacter:nativeLoader,
      requireDurableSave,
      rulesAdapter:this.rulesAdapter,
      wallet:defaultWallet,
      accountId:options.walletAccountId||null,
      verifyRewardEligibility:defaultVerifyReward,
      verifyWorldTimeAdvance:defaultVerifyWorldTime
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

  // Start preserving v2 AdventureEngine instance and strict atomic rollback on Atlas or save failure (including host storage rollback)
  async start(adventureId,{mode=null,locationId=null,sceneId=null,flags={}}={}){
    const c=this.character();if(!c)throw new Error('Personagem/campanha não carregado');
    if(!this.registry.has(adventureId))throw new Error('AdventureModule não registrado: '+adventureId);
    const campaign=this.campaign(c);
    const previousAdventureState = campaign ? clone(campaign.adventureState) : null;
    const previousWorldPosition = clone(c.worldPosition);
    const previousContinuity = clone(c.continuityLegacy);
    let hostPositionMoved = false;

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
        await this.rollbackPersistedPosition(c, previousWorldPosition);
        throw new Error('START_LOCATION_POSITION_FAILED: ' + (posOut?.reason || 'unresolved'));
      }
      hostPositionMoved = true;
    }
    const targetState = stagedState || clone(state);
    if(campaign) campaign.adventureState = targetState;
    if(this.continuity) this.continuity.applyLegacyToNextAdventure(c, campaign);
    if(typeof this.saveCharacter === 'function'){
      try{
        const saveRes = await this.saveCharacter(c);
        const saveAccepted = Boolean(saveRes && typeof saveRes === 'object' && saveRes.ok === true && saveRes.blocked !== true);
        if(!saveAccepted){
          throw new Error('START_SAVE_CHARACTER_FAILED: ' + (saveRes?.error || saveRes?.reason || 'save rejected or ambiguous receipt'));
        }
      }catch(err){
        if(campaign){
          if(previousAdventureState != null) campaign.adventureState = previousAdventureState;
          else delete campaign.adventureState;
        }
        if(previousContinuity != null) c.continuityLegacy = previousContinuity;
        else delete c.continuityLegacy;
        if(hostPositionMoved){
          await this.rollbackPersistedPosition(c, previousWorldPosition);
        }else if(previousWorldPosition != null){
          c.worldPosition = previousWorldPosition;
        }else{
          delete c.worldPosition;
        }
        throw err;
      }
    }
    this.hostEvents?.seedClock?.();
    return state;
  }
}
