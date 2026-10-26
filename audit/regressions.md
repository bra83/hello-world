# Cyberpunk RED R5.81 / 4.1.82 — Relatório de Regressões e Verificações

**Data:** 26/10/2026  
**Versão Alvo:** 4.1.82 (build 4182)  
**Branch de Continuidade:** `audit/cpred-r581-rules-parity`  
**Commit Base:** `f4fdca25b36cc4839961cfd9c9781c511add0e26`  

---

## 1. Suíte de Testes Automatizados (314/314 PASS)

Todos os 314 testes automatizados do motor de aventuras e regras executam com 100% de aprovação (0 falhas, 0 cancelamentos, 0 skips):

* **Tempo de execução:** ~1.9 segundos no Node.js v22.
* **Componentes cobertos:**
  1. `adventure_engine.test.mjs`: Ciclo de vida atômico, resolução de eventos, bloqueio de consequências por falha em `ruleActions`, preservação de estado em reabertura, relógio determinístico e separação estrita de segredos do GM frente à IA.
  2. `adventure_engine_v2.test.mjs`: Validação de 18 módulos oficiais, eventos UNTIL_SUCCESS e REPEATABLE, e bloqueio de regras quando o teste falha (`passed: false`).
  3. `cyberpunk_host_adapters_async_safety.test.mjs`: Rejeição estrita de recibos ambíguos ou com atribuição de autoridade a IA (`authority: 'ai'` / `'gemini'`), isolamento de troca de personagem durante chamadas assíncronas, e integridade de coordenadas Atlas 30x30.
  4. `cpred_combat_parity_4181.test.mjs`:
     * Penetração de dano vs SP de armadura corporal e ablação de blindagem (-1 geral, -2 para Armor Piercing).
     * Ataques corpo a corpo ignorando metade da blindagem SP arredondada para cima.
     * Gatilho de Ferimento Crítico quando dois ou mais d6s rolam 6 (aplicando +5 PV de dano bônus).
     * Estados de ferimento: Unhurt, Lightly Wounded, Seriously Wounded (-2) e Mortally Wounded (-4 com Death Saves).
     * Resolução de testes resistidos onde o Defensor vence empates (Core p. 129).
  5. `cpred_netrun_parity_4181.test.mjs`:
     * Orçamento de ações NET por rank de Interface (2 para 1-3, 3 para 4-6, 4 para 7-9, 5 para 10).
     * Interface checks superando o DV (`Total > DV`).
     * Validação estrutural das 6 arquiteturas oficiais do Single Shot Pack (pisos, DVs, ICEs).
     * Safe Jack Out (limpo) vs Unsafe Jack Out (disparando ataques de todos os Black ICEs ativos).
  6. `cpred_world_time_clock_4181.test.mjs`:
     * Avanço determinístico de tempo com cálculo de dias cruzados (1440 min = 1 dia).
     * Cura natural por dias de descanso pleno cruzados (1 dia = BODY PV recuperados para personagem estabilizado).
  7. `cpred_negative_tests_4181.test.mjs`:
     * Rejeição fail-closed de ações desconhecidas (`UNKNOWN_RULE_ACTION`).
     * Rejeição de compra por saldo insuficiente em Eurobucks.
     * Rejeição de venda de itens inexistentes ou equipados no inventário.
  8. `cpred_the_jacket_wallet_4181.test.mjs`:
     * Recibos duráveis com `status: "committed"` e `durable: true`.
     * Reconciliação com `getTransaction` e chave de idempotência.
     * Negação de recompensas com valores divergentes do plano oficial.
  9. `cpred_single_shot_playable_4181.test.mjs`:
     * Promoção dos 10 personagens pré-gerados do Single Shot Pack a fichas 100% jogáveis.
     * Conferência dos atributos, perícias, armas, armaduras e derivadas contra o PDF oficial.
  10. `cpred_economy_cyberware_4181.test.mjs`:
      * 8 categorias canônicas de preço de mercado e alcance por rank de Fixer.
      * Instalação de Cyberware com verificação de pré-requisitos cirúrgicos e perda de humanidade.

---

## 2. Contratos JVM e Testes Nativos

* **Contratos Testados:** `ContractTest.java` e `BarbaraRuntime.kt`:
  - `PhysicalDiceEngine`: Simulação física dos dados 3D importados do Forbidden Lands com projeção das faces correspondentes ao resultado numérico.
  - `GeminiSpeechWire`: Serialização de requisição REST pura para voz cloud, remoção de tags SSML/vocais e decodificação PCM 24kHz.
  - `BraseiroAndroidTtsPolicy`: Política estrita de preservação do pacote Kokoro/Sherpa solicitado (`com.k2fsa.sherpa.onnx.tts.engine` e `.debug`), eliminando qualquer fallback silencioso.
  - `NativeNarrationPlan`: Sequenciamento determinístico de blocos de narração e controle de interrupção imediata via `stop()`.

---

## 3. Preservação de Dados e Atualização sobreposta

* **Identificação de Pacote:** `com.braseiro.cyberpunkred`
* **Version Code:** 4182 (`versionCode = 4182`).
* **Version Name:** 4.1.82 (`versionName = "4.1.82"`).
* **Certificado de Assinatura:**
  - DN: `CN=Braseiro Stable Debug, O=Braseiro, C=BR`
  - SHA-256 Digest: `6aa87a24a2eb4762c3f493c9d5fddbf10b60cc8659a90423aed7cde8ae582bd3`
  - Instalação direta sobre versões anteriores sem perda de dados.
