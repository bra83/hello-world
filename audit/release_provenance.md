# Proveniência da Release e Checklist de Fechamento — Cyberpunk RED 4.1.81

**Data da Auditoria:** 26/10/2026  
**Repositório Ativo:** `https://github.com/bra83/hello-world`  
**Branch:** `audit/cpred-r581-rules-parity` (criada a partir de `f4fdca25b36cc4839961cfd9c9781c511add0e26`)  
**Versão:** `versionName = "4.1.81"`, `versionCode = 4181`  

---

## 1. Artefatos de Entrega

| Arquivo | Descrição | SHA-256 | Tamanho |
| :--- | :--- | :--- | :--- |
| `BRASEIRO_CYBERPUNK_RED_4.1.81_ASSINADO.apk` | APK compilado e assinado com o certificado canônico `6aa87a24a2eb...`, pronto para instalação sobreposta sem perda de dados. | `b44ff671c69ae9a27a19d8b4ee83a6bbca0c3147d364d5e64c9dd4ddf0fddbb8` | 266.34 MB |
| `CYBERPUNK_RED_4.1.81_ANDROID_SOURCE.zip` | Código-fonte Android completo, auditado e reproduzível (inclui `android/` com `local.properties.example`, wheel Python, assets web e classes Kotlin). | `79960c868a5af068bc649c11619a8dfef35eb48bcfe8866e2402b54582c5cbb0` | 205.53 MB |
| `audit/rules_matrix.csv` | Matriz detalhada com 83 regras auditadas contra os livros oficiais (R01 a R14), fórmulas esperadas, caminhos de código e testes. | — | 46.8 KB |
| `audit/sources_manifest.md` | Manifesto dos 48 arquivos PDF locais (Core v1.25, erratas e suplementos). | — | 9.5 KB |
| `audit/source_mapping.md` | Mapeamento das regras oficiais aos símbolos de código e chamadores UI. | — | 10.3 KB |
| `audit/regressions.md` | Relatório dos 294 testes Node, contratos JVM e correções de call graph. | — | 5.0 KB |
| `audit/android_evidence.md` | Evidências da compilação Android, verificação criptográfica e persistência SQLite. | — | 2.5 KB |

---

## 2. Checklist dos 12 Gates de Aceite

- [x] **Gate A. Baseline:** Ponto de partida congelado no commit `f4fdca25b36cc4839961cfd9c9781c511add0e26`, preservando todas as capacidades existentes da 4.1.80.
- [x] **Gate B. Paridade Core:** Cada regra contratada possui livro/página/errata e expectativa independente documentada na matriz.
- [x] **Gate C. Integração:** Ações de `CYBERPUNK_RULE_ACTIONS` possuem caminho de resolução real em Kotlin (`resolveAdventureRuleAction`) e JS (`CyberpunkRulesAdapter`), sem stubs estáticos ou timeout artificial de 80ms.
- [x] **Gate D. Combate:** Iniciativa, dano, SP, ablação, ferimentos críticos, wound states e munição calculados conforme regras canônicas do Core Book v1.25.
- [x] **Gate E. Netrunning:** 6 arquiteturas do Single Shot Pack, turnos, ações por Interface Rank e combate contra Black ICE funcionais.
- [x] **Gate F. Roles e Fichas:** 10 Roles auditadas e 10 pregens do Single Shot Pack totalmente jogáveis com fichas web completas.
- [x] **Gate G. Cyberware e Economia:** Slots, cirurgias, perda de humanidade, 8 faixas de preço e transações idempotentes com carteira nativa.
- [x] **Gate H. Mundo e Aventura:** 18 módulos em `index.json`, eventos, ramificações, segredos selados e relógio de mundo preservados.
- [x] **Gate I. Complementos:** Suplementos (Black Chrome, Interface RED, Danger Gal, Elflines, CEMK) auditados com escopo mecânico estritamente isolado.
- [x] **Gate J. Regressão:** TTS Kokoro sem substituição silenciosa, Gemini REST, dados 3D Forbidden Lands, escolhas sugeridas e imagem de cena acima da narração preservados.
- [x] **Gate K. Persistência:** Reaberturas, atomicidade em falhas de gravação e rollback no SQLite testados e validados.
- [x] **Gate L. Distribuição:** Código Android completo e APK assinado com `versionCode 4181` e certificado SHA-256 `6aa87a24a2eb...`.
