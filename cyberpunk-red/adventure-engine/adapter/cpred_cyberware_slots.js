export const CYBERWARE_SLOT_SOURCE='Cyberpunk RED Core Rulebook Digital v1.25 pp.111-116, 358-367';
export const SLOT_RULES={
  fashionware:{mode:'category',capacity:7},
  internal:{mode:'category',capacity:7},
  external:{mode:'category',capacity:7},
  neuralware:{mode:'foundation',foundationId:'neural_link',capacity:5,maxFoundations:1},
  cyberoptics:{mode:'foundation',foundationId:'cybereye',capacity:3,maxFoundations:2,maxBonusId:'multioptic_mount',maxBonus:5},
  cyberaudio:{mode:'foundation',foundationId:'cyberaudio_suite',capacity:3,maxFoundations:1,capacityBonusId:'sensor_array',capacityBonus:5},
  cyberarm:{mode:'foundation',foundationId:'cyberarm',capacity:4,maxFoundations:2,maxBonusId:'artificial_shoulder_mount',maxBonus:2},
  cyberleg:{mode:'foundation',foundationId:'cyberleg',capacity:3,maxFoundations:2},
};
function arr(v){return Array.isArray(v)?v:[]}
function slots(x){return x?.noSlot===true?0:Math.max(0,Number(x?.slotsUsed??1))}
function live(installed){return arr(installed).filter(x=>x?.installed!==false)}
function has(all,id){return all.some(x=>x?.id===id)}
function ruleMax(rule,all){return Number(rule.maxFoundations??Infinity)+(rule.maxBonusId&&has(all,rule.maxBonusId)?Number(rule.maxBonus||0):0)}
function ruleCapacity(rule,foundation,all){return Number(foundation?.optionSlots??rule.capacity??0)+(rule.capacityBonusId&&has(all,rule.capacityBonusId)?Number(rule.capacityBonus||0):0)}
function foundationIdsFor(candidate,rule){return arr(candidate?.compatibleFoundationIds).length?candidate.compatibleFoundationIds:[rule?.foundationId].filter(Boolean)}
function matchesFoundationId(x,id){return x?.foundation===true&&(x.id===id||x.foundationAlias===id)}
function foundationsFor(all,candidate,rule){const ids=foundationIdsFor(candidate,rule);return all.filter(x=>ids.some(id=>matchesFoundationId(x,id)))}
function fid(x){return String(x?.instanceId||x?.id||'')}
function optionTargetsFoundation(x,foundation,all,rule){
  if(x?.foundation===true||slots(x)===0)return false;
  const target=String(x?.targetFoundationInstanceId||'');if(target)return target===fid(foundation);
  // Legacy pre-instance rows: only attribute an untargeted option when there is a single compatible foundation.
  const compatible=foundationsFor(all,x,rule);return compatible.length===1&&fid(compatible[0])===fid(foundation);
}
function usageForFoundation(all,foundation,rule){return all.filter(x=>optionTargetsFoundation(x,foundation,all,rule)).reduce((s,x)=>s+slots(x),0)}
export function cyberwareSlotUsage(installed,category){
  const all=live(installed),rule=SLOT_RULES[category];if(!rule||rule.mode!=='category')return all.filter(x=>x?.cyberwareCategory===category&&!x?.foundation).reduce((s,x)=>s+slots(x),0);
  return all.filter(x=>x?.cyberwareCategory===category&&!x?.foundation).reduce((s,x)=>s+slots(x),0);
}
export function validateCyberwareSlotInstall({installed=[],candidate,targetFoundationInstanceId=null}={}){
  if(!candidate?.id)return{ok:false,reason:'cyberware-required'};
  const all=live(installed),category=candidate.cyberwareCategory,rule=SLOT_RULES[category];
  if(candidate.cyberfinger===true){const hands=all.filter(x=>Number(x.cyberfingerCapacity||0)>0),target=targetFoundationInstanceId?hands.find(x=>fid(x)===String(targetFoundationInstanceId)):hands.map(h=>({h,used:all.filter(x=>x?.cyberfinger===true&&String(x.targetFoundationInstanceId||'')===fid(h)).length,cap:Number(h.cyberfingerCapacity||0)})).filter(x=>x.used<x.cap).sort((a,b)=>a.used-b.used)[0]?.h||null;if(!target)return{ok:false,reason:'modular-finger-cyberhand-required'};const used=all.filter(x=>x?.cyberfinger===true&&String(x.targetFoundationInstanceId||'')===fid(target)).length,capacity=Number(target.cyberfingerCapacity||0);return used<capacity?{ok:true,foundationInstanceId:fid(target),capacity,used,need:1,remaining:capacity-used-1,source:CYBERWARE_SLOT_SOURCE}:{ok:false,reason:'cyberfinger-capacity-exceeded',foundationInstanceId:fid(target),capacity,used,remaining:0,source:CYBERWARE_SLOT_SOURCE}}
  // Cross-limb options (Hardened Shielding / coverings) declare compatibleFoundationIds explicitly.
  if(arr(candidate.compatibleFoundationIds).length){
    const foundations=foundationsFor(all,candidate,null);if(!foundations.length)return{ok:false,reason:'foundation-required',foundationIds:candidate.compatibleFoundationIds};
    if(candidate.noSlot===true)return{ok:true,capacity:null,used:0,need:0,remaining:null,foundationInstanceId:targetFoundationInstanceId||fid(foundations[0]),source:CYBERWARE_SLOT_SOURCE};
    let foundation=targetFoundationInstanceId?foundations.find(x=>fid(x)===String(targetFoundationInstanceId)):null;
    if(!foundation){foundation=foundations.map(f=>{const r=SLOT_RULES[f.cyberwareCategory];return{f,used:usageForFoundation(all,f,r),capacity:ruleCapacity(r,f,all)}}).filter(x=>x.used+slots(candidate)<=x.capacity).sort((a,b)=>a.used-b.used)[0]?.f||null}
    if(!foundation)return{ok:false,reason:'option-slots-exceeded'};
    const fr=SLOT_RULES[foundation.cyberwareCategory],used=usageForFoundation(all,foundation,fr),capacity=ruleCapacity(fr,foundation,all),need=slots(candidate);
    return used+need<=capacity?{ok:true,foundationInstanceId:fid(foundation),capacity,used,need,remaining:capacity-used-need,source:CYBERWARE_SLOT_SOURCE}:{ok:false,reason:'option-slots-exceeded',foundationInstanceId:fid(foundation),capacity,used,need,remaining:capacity-used,source:CYBERWARE_SLOT_SOURCE};
  }
  if(!rule)return{ok:true,reason:null,capacity:null,used:0,remaining:null,source:CYBERWARE_SLOT_SOURCE};
  if(candidate.foundation===true){
    const current=all.filter(x=>matchesFoundationId(x,rule.foundationId)).length,max=ruleMax(rule,all);
    if(current>=max)return{ok:false,reason:'foundation-limit',maxFoundations:max};
    const capacity=ruleCapacity(rule,candidate,all);return{ok:true,foundation:true,capacity,used:0,remaining:capacity,source:CYBERWARE_SLOT_SOURCE};
  }
  if(rule.mode==='category'){
    const used=cyberwareSlotUsage(all,category),need=slots(candidate);return used+need<=rule.capacity?{ok:true,capacity:rule.capacity,used,need,remaining:rule.capacity-used-need,source:CYBERWARE_SLOT_SOURCE}:{ok:false,reason:'option-slots-exceeded',capacity:rule.capacity,used,need,remaining:rule.capacity-used,source:CYBERWARE_SLOT_SOURCE};
  }
  const foundations=foundationsFor(all,candidate,rule);
  if(!foundations.length){
    if(candidate.foundationOptional===true)return{ok:true,capacity:null,used:0,need:0,remaining:null,source:CYBERWARE_SLOT_SOURCE};
    return{ok:false,reason:'foundation-required',foundationId:rule.foundationId};
  }
  if(candidate.foundationOptional===true&&!targetFoundationInstanceId)return{ok:true,capacity:null,used:0,need:0,remaining:null,source:CYBERWARE_SLOT_SOURCE};
  let foundation=targetFoundationInstanceId?foundations.find(x=>fid(x)===String(targetFoundationInstanceId)):null;
  if(!foundation){
    // Paired options must occupy different foundations; otherwise pick the least-used compatible foundation.
    const already=new Set(all.filter(x=>x?.id===candidate.id&&x?.targetFoundationInstanceId).map(x=>String(x.targetFoundationInstanceId)));
    const choices=foundations.map(f=>({f,used:usageForFoundation(all,f,rule),capacity:ruleCapacity(rule,f,all)})).filter(x=>x.used+slots(candidate)<=x.capacity&&(!candidate.paired||!already.has(fid(x.f)))).sort((a,b)=>a.used-b.used);
    foundation=choices[0]?.f||null;
  }
  if(!foundation)return{ok:false,reason:candidate.paired?'paired-foundation-required':'option-slots-exceeded'};
  const used=usageForFoundation(all,foundation,rule),capacity=ruleCapacity(rule,foundation,all),need=slots(candidate);
  return used+need<=capacity?{ok:true,foundationInstanceId:fid(foundation),capacity,used,need,remaining:capacity-used-need,source:CYBERWARE_SLOT_SOURCE}:{ok:false,reason:'option-slots-exceeded',foundationInstanceId:fid(foundation),capacity,used,need,remaining:capacity-used,source:CYBERWARE_SLOT_SOURCE};
}
export function benefitsStack(candidate){return candidate?.benefitsStack===true}
