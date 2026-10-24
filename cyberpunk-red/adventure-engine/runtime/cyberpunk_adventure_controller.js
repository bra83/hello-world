import {
  AdventureEngine,AdventureRegistry,AdventureValidator,AdventurePersistence,
  AdventureRuntime,StartMode,migrateAdventureState
} from './adventure_engine.js';
import {
  CyberpunkRulesAdapter,CyberpunkLocationResolver,AdventureHostEventBridge,CYBERPUNK_RULE_ACTIONS
} from './cyberpunk_host_adapters.js';
import * as ElflinesEp1Registry from './elflines_ep1_registry.js';
import * as ElflinesIntegration from './elflines_integration.js';
import * as ElflinesRulesEngine from './elflines_rules_engine.js';
import * as SingleShotPackRegistry from './single_shot_pack_registry.js';
import * as SingleShotPregenIdentities from './single_shot_pregen_identities.js';
import * as SingleShotPregenSkillProfiles from './single_shot_pregen_skill_profiles.js';
import * as SingleShotPregenLoadouts from './single_shot_pregen_loadouts.js';
import * as SingleShotPregenPreview from './single_shot_pregen_preview.js';
import {
  SINGLE_SHOT_PDF_VERIFIED_SPECS,SINGLE_SHOT_NET_ARCHITECTURES,
  promoteSingleShotPlayableCharacter,promoteAllSingleShotPlayableCharacters,getSingleShotNetArchitecture
} from './single_shot_pregen_factory.js';
import {
  BRASEIRO_ADVENTURE_FORMAT,BRASEIRO_LEGACY_FORMAT,
  validateBraseiroAdventurePayload,buildAdventureModuleFromImport,
  buildUntrustedAdventurePromptEnvelope,BraseiroContinuityManager
} from './braseiro_adventure_import_v1.js';

const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));

export class CyberpunkAdventureController{
  constructor({getCharacter,saveCharacter,setCharacter=null,atlas=null,bridge=null,toast=()=>{}}={}){
    this.getCharacter=getCharacter;this.saveCharacter=saveCharacter;this.setCharacter=setCharacter;
    this.atlas=atlas;this.bridge=bridge;this.toast=toast;
    this.rulesAdapter=new CyberpunkRulesAdapter({bridge,getCharacter:()=>this.character()});
    this.locationResolver=new CyberpunkLocationResolver({atlas,bridge,getCharacter:()=>this.character()});
    this.registry=new AdventureRegistry({validator:new AdventureValidator({knownRuleActions:CYBERPUNK_RULE_ACTIONS})});
    this.hostEvents=new AdventureHostEventBridge({controller:this,getCharacter:()=>this.character()});
    this.continuity=new BraseiroContinuityManager();
    this.importedSealedSecrets=new Map();
    this.extensions={
      elflines:{
        registry:ElflinesEp1Registry,
        integration:ElflinesIntegration,
        rules:ElflinesRulesEngine
      },
      singleShot:{
        registry:SingleShotPackRegistry,
        identities:SingleShotPregenIdentities,
        skillProfiles:SingleShotPregenSkillProfiles,
        loadouts:SingleShotPregenLoadouts,
        preview:SingleShotPregenPreview,
        verifiedSpecs:SINGLE_SHOT_PDF_VERIFIED_SPECS,
        netArchitectures:SINGLE_SHOT_NET_ARCHITECTURES,
        promotePlayable:promoteSingleShotPlayableCharacter,
        promoteAllPlayable:promoteAllSingleShotPlayableCharacters,
        getNetArchitecture:getSingleShotNetArchitecture
      },
      adventureImporter:{
        format:BRASEIRO_ADVENTURE_FORMAT,
        legacyFormat:BRASEIRO_LEGACY_FORMAT,
        validate:validateBraseiroAdventurePayload,
        buildModule:buildAdventureModuleFromImport,
        buildPromptEnvelope:buildUntrustedAdventurePromptEnvelope
      }
    };
    this.ready=false;this.lastError=null;this.lastValidation=[];this.lastLocationResolution=null;this.lastPositionRollback=null;
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

  async rollbackPersistedPosition(c,previousWorldPosition){
    if(previousWorldPosition != null) c.worldPosition = clone(previousWorldPosition);
    else if(c) delete c.worldPosition;
    if(c?.characterId && previousWorldPosition && typeof this.bridge?.moveCharacter === 'function'){
      try{
        const rb = await this.bridge.moveCharacter(c.characterId, clone(previousWorldPosition));
        this.lastPositionRollback = {
          at: new Date().toISOString(),
          characterId: c.characterId,
          restoredPosition: clone(previousWorldPosition),
          hostReceipt: clone(rb)
        };
        return rb;
      }catch(rbErr){
        this.lastPositionRollback = {
          at: new Date().toISOString(),
          characterId: c.characterId,
          error: String(rbErr?.message || rbErr)
        };
        return null;
      }
    }
    return null;
  }

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
    this.continuity.applyLegacyToNextAdventure(c, campaign);
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

  // Single Shot Pack v1.1 playable characters & NET Architectures
  listSingleShotPregens(){
    return promoteAllSingleShotPlayableCharacters();
  }

  async loadSingleShotPregen(pregenId,options={}){
    const promoted = promoteSingleShotPlayableCharacter(pregenId, options);
    if(typeof this.setCharacter === 'function'){
      this.setCharacter(promoted);
    }
    if(typeof this.saveCharacter === 'function'){
      const saveRes = await this.saveCharacter(promoted);
      if(!saveRes || saveRes.ok !== true || saveRes.blocked === true){
        throw new Error('SINGLE_SHOT_SAVE_FAILED: ' + (saveRes?.error || saveRes?.reason || 'save rejected'));
      }
    }
    return promoted;
  }

  getSingleShotNetArchitecture(archId){
    return getSingleShotNetArchitecture(archId);
  }

  // Elflines Online Expansion Pack 1 runtime actions
  async initElflinesForCharacter({avatarName='Aeris',elflineId='shadowgrove',gp=200}={}){
    const c=this.character();if(!c)throw new Error('No active character');
    const eloChar=ElflinesRulesEngine.createEloState({
      elfName:avatarName,
      stats:{INT:6,REF:6,DEX:6,TECH:5,COOL:5,WILL:6,MOVE:6,BODY:5,EMP:5},
      skills:{'Language (Elven)':4,'Archery':4,'Melee Weapon':4,'Perception':2,'Stealth':2},
      gp,
      elflineId
    });
    let session=ElflinesIntegration.createEloSession({
      sessionId:'elo_'+Date.now(),
      playerCharacterId:c.characterId||c.id||'pc',
      eloCharacter:eloChar
    });
    session=ElflinesIntegration.enableEloPack(session,'ep1');
    c.elflinesOnline=session;
    if(typeof this.saveCharacter==='function'){
      const saveRes=await this.saveCharacter(c);
      if(!saveRes||saveRes.ok!==true)throw new Error('ELFLINES_SAVE_FAILED');
    }
    return c.elflinesOnline;
  }

  async completeElflinesDungeonRun({ebConvertedToGp=1,rankUpStat='REF'}={}){
    const c=this.character();if(!c?.elflinesOnline)throw new Error('Elflines session not initialized');
    let state=ElflinesRulesEngine.buyGp(c.elflinesOnline.character,ebConvertedToGp);
    if(rankUpStat){
      state=ElflinesRulesEngine.rankUp(state,{type:'STAT',stat:rankUpStat});
    }
    c.elflinesOnline.character=state;
    if(typeof this.saveCharacter==='function'){
      const saveRes=await this.saveCharacter(c);
      if(!saveRes||saveRes.ok!==true)throw new Error('ELFLINES_SAVE_FAILED');
    }
    return c.elflinesOnline;
  }

  // Braseiro Adventure JSON Importer (braseiro.adventure/v1) & Cross-Adventure Continuity (braseiro.legacy/v1)
  async importAdventureJson(rawPayload,{autoStart=false,mode=StartMode.OFFICIAL_ADVENTURE}={}){
    const {module,sealedSecrets}=buildAdventureModuleFromImport(rawPayload);
    if(Array.isArray(this.atlas?.poiCatalog)){
      for(const loc of module.locations||[]){
        const exists=this.atlas.poiCatalog.some(p=>p.code===loc.id||p.id===loc.id);
        if(!exists){
          this.atlas.poiCatalog.push({
            code:loc.id,
            id:loc.id,
            name:loc.name||loc.id,
            atlasId:loc.atlasPosition?.atlasId||'night-city-2045',
            district:loc.district||'Night City',
            position:{x:Number(loc.atlasPosition?.x??120),y:Number(loc.atlasPosition?.y??140)}
          });
        }
      }
    }
    this.registry.register(module);
    this.importedSealedSecrets.set(module.id,sealedSecrets);
    const c=this.character();
    if(c){
      const campaign=this.campaign(c);
      campaign.importedAdventures=campaign.importedAdventures||{};
      campaign.importedAdventures[module.id]=clone(module);
      if(typeof this.saveCharacter==='function'){
        const saveRes=await this.saveCharacter(c);
        if(!saveRes||saveRes.ok!==true||saveRes.blocked===true){
          throw new Error('IMPORT_ADVENTURE_SAVE_FAILED');
        }
      }
    }
    let startedState=null;
    if(autoStart&&c){
      startedState=await this.start(module.id,{mode,locationId:module.startDefinition?.startingLocation});
    }
    return {ok:true,moduleId:module.id,adventureId:module.id,title:module.title,module:clone(module),startedState};
  }

  async completeActiveAdventureWithLegacy(outcome={}){
    return this.completeActiveAdventure(outcome);
  }

  async completeActiveAdventure(outcome={}){
    const c=this.character();if(!c)throw new Error('No active character');
    const campaign=this.campaign(c);
    const legacy=this.continuity.recordAdventureOutcome(c,campaign,outcome);
    if(campaign?.adventureState){
      campaign.adventureState.status='COMPLETED';
      campaign.adventureState.completedAt=new Date().toISOString();
    }
    if(typeof this.saveCharacter==='function'){
      const saveRes=await this.saveCharacter(c);
      if(!saveRes||saveRes.ok!==true||saveRes.blocked===true){
        throw new Error('COMPLETE_ADVENTURE_SAVE_FAILED');
      }
    }
    return legacy;
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
    const ctx=rt.buildAiContext({worldState,mechanicalResults,narrativeProfile,presentNpcIds});
    if(ctx&&rt.module?.format===BRASEIRO_ADVENTURE_FORMAT){
      const activeScene=(rt.module.scenes||[]).find(s=>s.id===rt.state?.currentSceneId)||rt.module.scenes?.[0]||null;
      ctx.importedAdventureEnvelope=buildUntrustedAdventurePromptEnvelope(rt.module,activeScene,c?.continuityLegacy||null);
    }
    return ctx;
  }

  buildContextText(c=this.character(),opts={}){
    const rt=this.runtime(c),ctx=this.buildContextObject(c,opts);
    if(!rt||!ctx)return'';
    const base=rt.contextBuilder.toPromptFragment(ctx);
    return ctx.importedAdventureEnvelope?base+'\n\n'+ctx.importedAdventureEnvelope:base;
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
      lastPositionRollback:clone(this.lastPositionRollback),
      extensionsLoaded:Object.keys(this.extensions||{}),
      lastError:this.lastError?String(this.lastError.message||this.lastError):null
    };
  }
}
