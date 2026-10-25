# Cyberpunk RED 4.1.73 — navegação mobile

Base: `91934c15ccb61fd178398892a4ec1baf5da4b992` e fonte Android publicada com SHA-256 `7c0735fdf0c24f107dd878cfd5332caf4424c1148ab975be582ea7417d3d2c24`.

## Problema corrigido

O observador de `syncHomeMeta` monitorava toda a árvore de `#tab-table` e escrevia incondicionalmente no `textContent` de um descendente da mesma árvore. Cada callback criava outra mutação, impedindo o navegador de processar o próximo frame/toque. Agora observa somente os dois rótulos de origem e só atualiza o destino se seu conteúdo mudou.

O bootstrap anterior declarava funções `async`, mas executava chamadas síncronas a `AndroidBarbara` antes de devolver a Promise. Agora envia requisições curtas com IDs, executa o trabalho em threads Android e resolve cada resposta por callback na WebView. A fila de download fica separada; consultas de rede não seguram o lock de estado. A ativação do pacote continua protegida pelo lock existente.

Erros operacionais após o boot não abrem mais a tela de falha de inicialização. A navegação de combate não substitui nem desloca a barra principal.

## Interface

Referência estrutural e visual: `bra83/braseirobuild`, branch `codex/star-wars-hibrido-integral-20261016`, `star-wars/r54/source/app/src/main/assets/vtt/{index.html,styles.css}`. Cards escuros, hierarquia cena → ação e configurações separadas, adaptados à identidade Cyberpunk.

- Cabeçalho compacto e barra inferior consistente: Cena, Ficha, Mapa, Combate e Menu.
- Narração e ação livre em destaque. Configuração de aventura, importação e estados adicionais recolhíveis.
- Atalhos, ficha, mochila, NET, veículos, biblioteca e ajustes mantêm os controles existentes.
- Atualizador e pacote manual ficam em Ajustes. Nenhum motor, regra ou conteúdo foi substituído.
- Layout verificado em 360, 412 e 768 pixels de largura.

## Reprodução e aplicação

```sh
python cyberpunk-red/mobile-r573/apply.py /caminho/da/fonte/android
cd /caminho/da/fonte/android
./gradlew assembleDebug
```

O overlay contém somente os arquivos alterados. O instalador exige uma base compatível e preserva os demais arquivos. A compilação do workflow recupera e verifica o ZIP original antes de aplicar o overlay.

## Validação

- Suíte de regras existente: 294 testes aprovados localmente.
- Playwright: cliques reais em todas as áreas, repetidos; ajuda, bandeja de dados, importação, callback assíncrono, recuperação de erro e heartbeat depois de atualizar os rótulos observados.
- O workflow compila o APK e executa toques no Android WebView, verifica os eventos de navegação, captura telas e testa reabertura. A publicação do APK depende desses passos passarem.
- A execução local em navegador usa fallback web explícito; não é apresentada como teste do motor Android. O teste Android é uma etapa separada.
- A homologação no Galaxy físico continua necessária. O relato do usuário não veio acompanhado de logcat/ANR do aparelho; não se afirma que todo possível travamento específico dele foi reproduzido.
