import {CyberpunkAdventureController as BaseController} from './cyberpunk_adventure_controller.js';
import {AdventureEngine,AdventureRuntime,AdventureRegistry,AdventureValidator,StartMode,migrateAdventureState} from './adventure_engine_v2.js';
import {CYBERPUNK_RULE_ACTIONS} from './cyberpunk_host_adapters.js';

export class CyberpunkAdventureController extends BaseController {
  constructor(options={}){
    super(options);
    this.registry=new AdventureRegistry({validator:new AdventureValidator({knownRuleActions:CYBERPUNK_RULE_ACTIONS})});
  }

  // Production narrator receives public/discovered state only, never sealed GM payload.
  buildContextObject(c=this.character(),options={}){
    const ctx=super.buildContextObject(c,options);
    if(!ctx)return ctx;
    const safe=JSON.parse(JSON.stringify(ctx));
    delete safe.gmKnowledge;
    return safe;
  }

  runtime(c=this.character()){
    const raw=this.persistedState(c);if(!raw?.adventureId||!this.registry.has(raw.adventureId))return null;
    const module=this.registry.get(raw.adventureId),state=migrateAdventureState(raw,module);
    return new AdventureRuntime(module,{state,persistence:this.persistence(c),mapAdapter:this.mapAdapter(c),worldAdapter:this.worldAdapter(c),rulesAdapter:this.rulesAdapter,validator:this.registry.validator});
  }

  async start(adventureId,{mode=null,locationId=null,sceneId=null,flags={}}={}){
    const c=this.character();if(!c)throw new Error('Personagem/campanha não carregado');
    if(!this.registry.has(adventureId))throw new Error('AdventureModule não registrado: '+adventureId);
    const engine=new AdventureEngine({registry:this.registry,validator:this.registry.validator,mapAdapter:this.mapAdapter(c),worldAdapter:this.worldAdapter(c),rulesAdapter:this.rulesAdapter,persistenceFactory:()=>this.persistence(c)});
    const campaignId=c.campaignState?.session?.campaignId||c.campaignState?.campaignId||null;
    const state=await engine.start(adventureId,{mode,campaignId,locationId,sceneId,flags,worldSnapshot:this.worldSnapshot(c)});
    c.campaignState.adventureState=state;
    if([StartMode.OFFICIAL_ADVENTURE,StartMode.GUIDED_CAMPAIGN,StartMode.SOLO,StartMode.TAVERN_START].includes(state.startMode)&&state.currentLocationId)await this.positionAtModuleLocation(adventureId,state.currentLocationId);
    await this.saveCharacter?.(c);this.hostEvents.seedClock();return state;
  }
}