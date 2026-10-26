export const SOURCE='Interface RED Vol.5 v1.1, Chasing the Rabbit pp.18-21';
export function initiative(move=0,roll=0){return Number(move)+Number(roll)}
export function createJam(a='A',b='B'){return{source:SOURCE,round:0,contact:false,finished:false,winner:null,squads:{[a]:{points:0,penalties:0,players:{}},[b]:{points:0,penalties:0,players:{}}}}}
export function advanceRound(j){j.round=(j.round||0)+1;j.contact=j.round>2;return j}
export function scoreRabbit(j,squad,points=1){if(!j.finished){j.squads[squad].points+=Math.max(0,+points||0);if(j.squads[squad].points>=10){j.finished=true;j.winner=squad}}return j}
export function addPenalty(j,squad,player){const s=j.squads[squad];s.penalties++;const p=(s.players[player]=s.players[player]||{penalties:0,boxRounds:0,ejected:false});p.penalties++;p.boxRounds=4;if(p.penalties>=3)p.ejected=true;if(s.penalties>=10){j.finished=true;j.winner=Object.keys(j.squads).find(x=>x!==squad)}return j}
export function bump({brawling=0,evasion=0,evasionRoll=0}={}){const success=+brawling>+evasion;return{success,forcedMoveMeters:success?4:0,prone:success&&+evasionRoll===1,damage:0,source:SOURCE}}
export function skateOrDie({athletics=0,baseMove=0}={}){const success=+athletics>=13;return{success,move:Math.max(1,+baseMove+(success?2:-2)),actionConsumed:true,source:SOURCE}}
export function whip({position='blocker',targetPosition='jammer'}={}){const legal=['blocker','jammer'].includes(position)&&targetPosition!=='rabbit';return{legal,extraMoveMeters:legal?8:0,penalty:!legal,source:SOURCE}}
export function guard({position='blocker',distanceMeters=99,attackSucceeded=false}={}){const armed=position==='blocker'&&+distanceMeters<=4;return{armed,attackCanceled:armed&&!!attackSucceeded,pushMeters:armed&&attackSucceeded?2:0,source:SOURCE}}
