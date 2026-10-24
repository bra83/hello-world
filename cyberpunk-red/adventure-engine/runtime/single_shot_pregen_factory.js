// Single Shot Pack v1.1 — PDF-Verified Playable Pregen Promotion Factory & NET Architectures
// Source verified against: RTG-CPRed-SingleShotPackv1.1.pdf (pages 4-28)
import { getSingleShotPregenIdentity } from './single_shot_pregen_identities.js';
import { getSingleShotSkillProfile, SINGLE_SHOT_PREGEN_SKILL_PROFILES } from './single_shot_pregen_skill_profiles.js';
import { getSingleShotLoadout } from './single_shot_pregen_loadouts.js';
import { SINGLE_SHOT_NET_ARCHITECTURES as CANONICAL_NET_ARCHITECTURES } from './single_shot_pack_registry.js';

const STAT_KEYS = Object.freeze(['INT', 'REF', 'DEX', 'TECH', 'COOL', 'WILL', 'LUCK', 'MOVE', 'BODY', 'EMP']);

export const SINGLE_SHOT_PDF_VERIFIED_SPECS = Object.freeze({
  ssp_pregen_01: Object.freeze({
    id: 'ssp_pregen_01',
    handle: 'Forty',
    role: 'Rockerboy',
    roleAbility: 'Charismatic Impact',
    roleRank: 4,
    pdfPage: 4,
    imageVerified: true,
    culturalLanguage: { name: 'Streetslang', level: 2 },
    armor: { head: { id: 'lightArmorjackHead', sp: 11 }, body: { id: 'lightArmorjackBody', sp: 11 } },
    weapons: [
      { id: 'heavyMelee', name: 'Heavy Melee Weapon', damage: '3d6', rof: 2, skill: 'Melee Weapon' },
      { id: 'veryHeavyPistol', name: 'Very Heavy Pistol', damage: '4d6', rof: 1, clipSize: 8, currentAmmo: 8, magazines: 7, totalRounds: 56, ammoId: 'ammoBasicPistol', skill: 'Handgun' },
      { id: 'ammoTeargasGrenade', name: 'Teargas Grenade', damage: 'Special', rof: 1, count: 2, skill: 'Athletics' }
    ],
    ammoInventory: { ammoBasicPistol: 56, ammoTeargasGrenade: 2 },
    cyberware: [
      { id: 'cyberaudio_suite', name: 'Cyberaudio Suite', hl: 7 },
      { id: 'audio_recorder', name: 'Audio Recorder', hl: 2 },
      { id: 'techhair', name: 'Techhair', hl: 0 },
      { id: 'chemskin', name: 'Chemskin', hl: 0 }
    ],
    gear: [
      { id: 'agent', name: 'Agent', qty: 1 },
      { id: 'instrument', name: 'Electric Guitar', qty: 1 },
      { id: 'pocketAmplifier', name: 'Pocket Amplifier', qty: 1 },
      { id: 'computer', name: 'Computer', qty: 1 },
      { id: 'radioScanner', name: 'Radio Scanner / Music Player', qty: 1 },
      { id: 'videoCamera', name: 'Video Camera', qty: 1 },
      { id: 'glowPaint', name: 'Glow Paint', qty: 5 }
    ],
    fashion: ['Bag Lady Chic Bottoms', 'Bag Lady Chic Top', 'Bag Lady Chic Footwear', 'Urban Flash Jacket', 'Jewelry', 'Mirrorshades'],
    roleAbilityState: { role: 'Rockerboy', ability: 'Charismatic Impact', rank: 4, venueMax: 'Medium Club', fanFavorBonus: 4 },
    eurobucks: 500,
    background: 'Born on an orbital station, Forty writes anti-corporate anthems on Night City streets.'
  }),
  ssp_pregen_02: Object.freeze({
    id: 'ssp_pregen_02',
    handle: 'Grease',
    role: 'Fixer',
    roleAbility: 'Operator',
    roleRank: 4,
    pdfPage: 6,
    imageVerified: true,
    culturalLanguage: { name: 'Streetslang', level: 4 },
    extraLanguages: [
      { name: 'Spanish', level: 4 },
      { name: 'Mandarin', level: 4 }
    ],
    armor: { head: { id: 'lightArmorjackHead', sp: 11 }, body: { id: 'lightArmorjackBody', sp: 11 } },
    weapons: [
      { id: 'lightMelee', name: 'Light Melee Weapon', damage: '1d6', rof: 2, skill: 'Melee Weapon' },
      { id: 'heavyPistol', name: 'Heavy Pistol', damage: '3d6', rof: 2, clipSize: 8, currentAmmo: 8, magazines: 13, totalRounds: 104, ammoId: 'ammoBasicPistol', skill: 'Handgun' },
      { id: 'veryHeavyPistol', name: 'Very Heavy Pistol', damage: '4d6', rof: 1, clipSize: 8, currentAmmo: 8, magazines: 13, totalRounds: 104, ammoId: 'ammoBasicPistol', skill: 'Handgun' }
    ],
    ammoInventory: { ammoBasicPistol: 208 },
    cyberware: [
      { id: 'cyberaudio_suite', name: 'Cyberaudio Suite', hl: 7 },
      { id: 'internal_agent', name: 'Internal Agent', hl: 3 },
      { id: 'voice_stress_analyzer', name: 'Voice Stress Analyzer', hl: 3 },
      { id: 'subdermal_pocket', name: 'Subdermal Pocket', hl: 3 }
    ],
    gear: [
      { id: 'agent', name: 'Agent', qty: 1 },
      { id: 'bugDetector', name: 'Bug Detector', qty: 1 },
      { id: 'disposablePhone', name: 'Disposable Cell Phone', qty: 2 },
      { id: 'computer', name: 'Computer', qty: 1 }
    ],
    fashion: ['Gang Colors Bottoms', 'Gang Colors Top', 'Generic Chic Footwear', 'Urban Flash Jacket', 'Jewelry', 'Mirrorshades'],
    roleAbilityState: { role: 'Fixer', ability: 'Operator', rank: 4, maxItemAvailability: 'Expensive (500eb)', haggleDiscountPercent: 10, bonusLanguages: ['Spanish', 'Mandarin'] },
    eurobucks: 500,
    background: 'Former corporate family kid turned street Fixer connecting Night Markets and Edgerunners.'
  }),
  ssp_pregen_03: Object.freeze({
    id: 'ssp_pregen_03',
    handle: 'Mover',
    role: 'Solo',
    roleAbility: 'Combat Awareness',
    roleRank: 4,
    pdfPage: 8,
    imageVerified: true,
    culturalLanguage: { name: 'Streetslang', level: 2 },
    armor: { head: { id: 'lightArmorjackHead', sp: 11 }, body: { id: 'lightArmorjackBody', sp: 11 } },
    weapons: [
      { id: 'heavyMelee', name: 'Heavy Melee Weapon', damage: '3d6', rof: 2, skill: 'Melee Weapon' },
      { id: 'assaultRifle', name: 'Assault Rifle', damage: '5d6', rof: 1, clipSize: 25, currentAmmo: 25, magazines: 3, totalRounds: 75, ammoId: 'ammoBasicRifle', skill: 'Shoulder Arms' },
      { id: 'veryHeavyPistol', name: 'Very Heavy Pistol', damage: '4d6', rof: 1, clipSize: 8, currentAmmo: 8, magazines: 8, totalRounds: 64, ammoId: 'ammoBasicPistol', skill: 'Handgun' }
    ],
    ammoInventory: { ammoBasicRifle: 75, ammoBasicPistol: 64 },
    cyberware: [
      { id: 'biomonitor', name: 'Biomonitor', hl: 0 },
      { id: 'neural_link', name: 'Neural Link', hl: 7 },
      { id: 'sandevistan', name: 'Sandevistan', hl: 7 }
    ],
    gear: [
      { id: 'agent', name: 'Agent', qty: 1 }
    ],
    fashion: ['Leisurewear Bottoms x3', 'Leisurewear Top x5', 'Leisurewear Footwear x2', 'Leisurewear Jacket x3', 'Mirrorshades'],
    roleAbilityState: { role: 'Solo', ability: 'Combat Awareness', rank: 4, pointsTotal: 4, allocation: { threatDetection: 0, initiativeResponse: 2, precisionAttack: 2, damageDeflection: 0, fumbleRecovery: 0 } },
    eurobucks: 500,
    background: 'Drift Nation survivor turned professional Night City Solo with razor-sharp reflexes.'
  }),
  ssp_pregen_04: Object.freeze({
    id: 'ssp_pregen_04',
    handle: 'Racer',
    role: 'Nomad',
    roleAbility: 'Moto',
    roleRank: 4,
    pdfPage: 10,
    imageVerified: true,
    culturalLanguage: { name: 'Streetslang', level: 2 },
    armor: { head: { id: 'lightArmorjackHead', sp: 11 }, body: { id: 'lightArmorjackBody', sp: 11 } },
    weapons: [
      { id: 'heavyMelee', name: 'Heavy Melee Weapon', damage: '3d6', rof: 2, skill: 'Melee Weapon' },
      { id: 'veryHeavyPistol', name: 'Very Heavy Pistol', damage: '4d6', rof: 1, clipSize: 8, currentAmmo: 8, magazines: 13, totalRounds: 104, ammoId: 'ammoBasicPistol', skill: 'Handgun' }
    ],
    ammoInventory: { ammoBasicPistol: 104 },
    cyberware: [
      { id: 'neural_link', name: 'Neural Link', hl: 7 },
      { id: 'interface_plugs', name: 'Interface Plugs', hl: 7 }
    ],
    gear: [
      { id: 'agent', name: 'Agent', qty: 1 },
      { id: 'binoculars', name: 'Binoculars', qty: 1 },
      { id: 'flashlight', name: 'Flashlight', qty: 1 },
      { id: 'grappleGun', name: 'Grapple Gun', qty: 1 },
      { id: 'radioCommunicator', name: 'Radio Communicator', qty: 2 },
      { id: 'rope60', name: 'Rope (60ft/20m)', qty: 1 },
      { id: 'techtool', name: 'Techtool', qty: 1 }
    ],
    fashion: ['Nomad Leathers Bottoms', 'Nomad Leathers Top x2', 'Nomad Leathers Footwear x2', 'Nomad Leathers Jacket', 'Glasses'],
    roleAbilityState: {
      role: 'Nomad',
      ability: 'Moto',
      rank: 4,
      vehicles: [
        {
          id: 'compact_groundcar',
          name: 'Compact Groundcar (Family Motorpool)',
          sdp: 70,
          seats: 6,
          combatSpeed: 20,
          narrativeSpeed: '100 MPH / 161 KPH',
          upgrades: ['seating_upgrade', 'heavy_chassis', 'housing_capacity']
        }
      ]
    },
    eurobucks: 500,
    background: 'Raised in a land Nomad pack running convoys through the Badlands into Night City.'
  }),
  ssp_pregen_05: Object.freeze({
    id: 'ssp_pregen_05',
    handle: 'Redeye',
    role: 'Netrunner',
    roleAbility: 'Interface',
    roleRank: 4,
    pdfPage: 12,
    imageVerified: true,
    culturalLanguage: { name: 'Streetslang', level: 2 },
    armor: { head: { id: 'lightArmorjackHead', sp: 11 }, body: { id: 'lightArmorjackBody', sp: 11 } },
    weapons: [
      { id: 'veryHeavyPistol', name: 'Very Heavy Pistol', damage: '4d6', rof: 1, clipSize: 8, currentAmmo: 8, magazines: 4, totalRounds: 32, ammoId: 'ammoBasicPistol', skill: 'Handgun' }
    ],
    ammoInventory: { ammoBasicPistol: 32 },
    cyberware: [
      { id: 'neural_link', name: 'Neural Link', hl: 7 },
      { id: 'interface_plugs', name: 'Interface Plugs', hl: 7 },
      { id: 'shift_tacts', name: 'Shift Tacts', hl: 0 }
    ],
    gear: [
      { id: 'agent', name: 'Agent', qty: 1 },
      { id: 'cyberdeck', name: 'Cyberdeck (7 Slots)', qty: 1, slots: 7, programs: ['Armor', 'Sword', 'See Ya', 'Vrizzbolt', 'Worm'] },
      { id: 'virtualityGoggles', name: 'Virtuality Goggles', qty: 1 }
    ],
    fashion: ['Generic Chic Bottoms', 'Generic Chic Top x3', 'Generic Chic Footwear', 'Urban Flash Jacket'],
    roleAbilityState: {
      role: 'Netrunner',
      ability: 'Interface',
      rank: 4,
      netActionsPerTurn: 3,
      cyberdeckSlots: 7,
      installedPrograms: ['Armor', 'Sword', 'See Ya', 'Vrizzbolt', 'Worm']
    },
    eurobucks: 500,
    background: 'Combat Zone Netrunner diving local NET Architectures for high-value data payloads.'
  }),
  ssp_pregen_06: Object.freeze({
    id: 'ssp_pregen_06',
    handle: 'Torch',
    role: 'Tech',
    roleAbility: 'Maker',
    roleRank: 4,
    pdfPage: 14,
    imageVerified: true,
    culturalLanguage: { name: 'Streetslang', level: 2 },
    armor: { head: { id: 'lightArmorjackHead', sp: 11 }, body: { id: 'lightArmorjackBody', sp: 11 } },
    weapons: [
      { id: 'shotgun', name: 'Shotgun', damage: '5d6', rof: 1, clipSize: 4, currentAmmo: 4, magazines: 7, totalRounds: 25, ammoId: 'ammoBasicShotgun', skill: 'Shoulder Arms' },
      { id: 'ammoFlashbangGrenade', name: 'Flashbang Grenade', damage: 'Special', rof: 1, count: 1, skill: 'Athletics' }
    ],
    ammoInventory: { ammoBasicShotgun: 25, ammoFlashbangGrenade: 1 },
    cyberware: [
      { id: 'cybereye', name: 'Cybereye', hl: 7 },
      { id: 'microoptics', name: 'MicroOptics', hl: 2 },
      { id: 'tool_hand', name: 'Tool Hand', hl: 3 },
      { id: 'skinwatch', name: 'Skinwatch', hl: 0 }
    ],
    gear: [
      { id: 'agent', name: 'Agent', qty: 1 },
      { id: 'antiSmogMask', name: 'Anti-Smog Breathing Mask', qty: 1 },
      { id: 'disposablePhone', name: 'Disposable Cell Phone', qty: 1 },
      { id: 'ductTape', name: 'Duct Tape', qty: 5 },
      { id: 'flashlight', name: 'Flashlight', qty: 1 },
      { id: 'roadFlare', name: 'Road Flare', qty: 6 },
      { id: 'techBag', name: 'Tech Bag', qty: 1 }
    ],
    fashion: ['Generic Chic Bottoms x8', 'Generic Chic Top x10', 'Generic Chic Jacket x2', 'Nomad Leathers Footwear'],
    roleAbilityState: {
      role: 'Tech',
      ability: 'Maker',
      rank: 4,
      specialties: { fieldExpertise: 4, upgradeExpertise: 2, fabricationExpertise: 2, inventionExpertise: 0 }
    },
    eurobucks: 500,
    background: 'Combat Zone hardware specialist who keeps Edgerunner gear and turrets functioning under fire.'
  }),
  ssp_pregen_07: Object.freeze({
    id: 'ssp_pregen_07',
    handle: 'Redtail',
    role: 'Medtech',
    roleAbility: 'Medicine',
    roleRank: 4,
    pdfPage: 16,
    imageVerified: true,
    culturalLanguage: { name: 'Streetslang', level: 2 },
    armor: { head: { id: 'lightArmorjackHead', sp: 11 }, body: { id: 'lightArmorjackBody', sp: 11 } },
    weapons: [
      { id: 'assaultRifle', name: 'Assault Rifle', damage: '5d6', rof: 1, clipSize: 25, currentAmmo: 25, magazines: 4, totalRounds: 100, ammoId: 'ammoBasicRifle', skill: 'Shoulder Arms' },
      { id: 'ammoSmokeGrenade', name: 'Smoke Grenade', damage: 'Special', rof: 1, count: 2, skill: 'Athletics' }
    ],
    ammoInventory: { ammoBasicRifle: 100, ammoSmokeGrenade: 2 },
    cyberware: [
      { id: 'cybereye', name: 'Cybereye', hl: 7 },
      { id: 'teleoptics', name: 'TeleOptics', hl: 3 },
      { id: 'nasal_filters', name: 'Nasal Filters', hl: 2 },
      { id: 'biomonitor', name: 'Biomonitor', hl: 0 }
    ],
    gear: [
      { id: 'agent', name: 'Agent', qty: 1 },
      { id: 'airhypo', name: 'Airhypo', qty: 1 },
      { id: 'flashlight', name: 'Flashlight', qty: 1 },
      { id: 'glowPaint', name: 'Glow Paint', qty: 1 },
      { id: 'medtechBag', name: 'Medtech Bag', qty: 1 },
      { id: 'bulletproofShield', name: 'Bulletproof Shield (10 HP)', qty: 1, hp: 10 },
      { id: 'cryopump', name: 'Cryopump (Medicine Rank 1)', qty: 1 }
    ],
    fashion: ['Generic Chic Bottoms x2', 'Generic Chic Top x5', 'Generic Chic Footwear x2', 'Leisurewear Jacket', 'Glasses'],
    roleAbilityState: {
      role: 'Medtech',
      ability: 'Medicine',
      rank: 4,
      specialties: { surgery: 1, medicalTechPharmaceuticals: 2, medicalTechCryosystemOperation: 1 },
      synthesizedPharmaceuticals: ['Speedheal', 'Stim'],
      cryopumpCharges: 1
    },
    eurobucks: 500,
    background: 'Street trauma surgeon armed with an Airhypo, Cryopump, and an Assault Rifle for hot extractions.'
  }),
  ssp_pregen_08: Object.freeze({
    id: 'ssp_pregen_08',
    handle: '24/7',
    role: 'Media',
    roleAbility: 'Credibility',
    roleRank: 4,
    pdfPage: 18,
    imageVerified: true,
    culturalLanguage: { name: 'Streetslang', level: 2 },
    armor: { head: { id: 'lightArmorjackHead', sp: 11 }, body: { id: 'lightArmorjackBody', sp: 11 } },
    weapons: [
      { id: 'heavyPistol', name: 'Heavy Pistol', damage: '3d6', rof: 2, clipSize: 8, currentAmmo: 8, magazines: 7, totalRounds: 56, ammoId: 'ammoBasicPistol', skill: 'Handgun' }
    ],
    ammoInventory: { ammoBasicPistol: 56 },
    cyberware: [
      { id: 'cyberaudio_suite', name: 'Cyberaudio Suite', hl: 7 },
      { id: 'amplified_hearing', name: 'Amplified Hearing', hl: 3 },
      { id: 'light_tattoo', name: 'Light Tattoo', hl: 0 }
    ],
    gear: [
      { id: 'agent', name: 'Agent', qty: 1 },
      { id: 'audioRecorder', name: 'Audio Recorder', qty: 1 },
      { id: 'binoculars', name: 'Binoculars', qty: 1 },
      { id: 'grappleGun', name: 'Grapple Gun', qty: 1 },
      { id: 'radioScanner', name: 'Radio Scanner / Music Player', qty: 1 },
      { id: 'scrambler', name: 'Scrambler / Descrambler', qty: 1 },
      { id: 'videoCamera', name: 'Video Camera', qty: 1 }
    ],
    fashion: ['Generic Chic Bottoms', 'Generic Chic Top', 'Generic Chic Footwear', 'Urban Flash Jacket'],
    roleAbilityState: {
      role: 'Media',
      ability: 'Credibility',
      rank: 4,
      rumorCheckBonus: 4,
      believeRollSave: '4-in-10 (5-in-10 with strong evidence)'
    },
    eurobucks: 500,
    background: 'Relentless investigative Media broadcasting corporate cover-ups directly to the Data Pool.'
  }),
  ssp_pregen_09: Object.freeze({
    id: 'ssp_pregen_09',
    handle: 'Suri "Cavalry" Navarro',
    role: 'Lawman',
    roleAbility: 'Backup',
    roleRank: 4,
    pdfPage: 20,
    imageVerified: true,
    culturalLanguage: { name: 'Streetslang', level: 2 },
    armor: { head: { id: 'lightArmorjackHead', sp: 11 }, body: { id: 'lightArmorjackBody', sp: 11 } },
    weapons: [
      { id: 'assaultRifle', name: 'Assault Rifle', damage: '5d6', rof: 1, clipSize: 25, currentAmmo: 25, magazines: 4, totalRounds: 100, ammoId: 'ammoBasicRifle', skill: 'Shoulder Arms' },
      { id: 'heavyPistol', name: 'Heavy Pistol', damage: '3d6', rof: 2, clipSize: 8, currentAmmo: 8, magazines: 4, totalRounds: 32, ammoId: 'ammoBasicPistol', skill: 'Handgun' }
    ],
    ammoInventory: { ammoBasicRifle: 100, ammoBasicPistol: 32 },
    cyberware: [
      { id: 'hidden_holster', name: 'Hidden Holster', hl: 7 },
      { id: 'subdermal_pocket', name: 'Subdermal Pocket', hl: 3 }
    ],
    gear: [
      { id: 'agent', name: 'Agent', qty: 1 },
      { id: 'flashlight', name: 'Flashlight', qty: 1 },
      { id: 'handcuffs', name: 'Handcuffs', qty: 2 },
      { id: 'radioCommunicator', name: 'Radio Communicator', qty: 1 },
      { id: 'roadFlare', name: 'Road Flare', qty: 10 },
      { id: 'bulletproofShield', name: 'Bulletproof Shield (10 HP)', qty: 1, hp: 10 }
    ],
    fashion: ['Leisurewear Bottoms x2', 'Leisurewear Top x2', 'Leisurewear Footwear x2', 'Urban Flash Jacket', 'Glasses'],
    roleAbilityState: {
      role: 'Lawman',
      ability: 'Backup',
      rank: 4,
      backupTier: 'Local Beat / Sheriff Squad (4 Officers, CN 10, SP 7, HP 25)'
    },
    eurobucks: 500,
    background: 'Veteran precinct patrol officer known as "Cavalry" for arriving in the nick of time.'
  }),
  ssp_pregen_10: Object.freeze({
    id: 'ssp_pregen_10',
    handle: 'Chanda Mishra',
    role: 'Exec',
    roleAbility: 'Teamwork',
    roleRank: 4,
    pdfPage: 22,
    imageVerified: true,
    culturalLanguage: { name: 'Streetslang', level: 2 },
    armor: { head: { id: 'lightArmorjackHead', sp: 11 }, body: { id: 'lightArmorjackBody', sp: 11 } },
    weapons: [
      { id: 'veryHeavyPistol', name: 'Very Heavy Pistol', damage: '4d6', rof: 1, clipSize: 8, currentAmmo: 8, magazines: 7, totalRounds: 56, ammoId: 'ammoBasicPistol', skill: 'Handgun' }
    ],
    ammoInventory: { ammoBasicPistol: 56 },
    cyberware: [
      { id: 'toxin_binders', name: 'Toxin Binders', hl: 2 },
      { id: 'cyberaudio_suite', name: 'Cyberaudio Suite', hl: 7 },
      { id: 'internal_agent', name: 'Internal Agent', hl: 3 },
      { id: 'biomonitor', name: 'Biomonitor', hl: 0 }
    ],
    gear: [
      { id: 'radioCommunicator', name: 'Radio Communicator', qty: 4 },
      { id: 'scrambler', name: 'Scrambler / Descrambler', qty: 1 },
      { id: 'agent', name: 'Internal Agent (Cyberware)', qty: 1 }
    ],
    fashion: ['Businesswear Bottoms', 'Businesswear Top', 'Businesswear Footwear', 'Businesswear Jacket', 'Jewelry', 'Mirrorshades'],
    roleAbilityState: {
      role: 'Exec',
      ability: 'Teamwork',
      rank: 4,
      housing: 'Corporate Conapt',
      teamMembers: [
        { role: 'Driver', loyalty: 7, hp: 30, sp: 11, weapon: 'Very Heavy Pistol (4d6)', pdfPage: 23 },
        { role: 'Netrunner', loyalty: 7, hp: 30, sp: 11, interfaceRank: 2, weapon: 'Very Heavy Pistol (4d6)', pdfPage: 23 }
      ]
    },
    eurobucks: 500,
    background: 'Ambitious corporate junior executive leveraging field ops and her personal security team for promotion.'
  })
});

export const SINGLE_SHOT_NET_ARCHITECTURES = Object.freeze(
  Object.fromEntries(
    CANONICAL_NET_ARCHITECTURES.map((arch, idx) => [
      `ssp_net_arch_0${idx + 1}`,
      Object.freeze({
        ...arch,
        archId: `ssp_net_arch_0${idx + 1}`,
        difficulty: idx < 2 ? 'Basic' : idx < 4 ? 'Standard' : idx === 4 ? 'Uncommon' : 'Advanced',
        floors: arch.verifiedFacts.map((fact, fIdx) => ({ floor: fIdx + 1, detail: fact }))
      })
    ])
  )
);

export function promoteSingleShotPlayableCharacter(id, options = {}) {
  const identity = getSingleShotPregenIdentity(id);
  const skillProfile = getSingleShotSkillProfile(id);
  const loadout = getSingleShotLoadout(id);
  const verified = SINGLE_SHOT_PDF_VERIFIED_SPECS[id];
  if (!identity || !skillProfile || !loadout || !verified) {
    throw new Error(`Unknown Single Shot pregen id: ${id}`);
  }

  const stats = {};
  STAT_KEYS.forEach((key, idx) => {
    stats[key] = Number(skillProfile.stats[idx]);
  });
  // In single_shot_pregen_skill_profiles.js, stats[9] is effective EMP, and empathyMaximum is starting EMP
  const startingEmp = Number(skillProfile.empathyMaximum);
  const effectiveEmp = Number(stats.EMP);
  const maxHumanity = Number(skillProfile.humanityMaximum);
  const currentHumanity = Number(skillProfile.derived[3]);
  const humanityLoss = maxHumanity - currentHumanity;
  const hp = Number(skillProfile.derived[0]);
  const seriouslyWoundedThreshold = Number(skillProfile.derived[1]);
  const deathSave = Number(skillProfile.derived[2]);

  const skills = {};
  for (const row of skillProfile.skills) {
    const [skillName, , skillLvl] = row;
    skills[skillName] = Number(skillLvl);
  }

  const equipment = [
    verified.armor.head.id,
    verified.armor.body.id,
    ...verified.weapons.map((w) => w.id),
    ...verified.gear.map((g) => g.id)
  ];

  const characterId = options.characterId || `char_${id}`;
  return {
    id: characterId,
    characterId,
    pregenId: id,
    sourceModule: 'cpred_single_shot_pack_v1_1',
    sourceRef: skillProfile.sourceRef,
    pdfPage: verified.pdfPage,
    imageVerified: true,
    playable: true,
    method: 'streetrat',
    name: verified.handle,
    handle: verified.handle,
    role: verified.role,
    roleAbility: verified.roleAbility,
    roleRank: verified.roleRank,
    roleAbilityState: JSON.parse(JSON.stringify(verified.roleAbilityState)),
    stats: { ...stats, EMP: startingEmp },
    effectiveEmp,
    skills,
    skillBreakdown: JSON.parse(JSON.stringify(skillProfile.skills)),
    culturalLanguage: { ...verified.culturalLanguage },
    extraLanguages: verified.extraLanguages ? JSON.parse(JSON.stringify(verified.extraLanguages)) : [],
    hp: { current: hp, max: hp, seriouslyWounded: seriouslyWoundedThreshold },
    currentHp: hp,
    maxHp: hp,
    seriouslyWoundedThreshold,
    deathSave,
    humanity: {
      current: currentHumanity,
      max: maxHumanity,
      loss: humanityLoss,
      effectiveEmp
    },
    currentHumanity,
    maxHumanity,
    armor: JSON.parse(JSON.stringify(verified.armor)),
    armorHeadSp: verified.armor.head.sp,
    armorBodySp: verified.armor.body.sp,
    weapons: JSON.parse(JSON.stringify(verified.weapons)),
    ammoInventory: { ...verified.ammoInventory },
    cyberware: verified.cyberware.map((c, idx) => ({
      ...c,
      instanceId: `${c.id}_${idx + 1}`,
      installed: true,
      humanityLoss: c.hl,
      humanityLossApplied: c.hl,
      maxHumanityPenaltyEligible: false
    })),
    installedCyberware: verified.cyberware.map((c) => c.id),
    gear: JSON.parse(JSON.stringify(verified.gear)),
    fashion: [...verified.fashion],
    equipment,
    inventory: [
      { itemId: verified.armor.body.id, id: verified.armor.body.id, name: 'Light Armorjack (Body)', category: 'armor', type: 'armor', sp: verified.armor.body.sp, location: 'body', quantity: 1, qty: 1, equipped: true },
      { itemId: verified.armor.head.id, id: verified.armor.head.id, name: 'Light Armorjack (Head)', category: 'armor', type: 'armor', sp: verified.armor.head.sp, location: 'head', quantity: 1, qty: 1, equipped: true },
      ...verified.weapons.map((w, idx) => ({
        itemId: w.id,
        id: w.id,
        name: w.name,
        category: 'weapon',
        type: 'weapon',
        quantity: w.count || 1,
        qty: w.count || 1,
        equipped: idx === 0,
        magazines: w.magazines || 0,
        totalRounds: w.totalRounds || w.count || 0
      })),
      ...Object.entries(verified.ammoInventory).map(([ammoId, qty]) => ({
        itemId: ammoId,
        id: ammoId,
        name: ammoId,
        category: 'ammo',
        type: 'ammo',
        quantity: Number(qty),
        qty: Number(qty),
        equipped: false
      })),
      ...verified.gear.map((g) => ({
        itemId: g.id,
        id: g.id,
        name: g.name,
        category: 'gear',
        type: 'gear',
        quantity: g.qty || 1,
        qty: g.qty || 1,
        equipped: false
      }))
    ],
    economy: {
      equipmentBudget: 0,
      fashionBudget: 0,
      eurobucks: verified.eurobucks
    },
    derived: {
      maxHp: hp,
      hp,
      seriouslyWounded: seriouslyWoundedThreshold,
      deathSave,
      baseEmp: startingEmp,
      humanity: currentHumanity,
      maxHumanity,
      currentEmp: effectiveEmp,
      cyberpsychosis: 'none',
      gmControl: false
    },
    loadout: {
      primaryWeaponId: verified.weapons[0]?.id || null,
      primaryWeapon: verified.weapons[0]?.id || null,
      weaponId: verified.weapons[0]?.id || null,
      ammoByType: {}
    },
    combatState: {
      player: {
        hp,
        maxHp: hp,
        sp: verified.armor.body.sp,
        headSp: verified.armor.head.sp,
        armorPenalty: 0,
        criticalInjuries: [],
        deathSavePenalty: 0,
        dead: false
      },
      armor: {
        bodySp: verified.armor.body.sp,
        headSp: verified.armor.head.sp,
        statPenalty: 0
      },
      ammo: Object.fromEntries(
        verified.weapons.filter((w) => w.clipSize).map((w) => [w.id, w.currentAmmo])
      )
    },
    eurobucks: verified.eurobucks,
    cash: verified.eurobucks,
    lifepath: {
      role: verified.role,
      background: verified.background,
      culturalOrigin: 'North American (Streetslang)',
      culturalRegion: 'North America',
      culturalLanguage: verified.culturalLanguage.name,
      clothingStyle: verified.fashion[0] || 'Generic Chic',
      personality: verified.background,
      hairstyle: 'Streets of Night City',
      affectation: verified.roleAbility,
      value: 'Survival & Rep',
      peopleView: 'Professional',
      valuedPerson: 'Crew',
      valuedPossession: verified.weapons[0]?.name || 'Gear',
      familyBackground: verified.background,
      environment: 'Night City',
      familyCrisis: 'Time of the Red',
      friends: [],
      enemies: [],
      tragicLoveAffairs: [],
      lifeGoal: 'Make a name in Night City'
    },
    worldPosition: options.worldPosition || {
      atlasId: 'night-city-2045',
      mapCode: 'NC-WATSON-KABUKI',
      poiCode: 'NC-WATSON-KABUKI-MARKET',
      district: 'Watson',
      mode: 'street',
      travelMode: 'walk',
      x: 100,
      y: 100
    },
    stateVersion: Number(options.stateVersion || 1)
  };
}

export function applySingleShotPregenToWebCharacter(baseCharacter, pregenId) {
  const promoted = promoteSingleShotPlayableCharacter(pregenId, {
    characterId: `char_${pregenId}`,
    worldPosition: baseCharacter?.worldPosition || undefined
  });
  const roleLower = promoted.role.toLowerCase();
  const out = structuredClone(baseCharacter || {});
  out.characterId = promoted.characterId;
  out.pregenId = promoted.pregenId;
  out.sourceModule = promoted.sourceModule;
  out.sourceRef = promoted.sourceRef;
  out.pdfPage = promoted.pdfPage;
  out.imageVerified = true;
  out.playable = true;
  out.name = promoted.handle;
  out.handle = promoted.handle;
  out.method = 'streetrat';
  out.role = roleLower;
  out.roleAbilityRank = 4;
  out.roleHistory = [{ role: roleLower, rank: 4, active: true }];
  out.stats = { ...promoted.stats };
  out.derived = { ...promoted.derived };
  out.cyberware = structuredClone(promoted.cyberware);
  out.inventory = structuredClone(promoted.inventory);
  out.economy = { ...promoted.economy };
  out.eurobucks = promoted.eurobucks;
  out.loadout = structuredClone(promoted.loadout);
  out.combatState = { ...(out.combatState || {}), ...structuredClone(promoted.combatState) };
  out.lifepath = { ...(out.lifepath || {}), ...structuredClone(promoted.lifepath) };
  out.singleShotPregen = promoted;
  out.worldPosition = promoted.worldPosition;
  return out;
}

export function promoteAllSingleShotPlayableCharacters() {
  return SINGLE_SHOT_PREGEN_SKILL_PROFILES.map((p) => promoteSingleShotPlayableCharacter(p.id));
}

export function getSingleShotNetArchitecture(archId) {
  const arch = SINGLE_SHOT_NET_ARCHITECTURES[archId];
  if (!arch) {
    throw new Error(`Unknown Single Shot NET Architecture: ${archId}`);
  }
  return JSON.parse(JSON.stringify(arch));
}
