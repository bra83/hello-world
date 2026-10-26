# Cyberpunk RED R5.81 / 4.1.81 — Relatório de Regressões e Verificações

**Data:** 26/10/2026  
**Versão Alvo:** 4.1.81 (build 4181)  
**Branch de Integração:** `audit/cpred-r581-rules-parity`  
**Commit Base:** `f4fdca25b36cc4839961cfd9c9781c511add0e26`  

---

## 1. Suíte de Testes Automatizados (294/294 PASS)

Todos os 294 testes de regressão do motor de aventuras continuam passando com 100% de aprovação (0 falhas, 0 skips, 0 cancelamentos):

* **Tempo de execução:** ~1.8 segundos no Node.js v22.
* **Componentes cobertos:**
  1. `adventure_engine.test.mjs`: Ciclo de vida atômico, resolução de eventos, bloqueio de consequências por falha em `ruleActions`, preservação de estado em reabertura, relógio determinístico e separação estrita de segredos do GM frente à IA.
  2. `adventure_engine_v2.test.mjs`: Validação de 18 módulos oficiais, eventos UNTIL_SUCCESS e REPEATABLE, e bloqueio de regras quando o teste falha (`passed: false`).
  3. `cyberpunk_host_adapters_async_safety.test.mjs`: Rejeição estrita de recibos ambíguos ou com atribuição de autoridade a IA (`authority: 'ai'` / `'gemini'`), isolamento de troca de personagem durante chamadas assíncronas, e integridade de coordenadas Atlas 30x30.
  4. `r572_full_closure.test.mjs`:
     * Validação dos 18 módulos em `index.json` contra `CYBERPUNK_RULE_ACTIONS`.
     * 10 pregens completos do Single Shot Pack web-jogáveis com armas, armaduras, cyberware e derivados conformes ao PDF.
     * 6 NET Architectures oficiais funcionais.
     * Rollback atômico diante de falha no `saveCharacter` (restauração de aventura e coordenadas no Atlas SQLite).
     * Elflines Online EP1 executando criação e progressão de masmorra.
     * Importação `braseiro.adventure/v1` com envelope selado e continuidade durável `braseiro.legacy/v1`.

---

## 2. Contratos JVM e Testes Nativos

* **Contratos Testados:** `ContractTest.java`
  - `PhysicalDiceEngine`: Simulação física dos dados 3D importados do Forbidden Lands com projeção das faces correspondentes ao resultado numérico.
  - `GeminiSpeechWire`: Serialização de requisição REST pura para voz cloud, remoção de tags SSML/vocais e decodificação PCM 24kHz.
  - `BraseiroAndroidTtsPolicy`: Política estrita de preservação do pacote Kokoro/Sherpa solicitado (`com.k2fsa.sherpa.onnx.tts.engine` e `.debug`), eliminando qualquer fallback silencioso.
  - `NativeNarrationPlan`: Sequenciamento determinístico de blocos de narração e controle de interrupção imediata via `stop()`.

---

## 3. Auditoria do Call Graph e Ações de Regras (`CYBERPUNK_RULE_ACTIONS`)

* **Problema Identificado no Baseline:**
  O método nativo `resolveAdventureRuleAction` no `BarbaraRuntime.kt` continha um stub fixo (`val roll = 7`) e resolvia apenas `Perception` com INT/REF, ignorando o rolador d10 explosivo e todos os outros tipos de ação de regras declarados nos 18 módulos. Além disso, o timeout de fallback de evento no navegador era de 80ms, o que rejeitava interações assíncronas.
* **Correções Implementadas:**
  1. `BarbaraRuntime.kt`: Implementado resolvedor canônico multiação cobrindo todas as categorias de `CYBERPUNK_RULE_ACTIONS`:
     - Resolução canônica de `SKILL_CHECK` usando o mapa de 66 perícias aos atributos oficiais do Core v1.25.
     - Suporte a perícias compostas (ex: `"Streetwise / Trading / Persuasion"` ou `"Conversation|Persuasion"`), selecionando dinamicamente a melhor perícia do personagem.
     - Cálculo de penalidades de ferimento (-2 para Seriously Wounded, -4 para Mortally Wounded).
     - Rolagem de 1d10 com explosão crítica no 10 natural (+1d10) e desastre no 1 natural (-1d10) via `rollCriticalD10()`.
     - Resolução de `OPPOSED_CHECK` / `BAR_BRAWL_OPPOSED_CHECK` com a regra oficial de empate (Defensor sempre vence, Core p. 129).
     - Resolução de `COMBAT_START` e iniciativas (`REF + 1d10_crit + woundPenalty`).
     - Resolução de `DICE_ROLL`, `NET_ARCHITECTURE`, `HUMANITY_CHECK`, `WORLD_TIME_ADVANCE`, `ROLLER_DERBY` e `CHASE`.
  2. `cyberpunk_host_adapters.js`:
     - Timeout de `requestBrowserResolver` aumentado de 80ms para 5000ms para permitir interação de UI/dados sem timeout precoce.
  3. `adventure_engine_v2.js`:
     - `requiredBlocked` agora verifica explicitamente `r?.passed === false || r?.success === false`, garantindo que um teste de regra obrigatório reprovado impeça a aplicação de consequências na aventura.

---

## 4. Preservação de Dados e Atualização sobreposta

* **Identificação de Pacote:** `com.braseiro.cyberpunkred`
* **Version Code:** Atualizado de 4180 para 4181 (`versionCode = 4181`).
* **Version Name:** Atualizado para `4.1.81` (`versionName = "4.1.81"`).
* **Certificado de Assinatura:**
  - DN: `CN=Braseiro Stable Debug, O=Braseiro, C=BR`
  - SHA-256 Digest: `6aa87a24a2eb4762c3f493c9d5fddbf10b60cc8659a90423aed7cde8ae582bd3`
  - Instalação direta sobre a versão 4.1.80 preservando todos os personagens, banco SQLite, preferências e campanhas.
