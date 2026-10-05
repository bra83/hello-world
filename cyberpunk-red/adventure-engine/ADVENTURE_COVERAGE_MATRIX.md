# ADVENTURE_COVERAGE_MATRIX — Cyberpunk RED

Status: **IMPLEMENTED** = validated AdventureModule + persistent runtime path + tests; **PARTIAL** = conversion incomplete; **BLOCKED** = missing required dependency.

| Adventure / source | State graph / mechanics | Runtime evidence | Status |
|---|---|---|---|
| Night City Sandbox | Dynamic World Engine start; persistent emergent state | Engine unit tests | **IMPLEMENTED** |
| Red Chrome Cargo | Hornet/Hammerhead locations, cargo clue/secret, boarding/NET/combat/extraction, Rules Engine DVs | Validation + deterministic start + sealed secret + event tests | **IMPLEMENTED** |
| Hope Reborn — campaign spine | Six-mission ordered continuity with persistent handoff flags and all six detailed mission modules | Campaign start/order/completion tests + per-mission suites | **IMPLEMENTED** |
| Hope Reborn — The Angel's Share | Branching Blank investigation, disaster/rescue branches, Pickup Game choice, A New Hope handoff | Validation + sealed knowledge + optional rescue + agency tests | **IMPLEMENTED** |
| Hope Reborn — Real Estate Rumble | Haunted House/Death Maze, GRAF3 guard branch, Bozo escalation, bouquet invariant, chase/combat, Happy/Sad Jack | Validation + agency + 0d6 bouquet + resolution/handoff tests | **IMPLEMENTED** |
| Hope Reborn — Welcome to the Neighborhood | Open five-job hub across one month; Shark/Boys/Wheels/Turf/Love branches and Report gate | Validation + open-order + Rules authority + hidden timer + betrayal + report tests | **IMPLEMENTED** |
| Hope Reborn — The Devil's Cut | Player-owned Case/Heist/Escape; social/stealth/cunning/NET; Mira intel sealed; dual resolution | Validation + agency + sealed intel + resolution/handoff tests | **IMPLEMENTED** |
| Hope Reborn — Hope's Calling!!! | Open preparation Task Hub; supply recovery; social/combat; sabotage; opening-night assault | Validation + open-order + secret gating + Rules authority + opening-resolution tests | **IMPLEMENTED** |
| Hope Reborn — Ripping the Ripper | Evidence hook; Busan con; Redline/setup/flip; direct assault; path switching; early-death branch | Validation + branch ownership + sealed target + Rules authority + campaign completion tests | **IMPLEMENTED** |
| Tales of the RED — A Night at the Opera | University investigation; Vampyres; optional office branch; sealed Ruthven truth; Monster Hunt | Validation + deterministic start + sealed-secret + optional-branch + payment tests | **IMPLEMENTED** |
| Tales of the RED — Agents of Desire | Kodai hook; La Lune Bleue; optional investigation routes; Ai/Soulkiller sealed; three resolutions | Deterministic start + secret isolation + multi-route + DV authority + resolution tests | **IMPLEMENTED** |
| Tales of the RED — A Bucket Full of Popcorn-Flavored Kibble | Rival Crew; audition; food sourcing; Cybersnake; optional theft/bug; Lovely House; Spotlight | Deterministic start + DV authority + optional-dirty-deed + creative-climax + Spotlight tests | **IMPLEMENTED** |
| Tales of the RED — Drummer and the Whale | Waterfront/container; underwater/ROV/tunnels; MacDonnelson; cargo choice; four climax branches | Deterministic start + sealed-secret + Rules authority + cargo/multi-climax tests | **IMPLEMENTED** |
| Tales of the RED — Haven't Got a Stitch to Wear | Three-day contract; Night Market; blockade; Fixie; John Doe; Rambling Rose; Lightning Logistics | Deadline/reward + non-forced-combat + John Doe + multi-solution + custody tests | **IMPLEMENTED** |
| Tales of the RED — Reaping the Reaper | Two-stage Stiles operation; five-round broadcast; optional Renzer; alternate Prime route; dual endings | Contracts/equipment + clock consequence + combat/NET authority + secret + ending tests | **IMPLEMENTED** |
| Tales of the RED — Staying Vigilant | Trace investigation; tent-city/alley route ownership; Hardhat stealth/loud state; sealed Nat/Continental truth; Lowball bounty; player-owned Friend/Foe/switch-side branches; Rules-owned Hot Zone chase; Nomad Camp/Lowball consequences | Deterministic start + distinct 1,000eb/2,000eb offers + route + infiltration + sealed truth + player agency + chase threshold + dual-resolution tests; CI Adventure Engine/Syntax/dry-run PASS | **IMPLEMENTED** |
| Tales of the RED — Bathed in Red | Source indexed; first half of closing two-parter | No universal-module test yet | **PARTIAL** |
| Tales of the RED — One Red Night | Source indexed; second half of closing two-parter | No universal-module test yet | **PARTIAL** |
| Elflines Online | Source present; extraction pending | No universal-module test | **PARTIAL** |
| Elflines Online EP1 | Source present; extraction pending | No universal-module test | **PARTIAL** |
| Single Shot Pack | Source present; adventure enumeration/conversion pending | No universal-module test | **PARTIAL** |
| CEMK — The Jacket | Source/maps present; CEMK mechanics partly exist in VTT; adventure conversion pending | No universal-module test | **PARTIAL** |

## Runtime hardening coverage

R5.72 verifies event location restrictions, repeatable-event operation keys, UNTIL_SUCCESS retries after blocked Rules Engine resolution, engine-gated objective success/failure, idempotent consequences, immediate completion re-evaluation, GM-only unrevealed secrets, save/load separation, deterministic host RNG and AI intent authority boundaries.

## Tales of the RED invariants

Street Stories contains nine missions and explicitly uses the Beat Chart structure: Background, Rest of the Story, Setting, Opposition and Hook followed by Developments, Cliffhangers, optional Beats, Climaxes and Resolutions. Beat flow is not assumed linear; branches, multiple Climaxes and multiple endings remain explicit state rather than narrator railroad.

### Staying Vigilant

The seventh Street Story is now deterministic persistent state. Trace Santiago's 1,000eb-per-Edgerunner investigation is distinct from Lowball's later 2,000eb-per-person bounty. The Crew owns the tent-city versus back-alley route and the warehouse retains separate stealth/loud state. Nat's Jodes identity, Pack history and Continental Brands connection remain sealed until legitimately learned. The engine never labels Nat a cyberpsycho as established truth and never chooses Friend or Foe for the player; switching sides is also explicit persistent state. The Friend branch delegates every Hot Zone vehicle Maneuver and attack to the Rules Engine while persisting the authored seven-success escape threshold. The Foe branch keeps Nat/Trace opposition and bounty consequence distinct. Nomad Camp preserves Trace's 1,000eb payment, Nat's favor and the stronger Continental Brands expose; Lowball preserves the 2,000eb bounty, zero Trace payment and weaker expose.

### Reaping the Reaper

The sixth mission is a persistent two-stage rogue-AI hunt. Major Stiles' contracts, Faisal equipment, five-round transmitter clock, optional Renzer alliance, alternate Prime-tracking route and independent Prime-destroyed/Prime-escaped endings remain explicit state. Mechanical resolution remains Rules Engine authority and Reaper/Braingen/Prime information stays sealed until discovered.

## Hope Reborn invariants

Hope Reborn is six interconnected missions intended to build on one another. All six missions have detailed AdventureModules. Sequence persists independently of narration; optional Beats, player-selected branches and path switching remain explicit. Rumors/Infobox knowledge are gated information, not free narrator knowledge.

## Source inventory verified in Drive

Canonical Drive sources include Hope Reborn v1.1 + Hope Reborn+ DLC, Tales of the RED / Street Stories, Red Chrome Cargo, Elflines Online + EP1, Single Shot Pack, Edgerunners Mission Kit/The Jacket, Core v1.25, Interface RED, Black Chrome, Danger Gal Dossier and support material.

## Conversion gate

A row cannot become IMPLEMENTED merely because a PDF is indexed or legacy JSON exists. Required evidence remains:
`AdventureModule → validated references → AdventureState → playable triggers/conditions/consequences → save/load → AI context → mechanical dependency resolution → runtime tests`.
