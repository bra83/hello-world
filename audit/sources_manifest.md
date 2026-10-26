# Cyberpunk RED — Inventário e Manifesto Canônico de Fontes

**Data da Auditoria:** 26/10/2026  
**Ambiente:** Braseiro Cyberpunk RED 4.1.80 → 4.1.81  
**Pasta Canônica Local:** `C:\Users\bcruz\Downloads\Cyberpunk Red\Red`  

---

## 1. Fontes Oficiais Auditadas e Classificação

| Arquivo | Edição / Errata | Domínio Principal | Escopo Mecânico |
| :--- | :--- | :--- | :--- |
| `Cyberpunk RED - Core Book Digital v1.25.pdf` | Core v1.25 | R01–R08 (Regras Core Essenciais) | Canônico Core 2045 |
| `Cyberpunk RED - Core Book Errata v1.25.pdf` | Errata v1.25 (2021) | R01, R02, R03, R05, R08 | Errata Oficial Core |
| `Cyberpunk RED - Black Chrome.pdf` | Black Chrome v1.5 | R07 (Mercados, Economia), R11 | Suplemento RED 2045 |
| `Black_Chrome_v1_5_Changelog.pdf` | Changelog v1.5 | R07, R11 | Errata Oficial Black Chrome |
| `Cyberpunk RED - Tales of the RED [lv1.2].pdf` | Tales of the RED v1.2 | R13 (9 Missões Street Stories) | Aventuras Oficiais RED |
| `RTG-CPR-TalesoftheRed-Erratav1.0.pdf` | Errata Tales v1.0 | R13 (Ajustes de NPCs e DVs) | Errata Oficial Tales |
| `Cyberpunk RED - Hope Reborn [v1.1] CR3091.pdf` | Hope Reborn v1.1 | R13 (Campanha 7 Missões), R11 | Campanha Oficial Hope Reborn |
| `Cyberpunk RED - Hope Reborn Plus [v1.1].pdf` | Hope Reborn+ v1.1 | R11, R13 | DLC Campanha Hope Reborn |
| `Cyberpunk RED - Single Shot Pack v1.1.pdf` | Single Shot Pack v1.1 | R02 (10 Pregens), R04 (6 NETs) | Suplemento Pregens & NETs |
| `Cyberpunk RED - Elflines Online.pdf` | Elflines Online v1.0 | R11 (MMO Minigame), R13 | Suplemento Lúdico RED 2045 |
| `Cyberpunk RED - Elflines Online EXP1.pdf` | Elflines EXP1 v1.0 | R11 (Expansão MMO), R13 | Suplemento Lúdico RED 2045 |
| `Cyberpunk RED - Red Chrome Cargo.pdf` | Red Chrome Cargo v1.0 | R13 (Missão Hornet Train) | Aventura Oficial RED 2045 |
| `Cyberpunk RED - Danger Gal Dossier.pdf` | Danger Gal Dossier v1.1 | R10 (NPCs, Facções), R11 | Dossier de Adversários |
| `Cyberpunk RED - Danger Gal Dossier - Errata v1.pdf` | Errata DGD v1.0 | R10, R11 | Errata Oficial DGD |
| `Cyberpunk RED - Danger Gal Dossier+ DLC.pdf` | DGD+ DLC | R10, R11 | DLC Adversários DGD |
| `Cyberpunk RED - Interface RED - Volume 5 v1.1 [CR3131].pdf` | Interface RED Vol.5 v1.1 | R08, R09, R11 (Pets, Investigação) | Suplemento Oficial |
| `Cyberpunk RED - Single Player Mode [CR3121].pdf` | Single Player Mode v1.0 | R10, R11 (Oracle, Clocks, Morale) | Guia Solo Oficial |
| `Cyberpunk RED - Night City 2045 (2026).pdf` | Night City 2045 | R09, R10 (Atlas, Distritos, POIs) | Cartografia e Geografia RED |
| `Cyberpunk RED - 12 Days of REDmas.pdf` | REDmas DLC | R11 (Itens Natalinos) | Suplemento Oficial |
| `Cyberpunk RED - Hardened Mooks.pdf` | Hardened Mooks DLC | R03, R10, R11 (Inimigos Reforçados) | Suplemento de Combate |
| `Cyberpunk RED - Night Market Index v1.09.pdf` | Night Market Index v1.09 | R07 (Tabelas de Mercado) | Suplemento de Economia |
| `Edgerunners Mission Kit / CEMK Digital` | CEMK v1.0 | R06, R11 (Cyberware 2070s) | Isolado (Não misturado ao Core) |

---

## 2. Mapeamento de Entrypoints por Domínio de Regras

### R01. Fórmula de Testes, Perícias e Dados
* **Fontes Oficiais:** Core Book v1.25 pp. 126–131; Errata v1.25.
* **Fórmula Canônica:** `STAT + Perícia + 1d10_crit` vs `DV` (sucesso se `total > DV`).
* **Explosão Crítica:** 10 natural no 1d10 adiciona outro 1d10 (`kind: critical`).
* **Falha Crítica:** 1 natural no 1d10 subtrai outro 1d10 (`kind: fumble`).
* **Disputa Oposta:** Atacante `STAT + Perícia + 1d10_crit` vs Defensor `STAT + Perícia + 1d10_crit`. Em empate, Defensor sempre vence.
* **Implementação Código:** `cpred_combat.js` (`rollD10Critical`, `d`), `BarbaraRuntime.kt` (`rollCriticalD10`, `resolveAdventureRuleAction`).
* **Dados Físicos 3D:** `PhysicalDiceEngine.java`, `Dice3DProtocol.java`, `Dice3DView.java`.

### R02. Criação de Personagem e Evolução
* **Fontes Oficiais:** Core Book v1.25 pp. 72–107, 121, 411.
* **Derivados:** `HP = 10 + 5 * ceil((BODY + WILL)/2)`; `Seriously Wounded = ceil(HP/2)`; `Death Save = BODY`; `Humanity = EMP * 10`.
* **Evolução:** Tabela de Custo de IP (Core p. 411). Multirole exige Rank 4 no Role primário.
* **Single Shot Pack v1.1:** 10 fichas jogáveis (`single_shot_pregen_factory.js`, `single_shot_pregen_identities.js`).
* **Implementação Código:** `character_rules.js`, `CyberpunkCharacterStore.kt`.

### R03. Combate e Efeitos Físicos
* **Fontes Oficiais:** Core Book v1.25 pp. 168–195; Errata v1.25 p. 3.
* **Iniciativa:** `REF + 1d10`.
* **Ataque à Distância:** `REF + Perícia + 1d10_crit` vs Range DV (ou evasão se `REF >= 8`).
* **Ataque Melee:** `DEX + Melee/Brawling + 1d10_crit` vs `DEX + Evasão + 1d10_crit`. Ignora metade da SP (arredondado para cima).
* **Ablação e Dano:** Penetração de dano reduz SP em 1 e aplica o excedente em HP.
* **Ferimentos Críticos:** Dois 6s no dano aplicam +5 dano direto em HP e rolam 2d6 na tabela de ferimentos críticos.
* **Autofire e Suppressive Fire:** Resolução matemática estrita de multiplicadores de margem e testes de Concentração.
* **Implementação Código:** `cpred_combat.js`, `BarbaraRuntime.kt` (`validateCombatTransition`).

### R04. Netrunning Integral
* **Fontes Oficiais:** Core Book v1.25 pp. 196–219.
* **Ações NET por Interface:** 2 a 6 ações por turno conforme Rank de Interface.
* **Rotinas:** Jack In/Out, Pathfinder, Backdoor, Eye-Dee, Control Node, Virus, Slide, Zap.
* **Arquiteturas:** 6 arquiteturas do Single Shot Pack integradas com combate digital contra Black ICE.
* **Implementação Código:** `cpred_netrun.js`, `netrun.js` (`NetrunUI`), `BarbaraRuntime.kt` (`validateNetrunTransition`).

### R05. Dez Roles e Habilidades
* **Fontes Oficiais:** Core Book v1.25 pp. 30–50, 143–167.
* **Roles:** Rockerboy (Charismatic Impact), Solo (Combat Awareness), Netrunner (Interface), Tech (Maker), Medtech (Medicine), Media (Credibility), Exec (Teamwork), Lawman (Backup), Fixer (Operator), Nomad (Moto).
* **Implementação Código:** `cpred_role_abilities.js`, `cpred_maker.js`, `cpred_healing.js`, `BarbaraRuntime.kt` (`validateRoleAbilityTransition`).

### R06. Cyberware / Humanidade / Terapia
* **Fontes Oficiais:** Core Book v1.25 pp. 108–120, 229–230.
* **Slots e Cirurgia:** Mall (DV13), Clinic (DV15), Hospital (DV17).
* **Terapia:** Padrão (2d6 HL recuperado, 500eb, 7 dias), Extrema (4d6 HL recuperado, 1000eb, 7 dias).
* **Implementação Código:** `cpred_cyberware_catalog.js`, `cpred_cyberware_slots.js`, `cpred_cyberware_surgery.js`, `cpred_therapy.js`, `cpred_humanity.js`.

### R07. Economia, Crafting, Inventário e Loot
* **Fontes Oficiais:** Core Book v1.25 pp. 334–387; Black Chrome v1.5.
* **Preços e Mercados:** 8 faixas de preço (10eb a 10.000eb+). Night Markets para itens caros.
* **Maker Tech:** Fabricação, Invenção, Upgrade e Reparo com tempo e DVs oficiais.
* **Implementação Código:** `cpred_economy.js`, `cpred_black_chrome_markets.js`, `BarbaraRuntime.kt` (`validateEconomyTransition`, `walletCreditMissionReward`).

### R08. Medicina, Descanso e Downtime
* **Fontes Oficiais:** Core Book v1.25 pp. 220–233.
* **Estabilização:** First Aid / Paramedic vs DV (DV13 Seriously Wounded, DV15 Mortally Wounded).
* **Cura Natural:** `BODY` HP por dia de descanso estabilizado.
* **Implementação Código:** `cpred_healing.js`, `cpred_critical_injury_care.js`, `cpred_world_clock.js`, `BarbaraRuntime.kt`.

### R09. Veículos, Perseguição e Deslocamento
* **Fontes Oficiais:** Core Book v1.25 pp. 322–324, 189–191; Hot Pursuit (Interface RED).
* **Mecânicas:** Manobras de direção, colisão, abroolhamento e perseguições por faixas de distância.
* **Implementação Código:** `cpred_vehicle.js`, `cpred_hot_pursuit.js`.

### R10. Mundo Vivo, NPCs, Facções e Consequências
* **Fontes Oficiais:** Danger Gal Dossier v1.1, Night City 2045, Living World v3.
* **Implementação Código:** `cpred_living_world_v3.js`, `cpred_gang_guide.js`, `cpred_everyday_people.js`, `cpred_danger_gal.js`.

### R11. Conteúdo Suplementar e Fidelidade
* **Fontes Oficiais:** Black Chrome v1.5, Danger Gal Dossier v1.1, Interface RED Vols 1-5, Elflines Online, CEMK.
* **Implementação Código:** Módulos dedicados em `adapter/`.

### R12. Contrato Rules Engine / Host / SQLite / Room
* **Ações CYBERPUNK_RULE_ACTIONS:** Conexão ponta a ponta dos resolvedores reais em Kotlin e JS.
* **Integridade:** Bloqueio de respostas AI não autoritativas. Idempotência em transações de carteira e salvamento de dados.
* **Implementação Código:** `cyberpunk_host_adapters.js`, `adventure_engine_v2.js`, `BarbaraJsBridge.kt`, `BarbaraRuntime.kt`.

### R13. Aventuras Oficiais, Importação e Legado
* **Fontes Oficiais:** 18 módulos em `modules/index.json`, The Jacket (CEMK), Hope Reborn, Tales of the RED.
* **Importação e Legado:** `braseiro.adventure/v1` e `braseiro.legacy/v1`.
* **Implementação Código:** `braseiro_adventure_import_v1.js`, `cemk_the_jacket_campaign_port.js`, `cemk_the_jacket_wallet_port.js`.

### R14. Regressão dos Sistemas Funcionais
* **TTS:** Motor local Kokoro (`com.k2fsa.sherpa.onnx.tts.engine`) e Gemini TTS preservados sem substituição silenciosa.
* **Mídia e Dados:** Imagem da cena e escolhas sugeridas acima do texto; dados físicos 3D funcionais.
* **Atualizador OTA:** Assinatura SHA256withRSA e SHA-256 com preservação de saves.
* **Implementação Código:** `AndroidTtsService.kt`, `GeminiTtsService.kt`, `ota_live_feature.js`.
