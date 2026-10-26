# Cyberpunk 4.1.80 — mídia, dados físicos e voz

Referência efetivamente lida: bra83/braseiro-forbidden-lands, commit e7efd725677d4b680edc8b0776d4e7cae6cfeace.

Dados: portados PhysicalDiceEngine, DiceRollSpec, DiceAppearance, Dice3DView e BraseiroDice3DOverlay de android/app/src/main/java/com/braseiro/forbiddenlands/dice/. O núcleo matemático e as malhas foram mantidos; adaptados package, identificação Cyberpunk, seed nativa e callback. O renderer recebeu uma correção adicional: números são texturas em coordenadas locais da face, projetadas pela mesma orientação do corpo, usando homografia. Nenhum número é desenhado horizontalmente sobre a tela. Resultados de timeout/assentamento forçado são recusados. A confirmação provém da sessão nativa e só é consumida uma vez; pacotes JS não podem fabricar resultados.

Kokoro: handoff e ZIP fornecidos pelo usuário em 26/10, lidos integralmente. BraseiroAndroidTtsPolicy.java copiado com alteração apenas do package Java (SHA-256 original 3b5aca9f62655fd3da6a82669672e0a6694f2e11c577b22fae04f0625820d982). Serviços Sherpa release/debug reais são descobertos dinamicamente; a escolha explícita .debug informada pelo usuário é preservada, mesmo com release instalado. Aliases antigos migram apenas para serviço instalado, sem substituir Google/Samsung escolhidos manualmente. Nenhum peso/modelo ONNX é embarcado.

Usado o perfil literal FL NarrationChunkPlanner.ts blob ab084713ce814316cc3d7bda2e4fe4e3bf7f67e7 (560/760, mínimo 350, máximo seguro 3900, offsets e palavras preservados), portado para NativeNarrationPlan.java. Filtro spokenTranscript do blob 4af3994f8832e8dfb103c52d33fd39cd5c58d72e aplicado só à cópia falada. Não se apresenta o chunker GURPS 480/720 como se fosse FL.

Inicialização lazy, catálogo sem instanciar TTS, package explícito no construtor, OnInit antes de falar, política de confirmação explícita registrada sem reflexão/API oculta nem alegação de verificação independente. Inicialização tem cancelamento por geração e limite operacional de 90 s; Parar usa executor próprio para funcionar durante a espera. Voz ausente/rejeitada causa erro; troca de package limpa voz anterior. Blocos usam QUEUE_ADD e callback real; stop e erro não avançam a fila. Foco de áudio transitório com ducking Android e liberação ao concluir/parar/falhar; perda de foco interrompe a geração. Taxa 0,65–1,50 e pitch 1,0, sem aplicar perfil Gemini ao Kokoro.

O APK separado de instrumentação inclui um serviço TTS de fixture para provar o binding Android, catálogo, persistência, 5k+ caracteres, callbacks, stop e falha sem avanço. Ele não é Kokoro e não vai no instalador principal. A voz neural Sherpa no aparelho permanece uma homologação física, assim como cota/credencial Gemini real.

Imagem: correção de decode com inJustDecodeBounds: o retorno null significa que somente dimensões foram lidas, não uma falha de abertura. Controles de mídia ficam abertos acima da narração; importação exibe erros nativos antes engolidos. Intent Gemini usa EXTRA_TEXT, clipboard e queries Android para o aplicativo correto. ACTION_SEND pede ao Gemini abrir o prompt, sem prometer automação da interface de terceiros. Compartilhamento/importação e reabertura têm teste Android com ContentProvider de fixture.

Escolhas: o schema do narrador aceita recommendedActions opcionais e o motor preserva até quatro strings validadas como sugestões, sem executar ações. Os cartões existentes de ações sugeridas deixam o details recolhido e ficam antes da ação livre. Um clique preenche a ação para revisão; não executa decisões automaticamente.

Gemini TTS: corrigido contrato REST 3.8 conforme documentação oficial. Usa speech_metadata.style, voiceConfig.voice, sem systemInstruction incompatível e com AUDIO_L16 explícito. Parser procura áudio em todas as partes e aceita WAV PCM 24 kHz mono 16-bit, removendo RIFF antes do AudioTrack. Cache separado evita reutilizar WAV antigo como PCM. Perfil/estilo ficam fora da transcrição; falhas assíncronas aparecem na tela, apenas para o motor em uso.

Fontes oficiais:
https://ai.google.dev/gemini-api/docs/generate-content/speech-generation
https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/text-to-speech/migration-guide

Testes: JVM verifica payload real, parser/PCM/WAV e 160 simulações; navegador verifica importação persistida/posição/escolhas/intents; Android testa compartilhamento de imagem/persistência, intent de prompt, mesa física e reprodução com AudioTrack real usando HTTP injetado. Esses testes não usam uma chave Gemini real, nem validam um modelo neural Kokoro ausente do emulador. Certificação desses provedores no aparelho fica explicitamente separada.
