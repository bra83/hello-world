const SRC='The 12 Days of REDMas v1.02 (R. Talsorian Games, Dec 2024)';
export const REDMAS_ITEMS=Object.freeze({
 thermal_dagger:{name:'Centurion Essentials Thermal Dagger',kind:'weapon',cost:1000,quality:'excellent',weapon:'medium_melee',damage:'2d6',rof:2,concealable:true,stronglyOnFireOnHit:true},
 smart_glove:{name:'CyberDude Smart Glove',kind:'gear',cost:750,subdermalGrip:true,optionSlots:2,options:['cyberarm','cyberlimb'],concealable:false},
 hd_shield:{name:'High-Density Bulletproof Shield',kind:'shield',cost:200,hp:15,popupCompatible:false},
 light_metalgear:{name:'Light Metalgear',kind:'armor',cost:1000,sp:16,penalty:{ref:-3,dex:-3,move:-3}},
 long_pistol:{name:"Nat's Long-Barreled Pistol",kind:'weapon',cost:500,quality:'excellent',weapon:'very_heavy_pistol',damage:'4d6',magazine:8,rof:1,concealable:false,slots:3,rangeDV:[[0,6,14],[7,12,13],[13,25,14],[26,50,20],[51,100,25],[101,200,28],[201,400,30],[401,800,null]]},
 rapid_responder:{name:'Pursuit Security E-TACK Rapid Responder',kind:'weapon',cost:500,quality:'poor',weapon:'medium_pistol',damage:'2d6',magazine:18,rof:2,concealable:true,slots:1,extendedMagazine:true,stunBayonet:true},
 stun_bayonet:{name:'Stun Bayonet',kind:'attachment',cost:100,eligible:'non_exotic_shoulder_arms',stunBaton:true},
 faceplate_mount:{name:'Quick Change Faceplate Mount',kind:'cyberware',cost:1000,hl:'4d6',install:'hospital',location:'internal_body',faceplateAction:true,includesFaceplates:1,additionalFaceplateCost:100},
 quick_digits:{name:'Rocklin Augmentics Quick Digits',kind:'cyberware',cost:250,hl:'1d6',install:'clinic',location:'cyberhand',meatArmSoloInstall:true},
 skydrivers:{name:'Rocklin Augmentics Skydrivers',kind:'cyberware',cost:1000,hl:'4d6',install:'hospital',paired:true,slotsEach:2,jumpBoosters:true},
 smart_ears:{name:'Smart Ears',kind:'gear',cost:1000,radioScannerMusicPlayer:true,cyberaudioSlots:2,installOptionMinutes:60},
 cyberspine:{name:'Sycust Cyberspine',kind:'cyberware',cost:1000,hl:'2d6',install:'hospital',location:'internal_body',slots:3,hardened:true,spinalInjuryImmune:true,contortionistBonus:1,cybersnakeMount:true},
 cyberconductor:{name:'Zetatech CyberConductor',kind:'gear',cost:1000,deckSlots:3,switchMeatAction:true,switchDamage:3},
 cyberconductor_integrated:{name:'Zetatech CyberConductor, Integrated',kind:'borgware',cost:1000,hl:'4d6',install:'hospital',slots:3,fbcOnly:true,switchDamage:0,deckSlots:3}
});
export function redmasItem(id){const x=REDMAS_ITEMS[id]; if(!x) throw new Error('UNKNOWN_REDMAS_ITEM'); return structuredClone(x)}
export function rapidResponderFire({ammo=0,burst=false,ammoType='basic'}={}){ammo=Math.max(0,Math.trunc(ammo)); if(burst&&ammo>=3)return{ok:true,mode:'burst',spent:3,ammo:ammo-3,damage:'3d6',armorPiercing:ammoType!=='armor_piercing'||ammoType==='armor_piercing',source:SRC}; return{ok:ammo>=1,mode:'single',spent:ammo>=1?1:0,ammo:Math.max(0,ammo-1),damage:'2d6',armorPiercing:ammoType==='armor_piercing',burstDisabled:ammo<3,source:SRC}}
export function quickDigitsBonus({installed=0,skill=''}={}){const skills=['conceal/reveal object','contortionist_hand','first aid','forgery','language_sign','paramedic','pick lock','pick pocket'];return{bonus:installed>=2&&skills.includes(String(skill).toLowerCase())?1:0,stacks:false,source:SRC}}
export function skydriverCoverAttack({movedMeters=0,attackKind='brawling',target='cover',baseDice=2}={}){const valid=movedMeters>=4&&['brawling','martial_arts'].includes(attackKind)&&target==='cover';return{bonusDice:valid?3:0,totalDice:Number(baseDice)+(valid?3:0),source:SRC}}
export function cyberconductorSwitch({integrated=false,jackedIn=false,fromDeck='',toDeck='',activePrograms=[]}={}){if(!jackedIn)return{ok:false,reason:'not-jacked-in',source:SRC};if(!toDeck||toDeck===fromDeck)return{ok:false,reason:'different-deck-required',source:SRC};return{ok:true,meatAction:true,fromDeck,toDeck,derezzed:[...activePrograms],hpDamage:integrated?0:3,source:SRC}}
export function smartGloveAccess({worn=false,handOptions=[]}={}){return{gloveOptionsAccessible:Boolean(worn),blockedHandOptions:worn?handOptions.filter(x=>!x.fingerBased).map(x=>x.id):[],fingerOptionsAccessible:handOptions.filter(x=>x.fingerBased).map(x=>x.id),actionToToggle:true,source:SRC}}
export function thermalDaggerHit({hit=false}={}){return{hit:Boolean(hit),stronglyOnFire:Boolean(hit),source:SRC}}
export function faceplateToggle({attached=false}={}){return{attached:!attached,consumesAction:true,source:SRC}}
export function cyberspineProtection({critical='',emp=false}={}){return{ignoreCritical:critical==='spinal_injury',ignoreBonusDamage:critical==='spinal_injury',empImmune:Boolean(emp),contortionistBonus:1,source:SRC}}
