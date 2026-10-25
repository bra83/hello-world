from pathlib import Path
import base64,csv,hashlib,io,sys,zipfile


def replace_once(text,before,after):
    if text.count(before)!=1: raise RuntimeError('Unsupported source: '+before[:100])
    return text.replace(before,after,1)


def apply(root):
    root=Path(root);base=Path(__file__).parent
    wheel=root/'app/wheels/motor_barbara-1.1.2-py3-none-any.whl'
    with zipfile.ZipFile(wheel) as z:files={n:z.read(n) for n in z.namelist()}
    files['barbara/grounding_context.py']=(base/'python/grounding_context.py').read_bytes()
    s=files['barbara/grounding.py'].decode()
    s=replace_once(s,'        rumors=self._flatten(visible_rumors)',
        '        from .grounding_context import public_fact_sources, supports_public_fact\n        public_sources=public_fact_sources(state,evidence,public_context)\n        rumors=self._flatten(visible_rumors)')
    s=replace_once(s,"if not self._supported(body,canon): raise ValueError('fato_claim_sem_evidencia')", "if not (self._supported(body,canon) or supports_public_fact(body,public_sources)): raise ValueError('fato_claim_sem_evidencia')")
    files['barbara/grounding.py']=s.encode()
    s=files['barbara/engine.py'].decode()
    start=s.index('        return public_view({',s.index('    def narrator_context('))
    end=s.index('\n    def _validate_with_scene_repair(',start)
    original=s[start:end]
    replacement=original.replace('        return public_view({','        context=public_view({',1)
    replacement+='\n        from .grounding_context import prompt_fact_catalog, active_player_public\n        context["game_time"]=public_view(state.game_time)\n        context["player_public"]=active_player_public(state)\n        context["fact_grounding"]=prompt_fact_catalog(state,allowed,context)\n        return context\n'
    s=s[:start]+replacement+s[end:]
    start=s.index('    def _validate_with_scene_repair(');end=s.index('    def _validate_provider_output(',start)
    s=s[:start]+'''    def _validate_with_scene_repair(self,raw,state,evidence,context,text,importance,plan,resolution,provider_state):
        try:
            return self._validate_provider_output(raw,state,evidence,context,text,importance,plan,resolution)
        except ValueError as error:
            reason=str(error)
            repairable={'cena_sem_abertura_para_decisao','fato_claim_sem_evidencia','regra_claim_sem_evidencia','rumor_sem_evidencia'}
            if reason not in repairable or not getattr(self.provider,'enforce_story_contract',False):
                raise
            # One presentation retry total, even if the second response fails a
            # different gate. Never re-enter turn(), roll, world ticks or effects.
            instruction = "\\n\\nCorreção de apresentação: a resposta anterior falhou em "+reason+". Reescreva a cena usando exclusivamente os fatos autorizados do MESMO contexto. Para FACT, copie trechos atômicos de fact_grounding que você de fato narrou. Não misture fatos independentes em um claim. RULE exige evidência RULE; RUMOR continua não confirmado. Não transforme afirmação rejeitada em INFERENCE para contornar a evidência, nem remova claims para ocultar fatos inventados: retire da própria cena qualquer detalhe sem apoio. Preserve a agência do jogador e encerre com O que você faz? Não avance o mundo nem invente consequências."
            repaired=self.provider.generate(text[:18000]+instruction,context,provider_state)
            return self._validate_provider_output(repaired,state,evidence,context,text,importance,plan,resolution)

'''+s[end:]
    files['barbara/engine.py']=s.encode()
    s=files['barbara/gemini.py'].decode()
    s=replace_once(s,"'Claims must use FACT:","'context.fact_grounding contains atomic host-authorized FACT snippets. For each factual claim you narrate, copy the relevant snippet verbatim as its claim. Keep claims atomic and separate; never invent a FACT, combine unrelated records or cite instructions/player_input as evidence. If a detail has no support, omit that detail from the narration itself. Do not use INFERENCE or an empty claims array to disguise an unsupported assertion.',\u0027Claims must use FACT:")
    files['barbara/gemini.py']=s.encode()
    rec=next(n for n in files if n.endswith('.dist-info/RECORD'));out=io.StringIO();writer=csv.writer(out,lineterminator='\n')
    for n,b in files.items():writer.writerow([n,'sha256='+base64.urlsafe_b64encode(hashlib.sha256(b).digest()).decode().rstrip('=') if n!=rec else '',len(b) if n!=rec else ''])
    files[rec]=out.getvalue().encode()
    with zipfile.ZipFile(wheel,'w',zipfile.ZIP_DEFLATED) as z:
        for n,b in files.items():z.writestr(n,b)
    app=root/'app/src/main/assets/web/app'
    s=(app/'sheets.js').read_text(encoding='utf-8-sig')
    s=replace_once(s,"  narrationFailureMessage(reason='provider_missing'){",'''  narrationFailureMessage(reason='provider_missing'){
    reason=String(reason).replace(/^(?:(?:ValueError|RuntimeError|Error):\\s*)+/,'');
    if(['fato_claim_sem_evidencia','regra_claim_sem_evidencia','rumor_sem_evidencia'].includes(reason))return 'O Gemini respondeu, mas incluiu uma afirmação sem apoio nos dados da aventura, mesmo após a correção automática. A cena foi recusada para preservar os fatos da campanha. Isso não indica erro na sua chave de API. Tente novamente descrevendo a situação atual. Detalhe: '+reason;''')
    # render() used to reset a settled badge to VERIFICANDO after every save.
    s=replace_once(s,"    const c=this.character(),s=this.sessionState(c);if(!c||!s)return;const current=s.currentNarration||'O Mestre ainda não narrou esta cena.';", "    const c=this.character(),s=this.sessionState(c);if(!c||!s)return;\n    this.setNarrationBadge(s.narrativeError?'deterministic_fallback':s.narrationSource||'local',s.narrativeError||'');\n    const current=s.currentNarration||'O Mestre ainda não narrou esta cena.';")
    (app/'sheets.js').write_text(s,encoding='utf-8')
    s=(app/'app.js').read_text(encoding='utf-8-sig')
    before="$('#coreBadge').textContent=bridge.isRealCore?'GEMINI • VERIFICANDO':'DEMO CORE';"
    after="if(bridge.isRealCore){const session=character?.campaignState?.session;workbench?.setNarrationBadge?.(session?.narrativeError?'deterministic_fallback':session?.narrationSource||'local',session?.narrativeError||'')}else{$('#coreBadge').textContent='DEMO CORE'};"
    s=replace_once(s,before,after);(app/'app.js').write_text(s,encoding='utf-8')
    gradle=root/'app/build.gradle.kts';s=gradle.read_text();s=replace_once(s,'versionCode = 4175','versionCode = 4176');s=replace_once(s,'versionName = "4.1.75"','versionName = "4.1.76"');gradle.write_text(s)
    p=app/'index.html';s=p.read_text();s=s.replace('build=4175','build=4176');p.write_text(s)
    print('Applied R5.76: canonical FACT projection, bounded grounded scene repair, accurate failure/status UI')

if __name__=='__main__':apply(sys.argv[1])
