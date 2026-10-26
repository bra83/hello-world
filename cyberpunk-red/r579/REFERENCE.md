# Fluxo de referência — Forbidden Lands para Cyberpunk RED 4.1.79

Referência lida no GitHub: `bra83/braseiro-forbidden-lands`, commit `e7efd725677d4b680edc8b0776d4e7cae6cfeace`.

Arquivos comparados:

- `src/services/MasterOrchestratorService.ts`: plano e arbitragem locais, chamada remota de narração direta, revisão na mesma resposta, qualidade observada sem descartar uma abertura válida por extensão.
- `src/services/NarrativeDirectorService.ts`: alvo de abertura próximo de 5.000–6.000 caracteres e 8–12 parágrafos, método separado para medir suficiência.
- `src/services/HumanMasterNarrativeGuardService.ts`: separação entre avisos de estilo e falhas de agência/voz técnica.
- `HOTFIX_GEMINI_OPENING_2026-10-05.md`: registra o mesmo defeito de descarte por tamanho e os problemas de orçamento de chamadas.
- `scripts/verify-user-reported-regressions.mjs`: verifica que a condição de descarte por tamanho deixou de existir.

Links:

https://github.com/bra83/braseiro-forbidden-lands/blob/e7efd725677d4b680edc8b0776d4e7cae6cfeace/src/services/MasterOrchestratorService.ts

https://github.com/bra83/braseiro-forbidden-lands/blob/e7efd725677d4b680edc8b0776d4e7cae6cfeace/src/services/HumanMasterNarrativeGuardService.ts

A consulta a Star Wars falhou no conector. A adaptação usa a fonte Forbidden Lands efetivamente lida, sem presumir certificação integral de nenhum desses aplicativos. Arquivos privados do outro projeto não foram republicados neste repositório.

## Adaptação real

O Android Cyberpunk usa Python/Chaquopy e uma UI JavaScript, enquanto FL usa TypeScript/Capacitor. O port adapta o comportamento, preservando bridge, banco, regras e conteúdo Cyberpunk.

No caminho de aventura persistida, os três níveis que antes reprovavam a mesma extensão (engine, finalização do pipeline, UI) deixam de descartar uma resposta por tamanho/parágrafos/cobertura de estilo. O alvo de 5.000–6.000 permanece no prompt e na telemetria. Uma cena válida retorna na primeira chamada, sem refinamento síncrono só por estilo. A revisão deve ocorrer na própria resposta.

Continuam fatais: alteração canônica emitida pela IA, claims sem evidência (com correção factual limitada já existente), geografia contraditória, continuidade incoerente, tomada de decisões/emoções do jogador e vazamento de instruções. JSON truncado/formato inválido ainda admite uma recuperação limitada; não há refinamento de comprimento. Indisponibilidade real permanece erro explícito e não é mascarada com narrativa fabricada. Não se usa chave paga, não se troca modelo nem se redefine preferências.

Os recibos por aventura e os testes de persistência da 4.1.78 são mantidos. Saves antigos e o histórico não são apagados; uma mensagem de erro já salva será substituída pela próxima narração válida.

## Critérios executados

`tests/flow.py` usa GeminiProvider/HTTP injetado, HostBridge, pipeline e SQLite reais. Executado com o wheel oficial 4.1.78, reproduz duas respostas seguras descartadas e abertura bloqueada. No wheel corrigido, a primeira resposta curta é entregue com aviso apenas na telemetria; a próxima ação funciona; replay não repete chamada/tick; restart mantém os dados. Uma cena de 5.254 caracteres também é aceita. Casos de segurança provam que separar estilo não concede autoridade à IA.

`tests/opening_ui.mjs` executa os métodos de produção da UI: cenas curtas e longas são exibidas, ambas persistidas, com uma chamada de UI; falha de provedor preserva a campanha. Não foi utilizada a chave real do usuário. Compilação e testes Android são gates adicionais no workflow.
