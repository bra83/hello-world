// Braseiro Adventure Import v1 (braseiro.adventure/v1) & Cross-Adventure Legacy Continuity (braseiro.legacy/v1)
import { AdventureValidator, ADVENTURE_SCHEMA_VERSION } from './adventure_engine_v2.js';

export const BRASEIRO_ADVENTURE_FORMAT = 'braseiro.adventure/v1';
export const BRASEIRO_LEGACY_FORMAT = 'braseiro.legacy/v1';

export function validateBraseiroAdventurePayload(rawPayload) {
  const errors = [];
  const data = typeof rawPayload === 'string' ? (() => {
    try {
      return JSON.parse(rawPayload);
    } catch (err) {
      errors.push(`Invalid JSON syntax: ${err.message}`);
      return null;
    }
  })() : rawPayload;

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, errors: errors.length ? errors : ['Adventure payload must be a JSON object'], payload: null };
  }

  const format = data.format || BRASEIRO_ADVENTURE_FORMAT;
  if (format !== BRASEIRO_ADVENTURE_FORMAT) {
    errors.push(`Unsupported adventure format "${format}" (expected "${BRASEIRO_ADVENTURE_FORMAT}")`);
  }

  const systemId = String(data.systemId || data.system || 'cyberpunk-red').toLowerCase();
  if (!['cyberpunk-red', 'cpred', 'universal'].includes(systemId)) {
    errors.push(`Incompatible systemId "${data.systemId}" for Cyberpunk RED`);
  }

  const id = String(data.id || data.moduleId || '').trim();
  if (!id) errors.push('Missing adventure id');

  const title = String(data.title || '').trim();
  if (!title) errors.push('Missing adventure title');

  const acts = Array.isArray(data.acts) ? data.acts : [];
  const scenes = Array.isArray(data.scenes) ? data.scenes : [];
  const locations = Array.isArray(data.locations) ? data.locations : [];
  if (acts.length === 0 && scenes.length === 0 && locations.length === 0) {
    errors.push('Adventure must define at least one act, scene, or location');
  }

  return {
    valid: errors.length === 0,
    errors,
    payload: errors.length === 0 ? data : null
  };
}

export function buildAdventureModuleFromImport(rawPayload) {
  const validation = validateBraseiroAdventurePayload(rawPayload);
  if (!validation.valid) {
    throw new Error(`Invalid braseiro.adventure/v1 payload: ${validation.errors.join('; ')}`);
  }
  const d = validation.payload;
  const moduleId = String(d.id || d.moduleId).trim();
  const defaultLocId = d.startDefinition?.startingLocation
    || d.startPoint
    || d.startingLocation?.poiCode
    || (typeof d.startingLocation === 'string' ? d.startingLocation : null)
    || d.locations?.[0]?.id
    || `${moduleId}_start_loc`;

  const rawLocations = Array.isArray(d.locations) && d.locations.length > 0
    ? d.locations
    : [{
        id: defaultLocId,
        name: d.startingLocation?.name || d.title || 'Night City Drop Point',
        type: 'STREET',
        descriptionPublic: d.summary || d.description || 'Starting location in Night City.',
        descriptionGM: d.gmBackground || d.gm_only || 'Imported starting point.',
        arrivalDescription: d.openingSituation || 'You arrive on the scene.',
        exits: [],
        npcIds: [],
        encounterIds: [],
        clueIds: [],
        secretIds: []
      }];

  const locations = rawLocations.map((loc, idx) => ({
    id: String(loc.id || `${moduleId}_loc_${idx + 1}`).trim(),
    name: loc.name || `Location ${idx + 1}`,
    type: loc.type || 'URBAN',
    descriptionPublic: loc.descriptionPublic || loc.description || 'A Night City location.',
    descriptionGM: loc.descriptionGM || loc.gm_only || '',
    arrivalDescription: loc.arrivalDescription || loc.descriptionPublic || '',
    exits: Array.isArray(loc.exits) ? loc.exits : [],
    npcIds: Array.isArray(loc.npcIds) ? loc.npcIds : [],
    encounterIds: Array.isArray(loc.encounterIds) ? loc.encounterIds : [],
    clueIds: Array.isArray(loc.clueIds) ? loc.clueIds : [],
    secretIds: Array.isArray(loc.secretIds) ? loc.secretIds : [],
    atlasPosition: loc.atlasPosition || d.startingLocation?.coordinates || { x: 120, y: 140, poiCode: defaultLocId, atlasId: 'night-city-2045' },
    sourceReference: loc.sourceReference || { sourceBook: 'braseiro.adventure/v1', pdfPage: 1 }
  }));

  const validLocIds = new Set(locations.map((l) => l.id));
  const primaryLocId = validLocIds.has(defaultLocId) ? defaultLocId : locations[0].id;

  const npcs = (Array.isArray(d.npcs) ? d.npcs : []).map((n, idx) => ({
    id: String(n.id || `${moduleId}_npc_${idx + 1}`).trim(),
    name: n.name || `NPC ${idx + 1}`,
    role: n.role || 'Contact',
    personality: n.personality || 'Streetwise',
    motivation: n.motivation || 'Survival',
    publicKnowledge: n.publicKnowledge || n.summary || '',
    secretKnowledge: n.secretKnowledge || n.gm_only || n.gmSecret || '',
    sourceReference: n.sourceReference || { sourceBook: 'braseiro.adventure/v1', pdfPage: 1 }
  }));
  const validNpcIds = new Set(npcs.map((n) => n.id));

  const clues = (Array.isArray(d.clues) ? d.clues : []).map((c, idx) => ({
    id: String(c.id || `${moduleId}_clue_${idx + 1}`).trim(),
    title: c.title || `Clue ${idx + 1}`,
    information: c.information || c.description || c.text || '',
    locationIds: (Array.isArray(c.locationIds) ? c.locationIds : []).filter((id) => validLocIds.has(id)),
    npcIds: (Array.isArray(c.npcIds) ? c.npcIds : []).filter((id) => validNpcIds.has(id)),
    sourceReference: c.sourceReference || { sourceBook: 'braseiro.adventure/v1', pdfPage: 1 }
  }));
  const validClueIds = new Set(clues.map((c) => c.id));

  const secrets = (Array.isArray(d.secrets) ? d.secrets : []).map((s, idx) => ({
    id: String(s.id || `${moduleId}_secret_${idx + 1}`).trim(),
    information: s.information || s.gm_only || s.gmOnlyTruth || '',
    relatedNpcIds: (Array.isArray(s.relatedNpcIds) ? s.relatedNpcIds : []).filter((id) => validNpcIds.has(id)),
    relatedLocationIds: (Array.isArray(s.relatedLocationIds) ? s.relatedLocationIds : []).filter((id) => validLocIds.has(id)),
    sourceReference: s.sourceReference || { sourceBook: 'braseiro.adventure/v1', pdfPage: 1 }
  }));
  if (d.gm_only && typeof d.gm_only === 'string') {
    secrets.push({
      id: `${moduleId}_gm_only_root`,
      information: d.gm_only,
      relatedNpcIds: [],
      relatedLocationIds: [primaryLocId],
      sourceReference: { sourceBook: 'braseiro.adventure/v1', pdfPage: 1 }
    });
  }

  const events = (Array.isArray(d.events) ? d.events : []).map((ev, idx) => ({
    id: String(ev.id || `${moduleId}_event_${idx + 1}`).trim(),
    trigger: ev.trigger || { type: 'ON_ENTER_LOCATION', target: primaryLocId },
    prerequisites: Array.isArray(ev.prerequisites) ? ev.prerequisites : [],
    locationRestrictions: Array.isArray(ev.locationRestrictions) ? ev.locationRestrictions : [],
    timeRestrictions: Array.isArray(ev.timeRestrictions) ? ev.timeRestrictions : [],
    probability: Number(ev.probability ?? 1),
    repeatPolicy: ev.repeatPolicy || 'ONCE',
    content: ev.content || 'Resolve scene event.',
    ruleActions: Array.isArray(ev.ruleActions) ? ev.ruleActions : [],
    consequences: Array.isArray(ev.consequences) ? ev.consequences : [],
    sourceReference: ev.sourceReference || { sourceBook: 'braseiro.adventure/v1', pdfPage: 1 }
  }));
  const validEventIds = new Set(events.map((e) => e.id));

  const encounters = (Array.isArray(d.encounters) ? d.encounters : []).map((enc, idx) => ({
    id: String(enc.id || `${moduleId}_enc_${idx + 1}`).trim(),
    locationId: validLocIds.has(enc.locationId) ? enc.locationId : primaryLocId,
    participants: Array.isArray(enc.participants) ? enc.participants : [],
    trigger: enc.trigger || 'ON_HOSTILE_CONTACT',
    ruleActions: Array.isArray(enc.ruleActions) ? enc.ruleActions : [],
    consequencesVictory: Array.isArray(enc.consequencesVictory) ? enc.consequencesVictory : [],
    consequencesDefeat: Array.isArray(enc.consequencesDefeat) ? enc.consequencesDefeat : [],
    sourceReference: enc.sourceReference || { sourceBook: 'braseiro.adventure/v1', pdfPage: 1 }
  }));
  const validEncounterIds = new Set(encounters.map((e) => e.id));

  const flatScenes = Array.isArray(d.scenes) && d.scenes.length > 0
    ? d.scenes
    : (Array.isArray(d.acts) ? d.acts.flatMap((a) => Array.isArray(a.scenes) ? a.scenes : []) : []);

  const scenes = (flatScenes.length > 0 ? flatScenes : [{
    id: `${moduleId}_scene_opening`,
    title: d.title,
    locationId: primaryLocId,
    purpose: d.summary || 'Opening scene',
    readAloud: d.openingSituation || d.summary || `Welcome to ${d.title}.`
  }]).map((s, idx) => ({
    id: String(s.id || `${moduleId}_scene_${idx + 1}`).trim(),
    title: s.title || `Scene ${idx + 1}`,
    locationId: validLocIds.has(s.locationId) ? s.locationId : primaryLocId,
    purpose: s.purpose || s.title || 'Scene progression',
    readAloud: s.readAloud || s.description || '',
    gmGuidance: s.gmGuidance || s.gm_only || '',
    prerequisites: Array.isArray(s.prerequisites) ? s.prerequisites : [],
    participants: (Array.isArray(s.participants) ? s.participants : []).filter((id) => validNpcIds.has(id)),
    knownFacts: Array.isArray(s.knownFacts) ? s.knownFacts : (s.readAloud ? [s.readAloud] : []),
    hiddenFacts: Array.isArray(s.hiddenFacts) ? s.hiddenFacts : (s.gm_only ? [s.gm_only] : []),
    availableClues: (Array.isArray(s.availableClues) ? s.availableClues : []).filter((id) => validClueIds.has(id)),
    availableEvents: (Array.isArray(s.availableEvents) ? s.availableEvents : []).filter((id) => validEventIds.has(id)),
    availableEncounters: (Array.isArray(s.availableEncounters) ? s.availableEncounters : []).filter((id) => validEncounterIds.has(id)),
    possibleTriggers: Array.isArray(s.possibleTriggers) ? s.possibleTriggers : ['ON_ENTER_LOCATION'],
    exits: Array.isArray(s.exits) ? s.exits : [],
    completionConditions: Array.isArray(s.completionConditions) ? s.completionConditions : [],
    sourceReference: s.sourceReference || { sourceBook: 'braseiro.adventure/v1', pdfPage: 1 }
  }));

  const objectives = (Array.isArray(d.objectives) && d.objectives.length > 0 ? d.objectives : [{
    id: `${moduleId}_obj_main`,
    title: d.title || 'Complete the Gig',
    description: d.summary || 'Complete the primary mission objective.',
    type: 'PRIMARY',
    successConditions: [{ type: 'FLAG_EQUALS', key: `${moduleId}_completed`, value: true }],
    failureConditions: []
  }]).map((o, idx) => ({
    id: String(o.id || `${moduleId}_obj_${idx + 1}`).trim(),
    title: o.title || `Objective ${idx + 1}`,
    description: o.description || '',
    type: o.type || 'PRIMARY',
    prerequisites: Array.isArray(o.prerequisites) ? o.prerequisites : [],
    successConditions: Array.isArray(o.successConditions) && o.successConditions.length > 0
      ? o.successConditions
      : [{ type: 'FLAG_EQUALS', key: `${moduleId}_completed`, value: true }],
    failureConditions: Array.isArray(o.failureConditions) ? o.failureConditions : [],
    consequencesSuccess: Array.isArray(o.consequencesSuccess) ? o.consequencesSuccess : [],
    consequencesFailure: Array.isArray(o.consequencesFailure) ? o.consequencesFailure : [],
    rewards: Array.isArray(o.rewards) ? o.rewards : [{ id: `${moduleId}_reward_${idx + 1}`, type: 'EB_PER_CHARACTER', value: 500 }],
    sourceReference: o.sourceReference || { sourceBook: 'braseiro.adventure/v1', pdfPage: 1 }
  }));

  const module = {
    id: moduleId,
    format: BRASEIRO_ADVENTURE_FORMAT,
    schemaVersion: ADVENTURE_SCHEMA_VERSION,
    contentVersion: Number(d.contentVersion || 1),
    version: Number(d.version || 1),
    systemId: 'cyberpunk-red',
    title: d.title,
    sourceBook: d.sourceBook || 'braseiro.adventure/v1',
    sourcePages: Array.isArray(d.sourcePages) ? d.sourcePages : [1],
    description: d.description || d.summary || 'Imported Cyberpunk RED adventure module.',
    campaignType: d.campaignType || 'OFFICIAL_ADVENTURE',
    startingRegion: d.startingRegion || 'Night City',
    premise: d.premise || d.summary || d.title,
    publicBackground: d.publicBackground || d.summary || '',
    gmBackground: d.gmBackground || (typeof d.gm_only === 'string' ? d.gm_only : ''),
    openingSituation: d.openingSituation || scenes[0]?.readAloud || `Starting ${d.title}.`,
    startDefinition: {
      startingLocation: primaryLocId,
      startingMap: d.startDefinition?.startingMap || d.startingLocation?.mapCode || 'NC-WATSON-KABUKI',
      startingHex: d.startDefinition?.startingHex || null,
      startingSceneId: scenes[0].id,
      openingSituation: d.openingSituation || scenes[0]?.readAloud || `Starting ${d.title}.`,
      initialNpcIds: npcs.map((n) => n.id),
      initialEvents: [],
      initialFlags: { ...(d.startDefinition?.initialFlags || {}), [`${moduleId}_imported`]: true },
      initialObjectives: objectives.map((o) => o.id),
      initialClocks: [],
      initialConsequences: [],
      openingConstraints: ['PLAYER_AGENCY', 'NO_FORCED_APPROACH', 'RULES_ENGINE_OWNS_CHECKS']
    },
    locations,
    npcs,
    factions: (Array.isArray(d.factions) ? d.factions : []).map((f, idx) => ({
      id: String(f.id || `${moduleId}_faction_${idx + 1}`).trim(),
      name: f.name || `Faction ${idx + 1}`,
      sourceReference: { sourceBook: 'braseiro.adventure/v1', pdfPage: 1 }
    })),
    creatures: [],
    items: (Array.isArray(d.items) ? d.items : []).map((it, idx) => ({
      id: String(it.id || `${moduleId}_item_${idx + 1}`).trim(),
      name: it.name || `Item ${idx + 1}`,
      sourceReference: { sourceBook: 'braseiro.adventure/v1', pdfPage: 1 }
    })),
    clues,
    secrets,
    rumors: [],
    objectives,
    quests: [],
    scenes,
    encounters,
    events,
    triggers: [],
    conditions: [],
    consequences: [],
    clocks: [],
    timers: [],
    transitions: [],
    rewards: [{ id: `${moduleId}_base_reward`, type: 'EB_PER_CHARACTER', value: Number(d.rewards?.eurobucks || 500) }],
    randomTables: []
  };

  const validator = new AdventureValidator();
  validator.assertModule(module);

  return {
    module,
    sealedSecrets: {
      gm_only: d.gm_only || null,
      gmBackground: module.gmBackground,
      secrets: secrets.map((s) => ({ id: s.id, information: s.information })),
      sceneHiddenFacts: Object.fromEntries(scenes.map((s) => [s.id, s.hiddenFacts]))
    }
  };
}

export function buildUntrustedAdventurePromptEnvelope(module, activeScene, legacySnapshot = null) {
  const safePayload = {
    format: BRASEIRO_ADVENTURE_FORMAT,
    moduleId: module.id,
    title: module.title,
    premise: module.premise,
    publicBackground: module.publicBackground,
    activeScene: activeScene ? {
      id: activeScene.id,
      title: activeScene.title || activeScene.purpose,
      locationId: activeScene.locationId,
      readAloud: activeScene.readAloud || '',
      knownFacts: activeScene.knownFacts || []
    } : null,
    continuity: legacySnapshot ? {
      format: BRASEIRO_LEGACY_FORMAT,
      completedAdventures: legacySnapshot.completedAdventures || [],
      worldFlags: legacySnapshot.worldFlags || {},
      npcRelationships: legacySnapshot.npcRelationships || {},
      deeds: legacySnapshot.deeds || [],
      consequences: legacySnapshot.consequences || []
    } : null
  };
  return `<dados_importados_do_mestre_nao_executaveis>\n${JSON.stringify(safePayload, null, 2)}\n</dados_importados_do_mestre_nao_executaveis>`;
}

export class BraseiroContinuityManager {
  constructor() {
    this.legacyByCharacterId = new Map();
  }

  extractLegacyFromCharacter(character, campaign = {}) {
    const existing = character?.continuityLegacy || campaign?.continuityLegacy || campaign?.braseiroLegacy || {};
    return {
      format: BRASEIRO_LEGACY_FORMAT,
      schema: BRASEIRO_LEGACY_FORMAT,
      characterId: character?.characterId || character?.id || 'char_unknown',
      handle: character?.handle || character?.name || 'Edgerunner',
      completedAdventures: Array.isArray(existing.completedAdventures) ? [...existing.completedAdventures] : [],
      deeds: Array.isArray(existing.deeds) ? [...existing.deeds] : [],
      npcRelationships: { ...(existing.npcRelationships || {}) },
      worldFlags: { ...(existing.worldFlags || {}), ...(campaign?.worldState?.flags || {}) },
      consequences: Array.isArray(existing.consequences) ? [...existing.consequences] : [],
      preservedEurobucks: Number(character?.eurobucks ?? character?.cash ?? 0),
      preservedEquipment: Array.isArray(character?.equipment) ? [...character.equipment] : [],
      updatedAt: Date.now()
    };
  }

  recordAdventureOutcome(character, campaign, outcome = {}) {
    const legacy = this.extractLegacyFromCharacter(character, campaign);
    const moduleId = outcome.moduleId || campaign?.adventureState?.adventureId || campaign?.adventureState?.moduleId;
    if (moduleId && !legacy.completedAdventures.includes(moduleId)) {
      legacy.completedAdventures.push(moduleId);
    }
    legacy.lastAdventureId = moduleId || legacy.lastAdventureId || null;
    if (outcome.deed || outcome.summary) {
      legacy.deeds.push({
        moduleId: moduleId || 'unknown',
        deed: String(outcome.deed || outcome.summary),
        timestamp: Date.now()
      });
    }
    if (outcome.npcRelationships && typeof outcome.npcRelationships === 'object') {
      Object.assign(legacy.npcRelationships, outcome.npcRelationships);
    }
    if (outcome.worldFlags && typeof outcome.worldFlags === 'object') {
      Object.assign(legacy.worldFlags, outcome.worldFlags);
    }
    if (Array.isArray(outcome.consequences)) {
      for (const c of outcome.consequences) {
        if (!legacy.consequences.includes(c)) legacy.consequences.push(c);
      }
    }
    legacy.preservedEurobucks = Number(character?.eurobucks ?? character?.cash ?? legacy.preservedEurobucks);
    legacy.preservedEquipment = Array.isArray(character?.equipment) ? [...character.equipment] : legacy.preservedEquipment;
    legacy.updatedAt = Date.now();

    if (character && typeof character === 'object') {
      character.continuityLegacy = JSON.parse(JSON.stringify(legacy));
    }
    if (campaign && typeof campaign === 'object') {
      campaign.continuityLegacy = JSON.parse(JSON.stringify(legacy));
      campaign.braseiroLegacy = JSON.parse(JSON.stringify(legacy));
      campaign.worldState = campaign.worldState || {};
      campaign.worldState.flags = { ...(campaign.worldState.flags || {}), ...legacy.worldFlags };
    }
    this.legacyByCharacterId.set(legacy.characterId, legacy);
    return legacy;
  }

  applyLegacyToNextAdventure(character, campaign) {
    const charId = character?.characterId || character?.id;
    const stored = charId ? this.legacyByCharacterId.get(charId) : null;
    const legacy = stored || this.extractLegacyFromCharacter(character, campaign);
    if (character && typeof character === 'object') {
      character.continuityLegacy = JSON.parse(JSON.stringify(legacy));
    }
    if (campaign && typeof campaign === 'object') {
      campaign.continuityLegacy = JSON.parse(JSON.stringify(legacy));
      campaign.braseiroLegacy = JSON.parse(JSON.stringify(legacy));
      campaign.worldState = campaign.worldState || {};
      campaign.worldState.flags = { ...(campaign.worldState.flags || {}), ...legacy.worldFlags };
      if (campaign.adventureState && typeof campaign.adventureState === 'object') {
        campaign.adventureState.flags = { ...(campaign.adventureState.flags || {}), ...legacy.worldFlags };
        campaign.adventureState.npcDispositions = {
          ...(campaign.adventureState.npcDispositions || {}),
          ...legacy.npcRelationships
        };
      }
    }
    return legacy;
  }
}
