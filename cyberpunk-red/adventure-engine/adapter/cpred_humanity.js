// Cyberpunk RED Core v1.25 pp.108-111, 230-232 — Humanity, cyberware and cyberpsychosis.
export const HUMANITY_SOURCE='Cyberpunk RED Core Rulebook Digital v1.25 pp.108-111, 230-232';
function n(v,d=0){const x=Number(v);return Number.isFinite(x)?x:d}
function copy(v){return JSON.parse(JSON.stringify(v??{}))}
export function humanityPenaltyForCyberware(item={}){
  if(item.medicalGrade===true)return 0;
  const nominal=n(item.humanityLossTypical ?? item.humanityLossPreset ?? item.humanityLoss,0);
  if(item.maxHumanityPenaltyEligible===false||nominal<=0)return 0;
  return item.borgware===true||String(item.classification||item.type||'').toLowerCase()==='borgware'?4:2;
}
export function maximumHumanity({baseEmp,cyberware=[]}={}){
  const base=Math.max(0,Math.trunc(n(baseEmp,0)))*10;
  const penalty=(Array.isArray(cyberware)?cyberware:[]).reduce((s,x)=>s+humanityPenaltyForCyberware(x),0);
  return Math.max(0,base-penalty);
}
export function empathyFromHumanity(humanity){
  const h=n(humanity,0);if(h<0)return 0;return Math.max(0,Math.floor(h/10));
}
export function cyberpsychosisState({humanity}={}){
  const h=n(humanity,0),emp=empathyFromHumanity(h);
  if(h<0)return{emp,level:'extreme_cyberpsychosis',gmControl:true,traitsMinimum:5};
  if(emp===0)return{emp,level:'cyberpsychosis',gmControl:false,traitsMinimum:5};
  if(emp===1)return{emp,level:'dissociative_borderline_cyberpsychosis',gmControl:false,traitsMinimum:3};
  if(emp===2)return{emp,level:'borderline_dissociative',gmControl:false,traitsMinimum:0};
  return{emp,level:'none',gmControl:false,traitsMinimum:0};
}
export function humanityProfile({baseEmp,currentHumanity,cyberware=[]}={}){
  const maxHumanity=maximumHumanity({baseEmp,cyberware});
  const humanity=n(currentHumanity,maxHumanity);
  return{baseEmp:Math.max(0,Math.trunc(n(baseEmp,0))),humanity,maxHumanity,...cyberpsychosisState({humanity}),source:HUMANITY_SOURCE};
}
function d(sides,rng){return Math.floor(rng()*sides)+1}
export function rollHumanityLoss(expression,rng=Math.random){
  if(expression===null||expression===undefined||expression==='')return 0;
  if(Number.isFinite(Number(expression)))return Math.max(0,Math.trunc(Number(expression)));
  const raw=String(expression).trim().toLowerCase().replace(/\s+/g,'');
  let m=raw.match(/^(\d+)d6$/);if(m){let t=0;for(let i=0;i<Number(m[1]);i++)t+=d(6,rng);return t}
  m=raw.match(/^(\d+)d6\/2(?:roundup)?$/);if(m){let t=0;for(let i=0;i<Number(m[1]);i++)t+=d(6,rng);return Math.ceil(t/2)}
  m=raw.match(/^(\d+)d6\/2rounddown$/);if(m){let t=0;for(let i=0;i<Number(m[1]);i++)t+=d(6,rng);return Math.floor(t/2)}
  throw new Error(`Unsupported Humanity Loss expression: ${expression}`);
}
export function humanityLossForInstallation({atCharacterGeneration=false,presetLoss=0,postGenerationLoss='0',rng=Math.random}={}){
  return atCharacterGeneration?Math.max(0,Math.trunc(n(presetLoss,0))):rollHumanityLoss(postGenerationLoss,rng);
}
export function applyHumanityLoss({baseEmp,currentHumanity,cyberware=[],loss=0}={}){
  const after=n(currentHumanity,maximumHumanity({baseEmp,cyberware}))-Math.max(0,n(loss,0));
  return humanityProfile({baseEmp,currentHumanity:after,cyberware:copy(cyberware)});
}
