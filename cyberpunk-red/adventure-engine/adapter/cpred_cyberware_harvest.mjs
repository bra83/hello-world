import {installationDefinition} from './cpred_cyberware_surgery.mjs';
export const CYBERWARE_HARVEST_SOURCE='Cyberpunk RED Core Rulebook Digital v1.25 p.226';
function n(v,d=0){const x=Number(v);return Number.isFinite(x)?x:d}
function d10(rng){const natural=Math.floor(rng()*10)+1;if(natural===10){const extra=Math.floor(rng()*10)+1;return{natural,extra,total:natural+extra,critical:'success'}}if(natural===1){const extra=Math.floor(rng()*10)+1;return{natural,extra,total:natural-extra,critical:'failure'}}return{natural,extra:0,total:natural,critical:null}}
export function resolveCyberwareHarvest({item,clinicianRole,tech=0,surgery=0,rng=Math.random}={}){
  if(!item?.id)return{ok:false,reason:'cyberware-required'};
  if(item.quickRemovable===true||item.kind==='chipware'||item.quickChangeMount===true)return{ok:true,success:true,destroyed:false,consumesAction:true,elapsedMinutes:0,harvested:{...item},source:CYBERWARE_HARVEST_SOURCE};
  const level=String(item.typicalInstall||item.install||'').toLowerCase(),def=installationDefinition(level);if(!def)return{ok:false,reason:'invalid-installation-level'};
  if(String(clinicianRole||'').toLowerCase()!=='medtech')return{ok:false,reason:'medtech-required'};
  const roll=d10(rng),total=n(tech)+n(surgery)+roll.total,success=total>def.dv;
  return success?{ok:true,success:true,total,dv:def.dv,roll,destroyed:false,elapsedMinutes:240,harvested:{...item},source:CYBERWARE_HARVEST_SOURCE}:{ok:true,success:false,total,dv:def.dv,roll,destroyed:true,elapsedMinutes:120,harvested:null,source:CYBERWARE_HARVEST_SOURCE};
}
