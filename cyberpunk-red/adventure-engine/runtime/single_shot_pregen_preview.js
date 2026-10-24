/*
 * Source-bound, read-only Single Shot Pack pregen preview.
 * Does NOT create a playable character, install cyberware, credit cash,
 * equip items, or bypass the native Cyberpunk RED character factory.
 * The 10 source pages and the runtime mapping must be verified before promotion.
 */
import {getSingleShotLoadout,validateSingleShotLoadouts} from './single_shot_pregen_loadouts.js';
export const SINGLE_SHOT_PREVIEW_VERSION=1;
const copy=x=>JSON.parse(JSON.stringify(x));
const integer=x=>Number.isSafeInteger(x);
const validId=x=>typeof x==='string'&&/^ssp_pregen_(0[1-9]|10)$/.test(x);
const has=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);

export function validateSingleShotPregenPair(profile,loadout){
 if(!profile||!loadout||!validId(profile.id)||profile.id!==loadout.id||
    profile.sourceRef!==loadout.sourceRef)
   throw Error('PREGEN_SOURCE_ID_MISMATCH');
 if(profile.statsVerifiedFromPageImage!==true||profile.unresolvedStatExtraction!==false||
    loadout.imageVerified!==false||
    loadout.playablePromotion!=='BLOCKED_PENDING_RUNTIME_AND_VISUAL_REVIEW')
   throw Error('PREGEN_SOURCE_VERIFICATION_INCOMPLETE');
 if(!Array.isArray(profile.stats)||profile.stats.length!==10||
    profile.stats.some(x=>!integer(x)||x<1||x>10)||
    !Array.isArray(profile.skills)||profile.skills.length!==20||
    new Set(profile.skills.map(x=>x?.[0])).size!==20)
   throw Error('PREGEN_NUMERIC_PROFILE_INVALID');
 if(profile.skills.some(x=>!Array.isArray(x)||x.length!==5||
    typeof x[0]!=='string'||!x[0].trim()||
    x.slice(1).some(n=>!integer(n)||n<0)||
    x[1]+x[2]+x[3]!==x[4]))
   throw Error('PREGEN_SKILL_MATH_INVALID');
 if(!Array.isArray(profile.derived)||profile.derived.length!==4||
    profile.derived.some(x=>!integer(x)||x<0)||
    profile.derived[0]!==10+5*Math.ceil((profile.stats[5]+profile.stats[8])/2)||
    profile.derived[2]!==profile.stats[8]||
    Math.floor(profile.derived[3]/10)!==profile.stats[9]||
    profile.empathyMaximum*10!==profile.humanityMaximum)
   throw Error('PREGEN_DERIVED_MATH_INVALID');
 if(!Array.isArray(loadout.armor)||loadout.armor.length!==2||
    !Array.isArray(loadout.weapons)||!loadout.weapons.length||
    !Array.isArray(loadout.cyberware)||!Array.isArray(loadout.gear)||
    !integer(loadout.cashEb)||loadout.cashEb<0)
   throw Error('PREGEN_LOADOUT_INVALID');
 return true;
}

export function prepareSingleShotPregenPreview({id,skillProfile,loadout=null}={}){
 if(!validId(id)||skillProfile?.id!==id)throw Error('PREGEN_ID_REQUIRED');
 const equipment=loadout||getSingleShotLoadout(id);
 validateSingleShotPregenPair(skillProfile,equipment);
 const stats=['INT','REF','DEX','TECH','COOL','WILL','LUCK','MOVE','BODY','EMP'];
 const preview={
  version:SINGLE_SHOT_PREVIEW_VERSION,
  id,sourceRef:skillProfile.sourceRef,
  name:equipment.name,role:equipment.role,roleAbility:equipment.roleAbility,
  roleRank:equipment.roleRank,
  stats:Object.fromEntries(stats.map((key,i)=>[key,skillProfile.stats[i]])),
  derived:{hitPoints:skillProfile.derived[0],deathSave:skillProfile.derived[2],
    humanityCurrent:skillProfile.derived[3],humanityMaximum:skillProfile.humanityMaximum},
  skills:skillProfile.skills.map(([name,stat,level,modifier,total])=>({name,stat,level,modifier,total})),
  loadout:copy({cashEb:equipment.cashEb,armor:equipment.armor,
    weapons:equipment.weapons,cyberware:equipment.cyberware,gear:equipment.gear}),
  playable:false,characterCreated:false,inventoryCommitted:false,
  cyberwareInstalled:false,walletCredited:false,
  blockers:Object.freeze(['SOURCE_IMAGE_LOADOUT_VERIFICATION',
    'NATIVE_CHARACTER_FACTORY_MAPPING','ROLE_ABILITY_RUNTIME',
    'INVENTORY_AND_AMMUNITION_AUTHORITY','CYBERWARE_HUMANITY_AUTHORITY',
    'PERSISTENT_SAVE_ROUNDTRIP'])
 };
 return Object.freeze(preview);
}

export function prepareSingleShotRosterPreviews({profiles,loadouts}={}){
 validateSingleShotLoadouts(loadouts);
 if(!Array.isArray(profiles)||profiles.length!==10||
    new Set(profiles.map(p=>p?.id)).size!==10)throw Error('PREGEN_ROSTER_INVALID');
 return Object.freeze(loadouts.map((l,i)=>{
   const profile=profiles.find(p=>p.id===l.id);
   if(!profile)throw Error('PREGEN_PROFILE_MISSING');
   return prepareSingleShotPregenPreview({id:l.id,skillProfile:profile,loadout:l});
 }));
}

export function assertSingleShotPlayablePromotion(preview){
 // Deliberately deny until a native factory verifies all blockers atomically.
 if(!preview||!has(preview,'playable')||preview.playable!==true)
   throw Error('PREGEN_PLAYABLE_PROMOTION_BLOCKED');
 throw Error('PREGEN_NATIVE_RUNTIME_PROMOTION_NOT_IMPLEMENTED');
}
