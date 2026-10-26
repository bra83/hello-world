// Cyberpunk RED Core v1.25 cyberware runtime effects.
import {campaignMinute} from './cpred_world_clock.js';
export const CYBERWARE_EFFECT_SOURCE='Cyberpunk RED Core Rulebook Digital v1.25 pp.110-116, 358-367';
function rows(v){return Array.isArray(v)?v.filter(x=>x?.installed!==false):[]}
function key(x){return String(x?.id||x?.name||'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'')}
export function cyberwareCount(cyberware,id){return rows(cyberware).filter(x=>key(x)===String(id)).length}
export function hasCyberware(cyberware,id,count=1){return cyberwareCount(cyberware,id)>=count}
export function normalizeCyberwareState(state={}){return {sandevistan:{activeUntilMinute:Math.max(0,Number(state?.sandevistan?.activeUntilMinute||0)),cooldownUntilMinute:Math.max(0,Number(state?.sandevistan?.cooldownUntilMinute||0))}}}
export function activateSandevistan({cyberware,state,clock}={}){
 const now=campaignMinute(clock),out=normalizeCyberwareState(state);if(!hasCyberware(cyberware,'sandevistan'))return{ok:false,reason:'sandevistan-not-installed'};
 if(now<out.sandevistan.activeUntilMinute)return{ok:false,reason:'already-active',state:out,remainingMinutes:out.sandevistan.activeUntilMinute-now};
 if(now<out.sandevistan.cooldownUntilMinute)return{ok:false,reason:'cooldown',state:out,remainingMinutes:out.sandevistan.cooldownUntilMinute-now};
 out.sandevistan.activeUntilMinute=now+1;out.sandevistan.cooldownUntilMinute=now+61;return{ok:true,state:out,activeUntilMinute:now+1,cooldownUntilMinute:now+61,consumesAction:true,source:CYBERWARE_EFFECT_SOURCE};
}
export function sandevistanStatus({cyberware,state,clock}={}){const now=campaignMinute(clock),s=normalizeCyberwareState(state).sandevistan,installed=hasCyberware(cyberware,'sandevistan');return{installed,active:installed&&now<s.activeUntilMinute,onCooldown:installed&&now>=s.activeUntilMinute&&now<s.cooldownUntilMinute,activeUntilMinute:s.activeUntilMinute,cooldownUntilMinute:s.cooldownUntilMinute,nowMinute:now}}
export function smartgunCyberwareReady(cyberware){return hasCyberware(cyberware,'neural_link')&&(hasCyberware(cyberware,'interface_plugs')||hasCyberware(cyberware,'subdermal_grip'))}
export function effectiveBodyFromCyberware(baseBody=0,cyberware=[]){let body=Math.max(0,Number(baseBody||0));body=Math.min(10,body+2*cyberwareCount(cyberware,'grafted_muscle_bone_lace'));if(hasCyberware(cyberware,'implanted_linear_frame_sigma'))body=Math.max(body,12);if(hasCyberware(cyberware,'implanted_linear_frame_beta'))body=Math.max(body,14);if(['black_chrome_fuma_kotaro_linear_frame_internal','black_chrome_lf_001_swat_linear_frame_internal','black_chrome_vermilion_linear_frame_internal'].some(id=>hasCyberware(cyberware,id)))body=Math.max(body,12);return body}
export function cyberwareArmorSp(cyberware=[]){if(hasCyberware(cyberware,'subdermal_armor'))return 11;if(hasCyberware(cyberware,'skin_weave'))return 7;return 0}
export function cyberwareModifiers({cyberware,state,clock,context={}}={}){
 const init=(hasCyberware(cyberware,'kerenzikov')?2:0)+(sandevistanStatus({cyberware,state,clock}).active?3:0),skillMods={},flags={},statOverrides={};
 const add=(id,v)=>skillMods[id]=(skillMods[id]||0)+v;
 if(context.sense==='sight'&&hasCyberware(cyberware,'image_enhance',2)){for(const id of ['perception','lipread','conceal'])add(id,2)}
 if(context.sense==='hearing'&&hasCyberware(cyberware,'amplified_hearing'))add('perception',2);
 if(hasCyberware(cyberware,'toxin_binders'))add('resist',2);
 if(hasCyberware(cyberware,'voice_stress_analyzer')){add('human_perception',2);add('interrogation',2)}
 if(context.singing&&hasCyberware(cyberware,'audiovox')){add('acting',2);add('instrument',2)}
 if(hasCyberware(cyberware,'medscanner')){add('first_aid',2);add('paramedic',2)}
 if(hasCyberware(cyberware,'techscanner'))for(const id of ['basic_tech','cybertech','land_tech','sea_tech','air_tech','electronics','weaponstech'])add(id,2);
 if(hasCyberware(cyberware,'chemskin')&&hasCyberware(cyberware,'techhair'))add('grooming',2);
 if(cyberwareCount(cyberware,'light_tattoo')>=3)add('wardrobe',2);
 if(hasCyberware(cyberware,'superchrome_covering'))add('wardrobe',2);
 if(hasCyberware(cyberware,'black_chrome_fuma_kotaro_linear_frame_internal'))add('stealth',2);
 if(context.baseStats)statOverrides.BODY=effectiveBodyFromCyberware(Number(context.baseStats.BODY||0),cyberware);
 flags.toxicGasImmune=hasCyberware(cyberware,'nasal_filters');flags.targetingScope=hasCyberware(cyberware,'targeting_scope');flags.smartgunCyberwareReady=smartgunCyberwareReady(cyberware);
 flags.flashImmune=hasCyberware(cyberware,'anti_dazzle',2);flags.loudNoiseImmune=hasCyberware(cyberware,'level_damper');flags.lowLightVision=hasCyberware(cyberware,'low_light_infrared_uv',2);flags.waterBreathing=hasCyberware(cyberware,'gills');flags.hardenedLimb=hasCyberware(cyberware,'hardened_shielding');flags.painEditor=hasCyberware(cyberware,'pain_editor');
 flags.radarSonar=hasCyberware(cyberware,'radar_sonar_implant');flags.olfactoryTracking=hasCyberware(cyberware,'olfactory_boost');flags.tactileMotion=hasCyberware(cyberware,'tactile_boost');
 flags.climbPenaltyNegated=hasCyberware(cyberware,'grip_foot',2)||hasCyberware(cyberware,'black_chrome_lf_001_swat_linear_frame_internal');flags.jumpPenaltyNegated=hasCyberware(cyberware,'jump_booster',2)||hasCyberware(cyberware,'black_chrome_vermilion_linear_frame_internal');flags.swimPenaltyNegated=hasCyberware(cyberware,'web_foot',2)||hasCyberware(cyberware,'black_chrome_lf_001_swat_linear_frame_internal');
 flags.cyberArmorSp=cyberwareArmorSp(cyberware);flags.restHealingMultiplier=hasCyberware(cyberware,'enhanced_antibodies')?2:1;flags.runMoveBonus=(hasCyberware(cyberware,'skate_foot',2)||hasCyberware(cyberware,'black_chrome_vermilion_linear_frame_internal'))?6:0;flags.blackChromeInternalLinearFrame=['black_chrome_fuma_kotaro_linear_frame_internal','black_chrome_lf_001_swat_linear_frame_internal','black_chrome_vermilion_linear_frame_internal'].find(id=>hasCyberware(cyberware,id))||null;
 let attackBonus=0;if(context.aimedShot&&flags.targetingScope)attackBonus+=1;if(Number(context.distance||0)>=51&&(context.singleShot||context.aimedShot)&&hasCyberware(cyberware,'teleoptics')&&!context.snipingScope)attackBonus+=1;
 return{initiativeBonus:init,attackBonus,skillMods,statOverrides,flags,sandevistan:sandevistanStatus({cyberware,state,clock}),source:CYBERWARE_EFFECT_SOURCE};
}
