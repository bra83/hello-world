# Cyberpunk RED R5.72 — Adventure Engine Architecture Audit

## Baseline authority
- Canonical parent: R5.71 commit `64205f10188e4d313f86e7be818bd657fd01bfb9`.
- Work branch: `cyberpunk-red-adventure-engine-r572`.
- R5.71 is reconstructed from the verified R5.49 base + R5.65 overlay + patches R5.66–R5.71.
- Do not use the later R5.63 export commit as a newer baseline.

## Existing runtime before R5.72
The active session was controlled mainly by `CharacterWorkbenchUI` in `sheets.js`.

Before this engine:
- `campaignState.session` stored narration/history/current session status.
- `campaignState.worldClock` and `campaignState.worldSystems` stored world time and Living World state.
- New Adventure randomized a starting POI and asked Motor Bárbara/Gemini to invent a new opening.
- The provider was therefore carrying too much responsibility for adventure structure.
- Save/load already persisted the character and its `campaignState`, which is a safe persistence seam for AdventureState.
- Existing World/Living World, combat, Netrunning, inventory, NPC visuals and map systems must remain independent.

## R5.72 architecture
R5.72 adds a reusable engine rather than an adventure-specific script.

Repository source:
- `cyberpunk-red/adventure-engine/runtime/adventure_engine.js`
- `cyberpunk-red/adventure-engine/runtime/cyberpunk_adventure_controller.js`
- `cyberpunk-red/adventure-engine/schema/adventure-module.schema.json`
- `cyberpunk-red/adventure-engine/modules/index.json`
- `cyberpunk-red/adventure-engine/modules/*.json`

Runtime packaging:
- `adventure_engine.js` and controller are copied into WebView app assets.
- schemas/modules are copied into `web/app/data/adventures/`.
- `sheets.js` imports the controller.
- AdventureState is stored at `character.campaignState.adventureState`.
- Existing `saveCharacter()` therefore persists AdventureState with the campaign.
- Existing load/continue restores the same state instead of asking AI to reconstruct it.

## State authority
AdventureModule is immutable content.
AdventureState is mutable campaign state.

Implemented state includes:
- active location and scene;
- visited locations;
- encountered/dead/missing/removed NPCs;
- clues, secrets and rumors;
- objectives;
- events and encounters;
- clocks;
- flags;
- relationships;
- inventory/world/faction deltas;
- consequence history;
- idempotency keys;
- campaign history;
- schema/content versions.

## Deterministic systems implemented
- AdventureRegistry
- AdventureValidator
- AdventurePersistence
- AdventureConditionEngine
- AdventureClockManager
- AdventureConsequenceEngine
- AdventureTriggerEngine
- AdventureAiContextBuilder
- AdventureRuntime
- AdventureEngine
- state migration helper
- host RNG interface/random tables
- start-mode resolver hooks
- AI-intent validation

## AI boundary
The AI receives a structured context fragment with:
- current adventure;
- scene/location;
- active objectives/clocks;
- present NPCs;
- player-known clues/rumors;
- unrevealed GM-only secrets;
- world state;
- mechanical results;
- recent history;
- explicit authority contract.

The provider may narrate and propose consequences.
The engine validates proposed consequences before applying them.

Hard rejection currently includes:
- unknown consequence type;
- revealing a sealed secret;
- completing/failing an objective whose conditions are unmet;
- killing an NPC directly without Rules Engine authority.

## World integration
The Cyberpunk controller currently:
- derives world location from existing `worldPosition`;
- stores adventure world changes separately in campaignState;
- exposes hooks for sandbox, random-valid start and solo start;
- appends Adventure Engine context to existing Living World context;
- synchronizes AdventureState through the character save path.

## Current compatibility module
`cyberpunk_sandbox` exists as a zero-railroad persistent module.

It deliberately does not invent official canon. It allows the current freeform VTT flow to run with:
- persistent AdventureState;
- history;
- consequence validation;
- AI context;
- module/version authority.

## Known remaining integration work
1. Explicit UI for selecting OFFICIAL_ADVENTURE / SANDBOX / SOLO / other start modes.
2. Atlas canonical location resolver by structured location ID rather than text fallback.
3. Rules Engine adapter for ruleAction dispatch and verified mechanical results.
4. Event hooks from combat/travel/day-change/NPC death/rest/dialogue into AdventureTriggerEngine.
5. AdventureDebugState UI surfaces.
6. Module migration registry for future contentVersion upgrades.
7. Conversion of each official adventure source into its own AdventureModule.
8. Regression testing against the fully reconstructed R5.71 project before any APK build.

## Build policy
No APK/build is required for this block. The dedicated R5.72 CI only runs engine tests, schema/JSON validation and integration-patch dry-run.
