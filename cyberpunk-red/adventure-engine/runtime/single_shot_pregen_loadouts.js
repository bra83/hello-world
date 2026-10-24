/*
 * Single Shot Pack v1.1 — source-bound loadout transcription, pages 4-22.
 * Only enumerated starting equipment is represented; do not treat these records
 * as fully promoted playable sheets until role mechanics, ammunition, inventory
 * ownership and source-image verification are integrated with the host runtime.
 * Data are intentionally inert: no balance, cyberware installation, damage or
 * character-state mutations happen from this registry.
 */
export const SINGLE_SHOT_LOADOUT_VERSION=1;
const armor=()=>[{location:'head',name:'Light Armorjack',sp:11,penalty:0},
                    {location:'body',name:'Light Armorjack',sp:11,penalty:0}];
const weapon=(name,damage,ammo,rof,quantity=1,notes=null)=>({name,damage,ammo,rof,quantity,notes});
const entry=(number,name,role,roleAbility,weapons,cyberware,gear)=>({
 id:`ssp_pregen_${String(number).padStart(2,'0')}`,
 sourceRef:`Single Shot Pack v1.1:p${2*number+2}`,
 name,role,roleAbility,roleRank:4,cashEb:500,armor:armor(),
 weapons,cyberware,gear,verifiedFrom:'pdf-text',imageVerified:false,
 playablePromotion:'BLOCKED_PENDING_RUNTIME_AND_VISUAL_REVIEW'
});
export const SINGLE_SHOT_PREGEN_LOADOUTS=Object.freeze([
 entry(1,'Forty','Rockerboy','Charismatic Impact',[
  weapon('Heavy Melee Weapon','3d6',null,2),weapon('Very Heavy Pistol','4d6',8,1),
  weapon('Tear Gas Grenade',null,null,null,2)],
  ['Cyberaudio Suite','Audio Recorder','Tech Hair','Chemskin'],
  ['Agent','Musical Instrument','Pocket Amp','Laptop Computer','Radio Scanner/Music Player','Vid Camera','Glow Paint x5']),
 entry(2,'Grease','Fixer','Operator',[
  weapon('Light Melee Weapon','1d6',null,2),weapon('Heavy Pistol','3d6',8,2),
  weapon('Very Heavy Pistol','4d6',8,1)],
  ['Cyberaudio Suite','Internal Agent','Voice Stress Analyzer','Subdermal Pocket'],
  ['Agent','Bug Detector','Disposable Cellphone x2','Laptop Computer']),
 entry(3,'Mover','Solo','Combat Awareness',[
  weapon('Heavy Melee Weapon','3d6',null,2),weapon('Assault Rifle','5d6',25,1),
  weapon('Very Heavy Pistol','4d6',8,1)],
  ['Biomonitor','Neural Link','Sandevistan'],['Agent']),
 entry(4,'Racer','Nomad','Moto',[
  weapon('Heavy Melee Weapon','3d6',null,2),weapon('Very Heavy Pistol','4d6',8,1)],
  ['Neural Link','Interface Plugs'],
  ['Agent','Binoculars','Flashlight','Grapple Gun','Radio Communicator x2','Rope','Techtool']),
 entry(5,'Redeye','Netrunner','Interface',[
  weapon('Very Heavy Pistol','4d6',8,1)],
  ['Neural Link','Interface Plugs','Shift Tacs'],['Agent','Cyberdeck','Virtuality Goggles']),
 entry(6,'Torch','Tech','Maker',[
  weapon('Shotgun','5d6',4,1),weapon('Flashbang Grenade',null,null,null)],
  ['Cybereye','MicroOptics','Tool Hand','Skinwatch'],
  ['Agent','Anti-Smog Breathing Mask','Disposable Cellphone','Duct Tape x5','Flashlight','Road Flare x6','Tech Bag']),
 entry(7,'Redtail','Medtech','Medicine',[
  weapon('Assault Rifle','5d6',25,1),weapon('Smoke Grenade',null,null,null,2)],
  ['Cybereye','TeleOptics','Nasal Filters','Biomonitor'],
  ['Agent','Airhypo','Flashlight','Glow Paint','Medtech Bag','Bulletproof Shield']),
 entry(8,'24/7','Media','Credibility',[
  weapon('Heavy Pistol','3d6',8,2)],
  ['Cyberaudio Suite','Amplified Hearing','Light Tattoo'],
  ['Agent','Audio Recorder','Binoculars','Grapple Gun','Radio Scanner/Music Player','Scrambler/Descrambler','Video Camera']),
 entry(9,'Suri “Cavalry” Navarro','Lawman','Backup',[
  weapon('Assault Rifle','5d6',25,1),weapon('Heavy Pistol','3d6',8,2)],
  ['Hidden Holster','Subdermal Pocket'],
  ['Agent','Flashlight','Handcuffs x2','Radio Communicator','Road Flare x10','Bulletproof Shield']),
 entry(10,'Chanda Mishra','Exec','Teamwork',[
  weapon('Very Heavy Pistol','4d6',8,1)],
  ['Toxin Binder','Cyberaudio Suite','Internal Agent','Biomonitor'],
  ['Radio Communicator x4','Scrambler/Descrambler'])
]);
const validText=x=>typeof x==='string'&&x.trim().length>0;
export function validateSingleShotLoadouts(rows=SINGLE_SHOT_PREGEN_LOADOUTS){
 if(!Array.isArray(rows)||rows.length!==10)throw Error('SINGLE_SHOT_LOADOUT_COUNT');
 const seen=new Set();
 for(let i=0;i<rows.length;i++){
  const p=rows[i],expectedId=`ssp_pregen_${String(i+1).padStart(2,'0')}`;
  if(p?.id!==expectedId||seen.has(p.id)||p.sourceRef!==`Single Shot Pack v1.1:p${2*i+4}`)
   throw Error('SINGLE_SHOT_LOADOUT_SOURCE_ID');
  seen.add(p.id);
  if(!validText(p.name)||!validText(p.role)||!validText(p.roleAbility)||p.roleRank!==4||p.cashEb!==500)
   throw Error('SINGLE_SHOT_LOADOUT_IDENTITY');
  if(p.armor?.length!==2||p.armor[0].location!=='head'||p.armor[1].location!=='body'||
    p.armor.some(a=>a.name!=='Light Armorjack'||a.sp!==11||a.penalty!==0))
   throw Error('SINGLE_SHOT_LOADOUT_ARMOR');
  if(!Array.isArray(p.weapons)||p.weapons.length<1||p.weapons.some(w=>!validText(w.name)||
    !Number.isSafeInteger(w.quantity)||w.quantity<1||
    (w.damage!=null&&!/^\dd6$/.test(w.damage))||
    (w.ammo!=null&&(!Number.isSafeInteger(w.ammo)||w.ammo<1))||
    (w.rof!=null&&(!Number.isSafeInteger(w.rof)||w.rof<1))))
   throw Error('SINGLE_SHOT_LOADOUT_WEAPONS');
  if(!Array.isArray(p.cyberware)||p.cyberware.some(x=>!validText(x))||
    !Array.isArray(p.gear)||p.gear.some(x=>!validText(x)))
   throw Error('SINGLE_SHOT_LOADOUT_ITEMS');
  if(p.playablePromotion!=='BLOCKED_PENDING_RUNTIME_AND_VISUAL_REVIEW'||p.imageVerified!==false)
   throw Error('SINGLE_SHOT_LOADOUT_UNVERIFIED_PROMOTION');
 }
 return true;
}
export function getSingleShotLoadout(id){
 const found=SINGLE_SHOT_PREGEN_LOADOUTS.find(p=>p.id===id);
 return found?JSON.parse(JSON.stringify(found)):null;
}
