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
| Tales of the RED — Agents of Desire | Source indexed; module conversion pending | No universal-module test yet | **PARTIAL** |
| Tales of the RED — A Bucket Full of Popcorn-Flavored Kibble | Source indexed; module conversion pending | No universal-module test yet | **PARTIAL** |
| Tales of the RED — Drummer and the Whale | Source indexed; module conversion pending | No universal-module test yet | **PARTIAL** |
| Tales of the RED — Haven't Got a Stitch to Wear | Source indexed; module conversion pending | No universal-module test yet | **PARTIAL** |
| Tales of the RED — Reaping the Reaper | Source indexed; module conversion pending | No universal-module test yet | **PARTIAL** |
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

### A Night at the Opera

The first mission is now a persistent state graph. Seven disappearances and Lucy Rhinemeyer's contract are public facts; Lord Ruthven's guilt and the Master's covert role are sealed GM truth until evidence supports revelation. Getting Tickets and the Vampyres gathering establish investigation opportunities, Noodles and Info supplies a normal route forward, and Empty Office Hours remains an optional branch rather than a progression gate. The DV9 Campus Security observation is delegated to Rules Engine. Philharmonic Vampyres are not automatically hostile. The mission resolves only after Lucy's recovery state is persisted, with the 2,000eb contract represented as 500eb on signing plus 1,500eb balance.

## Hope Reborn invariants

Hope Reborn is six interconnected missions intended to build on one another. All six missions now have detailed AdventureModules. The Adventure Engine persists sequence independently of narration and does not assume each mission is linear: optional Beats, player-selected branches and path switching remain explicit. Rumors/Infobox knowledge are gated information, not free narrator knowledge. The Devil's Cut preserves its social/stealth/cunning emphasis rather than being normalized into combat.

### Hope's Calling!!!

The rebuilt Forlorn Hope is modeled as an open preparation hub rather than a forced checklist. Supply recovery, Random's debt/The Gentleman and sabotage investigation can be approached in player-selected order. Vox/Populi's Anne/Arthur identities remain GM-only until evidence supports revelation. Mechanical checks remain Rules Engine authority. Opening Night preserves consequences of unfinished tasks and delegates the RCL assault, opposed Bar Brawl checks and timed chaos sequence to Rules Engine; the Adventure Engine only persists facts, branches and outcome.

### Ripping the Ripper

The finale begins from evidence tying Ripper to the old Hope's destruction and preserves the book's central player choice: Busan Back Door or Bullets are Simpler. The con path keeps its real Rocklin destination sealed until selected and delegates social/Forgery/Interface/combat mechanics to Rules Engine. The direct path models the hideout beats without turning them into a mandatory corridor. Violence remains possible during the con and the Crew can switch tracks. If Ripper dies before the intended climax, the engine immediately diverts to A Different Ending instead of forcing unused beats. Successful final resolution sets both the mission-complete and Hope-Reborn-campaign-complete flags.

## Source inventory verified in Drive

Canonical Drive sources include Hope Reborn v1.1 + Hope Reborn+ DLC, Tales of the RED / Street Stories, Red Chrome Cargo, Elflines Online + EP1, Single Shot Pack, Edgerunners Mission Kit/The Jacket, Core v1.25, Interface RED, Black Chrome, Danger Gal Dossier and support material.

## Conversion gate

A row cannot become IMPLEMENTED merely because a PDF is indexed or legacy JSON exists. Required evidence remains:
`AdventureModule → validated references → AdventureState → playable triggers/conditions/consequences → save/load → AI context → mechanical dependency resolution → runtime tests`.
