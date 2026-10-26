import {humanityLossForInstallation,humanityProfile} from './cpred_humanity.js';
import {cyberwareById} from './cpred_cyberware_catalog.js';
export const CHIPWARE_SOURCE='Cyberpunk RED Core Rulebook Digital v1.25 pp.112, 359-360';
function copy(v){return JSON.parse(JSON.stringify(v??{}))}
function arr(v){return Array.isArray(v)?v:[]}
function n(v,d=0){const x=Number(v);return Number.isFinite(x)?x:d}
export function normalizeChipwareState(state={}){return{usedInstanceIds:[...new Set(arr(state?.usedInstanceIds).map(String))],sockets:copy(state?.sockets||{})}}
function sockets(character){return arr(character?.cyberware).filter(x=>x?.installed!==false&&(x?.id==='chipware_socket'||x?.chipwareSocket===true))}
function activeChips(character){return arr(character?.cyberware).filter(x=>x?.installed!==false&&x?.chipware===true)}
function repro(character,cyberware,currentHumanity){const baseEmp=n(character?.stats?.EMP,character?.derived?.baseEmp);return humanityProfile({baseEmp,currentHumanity,cyberware})}
export function validateChipwareInsert({character,chipId,chipInstanceId,socketInstanceId,chipDefinition=null}={}){
 const chip=chipDefinition?.id===chipId?copy(chipDefinition):cyberwareById(chipId);if(!chip?.chipware)return{ok:false,reason:'chipware-required'};if(!chipInstanceId)return{ok:false,reason:'chip-instance-required'};
 const ss=sockets(character);if(!ss.length)return{ok:false,reason:'chipware-socket-required'};
 const socket=ss.find(x=>String(x.instanceId||'')===String(socketInstanceId||''));if(!socket)return{ok:false,reason:'socket-not-found'};
 if(activeChips(character).some(x=>String(x.chipInstanceId||'')===String(chipInstanceId)))return{ok:false,reason:'chip-already-installed'};
 if(activeChips(character).some(x=>String(x.socketInstanceId||'')===String(socketInstanceId)))return{ok:false,reason:'socket-occupied'};
 return{ok:true,chip,socket,consumesAction:true,source:CHIPWARE_SOURCE};
}
export function insertChipware({character,chipId,chipInstanceId,socketInstanceId,chipDefinition=null,rng=Math.random}={}){
 const valid=validateChipwareInsert({character,chipId,chipInstanceId,socketInstanceId,chipDefinition});if(!valid.ok)return valid;
 const out=copy(character),state=normalizeChipwareState(out?.roleAbilityState?.chipware||out?.chipwareState||{}),used=state.usedInstanceIds.includes(String(chipInstanceId));
 const loss=used?0:humanityLossForInstallation({atCharacterGeneration:false,presetLoss:valid.chip.humanityLossPreset,postGenerationLoss:valid.chip.humanityLossDice,rng});
 out.cyberware=arr(out.cyberware);const installed={...copy(valid.chip),instanceId:`chip:${chipInstanceId}`,chipInstanceId:String(chipInstanceId),socketInstanceId:String(socketInstanceId),installed:true};out.cyberware.push(installed);
 if(!used)state.usedInstanceIds.push(String(chipInstanceId));state.sockets[String(socketInstanceId)]=String(chipInstanceId);out.chipwareState=state;
 out.derived=out.derived||{};const current=n(out.derived.humanity,n(out.stats?.EMP)*10)-loss,profile=repro(out,out.cyberware,current);Object.assign(out.derived,{humanity:profile.humanity,maxHumanity:profile.maxHumanity,currentEmp:profile.emp,cyberpsychosis:profile.level,gmControl:profile.gmControl});
 return{ok:true,success:true,character:out,installed,humanityLoss:loss,firstUse:!used,consumesAction:true,profile,source:CHIPWARE_SOURCE};
}
export function removeChipware({character,chipInstanceId}={}){
 const out=copy(character),idx=arr(out.cyberware).findIndex(x=>x?.chipware===true&&String(x.chipInstanceId||'')===String(chipInstanceId||''));if(idx<0)return{ok:false,reason:'chip-not-installed'};
 const [removed]=out.cyberware.splice(idx,1),state=normalizeChipwareState(out.chipwareState||{});if(removed.socketInstanceId)delete state.sockets[String(removed.socketInstanceId)];out.chipwareState=state;
 out.derived=out.derived||{};const profile=repro(out,out.cyberware,n(out.derived.humanity,n(out.stats?.EMP)*10));Object.assign(out.derived,{humanity:profile.humanity,maxHumanity:profile.maxHumanity,currentEmp:profile.emp,cyberpsychosis:profile.level,gmControl:profile.gmControl});
 return{ok:true,success:true,character:out,removed,consumesAction:true,profile,source:CHIPWARE_SOURCE};
}
