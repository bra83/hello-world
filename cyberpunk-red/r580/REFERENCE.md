# Cyberpunk 4.1.80 — mídia, dados físicos e voz

Referência efetivamente lida: bra83/braseiro-forbidden-lands, commit e7efd725677d4b680edc8b0776d4e7cae6cfeace.

Dados: portados PhysicalDiceEngine, DiceRollSpec, DiceAppearance, Dice3DView e BraseiroDice3DOverlay de android/app/src/main/java/com/braseiro/forbiddenlands/dice/. O núcleo matemático e as malhas foram mantidos; adaptados package, identificação Cyberpunk, seed nativa e callback. O renderer recebeu uma correção adicional: números são texturas em coordenadas locais da face, projetadas pela mesma orientação do corpo, usando homografia. Nenhum número é desenhado horizontalmente sobre a tela. Resultados de timeout/assentamento forçado são recusados. A confirmação provém da sessão nativa e só é consumida uma vez; pacotes JS não podem fabricar resultados.

Kokoro: comparado AndroidTtsPlugin.java do mesmo SHA. Seleção explícita apenas de serviço instalado, identificação canônica de com.k2fsa.sherpa.onnx.tts.engine / .debug e confirmação do motor conectado. Removida substituição automática e rótulo Kokoro em um pacote Android arbitrário. Blocos locais 350–800 caracteres, início e sequência por callbacks; callbacks antigos de stop/error não interrompem uma leitura nova. Não se embarca modelo neural nem se instala um aplicativo alternativo. Motores reais continuam listados dinamicamente; TTS Server pode ser selecionado pelo pacote/nome real sem ser rebatizado de Kokoro.

Imagem: correção de decode com inJustDecodeBounds: o retorno null significa que somente dimensões foram lidas, não uma falha de abertura. Controles de mídia ficam abertos acima da narração; importação exibe erros nativos antes engolidos. Intent Gemini usa EXTRA_TEXT, clipboard e queries Android para o aplicativo correto. ACTION_SEND pede ao Gemini abrir o prompt, sem prometer automação da interface de terceiros. Compartilhamento/importação e reabertura têm teste Android com ContentProvider de fixture.

Escolhas: cartões existentes de ações sugeridas deixam o details recolhido e ficam antes da ação livre. Um clique preenche a ação para revisão; não executa decisões automaticamente.

Gemini TTS: corrigido contrato REST 3.8 conforme documentação oficial. Usa speech_metadata.style, voiceConfig.voice, sem systemInstruction incompatível e com AUDIO_L16 explícito. Parser procura áudio em todas as partes e aceita WAV PCM 24 kHz mono 16-bit, removendo RIFF antes do AudioTrack. Cache separado evita reutilizar WAV antigo como PCM. Perfil/estilo ficam fora da transcrição; falhas assíncronas aparecem na tela, apenas para o motor em uso.

Fontes oficiais:
https://ai.google.dev/gemini-api/docs/generate-content/speech-generation
https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/text-to-speech/migration-guide

Testes: JVM verifica payload real, parser/PCM/WAV e 160 simulações; navegador verifica importação persistida/posição/escolhas/intents; Android testa compartilhamento de imagem/persistência, intent de prompt, mesa física e reprodução com AudioTrack real usando HTTP injetado. Esses testes não usam uma chave Gemini real, nem validam um modelo neural Kokoro ausente do emulador. Certificação desses provedores no aparelho fica explicitamente separada.
