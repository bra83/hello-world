export const CYBERCHAIRS={
 mercurius:{id:'mercurius',costEb:100,priceCategory:'premium',move:5,optionSlots:0,empImmune:true},
 spider:{id:'spider',costEb:1000,priceCategory:'very_expensive',move:5,optionSlots:4,empImmune:true}
};
const LIMB_OPTION_TYPES=new Set(['cyberarm','cyberleg','cyberlimb']);
export function createCyberchair(model='mercurius'){
 const spec=CYBERCHAIRS[model]; if(!spec) throw new Error('UNKNOWN_CYBERCHAIR');
 return {model,pilotId:null,control:null,conscious:false,armorPenalty:0,moveInjuryPenalty:0,options:[],...spec};
}
export function mountCyberchair(chair,pilot,{interfacePlug=false,dedicatedHand=false}={}){
 if(!pilot?.id) throw new Error('PILOT_REQUIRED');
 if(!interfacePlug&&!dedicatedHand) throw new Error('CONTROL_METHOD_REQUIRED');
 return {...chair,pilotId:pilot.id,control:interfacePlug?'interface_plug':'armrest_hand',conscious:pilot.conscious!==false};
}
export function controlState(chair){
 const active=!!chair.pilotId&&chair.conscious;
 return {active,handsFree:active&&chair.control==='interface_plug',occupiedHands:active&&chair.control==='armrest_hand'?1:0,removable:!chair.conscious};
}
export function effectiveMove(chair){return Math.max(0,chair.move-(chair.armorPenalty||0)-(chair.moveInjuryPenalty||0));}
export function movementCapabilities(chair){return {move:effectiveMove(chair),run:true,jump:true,climb:true,swim:true,getUp:true,stairsPenalty:0};}
export function redirectTarget(chair,targetId){return chair.pilotId&&targetId===chair.model?chair.pilotId:targetId;}
export function applyMoveCriticalInjury(chair,{movePenalty=0}={}){return {...chair,moveInjuryPenalty:(chair.moveInjuryPenalty||0)+Math.max(0,movePenalty)};}
export function repairChairMoveInjury(chair,{points=Infinity,skill='cybertech'}={}){
 if(!['cybertech','quick_fix','treatment'].includes(skill)) throw new Error('INVALID_REPAIR_METHOD');
 return {...chair,moveInjuryPenalty:Math.max(0,(chair.moveInjuryPenalty||0)-points)};
}
export function installCyberlimbOption(chair,option={}){
 if(chair.model!=='spider') throw new Error('CYBERWARE_OPTIONS_NOT_SUPPORTED');
 if(!LIMB_OPTION_TYPES.has(option.type)) throw new Error('INVALID_CYBERCHAIR_OPTION');
 if(chair.options.length>=4) throw new Error('CYBERCHAIR_OPTION_SLOTS_FULL');
 return {...chair,options:[...chair.options,{...option,paired:true,installCostBasis:'cyberlimb'}]};
}
export function applyEmp(chair){return chair.empImmune?{...chair,empDisabled:false}:{...chair,empDisabled:true};}
