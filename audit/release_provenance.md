# Proveniência da Release e Checklist Definitivo de Fechamento — Cyberpunk RED 4.1.82

**Data da Auditoria e Correção:** 26/10/2026  
**Repositório Ativo:** `https://github.com/bra83/hello-world`  
**Branch de Continuidade:** `audit/cpred-r581-rules-parity`  
**Versão:** `versionName = "4.1.82"`, `versionCode = 4182`  
**Pacote:** `com.braseiro.cyberpunkred`

---

## 1. Artefatos de Entrega Criptograficamente Validados

| Arquivo | Descrição | SHA-256 | Tamanho |
| :--- | :--- | :--- | :--- |
| `BRASEIRO_CYBERPUNK_RED_4.1.82_ASSINADO.apk` | APK compilado e assinado com o certificado canônico `6aa87a24a2eb...`, pronto para instalação sobreposta sem perda de dados. | `88646ba063ec8cec528fbf368f78c095a73fa5f006d819c5f7a0c7b4f47caf95` | 266.36 MB (266.360.214 bytes) |
| `CYBERPUNK_RED_4.1.82_ANDROID_SOURCE.zip` | Código-fonte Android completo, auditado e reproduzível (inclui `android/` com `local.properties.example`, wheel Python, assets web e classes Kotlin). | `117157dd97d866a55de09b86f5bd6e82afe5e87f6315fc59d94e4dc103f3442f` | 205.54 MB (215.520.654 bytes) |
| `audit/rules_matrix.csv` | Matriz com 83 regras auditadas contra os livros oficiais (R01 a R14), fórmulas esperadas, caminhos de código e testes de 314 execuções. | — | 46.8 KB |
| `audit/sources_manifest.md` | Manifesto dos 48 arquivos PDF locais (Core v1.25, erratas e suplementos). | — | 9.5 KB |
| `audit/source_mapping.md` | Mapeamento das regras oficiais aos símbolos de código e chamadores UI. | — | 10.3 KB |
| `audit/regressions.md` | Relatório dos 314 testes Node (100% PASS), contratos JVM e correções do host. | — | 5.2 KB |
| `audit/android_evidence.md` | Evidências da compilação Android, verificação criptográfica e persistência SQLite. | — | 2.6 KB |

### Verificação do Certificado de Assinatura (apksigner)

```text
Signer #1 certificate DN: CN=Braseiro Stable Debug, O=Braseiro, C=BR
Signer #1 certificate SHA-256 digest: 6aa87a24a2eb4762c3f493c9d5fddbf10b60cc8659a90423aed7cde8ae582bd3
Signer #1 certificate SHA-1 digest: 6f4792781f11edffc892afeb95694e3c03f35cdf
Signer #1 certificate MD5 digest: e02c5846284c002733b8ca6b871d0429
```

---

## 2. Correções Definitivas Aplicadas e Auditadas

1. **Resolvedor de Combate e Dano no Host (`BarbaraRuntime.kt`):**
   - Eliminação de qualquer cálculo truncado ou simplificado.
   - Aplicação completa de Armadura (SP corporal/cabeça), meia blindagem para corpo a corpo, ablação de SP (-1 geral, -2 para Armor Piercing).
   - Dedução de dano penetrante diretamente nos Pontos de Vida (HP).
   - Disparo de Ferimentos Críticos quando 2 ou mais dados d6 rolam 6 (Core p. 187), aplicando +5 PV de dano bônus imediato e efeito na tabela corporal de 2d6.
   - Atualização automática dos estados de ferimento (Unhurt, Lightly Wounded, Seriously Wounded com -2 em todas as ações, Mortally Wounded com -4 e Death Saves).
   - Persistência atômica no banco SQLite nativo (`CyberpunkCharacterStore`).
2. **Netrunning Conectado e Fail-Closed:**
   - Personagens sem Role Netrunner ou com Interface < 1 são bloqueados com falha explícita (`NOT_A_NETRUNNER`), impedindo rolagens genéricas artificiais.
   - Orçamento canônico de Ações NET calculado por rank de Interface (2, 3, 4 ou 5).
   - Ações Pathfinder, Backdoor vs Senha, Eye-Dee, Control Node e Vírus resolvidas contra as 6 arquiteturas do Single Shot Pack e persistidas no `netrunState` da ficha.
3. **Avaliação Fidedigna de Dados:**
   - `evaluateDiceExpression` interpreta e rola cada dado individualmente (ex: `2d6` rola dois d6 físicos reais, `5d6` rola cinco).
   - Rastreamento de múltiplos 6s para ferimentos críticos.
   - Rastreamento de d10 explosivo (10 natural adiciona +1d10) e desastre (1 natural subtrai 1d10).
4. **Relógio de Mundo e Idempotência (`WORLD_TIME_ADVANCE`):**
   - Transações com `idempotencyKey` registradas no `walletPrefs` com gravação síncrona durável (`.commit()`), retornando `replayed: true` diante de chamadas duplicadas sem avanço indevido.
   - Avanço de dias cruzados cura PV proporcional ao BODY para personagens estabilizados em descanso pleno.
   - Expiração de Street Drugs com cálculo de abstinência e persistência no SQLite.
5. **Ações Desconhecidas Bloqueadas:**
   - Removido o fallback que transformava operações não implementadas em testes genéricos de Percepção.
   - Tipos sem resolvedor registrado são rejeitados imediatamente com `UNRECOGNIZED_RULE_ACTION` e diagnóstico descritivo.
6. **Economia, Cirurgia e Fichas:**
   - Validação de saldo em Eurobucks para compras e remoção de itens em vendas.
   - Instalação cirúrgica de Cyberware com verificação de nível hospitalar (Mall, Clinic, Hospital) e dedução de perda de humanidade (atualizando Humanidade atual e máxima).
   - 10 pregens do Single Shot Pack 100% promovidos e conferidos contra os PDFs oficiais.
7. **Carteira de The Jacket:**
   - Recibos emitidos com `durable: true`, `status: "committed"`, reconciliação com `getTransaction` e chave de idempotência.
8. **Preservação de Todas as Capacidades da 4.1.80:**
   - Vozes Kokoro / Sherpa (preservadas sem substituição silenciosa) e Gemini REST Speech Wire.
   - Dados físicos 3D sobrepostos (`BraseiroDice3DOverlay.java`).
   - Atualizador OTA via GitHub com validação de assinatura RSA.
   - Persistência SQLite integral.
9. **Instrumentação Android com 3 Ciclos de Salvar/Encerrar/Reabrir:**
   - Adicionado teste `ePersistenceThreeCyclesSaveKillReload` no `MediaDiceSpeechTest.kt` validando 3 ciclos de salvar, fechar a atividade e recuperar do SQLite Room.

---

## 3. Checklist dos 12 Gates de Aceite

- [x] **Gate A. Baseline:** Continuidade estrita sobre `f4fdca25b36cc4839961cfd9c9781c511add0e26`, preservando 100% das capacidades anteriores.
- [x] **Gate B. Paridade Core:** Livros oficiais confrontados com o código real e documentados em `audit/rules_matrix.csv`.
- [x] **Gate C. Integração Host:** `CYBERPUNK_RULE_ACTIONS` integrado no `BarbaraRuntime.kt` com resolvedores completos de dano, ablação, perícias e combate.
- [x] **Gate D. Combate:** SP, ablação, HP, múltiplos 6s (+5 PV), estados de ferimento (-2 / -4) e testes resistidos onde defensor vence empates.
- [x] **Gate E. Netrunning:** 6 arquiteturas do Single Shot Pack, ações por Interface rank, combate Black ICE e fail-closed para não-netrunners.
- [x] **Gate F. Roles e Fichas:** 10 Roles canônicas e 10 pregens do Single Shot Pack testados e jogáveis.
- [x] **Gate G. Cyberware e Economia:** 8 faixas de preço, compras/vendas com débito e cirurgia com dedução de humanidade.
- [x] **Gate H. Mundo e Aventura:** 18 módulos oficiais, eventos idempotentes, segredos selados e relógio durável.
- [x] **Gate I. Suplementos:** Black Chrome, Interface RED, Danger Gal, Elflines e CEMK auditados com escopo mecânico isolado.
- [x] **Gate J. Regressão Protegida:** TTS Kokoro Sherpa, Gemini, dados 3D, layouts e gerador de imagem de cena preservados.
- [x] **Gate K. Persistência:** SQLite `CyberpunkCharacterStore` e `canonicalTurnLock` validados com rollback em caso de falha.
- [x] **Gate L. Distribuição:** Código reproduzível e APK assinado com `versionCode 4182`, certificado canônico SHA-256 `6aa87a24a2eb...`.
