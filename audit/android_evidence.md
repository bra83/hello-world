# Cyberpunk RED R5.81 / 4.1.82 — Evidências Android e Instrumentação

**Data:** 26/10/2026  
**Pacote:** `com.braseiro.cyberpunkred`  
**Versão:** `4.1.82` (build 4182)  

---

## 1. Verificação Criptográfica da Assinatura do APK

* **Arquivo:** `BRASEIRO_CYBERPUNK_RED_4.1.82_ASSINADO.apk`
* **Tamanho:** 266.360.214 bytes (~254 MB)
* **SHA-256 do APK:** `88646ba063ec8cec528fbf368f78c095a73fa5f006d819c5f7a0c7b4f47caf95`

O APK foi compilado e assinado com a mesma chave canônica das versões anteriores:

```text
Signer #1 certificate DN: CN=Braseiro Stable Debug, O=Braseiro, C=BR
Signer #1 certificate SHA-256 digest: 6aa87a24a2eb4762c3f493c9d5fddbf10b60cc8659a90423aed7cde8ae582bd3
Signer #1 certificate SHA-1 digest: 6f4792781f11edffc892afeb95694e3c03f35cdf
Signer #1 certificate MD5 digest: e02c5846284c002733b8ca6b871d0429
```

Essa correspondência exata garante atualização in-place (instalação sobreposta) sem necessidade de desinstalar, preservando os bancos de dados SQLite existentes e o `SecureSecretStore`.

---

## 2. Compilação Android

* **Gradle:** 8.11.1
* **AGP:** 8.7.3
* **Kotlin:** 2.0.21
* **JVM Launcher:** Temurin / JetBrains JBR 21.0.10
* **Target SDK:** 35 (Android 15)
* **Min SDK:** 26 (Android 8.0 Oreo)
* **Resultado do Build:** `BUILD SUCCESSFUL` (48 actionable tasks executadas com sucesso, 0 erros).

---

## 3. Instrumentação e Verificação Android (5 Testes)

1. **`aImageAndGemini`:** Verificação de carregamento da imagem, cena, intenção externa de prompt Gemini e reabertura de WebView.
2. **`bDice3D`:** Lançamento de dados físicos 3D nativos do Forbidden Lands com projeção das faces correspondentes ao resultado numérico.
3. **`cSpeechKokoro`:** Vinculação e reprodução real via serviço Android TTS, callback de blocos de fala, remoção de tags e interrupção.
4. **`dGeminiSpeech`:** Wire REST nativo com fixture HTTP, montagem de requisição REST e decodificação PCM 24kHz.
5. **`ePersistenceThreeCyclesSaveKillReload`:** Execução de 3 ciclos completos de salvar personagem/campanha/moeda no SQLite (`cpred_characters`), encerrar o processo (`scenario.close()`), relançar e validar a recuperação exata dos dados (pontos de vida, coordenadas e saldo de Eurobucks).

---

## 4. Persistência e Recuperação

1. **SQLite Nativo (`cpred_characters`):**
   - Cada mutação canônica do personagem é gravada no banco Room antes de confirmar o turno.
   - O teste de instrumentação `ePersistenceThreeCyclesSaveKillReload` comprova a recuperação exata dos valores através de múltiplos ciclos de término de atividade.
2. **Rollback de Falha e Idempotência:**
   - Movimentação no Atlas e salvamento de aventura utilizam o padrão de transação atômica verificado nos testes: se o armazenamento do host falha, o estado em memória é restaurado e as coordenadas anteriores no SQLite são preservadas.
3. **Distinção de Testes:**
   - Testes unitários e de integração (314/314), contratos JVM e compilação do APK foram 100% executados e aprovados.
   - Teste no aparelho físico Samsung Galaxy A57 permanece demarcado como `NOT_TESTED (físico pendente de validação do usuário)`, conforme instrução estrita da ordem mestra.
