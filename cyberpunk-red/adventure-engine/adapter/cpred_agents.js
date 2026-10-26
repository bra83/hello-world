export const SOURCE='Interface RED Vol.5 v1.1, All About Agents pp.27-29';
const REMOTE={poor:17,standard:21,excellent:24},PHYSICAL={poor:15,standard:17,excellent:21};
export function hackDV({quality='standard',physical=false}={}){return (physical?PHYSICAL:REMOTE)[String(quality).toLowerCase()]??(physical?17:21)}
export function hackAgent({quality='standard',physical=false,skillBase=0,roll=0,securityInfo=false,interfaceRank=0,crunchWhistle=false,hasBreacher=false,external=true,lineOfSight=true,distanceMeters=0}={}){if(!physical&&(!hasBreacher||!external||!lineOfSight||+distanceMeters>20))return{possible:false,reason:'remote_requirements',source:SOURCE};const dv=hackDV({quality,physical}),total=+skillBase + +roll +(securityInfo?2:0)+(crunchWhistle?(+interfaceRank||0):0);return{possible:true,dv,total,success:total>=dv,detected:total<dv,alertAtSeconds:total<dv?30:null,breachSeconds:60,source:SOURCE}}
export const COMMANDS={basic:{seconds:3},core:{seconds:60},secure:{seconds:300}};
export function implantCommand({breached=false,type='basic'}={}){const r=COMMANDS[type];return{success:!!breached&&!!r,type,seconds:r?.seconds??null,maxDurationHours:type==='secure'?24:null,source:SOURCE}}
export function detectHack({skillBase=0,roll=0,initialDV=21}={}){const total=+skillBase + +roll;return{total,dv:+initialDV,detected:total>=+initialDV,source:SOURCE}}
export function rebootAgent(){return{minutes:5,clearsCommands:true,disconnectsBreacher:true,source:SOURCE}}
export const GEAR={breacher:{cost:500,remoteHack:true,normalAgent:false},crunch_whistle:{cost:100,addsInterfaceRank:true},big_saai:{cost:100,librarySearchBonus:3}};
