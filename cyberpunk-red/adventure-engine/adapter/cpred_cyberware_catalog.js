export const CYBERWARE_CATALOG_SOURCE='Cyberpunk RED Core Rulebook Digital v1.25 pp.110-116, 358-367';
const R=(id,count=1)=>({id,count});
const H='1d6/2 round up';
export const CORE_CYBERWARE=[
// Fashionware — 7 category slots
{id:'biomonitor',name:'Biomonitor',cyberwareCategory:'fashionware',typicalInstall:'mall',price:100,humanityLossPreset:0,humanityLossDice:'0',effectSummary:'Vitals readout; can link to Agent.'},
{id:'chemskin',name:'Chemskin',cyberwareCategory:'fashionware',typicalInstall:'mall',price:100,humanityLossPreset:0,humanityLossDice:'0',effectSummary:'+2 Personal Grooming when user also has Techhair.'},
{id:'emp_threading',name:'EMP Threading',cyberwareCategory:'fashionware',typicalInstall:'mall',price:10,humanityLossPreset:0,humanityLossDice:'0'},
{id:'light_tattoo',name:'Light Tattoo',cyberwareCategory:'fashionware',typicalInstall:'mall',price:100,humanityLossPreset:0,humanityLossDice:'0',effectSummary:'+2 Wardrobe & Style with three or more Light Tattoos.',benefitsStack:false},
{id:'shift_tacts',name:'Shift Tacts',cyberwareCategory:'fashionware',typicalInstall:'mall',price:100,humanityLossPreset:0,humanityLossDice:'0'},
{id:'skinwatch',name:'Skinwatch',cyberwareCategory:'fashionware',typicalInstall:'mall',price:100,humanityLossPreset:0,humanityLossDice:'0'},
{id:'techhair',name:'Techhair',cyberwareCategory:'fashionware',typicalInstall:'mall',price:100,humanityLossPreset:0,humanityLossDice:'0',effectSummary:'+2 Personal Grooming when user also has Chemskin.'},

// Neuralware / Chipware
{id:'neural_link',name:'Neural Link',cyberwareCategory:'neuralware',foundation:true,optionSlots:5,typicalInstall:'clinic',price:500,humanityLossPreset:7,humanityLossDice:'2d6'},
{id:'braindance_recorder',name:'Braindance Recorder',cyberwareCategory:'neuralware',typicalInstall:'clinic',price:500,humanityLossPreset:7,humanityLossDice:'2d6',requires:[R('neural_link')]},
{id:'chipware_socket',name:'Chipware Socket',cyberwareCategory:'neuralware',typicalInstall:'clinic',price:500,humanityLossPreset:7,humanityLossDice:'2d6',requires:[R('neural_link')],chipwareSocket:true},
{id:'interface_plugs',name:'Interface Plugs',cyberwareCategory:'neuralware',typicalInstall:'clinic',price:500,humanityLossPreset:7,humanityLossDice:'2d6',requires:[R('neural_link')]},
{id:'kerenzikov',name:'Kerenzikov',cyberwareCategory:'neuralware',typicalInstall:'clinic',price:500,humanityLossPreset:14,humanityLossDice:'4d6',requires:[R('neural_link')],exclusiveGroup:'speedware',effectSummary:'+2 Initiative, always on.'},
{id:'sandevistan',name:'Sandevistan',cyberwareCategory:'neuralware',typicalInstall:'clinic',price:500,humanityLossPreset:7,humanityLossDice:'2d6',requires:[R('neural_link')],exclusiveGroup:'speedware',effectSummary:'Action: +3 Initiative for 1 minute; then 1 hour cooldown.'},
{id:'chemical_analyzer',name:'Chemical Analyzer',cyberwareCategory:'chipware',typicalInstall:'n/a',price:500,humanityLossPreset:3,humanityLossDice:'1d6',requires:[R('chipware_socket')],chipware:true,noSlot:true},
{id:'memory_chip',name:'Memory Chip',cyberwareCategory:'chipware',typicalInstall:'n/a',price:10,humanityLossPreset:0,humanityLossDice:'0',requires:[R('chipware_socket')],chipware:true,noSlot:true},
{id:'olfactory_boost',name:'Olfactory Boost',cyberwareCategory:'chipware',typicalInstall:'n/a',price:100,humanityLossPreset:7,humanityLossDice:'2d6',requires:[R('chipware_socket')],chipware:true,noSlot:true,effectSummary:'Tracking may use scent.'},
{id:'pain_editor',name:'Pain Editor',cyberwareCategory:'chipware',typicalInstall:'n/a',price:1000,humanityLossPreset:14,humanityLossDice:'4d6',requires:[R('chipware_socket')],chipware:true,noSlot:true,effectSummary:'Ignore Seriously Wounded penalties.'},
{id:'skill_chip',name:'Skill Chip',cyberwareCategory:'chipware',typicalInstall:'n/a',price:500,alternatePrice:1000,humanityLossPreset:7,humanityLossDice:'2d6',requires:[R('chipware_socket')],chipware:true,noSlot:true,effectSummary:'Specific Skill becomes Level 3 unless already 3+; x2 Skill chips cost 1,000eb.'},
{id:'tactile_boost',name:'Tactile Boost',cyberwareCategory:'chipware',typicalInstall:'n/a',price:100,humanityLossPreset:7,humanityLossDice:'2d6',requires:[R('chipware_socket')],chipware:true,noSlot:true,effectSummary:'Detect motion within 20m/yd by touching a surface.'},

// Cyberoptics
{id:'cybereye',name:'Cybereye',cyberwareCategory:'cyberoptics',foundation:true,optionSlots:3,typicalInstall:'clinic',price:100,humanityLossPreset:7,humanityLossDice:'2d6'},
{id:'anti_dazzle',name:'Anti-Dazzle',cyberwareCategory:'cyberoptics',typicalInstall:'mall',price:100,humanityLossPreset:2,humanityLossDice:H,requires:[R('cybereye',2)],paired:true,effectSummary:'Immune to effects caused by flashes of light.'},
{id:'chyron',name:'Chyron',cyberwareCategory:'cyberoptics',typicalInstall:'mall',price:100,humanityLossPreset:2,humanityLossDice:H,requires:[R('cybereye')]},
{id:'color_shift',name:'Color Shift',cyberwareCategory:'cyberoptics',typicalInstall:'mall',price:100,humanityLossPreset:2,humanityLossDice:H,requires:[R('cybereye')]},
{id:'dartgun',name:'Dartgun',cyberwareCategory:'cyberoptics',typicalInstall:'clinic',price:500,humanityLossPreset:2,humanityLossDice:H,requires:[R('cybereye')],slotsUsed:3,effectSummary:'Concealed single-shot Dartgun Exotic Weapon.'},
{id:'image_enhance',name:'Image Enhance',cyberwareCategory:'cyberoptics',typicalInstall:'mall',price:500,humanityLossPreset:3,humanityLossDice:'1d6',requires:[R('cybereye',2)],paired:true,effectSummary:'+2 Perception, Lip Reading, Conceal/Reveal Object involving sight.'},
{id:'low_light_infrared_uv',name:'Low Light / Infrared / UV',cyberwareCategory:'cyberoptics',typicalInstall:'mall',price:500,humanityLossPreset:3,humanityLossDice:'1d6',requires:[R('cybereye',2)],paired:true,slotsUsed:2,effectSummary:'Ignore visual penalties from darkness, smoke, fog, etc.'},
{id:'microoptics',name:'MicroOptics',cyberwareCategory:'cyberoptics',typicalInstall:'clinic',price:100,humanityLossPreset:2,humanityLossDice:H,requires:[R('cybereye')],effectSummary:'400x magnification.'},
{id:'microvideo',name:'MicroVideo',cyberwareCategory:'cyberoptics',typicalInstall:'clinic',price:500,humanityLossPreset:2,humanityLossDice:H,requires:[R('cybereye')],slotsUsed:2},
{id:'radiation_detector',name:'Radiation Detector',cyberwareCategory:'cyberoptics',typicalInstall:'clinic',price:1000,humanityLossPreset:3,humanityLossDice:'1d6',requires:[R('cybereye')]},
{id:'targeting_scope',name:'Targeting Scope',cyberwareCategory:'cyberoptics',typicalInstall:'clinic',price:500,humanityLossPreset:3,humanityLossDice:'1d6',requires:[R('cybereye')],effectSummary:'+1 to Aimed Shot Checks.'},
{id:'teleoptics',name:'TeleOptics',cyberwareCategory:'cyberoptics',typicalInstall:'clinic',price:500,humanityLossPreset:3,humanityLossDice:'1d6',requires:[R('cybereye')],effectSummary:'+1 Aimed Shots against targets 51m/yds or farther.'},
{id:'virtuality',name:'Virtuality',cyberwareCategory:'cyberoptics',typicalInstall:'mall',price:100,humanityLossPreset:2,humanityLossDice:H,requires:[R('cybereye',2)],paired:true},

// Cyberaudio
{id:'cyberaudio_suite',name:'Cyberaudio Suite',cyberwareCategory:'cyberaudio',foundation:true,optionSlots:3,typicalInstall:'clinic',price:500,humanityLossPreset:7,humanityLossDice:'2d6'},
{id:'amplified_hearing',name:'Amplified Hearing',cyberwareCategory:'cyberaudio',typicalInstall:'mall',price:100,humanityLossPreset:3,humanityLossDice:'1d6',requires:[R('cyberaudio_suite')],effectSummary:'+2 Perception involving hearing.'},
{id:'audio_recorder',name:'Audio Recorder',cyberwareCategory:'cyberaudio',typicalInstall:'clinic',price:100,humanityLossPreset:2,humanityLossDice:H,requires:[R('cyberaudio_suite')]},
{id:'bug_detector',name:'Bug Detector',cyberwareCategory:'cyberaudio',typicalInstall:'mall',price:100,humanityLossPreset:2,humanityLossDice:H,requires:[R('cyberaudio_suite')]},
{id:'homing_tracer',name:'Homing Tracer',cyberwareCategory:'cyberaudio',typicalInstall:'clinic',price:100,humanityLossPreset:2,humanityLossDice:H,requires:[R('cyberaudio_suite')]},
{id:'internal_agent',name:'Internal Agent',cyberwareCategory:'cyberaudio',typicalInstall:'mall',price:100,humanityLossPreset:3,humanityLossDice:'1d6',requires:[R('cyberaudio_suite')]},
{id:'level_damper',name:'Level Damper',cyberwareCategory:'cyberaudio',typicalInstall:'mall',price:100,humanityLossPreset:2,humanityLossDice:H,requires:[R('cyberaudio_suite')],effectSummary:'Immune to effects caused by loud noises.'},
{id:'radio_communicator',name:'Radio Communicator',cyberwareCategory:'cyberaudio',typicalInstall:'mall',price:100,humanityLossPreset:2,humanityLossDice:H,requires:[R('cyberaudio_suite')]},
{id:'radio_scanner_music_player',name:'Radio Scanner / Music Player',cyberwareCategory:'cyberaudio',typicalInstall:'clinic',price:50,humanityLossPreset:2,humanityLossDice:H,requires:[R('cyberaudio_suite')]},
{id:'radar_detector',name:'Radar Detector',cyberwareCategory:'cyberaudio',typicalInstall:'clinic',price:500,humanityLossPreset:2,humanityLossDice:H,requires:[R('cyberaudio_suite')]},
{id:'scrambler_descrambler',name:'Scrambler / Descrambler',cyberwareCategory:'cyberaudio',typicalInstall:'mall',price:100,humanityLossPreset:2,humanityLossDice:H,requires:[R('cyberaudio_suite')]},
{id:'voice_stress_analyzer',name:'Voice Stress Analyzer',cyberwareCategory:'cyberaudio',typicalInstall:'mall',price:100,humanityLossPreset:3,humanityLossDice:'1d6',requires:[R('cyberaudio_suite')],effectSummary:'+2 Human Perception and Interrogation.'},

// Internal cyberware — 7 category slots
{id:'audiovox',name:'AudioVox',cyberwareCategory:'internal',typicalInstall:'clinic',price:500,humanityLossPreset:3,humanityLossDice:'1d6',effectSummary:'+2 Acting and Play Instrument when singing.'},
{id:'contraceptive_implant',name:'Contraceptive Implant',cyberwareCategory:'internal',typicalInstall:'mall',price:10,humanityLossPreset:0,humanityLossDice:'0'},
{id:'enhanced_antibodies',name:'Enhanced Antibodies',cyberwareCategory:'internal',typicalInstall:'mall',price:500,humanityLossPreset:2,humanityLossDice:H,effectSummary:'After stabilization, heal BODY x2 per full day resting.'},
{id:'cybersnake',name:'Cybersnake',cyberwareCategory:'internal',typicalInstall:'hospital',price:1000,humanityLossPreset:14,humanityLossDice:'4d6',effectSummary:'Concealable Very Heavy Melee Weapon.'},
{id:'gills',name:'Gills',cyberwareCategory:'internal',typicalInstall:'hospital',price:1000,humanityLossPreset:7,humanityLossDice:'2d6',effectSummary:'Breathe underwater.'},
{id:'grafted_muscle_bone_lace',name:'Grafted Muscle and Bone Lace',cyberwareCategory:'internal',typicalInstall:'hospital',price:1000,humanityLossPreset:14,humanityLossDice:'4d6',benefitsStack:true,effectSummary:'+2 BODY; stacks to BODY 10 maximum.'},
{id:'independent_air_supply',name:'Independent Air Supply',cyberwareCategory:'internal',typicalInstall:'hospital',price:1000,humanityLossPreset:2,humanityLossDice:H,effectSummary:'30 minutes oxygen; 1 hour ambient refill.'},
{id:'midnight_lady',name:'Midnight Lady Sexual Implant',cyberwareCategory:'internal',typicalInstall:'clinic',price:100,humanityLossPreset:7,humanityLossDice:'2d6'},
{id:'mr_studd',name:'Mr. Studd Sexual Implant',cyberwareCategory:'internal',typicalInstall:'clinic',price:100,humanityLossPreset:7,humanityLossDice:'2d6'},
{id:'nasal_filters',name:'Nasal Filters',cyberwareCategory:'internal',typicalInstall:'clinic',price:100,humanityLossPreset:2,humanityLossDice:H,effectSummary:'Immune to toxic gases, fumes, and similar dangers.'},
{id:'radar_sonar_implant',name:'Radar / Sonar Implant',cyberwareCategory:'internal',typicalInstall:'clinic',price:1000,humanityLossPreset:7,humanityLossDice:'2d6',effectSummary:'Scan terrain within 50m/yds; cannot scan through cover.'},
{id:'toxin_binders',name:'Toxin Binders',cyberwareCategory:'internal',typicalInstall:'clinic',price:100,humanityLossPreset:2,humanityLossDice:H,effectSummary:'+2 Resist Torture/Drugs.'},
{id:'vampyres',name:'Vampyres',cyberwareCategory:'internal',typicalInstall:'clinic',price:500,humanityLossPreset:14,humanityLossDice:'4d6',effectSummary:'Concealable Excellent Quality Light Melee Weapon; can add Poison/Biotoxin.'},

// External cyberware — 7 category slots
{id:'hidden_holster',name:'Hidden Holster',cyberwareCategory:'external',typicalInstall:'clinic',price:500,humanityLossPreset:7,humanityLossDice:'2d6'},
{id:'skin_weave',name:'Skin Weave',cyberwareCategory:'external',typicalInstall:'hospital',price:500,humanityLossPreset:7,humanityLossDice:'2d6',effectSummary:'Body/head SP7; does not stack with worn Armor; ablates; restores 1 SP per day resting.'},
{id:'subdermal_armor',name:'Subdermal Armor',cyberwareCategory:'external',typicalInstall:'hospital',price:1000,humanityLossPreset:14,humanityLossDice:'4d6',effectSummary:'Body/head SP11; does not stack with worn Armor; ablates; restores 1 SP per day resting.'},
{id:'subdermal_pocket',name:'Subdermal Pocket',cyberwareCategory:'external',typicalInstall:'clinic',price:100,humanityLossPreset:3,humanityLossDice:'1d6'},

// Cyberarms and arm options
{id:'cyberarm',name:'Cyberarm',cyberwareCategory:'cyberarm',foundation:true,optionSlots:4,typicalInstall:'hospital',price:500,humanityLossPreset:7,humanityLossDice:'2d6'},
{id:'standard_hand',name:'Standard Hand',cyberwareCategory:'cyberarm',foundationOptional:true,typicalInstall:'clinic',price:100,humanityLossPreset:2,humanityLossDice:H},
{id:'big_knucks',name:'Big Knucks',cyberwareCategory:'cyberarm',foundationOptional:true,typicalInstall:'clinic',price:100,humanityLossPreset:3,humanityLossDice:'1d6',effectSummary:'Concealable Medium Melee Weapon.'},
{id:'cyberarm_cyberdeck',name:'Cyberdeck (Cyberarm)',cyberwareCategory:'cyberarm',typicalInstall:'clinic',price:500,humanityLossPreset:3,humanityLossDice:'1d6',requires:[R('cyberarm')],slotsUsed:3},
{id:'grapple_hand',name:'Grapple Hand',cyberwareCategory:'cyberarm',typicalInstall:'clinic',price:100,humanityLossPreset:3,humanityLossDice:'1d6',requires:[R('cyberarm')]},
{id:'medscanner',name:'Medscanner',cyberwareCategory:'cyberarm',typicalInstall:'clinic',price:500,humanityLossPreset:7,humanityLossDice:'2d6',requires:[R('cyberarm')],slotsUsed:2,effectSummary:'+2 First Aid and Paramedic.'},
{id:'popup_grenade_launcher',name:'Popup Grenade Launcher',cyberwareCategory:'cyberarm',typicalInstall:'clinic',price:500,humanityLossPreset:7,humanityLossDice:'2d6',requires:[R('cyberarm')],slotsUsed:2},
{id:'popup_melee_weapon',name:'Popup Melee Weapon',cyberwareCategory:'cyberarm',typicalInstall:'clinic',price:500,humanityLossPreset:7,humanityLossDice:'2d6',requires:[R('cyberarm')],slotsUsed:2},
{id:'popup_shield',name:'Popup Shield',cyberwareCategory:'cyberarm',typicalInstall:'clinic',price:500,humanityLossPreset:7,humanityLossDice:'2d6',requires:[R('cyberarm')],slotsUsed:3},
{id:'popup_ranged_weapon',name:'Popup Ranged Weapon',cyberwareCategory:'cyberarm',typicalInstall:'clinic',price:500,humanityLossPreset:7,humanityLossDice:'2d6',requires:[R('cyberarm')],slotsUsed:2},
{id:'quick_change_mount',name:'Quick Change Mount',cyberwareCategory:'cyberarm',typicalInstall:'clinic',price:100,humanityLossPreset:7,humanityLossDice:'2d6',requires:[R('cyberarm')],quickChangeMount:true},
{id:'rippers',name:'Rippers',cyberwareCategory:'cyberarm',foundationOptional:true,typicalInstall:'clinic',price:500,humanityLossPreset:3,humanityLossDice:'1d6',effectSummary:'Concealable Medium Melee Weapon.'},
{id:'scratchers',name:'Scratchers',cyberwareCategory:'cyberarm',foundationOptional:true,typicalInstall:'mall',price:100,humanityLossPreset:2,humanityLossDice:H,effectSummary:'Concealable Light Melee Weapon.'},
{id:'shoulder_cam',name:'Shoulder Cam',cyberwareCategory:'cyberarm',typicalInstall:'clinic',price:500,humanityLossPreset:7,humanityLossDice:'2d6',requires:[R('cyberarm')],slotsUsed:2},
{id:'slice_n_dice',name:'Slice ‘N Dice',cyberwareCategory:'cyberarm',foundationOptional:true,typicalInstall:'clinic',price:500,humanityLossPreset:3,humanityLossDice:'1d6',effectSummary:'Concealable Medium Melee Weapon.'},
{id:'subdermal_grip',name:'Subdermal Grip',cyberwareCategory:'cyberarm',foundationOptional:true,typicalInstall:'clinic',price:100,humanityLossPreset:3,humanityLossDice:'1d6',requires:[R('neural_link')],effectSummary:'Smartgun connection without Interface Plugs.'},
{id:'techscanner',name:'Techscanner',cyberwareCategory:'cyberarm',typicalInstall:'clinic',price:500,humanityLossPreset:7,humanityLossDice:'2d6',requires:[R('cyberarm')],slotsUsed:2,effectSummary:'+2 Basic Tech, Cybertech, Land/Sea/Air Vehicle Tech, Electronics/Security Tech, Weaponstech.'},
{id:'tool_hand',name:'Tool Hand',cyberwareCategory:'cyberarm',foundationOptional:true,typicalInstall:'clinic',price:100,humanityLossPreset:3,humanityLossDice:'1d6'},
{id:'wolvers',name:'Wolvers',cyberwareCategory:'cyberarm',foundationOptional:true,typicalInstall:'clinic',price:500,humanityLossPreset:7,humanityLossDice:'2d6',effectSummary:'Concealable Heavy Melee Weapon.'},

// Cyberlegs and cross-limb options
{id:'cyberleg',name:'Cyberleg',cyberwareCategory:'cyberleg',foundation:true,optionSlots:3,typicalInstall:'hospital',price:100,humanityLossPreset:3,humanityLossDice:'1d6'},
{id:'standard_foot',name:'Standard Foot',cyberwareCategory:'cyberleg',foundationOptional:true,typicalInstall:'clinic',price:100,humanityLossPreset:2,humanityLossDice:H},
{id:'grip_foot',name:'Grip Foot',cyberwareCategory:'cyberleg',typicalInstall:'clinic',price:500,humanityLossPreset:3,humanityLossDice:'1d6',requires:[R('cyberleg',2)],paired:true,effectSummary:'Negates movement penalty when climbing.'},
{id:'jump_booster',name:'Jump Booster',cyberwareCategory:'cyberleg',typicalInstall:'clinic',price:500,humanityLossPreset:3,humanityLossDice:'1d6',requires:[R('cyberleg',2)],paired:true,slotsUsed:2,effectSummary:'Negates movement penalty when jumping.'},
{id:'skate_foot',name:'Skate Foot',cyberwareCategory:'cyberleg',typicalInstall:'clinic',price:500,humanityLossPreset:3,humanityLossDice:'1d6',requires:[R('cyberleg',2)],paired:true,effectSummary:'Run Action movement +6m/yds.'},
{id:'talon_foot',name:'Talon Foot',cyberwareCategory:'cyberleg',foundationOptional:true,typicalInstall:'clinic',price:500,humanityLossPreset:3,humanityLossDice:'1d6',effectSummary:'Concealable Light Melee Weapon.'},
{id:'web_foot',name:'Web Foot',cyberwareCategory:'cyberleg',typicalInstall:'clinic',price:500,humanityLossPreset:3,humanityLossDice:'1d6',requires:[R('cyberleg',2)],paired:true,effectSummary:'Negates movement penalty when swimming.'},
{id:'hardened_shielding',name:'Hardened Shielding',cyberwareCategory:'cyberlimb',compatibleFoundationIds:['cyberarm','cyberleg'],typicalInstall:'clinic',price:1000,humanityLossPreset:3,humanityLossDice:'1d6',requiresAny:[R('cyberarm'),R('cyberleg')],effectSummary:'Cyberlimb and its options cannot be disabled by EMP or Non-Black ICE effects.'},
{id:'plastic_covering',name:'Plastic Covering',cyberwareCategory:'cyberlimb',compatibleFoundationIds:['cyberarm','cyberleg'],noSlot:true,typicalInstall:'mall',price:100,humanityLossPreset:0,humanityLossDice:'0',requiresAny:[R('cyberarm'),R('cyberleg')]},
{id:'realskinn_covering',name:'Realskinn™ Covering',cyberwareCategory:'cyberlimb',compatibleFoundationIds:['cyberarm','cyberleg'],noSlot:true,typicalInstall:'mall',price:500,humanityLossPreset:0,humanityLossDice:'0',requiresAny:[R('cyberarm'),R('cyberleg')]},
{id:'superchrome_covering',name:'Superchrome® Covering',cyberwareCategory:'cyberlimb',compatibleFoundationIds:['cyberarm','cyberleg'],noSlot:true,typicalInstall:'mall',price:1000,humanityLossPreset:0,humanityLossDice:'0',requiresAny:[R('cyberarm'),R('cyberleg')],effectSummary:'+2 Wardrobe & Style.'},

// Borgware
{id:'artificial_shoulder_mount',name:'Artificial Shoulder Mount',cyberwareCategory:'borgware',classification:'borgware',borgware:true,typicalInstall:'hospital',price:1000,humanityLossPreset:14,humanityLossDice:'4d6',effectSummary:'Allows 2 additional Cyberarms.'},
{id:'implanted_linear_frame_beta',name:'Implanted Linear Frame β (Beta)',cyberwareCategory:'borgware',classification:'borgware',borgware:true,typicalInstall:'hospital',price:5000,humanityLossPreset:14,humanityLossDice:'4d6',minBody:8,requires:[R('grafted_muscle_bone_lace',2)],effectSummary:'BODY becomes 14.'},
{id:'implanted_linear_frame_sigma',name:'Implanted Linear Frame Σ (Sigma)',cyberwareCategory:'borgware',classification:'borgware',borgware:true,typicalInstall:'hospital',price:1000,humanityLossPreset:14,humanityLossDice:'4d6',minBody:6,requires:[R('grafted_muscle_bone_lace',1)],effectSummary:'BODY becomes 12.'},
{id:'multioptic_mount',name:'MultiOptic Mount',cyberwareCategory:'borgware',classification:'borgware',borgware:true,typicalInstall:'hospital',price:1000,humanityLossPreset:14,humanityLossDice:'4d6',effectSummary:'Allows up to 5 additional Cybereyes.'},
{id:'sensor_array',name:'Sensor Array',cyberwareCategory:'borgware',classification:'borgware',borgware:true,typicalInstall:'clinic',price:1000,humanityLossPreset:14,humanityLossDice:'4d6',requires:[R('cyberaudio_suite')],noSlot:true,effectSummary:'Allows up to 5 additional Cyberaudio options without consuming a Cyberaudio option slot.'},
];
export function cyberwareById(id){return CORE_CYBERWARE.find(x=>x.id===id)||null}
export function validateCyberwarePrerequisites(installed=[],candidate={}){
 const rows=(Array.isArray(installed)?installed:[]).filter(x=>x?.installed!==false),counts=new Map();for(const x of rows){counts.set(x.id,(counts.get(x.id)||0)+1);if(x.foundationAlias)counts.set(x.foundationAlias,(counts.get(x.foundationAlias)||0)+1)}
 for(const req of candidate.requires||[]){if((counts.get(req.id)||0)<Number(req.count||1))return{ok:false,reason:'prerequisite-required',requiredId:req.id,requiredCount:Number(req.count||1),installedCount:counts.get(req.id)||0}}
 if(Array.isArray(candidate.requiresAny)&&candidate.requiresAny.length&&!candidate.requiresAny.some(req=>(counts.get(req.id)||0)>=Number(req.count||1)))return{ok:false,reason:'one-of-prerequisites-required',requiresAny:candidate.requiresAny};
 if(candidate.exclusiveGroup&&rows.some(x=>x.exclusiveGroup===candidate.exclusiveGroup))return{ok:false,reason:'exclusive-group-conflict',exclusiveGroup:candidate.exclusiveGroup};
 return{ok:true,source:CYBERWARE_CATALOG_SOURCE};
}
