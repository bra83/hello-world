# ADVENTURE_COVERAGE_MATRIX — Cyberpunk RED

Status: **IMPLEMENTED** = validated AdventureModule + persistent runtime path + tests; **PARTIAL** = conversion incomplete; **BLOCKED** = missing required dependency.

| Adventure / source | State graph / mechanics | Runtime evidence | Status |
|---|---|---|---|
| Night City Sandbox | Dynamic World Engine start; persistent emergent state | Engine unit tests | **IMPLEMENTED** |
| Red Chrome Cargo | Hornet/Hammerhead locations, cargo clue/secret, boarding/NET/combat/extraction, Rules Engine DVs | Validation + deterministic start + sealed secret + event tests | **IMPLEMENTED** |
| Hope Reborn — campaign spine | Six-mission ordered continuity with persistent handoff flags and all six detailed mission modules | Campaign start/order/completion tests + per-mission suites | **IMPLEMENTED** |
| Hope Reborn — The Angel's Share | Branching Blank investigation, disaster/rescue branches, Pickup Game choice, A New Hope handoff | Validation + sealed knowledge + optional rescue + agency tests | **IMPLEMENTED** |
| Hope Reborn — Real Estate Rumble | Haunted House/Death Maze, GRAF3 guard branch, Bozo escalation, bouquet invariant, chase/combat, Happy/Sad Jack | Validation + agency + 0d6 bouquet + resolution/handoff tests | **IMPLEMENTED** |
| Hope Reborn — Welcome to the Neighborhood | Open five-job hub across one month; The Shark multi-route hostage rescue; Boys' Night Out timed rescue; Wheels on Fire roller derby; Turf War defense/betrayal; Love Lies Dying timed investigation/rescue; The Report gated by all five jobs | Validation + open-order + Rules authority + hidden timer + betrayal failure + report/payment/handoff tests | **IMPLEMENTED** |
| Hope Reborn — The Devil's Cut | Player-owned Case/Heist/Escape; social/stealth/cunning/NET; Mira intel sealed; dual resolution and dynamic bottle bonus | Validation + agency + sealed intel + resolution/handoff tests | **IMPLEMENTED** |
| Hope Reborn — Hope's Calling!!! | Open preparation Task Hub; supply recovery; Random/The Gentleman social-or-combat branch; electrical/NET sabotage investigation; Vox/Populi identities sealed; opening-night RCL assault with opposed Bar Brawl and timed chaos; unfinished tasks remain consequential | Validation + open-order + secret gating + Rules authority + opening-resolution tests | **IMPLEMENTED** |
| Hope Reborn — Ripping the Ripper | Evidence hook; Busan Back Door con; Redline/setup/flip; direct Bullets are Simpler assault; walkway/east wing/bridge/maze/man cave; path switching; early-death A Different Ending; Hope and Home; final campaign flag | Validation + branch ownership + sealed Rocklin target + Rules authority + early-death diversion + campaign completion tests | **IMPLEMENTED** |
| Tales of the RED — A Night at the Opera | University District investigation; Vampyres event; optional Empty Office Hours branch; Noodles and Info; sealed Master/Ruthven truth; abandoned-church Monster Hunt; split contract payment | Validation + deterministic start + sealed-secret + optional-branch + DV9 Rules authority + payment/completion tests | **IMPLEMENTED** |
| Tales of the RED — Agents of Desire | Rogue/Kodai hook; La Lune Bleue social infiltration; optional Jane/Lotus/Buttkicker investigation routes; Ai/Soulkiller truth sealed; Together Forever server-farm climax; three player-owned resolutions | Validation + deterministic start + GM-secret isolation + multi-route investigation + DV24/DV17 Rules authority + resolution/completion tests | **IMPLEMENTED** |
| Tales of the RED — A Bucket Full of Popcorn-Flavored Kibble | Rival Crew multi-solution gate; remote audition; organic-food sourcing; SFX Cybersnake consultation; optional Simwives script theft and Malarkey bug; Etan/Darrel plate delivery; Lovely House multi-solution climax; Spotlight consequence matrix | Validation + deterministic start + DV13/DV15/DV17 authority + optional-dirty-deed + creative-climax + 1d10 Spotlight tests | **IMPLEMENTED** |
| Tales of the RED — Drummer and the Whale | Rusty's hook; waterfront/container investigation; Drummer/Fife preparation; underwater/ROV/tunnel state; Pacifican Stand Off; SS MacDonnelson; player-owned cargo disposition; independent Takeover/Parley/Fishy Flight/Surfacing branches; sealed military/scuttle truth | Validation + deterministic start + sealed-secret + Rules authority + cargo-choice + multi-climax + boarding/takeover separation + resolution tests | **IMPLEMENTED** |
| Tales of the RED — Haven't Got a Stitch to Wear | Shears three-day recovery contract; RC Night Market/Mynah; blockade; Fixie; Roseward; persistent John Doe disposition; Rambling Rose infiltration; Lightning Logistics negotiation/combat/creative climax; player-owned suit custody and reward/reputation consequences | Deterministic start + deadline/reward + non-forced-combat + John Doe + DV13 + multi-solution climax + custody tests | **IMPLEMENTED** |
| Tales of the RED — Reaping the Reaper | Two-stage Stiles operation; scanner pickup and ReaperB drone attack; Tanzia/Sall3 hunt; Guangbo/Virtex infiltration; five-round transmitter clock with persistent +5 Biodrone failure consequence; Faisal Scramblers/EMP/detector pickup; optional Renzer alliance; Network54 or alternate Prime-tracking route; MindNutz final assault; independent At the Hope/Reaper Unreaped endings | Deterministic start + authored contracts/equipment + timed broadcast consequence + Rules combat/NET authority + optional Renzer/alternate route + sealed Reaper truth + success/escape resolution tests | **IMPLEMENTED** |
| Tales of the RED — Staying Vigilant | Source indexed; module conversion pending | No universal-module test yet | **PARTIAL** |
| Tales of the RED — Bathed in Red | Source indexed; first half of closing two-parter | No universal-module test yet | **PARTIAL** |
| Tales of the RED — One Red Night | Source indexed; second half of closing two-parter | No universal-module test yet | **PARTIAL** |
| Elflines Online | Source present; extraction pending | No universal-module test | **PARTIAL** |
| Elflines Online EP1 | Source present; extraction pending | No universal-module test | **PARTIAL** |
| Single Shot Pack | Source present; adventure enumeration/conversion pending | No universal-module test | **PARTIAL** |
| CEMK — The Jacket | Source/maps present; CEMK mechanics partly exist in VTT; adventure conversion pending | No universal-module test | **PARTIAL** |

## Runtime hardening coverage

R5.72 verifies event location restrictions, repeatable-event operation keys, UNTIL_SUCCESS retries after blocked Rules Engine resolution, engine-gated objective success/failure, idempotent consequences, immediate completion re-evaluation, GM-only unrevealed secrets, save/load separation, deterministic host RNG and AI intent authority boundaries.

## Tales of the RED invariants

Street Stories contains nine missions and explicitly uses the Beat Chart structure: Background, Rest of the Story, Setting, Opposition and Hook followed by Developments, Cliffhangers, optional Beats, Climaxes and Resolutions. The source explicitly warns that Beat flow is not always linear and can contain branches, multiple Climaxes and multiple endings. The Adventure Engine therefore treats printed Beat order as authored structure, not permission to railroad the Crew.

### Reaping the Reaper

The sixth mission is now a persistent two-stage rogue-AI hunt. Major Stiles' initial 1,000eb-per-Edgerunner operation, Faisal scanner pickup, ReaperB drone attack, Tanzia/Sall3 tracking operation and Virtex transmitter crisis are explicit state. The transmitter has a five-round deterministic clock; stopping it can occur through authored technical/destructive/NET routes resolved by the Rules Engine, while failure persists a five-Biodrone reinforcement modifier into the final encounter. The second operation persists Stiles' 2,000eb offer and Faisal's three Scramblers, two EMP Grenades and wrist detector. Renzer is optional: declining Netwatch does not railroad or dead-end the mission because Stiles/Sall3 or the Combat Cabb trail can locate MindNutz Lover. Reaper copies, the Braingen exploit and Prime's location/architecture remain sealed until discovered. The final MindNutz assault resolves mechanically through the Rules Engine and persists either Prime's destruction (At the Hope) or escape (Reaper Unreaped) without narrator outcome fabrication.

## Hope Reborn invariants

Hope Reborn is six interconnected missions intended to build on one another. All six missions now have detailed AdventureModules. The Adventure Engine persists sequence independently of narration and does not assume each mission is linear: optional Beats, player-selected branches and path switching remain explicit. Rumors/Infobox knowledge are gated information, not free narrator knowledge. The Devil's Cut preserves its social/stealth/cunning emphasis rather than being normalized into combat.

## Source inventory verified in Drive

Canonical Drive sources include Hope Reborn v1.1 + Hope Reborn+ DLC, Tales of the RED / Street Stories, Red Chrome Cargo, Elflines Online + EP1, Single Shot Pack, Edgerunners Mission Kit/The Jacket, Core v1.25, Interface RED, Black Chrome, Danger Gal Dossier and support material.

## Conversion gate

A row cannot become IMPLEMENTED merely because a PDF is indexed or legacy JSON exists. Required evidence remains:
`AdventureModule → validated references → AdventureState → playable triggers/conditions/consequences → save/load → AI context → mechanical dependency resolution → runtime tests`.
