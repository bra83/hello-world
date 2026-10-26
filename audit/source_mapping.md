# Mapeamento Canônico de Regras: Livro Oficial → Código → UI → Persistência → Testes

Este documento estabelece a rastreabilidade completa entre as regras oficiais dos livros de Cyberpunk RED, a implementação no aplicativo Android e motores JS/Kotlin, e as evidências de teste.

---

## R01. Fórmula de Testes, Perícias e Dados
* **Regra Oficial:** Core Book v1.25 pp. 126–131.
* **Mecânica Canônica:**
  - Teste de Perícia Simples: `STAT + Perícia + 1d10_crit` vs `DV`. Sucesso se `total > DV`.
  - Explosão no 10 natural: adiciona 1d10.
  - Falha Crítica no 1 natural: subtrai 1d10.
  - Disputa Oposta: Atacante vs Defensor. Empate vai para o Defensor.
* **Implementação Código:**
  - `web/adapter/cpred_combat.js`: `rollD10Critical(rng)`, `d(sides, rng)`.
  - `app/src/main/java/com/braseiro/cyberpunkred/BarbaraRuntime.kt`: `rollCriticalD10()`, `resolveAdventureRuleAction(payload)`.
  - `web/app/cyberpunk_host_adapters.js`: `CyberpunkRulesAdapter.resolve()`.
* **Chamador UI:** `web/app/gameplay.js` (`LivingNightCityUI.rollCheck`), botões de rolagem de dados e eventos de aventura.
* **Host / Persistência:** Rolagem não manipulável por IA; resultado registrado em `AdventureState.ruleResults` e persistido em `CyberpunkCharacterStore`.
* **Testes:** `adventure_engine.test.mjs`, `cyberpunk_host_adapters_async_safety.test.mjs`, `MediaDiceSpeechTest.kt`.

---

## R02. Criação de Personagem e Evolução
* **Regra Oficial:** Core Book v1.25 pp. 72–107, 121, 411; Single Shot Pack v1.1.
* **Mecânica Canônica:**
  - Stats: INT, REF, DEX, TECH, COOL, WILL, LUCK, MOVE, BODY, EMP.
  - Derivados: `HP = 10 + 5 * ceil((BODY + WILL)/2)`, `Seriously Wounded = ceil(HP/2)`, `Death Save = BODY`, `Humanity = EMP * 10`.
  - Progressão por IP: Tabela de multiplicador de perícias (Core p. 411).
  - 10 Pregens Oficiais do Single Shot Pack: Mover, Racer, Torrent, Red, etc., totalmente preenchidos e jogáveis.
* **Implementação Código:**
  - `web/adapter/character_rules.js`: `calculateDerivedStats`, `MASTER_SKILLS`, `migrateCharacter`.
  - `web/app/single_shot_pregen_factory.js`: `createSingleShotPregen`, `PREGEN_PROFILES`.
  - `web/app/sheets.js`: Renderização de atributos, perícias, armaduras e cyberware.
  - `CyberpunkCharacterStore.kt`: Armazenamento em SQLite (`characters` table).
* **Chamador UI:** `web/app/sheets.js`, `web/app/mobile_shell.js` (gerenciador de personagens e modal de criação/seleção).
* **Testes:** `r572_full_closure.test.mjs`, `characters.cjs`, `MediaDiceSpeechTest.kt`.

---

## R03. Combate e Efeitos Físicos
* **Regra Oficial:** Core Book v1.25 pp. 168–195; Errata v1.25 p. 3.
* **Mecânica Canônica:**
  - Iniciativa: `REF + 1d10`.
  - Ataque à Distância: `REF + Arma + 1d10_crit` vs Range DV (ou esquiva se REF >= 8).
  - Ataque Melee: `DEX + Arma/Briga + 1d10_crit` vs `DEX + Evasão + 1d10_crit`. Ignora metade da SP (arredondado para cima).
  - Ablação: dano > SP causa dano direto a HP e reduz SP em 1.
  - Ferimento Crítico: dois ou mais 6s no dano geram +5 dano em HP e tabela 2d6 de ferimentos.
  - Autofire & Suppressive Fire: consumo de 10 tiros e multiplicadores oficiais.
* **Implementação Código:**
  - `web/adapter/cpred_combat.js`: `resolveSingleShot`, `resolveMeleeAttack`, `resolveAutofire`, `resolveSuppressiveFire`, `applyArmor`, `rollCriticalInjury`.
  - `BarbaraRuntime.kt`: `validateCombatTransition` (validação de orçamento de ações, consumo de munição, ablação de SP e ferimentos).
* **Chamador UI:** `web/app/gameplay.js` (`LivingNightCityUI`), interface de combate tático.
* **Testes:** `r572_full_closure.test.mjs`, `MediaDiceSpeechTest.kt`.

---

## R04. Netrunning Integral
* **Regra Oficial:** Core Book v1.25 pp. 196–219.
* **Mecânica Canônica:**
  - Turnos NET com orçamento de 2 a 6 NET Actions conforme Interface Rank.
  - Rotinas: Jack In/Out, Pathfinder, Backdoor, Eye-Dee, Control Node, Virus, Slide, Zap.
  - Combate contra Black ICE com dano cerebral e desrexxamento de programas.
  - 6 Arquiteturas Oficiais do Single Shot Pack.
* **Implementação Código:**
  - `web/adapter/cpred_netrun.js`: `generateArchitecture`, `startNetTurn`, `interfaceCheck`, `zap`, `slideCurrent`.
  - `web/app/netrun.js`: `NetrunUI`.
  - `BarbaraRuntime.kt`: `validateNetrunTransition`.
* **Chamador UI:** Aba de Netrun em `web/app/index.html`, `netrun.js`.
* **Testes:** `r572_full_closure.test.mjs`.

---

## R05. Dez Roles e Habilidades
* **Regra Oficial:** Core Book v1.25 pp. 30–50, 143–167.
* **Mecânica Canônica:**
  - Rockerboy: Charismatic Impact.
  - Solo: Combat Awareness (distribuição de pontos em Fumble Recovery, Damage Deflection, etc.).
  - Netrunner: Interface.
  - Tech: Maker (Fabricação, Upgrade, Reparo, Invenção).
  - Medtech: Medicina (Farmacêuticos, Cirurgia, Criossistemas).
  - Media: Credibilidade e boatos.
  - Exec: Equipe corporativa e motorista/segurança.
  - Lawman: Backup policial via d10 <= rank.
  - Fixer: Operador e acesso a Night Markets.
  - Nomad: Moto e modificações veiculares.
* **Implementação Código:**
  - `web/adapter/cpred_role_abilities.js`, `web/adapter/cpred_maker.js`, `web/adapter/cpred_healing.js`.
  - `BarbaraRuntime.kt`: `validateRoleAbilityTransition`.
* **Chamador UI:** Fichas de personagem em `web/app/sheets.js` e controles de Role em `web/app/gameplay.js`.
* **Testes:** `r572_full_closure.test.mjs`.

---

## R06. Cyberware / Humanidade / Terapia
* **Regra Oficial:** Core Book v1.25 pp. 108–120, 229–230.
* **Mecânica Canônica:**
  - Slots: Neuralware, Cyberópticos, Cyberáudios, Cyberbraços, Cyberpernas, Internos, Externos, Borgware.
  - Perda de Humanidade e redução de EMP.
  - Níveis de cirurgia: Mall (DV13), Clinic (DV15), Hospital (DV17).
  - Terapia Padrão e Extrema para recuperação de Humanidade.
* **Implementação Código:**
  - `web/adapter/cpred_cyberware_catalog.js`, `web/adapter/cpred_cyberware_slots.js`, `web/adapter/cpred_cyberware_surgery.js`, `web/adapter/cpred_therapy.js`, `web/adapter/cpred_humanity.js`.
* **Chamador UI:** Gestão de inventário e cyberware em `web/app/sheets.js`.
* **Testes:** `r572_full_closure.test.mjs`.

---

## R07. Economia, Crafting, Inventário e Loot
* **Regra Oficial:** Core Book v1.25 pp. 334–387; Black Chrome v1.5.
* **Mecânica Canônica:**
  - 8 faixas de preço oficiais (10eb a 10.000eb+).
  - Disponibilidade e Night Markets.
  - Transações idempotentes com `transactionId`.
* **Implementação Código:**
  - `web/adapter/cpred_economy.js`, `web/adapter/cpred_black_chrome_markets.js`.
  - `BarbaraRuntime.kt`: `validateEconomyTransition`, `walletCreditMissionReward`, `walletGetTransaction`.
* **Chamador UI:** `web/app/sheets.js`, `web/app/gameplay.js`.
* **Testes:** `r572_full_closure.test.mjs`.

---

## R08. Medicina, Descanso e Downtime
* **Regra Oficial:** Core Book v1.25 pp. 220–233.
* **Mecânica Canônica:**
  - Estabilização contra DV13/DV15.
  - Cura natural de `BODY` HP por dia de descanso estabilizado.
  - Relógio de mundo com avanço de minutos e dias.
* **Implementação Código:**
  - `web/adapter/cpred_healing.js`, `web/adapter/cpred_world_clock.js`.
  - `BarbaraRuntime.kt`: `verifyWorldTimeAdvance`.
* **Chamador UI:** `web/app/gameplay.js`.
* **Testes:** `r572_full_closure.test.mjs`.

---

## R09. Veículos, Perseguição e Deslocamento
* **Regra Oficial:** Core Book v1.25 pp. 322–324, 189–191; Hot Pursuit (Interface RED).
* **Mecânica Canônica:** Estatísticas de SDP e SP de veículos, testes de manobra, colisão e perseguição tática.
* **Implementação Código:** `web/adapter/cpred_vehicle.js`, `web/adapter/cpred_hot_pursuit.js`.
* **Chamador UI:** `web/app/gameplay.js`.
* **Testes:** `r572_full_closure.test.mjs`.

---

## R10. Mundo Vivo, NPCs, Facções e Consequências
* **Regra Oficial:** Danger Gal Dossier v1.1, Night City 2045, Living World v3.
* **Mecânica Canônica:** NPCs com stats e agendas, memória viva, eventos de mundo.
* **Implementação Código:** `web/adapter/cpred_living_world_v3.js`, `web/adapter/cpred_gang_guide.js`, `web/adapter/cpred_danger_gal.js`.
* **Chamador UI:** `web/app/atlas.js`, `web/app/gameplay.js`.
* **Testes:** `r572_full_closure.test.mjs`.

---

## R11. Conteúdo Suplementar e Fidelidade
* **Fontes:** Black Chrome v1.5, Danger Gal Dossier v1.1, Interface RED Vols 1-5, Elflines Online, CEMK.
* **Mecânica Canônica:** Módulos isolados sem contaminação entre RED 2045 e CEMK 2070s.
* **Implementação Código:** `cpred_black_chrome.js`, `cpred_interface_red.js`, `cpred_interface_red_vol5.js`, `elflines_integration.js`.
* **Testes:** `r572_full_closure.test.mjs`.

---

## R12. Contrato Rules Engine / Host / SQLite / Room
* **Regra Canônica:** Toda ação de regra declarada (`CYBERPUNK_RULE_ACTIONS`) deve ser reconhecida e resolvida pelo host ou por motor determinístico, sem aceitar receipts ambíguos ou alucinações de IA (`authority: ai`).
* **Implementação Código:** `web/app/cyberpunk_host_adapters.js`, `web/app/adventure_engine_v2.js`, `BarbaraRuntime.kt`.
* **Testes:** `cyberpunk_host_adapters_async_safety.test.mjs`, `adventure_engine.test.mjs`.

---

## R13. Aventuras Oficiais, Importação e Legado
* **Fontes:** 18 módulos em `modules/index.json`, The Jacket, Hope Reborn, Tales of the RED.
* **Mecânica Canônica:** `braseiro.adventure/v1` com envelope selado para dados do mestre; `braseiro.legacy/v1` para continuidade de mundo.
* **Implementação Código:** `braseiro_adventure_import_v1.js`, `cemk_the_jacket_campaign_port.js`, `cemk_the_jacket_wallet_port.js`.
* **Testes:** `r572_full_closure.test.mjs`.

---

## R14. Regressão dos Sistemas Funcionais
* **TTS:** Motor local Kokoro (`com.k2fsa.sherpa.onnx.tts.engine` e `.debug`) com reprodução em múltiplos blocos e interrupção funcional; Gemini TTS via REST.
* **UI/Mídia:** Imagem da cena e escolhas sugeridas acima do texto narrativo; dados físicos 3D com números gravados nas faces.
* **Atualizador OTA:** Assinatura RSA-2048, verificação SHA-256 e atomic swap preservando saves.
* **Implementação Código:** `AndroidTtsService.kt`, `GeminiTtsService.kt`, `PhysicalDiceEngine.java`, `ota_live_feature.js`.
* **Testes:** `MediaDiceSpeechTest.kt`, `navigation.cjs`, `ContractTest.java`.
