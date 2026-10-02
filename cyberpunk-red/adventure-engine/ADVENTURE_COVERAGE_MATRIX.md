# ADVENTURE_COVERAGE_MATRIX — Cyberpunk RED

Status meanings:
- **IMPLEMENTED** — structured AdventureModule + runtime path + tests.
- **PARTIAL** — source or legacy runtime content exists, but conversion to the universal AdventureModule is incomplete.
- **BLOCKED** — source/dependency not yet parsed or a required Rules/World mechanic is not yet wired.

| Adventure / source | Source | Start | Locations | NPCs | Clues | Secrets | Events | Encounters | Objectives | Rules dependencies | Completion | Runtime tested | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Night City Sandbox | Braseiro runtime | Dynamic current/player location | World Engine | World Engine | Dynamic | Dynamic | Dynamic | Rules Engine | Emergent | Existing RED rules | Open-ended | Engine unit tests | **IMPLEMENTED** |
| Red Chrome Cargo | `RTG-CPR-RedChromeCargo-RED.pdf` pp. 3–4 | Hornet train → parallel Hammerhead approach | Hornet train, roof, rear/middle/front/driver cars | Hornet + rear/front Legion groups + officer | Cargo manifest | Cargo contents sealed by reveal condition | Boarding, hatch, NET, front defense, stop train, extraction | Rear guards + front defense | Recover and return four crates | Athletics DV13/DV15, Basic Tech DV13, Drive Land Vehicle DV9, combat, NET Architecture | Objective success → reward/world consequence | V2 module validation, deterministic start, sealed-secret, event semantics | **IMPLEMENTED** |
| Hope Reborn — campaign spine | `Cyberpunk RED - Hope Reborn [v1.1] CR3091.pdf` Playing the Campaign | Forlorn Hope home base | Campaign hub encoded; per-mission settings pending | Per-mission conversion pending | Mission rumor framework encoded | Per-mission conversion pending | Six-mission continuity transitions encoded | Per-mission conversion pending | Campaign objective encoded | Core RED; per-mission dependencies pending | Final mission flag → campaign completion | V2 validation, deterministic start/order/completion | **PARTIAL** |
| Hope Reborn — The Angel's Share | same source, mission begins p.19 | Pending detailed Beat extraction | Pending | Pending | Pending | Pending | Hook/Dev/Cliff/Climax/Resolution pending | Pending | Pending | Core RED + mission-specific | Pending | No detailed module test yet | **PARTIAL** |
| Hope Reborn — Real Estate Rumble | same source, mission begins p.41 | Campaign transition encoded | Pending | Pending | Pending | Pending | Detailed Beat conversion pending | Pending | Pending | Core RED + mission-specific | Pending | Campaign transition tested | **PARTIAL** |
| Hope Reborn — Welcome to the Neighborhood | same source, mission begins p.63 | Campaign transition encoded | Pending | Pending | Pending | Pending | Detailed Beat conversion pending | Pending | Pending | Core RED + mission-specific | Pending | Campaign transition tested | **PARTIAL** |
| Hope Reborn — The Devil's Cut | same source, mission begins p.93 | Campaign transition encoded | Pending | Pending | Pending | Pending | Detailed Beat conversion pending | Pending | Pending | Social/stealth/cunning emphasis + Core RED | Pending | Campaign transition tested | **PARTIAL** |
| Hope Reborn — Hope's Calling!!! | same source, mission begins p.113 | Campaign transition encoded | Pending | Pending | Pending | Pending | Detailed Beat conversion pending | Pending | Pending | Core RED + mission-specific | Pending | Campaign transition tested | **PARTIAL** |
| Hope Reborn — Ripping the Ripper | same source, mission begins p.145 | Campaign transition encoded | Pending | Pending | Pending | Pending | Detailed Beat conversion pending | Pending | Campaign finale flag encoded | Core RED + branching finale | Campaign completion encoded | Campaign completion tested | **PARTIAL** |
| Tales of the RED / Street Stories collection | `RTG-CPR-TalesoftheRED-Digitalv1.2.pdf` / Street Stories sources | Pending per-adventure extraction | Legacy content exists; module conversion pending | Legacy content exists; conversion pending | Pending structured extraction | Pending | Legacy beats/events need mapping | Existing combat/Netrunning | Pending | Core RED + adventure-specific dependencies | Pending | Not yet under universal engine | **PARTIAL** |
| Elflines Online | `RTG-CPR-ElflinesOnline.pdf` | Pending extraction | Pending | Pending | Pending | Pending | Pending | Existing RED rules | Pending | Core RED + Elflines-specific mechanics | Pending | Not yet under universal engine | **PARTIAL** |
| Elflines Online EP1 | `RTG-CPR-ElflinesOnlineEP1.pdf` | Pending extraction | Pending | Pending | Pending | Pending | Pending | Existing RED rules | Pending | Core RED + Elflines-specific mechanics | Pending | No | **PARTIAL** |
| Single Shot Pack | `RTG-CPRed-SingleShotPackv1.1.pdf` | Pending adventure enumeration | Pending | Pending | Pending | Pending | Pending | Existing RED rules | Pending | Core RED | Pending | No | **PARTIAL** |
| CEMK — The Jacket | Edgerunners Mission Kit / `CEMK The Jacket.pdf` | Pending extraction | Maps/source present | Pending | Pending | Pending | Pending | RED/CEMK mechanics | Pending | CEMK rule dependencies already partly present in VTT | Pending | No universal-module test yet | **PARTIAL** |

## Runtime hardening coverage

The hardened R5.72 runtime verifies top-level event location restrictions, repeatable-event operation keys, UNTIL_SUCCESS retries after blocked Rules Engine resolution, engine-gated objective success/failure, idempotent objective consequences, immediate completion re-evaluation, and GM-only handling of unrevealed secrets.

## Hope Reborn campaign invariants now encoded

The source explicitly defines Hope Reborn as six interconnected missions designed to occur one after another, with later missions building on earlier events. The Adventure Engine now persists that campaign sequence independently from AI narration. The source also says mission Beat flow is not always linear, some Beats are branch-specific, and some are optional; detailed mission conversion must therefore preserve branches and cannot force optional Beats. Rumor tables and Infobox knowledge remain information-gating mechanisms rather than free AI knowledge. The fourth mission, The Devil's Cut, must retain its emphasis on cunning, social skills and stealth rather than being normalized into combat.

## Source inventory verified in Drive
The canonical Cyberpunk RED Drive contains Hope Reborn v1.1 plus Hope Reborn+ DLC, Tales of the RED / Street Stories, Red Chrome Cargo, Elflines Online, Elflines Online EP1, Single Shot Pack, Edgerunners Mission Kit including The Jacket, Core v1.25, Interface RED volumes, Black Chrome, Danger Gal Dossier and other support sources.

## Conversion rule
A row cannot become IMPLEMENTED merely because the PDF is indexed or legacy JSON exists. Required evidence remains:
`AdventureModule → validated references → AdventureState → playable triggers/conditions/consequences → save/load → AI context → mechanical dependency resolution → runtime test`.
