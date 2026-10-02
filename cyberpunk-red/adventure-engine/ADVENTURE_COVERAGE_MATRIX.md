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
| Hope Reborn — The Devil's Cut | Campaign transition exists; detailed heist/social/stealth Beat conversion pending | Campaign transition only | **PARTIAL** |
| Hope Reborn — Hope's Calling!!! | Campaign transition exists; detailed Beat conversion pending | Campaign transition only | **PARTIAL** |
| Hope Reborn — Ripping the Ripper | Campaign finale flag exists; detailed branching finale conversion pending | Campaign completion only | **PARTIAL** |
| Tales of the RED / Street Stories | Legacy/source content exists; universal module conversion pending per mission | Not yet universal-engine tested | **PARTIAL** |
| Elflines Online | Source present; extraction pending | No universal-module test | **PARTIAL** |
| Elflines Online EP1 | Source present; extraction pending | No universal-module test | **PARTIAL** |
| Single Shot Pack | Source present; adventure enumeration/conversion pending | No universal-module test | **PARTIAL** |
| CEMK — The Jacket | Source/maps present; CEMK mechanics partly exist in VTT; adventure conversion pending | No universal-module test | **PARTIAL** |

## Runtime hardening coverage

R5.72 verifies event location restrictions, repeatable-event operation keys, UNTIL_SUCCESS retries after blocked Rules Engine resolution, engine-gated objective success/failure, idempotent consequences, immediate completion re-evaluation, GM-only unrevealed secrets, save/load separation, deterministic host RNG and AI intent authority boundaries.

## Hope Reborn invariants

Hope Reborn is six interconnected missions intended to build on one another. The Adventure Engine persists sequence independently of narration, but does not assume each mission is linear: optional Beats and player-selected branches remain explicit. Rumors/Infobox knowledge are gated information, not free narrator knowledge. The Devil's Cut must preserve its social/stealth/cunning emphasis rather than being normalized into combat.

### The Angel's Share

Hook → Marianne → Blankety Blank branches through Chrome Cross/direct investigation to Blank's HQ; Boom pivots to optional Search & Rescue hazards; Recombobulating converges on Pickup Game; A New Hope emits the Real Estate Rumble handoff. The engine does not reveal the disaster early, force Chrome Cross, auto-run every rescue hazard, or decide fight/leave for the Crew.

### Real Estate Rumble

Hook → Talent Scout → Haunted House/Death Maze → Ghosts Busted → Garage/investigation → Woodland Park → Bomb-Bastic Bouquet → Chasing Clowns → Happy/Sad Jack. The GRAF3 clue preserves the source-supported guard branch. Sp00ph remains sealed until discovered. Bouquet expiry is 0d6 confetti/glitter, and climax supports chase or combat. Resolution pays the promised 500eb per Edgerunner and emits the Welcome handoff.

### Welcome to the Neighborhood

The source explicitly makes this mission different: it is five small jobs playable **in any order** over the following month. The module therefore starts at an open Job Hub rather than a linear scene chain. The Shark preserves stairs/elevator/window/light-well/NET and player-invented approaches; Wheels on Fire delegates roller derby to Rules Engine with the source's opposed-Athletics simplification as fallback; Love Lies Dying keeps its deadline hidden from players; Turf War preserves the catastrophic choice to join Tarquin, which ends Hope Reborn instead of being silently repaired. Only completion of all five jobs unlocks The Report. The Report pays 2,000eb per Edgerunner and emits `hr_mission_welcome_neighborhood_complete`, handing continuity to The Devil's Cut.

## Source inventory verified in Drive

Canonical Drive sources include Hope Reborn v1.1 + Hope Reborn+ DLC, Tales of the RED / Street Stories, Red Chrome Cargo, Elflines Online + EP1, Single Shot Pack, Edgerunners Mission Kit/The Jacket, Core v1.25, Interface RED, Black Chrome, Danger Gal Dossier and support material.

## Conversion gate

A row cannot become IMPLEMENTED merely because a PDF is indexed or legacy JSON exists. Required evidence remains:
`AdventureModule → validated references → AdventureState → playable triggers/conditions/consequences → save/load → AI context → mechanical dependency resolution → runtime tests`.
