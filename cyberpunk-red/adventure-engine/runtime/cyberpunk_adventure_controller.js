import {
  AdventureEngine,AdventureRegistry,AdventureValidator,AdventurePersistence,
  AdventureRuntime,StartMode,migrateAdventureState
} from './adventure_engine.js';
import {
  CyberpunkRulesAdapter,CyberpunkLocationResolver,AdventureHostEventBridge,CYBERPUNK_RULE_ACTIONS
} from './cyberpunk_host_adapters.js';

const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));

export class CyberpunkAdventureController{
  constructor({getCharacter,saveCharacter,atlas=null,bridge=null,toast=()=>{}}={}){
    this.getCharacter=getCharacter;this.saveCharacter=saveCharacter;this.atlas=atlas;this.bridge=bridge;this.toast=toast;
    this.rulesAdapter=new CyberpunkRulesAdapter({bridge,getCharacter:()=>this.character()});
    this.locationResolver=new CyberpunkLocationResolver({atlas,bridge,getCharacter:()=>this.character()});
    this.registry=new AdventureRegistry({validator:new AdventureValidator({knownRuleActions:CYBERPUNK_RULE_ACTIONS})});
    this.hostEvents=new AdventureHostEventBridge({controller:this,getCharacter:()=>this.character()});
    this.ready=false;this.lastError=null;this.lastValidation=[];this.lastLocationResolution=null;
  }

  async init(){
    try{
      const rows=await this.registry.loadIndex('./data/adventures/index.json');
      this.ready=true;this.lastValidation=rows;this.hostEvents.bind();return rows;
    }catch(error){
      this.lastError=error;console.error('[ADVENTURE_ENGINE_INIT]',error);this.ready=false;this.hostEvents.bind();return[];
    }
  }

  character(){return this.getCharacter?.()||null}
  modules(){return this.registry.list()}
  getModule(id){return this.registry.get(id)}
  startModes(){return ['OFFICIAL_ADVENTURE','GUIDED_CAMPAIGN','SOLO','SANDBOX','TAVERN_START']}
  campaign(c=this.character()){if(!c)return null;c.campaignState=c.campaignState||{};return c.campaignState}
  persistedState(c=this.character()){return this.campaign(c)?.adventureState||null}

  persistence(c=this.character()){
    return new AdventurePersistence({
      readState:()=>this.persistedState(c),
      writeState:state=>{const campaign=this.campaign(c);if(campaign)campaign.adventureState=clone(state)}
    });
  }

  runtime(c=this.character()){
    const raw=this.persistedState(c);if(!raw?.adventureId||!this.registry.has(raw.adventureId))return null;
    const module=this.registry.get(raw.adventureId),state=migrateAdventureState(raw,module);
    return new AdventureRuntime(module,{
      state,persistence:this.persistence(c),mapAdapter:this.mapAdapter(c),worldAdapter:this.worldAdapter(c),rulesAdapter:this.rulesAdapter
    });
  }

  mapAdapter(c=this.character()){
    return {
      choosePlayerStart:async()=>c?.worldPosition?.poiCode||c?.worldPosition?.locationId||c?.worldPosition?.district||null,
      randomValidStart:async({type}={})=>{
        const pois=Array.isArray(this.atlas?.poiCatalog)?this.atlas.poiCatalog:[];
        const eligible=pois.filter(p=>type!=='tavern'||/bar|club|hotel|restaurant|cafe|tavern/i.test([p.type,p.category,p.name].filter(Boolean).join(' ')));
        const pool=eligible.length?eligible:pois;
        if(!pool.length)return c?.worldPosition?.poiCode||c?.worldPosition?.district||null;
        const word=new Uint32Array(1);crypto.getRandomValues(word);const p=pool[word[0]%pool.length];
        return p.code||p.id||p.locationId||p.name||null;
      },
      resolveLocation:async(ref,moduleLocation=null)=>this.locationResolver.resolve(ref,moduleLocation)
    };
  }

  worldAdapter(c=this.character()){
    return {
      applyAdventureWorldChange:({target,value,reason,sourceId})=>{
        const campaign=this.campaign(c);campaign.adventureWorldChanges=campaign.adventureWorldChanges||{};
        campaign.adventureWorldChanges[target||'world']={value:clone(value),reason:reason||null,sourceId:sourceId||null,updatedAt:new Date().toISOString()};
      },
      resolveSoloStart:async()=>({locationId:c?.worldPosition?.poiCode||c?.worldPosition?.district||null})
    };
  }

  worldSnapshot(c=this.character()){
    return {
      worldPosition:clone(c?.worldPosition||null),
      worldClock:clone(c?.campaignState?.worldClock||null),
      weather:clone(c?.campaignState?.worldSystems?.weather||null)
    };
  }

  async positionAtModuleLocation(adventureId,locationId){
    const c=this.character(),module=this.registry.get(adventureId);if(!c||!module||!locationId)return null;
    const def=(module.locations||[]).find(x=>x.id===locationId)||null;
    const out=await this.locationResolver.position(locationId,def);
    this.lastLocationResolution={at:new Date().toISOString(),adventureId,locationId,result:clone(out)};
    return out;
  }

  async start(adventureId,{mode=null,locationId=null,sceneId=null,flags={}}={}){
    const c=this.character();if(!c)throw new Error('Personagem/campanha não carregado');
    if(!this.registry.has(adventureId))throw new Error('AdventureModule não registrado: '+adventureId);
    const engine=new AdventureEngine({
      registry:this.registry,mapAdapter:this.mapAdapter(c),worldAdapter:this.worldAdapter(c),rulesAdapter:this.rulesAdapter,
      persistenceFactory:()=>this.persistence(c)
    });
    const campaignId=c.campaignState?.session?.campaignId||c.campaignState?.campaignId||null;
    const state=await engine.start(adventureId,{mode,campaignId,locationId,sceneId,flags,worldSnapshot:this.worldSnapshot(c)});
    c.campaignState.adventureState=state;
    const resolvedMode=state.startMode;
    if([StartMode.OFFICIAL_ADVENTURE,StartMode.GUIDED_CAMPAIGN,StartMode.SOLO,StartMode.TAVERN_START].includes(resolvedMode)&&state.currentLocationId){
      await this.positionAtModuleLocation(adventureId,state.currentLocationId);
    }
    await this.saveCharacter?.(c);
    this.hostEvents.seedClock();
    return state;
  }

  async startDefault({startPoi=null,mode=StartMode.SANDBOX}={}){
    const c=this.character();if(!c)return null;
    const locationId=startPoi?.code||startPoi?.id||c?.worldPosition?.poiCode||c?.worldPosition?.district||null;
    return this.start('cyberpunk_sandbox',{mode,locationId,flags:{'runtime:unstructured_sandbox':true}});
  }

  async reset(){
    const c=this.character();if(!c)return;
    if(c.campaignState)delete c.campaignState.adventureState;
    await this.saveCharacter?.(c);
  }

  async syncLocation(locationId=null,sceneId=null,reason='world-sync'){
    const c=this.character(),rt=this.runtime(c);if(!rt)return null;
    const resolved=locationId||c?.worldPosition?.poiCode||c?.worldPosition?.locationId||c?.worldPosition?.district||null;
    if(resolved&&resolved!==rt.state.currentLocationId){
      await rt.enterLocation(resolved,{sceneId,reason});
    }else if(sceneId&&sceneId!==rt.state.currentSceneId){
      rt.state.currentSceneId=sceneId;rt.state.updatedAt=new Date().toISOString();rt.persist();
    }
    c.campaignState.adventureState=rt.snapshot();await this.saveCharacter?.(c);return rt.snapshot();
  }

  buildContextObject(c=this.character(),{mechanicalResults=null,narrativeProfile=null}={}){
    const rt=this.runtime(c);if(!rt)return null;
    const systems=c?.campaignState?.worldSystems||{};
    const worldState={position:clone(c?.worldPosition||null),clock:clone(c?.campaignState?.worldClock||null),weather:clone(systems.weather||null)};
    const presentNpcIds=(this.atlas?.currentNpcs||[]).map(n=>String(n.enemyId||n.sourceActorId||n.actorId||n.tokenId||n.name||'')).filter(Boolean);
    return rt.buildAiContext({worldState,mechanicalResults,narrativeProfile,presentNpcIds});
  }

  buildContextText(c=this.character(),opts={}){
    const rt=this.runtime(c),ctx=this.buildContextObject(c,opts);return rt&&ctx?rt.contextBuilder.toPromptFragment(ctx):'';
  }

  async processHostResult({result={},playerAction='',ruleResult=null,mode='PLAYER_ACTION'}={}){
    const c=this.character(),rt=this.runtime(c);if(!rt)return {accepted:[],rejected:[]};
    const intent=result?.adventureIntent||result?.adventure_intent||result?.presentation?.adventureIntent||null;
    const review=intent?rt.acceptAiIntent(intent,{sourceId:'ai:'+Date.now(),context:{mode}}):{accepted:[],rejected:[],applied:[],events:[]};
    for(const event of review.events||[])await rt.processEvent(event,{mode,source:'ai-intent'});
    rt.recordHistory({
      playerAction,ruleResult,
      consequences:review.applied||[],
      revealedInformation:[],
      summary:String(result?.presentation?.narration||result?.narration||result?.text||'').slice(0,600)
    });
    rt.evaluateCompletion({mode});
    c.campaignState.adventureState=rt.snapshot();
    await this.saveCharacter?.(c);
    return review;
  }

  async notify(type,payload={}){
    const c=this.character(),rt=this.runtime(c);if(!rt)return[];
    let rows=[];
    if(type==='ON_NPC_MET'&&payload.npcId){
      rows=await rt.meetNpc(payload.npcId,{source:'host',...payload});
    }else if(type==='ON_NPC_DEATH'&&payload.npcId){
      const applied=rt.applyConsequences([{type:'KILL_NPC',target:payload.npcId,reason:payload.reason||'Rules Engine reported death'}],{
        sourceId:'host:npc-death:'+payload.npcId,idempotencyPrefix:'host:npc-death:'+payload.npcId,context:{source:'host',...payload}
      });
      rows=[{hostConsequence:applied}];
      for(const event of applied.events||[])rows.push(...await rt.processEvent(event,{source:'host',...payload}));
    }else{
      rows=await rt.processEvent({type,...payload},{source:'host'});
    }
    c.campaignState.adventureState=rt.snapshot();await this.saveCharacter?.(c);return rows;
  }

  async resolveRuleAction(action,context={}){
    const c=this.character(),rt=this.runtime(c);if(!rt)return{ok:false,resolved:false,blocked:true,reason:'NO_ACTIVE_ADVENTURE'};
    const rows=await rt.resolveRuleActions([action],{context:{source:'manual-host',...context}});
    c.campaignState.adventureState=rt.snapshot();await this.saveCharacter?.(c);return rows[0]||null;
  }

  debugState(c=this.character()){
    const rt=this.runtime(c),state=rt?.snapshot()||null;
    return {
      ready:this.ready,
      modules:this.registry.list(),
      state,
      adventureId:state?.adventureId||null,
      sceneId:state?.currentSceneId||null,
      locationId:state?.currentLocationId||null,
      status:state?.status||'NONE',
      pendingRuleActions:state?.pendingRuleActions?.length||0,
      ruleResults:state?.ruleResults?.length||0,
      lastLocationResolution:clone(this.lastLocationResolution),
      lastError:this.lastError?String(this.lastError.message||this.lastError):null
    };
  }
}
