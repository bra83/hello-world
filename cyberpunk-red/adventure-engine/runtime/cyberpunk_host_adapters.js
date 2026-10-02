/*
 * Cyberpunk RED host adapters for the Universal Adventure Engine.
 * These adapters keep Rules/World/Map authority outside AdventureModule.
 */

const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
const norm=v=>String(v??'').trim();
const slug=v=>norm(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

export const CYBERPUNK_RULE_ACTIONS=Object.freeze([
  'SKILL_CHECK','OPPOSED_CHECK','COMBAT_START','COMBAT_RESOLUTION','DAMAGE','REST','TRAVEL',
  'CHASE','NETRUN','NET_ARCHITECTURE','HUMANITY_CHECK','ADDICTION_CHECK','ROLE_ABILITY',
  'PURCHASE','SALE','CYBERWARE_INSTALL','CYBERWARE_REMOVE','REPAIR','CRAFT','MEDICAL',
  'WORLD_TIME_ADVANCE','ITEM_USE'
]);

export class CyberpunkRulesAdapter{
  constructor({bridge=null,getCharacter=()=>null}={}){
    this.bridge=bridge;this.getCharacter=getCharacter;
    this.knownActions=[...CYBERPUNK_RULE_ACTIONS];
  }

  canResolve(type){return this.knownActions.includes(norm(type).toUpperCase())}

  async resolve(action,{adventureState=null,module=null,event=null,context={}}={}){
    const a=clone(action||{}),type=norm(a.type).toUpperCase();
    if(!this.canResolve(type))return{ok:false,resolved:false,blocked:true,reason:'UNKNOWN_RULE_ACTION',type,action:a};

    const payload={
      action:a,
      adventureId:adventureState?.adventureId||module?.id||null,
      sceneId:adventureState?.currentSceneId||null,
      locationId:adventureState?.currentLocationId||null,
      eventId:event?.id||event?.eventId||null,
      characterId:this.getCharacter?.()?.characterId||null,
      context:clone(context)
    };

    try{
      const native=this.bridge?.resolveAdventureRuleAction;
      if(typeof native==='function'){
        const out=await native.call(this.bridge,payload);
        return this.normalizeResult(out,type,a,'barbara-host-bridge');
      }

      const core=globalThis.MotorBarbaraCore?.rules;
      if(typeof core?.resolveAdventureAction==='function'){
        const out=await core.resolveAdventureAction(payload);
        return this.normalizeResult(out,type,a,'motor-barbara-rules');
      }

      // Deterministic fallback is deliberately BLOCKED, not an AI guess.
      // Existing concrete mechanics may later register a resolver through this event contract.
      const external=await this.requestBrowserResolver(payload);
      if(external)return this.normalizeResult(external,type,a,'browser-event-resolver');

      return{ok:false,resolved:false,blocked:true,reason:'RULE_ACTION_HOST_UNAVAILABLE',type,action:a};
    }catch(error){
      return{ok:false,resolved:false,blocked:true,reason:'RULE_ACTION_ERROR',error:String(error?.message||error),type,action:a};
    }
  }

  normalizeResult(out,type,action,authority){
    const r=out&&typeof out==='object'?out:{ok:false,error:'invalid rule result'};
    const ok=r.ok!==false&&r.resolved!==false&&!r.blocked;
    return{
      ...clone(r),
      ok,
      resolved:ok,
      blocked:!ok,
      type,
      action:clone(action),
      authority:r.authority||authority
    };
  }

  requestBrowserResolver(payload,timeoutMs=80){
    if(typeof document==='undefined'||typeof CustomEvent==='undefined')return Promise.resolve(null);
    return new Promise(resolve=>{
      const requestId='adv-rule-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
      let done=false;
      const finish=value=>{if(done)return;done=true;document.removeEventListener('barbara:adventure-rule-result',handler);clearTimeout(timer);resolve(value)};
      const handler=event=>{if(event?.detail?.requestId===requestId)finish(event.detail.result||event.detail)};
      document.addEventListener('barbara:adventure-rule-result',handler);
      const timer=setTimeout(()=>finish(null),timeoutMs);
      document.dispatchEvent(new CustomEvent('barbara:adventure-rule-action',{detail:{requestId,payload}}));
    });
  }
}

export class CyberpunkLocationResolver{
  constructor({atlas=null,bridge=null,getCharacter=()=>null}={}){
    this.atlas=atlas;this.bridge=bridge;this.getCharacter=getCharacter;
  }

  catalog(){return Array.isArray(this.atlas?.poiCatalog)?this.atlas.poiCatalog:[]}

  resolve(ref,moduleLocation=null){
    const candidates=[
      ref,moduleLocation?.poiId,moduleLocation?.worldLocationId,moduleLocation?.atlasLocationId,
      moduleLocation?.id,moduleLocation?.name
    ].map(norm).filter(Boolean);
    if(!candidates.length)return null;
    const exact=new Set(candidates.map(x=>x.toLowerCase()));
    const slugs=new Set(candidates.map(slug));
    const poi=this.catalog().find(p=>{
      const values=[p.code,p.id,p.poiId,p.name].map(norm).filter(Boolean);
      return values.some(v=>exact.has(v.toLowerCase())||slugs.has(slug(v)));
    });
    if(!poi)return null;
    return{
      locationId:norm(moduleLocation?.id||poi.code||poi.id||ref),
      poiCode:norm(poi.code||poi.id||ref),
      atlasId:norm(poi.atlasId||'night-city-2045'),
      district:poi.district||null,
      districtCode:poi.districtCode||null,
      x:Number(poi.position?.x),
      y:Number(poi.position?.y),
      mapId:moduleLocation?.mapId||poi.mapId||'night-city-2045'
    };
  }

  async position(ref,moduleLocation=null){
    const resolved=this.resolve(ref,moduleLocation);
    if(!resolved||!Number.isFinite(resolved.x)||!Number.isFinite(resolved.y))return{ok:false,resolved:false,reason:'ATLAS_LOCATION_NOT_FOUND',ref};
    const c=this.getCharacter?.();if(!c)return{ok:false,resolved:false,reason:'CHARACTER_NOT_LOADED'};
    const pos={
      atlasId:resolved.atlasId,x:resolved.x,y:resolved.y,district:resolved.district,districtCode:resolved.districtCode,
      poiCode:resolved.poiCode,mode:'street',travelMode:c?.worldPosition?.travelMode||'walk',updatedAt:new Date().toISOString()
    };
    c.worldPosition=pos;
    try{
      if(this.bridge?.moveCharacter&&c.characterId){
        const committed=await this.bridge.moveCharacter(c.characterId,pos);
        if(committed?.worldPosition)c.worldPosition=committed.worldPosition;
      }
      return{ok:true,resolved:true,location:resolved,worldPosition:clone(c.worldPosition)};
    }catch(error){
      return{ok:false,resolved:false,reason:'WORLD_POSITION_COMMIT_FAILED',error:String(error?.message||error),location:resolved};
    }
  }
}

export class AdventureHostEventBridge{
  constructor({controller,getCharacter=()=>null}={}){
    this.controller=controller;this.getCharacter=getCharacter;this.bound=false;this.handlers=[];
    this.lastDay=null;this.lastElapsedMinutes=null;
  }

  on(name,fn){
    if(typeof document==='undefined')return;
    document.addEventListener(name,fn);this.handlers.push([name,fn]);
  }

  bind(){
    if(this.bound||typeof document==='undefined')return;this.bound=true;
    const safe=fn=>event=>Promise.resolve(fn(event)).catch(error=>console.warn('[ADVENTURE_HOST_EVENT]',error));

    this.on('barbara:scene-enter',safe(async event=>{
      const d=event.detail||{},locationId=d.locationId||d.poiCode||d.sceneId||this.currentLocation();
      if(locationId)await this.controller.syncLocation(locationId,d.sceneId||null,'scene-enter');
    }));

    this.on('barbara:scene-exit',safe(async event=>{
      const d=event.detail||{},locationId=d.locationId||d.poiCode||d.sceneId||this.currentLocation();
      await this.controller.notify('ON_LEAVE_LOCATION',{locationId,sceneId:d.sceneId||null});
    }));

    this.on('barbara:travel',safe(async event=>{
      const d=event.detail||{};
      await this.controller.notify('ON_TRAVEL',{...clone(d)});
      await this.controller.syncLocation(d.toPoiCode||d.locationId||this.currentLocation(),d.sceneId||null,'travel');
    }));

    this.on('barbara:world-pulse',safe(async event=>{
      const d=event.detail||{},clock=d.after||this.getCharacter?.()?.campaignState?.worldClock||{};
      const day=Number(clock.day||0),elapsed=Number(clock.elapsedMinutes||0);
      if(this.lastDay!=null&&day>this.lastDay)await this.controller.notify('ON_DAY_CHANGED',{beforeDay:this.lastDay,day});
      if(this.lastElapsedMinutes!=null&&elapsed>this.lastElapsedMinutes)await this.controller.notify('ON_TIME_ELAPSED',{beforeMinutes:this.lastElapsedMinutes,elapsedMinutes:elapsed,deltaMinutes:elapsed-this.lastElapsedMinutes});
      this.lastDay=day;this.lastElapsedMinutes=elapsed;
    }));

    this.on('barbara:adventure-npc-met',safe(event=>this.controller.notify('ON_NPC_MET',clone(event.detail||{}))));
    this.on('barbara:adventure-npc-death',safe(event=>this.controller.notify('ON_NPC_DEATH',clone(event.detail||{}))));
    this.on('barbara:adventure-combat-end',safe(event=>this.controller.notify('ON_COMBAT_END',clone(event.detail||{}))));
    this.on('barbara:adventure-rest',safe(event=>this.controller.notify('ON_REST',clone(event.detail||{}))));
    this.on('barbara:adventure-dialogue',safe(event=>this.controller.notify('ON_DIALOGUE',clone(event.detail||{}))));
    this.on('barbara:adventure-item-found',safe(event=>this.controller.notify('ON_ITEM_FOUND',clone(event.detail||{}))));
    this.seedClock();
  }

  seedClock(){
    const clock=this.getCharacter?.()?.campaignState?.worldClock||{};
    this.lastDay=Number(clock.day||0);this.lastElapsedMinutes=Number(clock.elapsedMinutes||0);
  }

  currentLocation(){
    const p=this.getCharacter?.()?.worldPosition||{};
    return p.poiCode||p.locationId||p.sceneId||p.district||null;
  }

  unbind(){
    if(typeof document!=='undefined')for(const [name,fn] of this.handlers)document.removeEventListener(name,fn);
    this.handlers=[];this.bound=false;
  }
}
