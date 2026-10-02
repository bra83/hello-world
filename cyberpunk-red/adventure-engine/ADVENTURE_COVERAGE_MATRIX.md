# ADVENTURE_COVERAGE_MATRIX — Cyberpunk RED

Status: **IMPLEMENTED** = validated AdventureModule + persistent runtime path + tests; **PARTIAL** = conversion incomplete; **BLOCKED** = missing required dependency.

| Adventure / source | State graph / mechanics | Runtime evidence | Status |
|---|---|---|---|
| Night City Sandbox | Dynamic World Engine start; persistent emergent state | Engine unit tests | **IMPLEMENTED** |
| Red Chrome Cargo | Hornet/Hammerhead locations, cargo clue/secret, boarding/NET/combat/extraction, Rules Engine DVs | Validation + deterministic start + sealed secret + event tests | **IMPLEMENTED** |
| Hope Reborn — campaign spine | Six-mission ordered continuity with persistent handoff flags; mission internals remain separate modules | Campaign start/order/completion tests | **PARTIAL** |
| Hope Reborn — The Angel's Share | Branching Blank investigation, disaster/rescue branches, Pickup Game choice, A New Hope handoff | Validation + sealed knowledge + optional rescue + agency tests | **IMPLEMENTED** |
| Hope Reborn — Real Estate Rumble | Haunted House/Death Maze, GRAF3 guard branch, Bozo escalation, bouquet invariant, chase/combat, Happy/Sad Jack | Validation + agency + 0d6 bouquet + resolution/handoff tests | **IMPLEMENTED** |
| Hope Reborn — Welcome to the Neighborhood | Open five-job hub across one month; The Shark multi-route hostage rescue; Boys' Night Out timed rescue; Wheels on Fire roller derby; Turf War defense/betrayal; Love Lies Dying timed investigation/rescue; The Report gated by all five jobs | Validation + open-order + Rules authority + hidden timer + betrayal failure + report/payment/handoff tests | **IMPLEMENTED** |
| Hope Reborn — The Devil's Cut | Player-owned Case/Heist/Escape; social/stealth/cunning/NET; Mira intel sealed; dual resolution and dynamic bottle bonus | Validation + agency + sealed intel + resolution/handoff tests | **IMPLEMENTED** |
| Hope Reborn — Hope's Calling!!! | Open preparation Task Hub; supply recovery; Random/The Gentleman social-or-combat branch; electrical/NET sabotage investigation; Vox/Populi identities sealed; opening-night RCL assault with opposed Bar Brawl and timed chaos; unfinished tasks remain consequential | Validation + open-order + secret gating + Rules authority + opening-resolution tests | **IMPLEMENTED** |
| Hope Reborn — Ripping the Ripper | Campaign finale flag exists; detailed branching finale conversion pending | Campaign completion only | **PARTIAL** |
| Tales of the RED / Street Stories | Legacy/source content exists; universal module conversion pending per mission | Not yet universal-engine tested | **PARTIAL** |
| Elflines Online | Source present; extraction pending | No universal-module test | **PARTIAL** |
| Elflines Online EP1 | Source present; extraction pending | No universal-module test | **PARTIAL** |
| Single Shot Pack | Source present; adventure enumeration/conversion pending | No universal-module test | **PARTIAL** |
| CEMK — The Jacket | Source/maps present; CEMK mechanics partly exist in VTT; adventure conversion pending | No universal-module test | **PARTIAL** |

## Runtime hardening coverage

R5.72 verifies event location restrictions, repeatable-event operation keys, UNTIL_SUCCESS retries after blocked Rules Engine resolution, engine-gated objective success/failure, idempotent consequences, immediate completion re-evaluation, GM-only unrevealed secrets, save/load separation, deterministic host RNG and AI intent authority boundaries.

## Hope Reborn invariants

Hope Reborn is six interconnected missions intended to build on one another. The Adventure Engine persists sequence independently of narration, but does not assume each mission is linear: optional Beats and player-selected branches remain explicit. Rumors/Infobox knowledge are gated information, not free narrator knowledge. The Devil's Cut preserves its social/stealth/cunning emphasis rather than being normalized into combat.

### Hope's Calling!!!

The rebuilt Forlorn Hope is modeled as an open preparation hub rather than a forced checklist. Supply recovery, Random's debt/The Gentleman and sabotage investigation can be approached in player-selected order. Vox/Populi's Anne/Arthur identities remain GM-only until evidence supports revelation. Mechanical checks remain Rules Engine authority. Opening Night preserves consequences of unfinished tasks and delegates the RCL assault, opposed Bar Brawl checks and timed chaos sequence to Rules Engine; the Adventure Engine only persists facts, branches and outcome.

## Source inventory verified in Drive

Canonical Drive sources include Hope Reborn v1.1 + Hope Reborn+ DLC, Tales of the RED / Street Stories, Red Chrome Cargo, Elflines Online + EP1, Single Shot Pack, Edgerunners Mission Kit/The Jacket, Core v1.25, Interface RED, Black Chrome, Danger Gal Dossier and support material.

## Conversion gate

A row cannot become IMPLEMENTED merely because a PDF is indexed or legacy JSON exists. Required evidence remains:
`AdventureModule → validated references → AdventureState → playable triggers/conditions/consequences → save/load → AI context → mechanical dependency resolution → runtime tests`.
