import fs from 'node:fs';
export function loadDangerGalPlus(path){ const d=JSON.parse(fs.readFileSync(path,'utf8')); if(d.schema!=='cpred.danger_gal.dossier_plus.v1') throw new Error('schema'); return d; }
export function indexDangerGalPlus(d){ return {npcs:new Map(d.npcs.map(x=>[x.id,x])),items:new Map(d.items.map(x=>[x.id,x]))}; }
export function encounterSeed(d,{npcId,sceneId,day=0}){ const n=indexDangerGalPlus(d).npcs.get(npcId); if(!n) throw new Error('unknown npc'); return {type:'DANGER_GAL_PLUS_ENCOUNTER_SEED',npcId:n.id,sceneId,day,canonical:false,projected:true,sourceBound:true,requiresMasterResolution:true,mutatesCampaignState:false}; }
export function itemUseGate(d,itemId){ const x=indexDangerGalPlus(d).items.get(itemId); if(!x) return {allowed:false,reason:'UNKNOWN_ITEM'}; return {allowed:true,item:x,requiresRuntimeResolution:true,sourceBound:true}; }
