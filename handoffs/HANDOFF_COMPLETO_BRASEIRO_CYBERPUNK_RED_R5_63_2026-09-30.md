# HANDOFF COMPLETO — BRASEIRO CYBERPUNK RED VTT

**Data do handoff:** 2026-09-30  
**Projeto:** Braseiro Cyberpunk RED  
**Plataforma:** Android + WebView (HTML/CSS/JS) + bridges Kotlin/Java + Motor Bárbara/Python  
**Idioma obrigatório:** PT-BR

## 0. LEIA ISTO PRIMEIRO

NÃO recrie o projeto do zero.

NÃO volte para checkpoints antigos.

NÃO considere o build mais recente "final" apenas porque compila.

O checkpoint canônico mais recente é **R5.63 / Android 4.1.63 (versionCode 4163)**, porém o teste posterior em aparelho Samsung real revelou bugs que **ainda precisam ser corrigidos**.

A nova plataforma deve baixar o R5.63, tratá-lo como baseline, preservar Motor Bárbara, Mundo Vivo, regras, dados, persistência, mapa, catálogo, combate, NET e bridges existentes, corrigir as pendências reais deste handoff, manter o concept como autoridade visual e testar em Android real antes de declarar fechamento.

---

# 1. ÚLTIMA BUILD / CHECKPOINT — NÃO ERRAR

## Checkpoint fonte canônico

`CYBERPUNK_RED_R5_63_CONCEPT_PIXELMATCH_CHECKPOINT.zip`

SHA-256:

`eb647c9a89e6d86f6ee3948f8b41dcaa2fc789fa94b0e14e908a520aae20710e`

Tamanho aproximado: 209 MiB.

## APK correspondente

`BRASEIRO-CYBERPUNK-RED-R5.63-DEBUG.apk`

Package:

`com.braseiro.cyberpunkred`

versionCode:

`4163`

versionName:

`4.1.63`

SHA-256:

`a970444e17b3ed17e6a9e4191f6d4d0afc6d6592aa2eb12325c7971a7e66fd05`

## Composição

Baseline usada:

`CYBERPUNK_RED_R5_49_REAL_DEVICE_FIX_CHECKPOINT.zip`

SHA-256 da baseline:

`a47e6c46ac3683d85eacda58f083aef308ddcb737ceb28fd39b42f579ee1577a`

Overlay visual R5.63 SHA-256:

`9c331093898cd0ef20fadcb2f34552794e891fd5c5b2d9e7aa456f2185ed094e`

---

# 2. PROJETO / CHECKPOINT NO GITHUB

O R5.63 **NÃO foi publicado como Release**, propositalmente, porque o usuário proibiu Release antes da aprovação visual/física.

## Run que gerou o R5.63

https://github.com/bra83/hello-world/actions/runs/35555964569

## Artifact do projeto

Nome:

`cyberpunk-red-r5.63-concept-pixelmatch`

Link:

https://github.com/bra83/hello-world/actions/runs/35555964569/artifacts/10620761117

Dentro dele estão:

- `CYBERPUNK_RED_R5_63_CONCEPT_PIXELMATCH_CHECKPOINT.zip`
- `CYBERPUNK_RED_R5_63_CONCEPT_PIXELMATCH_CHECKPOINT.zip.sha256`
- `BRASEIRO-CYBERPUNK-RED-R5.63-DEBUG.apk`
- `BRASEIRO-CYBERPUNK-RED-R5.63-DEBUG.apk.sha256`
- badging/assinatura;
- screenshots Android;
- logs;
- evidências de gate.

Digest SHA-256 do artifact/container GitHub:

`43be7c355fee4ad40d8b9498c184986e64dbf837e1647a7ec7c87f103bf04ab8`

## Artifact de revisão visual

Nome:

`cyberpunk-red-r5.63-visual-review`

Link:

https://github.com/bra83/hello-world/actions/runs/35555964569/artifacts/10620910832

Digest:

`a0ff2c87a370705307d071a61d3ac74ff2a620d70ba36d047bd363e24d6cd0a0`

---

# 3. BACKUP DIVIDIDO DO CHECKPOINT

Run de exportação:

https://github.com/bra83/hello-world/actions/runs/36688216172

## part00

Artifact:

https://github.com/bra83/hello-world/actions/runs/36688216172/artifacts/11084626777

Arquivo interno:

`CYBERPUNK_RED_R5_63_CONCEPT_PIXELMATCH_CHECKPOINT.zip.part00`

SHA-256:

`fc70153e1794d8da60e1604962e2cef1178617ee18f895e852bf3d1f0126c514`

## part01

Artifact:

https://github.com/bra83/hello-world/actions/runs/36688216172/artifacts/11084072469

Arquivo interno:

`CYBERPUNK_RED_R5_63_CONCEPT_PIXELMATCH_CHECKPOINT.zip.part01`

SHA-256:

`d9c636ed21bbca0d57a7340cc2c3c4d411401259444d136f43b7e4804fa8adf5`

## part02

Artifact:

https://github.com/bra83/hello-world/actions/runs/36688216172/artifacts/11084327045

Arquivo interno:

`CYBERPUNK_RED_R5_63_CONCEPT_PIXELMATCH_CHECKPOINT.zip.part02`

SHA-256:

`477a82d51b9c1c7662f7e8b91e95a539f45b3e56e86a18c958c30c8b03c62013`

## hashes

https://github.com/bra83/hello-world/actions/runs/36688216172/artifacts/11084367100

Os artifacts dessa exportação foram configurados com retenção de 90 dias.

## Recomposição no Windows PowerShell

```powershell
$out = [System.IO.File]::Create("CYBERPUNK_RED_R5_63_CONCEPT_PIXELMATCH_CHECKPOINT.zip")
foreach ($name in @(
  "CYBERPUNK_RED_R5_63_CONCEPT_PIXELMATCH_CHECKPOINT.zip.part00",
  "CYBERPUNK_RED_R5_63_CONCEPT_PIXELMATCH_CHECKPOINT.zip.part01",
  "CYBERPUNK_RED_R5_63_CONCEPT_PIXELMATCH_CHECKPOINT.zip.part02"
)) {
  $input = [System.IO.File]::OpenRead($name)
  $input.CopyTo($out)
  $input.Dispose()
}
$out.Dispose()
```

Valide:

```powershell
(Get-FileHash .\CYBERPUNK_RED_R5_63_CONCEPT_PIXELMATCH_CHECKPOINT.zip -Algorithm SHA256).Hash.ToLower()
```

Resultado obrigatório:

`eb647c9a89e6d86f6ee3948f8b41dcaa2fc789fa94b0e14e908a520aae20710e`

---

# 4. GOOGLE DRIVE — MATERIAIS CYBERPUNK RED

## Pasta raiz de materiais

https://drive.google.com/drive/folders/1nEIvLGACIQNoOYPQEuSQbutz8F8fhCkR

ID:

`1nEIvLGACIQNoOYPQEuSQbutz8F8fhCkR`

Essa é a fonte de materiais Cyberpunk RED: livros, PDFs, mapas, suplementos, Interface RED, Screamsheets, Edgerunners Mission Kit, Data Pack, Netrunning Deck etc.

## Pasta downloads

https://drive.google.com/drive/folders/1LOkqgP8cdx8zKMghOm6zr9B1BQuV3n5K

ID:

`1LOkqgP8cdx8zKMghOm6zr9B1BQuV3n5K`

Contém downloads, checkpoints antigos, auditorias, ZIPs e assets.

## Raspagem de assets

Arquivo:

`CYBERPUNK_RED_WEB_ASSETS_RAW_DO_NOT_INGEST.zip`

Link:

https://drive.google.com/file/d/14SuimGODUqQL27_YvGgc98YYRyzA1RGS/view?usp=drivesdk

ID:

`14SuimGODUqQL27_YvGgc98YYRyzA1RGS`

O nome RAW_DO_NOT_INGEST é proposital: usar como fonte de curadoria, nunca despejar automaticamente no runtime.

---

# 5. REPOSITÓRIOS / INFRA

Principal historicamente usado para build:

`bra83/braseirobuild`

https://github.com/bra83/braseirobuild

Worker usado para R5.63:

`bra83/hello-world`

https://github.com/bra83/hello-world

Não confundir o worker com o projeto. O projeto canônico está no checkpoint R5.63.

O workflow atual do repo `hello-world` foi alterado posteriormente para exportação/handoff. Portanto NÃO usar o HEAD atual do workflow como fonte do app. Baixar o checkpoint R5.63.

---

# 6. BUILD VERIFICADO DO R5.63

No CI/emulador:

- arquitetura de interface: PASS;
- JSON/assets gate: PASS;
- Core items: 123/123;
- runtime weapons: 155/155;
- Gradle resources: PASS;
- Kotlin: PASS;
- Java: PASS;
- assembleDebug: PASS;
- APK badging: PASS;
- APK signature: PASS;
- instalação emulator: PASS;
- launch: PASS;
- navegação emulator: PASS;
- screenshots: PASS;
- gate de paleta: PASS;
- checkpoint: PASS;
- artifact: PASS.

Package registrado:

`com.braseiro.cyberpunkred / 4163 / 4.1.63`

Gate de paleta:

`hot_pink_ratio = 0.00011154289004029937`

limite:

`0.020000`

RMSE automáticos:

- SESSÃO ~43.42
- FICHA ~46.19
- MAPA ~53.58
- MAIS ~115.78

Essas métricas NÃO significam aprovação humana final.

---

# 7. ESTADO REAL NO SAMSUNG — R5.63 NÃO É FINAL

Depois do PASS em CI/emulador, o usuário testou no aparelho físico e confirmou problemas.

## P0 — scroll da Sessão travado

A tela não sobe nem desce.

Revisar:

- html/body;
- container principal;
- overflow-y;
- height/min-height;
- 100vh/100dvh;
- fixed/sticky;
- bottom nav;
- touch interception;
- preventDefault;
- WebView overscroll;
- camadas transparentes por cima do conteúdo.

Gate final precisa ser em aparelho físico.

## P0 — menu/configuração Gemini não abre

A UI mostra:

`GEMINI • VERIFICANDO`

mas o usuário não consegue abrir o menu/configuração de forma confiável.

Gemini físico = NÃO APROVADO.

## P0 — bridge consumeSharedImage

Erro real mostrado no aparelho:

`Error invoking consumeSharedImage: Java bridge method can't be invoked on a non-injected object`

Investigar:

- addJavascriptInterface;
- nome da bridge;
- lifecycle da WebView;
- reload;
- onNewIntent;
- consumeSharedImage;
- compartilhamento de imagem do Gemini;
- objeto chamado vs objeto injetado;
- @JavascriptInterface.

Não mascarar.

## P0 — UI ainda confusa

O usuário considera a tela ainda confusa. O concept é autoridade e deve ser copiado mais literalmente.

---

# 8. CONCEPT VISUAL — AUTORIDADE

Linguagem:

- fundo preto/azul-preto;
- cards escuros;
- bordas finas;
- vermelho principal;
- ciano secundário;
- branco/cinza para texto;
- quase nenhum magenta;
- botões escuros/outline;
- bottom nav baixa;
- header compacto;
- alto aproveitamento vertical;
- UI HTML/CSS, sem imagens decorativas estruturais.

Telas do concept:

## Início

Logo Cyberpunk RED, Night City/2045, Continuar, Nova Sessão, Street Stories, Mapa, Equipe, Mochila, Banco de Dados, bottom nav.

## Ficha

Retrato circular, nome/função, tabs, atributos em grid, PV, PE, Humanidade, função/detalhes.

## Mapa

Tabs Night City/Distritos/Pontos/Rotas, mapa, distritos, marcador atual, card do local, zoom discreto.

## Trabalho

Nome, risco, descrição, cliente, local, pagamento, tipo, tempo, objetivos, iniciar.

## Mochila

Tabs Todos/Armas/Equipamento/Consumíveis, lista compacta, ícone, nome, categoria, quantidade, menu.

## Combate

Tabs Turno/Ações/Dano/Condições, iniciativa, ações rápidas: atacar/mirar/esquivar/ajuda.

## NET

Arquitetura/Programas/Ações, nós e defesa ativa.

## Veículo

Nome/modelo, velocidade, manobra, blindagem, passageiros, ações.

## Menu

Diário, NPCs, Locais, Regras, Configurações, Exportar Dados, Sair.

---

# 9. NAVEGAÇÃO DEFINIDA

Bottom nav persistente:

`SESSÃO | MUNDO | MAPA | FICHA | MAIS`

Compacta, baixa e respeitando insets Android.

Dentro de MAIS:

- Mochila/Inventário;
- Biblioteca;
- Street Stories/Trabalhos;
- Combate;
- NET;
- Veículo;
- Configurações;
- Gemini;
- Áudio/TTS;
- Importar/Exportar;
- Diagnóstico quando necessário.

Mundo Vivo tem tela própria.

Biblioteca tem tela própria.

Mapa e Ficha têm telas próprias.

---

# 10. SESSÃO — ORDEM VERTICAL OBRIGATÓRIA

1. **Mundo Vivo resumo** — dia, hora, clima, local, distrito, pressão/risco e sinais relevantes.
2. **NPCs presentes** — retrato/token, nome, papel/facção conhecida, condição observável.
3. **Imagem da cena** — 16:9, persistente, gerar prompt, abrir Gemini, importar.
4. **Texto do Mestre** — resposta real do Motor Bárbara/provider; PT-BR natural; sem prompt/JSON/fallback falso.
5. **Estado contextual do personagem** — PV, SP, Sorte, munição, condições, sem duplicar a Ficha.
6. **Ações sugeridas** — 3–5 escolhas opcionais.
7. **Ação livre** — campo livre + enviar ao Mestre.
8. **Controles** — gerar imagem, Gemini, importar, TTS Gemini, Android TTS, parar, repetir, Biblioteca.
9. **Painel de teste** — só quando necessário.

---

# 11. REGRA DE IMAGENS

## Cena

Prompt -> abrir Gemini -> gerar -> compartilhar/importar -> persistir na cena.

## Personagem

Retrato/token gerado uma vez, amarrado ao personagem e persistente.

## NPC

Retrato amarrado ao ID do NPC. Nunca reutilizar para outro NPC. Persistir.

## Veículo

Pode usar mecanismo semelhante à cena se houver uso visual relevante, amarrado ao veículo.

## Equipamentos

REGRA RÍGIDA:

- equipamento precisa de asset;
- não usar página do manual;
- não usar FONTE OFICIAL;
- não usar app_icon;
- não usar foto aleatória de outra arma;
- não usar pessoa inteira como armadura;
- não inventar arte oficial falsa;
- sem arte nominal confiável -> ícone semântico honesto.

---

# 12. ASSETS — ESTADO R5.63

Gates:

- 123/123 Core items;
- 155/155 armas runtime.

Distribuição:

- Core 16;
- Black Chrome 55;
- Interface RED Vol.5 / Toggle Temple 72;
- Gunmas / Interface RED Vol.2 12.

Isso comprova caminhos/integridade no build, NÃO aprovação visual humana de cada asset.

---

# 13. GEMINI / MOTOR BÁRBARA

O usuário quer texto REAL do Gemini/Motor Bárbara.

É proibido mascarar falha com texto local/genérico.

Se veio do provider, mostrar como Mestre.

Se falhou:

- mostrar falha real;
- mensagem compreensível;
- não inventar narrativa;
- não fingir Gemini.

Estado deve diferenciar:

- sem chave;
- chave salva;
- verificando;
- provider ativo;
- provider falhou.

Chave/modelo precisam persistir após restart.

Troca de chave/modelo deve reinicializar runtime/provider.

R5.63 físico: NÃO APROVADO.

---

# 14. TTS / ÁUDIO

Detectar engines Android TextToSpeech dinamicamente.

Backends Kokoro:

`com.k2fsa.sherpa.onnx.tts.engine.debug`

`com.k2fsa.sherpa.onnx.tts.engine`

Label:

`Braseiro Kokoro PT-BR · neural`

O VTT:

- NÃO acessa Android/data;
- NÃO copia model.onnx;
- NÃO copia voices.bin;
- NÃO embute modelo;
- NÃO usa com.braseiro.kokoro.ptbr.

Listar somente vozes reais de TextToSpeech.voices.

Samsung TTS deve aparecer se instalado.

Texto longo:

- não cortar palavra;
- não cortar frase;
- não parar no primeiro bloco;
- continuar até o fim;
- sem pausas enormes;
- respeitar velocidade;
- parar corretamente.

Cortes: . ! ? -> ; , -> espaço.

Usar QUEUE_ADD e avançar em onDone real.

Na Sessão manter:

- Ouvir Gemini;
- Ouvir Android;
- Parar.

---

# 15. MUNDO VIVO

Referência de engenharia:

**Braseiro D&D 6.6.2 RUN104**

Adaptar ao Cyberpunk RED.

Preservar:

- NPC memória;
- relações;
- objetivos;
- rotina;
- localização;
- riqueza/economia;
- risco/morte;
- facções/diplomacia;
- consequências off-screen;
- clima;
- relógio;
- rumores;
- persistência;
- integração com Mestre.

Sessão mostra resumo perceptível.

Aba MUNDO mostra detalhe.

---

# 16. BIBLIOTECA / REGRAS

Biblioteca local com índice/RAG em tela própria.

Serve para consulta/busca/fonte.

Mecânica já implementada no runtime NÃO deve virar dependente exclusivamente de RAG.

Não apagar implementação permanente existente.

---

# 17. MAPA

Já existe Atlas/Mapa Night City.

Preservar:

- distritos;
- POIs;
- localização;
- rotas;
- zoom/pan;
- estado atual;
- seleção de local.

Visual: escuro, limites vermelhos, marcador ciano, tabs compactas e card do local.

---

# 18. ANDROID / ESTRUTURA

Raiz Android:

`android/`

Web UI:

`android/app/src/main/assets/web/app/`

Arquivos-chave:

- index.html
- styles.css
- interface_v2.css
- app.js
- sheets.js
- gameplay.js
- atlas.js
- audio.js
- netrun.js
- JSONs
- assets

Código Android:

`android/app/src/main/java/com/braseiro/cyberpunkred/`

Motor Bárbara integrado por Chaquopy/wheel.

Build:

Java 17, compileSdk 36.

```bash
./gradlew :app:processDebugMainManifest :app:processDebugResources --no-daemon --stacktrace
./gradlew :app:compileDebugKotlin :app:compileDebugJavaWithJavac --no-daemon --stacktrace
./gradlew :app:assembleDebug --no-daemon --stacktrace
```

Não remover Chaquopy/Motor Bárbara para fazer build passar.

---

# 19. BUGS ANTIGOS — NÃO REINTRODUZIR

- UI sob barras Android.
- Scroll travado.
- Chave/modelo salvos mas provider null.
- Texto genérico mascarando Gemini.
- FONTE OFICIAL/página de manual/app icon como item.
- Fotos de pessoas como armadura.
- Arma genérica repetida.
- Dados 3D estranhos.
- Invalid or unexpected token.
- Cannot set properties of null (setting 'onclick').

---

# 20. TESTE DO PIPELINE DE IMAGEM

Fluxo obrigatório:

1. abrir app;
2. gerar prompt;
3. abrir Gemini;
4. gerar imagem;
5. compartilhar de volta;
6. app recebe intent;
7. bridge consome imagem;
8. preview da cena aparece;
9. imagem persiste ao navegar;
10. restart preserva o que deve.

---

# 21. PENDÊNCIAS P0

1. corrigir scroll físico;
2. corrigir menu/config Gemini;
3. corrigir consumeSharedImage;
4. simplificar UI seguindo concept literalmente;
5. gate real Galaxy S23 Ultra.

---

# 22. PENDÊNCIAS P1

- Android TTS real;
- Kokoro real;
- Gemini TTS se mantido;
- persistência de voz/modelo;
- retratos NPC;
- retrato player;
- persistência por entidade;
- inventário com assets corretos;
- map pinch zoom físico;
- Street Stories;
- NET;
- veículo;
- combate;
- Mundo Vivo detalhado;
- Biblioteca;
- import/export;
- restart/nova campanha;
- ações sugeridas;
- nova campanha realmente diferente.

---

# 23. ACEITAÇÃO FINAL

Não declarar pronto sem:

## Android físico
instala, abre, não crasha, insets/scroll/nav corretos.

## Gemini
chave/modelo persistem, provider responde de verdade, ação livre gera texto real, falha não é mascarada.

## Imagem
prompt -> Gemini -> share/import -> preview -> persistência; retratos persistem por entidade.

## TTS
Android toca; Kokoro aparece se instalado; voz persiste; texto longo termina; stop funciona.

## Assets
zero página de manual, FONTE OFICIAL, app icon ou imagem sem relação com item.

## Interface
comparação manual com concept em aparelho físico.

---

# 24. INSTRUÇÃO AO NOVO AGENTE

1. baixar e validar R5.63;
2. abrir o projeto Android;
3. executar testes existentes;
4. não reconstruir regras;
5. não substituir Motor Bárbara;
6. não reimportar livros sem necessidade;
7. preservar Mundo Vivo;
8. preservar dados/catálogos/mapa;
9. corrigir primeiro os bugs físicos P0;
10. seguir concept;
11. testar aparelho físico;
12. gerar novo checkpoint;
13. Release só após aprovação do usuário.

---

# 25. NÃO FAZER

- não começar do zero;
- não usar R5.49/R5.35/R5.30 como baseline atual;
- não dizer emulator = S23 físico;
- não dizer Gemini funciona sem chamada real;
- não dizer TTS funciona sem áudio real;
- não usar placeholders;
- não mover mecânicas para RAG;
- não publicar Release antes da aprovação;
- não esconder erro com fallback;
- não deixar UI de debug dominar gameplay.

---

# 26. RESUMO EXECUTIVO

**Baseline:** R5.63 / 4.1.63 / 4163  
**Checkpoint SHA-256:** `eb647c9a89e6d86f6ee3948f8b41dcaa2fc789fa94b0e14e908a520aae20710e`  
**APK SHA-256:** `a970444e17b3ed17e6a9e4191f6d4d0afc6d6592aa2eb12325c7971a7e66fd05`  
**Materiais Drive:** https://drive.google.com/drive/folders/1nEIvLGACIQNoOYPQEuSQbutz8F8fhCkR  
**Downloads Drive:** https://drive.google.com/drive/folders/1LOkqgP8cdx8zKMghOm6zr9B1BQuV3n5K  
**Projeto GitHub artifact:** https://github.com/bra83/hello-world/actions/runs/35555964569/artifacts/10620761117  
**Run R5.63:** https://github.com/bra83/hello-world/actions/runs/35555964569  
**Estado:** compilado e validado em CI/emulador, MAS NÃO FECHADO em aparelho físico.  
**Bugs P0:** scroll físico, menu/config Gemini, consumeSharedImage bridge, simplificação visual contra concept.

---

# 27. PRIMEIRA MENSAGEM RECOMENDADA NA NOVA PLATAFORMA

> Continue o Braseiro Cyberpunk RED exatamente do checkpoint R5.63 descrito neste handoff. Não recrie nada e não volte para baseline antiga. Baixe o checkpoint, valide o SHA-256 e trate os bugs físicos P0 como prioridade: scroll travado no Samsung, menu/configuração Gemini que não abre e erro `consumeSharedImage: Java bridge method can't be invoked on a non-injected object`. Preserve Motor Bárbara, Mundo Vivo, regras, dados, mapa, catálogo, persistência e integração Android. O concept visual descrito no handoff é autoridade. Não publique Release e não declare PASS sem teste físico e evidência.
