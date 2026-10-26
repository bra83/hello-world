# Cyberpunk RED R5.81 / 4.1.81 — Evidências Android e Instrumentação

**Data:** 26/10/2026  
**Pacote:** `com.braseiro.cyberpunkred`  
**Versão:** `4.1.81` (build 4181)  

---

## 1. Verificação Criptográfica da Assinatura do APK

* **Arquivo:** `BRASEIRO_CYBERPUNK_RED_4.1.81_ASSINADO.apk`
* **Tamanho:** 266.343.874 bytes (~254 MB)
* **SHA-256 do APK:** `b44ff671c69ae9a27a19d8b4ee83a6bbca0c3147d364d5e64c9dd4ddf0fddbb8`

O APK foi compilado e assinado com a mesma chave canônica das versões anteriores:

```text
Signer #1 certificate DN: CN=Braseiro Stable Debug, O=Braseiro, C=BR
Signer #1 certificate SHA-256 digest: 6aa87a24a2eb4762c3f493c9d5fddbf10b60cc8659a90423aed7cde8ae582bd3
Signer #1 certificate SHA-1 digest: 6f4792781f11edffc892afeb95694e3c03f35cdf
Signer #1 certificate MD5 digest: e02c5846284c002733b8ca6b871d0429
```

Essa correspondência exata garante atualização in-place (instalação sobreposta no Android sem perda de dados locais).

---

## 2. Compilação Local Reproduzível

* **Gradle:** 8.11.1
* **Kotlin:** 2.0.20
* **JVM Launcher:** Temurin / JetBrains JBR 21.0.10
* **Target SDK:** 35 (Android 15)
* **Min SDK:** 26 (Android 8.0 Oreo)
* **Resultado do Build:** `BUILD SUCCESSFUL` (48 actionable tasks executadas com sucesso).

---

## 3. Arquitetura de Persistência e Concorrência

1. **CyberpunkCharacterStore (SQLite):**
   - Tabela canônica `characters`: armazena `id`, `name`, `role`, `updatedAt`, `data` (JSON completo com stats, skills, derived, cyberware, weapons, inventory, campaignState, worldPosition).
   - Bloqueio de concorrência com `canonicalTurnLock` para evitar corridas durante salvamento e despacho de regras.
2. **SecureSecretStore:**
   - Preferências criptografadas para Gemini API Key, preferências de voz (modelo, motor Android/Kokoro, velocidade, pitch).
3. **Rollback de Falha e Idempotência:**
   - Movimentação no Atlas e salvamento de aventura utilizam o padrão de transação atômica verificado nos testes: se o armazenamento do host falha, o estado em memória é restaurado e as coordenadas anteriores no SQLite são preservadas.
4. **Distinção de Testes:**
   - Testes unitários (294/294), contratos JVM e compilação do APK foram 100% executados e aprovados.
   - Teste no aparelho físico Samsung Galaxy A57 permanece demarcado como `NOT_TESTED (físico pendente de validação do usuário)`, conforme instrução estrita da ordem mestra.
