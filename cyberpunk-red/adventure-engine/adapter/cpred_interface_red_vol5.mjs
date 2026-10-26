export const INTERFACE_RED_VOL5_SOURCE='Cyberpunk RED Interface RED Volume 5 v1.1 (CR3131)';
export const INVESTIGATION_SOURCE=`${INTERFACE_RED_VOL5_SOURCE} • Did Someone Say Murder?`;
export const CYBERPETS_SOURCE=`${INTERFACE_RED_VOL5_SOURCE} • Your New Best Friend`;
export const SCREAMSHEET_SOURCE=`${INTERFACE_RED_VOL5_SOURCE} • Screamsheet Generator`;
const n=v=>Number(v)||0, clamp=(v,a,b)=>Math.max(a,Math.min(b,Math.trunc(n(v))));
export const MYSTERY_COMPLEXITY=Object.freeze({easy:25,average:50,challenging:100,difficult:150,legendary:200});
export const OBFUSCATION=Object.freeze({none:0,light:2,heavy:4,near_total:6});
export const EVIDENCE_TYPES=Object.freeze({
 auditing:{label:'Auditing',damageDice:3,focusDice:2,skills:['accounting','bureaucracy']},
 autopsy:{label:'Autopsy',damageDice:4,focusDice:3,skills:['paramedic','surgery'],fumble:'body-evidence-damaged'},
 chemical:{label:'Chemical Analysis',damageDice:3,focusDice:2,skills:['basic_tech','science'],fumble:'sample-destroyed'},
 deciphering:{label:'Deciphering',damageDice:2,focusDice:1,skills:['cryptography']},
 digital:{label:'Digital Scavenging',damageDice:4,focusDice:3,skills:['electronics'],fumble:'device-destroyed'},
 forensics:{label:'Forensics',damageDice:4,focusDice:3,skills:['criminology','deduction'],fumble:'evidence-destroyed-beyond-repair'},
 gossip:{label:'Gossip',damageDice:2,focusDice:1,skills:['conversation','persuasion','streetwise']},
 interrogation:{label:'Interrogation',damageDice:3,focusDice:2,skills:['human_perception','interrogation'],fumble:'crew-cannot-retry-this-clue'},
 observation:{label:'Observation',damageDice:2,focusDice:1,skills:['human_perception','perception']},
 research:{label:'Research',damageDice:2,focusDice:1,skills:['education','library']}
});
export function focusMaximum({int=0,will=0}={}){return 10+5*Math.ceil((n(int)+n(will))/2)}
export function ensureVol5State(v={}){const s=(v&&typeof v==='object')?v:{};s.version=1;s.mysteries=Array.isArray(s.mysteries)?s.mysteries:[];s.cyberpets=Array.isArray(s.cyberpets)?s.cyberpets:[];s.screamsheets=Array.isArray(s.screamsheets)?s.screamsheets:[];s.history=Array.isArray(s.history)?s.history:[];return s}
export function createMystery({id=`mystery-${Date.now()}`,goal='',difficulty='average',int=0,will=0}={}){const max=focusMaximum({int,will}),cx=MYSTERY_COMPLEXITY[difficulty]||50;return{id,goal:String(goal||'Mystery'),difficulty,complexityMax:cx,complexity:cx,focusMax:max,focus:max,clues:[],solved:false,source:INVESTIGATION_SOURCE}}
const sum=a=>(Array.isArray(a)?a:[]).reduce((t,x)=>t+clamp(x,1,6),0);
export function resolveEvidence(mystery,{type='observation',total=0,dv=13,natural=0,obfuscation='none',damageRolls=[],focusRolls=[]}={}){if(!mystery||n(mystery.focus)<=0)return{ok:false,reason:'focus-depleted'};const spec=EVIDENCE_TYPES[type]||EVIDENCE_TYPES.observation,success=n(total)>n(dv),fumble=!success&&n(natural)===1,sp=OBFUSCATION[obfuscation]??0;let complexityDamage=0,focusDamage=0;if(success)complexityDamage=Math.max(0,sum(damageRolls)-sp);else focusDamage=sum(focusRolls);const after={...mystery,clues:[...(mystery.clues||[])]};after.complexity=Math.max(0,n(after.complexity)-complexityDamage);after.focus=Math.max(0,n(after.focus)-focusDamage);after.solved=after.complexity===0;const row={type,spec:spec.label,total:n(total),dv:n(dv),natural:n(natural),success,fumble,obfuscation,obfuscationValue:sp,complexityDamage,focusDamage,fumbleEffect:fumble?(spec.fumble||'gm-complication'):null};after.clues.push(row);return{ok:true,state:after,...row}}
export function recoverFocus(mystery,{int=0,will=0,concentrationTotal=0}={}){if(!mystery)return{ok:false,reason:'mystery-required'};const gain=n(int)+n(will)+(n(concentrationTotal)>15?5:0),after={...mystery};after.focus=Math.min(n(after.focusMax)||focusMaximum({int,will}),n(after.focus)+gain);return{ok:true,state:after,gain,concentrationBonus:n(concentrationTotal)>15?5:0}}
export function deductionHint(mystery,{total=0,focusRoll=1}={}){if(!mystery||n(mystery.focus)<=0)return{ok:false,reason:'focus-depleted'};const after={...mystery},focusDamage=clamp(focusRoll,1,6);after.focus=Math.max(0,n(after.focus)-focusDamage);return{ok:true,state:after,success:n(total)>15,dv:15,focusDamage}}
export const CYBERPETS=Object.freeze([
 {id:'datarabbit',name:'Datarabbit™',price:1000,lifestyle:'generic_prepak',slots:2,level:'Mook'},
 {id:'forever_turtle',name:'Forever Turtle™',price:2000,lifestyle:'good_prepak',slots:2,level:'Hardened Mook'},
 {id:'neon_newt',name:'Neon Newt™',price:2000,lifestyle:'good_prepak',slots:1,level:'Hardened Mook'},
 {id:'obsidian_ocelot',name:'Obsidian Ocelot™',price:4000,lifestyle:'fresh_food',slots:3,level:'Hardened Lieutenant'},
 {id:'cyberbear',name:'Cyberbear™',price:20000,lifestyle:'fresh_food_x2',slots:3,level:'Mini-Boss'},
 {id:'cyberboa',name:'Cyberboa™',price:4000,lifestyle:'fresh_food',slots:3,level:'Hardened Lieutenant'},
 {id:'cyberrat',name:'Cyberrat™',price:1000,lifestyle:'generic_prepak',slots:2,level:'Mook'},
 {id:'cyberwolf',name:'Cyberwolf™',price:4000,lifestyle:'good_prepak',slots:3,level:'Hardened Lieutenant'}
]);
export function cyberpetById(id){return CYBERPETS.find(x=>x.id===id)||null}
export function cyberpetBeds(level='Mook'){const s=String(level).toLowerCase();return s.includes('boss')&&!s.includes('mini')?3:s.includes('mini-boss')?2:s.includes('lieutenant')?1:0}
export function purchaseCyberpet(state,{modelId,cash=0,serial=1}={}){const m=cyberpetById(modelId);if(!m)return{ok:false,reason:'model-required'};if(n(cash)<m.price)return{ok:false,reason:'insufficient-cash',required:m.price};const pet={instanceId:`cyberpet-${m.id}-${Math.max(1,Math.trunc(n(serial)||1))}`,modelId:m.id,name:m.name,price:m.price,lifestyle:m.lifestyle,slots:m.slots,level:m.level,beds:cyberpetBeds(m.level),trainedCyberware:[],source:CYBERPETS_SOURCE};return{ok:true,pet,cashAfter:n(cash)-m.price,state:{...state,cyberpets:[...(state.cyberpets||[]),pet]}}}
export function cyberpetObedience({int=0,animalHandling=0,wellCared=true}={}){const base=n(int)+n(animalHandling);return{base,obeys:base>=10&&Boolean(wellCared),requiresBase:10}}
export function trainCyberpetCyberware(pet,{int=0,animalHandling=0,roll=0,installationDv=13,cyberwareId='cyberware'}={}){if(!pet)return{ok:false,reason:'pet-required'};const total=n(int)+n(animalHandling)+n(roll),success=total>n(installationDv),after={...pet,trainedCyberware:[...(pet.trainedCyberware||[])]};if(success&&!after.trainedCyberware.includes(cyberwareId))after.trainedCyberware.push(cyberwareId);return{ok:true,success,total,dv:n(installationDv),days:1,state:after,restrictedToEatSleep:!success}}
export const SCREAMSHEET_TYPES=Object.freeze({news:{label:'News Flash! (Violence and Mishaps)',tables:['B1','B2','B3']},entertainment:{label:'In Neon Lights! (Entertainment News)',tables:['C1','C2','C3']},help:{label:'Help Wanted!',tables:['D1','D2','D3']}});
export function generateScreamsheetPlan({typeRoll=1,contentRolls=[1,1,1],tables={}}={}){const r=clamp(typeRoll,1,6),key=r<=2?'news':r<=4?'entertainment':'help',def=SCREAMSHEET_TYPES[key],rolls=[0,1,2].map(i=>clamp(contentRolls[i]??1,1,6)),content=def.tables.map((table,i)=>({table,roll:rolls[i],text:String(tables?.[table]?.[String(rolls[i])]||'')})),headlineTable=key==='news'?'B4':key==='entertainment'?'C4':'D4',headlineRoll=rolls[2],headlineKey=key==='news'?`NF${headlineRoll}`:key==='entertainment'?`NL${headlineRoll}`:String(headlineRoll),headline=String(tables?.[headlineTable]?.[headlineKey]||'');return{type:key,label:def.label,typeRoll:r,content,headlineTable,headlineRoll,headline,article:content.map(x=>x.text).filter(Boolean).join('\n\n'),source:SCREAMSHEET_SOURCE,complete:content.every(x=>x.text)&&Boolean(headline)}}
export function recordScreamsheet(state,plan){const row={id:`screamsheet-${Date.now()}`,...plan};state.screamsheets=[...(state.screamsheets||[]),row].slice(-40);return row}
