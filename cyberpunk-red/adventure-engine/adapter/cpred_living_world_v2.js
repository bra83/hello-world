import {advanceDangerGalWorld,indexDangerGalRoster,DANGER_GAL_SOURCE} from './cpred_danger_gal.js';

export const LIVING_WORLD_V2_VERSION='R5.16';
export const LIVING_WORLD_V2_SOURCE='Braseiro Living World 2.0 — source-bound projection layer';

const clone=x=>JSON.parse(JSON.stringify(x??{}));
const arr=x=>Array.isArray(x)?x:[];
const minute=n=>Math.max(0,Math.trunc(Number(n)||0));
const projected=row=>({...row,canonical:false,projected:true,sourceBound:true,mutatesMissionState:false,requiresMasterResolution:true});
const appendUnique=(prior,next,limit)=>[...new Map([...arr(prior),...arr(next)].map(x=>[x.id,x])).values()].sort((a,b)=>Number(a.atMinute||0)-Number(b.atMinute||0)||String(a.id).localeCompare(String(b.id))).slice(-limit);

export function ensureLivingWorldV2State(raw={}){
  const s=raw&&typeof raw==='object'?raw:{};
  s.version=LIVING_WORLD_V2_VERSION;
  s.lastMinute=minute(s.lastMinute);
  s.actors=s.actors&&typeof s.actors==='object'?s.actors:{};
  s.factions=s.factions&&typeof s.factions==='object'?s.factions:{};
  s.consequences=arr(s.consequences);
  s.rumors=arr(s.rumors);
  s.history=arr(s.history);
  s.dangerGal=s.dangerGal&&typeof s.dangerGal==='object'?s.dangerGal:{lastDay:0,events:[]};
  return s;
}

export function advanceLivingWorldV2(raw,{streetState,streetCatalog,dangerGalRoster,toMinute,seed='night-city',activeFaction=null}={}){
  const state=ensureLivingWorldV2State(clone(raw));
  const beforeCampaign=JSON.stringify(streetState?.campaign||{});
  const now=Math.max(state.lastMinute,minute(toMinute));
  const streetActors=arr(streetState?.offscreen?.actors);
  const streetActorState=streetState?.offscreen?.actorState||{};
  const dangerIndex=indexDangerGalRoster(dangerGalRoster||{});
  for(const actor of streetActors)state.actors[`street:${actor.id}`]={id:`street:${actor.id}`,sourceId:actor.id,name:actor.name,source:'street_stories',missionIds:arr(actor.missionIds),relatedActorIds:arr(actor.relatedActorIds).map(id=>`street:${id}`),locationId:streetActorState[actor.id]?.locationId||actor.lastLocationId||null,pressure:Number(streetActorState[actor.id]?.pressure||0),status:streetActorState[actor.id]?.status||'active',sourcePage:actor.sourcePage,sourceBound:true};
  for(const actor of dangerIndex.characters)state.actors[`danger_gal:${actor.id}`]={id:`danger_gal:${actor.id}`,sourceId:actor.id,name:actor.name,source:'danger_gal',faction:actor.faction,role:actor.role,level:actor.level,sourcePage:actor.sourcePage,sourceBound:true};
  for(const faction of dangerIndex.factions){const members=dangerIndex.byFaction[faction]||[];state.factions[faction]={id:faction,name:faction,actorIds:members.map(x=>`danger_gal:${x.id}`),activity:Number(state.factions[faction]?.activity||0),lastProjectedMinute:Number(state.factions[faction]?.lastProjectedMinute||0),source:DANGER_GAL_SOURCE,sourceBound:true}}
  const priorDangerIds=new Set(arr(state.dangerGal.events).map(x=>`${x.day}:${x.factions?.join('|')}`));
  state.dangerGal=advanceDangerGalWorld(state.dangerGal,dangerGalRoster||{},{toDay:Math.floor(now/1440),seed,activeFaction});
  const newDanger=arr(state.dangerGal.events).filter(x=>!priorDangerIds.has(`${x.day}:${x.factions?.join('|')}`));
  const streetEvents=arr(streetState?.offscreen?.events).filter(x=>Number(x.atMinute||0)>state.lastMinute&&Number(x.atMinute||0)<=now);
  const consequences=[];
  for(const e of streetEvents.filter(x=>Number(x.pressureDelta||0)>0))consequences.push(projected({id:`street:${e.id}`,atMinute:Number(e.atMinute||now),kind:'actor-pressure',actorIds:[`street:${e.actorId}`,...(e.relatedActorId?[`street:${e.relatedActorId}`]:[])],factionIds:[],locationId:e.locationId||null,pressure:Number(e.pressure||0),basisEventId:e.id,source:e.source}));
  for(const e of newDanger){const at=Number(e.day||0)*1440;for(const faction of arr(e.factions)){const row=state.factions[faction];if(row){row.activity=Math.min(12,Number(row.activity||0)+Number(e.pressure||1));row.lastProjectedMinute=at}}consequences.push(projected({id:`danger:${e.day}:${arr(e.factions).join(':')}`,atMinute:at,kind:'faction-pressure',actorIds:arr(e.actors).map(id=>`danger_gal:${id}`),factionIds:arr(e.factions),pressure:Number(e.pressure||0),winner:e.winner||null,basisEventId:`danger-gal-day-${e.day}`,source:e.source}))}
  state.consequences=appendUnique(state.consequences,consequences,128);
  const leads=arr(streetState?.offscreen?.leads).filter(x=>Number(x.expiresAtMinute||0)>now);
  const streetRumors=leads.map(x=>projected({id:`rumor:${x.id}`,atMinute:Number(x.createdAtMinute||now),expiresAtMinute:Number(x.expiresAtMinute||now),kind:'street-lead',status:'unverified',actorIds:[`street:${x.actorId}`,...(x.relatedActorId?[`street:${x.relatedActorId}`]:[])],factionIds:[],locationId:x.locationId||null,pressure:Number(x.pressure||0),basisEventId:x.id,source:'Tales of the RED: Street Stories Digital v1.2'}));
  const factionRumors=newDanger.map(x=>projected({id:`rumor:danger:${x.day}:${arr(x.factions).join(':')}`,atMinute:Number(x.day||0)*1440,expiresAtMinute:Number(x.day||0)*1440+2880,kind:'faction-activity',status:'unverified',actorIds:arr(x.actors).map(id=>`danger_gal:${id}`),factionIds:arr(x.factions),pressure:Number(x.pressure||0),basisEventId:`danger-gal-day-${x.day}`,source:x.source}));
  state.rumors=appendUnique(state.rumors.filter(x=>Number(x.expiresAtMinute||0)>now),[...streetRumors,...factionRumors],64);
  state.lastMinute=now;
  state.history=appendUnique(state.history,[projected({id:`sync:${now}`,atMinute:now,kind:'sync',actorCount:Object.keys(state.actors).length,factionCount:Object.keys(state.factions).length,consequenceCount:state.consequences.length,rumorCount:state.rumors.length,source:LIVING_WORLD_V2_SOURCE})],96);
  if(JSON.stringify(streetState?.campaign||{})!==beforeCampaign)throw new Error('Living World 2.0 attempted to mutate Street Stories campaign');
  return{ok:true,state,summary:{actors:Object.keys(state.actors).length,streetActors:streetActors.length,dangerGalActors:dangerIndex.characters.length,factions:Object.keys(state.factions).length,consequences:state.consequences.length,rumors:state.rumors.length,newConsequences:consequences.length,newRumors:streetRumors.length+factionRumors.length},source:LIVING_WORLD_V2_SOURCE};
}
