export const BLACK_CHROME_SOURCE={
  book:'Cyberpunk RED: Black Chrome (CR3061)',
  apps:'Black Chrome pp.12-14',
  cyberware:'Black Chrome pp.17-26',
  armor:'Black Chrome pp.28-37',
  gear:'Black Chrome pp.38-50',
  frames:'Black Chrome pp.52-55',
  vehicles:'Black Chrome pp.58-84',
  weapons:'Black Chrome pp.86-124',
  nomadAccess:'Black Chrome p.9',
  appendix:'Black Chrome pp.157-168'
};
const n=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const clone=v=>JSON.parse(JSON.stringify(v??{}));
const idOf=x=>String(x?.id||x?.itemId||'').toLowerCase();
const ids=rows=>(Array.isArray(rows)?rows:[]).map(idOf);
export function ensureContentModules(character){if(!character||typeof character!=='object')return{};character.campaignState=character.campaignState&&typeof character.campaignState==='object'?character.campaignState:{};character.campaignState.contentModules=character.campaignState.contentModules&&typeof character.campaignState.contentModules==='object'?character.campaignState.contentModules:{};if(typeof character.campaignState.contentModules.black_chrome!=='boolean')character.campaignState.contentModules.black_chrome=false;return character.campaignState.contentModules}
export function blackChromeEnabled(character){return Boolean(character?.campaignState?.contentModules?.black_chrome)}
export function setBlackChromeEnabled(character,enabled){const out=clone(character);ensureContentModules(out);out.campaignState.contentModules.black_chrome=Boolean(enabled);return{ok:true,enabled:Boolean(enabled),character:out,source:BLACK_CHROME_SOURCE.book}}
export function hasBlackChromeCyberware(character,needle){const q=String(needle||'').toLowerCase();return (character?.cyberware||[]).some(x=>{const id=idOf(x),name=String(x?.name||'').toLowerCase();return x?.installed!==false&&(id===q||id===`black_chrome_${q}`||id.endsWith(`_${q}`)||name===q)})}
export function canDodgeBullets({ref=0,character=null,cyberware=null}={}){const rows=cyberware||character?.cyberware||[];const co=ids(rows).some(x=>x.includes('reflex_co_processor'));return{canDodge:n(ref)>=8||co,byRef:n(ref)>=8,byReflexCoProcessor:co,source:co?'Black Chrome p.21':'Cyberpunk RED Core v1.25'}}

const BC_CYBERWARE={
 black_chrome_borgware_hardened_shielding:{cyberwareCategory:'borgware',classification:'borgware',borgware:true,typicalInstall:'hospital',humanityLossPreset:14,humanityLossDice:'4d6',targetBorgwareRequired:true,noSlot:true},
 black_chrome_budget_chipware_socket:{cyberwareCategory:'neuralware',typicalInstall:'clinic',humanityLossPreset:7,humanityLossDice:'2d6',requires:[{id:'neural_link',count:1}],chipwareSocket:true,budgetSocket:true},
 black_chrome_discount_cyberaudio_suite:{cyberwareCategory:'cyberaudio',foundation:true,foundationAlias:'cyberaudio_suite',optionSlots:1,typicalInstall:'clinic',humanityLossPreset:3,humanityLossDice:'1d6'},
 black_chrome_dynalar_modular_finger_enthusiast_cyberhand:{cyberwareCategory:'cyberarm',typicalInstall:'hospital',humanityLossPreset:14,humanityLossDice:'4d6',requires:[{id:'cyberarm',count:1}],slotsUsed:2,classification:'borgware',borgware:true,cyberfingerCapacity:8,includesStandardCyberfingers:8},
 black_chrome_explicit_memory_stimulator:{cyberwareCategory:'chipware',typicalInstall:'n/a',humanityLossPreset:3,humanityLossDice:'1d6',requiresAny:[{id:'chipware_socket',count:1},{id:'black_chrome_budget_chipware_socket',count:1}],chipware:true,noSlot:true,concentrationRememberBonus:2},
 black_chrome_extra_jointed_cyberlimb_upgrade:{cyberwareCategory:'cyberlimb',compatibleFoundationIds:['cyberarm','cyberleg'],typicalInstall:'clinic',humanityLossPreset:3,humanityLossDice:'1d6',onePerFoundation:true,contortionistBonus:2},
 black_chrome_flashbulb:{cyberwareCategory:'cyberarm',typicalInstall:'clinic',humanityLossPreset:7,humanityLossDice:'2d6',requires:[{id:'cyberarm',count:1}],slotsUsed:2},
 black_chrome_hardened_cybereye_casing:{cyberwareCategory:'cyberoptics',typicalInstall:'clinic',humanityLossPreset:3,humanityLossDice:'1d6',requiresAny:[{id:'cybereye',count:1},{id:'black_chrome_sponsored_cybereye',count:1}],hardenedCybereye:true},
 black_chrome_heuristic_health_monitor:{cyberwareCategory:'fashionware',typicalInstall:'clinic',humanityLossPreset:0,humanityLossDice:'0',requires:[{id:'biomonitor',count:1}],knowsOwnHp:true},
 black_chrome_integrated_cyberdeck_upgrade:{cyberwareCategory:'cyberarm',typicalInstall:'clinic',humanityLossPreset:7,humanityLossDice:'2d6',requires:[{id:'cyberarm_cyberdeck',count:1}],integratedCyberdeckExtraSlots:1,sameArmAsCyberdeck:true},
 black_chrome_internal_body_cyberware_hardened_shielding:{cyberwareCategory:'internal',typicalInstall:'hospital',humanityLossPreset:14,humanityLossDice:'4d6',hardenAllInternalBody:true},
 black_chrome_modular_finger_cyberhand:{cyberwareCategory:'cyberarm',typicalInstall:'hospital',humanityLossPreset:3,humanityLossDice:'1d6',foundationOptional:true,compatibleFoundationIds:['cyberarm'],cyberfingerCapacity:5,includesStandardCyberfingers:5,canInstallInMeatArm:true},
 black_chrome_neo_soviet_cyberarm:{cyberwareCategory:'cyberarm',foundation:true,foundationAlias:'cyberarm',optionSlots:3,typicalInstall:'hospital',humanityLossPreset:7,humanityLossDice:'2d6',neoSovietArm:true,includedStandardHand:true,minBodyForNoPenalty:8,armCheckPenaltyBelowBody:-1},
 black_chrome_popup_net_launcher:{cyberwareCategory:'cyberarm',typicalInstall:'clinic',humanityLossPreset:7,humanityLossDice:'2d6',requires:[{id:'cyberarm',count:1}],slotsUsed:3,popupNetLauncher:true},
 black_chrome_popup_shotgun:{cyberwareCategory:'cyberarm',typicalInstall:'clinic',humanityLossPreset:7,humanityLossDice:'2d6',requires:[{id:'cyberarm',count:1}],slotsUsed:3,popupShotgun:true},
 black_chrome_reflex_co_processor:{cyberwareCategory:'neuralware',typicalInstall:'hospital',humanityLossPreset:14,humanityLossDice:'4d6',requires:[{id:'neural_link',count:1}],dodgeBulletsRegardlessRef:true},
 black_chrome_reinforced_cyberlimb_upgrade:{cyberwareCategory:'cyberlimb',compatibleFoundationIds:['cyberarm','cyberleg'],typicalInstall:'clinic',humanityLossPreset:3,humanityLossDice:'1d6',onePerFoundation:true},
 black_chrome_racerbracer:{cyberwareCategory:'internal',typicalInstall:'hospital',humanityLossPreset:7,humanityLossDice:'2d6',immuneWhiplash:true},
 black_chrome_sponsored_cybereye:{cyberwareCategory:'cyberoptics',foundation:true,foundationAlias:'cybereye',optionSlots:2,typicalInstall:'clinic',humanityLossPreset:7,humanityLossDice:'2d6',includedChyron:true,adPenaltyVision:-1,adCloseAction:true,adFrequencyWakingMinutes:60},
 black_chrome_trauma_response_nanomatrix:{cyberwareCategory:'internal',typicalInstall:'hospital',humanityLossPreset:7,humanityLossDice:'2d6',requiresAny:[{id:'skin_weave',count:1},{id:'subdermal_armor',count:1}],nanomatrix:true},
};
const BC_CYBERFINGERS={
 black_chrome_airhypo_cyberfinger:{humanityLossPreset:3,humanityLossDice:'1d6',airhypo:true},
 black_chrome_ballpoint_cyberfinger:{humanityLossPreset:0,humanityLossDice:'0',ballpoint:true},
 black_chrome_bullet_storage_cyberfinger:{humanityLossPreset:3,humanityLossDice:'1d6',bulletStorage:2},
 black_chrome_dartgun_cyberfinger:{humanityLossPreset:7,humanityLossDice:'2d6',dartgun:true,concealedWithGlove:true},
 black_chrome_flashlight_cyberfinger:{humanityLossPreset:3,humanityLossDice:'1d6',flashlight:true},
 black_chrome_homing_tracer_cyberfinger:{humanityLossPreset:3,humanityLossDice:'1d6',homingTracerMiles:1,replacementTracerPrice:50},
 black_chrome_laser_pointer_cyberfinger:{humanityLossPreset:3,humanityLossDice:'1d6',laserPointer:true},
 black_chrome_lighter_cyberfinger:{humanityLossPreset:3,humanityLossDice:'1d6',lighter:true},
 black_chrome_lockpick_cyberfinger:{humanityLossPreset:2,humanityLossDice:'1d6/2rounddown',lockpick:true},
 black_chrome_microphone_cyberfinger:{humanityLossPreset:2,humanityLossDice:'1d6/2rounddown',microphone:true},
 black_chrome_mini_air_supply_cyberfinger:{humanityLossPreset:2,humanityLossDice:'1d6/2rounddown',airMinutes:10,refillMinutes:60},
 black_chrome_one_shot_special_cyberfinger:{humanityLossPreset:7,humanityLossDice:'2d6',oneShotSpecial:true,nonBasicAmmo:true,concealedWithGlove:true},
 black_chrome_spray_paint_cyberfinger:{humanityLossPreset:3,humanityLossDice:'1d6',sprayPaint:true},
 black_chrome_squirt_cyberfinger:{humanityLossPreset:3,humanityLossDice:'1d6',squirt:true,acidDestroysFinger:true},
 black_chrome_standard_cyberfinger:{humanityLossPreset:0,humanityLossDice:'0',standard:true},
 black_chrome_wirecutter_scissor_cyberfingers:{humanityLossPreset:3,humanityLossDice:'1d6',wirecutter:true,lightMelee:true,quality:'poor',setOfTwo:true},
};
function bcInstallLevel(item){const v=String(item?.install||item?.tableData?.Install||'').toLowerCase();return v==='mall'?'mall':v==='clinic'?'clinic':v==='hospital'?'hospital':v==='—'||v==='n/a'?'n/a':v}
export function blackChromeCyberwareDefinition(item){if(!item)return null;const base=BC_CYBERWARE[item.id]||BC_CYBERFINGERS[item.id];if(!base)return null;const cyberfinger=Boolean(BC_CYBERFINGERS[item.id]);return{...clone(item),...clone(base),id:item.id,name:item.name,price:n(item.price),typicalInstall:base.typicalInstall||bcInstallLevel(item),cyberwareCategory:cyberfinger?'cyberfinger':base.cyberwareCategory,cyberfinger,requiresModularFingerCyberhand:cyberfinger,source:item.sourceRef||BLACK_CHROME_SOURCE.cyberware,moduleId:'black_chrome',optIn:true}}
export function blackChromeCyberwareInstallGate({installed=[],candidate,targetFoundationInstanceId=null,targetBorgwareInstanceId=null}={}){if(!candidate)return{ok:false,reason:'cyberware-required'};const rows=Array.isArray(installed)?installed.filter(x=>x?.installed!==false):[];if(candidate.targetBorgwareRequired){const target=rows.find(x=>String(x.instanceId||x.id)===String(targetBorgwareInstanceId||'')&&x.borgware===true);if(!target)return{ok:false,reason:'borgware-target-required'};return{ok:true,targetBorgwareInstanceId:String(target.instanceId||target.id),source:'Black Chrome p.17'}}if(candidate.onePerFoundation&&targetFoundationInstanceId&&rows.some(x=>x.id===candidate.id&&String(x.targetFoundationInstanceId||'')===String(targetFoundationInstanceId)))return{ok:false,reason:'one-per-foundation'};return{ok:true,source:candidate.source||BLACK_CHROME_SOURCE.cyberware}}
export function budgetChipwareHeadHit({chipInstalled=false,rng=Math.random}={}){if(!chipInstalled)return{ejected:false,destroyed:false,distanceMeters:0,source:'Black Chrome p.17'};const roll=Math.floor(rng()*10)+1;return{ejected:true,destroyed:roll===1,distanceMeters:30,roll,source:'Black Chrome p.17'}}
export function laserPointerCyberfingerEffect({count=0,resistTortureDrugsTotal=0}={}){const c=Math.max(0,Math.trunc(n(count))),eligible=c>=4,resisted=n(resistTortureDrugsTotal)>13;if(!eligible)return{ok:false,reason:'four-laser-fingers-required',source:'Black Chrome p.25'};return{ok:true,resisted,criticalInjury:resisted?null:'damaged_eye',durationMinutes:resisted?0:(c>=8?null:1),untilTreated:!resisted&&c>=8,consumesAction:true,maxRangeMeters:25,source:'Black Chrome p.25'}}
export function popupNetLauncherHit({netHp=15}={}){return{grappled:true,moveActionBlocked:true,twoHandedWeaponsBlocked:true,physicalActionPenalty:-2,netHp:Math.max(0,n(netHp,15)),escape:{contortionistDv:13,brawlingDv:13},outsideRangedDamageHitsNetAndTarget:true,replacementNetPrice:50,source:'Black Chrome pp.20-21'}}
export function sponsoredCybereyeAd({minutesSinceLastAd=60,gmTriggers=true,closed=false}={}){const canTrigger=Boolean(gmTriggers)&&n(minutesSinceLastAd)>=60;return{canTrigger,active:canTrigger&&!closed,visionCheckPenalty:canTrigger&&!closed?-1:0,closeConsumesAction:canTrigger&&!closed,source:'Black Chrome p.22'}}
export function neoSovietCyberarmPenalty({body=0}={}){return{armRollPenalty:n(body)<8?-1:0,optionsAlwaysVisible:true,alwaysRecognizableAsCyberarm:true,source:'Black Chrome p.20'}}
export function cyberfingerAirSupply({minutesUsed=0,refillMinutes=0}={}){const ready=n(refillMinutes)>=60||n(minutesUsed)<10;return{remainingMinutes:Math.max(0,10-n(minutesUsed)),ready,refillComplete:n(refillMinutes)>=60,source:'Black Chrome p.26'}}

export function qualify4TifyScan({minutes=0,distanceMeters=Infinity}={}){const ready=n(minutes)>=5&&n(distanceMeters,Infinity)<=1;return{ok:true,ready,coverDamageBonusDice:ready?1:0,consumedOnNextCoverDamage:ready,source:'Black Chrome p.13'}}
export function blackChromeCitiNetAccess({worldPosition={},campaignState={}}={}){const explicit=campaignState?.citiNetAvailable,remote=campaignState?.blackChromeApps?.worldSat?.citiNetAvailable===true,nightCity=worldPosition?.atlasId==='night-city-2045'&&worldPosition?.mode!=='badlands';const available=explicit===true||remote||explicit!==false&&nightCity;return{ok:true,available,basis:explicit===true?'explicit':remote?'worldsat':nightCity&&explicit!==false?'night-city-citinet':'none',source:'Black Chrome pp.13-14,50'}}
export function ncpdCrimeDatabaseRequest({citiNet=false,elapsedMinutes=0}={}){return{ok:Boolean(citiNet),requiresCitiNet:true,complete:Boolean(citiNet)&&n(elapsedMinutes)>=60,remainingMinutes:Boolean(citiNet)?Math.max(0,60-n(elapsedMinutes)):60,scope:'public NCPD record only',source:'Black Chrome p.13'}}
export function traumaTeamMedScan({citiNet=false,service='stabilize',executiveSubscriber=false}={}){if(!citiNet)return{ok:false,reason:'citinet-required',source:'Black Chrome p.14'};const long=['treatment','installation','bodysculpt','surgery'].includes(service),price=executiveSubscriber?0:(long?500:100);return{ok:true,service,price,bonus:1,skill:long?(service==='surgery'?'surgery':'medical_tech'):'first_aid_or_paramedic',durationMinutes:long?240:60,source:'Black Chrome p.14'}}
export function zigguratCityDatabaseBonus({owned=false,cityMatches=false}={}){return{ok:true,bonus:owned&&cityMatches?1:0,skill:'local_expert',source:'Black Chrome p.14'}}
export function validateDigitalGladiator(character){const statTotal=Object.values(character?.stats||{}).reduce((s,v)=>s+n(v),0),skillTotal=Object.values(character?.skills||{}).reduce((s,v)=>s+n(v),0),humanity=n(character?.derived?.humanity,character?.stats?.EMP*10);const explosives=(character?.inventory||[]).some(x=>String(x.itemId||'').includes('explosive'));const ok=String(character?.role||'').toLowerCase()==='solo'&&n(character?.roleAbilityRank)===4&&character?.method==='complete'&&statTotal===62&&skillTotal===86&&humanity>0&&!explosives;return{ok,requirements:{role:'solo',rank:4,method:'complete',statPoints:62,skillPoints:86,budget:2550,humanityAbove:0,noExplosives:true},observed:{statTotal,skillTotal,humanity,explosives},source:'Black Chrome p.12'}}
export function resolveDigitalGladiatorLoss({internalAgent=false}={}){return{agentDestroyedBeyondRepair:true,brainInjury:Boolean(internalAgent),source:'Black Chrome p.12'}}

export function armorRecognition({wardrobeStyleTotal=null,perceptionTotal=null}={}){const wardrobeSuccess=wardrobeStyleTotal!=null&&n(wardrobeStyleTotal)>13,perceptionSuccess=perceptionTotal!=null&&n(perceptionTotal)>15;return{recognized:wardrobeSuccess||perceptionSuccess,wardrobeDv:13,perceptionDv:15,source:'Black Chrome p.9 keyword: With the Appearance of <X> Fashion'}}
export function shockArmorBreakGrapple({resistTortureDrugsTotal=0}={}){const resisted=n(resistTortureDrugsTotal)>15;return{ok:true,resisted,grappleEnds:!resisted,consumesAction:true,source:'Black Chrome p.29'}}
export function fireBrandProtection({equipped=false,gasMaskActive=false}={}){return{fireDamageImmune:Boolean(equipped),cannotBeSetOnFire:Boolean(equipped),inhaledHazardImmune:Boolean(equipped&&gasMaskActive),oxygenMinutes:equipped&&gasMaskActive?30:0,source:'Black Chrome p.29'}}
export function airRiderCrashProtection({charged=true}={}){return{preventsWhiplash:Boolean(charged),inflates:Boolean(charged),movePenalty:charged?5:0,replacementCartridgePrice:20,source:'Black Chrome p.33'}}

const BC_ARMOR={
 black_chrome_the_dirk_combat_jacket:{concealedStandardClips:2,appearanceOf:'Leisurewear'},
 black_chrome_fire_brand_bunker_gear:{pairedRepair:true,fireImmune:true,incendiaryImmune:true,builtInGasMask:true,oxygenMinutes:30,oxygenRefillMinutes:60},
 black_chrome_shock_armor:{grappleShock:true,grappleShockDv:15},
 black_chrome_tactical_smart_armor:{pairedRepair:true,builtInSmartGlasses:true},
 black_chrome_laser_light_street_jacket:{appearanceOf:'Urban Flash',lightTattooEquivalent:1},
 black_chrome_lotos_netsuit:{bodyweightSuit:true,extraHardwareSlots:1,includedCyberdeckQuality:'excellent',incompatibleBodyweightSuit:true},
 black_chrome_montage_variable_clothing_line:{variableFashion:true,includedPatterns:1,extraPatternPrice:20,downloadMinutes:1,changeConsumesAction:true},
 black_chrome_masetto_airrider:{crashWhiplashProtection:true,inflateMovePenalty:5,inflateMinutes:1,deflateConsumesAction:true,replacementCartridgePrice:20},
 black_chrome_mimic_clothing_kit:{armorConversionKit:true,targetFashion:['jacket','top'],convertedArmor:'light_armorjack',irreversible:true},
 black_chrome_skidrow_trench:{bodyOnly:true,spOverride:13},
 black_chrome_executive_armor:{selfRepairSpPerEligibleDay:1,appearanceOf:'Businesswear'},
 black_chrome_corporate_island:{appearanceOf:'Businesswear'},
 black_chrome_masetto_holo_wear:{hologramFashion:true,includedOutfits:1,extraOutfitPrice:100,downloadMinutes:1,changeConsumesAction:true,empShutdownMinutes:1},
 black_chrome_street_viper_riding_suit:{builtInMediumMeleeWeapons:2,weaponsAlwaysDrawn:true},
 black_chrome_mechaman_motorcycle_helmet:{flakHead:true,builtInTechUpgradedSmartGlasses:true,builtInOptions:['chyron','low_light_ir_uv']},
 black_chrome_mechaman_smart_glove:{smartGlove:true,builtInSubdermalGrip:true,cyberarmOptionSlots:1,wearConsumesAction:true,requiresNeuralLinkForGrip:true,coveredHandCyberwareInaccessible:true,concealable:false},
};
export function blackChromeArmorDefinition(item){if(!item||item.category!=='armor'||item.moduleId!=='black_chrome')return null;const extra=BC_ARMOR[item.id]||{};return{...clone(item),...clone(extra),source:item.sourceRef||BLACK_CHROME_SOURCE.armor,moduleId:'black_chrome',optIn:true}}
export function executiveArmorDailyRepair({currentSp=0,maxSp=11,lostSpToday=false}={}){const before=Math.max(0,n(currentSp)),cap=Math.max(0,n(maxSp));return{newSp:lostSpToday?before:Math.min(cap,before+1),repaired:lostSpToday?0:Math.max(0,Math.min(cap,before+1)-before),source:'Black Chrome p.34'}}
export function montageStyleChange({ownedPatterns=1,inCombat=false,actionAvailable=true}={}){if(n(ownedPatterns)<1)return{ok:false,reason:'pattern-required',source:'Black Chrome p.32'};if(inCombat&&!actionAvailable)return{ok:false,reason:'action-required',source:'Black Chrome p.32'};return{ok:true,consumesAction:Boolean(inCombat),extraPatternPrice:20,downloadMinutes:1,source:'Black Chrome p.32'}}
export function holoWearStyleChange({ownedOutfits=1,inCombat=false,actionAvailable=true,empDisabledMinutes=0}={}){if(n(empDisabledMinutes)>0)return{ok:false,reason:'emp-disabled',remainingMinutes:n(empDisabledMinutes),source:'Black Chrome p.35'};if(n(ownedOutfits)<1)return{ok:false,reason:'outfit-required',source:'Black Chrome p.35'};if(inCombat&&!actionAvailable)return{ok:false,reason:'action-required',source:'Black Chrome p.35'};return{ok:true,consumesAction:Boolean(inCombat),extraOutfitPrice:100,downloadMinutes:1,source:'Black Chrome p.35'}}
export function smartGloveState({worn=false,neuralLink=false}={}){return{worn:Boolean(worn),subdermalGripActive:Boolean(worn&&neuralLink),cyberarmOptionSlots:worn?1:0,coveredHandCyberwareInaccessible:Boolean(worn),source:'Black Chrome p.37'}}
export function extraJointedBonus({installations=0}={}){const count=Math.max(0,Math.min(4,Math.trunc(n(installations))));return{installations:count,contortionistBonus:count*2,source:'Black Chrome p.18'}}
export function flashbulbEffect({resistTortureDrugsTotal=0,antiDazzle=false}={}){if(antiDazzle)return{ok:true,affected:false,protected:true,source:'Black Chrome p.18'};const resisted=n(resistTortureDrugsTotal)>15;return{ok:true,affected:!resisted,criticalInjury:!resisted?'damaged_eye':null,durationMinutes:!resisted?1:0,consumesAction:true,maxRangeMeters:25,source:'Black Chrome p.18'}}
export function reinforcedCyberlimbImmunity({limbType='cyberarm',installed=false}={}){return{immuneCriticalInjury:installed?(limbType==='cyberleg'?'broken_leg':'broken_arm'):null,source:'Black Chrome p.22'}}
export function racerBracerImmunity({installed=false}={}){return{immuneToWhiplash:Boolean(installed),source:'Black Chrome p.22'}}
export function traumaResponseNanomatrixUses({installations=0,usesToday=0}={}){const max=Math.max(0,Math.trunc(n(installations)));return{maxUsesPerDay:max,usesToday:Math.max(0,Math.trunc(n(usesToday))),remaining:Math.max(0,max-Math.max(0,Math.trunc(n(usesToday)))),source:'Black Chrome p.22'}}
export function activateTraumaResponseNanomatrix({installations=0,usesToday=0,armorType='skin_weave',currentSp=0}={}){const state=traumaResponseNanomatrixUses({installations,usesToday});if(!['skin_weave','subdermal_armor'].includes(armorType))return{ok:false,reason:'compatible-armor-required',...state};if(state.remaining<1)return{ok:false,reason:'daily-limit',...state};const fullSp=armorType==='skin_weave'?7:11;return{ok:true,armorType,beforeSp:n(currentSp),newSp:fullSp,usesToday:state.usesToday+1,remaining:state.remaining-1,consumesAction:true,source:'Black Chrome p.22'}}
export function hardenedCyberwareProtection({kind='single',emp=true}={}){return{protected:Boolean(emp),kind,blocks:['electric_shock','microwaver','emp_pulse','non_black_ice_program_effect'],source:kind==='internal_body'?'Black Chrome p.20':'Black Chrome pp.17-20'}}

const FRAMES={
 'black_chrome_fuma_kotaro_linear_frame':{name:'Fūma Kotarō Linear Frame',body:12,stealthBonus:2,externalRequiresInterfacePlugs:2,internalRequiresBody:8,internalRequiresMuscleBoneLace:2,internalHumanityLoss:'14 (4d6)',weapons:['2x Excellent Exotic Heavy Melee','1x Excellent Exotic Light Melee','1x Excellent Exotic Very Heavy Melee'],source:'Black Chrome p.52'},
 'black_chrome_lf_001_swat_linear_frame':{name:'LF-001 SWAT Linear Frame',body:12,negatesClimbPenalty:true,negatesSwimPenalty:true,externalRequiresInterfacePlugs:2,internalRequiresBody:8,internalRequiresMuscleBoneLace:2,internalHumanityLoss:'14 (4d6)',source:'Black Chrome p.53'},
 'black_chrome_vermilion_linear_frame':{name:'Vermilion Linear Frame',body:12,negatesJumpPenalty:true,pairedSkateFeetEquivalent:true,externalRequiresInterfacePlugs:2,internalRequiresBody:8,internalRequiresMuscleBoneLace:2,internalHumanityLoss:'14 (4d6)',source:'Black Chrome p.54'},
 'black_chrome_el_f4_nt_linear_frame':{name:'EL-F4-NT Linear Frame',body:12,externalOnly:true,externalRequiresInterfacePlugs:0,techtools:2,source:'Black Chrome p.55'}
};
export function blackChromeLinearFrame(id,mode='external'){const row=FRAMES[String(id||'').toLowerCase()];if(!row)return null;if(row.externalOnly&&mode==='internal')return{ok:false,reason:'external-only',...row};return{ok:true,id:String(id).toLowerCase(),mode,...clone(row),hpUnaffected:mode==='external',deathSaveUnaffected:mode==='external',takeOnOffAction:mode==='external',borgware:mode==='internal'}}
export function blackChromeLinearFrameCyberware(item){if(!item||item.moduleId!=='black_chrome'||item.category!=='linear_frame')return null;const frame=blackChromeLinearFrame(item.id,'internal');if(!frame?.ok)return null;return{...clone(item),id:`${item.id}_internal`,name:`${item.name} (Internal)`,category:'cyberware',cyberwareCategory:'borgware',classification:'borgware',borgware:true,typicalInstall:'hospital',price:Number(item.price||5000),humanityLossPreset:14,humanityLossDice:'4d6',minBody:Number(frame.internalRequiresBody||8),requires:[{id:'grafted_muscle_bone_lace',count:Number(frame.internalRequiresMuscleBoneLace||2)}],blackChromeLinearFrame:true,blackChromeFrameId:item.id,bodyOverride:Number(frame.body||12),source:item.sourceRef||frame.source,moduleId:'black_chrome',optIn:true}}
export function blackChromeExternalFrameEquipGate({cyberware=[],id}={}){const frame=blackChromeLinearFrame(id,'external');if(!frame?.ok)return{ok:false,reason:'linear-frame-required'};const plugs=(Array.isArray(cyberware)?cyberware:[]).filter(x=>x?.installed!==false&&String(x?.id||'').toLowerCase()==='interface_plugs').length,required=Number(frame.externalRequiresInterfacePlugs||0);return{ok:plugs>=required,reason:plugs>=required?null:'interface-plugs-required',installedInterfacePlugs:plugs,requiredInterfacePlugs:required,frame,source:frame.source}}
export function blackChromeFumaWeapons(){return[{id:'black_chrome_fuma_heavy_blades',label:'Fūma • Heavy Blades',weaponType:'melee',damageDice:3,rof:2,hands:1,quality:'excellent',attackBonus:1,frameBuiltIn:true,source:'Black Chrome p.52'},{id:'black_chrome_fuma_light_blade',label:'Fūma • Light Blade',weaponType:'melee',damageDice:1,rof:2,hands:1,quality:'excellent',attackBonus:1,frameBuiltIn:true,source:'Black Chrome p.52'},{id:'black_chrome_fuma_very_heavy_blade',label:'Fūma • Very Heavy Blade',weaponType:'melee',damageDice:4,rof:1,hands:1,quality:'excellent',attackBonus:1,frameBuiltIn:true,source:'Black Chrome p.52'}]}

export function nomadAccessEligibility({role='',motoRank=0,vehicle={}}={}){const access=Math.max(0,Math.trunc(n(vehicle.nomadAccess)));const isNomad=String(role).toLowerCase()==='nomad',rank=Math.max(0,Math.trunc(n(motoRank)));return{ok:isNomad&&access<=rank,roleIsNomad:isNomad,motoRank:rank,nomadAccess:access,source:BLACK_CHROME_SOURCE.nomadAccess}}
export function acquireNomadAccessVehicle(character,vehicle,{choiceAvailable=true}={}){const check=nomadAccessEligibility({role:character?.role,motoRank:character?.roleAbilityRank,vehicle});if(!choiceAvailable)return{ok:false,reason:'moto-level-up-choice-required',...check};if(!check.ok)return{ok:false,reason:check.roleIsNomad?'nomad-access-too-high':'nomad-required',...check};const out=clone(character);out.campaignState=out.campaignState||{};out.campaignState.nomadMotorpool=Array.isArray(out.campaignState.nomadMotorpool)?out.campaignState.nomadMotorpool:[];if(!out.campaignState.nomadMotorpool.some(x=>x.id===vehicle.id))out.campaignState.nomadMotorpool.push({id:vehicle.id,name:vehicle.name,nomadAccess:vehicle.nomadAccess,sdp:vehicle.sdp,seats:vehicle.seats,notesText:vehicle.notesText||'',stockBlackChrome:true,upgradesIncluded:true});return{ok:true,character:out,vehicle:out.campaignState.nomadMotorpool.find(x=>x.id===vehicle.id),includedListedUpgradesRequireExtraMotoRanks:false,source:BLACK_CHROME_SOURCE.nomadAccess}}
function speedNumber(v){const m=String(v||'').match(/(\d+)/);return m?Number(m[1]):0}
export function blackChromeVehicleDefinition(item){if(!item||item.moduleId!=='black_chrome'||item.category!=='vehicle')return null;const t=item.tableData||{},type=String(t.Type||''),air=item.sourceCategory==='vehicle_air',notes=String(item.notesText||''),combatMove=speedNumber(t['Speed (Combat)']),narrativeMph=speedNumber(t['Speed (Narrative)']),upgradeTokens=notes.replace(/^Upgrades\/Notes:\s*/i,'').split('•').map(x=>x.trim()).filter(Boolean),armored=(notes.match(/Armored Chassis(?:\s*\(SP\s*(\d+)\))?/i)||[]);return{...clone(item),kind:air?'air':'land',vehicleType:type,combatMove,narrativeMph,narrativeKph:Math.round(narrativeMph*1.60934),nomadAccess:item.nomadAccess==null?null:n(item.nomadAccess),sdp:n(item.sdp),seats:n(item.seats),sp:armored[0]?n(armored[1],13):0,upgradeTokens,athleticsManeuvers:item.id==='black_chrome_tanson_jetboy_hoverboard',basicDrivingNoMinimumSkillBase:item.id==='black_chrome_tanson_jetboy_hoverboard',handsFreeAlways:item.id==='black_chrome_tanson_jetboy_hoverboard',interfacePlugsBlocked:item.id==='black_chrome_zonda_molly_1k',enhancedInterfacePlugIntegration:item.id==='black_chrome_zonda_parallax_cybercycletm',foldableCarryMode:item.id==='black_chrome_tanson_bellhop',artemisSupercharge:item.id==='black_chrome_highway_master_artemis',artemisCanopy:item.id==='black_chrome_highway_master_artemis',detachableCarriage:item.id==='black_chrome_yangs_wheels_rickshaw',megaHaulerLimitedSecurity:item.id==='black_chrome_tetracorp_america_megahauler',upgradesBlocked:item.id==='black_chrome_tanson_jetboy_hoverboard',source:item.sourceRef||BLACK_CHROME_SOURCE.vehicles,moduleId:'black_chrome',optIn:true}}
function vehicleClock(clock={}){const sec=Math.max(0,n(clock.elapsedSeconds,n(clock.elapsedMinutes)*60)),minute=Math.floor(sec/60),day=Math.floor(sec/86400)+1;return{second:sec,minute,day}}
export function blackChromeVehicleRuntime(vehicle,clock={}){if(!vehicle?.stockBlackChrome)return vehicle?clone(vehicle):null;const out=clone(vehicle),now=vehicleClock(clock),s=out.specialState=out.specialState||{};out.combatMove=n(out.baseCombatMove,out.combatMove);out.narrativeMph=n(out.baseNarrativeMph,out.narrativeMph);out.narrativeKph=n(out.baseNarrativeKph,out.narrativeKph||Math.round(out.narrativeMph*1.60934));out.seats=n(out.baseSeats,out.seats);out.carryMode=false;if(out.id==='black_chrome_highway_master_artemis'){const a=s.artemis=s.artemis||{canopyClosed:false,superchargeActive:false,superchargeEndsAtMinute:0,usesByDay:{},destroyAtMinute:null};if(a.superchargeActive&&now.minute>=n(a.superchargeEndsAtMinute)){a.superchargeActive=false;if(a.destroyAtMinute!=null&&now.minute>=n(a.destroyAtMinute)){out.destroyed=true;out.sdp=0}}if(a.superchargeActive&&!out.destroyed){out.combatMove=60;out.narrativeMph=300;out.narrativeKph=483}}
 if(out.id==='black_chrome_tanson_bellhop'){const b=s.bellhop=s.bellhop||{folded:false};if(b.folded){out.carryMode=true;out.combatMove=0;out.narrativeMph=0;out.narrativeKph=0}}
 if(out.id==='black_chrome_yangs_wheels_rickshaw'){const r=s.rickshaw=s.rickshaw||{carriageDetached:false};if(r.carriageDetached)out.seats=2}
 return out}
export function blackChromeVehicleSpecialOptions(vehicle,clock={}){const v=blackChromeVehicleRuntime(vehicle,clock);if(!v)return[];const out=[];if(v.id==='black_chrome_tanson_bellhop')out.push({id:'bellhop_fold_toggle',label:v.specialState?.bellhop?.folded?'DESDOBRAR BELHOP':'DOBRAR BELLHOP'});if(v.id==='black_chrome_highway_master_artemis'){out.push({id:'artemis_canopy_toggle',label:v.specialState?.artemis?.canopyClosed?'ABRIR CAPOTA':'FECHAR CAPOTA'});if(!v.specialState?.artemis?.superchargeActive&&!v.destroyed)out.push({id:'artemis_supercharge',label:'SUPERCHARGE • 10 MIN'})}if(v.id==='black_chrome_yangs_wheels_rickshaw'&&!v.specialState?.rickshaw?.carriageDetached)out.push({id:'rickshaw_detach',label:'DESCONECTAR CARRUAGEM'});return out}
export function applyBlackChromeVehicleSpecial(vehicle,action,{clock={}}={}){if(!vehicle?.stockBlackChrome)return{ok:false,reason:'black-chrome-vehicle-required'};let out=blackChromeVehicleRuntime(vehicle,clock);if(out.destroyed)return{ok:false,reason:'vehicle-destroyed',vehicle:out};const now=vehicleClock(clock),s=out.specialState=out.specialState||{};
 if(action==='bellhop_fold_toggle'&&out.id==='black_chrome_tanson_bellhop'){const b=s.bellhop=s.bellhop||{folded:false};b.folded=!b.folded;out=blackChromeVehicleRuntime(out,clock);return{ok:true,vehicle:out,consumesAction:true,source:'Black Chrome p.60'}}
 if(action==='artemis_canopy_toggle'&&out.id==='black_chrome_highway_master_artemis'){const a=s.artemis=s.artemis||{canopyClosed:false,superchargeActive:false,superchargeEndsAtMinute:0,usesByDay:{},destroyAtMinute:null};a.canopyClosed=!a.canopyClosed;return{ok:true,vehicle:out,consumesAction:true,bulletproofGlass:a.canopyClosed?2:0,source:'Black Chrome p.70'}}
 if(action==='artemis_supercharge'&&out.id==='black_chrome_highway_master_artemis'){const a=s.artemis=s.artemis||{canopyClosed:false,superchargeActive:false,superchargeEndsAtMinute:0,usesByDay:{},destroyAtMinute:null};if(a.superchargeActive)return{ok:false,reason:'already-active',vehicle:out,source:'Black Chrome p.70'};a.usesByDay=a.usesByDay||{};const used=n(a.usesByDay[now.day]);a.usesByDay[now.day]=used+1;a.superchargeActive=true;a.superchargeEndsAtMinute=now.minute+10;a.destroyAtMinute=(used+1)>=2?a.superchargeEndsAtMinute:null;out=blackChromeVehicleRuntime(out,clock);return{ok:true,vehicle:out,consumesAction:true,durationMinutes:10,destroysAtEnd:(used+1)>=2,usesToday:used+1,source:'Black Chrome p.70'}}
 if(action==='rickshaw_detach'&&out.id==='black_chrome_yangs_wheels_rickshaw'){const r=s.rickshaw=s.rickshaw||{carriageDetached:false};if(r.carriageDetached)return{ok:false,reason:'already-detached',vehicle:out,source:'Black Chrome p.81'};r.carriageDetached=true;out=blackChromeVehicleRuntime(out,clock);return{ok:true,vehicle:out,consumesAction:true,seats:out.seats,source:'Black Chrome p.81'}}
 return{ok:false,reason:'unsupported-special-action',vehicle:out}}
export function blackChromeVehicleControlProfile(vehicle,{cyberware=[]}={}){if(!vehicle?.stockBlackChrome)return null;const plugCount=(cyberware||[]).filter(x=>x?.installed!==false&&String(x?.id||x?.name||'').toLowerCase().includes('interface_plug')).length,jet=vehicle.id==='black_chrome_tanson_jetboy_hoverboard',molly=vehicle.id==='black_chrome_zonda_molly_1k',parallax=vehicle.id==='black_chrome_zonda_parallax_cybercycletm';return{stat:jet?'DEX':'REF',skill:jet?'athletics':vehicle.kind==='air'?'pilot_air':'drive_land',basicAutomatic:jet,handsFree:jet||(!molly&&plugCount>0),interfacePlugsUsed:!jet&&!molly&&plugCount>0,interfacePlugsBlocked:molly,enhancedInterfacePlugIntegration:parallax&&plugCount>0,source:jet?'Black Chrome p.78':molly?'Black Chrome p.82':parallax?'Black Chrome p.83':'Cyberpunk RED Core v1.25 pp.190-192'}}
export function purchaseBlackChromeVehicle(character,item,{source='purchase'}={}){const def=blackChromeVehicleDefinition(item);if(!def)return{ok:false,reason:'black-chrome-vehicle-required'};const out=clone(character);out.campaignState=out.campaignState||{};out.campaignState.garage=Array.isArray(out.campaignState.garage)?out.campaignState.garage:[];const instanceId=`${def.id}:${out.campaignState.garage.filter(x=>x.id===def.id).length+1}`;const row={id:def.id,typeId:def.id,instanceId,name:def.name,kind:def.kind,vehicleType:def.vehicleType,sdp:def.sdp,maxSdp:def.sdp,sp:def.sp||0,seats:def.seats,baseSeats:def.seats,combatMove:def.combatMove,baseCombatMove:def.combatMove,narrativeMph:def.narrativeMph,baseNarrativeMph:def.narrativeMph,narrativeKph:def.narrativeKph,baseNarrativeKph:def.narrativeKph,nomadAccess:def.nomadAccess,upgradeTokens:clone(def.upgradeTokens),interfacePlugsBlocked:def.interfacePlugsBlocked,enhancedInterfacePlugIntegration:def.enhancedInterfacePlugIntegration,athleticsManeuvers:def.athleticsManeuvers,basicDrivingNoMinimumSkillBase:def.basicDrivingNoMinimumSkillBase,handsFreeAlways:def.handsFreeAlways,foldableCarryMode:def.foldableCarryMode,artemisSupercharge:def.artemisSupercharge,artemisCanopy:def.artemisCanopy,detachableCarriage:def.detachableCarriage,megaHaulerLimitedSecurity:def.megaHaulerLimitedSecurity,stockBlackChrome:true,specialState:{},destroyed:false,lostControl:false,acquisitionSource:source};out.campaignState.garage.push(row);return{ok:true,character:out,vehicle:row,source:BLACK_CHROME_SOURCE.vehicles}}

export function worldSatAerialSphere({setupMinutes=0,distanceToSphereMeters=Infinity,withinNetworkMiles=Infinity,wireHp=10}={}){const ready=n(setupMinutes)>=60&&n(distanceToSphereMeters,Infinity)<=100&&n(withinNetworkMiles,Infinity)<=50&&n(wireHp)>0;return{ok:true,citiNetAvailable:ready,setupComplete:n(setupMinutes)>=60,wireHp:n(wireHp),destroyedBeyondRepair:n(wireHp)<=0,source:'Black Chrome p.50'}}
const BC_GEAR={
 black_chrome_triti_fizz:{flavorOnly:true},
 black_chrome_showerinacan:{usesPerCan:1,disinfects:true,deodorizes:true},
 black_chrome_killstrom_banshee_microphone:{playInstrumentSingingBonus:2,chargeHours:48,rechargeHours:1},
 black_chrome_killstrom_sonic_boom_amp:{requiresPower:true,consumesAction:true,rangeMeters:10,resistTortureDrugsDv:15,criticalInjury:'damaged_ear',durationMinutes:1,noBonusCriticalDamage:true},
 black_chrome_killstrom_typhoid_speaker:{requiresPower:true,sonicBoomDvBonus:1,sonicBoomRangeBonusMeters:90},
 black_chrome_laser_light_electric_guitar:{playInstrumentGuitarBonus:1,lightTattooEquivalent:1},
 black_chrome_hydrosubsidium_universal_aqualung:{breatheWaterWithinSurfaceMeters:10},
 black_chrome_the_drink_master_3000:{beveragesPerRefill:10,refillPrice:100,canDispenseSmash:true},
 black_chrome_jeeves_executive_garment_bag:{repairsFashionAndArmor:true,excludesPriceCategories:['luxury','super_luxury']},
 black_chrome_zetatech_porta_printer:{portableTechWorkshop:true,enablesExpertise:['upgrade','fabrication'],requiresPostAssemblyTools:true},
 black_chrome_chipvault_by_secsystems:{chipCapacity:8,empProtected:true,biometricLock:true,electronicsSecurityDv:17,hingePickLockDv:10},
 black_chrome_ktech_doberman_500_marking_scent:{shotsPerPack:12,airPistolAmmo:true,damage:0,durationHours:24,washOff:'alcohol',dobermanTrackingBonus:4,enhancedTrackingBonus:2},
 black_chrome_ktech_doberman_500:{personalDrone:true,move:8,sp:11,hp:25,combatNumber:10,roamingRangeMeters:50,energyHours:48,rechargeHours:1,cannotBeCountered:true},
 black_chrome_rapideploy_sheath:{concealRevealBonus:2,requiresAlreadyConcealableWeapon:true,destroyedBecomesUnscathed:true,beyondRepairBecomesDestroyed:true},
 black_chrome_streetcase_by_secsystems:{freeHeavyPistolDraw:true,includesChipVault:1,includesSmokeGrenade:1,smokeDeployConsumesAction:true,storesModFire10xPistolMode:true},
 black_chrome_everest_ventureware_airwell_50:{waterLiters:.5,operationHours:5,sustainsOnePerson:true},
 black_chrome_everest_ventureware_one_touch_habitat:{extremeElementsProtection:true,deployConsumesAction:true,undeployConsumesAction:true,wildernessSleepOutsideCity:true,streetSleepInsideCity:true,crampedAbovePeople:2},
 black_chrome_mr_biscuit_multi_food_processor:{processingMinutes:10,maxPeople:10,outskirtsLifestyleReplacement:true},
 black_chrome_petrochem_nitro_ultra9:{consumesAction:true,durationHours:24,combatMoveBonus:5,ramDamageDiceFrom:6,ramDamageDiceTo:12,narrativeSpeedUnaffected:true},
 black_chrome_worldsat_aerial_sphere:{setupMinutes:60,deconstructMinutes:60,networkMiles:50,accessMeters:100,wireHp:10},
 black_chrome_sovoil_lubricants:{flavorOnly:true},
};
export function blackChromeGearDefinition(item){if(!item||item.moduleId!=='black_chrome'||item.sourceCategory!=='gear')return null;return{...clone(item),...clone(BC_GEAR[item.id]||{}),source:item.sourceRef||BLACK_CHROME_SOURCE.gear,moduleId:'black_chrome',optIn:true}}
export function sonicBoomAmpEffect({powered=false,typhoidSpeaker=false,resistTotal=0}={}){if(!powered)return{ok:false,reason:'power-required',source:'Black Chrome pp.40-41'};const dv=15+(typhoidSpeaker?1:0),rangeMeters=10+(typhoidSpeaker?90:0),resisted=n(resistTotal)>dv;return{ok:true,dv,rangeMeters,resisted,criticalInjury:resisted?null:'damaged_ear',durationMinutes:resisted?0:1,bonusCriticalDamage:false,consumesAction:true,source:'Black Chrome pp.40-41'}}
export function jeevesRepair({priceCategory='',damaged=true,destroyed=false,destroyedBeyondRepair=false}={}){const cat=String(priceCategory).toLowerCase().replace(/\s+/g,'_');if(destroyedBeyondRepair)return{ok:false,reason:'beyond-repair',source:'Black Chrome p.43'};if(['luxury','super_luxury'].includes(cat))return{ok:false,reason:'price-category-excluded',source:'Black Chrome p.43'};if(!damaged&&!destroyed)return{ok:false,reason:'repair-not-needed',source:'Black Chrome p.43'};const hours={cheap:1,everyday:1,costly:6,premium:24,expensive:168,very_expensive:336}[cat];if(!hours)return{ok:false,reason:'unsupported-price-category',source:'Black Chrome p.43'};return{ok:true,hours,restoresFullSp:true,repairsToPerfect:true,source:'Black Chrome p.43'}}
export function doberman500State({mode='standby',energyHoursRemaining=48,markedTarget=false}={}){const m=['standby','sentry','tracking'].includes(mode)?mode:'standby';return{mode:m,move:m==='standby'?0:8,canAttack:m==='sentry',canDodgeMelee:m==='tracking',canDodgeRanged:false,perceptionBase:m==='sentry'?10:null,trackingBase:m==='tracking'?10:null,trackingBonus:markedTarget&&m==='tracking'?4:0,roamingRangeMeters:50,followRangeMeters:m==='sentry'?8:null,energyHoursRemaining:Math.max(0,n(energyHoursRemaining)),modeSwitchConsumesAction:false,source:'Black Chrome pp.45-46'}}
export function markingScentEffect({hoursSinceHit=0,washedWithAlcohol=false,tracker='doberman'}={}){const active=!washedWithAlcohol&&n(hoursSinceHit)<24;return{active,trackingBonus:active?(tracker==='doberman'?4:2):0,damage:0,washOff:'alcohol',source:'Black Chrome p.44'}}
export function oneTouchHabitat({insideCity=false,people=1,deployed=false}={}){return{deployed:Boolean(deployed),protectsExtremeElements:Boolean(deployed),sleepQuality:!deployed?null:(insideCity?'street':'wilderness'),cramped:Boolean(deployed&&n(people)>2),deployConsumesAction:true,undeployConsumesAction:true,source:'Black Chrome p.48'}}
export function nitroUltra9({hoursSinceUse=0,baseMove=0,collisionDamageDice=6}={}){const active=n(hoursSinceUse)<24;return{active,move:active?n(baseMove)+5:n(baseMove),narrativeSpeedUnchanged:true,vehicleCollisionDamageDice:active&&n(collisionDamageDice)===6?12:n(collisionDamageDice),source:'Black Chrome p.49'}}
export function mrBiscuitLifestyle({threatRating='city',people=1}={}){const outskirts=String(threatRating).toLowerCase()==='outskirts';return{supportsWithoutLifestyle:outskirts&&n(people)<=10,maxPeople:10,source:'Black Chrome p.49'}}
export function directHpDamage({hp=0,damage=0}={}){return{newHp:n(hp)-Math.max(0,n(damage)),ignoresArmor:true,ablatesArmor:false,source:'Black Chrome p.9 keyword: Damage Directly to Their HP'}}
export function combinationWeaponSwitch(){return{consumesAction:false,source:'Black Chrome p.9 keyword: Combination'}}
export function blackChromeCriticalFailureEffect({weaponId='',attemptedRocketRemoval=false}={}){const id=String(weaponId||'').split('::bc-mode-')[0];if(id==='black_chrome_gunmart_engage_rocket_launcher'&&(attemptedRocketRemoval||true))return{jam:false,destroyed:true,destroyedBeyondRepair:true,detonates:true,damageDice:8,ammoEffect:'armorPiercing',source:'Black Chrome p.107'};if(['black_chrome_gunmart_special','black_chrome_gunmart_smart_special'].includes(id))return{jam:false,destroyed:true,destroyedBeyondRepair:true,detonates:false,source:'Black Chrome p.108'};return{jam:true,destroyed:false,destroyedBeyondRepair:false,detonates:false,source:BLACK_CHROME_SOURCE.weapons}}
export function gunMartEngageRemovalEffect(){return{destroyed:true,destroyedBeyondRepair:true,detonates:true,damageDice:8,ammoEffect:'armorPiercing',source:'Black Chrome p.107'}}
export function publicDefenderLessLethalRule(){return{floorHpAtOne:true,unconsciousAtFloor:true,noCriticalInjury:true,noAblation:true,batteryCapacity:8,rechargeMinutes:60,source:'Black Chrome p.115'}}
export function crowdBusterSonicRule(){return{dv:15,criticalInjury:'damaged-ear',batteryCapacity:8,rechargeMinutes:60,userAlsoAffectedWithoutEarProtection:true,source:'Black Chrome p.116'}}
export function rostovicMetalLoadRule(){return{consumesAction:true,nextDamageDice:4,clearsAllBarrels:true,source:'Black Chrome p.117'}}
export function overlordFacedownBonus({usedToThreaten=false,opponentRecognizes=false}={}){return{bonus:usedToThreaten&&!opponentRecognizes?1:0,source:'Black Chrome p.106'}}
export function bubbaBusterOverheat({shotRounds=[],currentRound=0}={}){const min=Number(currentRound)-19,recent=(shotRounds||[]).map(Number).filter(r=>Number.isFinite(r)&&r>=min&&r<=Number(currentRound));return{shotsInMinute:recent.length,destroyed:recent.length>=3,source:'Black Chrome p.106'}}

function splitSlash(v){return String(v??'').split('/').map(x=>x.trim()).filter(Boolean)}
function allDice(v){return [...String(v??'').matchAll(/(\d+)d6/gi)].map(m=>Number(m[1]))}
function magParts(v){return splitSlash(v).map(x=>({count:(x.match(/\d+/)||[])[0]?Number((x.match(/\d+/)||[])[0]):null,label:(x.match(/\(([^)]+)\)/)||[])[1]||''}))}
function rofParts(v){return splitSlash(v).map(x=>Number((x.match(/\d+/)||[])[0]||1))}
function skillId(v){const s=String(v||'').toLowerCase();if(s.includes('heavy weapon'))return'heavy_weapons';if(s.includes('shoulder'))return'shoulder_arms';if(s.includes('autofire'))return'autofire';if(s.includes('archery'))return'archery';if(s.includes('athletics'))return'athletics';if(s.includes('melee'))return'melee';return'handgun'}
function rangedType({skill,magLabel,name,notes,index=0}){const s=String(skill||'').toLowerCase(),m=String(magLabel||'').toLowerCase(),nm=String(name||'').toLowerCase(),nt=String(notes||'').toLowerCase();if(s.includes('archery'))return'bow';if(s.includes('heavy weapon')||m.includes('rocket'))return'rocketLauncher';if(m.includes('slug')||nt.includes('shotgun shell'))return'shotgun';if(s.includes('autofire')||m.includes('m pistol'))return'smg';if(s.includes('handgun')||m.includes('pistol'))return'pistol';if(m.includes('rifle')||s.includes('shoulder'))return nm.includes('sniper')||nt.includes('sniping scope')?'sniperRifle':'assaultRifle';return index>0?'assaultRifle':'pistol'}
export function blackChromeWeaponModes(item){
 if(!item||item.moduleId!=='black_chrome'||item.category!=='weapon')return[];const raw=item.tableData||{},notes=item.notesText||'',name=item.name||'';
 if(item.sourceCategory==='firearm'){
   if(item.id==='black_chrome_modfire_10x')return[
     {label:`${name} • Heavy Pistol`,type:'pistol',skill:'handgun',damageDice:3,rof:2,mag:8,hands:1,ammoType:'pistol',modeTransformMinutes:1,modeSwitchBlockedInCombat:true},
     {label:`${name} • SMG`,type:'smg',skill:'handgun',damageDice:2,rof:1,mag:30,hands:1,ammoType:'pistol',autofire:3,suppressive:true,modeTransformMinutes:1,modeSwitchBlockedInCombat:true},
     {label:`${name} • Assault Rifle`,type:'assaultRifle',skill:'shoulder_arms',damageDice:5,rof:1,mag:25,hands:2,ammoType:'rifle',autofire:4,suppressive:true,modeTransformMinutes:1,modeSwitchBlockedInCombat:true}
   ];
   if(item.id==='black_chrome_e_tack_public_defender')return[
     {label:`${name} • Lethal`,type:'pistol',skill:'handgun',damageDice:3,rof:2,mag:8,hands:1,ammoType:'pistol',quality:'poor',smartgunLink:true,requiresSubdermalGrip:true,sharedMalfunctionKey:'public-defender'},
     {label:`${name} • Less-than-lethal`,type:'pistol',skill:'handgun',damageDice:3,rof:2,mag:8,hands:1,ammoType:'battery',quality:'poor',smartgunLink:true,requiresSubdermalGrip:true,batteryOnly:true,batteryCapacity:8,batteryKey:'public-defender-ltl',lessLethal:true,floorHpAtOne:true,unconsciousAtFloor:true,noCriticalInjury:true,noAblation:true,sharedMalfunctionKey:'public-defender'}
   ];
   if(item.id==='black_chrome_pursuit_security_crowd_buster')return[
     {label:`${name} • Rifle`,type:'assaultRifle',skill:'shoulder_arms',damageDice:5,rof:1,mag:25,hands:2,ammoType:'rifle',autofire:4,suppressive:true},
     {label:`${name} • Sonic`,type:'assaultRifle',skill:'shoulder_arms',damageDice:0,rof:1,mag:8,hands:2,ammoType:'battery',batteryOnly:true,batteryCapacity:8,batteryKey:'crowd-buster-sonic',sonicMode:true,noCriticalInjury:true,noAblation:true}
   ];
   if(item.id==='black_chrome_rostovic_ulicni_unistitelj')return[
     {label:name,type:'shotgun',skill:'shoulder_arms',damageDice:3,rof:1,mag:3,hands:2,ammoType:'shotgun',quality:'poor',shotgunShellOnly:true,metalLoadable:true}
   ];
   if(item.id==='black_chrome_sanroo_hello_cutie_ultra_k8')return[
     {label:`${name} • Very Heavy Pistol`,type:'pistol',skill:'handgun',damageDice:4,rof:1,mag:30,hands:1,ammoType:'pistol',quality:'excellent',sharedMagazineKey:'ultra-k8',modeSwitchActionInCombat:true,wardrobeStyleBonus:2,wardrobeRequiresAsiaPopPieces:3},
     {label:`${name} • Heavy SMG`,type:'smg',skill:'handgun',damageDice:3,rof:1,mag:30,hands:1,ammoType:'pistol',quality:'excellent',autofire:3,suppressive:true,sharedMagazineKey:'ultra-k8',modeSwitchActionInCombat:true,wardrobeStyleBonus:2,wardrobeRequiresAsiaPopPieces:3}
   ];
   if(item.id==='black_chrome_sternmeyer_m_04_variable_assault')return[
     {label:`${name} • Assault Rifle`,type:'assaultRifle',skill:'shoulder_arms',damageDice:5,rof:1,mag:20,hands:2,ammoType:'rifle',quality:'poor',autofire:4,suppressive:true,combination:true,sharedMalfunctionKey:'m04'},
     {label:`${name} • Grenade Launcher`,type:'grenadeLauncher',skill:'heavy_weapons',damageDice:6,rof:1,mag:2,hands:2,ammoType:'grenade',quality:'poor',explosive:true,nonBasicAmmo:true,combination:true,sharedMalfunctionKey:'m04'}
   ];
   if(item.id==='black_chrome_techtronika_russia_bmg_500')return[
     {label:name,type:'assaultRifle',skill:'heavy_weapons',damageDice:5,rof:1,mag:500,hands:2,ammoType:'rifle',autofire:4,suppressive:true,minimumBodyToFire:11,bipodMountable:true}
   ];
   if(item.id==='black_chrome_tommyknocker')return[
     {label:`${name} • Very Heavy Pistol`,type:'pistol',skill:'handgun',damageDice:4,rof:1,mag:8,hands:1,ammoType:'pistol',combination:true,tommyknockerKick:true,minimumBodyWithoutDrop:10},
     {label:`${name} • Shotgun`,type:'shotgun',skill:'shoulder_arms',damageDice:5,rof:1,mag:2,hands:2,ammoType:'shotgun',quality:'poor',shotgunShell:true,combination:true,tommyknockerKick:true,minimumBodyWithoutDrop:10}
   ];
   if(item.id==='black_chrome_arasaka_prototype_variable_ar')return[
     {label:`${name} • Assault Rifle`,type:'assaultRifle',skill:'shoulder_arms',damageDice:5,rof:1,mag:25,hands:2,ammoType:'rifle',autofire:4,suppressive:true,quality:'excellent',avarMode:'standard'},
     {label:`${name} • Railgun`,type:'assaultRifle',skill:'shoulder_arms',damageDice:5,rof:1,mag:25,hands:2,ammoType:'rifle',quality:'excellent',avarMode:'railgun',aimedShotsBlocked:true,ignoreArmorBelowSp:7,railgunBatteryCapacity:8,modeSwitchActionInCombat:true}
   ];
   if(item.id==='black_chrome_eagletech_survivalist')return[
     {label:`${name} • Besta`,type:'bow',skill:'archery',damageDice:4,rof:1,mag:1,hands:2,ammoType:'arrow',snipingScope:true,nonBasicAmmo:true,combination:true},
     {label:`${name} • Rifle`,type:'assaultRifle',skill:'archery',damageDice:5,rof:1,mag:10,hands:2,ammoType:'rifle',snipingScope:true,nonBasicAmmo:true,combination:true}
   ];
   if(item.id==='black_chrome_ktech_techhammer')return[
     {label:`${name} • Shotgun`,type:'shotgun',skill:'shoulder_arms',damageDice:5,rof:1,mag:4,hands:2,ammoType:'shotgun',shotgunShell:true,allowedAmmoEffects:['basic']},
     {label:`${name} • Rocket`,type:'rocketLauncher',skill:'heavy_weapons',damageDice:8,rof:1,mag:2,hands:2,ammoType:'rocket',explosive:true,smartRocketNoScope:true,allowedAmmoEffects:['smart']}
   ];
   if(item.id==='black_chrome_militech_fox_dual_ammo_pistol')return[
     {label:`${name} • Magazine A`,type:'pistol',skill:'handgun',damageDice:3,rof:2,mag:10,hands:1,ammoType:'pistol',nonBasicAmmo:true,dualMagazine:true,combination:true},
     {label:`${name} • Magazine B`,type:'pistol',skill:'handgun',damageDice:3,rof:2,mag:10,hands:1,ammoType:'pistol',nonBasicAmmo:true,dualMagazine:true,combination:true}
   ];
   if(item.id==='black_chrome_militech_mastiff_smg')return[
     {label:`${name} • SMG`,type:'smg',skill:'handgun',damageDice:2,rof:1,mag:30,hands:2,ammoType:'pistol',autofire:3,suppressive:true},
     {label:`${name} • Shotgun`,type:'shotgun',skill:'shoulder_arms',damageDice:5,rof:1,mag:3,hands:2,ammoType:'shotgun',shotgunShell:true}
   ];
   const skills=splitSlash(raw.Skill||item.skill),damages=allDice(raw.DMG||raw.Damage||item.dmg||item.damage),mags=magParts(raw.Magazine||''),rofs=rofParts(raw.ROF||item.rof),count=Math.max(1,skills.length,damages.length,mags.length,rofs.length),out=[];
   for(let i=0;i<count;i++){const sk=skills[Math.min(i,skills.length-1)]||skills[0]||item.skill||'Handgun',mp=mags[Math.min(i,mags.length-1)]||{},type=rangedType({skill:sk,magLabel:mp.label,name,notes,index:i}),mode={label:count>1?`${name} • modo ${i+1}`:name,type,skill:skillId(sk),damageDice:damages[Math.min(i,damages.length-1)]||item.damageDice||0,rof:rofs[Math.min(i,rofs.length-1)]||item.rof||1,mag:mp.count??item.magazine??0,hands:Number(item.hands||raw.Hands||1),ammoType:type==='shotgun'?'shotgun':type==='bow'?'arrow':type==='rocketLauncher'?'rocket':['assaultRifle','sniperRifle'].includes(type)?'rifle':'pistol'};
     const af=notes.match(/Autofire\s*\(x(\d+)\)/i);if(af)mode.autofire=Number(af[1]);if(/Suppressive|Supressive/i.test(notes))mode.suppressive=true;if(type==='rocketLauncher')mode.explosive=true;if(/Can load Non-Basic Ammo/i.test(notes))mode.nonBasicAmmo=true;if(/Excellent Quality/i.test(notes))mode.quality='excellent';if(/Poor Quality/i.test(notes))mode.quality='poor';out.push(mode)}
   if(item.id==='black_chrome_hades_multipurpose_assault_shotgun')for(const mode of out){mode.nonBasicAmmo=true;mode.mixedAmmoCapacity=5;mode.shotgunShell=true}
   if(item.id==='black_chrome_federated_arms_pepper_shaker')for(const mode of out){mode.autofireOnly=true;mode.autofire=3;mode.suppressive=true;mode.autofireAmmoCost=6;mode.aimedShotsBlocked=true;mode.nonBasicAmmo=true}
   if(item.id==='black_chrome_midnight_arms_beast_shotgun')for(const mode of out){mode.minimumBodyWithoutInjury=10;mode.reloadActions=2;mode.nonBasicAmmo=true}
   if(item.id==='black_chrome_militech_perseus')for(const mode of out){mode.rofAfterFiredPreviousRound=2;mode.quality='excellent'}
   if(item.id==='black_chrome_gunmart_bubba_buster')for(const mode of out){mode.bubbaBuster=true;mode.quality='poor';mode.nonBasicAmmo=true}
   if(item.id==='black_chrome_gunmart_engage_rocket_launcher')for(const mode of out){mode.gunmartEngage=true;mode.quality='poor';mode.explosive=true;mode.ammoType='rocket';mode.allowedAmmoEffects=['armorPiercing']}
   if(item.id==='black_chrome_gunmart_special')for(const mode of out){mode.gunmartDestroyOnFumble=true;mode.quality='poor'}
   if(item.id==='black_chrome_gunmart_smart_special')for(const mode of out){mode.gunmartDestroyOnFumble=true;mode.quality='poor';mode.smartgunLink=true;mode.smartgunInterfacePlugsOnly=true}
   if(item.id==='black_chrome_nomad_rocker')for(const mode of out){mode.quality='poor';mode.freeAmmo=true;mode.ammoType='rocks';mode.repairDestroyedMinutes=60;mode.repairDestroyedNoCheck=true}
   if(item.id==='black_chrome_overlord_handcannon')for(const mode of out){mode.quality='poor';mode.facedownThreatBonus=1}
   if(item.id==='black_chrome_superchrome_glam_rifle')for(const mode of out){mode.autofire=4;mode.suppressive=true;mode.nonBasicAmmo=true;mode.wardrobeStyleBonus=2}
   if(item.id==='black_chrome_superchrome_javelin')for(const mode of out){mode.type='sniperRifle';mode.nonBasicAmmo=true;mode.wardrobeStyleBonus=2}
   if(item.id==='black_chrome_superchrome_sidearm')for(const mode of out){mode.nonBasicAmmo=true;mode.wardrobeStyleBonus=2}
   if(item.id==='black_chrome_westwood')for(const mode of out){mode.incompatibleMagazineAttachments=true}
   return out;
 }
 if(item.sourceCategory==='melee_weapon'){
   if(['black_chrome_arasaka_acid','black_chrome_arasaka_fire','black_chrome_arasaka_wound_salt'].includes(item.id))return[];
   const base={label:name,type:'melee',skill:'melee',damageDice:item.damageDice||allDice(raw.Damage)[0]||0,rof:item.rof||rofParts(raw.ROF)[0]||1,hands:Number(item.hands||raw.Hands||1),armorRule:'half-sp',notes};
   if(item.id==='black_chrome_arasaka_weeping_reaver_katana')return[{...base,quality:'excellent',weepingReaver:true,fluidChambers:3,coatingDurationRounds:20,coatingCooldownRounds:20}];
   if(item.id==='black_chrome_kendachi_mono_katana')return[{...base,ignoreArmorBelowSp:7}];
   if(item.id==='black_chrome_solo_wolf_and_bot_mono_katana')return[{...base,quality:'poor',fakeMonoKatana:true,recognizeDv:13}];
   if(item.id==='black_chrome_kendachi_mono_wakizashi')return[{...base,ignoreArmorBelowSp:7}];
   if(item.id==='black_chrome_white_hornet_tanto')return[{...base,lessLethalChoice:true}];
   if(item.id==='black_chrome_rostovic_kleaver')return[{...base,minimumBodyToWield:11,kleaverChargeable:true,batteryPacksToCharge:3,batteryPackCompatible:true,batteryCapacity:8,chargeDelayRounds:20,chargeDurationRounds:100,chargedDamageDice:5,chargedIgnoreArmorBelowSp:11,chargedIgnitesMildly:true}];
   if(item.id==='black_chrome_zhirafa_rhinocefist')return[
     {label:`${name} • Brawling`,type:'melee',skill:'brawling',damageDice:4,rof:2,hands:1,brawlingMode:true,requiresInterfacePlugs:1,rhinocefist:true,modeSwitchActionInCombat:true,armorRule:'full-sp'},
     {label:`${name} • Very Heavy Melee`,type:'melee',skill:'melee',damageDice:4,rof:1,hands:1,quality:'excellent',requiresInterfacePlugs:1,rhinocefist:true,rhinocefistWeaponMode:true,modeSwitchActionInCombat:true,armorRule:'half-sp'}
   ];
   if(item.id==='black_chrome_faisals_magna_knuckles')return[{...base,magnaKnuckles:true,batteryOnly:false,mag:8,batteryCapacity:8,batteryKey:'magna-knuckles',batteryTriggeredOnDoubleHit:true}];
   if(item.id==='black_chrome_kendachi_mono_guard')return[{...base,replaceForeignObject:true}];
   if(item.id==='black_chrome_the_pursuit_security_bouncer')return[
     {label:`${name} • Stun Baton`,type:'melee',skill:'melee',damageDice:2,rof:2,mag:8,hands:1,bouncer:true,batteryOnly:true,batteryCapacity:8,batteryKey:'bouncer',sharedMagazineKey:'bouncer-battery',batteryPerAttack:1,floorHpAtOne:true,unconsciousAtFloor:true,noCriticalInjury:true,noAblation:true,armorRule:'half-sp'},
     {label:`${name} • Microwaver`,type:'pistol',skill:'handgun',damageDice:0,rof:1,mag:8,hands:1,ammoType:'battery',batteryOnly:true,batteryCapacity:8,batteryKey:'bouncer',sharedMagazineKey:'bouncer-battery',bouncer:true,microwaver:true,noCriticalInjury:true,noAblation:true}
   ];
   if(item.id==='black_chrome_slamdance_fangfist')return[{...base,quality:'excellent',fangFist:true,deploymentDamageDice:4,deploymentRof:1}];
   if(item.id==='black_chrome_slamdance_tasmanskiy_klo')return[{...base,quality:'excellent',tasmanKlo:true,interrogationThreatBonus:2}];
   return[base];
 }
 if(item.sourceCategory==='explosive'){
   const def=blackChromeExplosiveDefinition(item);if(!def||def.kind!=='grenade_ammo')return[];
   return[{label:name,type:'thrown',skill:'athletics',damageDice:Number(def.damageDice||0),rof:1,hands:1,throwMaxMeters:25,throwRangeTable:'grenadeLauncher',explosiveThrown:true,explosiveDefinition:def,ammoEffect:def.ammoEffect,armorPiercing:Boolean(def.armorPiercing),noCoverDamage:Boolean(def.noCoverDamage),separateDamagePerTarget:Boolean(def.separateDamagePerTarget),secondCriticalOnForeignObject:Boolean(def.secondCriticalOnForeignObject),secondCriticalBonusDamage:Boolean(def.secondCriticalBonusDamage),source:def.source}];
 }
 if(item.sourceCategory==='thrown_weapon'){
   const dice=item.damageDice||allDice(raw.Damage)[0]||0,hands=Number(item.hands||raw.Hands||1),common={type:'thrown',skill:'athletics',damageDice:dice,hands,throwMaxMeters:25,throwRangeTable:'grenadeLauncher',halvesSpWhenThrown:/Halves SP/i.test(notes),notes};
   if(item.id==='black_chrome_ranger_combat_boomerang')return[{label:`${name} • Throw`,...common,rof:1,countsAsHalfRof2:true,halvesSpWhenThrown:true,cannotMelee:true,returnsWithTargetingScope:true}];
   if(item.id==='black_chrome_utility_tomahawk')return[
     {label:`${name} • Melee`,type:'melee',skill:'melee',damageDice:dice,rof:2,hands,armorRule:'half-sp'},
     {label:`${name} • Throw`,...common,rof:1,halvesSpWhenThrown:true}
   ];
   if(item.id==='black_chrome_kendachi_mono_star')return[
     {label:`${name} • Melee`,type:'melee',skill:'melee',damageDice:dice,rof:2,hands,armorRule:'half-sp'},
     {label:`${name} • Throw`,...common,rof:1,countsAsHalfRof2:true,halvesSpWhenThrown:true,secondCriticalOnForeignObject:true,secondCriticalBonusDamage:true}
   ];
   return[{label:name,...common,rof:item.rof||rofParts(raw.ROF)[0]||1}];
 }
 return[];
}

export const BLACK_CHROME_REAVER_FLUIDS={
 black_chrome_arasaka_fire:{id:'black_chrome_arasaka_fire',effect:'fire',label:'Arasaka Fire',source:'Black Chrome p.91'},
 black_chrome_arasaka_acid:{id:'black_chrome_arasaka_acid',effect:'acid',label:'Arasaka Acid',source:'Black Chrome p.91'},
 black_chrome_arasaka_wound_salt:{id:'black_chrome_arasaka_wound_salt',effect:'wound_salt',label:'Arasaka Wound Salt',source:'Black Chrome p.91'}
};
export function blackChromeReaverFluid(itemOrId){const id=typeof itemOrId==='string'?itemOrId:itemOrId?.id;return BLACK_CHROME_REAVER_FLUIDS[id]||null}
export function blackChromeExplosiveDefinition(itemOrId){const id=typeof itemOrId==='string'?itemOrId:itemOrId?.id;const defs={
 black_chrome_arachnid_grenade:{kind:'grenade_ammo',damageDice:0,ammoType:'grenade',ammoEffect:'arachnid',armingRounds:10,noDamage:true,webHp:15,escapeSkill:'brawling',escapeDv:15,alcoholDouse:true,moveBlockedWhenActive:true,twoHandedBlockedWhenActive:true,actionPenaltyWhenActive:-2,source:'Black Chrome p.86'},
 black_chrome_shuriken_tornado_grenade:{kind:'grenade_ammo',damageDice:6,ammoType:'grenade',ammoEffect:'bc_shuriken_tornado',armorPiercing:true,separateDamagePerTarget:true,secondCriticalOnForeignObject:true,secondCriticalBonusDamage:false,source:'Black Chrome p.87'},
 black_chrome_gunmart_door_cracker:{kind:'placed',damageDice:6,setupRounds:10,fastSetupDv:15,coverOnly:true,detonationConsumesAction:true,source:'Black Chrome p.87'},
 black_chrome_micro_hydrogen_combuster:{kind:'submerged_timer',damageDice:6,armorPiercing:true,delayRounds:10,steamAreaMeters:10,steamDurationRounds:20,steamPenalty:-4,requiresLiquid:true,source:'Black Chrome p.88'},
 black_chrome_killchip_100_micro_bomb:{kind:'chipware_bomb',damageDice:6,directHp:true,criticalInjury:'brain-injury',detectDv:15,detectSkills:['criminology','cybertech','demolitions','electronics_security_tech'],perceptionDv:21,requiresChipwareSocket:true,source:'Black Chrome p.88'},
 black_chrome_ktech_security_grenade:{kind:'grenade_ammo',damageDice:5,ammoType:'grenade',ammoEffect:'bc_security_grenade',armorPiercing:true,noCoverDamage:true,source:'Black Chrome p.89'},
 black_chrome_outlet_explosive:{kind:'placed',damageDice:6,setupRounds:10,fastSetupDv:15,armorPiercing:true,detectDv:15,detectSkills:['criminology','demolitions','electronics_security_tech'],perceptionDv:21,detonationConsumesAction:true,source:'Black Chrome p.89'},
 black_chrome_tr_4_detonator_fluid:{kind:'vehicle_sabotage',damageDice:6,setupRounds:10,fastSetupDv:15,armorPiercing:true,ignoreVehicleArmor:true,weakPointDoubleDamage:true,detonatesOnVehicleStart:true,requiresChooh2TankAccess:true,source:'Black Chrome p.90'}
 };return defs[id]?{id,...clone(defs[id])}:null}
export function blackChromeExplosiveSetupRule(itemOrId,{demolitionsTotal=null}={}){const def=blackChromeExplosiveDefinition(itemOrId);if(!def)return{ok:false,reason:'unknown-black-chrome-explosive'};if(!['placed','vehicle_sabotage'].includes(def.kind))return{ok:true,setupRounds:0,fastSetup:false,definition:def,source:def.source};const fast=demolitionsTotal!=null&&n(demolitionsTotal)>n(def.fastSetupDv,15);return{ok:true,setupRounds:fast?1:n(def.setupRounds,10),fastSetup:fast,fastSetupDv:n(def.fastSetupDv,15),definition:def,source:def.source}}
export function blackChromeExplosiveDetection(itemOrId,{skill='',total=0}={}){const def=blackChromeExplosiveDefinition(itemOrId);if(!def||(!def.detectDv&&!def.perceptionDv))return{ok:false,reason:'no-detection-rule'};const id=String(skill||'').toLowerCase().replace(/[^a-z0-9]+/g,'_'),perception=id==='perception',allowed=perception||(def.detectSkills||[]).includes(id),dv=perception?n(def.perceptionDv):n(def.detectDv);return{ok:allowed,recognized:allowed&&n(total)>dv,skill:id,dv,source:def.source}}
export function resolveBlackChromeSpecialExplosive({itemOrId,rolledDamage=0,targetHp=0,coverHp=0,vehicleSdp=0,armed=true,vehicleStarted=true,submerged=true}={}){const def=blackChromeExplosiveDefinition(itemOrId);if(!def)return{ok:false,reason:'unknown-black-chrome-explosive'};const damage=Math.max(0,n(rolledDamage));if(def.kind==='chipware_bomb')return{ok:true,detonated:true,directHpDamage:damage,newHp:n(targetHp)-damage,criticalInjury:def.criticalInjury,ignoresArmor:true,ablatesArmor:false,source:def.source};if(def.kind==='placed'&&def.coverOnly)return armed?{ok:true,detonated:true,coverDamage:damage,newCoverHp:Math.max(0,n(coverHp)-damage),targetDamage:0,source:def.source}:{ok:false,reason:'not-armed',source:def.source};if(def.kind==='submerged_timer')return submerged?{ok:true,armed:true,delayRounds:def.delayRounds,detonated:true,damage,armorPiercing:true,steamAreaMeters:def.steamAreaMeters,steamDurationRounds:def.steamDurationRounds,steamPenalty:def.steamPenalty,source:def.source}:{ok:false,reason:'liquid-required',source:def.source};if(def.kind==='vehicle_sabotage')return armed&&vehicleStarted?{ok:true,detonated:true,damage,vehicleDamage:damage*2,newVehicleSdp:Math.max(0,n(vehicleSdp)-damage*2),ignoreVehicleArmor:true,weakPointDoubleDamage:true,source:def.source}:{ok:false,reason:armed?'vehicle-not-started':'not-armed',source:def.source};if(def.kind==='placed')return armed?{ok:true,detonated:true,damage,armorPiercing:Boolean(def.armorPiercing),source:def.source}:{ok:false,reason:'not-armed',source:def.source};return{ok:true,definition:def,source:def.source}}
export function blackChromeWearableWeaponRule(itemOrId){const id=typeof itemOrId==='string'?itemOrId:itemOrId?.id;const rules={
 black_chrome_the_pursuit_security_bouncer:{equipConsumesActionInCombat:true,source:'Black Chrome p.97'},
 black_chrome_slamdance_fangfist:{equipConsumesActionInCombat:true,source:'Black Chrome p.98'},
 black_chrome_slamdance_tasmanskiy_klo:{equipConsumesActionInCombat:true,freeBladeDrawStow:true,source:'Black Chrome p.99'},
 black_chrome_zhirafa_rhinocefist:{equipConsumesActionInCombat:true,requiresInterfacePlugs:1,source:'Black Chrome p.95'}
 };return rules[id]?{id,...clone(rules[id])}:null}
export function blackChromeMeleeDynamicProfile(mode,state={},round=1){const out=clone(mode||{}),s=state||{},r=Math.max(1,n(round,1));if(out.lessLethalChoice&&s.whiteHornetLessLethal){out.floorHpAtOne=true;out.unconsciousAtFloor=true;}if(out.kleaverChargeable){const charged=Number(s.kleaverChargedUntilRound||0)>=r&&Number(s.kleaverReadyRound||0)<=r;out.kleaverCharged=charged;if(charged){out.damageDice=out.chargedDamageDice;out.ignoreArmorBelowSp=out.chargedIgnoreArmorBelowSp;out.igniteOnHit=out.chargedIgnitesMildly}}if(out.fangFist){const deployedRound=Number(s.fangFistDeployedRound||0);out.fangFistExtended=Boolean(s.fangFistExtended);if(out.fangFistExtended&&deployedRound===r){out.damageDice=out.deploymentDamageDice;out.rof=out.deploymentRof}}if(out.tasmanKlo){out.tasmanKloDrawn=Boolean(s.tasmanKloDrawn)}if(out.weepingReaver){const coats=(s.reaverCoatings||[]).filter(x=>Number(x.untilRound||0)>=r);out.reaverCoatings=coats.map(x=>x.effect);if(out.reaverCoatings.includes('acid'))out.extraAblation=1;if(out.reaverCoatings.includes('fire'))out.igniteOnPenetration=true;if(out.reaverCoatings.includes('wound_salt')){out.secondCriticalOnForeignObject=true;out.secondCriticalBonusDamage=false}}return out}
export function blackChromeWeaponRuntime(item,modeIndex=0){const modes=blackChromeWeaponModes(item);if(!modes.length)return null;const index=Math.max(0,Math.min(modes.length-1,Math.trunc(n(modeIndex))));return{id:item.id,name:item.name,moduleId:'black_chrome',modeIndex:index,modes:modes.length,...clone(modes[index]),source:item.sourceRef||BLACK_CHROME_SOURCE.weapons}}
