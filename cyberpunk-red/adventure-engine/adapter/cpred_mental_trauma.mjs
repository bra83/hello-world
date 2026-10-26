import {humanityProfile} from './cpred_humanity.mjs';
export const MENTAL_TRAUMA_SOURCE='Cyberpunk RED Core Rulebook Digital v1.25 p.231';
export const TRAUMA_TYPES={
  traumatic_physical:{id:'traumatic_physical',dice:1,examples:'Torture'},
  traumatic_mental:{id:'traumatic_mental',dice:1,examples:'Horrific death or mutilation'},
  long_term_mental_stress:{id:'long_term_mental_stress',dice:2,examples:'Kidnapping, imprisonment, long-term abuse'},
  long_term_environmental_stress:{id:'long_term_environmental_stress',dice:2,examples:'Starvation, war zone, long-term disaster or constant danger for a month'},
};
function d6(rng){return Math.floor(rng()*6)+1}
export function resolveMentalTrauma({type,authority,baseEmp,currentHumanity,cyberware=[],rng=Math.random}={}){
  const def=TRAUMA_TYPES[type];if(!def)return{ok:false,reason:'unknown-trauma'};if(authority!=='master')return{ok:false,reason:'master-authority-required'};
  let loss=0;for(let i=0;i<def.dice;i++)loss+=d6(rng);const profile=humanityProfile({baseEmp,currentHumanity:Number(currentHumanity||0)-loss,cyberware});
  return{ok:true,type,loss,profile,source:MENTAL_TRAUMA_SOURCE};
}
