/* Braseiro Cyberpunk RED - deterministic Elflines Online integration layer.
 * ELO is a rules/content subsystem, not narrator-owned state. The Razorfire Caverns
 * text in the base DLC is an in-world play vignette, not a published adventure graph.
 */
import {createEloState,validateEloCharacter,buildEloAiContext,ELO_RULES_VERSION} from './elflines_rules_engine.js';
const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
const assert=(ok,msg)=>{if(!ok)throw new Error(msg)};
export const ELO_SESSION_VERSION=1;
export const ELO_SOURCE_PACKS=Object.freeze({
 base:{id:'elflines_online',kind:'RULES_CONTENT_PACK',source:'RTG-CPR-ElflinesOnline.pdf',features:['character_creation','armory','miasma','pvp','healing','death_respawn','progression','economy','gm_encounter_guidance','razorfire_caverns_vignette']},
 ep1:{id:'elflines_online_ep1',kind:'CONTENT_PACK',source:'RTG-CPR-ElflinesOnlineEP1.pdf',features:['night_city_players','night_city_elo_pcs','pregenerated_elves','social_hooks']}
});
export const ELO_RAZORFIRE_CLASSIFICATION=Object.freeze({id:'razorfire_caverns',kind:'SOURCE_VIGNETTE',playableAdventure:false,reason:'Base DLC presents Razorfire Caverns as Daeric Sylar play fiction/example; it does not publish a complete authored quest/dungeon state graph.'});
export function createEloSession({sessionId,playerCharacterId,eloCharacter,worldLocationId=null,realWorldState={}}={}){
 assert(sessionId,'sessionId required');assert(playerCharacterId,'playerCharacterId required');
 const character=eloCharacter?.version===ELO_RULES_VERSION?clone(eloCharacter):createEloState(eloCharacter||{});
 const valid=validateEloCharacter(character);assert(valid.ok,valid.errors.join('; '));
 return{version:ELO_SESSION_VERSION,sessionId:String(sessionId),playerCharacterId:String(playerCharacterId),character,worldLocationId,realWorldState:clone(realWorldState),content:{base:true,ep1:false},encounter:null,history:[{type:'ELO_SESSION_CREATED'}]};
}
export function enableEloPack(session,packId){const s=clone(session);assert(ELO_SOURCE_PACKS[packId],`unknown ELO pack ${packId}`);s.content[packId]=true;s.history.push({type:'ELO_PACK_ENABLED',packId});return s}
export function enterEloEncounter(session,{encounterId,locationId,miasma=false,source='GM_OR_ADVENTURE_ENGINE'}={}){const s=clone(session);assert(encounterId,'encounterId required');assert(locationId,'locationId required');s.encounter={encounterId:String(encounterId),locationId:String(locationId),miasma:!!miasma,source,status:'ACTIVE'};s.character.miasma=!!miasma;s.history.push({type:'ELO_ENCOUNTER_ENTER',encounterId:s.encounter.encounterId,locationId:s.encounter.locationId,miasma:!!miasma});return s}
export function leaveEloEncounter(session){const s=clone(session);if(s.encounter)s.encounter.status='RESOLVED';s.character.miasma=false;s.history.push({type:'ELO_ENCOUNTER_LEAVE'});return s}
export function routeEloSocialAuthority({targetKind}={}){return targetKind==='REAL_PLAYER'?'CYBERPUNK_RED_CHARACTER':'ELFLINES_CHARACTER'}
export function serializeEloSession(session){assert(session?.version===ELO_SESSION_VERSION,'unsupported ELO session version');return JSON.stringify(session)}
export function loadEloSession(payload){const raw=typeof payload==='string'?JSON.parse(payload):clone(payload);assert(raw&&raw.version===ELO_SESSION_VERSION,'unsupported ELO session version');assert(raw.character?.version===ELO_RULES_VERSION,'unsupported ELO rules version');const valid=validateEloCharacter(raw.character);assert(valid.ok,valid.errors.join('; '));return raw}
export function buildEloAdventureContext(session){const rules=buildEloAiContext(session.character);return Object.freeze({mode:'ELFLINES_ONLINE',readOnly:true,sessionId:session.sessionId,worldLocationId:session.worldLocationId,encounter:clone(session.encounter),rules,sourcePacks:Object.keys(session.content).filter(k=>session.content[k]),razorfire:ELO_RAZORFIRE_CLASSIFICATION,authority:{mechanics:'RULES_ENGINE',persistentState:'ADVENTURE_ENGINE',narration:'AI_READ_ONLY'},forbidden:['mutate_state','fabricate_rolls','invent_source_quests','reveal_sealed_information','force_scene','decide_player_choices','bypass_rules_engine']})}
