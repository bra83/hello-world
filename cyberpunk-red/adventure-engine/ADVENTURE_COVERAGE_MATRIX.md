# ADVENTURE_COVERAGE_MATRIX — Cyberpunk RED

Status meanings:
- **IMPLEMENTED** — structured AdventureModule + runtime path + tests.
- **PARTIAL** — source or legacy runtime content exists, but conversion to the universal AdventureModule is incomplete.
- **BLOCKED** — source/dependency not yet parsed or a required Rules/World mechanic is not yet wired.

| Adventure / source | Source | Start | Locations | NPCs | Clues | Secrets | Events | Encounters | Objectives | Rules dependencies | Completion | Runtime tested | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Night City Sandbox | Braseiro runtime | Dynamic current/player location | World Engine | World Engine | Dynamic | Dynamic | Dynamic | Rules Engine | Emergent | Existing RED rules | Open-ended | Engine unit tests | **IMPLEMENTED** |
| Tales of the RED collection | RTG-CPR-TalesoftheRED-Digitalv1.2.pdf / Street Stories sources | Pending per-adventure extraction | Legacy content exists; module conversion pending | Legacy content exists; conversion pending | Pending structured extraction | Pending | Legacy beats/events need mapping | Existing combat/Netrunning | Pending | Core RED + adventure-specific dependencies | Pending | Not yet under universal engine | **PARTIAL** |
| Tales of the RED — Hope Reborn | Hope Reborn v1.1 + DLC | Pending extraction | Legacy runtime content/equipment exists | Pending module conversion | Pending | Pending | Pending | Existing RED rules | Pending | Core RED + Hope Reborn content | Pending | Not yet under universal engine | **PARTIAL** |
| Red Chrome Cargo | RTG-CPR-RedChromeCargo-RED.pdf | Pending canonical start extraction | Legacy functional phases exist | Pending module conversion | Pending | Pending | Legacy phases need state-graph mapping | Core combat/vehicle as required | Pending | Core RED | Pending | Not yet under universal engine | **PARTIAL** |
| Elflines Online | RTG-CPR-ElflinesOnline.pdf | Pending extraction | Pending | Pending | Pending | Pending | Pending | Existing RED rules | Pending | Core RED + Elflines-specific mechanics | Pending | Not yet under universal engine | **PARTIAL** |
| Elflines Online EP1 | RTG-CPR-ElflinesOnlineEP1.pdf | Pending extraction | Pending | Pending | Pending | Pending | Pending | Existing RED rules | Pending | Core RED + Elflines-specific mechanics | Pending | No | **PARTIAL** |
| Single Shot Pack | RTG-CPRed-SingleShotPackv1.1.pdf | Pending adventure enumeration | Pending | Pending | Pending | Pending | Pending | Existing RED rules | Pending | Core RED | Pending | No | **PARTIAL** |
| CEMK — The Jacket | Edgerunners Mission Kit / CEMK The Jacket.pdf | Pending extraction | Maps/source present | Pending | Pending | Pending | Pending | RED/CEMK mechanics | Pending | CEMK rule dependencies already partly present in VTT | Pending | No universal-module test yet | **PARTIAL** |

## Source inventory verified in Drive
The canonical Cyberpunk RED Drive currently contains, among other material:
- Tales of the RED / Street Stories;
- Hope Reborn;
- Red Chrome Cargo;
- Elflines Online;
- Elflines Online EP1;
- Single Shot Pack;
- Edgerunners Mission Kit including `CEMK The Jacket.pdf`;
- Core v1.25, Interface RED volumes, Black Chrome, Danger Gal Dossier and other rules/support sources.

## Conversion rule
A row cannot become IMPLEMENTED merely because the PDF is indexed or legacy JSON exists.

Required evidence:
`AdventureModule → validated references → AdventureState → playable triggers/conditions/consequences → save/load → AI context → mechanical dependency resolution → runtime test`.
