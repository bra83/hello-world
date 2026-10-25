from pathlib import Path
import base64,csv,hashlib,io,sys,zipfile


def replace_once(s,before,after):
    if s.count(before)!=1:raise RuntimeError('Unsupported source: '+before[:100])
    return s.replace(before,after,1)


def apply(root):
    root=Path(root);here=Path(__file__).parent
    wheel=root/'app/wheels/motor_barbara-1.1.2-py3-none-any.whl'
    with zipfile.ZipFile(wheel) as z:files={n:z.read(n) for n in z.namelist()}
    files['barbara/opening_contract.py']=(here/'python/opening_contract.py').read_bytes()
    s=files['barbara/narrative.py'].decode();s=replace_once(s,"'campaign_opening':(1800,4200)","'campaign_opening':(5000,6000)")
    s=replace_once(s,"        if len(text)<int(minimum*.78):raise ValueError('historia_de_abertura_resumida_demais')", "        if occasion=='campaign_opening':minimum=5000;required_paragraphs=8\n        if len(text)<(minimum if occasion=='campaign_opening' else int(minimum*.78)):raise ValueError('historia_de_abertura_resumida_demais')")
    files['barbara/narrative.py']=s.encode()
    s=files['barbara/presentation.py'].decode();s=replace_once(s,"'campaign_opening': ('EPIC', (1800, 4200), 7)","'campaign_opening': ('EPIC', (5000, 6000), 8)")
    s=replace_once(s,"        minimum = int(obligation.get('target_chars', [0])[0] * .82)","        minimum = 5000 if obligation.get('occasion')=='campaign_opening' else int(obligation.get('target_chars', [0])[0] * .82)")
    s=replace_once(s,"        if section=='region_context':", "        if section=='geographic_orientation':\n            names=self._flatten_names(context.get('location_name'))+self._flatten_names(context.get('location_id'))\n            if any(name.casefold() in text.casefold() for name in names):return True\n        if section=='character_knowledge' and re.search(r'\\b(n[ãa]o sabe|n[ãa]o conhece|n[ãa]o reconhece|observa|percebe|ouve|l[êe]-se|fica sabendo|diz|pergunta|[àa] vista)\\b',text,re.I):return True\n        if section=='region_context':")
    files['barbara/presentation.py']=s.encode()
    s=files['barbara/engine.py'].decode()
    s=replace_once(s,"        discovery=state.discovery; locations=discovery.get('locations',{})", "        from .opening_contract import adventure_scope,delivered\n        if adventure_scope(state) and not delivered(state):return 'campaign_opening'\n        discovery=state.discovery; locations=discovery.get('locations',{})")
    s=replace_once(s,'        self.visit_memory.mark_introduction_delivered(state,occasion)', '        self.visit_memory.mark_introduction_delivered(state,occasion)\n        from .opening_contract import mark_delivered\n        if occasion==\'campaign_opening\':mark_delivered(state)')
    before="            self._mark_presentation_delivered(state,plan)\n            result['presentation_receipt']=self.visit_memory.receipt(state,plan.get('story_obligation','continuation'))"
    after="            from .opening_contract import adventure_scope\n            if not adventure_scope(state):\n                self._mark_presentation_delivered(state,plan)\n                result['presentation_receipt']=self.visit_memory.receipt(state,plan.get('story_obligation','continuation'))"
    s=replace_once(s,before,after)
    start=s.index('    def _validate_with_scene_repair(');end=s.index('    def _validate_provider_output(',start)
    s=s[:start]+'''    def _validate_complete_presentation(self,out,state,evidence,context,text,importance,plan,resolution):
        from .opening_contract import validate_complete
        return validate_complete(self,out,state,context,text,importance,plan,resolution)

    def _validate_with_scene_repair(self,raw,state,evidence,context,text,importance,plan,resolution,provider_state):
        def validate(candidate):
            out=self._validate_provider_output(candidate,state,evidence,context,text,importance,plan,resolution)
            complete=getattr(self,'_validate_complete_presentation',None)
            return complete(out,state,evidence,context,text,importance,plan,resolution) if callable(complete) else out
        try:return validate(raw)
        except ValueError as error:
            reason=str(error)
            # Keep the legacy isolated test/host surface without importing a package
            # from an extracted method; real engines expose the complete validator.
            basic={'cena_sem_abertura_para_decisao','fato_claim_sem_evidencia','regra_claim_sem_evidencia','rumor_sem_evidencia'}
            if hasattr(self,'_validate_complete_presentation'):
                from .opening_contract import repairable
                allowed=repairable(reason)
            else:allowed=reason in basic
            if not allowed or not getattr(self.provider,'enforce_story_contract',False):raise
            instruction="\\n\\nCorreção da apresentação ("+reason+"): reescreva a MESMA cena com os fatos do mesmo contexto, sem executar outro turno. Se a ocasião é campaign_opening, escreva de 5.000 a 6.000 caracteres, no mínimo 5.000, em pelo menos oito parágrafos substanciais e diferentes. Siga o perfil Mestre Humano Dinâmico: cena sensorial, situação concreta a partir da premissa pública e dos fatos disponíveis, pessoas agindo quando autorizadas e espaço real para decisão. Não use enchimento, repetição, relatório nem lista de opções no lugar da história. Não reinicie a cronologia, não escolha ações pelo jogador nem invente consequências. FACT deve copiar um trecho atômico autorizado de fact_grounding; não esconda afirmação rejeitada em INFERENCE. Cubra na narrativa as seções exigidas e declare apenas a cobertura efetiva em presentation.coverage. Termine com uma abertura contextual para a decisão, como O que você faz?"
            repaired=self.provider.generate(text[:18000]+instruction,context,provider_state)
            return validate(repaired)

'''+s[end:]
    before="            raw=self.recovery.run(lambda:self.provider.generate(text,context,provider_state))\n            validated=self._validate_with_scene_repair(raw,state,evidence,context,text,importance,plan,resolution,provider_state)"
    after='''            try:
                raw=self.recovery.run(lambda:self.provider.generate(text,context,provider_state))
            except ValueError as error:
                if str(error) not in {'invalid_gemini_response','gemini_output_truncated'}:raise
                # One formatting repair, sharing the same committed snapshot. This
                # branch validates directly, so it cannot add a third quality retry.
                raw=self.provider.generate(text[:18000]+"\\n\\nA resposta anterior veio incompleta ou fora do JSON solicitado. Retorne o objeto JSON completo. Para campaign_opening, cumpra 5.000–6.000 caracteres em pelo menos oito parágrafos distintos, com os mesmos fatos autorizados, sem executar outro turno.",context,provider_state)
                validated=self._validate_provider_output(raw,state,evidence,context,text,importance,plan,resolution)
                validated=self._validate_complete_presentation(validated,state,evidence,context,text,importance,plan,resolution)
            else:
                validated=self._validate_with_scene_repair(raw,state,evidence,context,text,importance,plan,resolution,provider_state)'''
    s=replace_once(s,before,after)
    files['barbara/engine.py']=s.encode()
    s=files['barbara/pipeline.py'].decode()
    before='        if not narration or reason:\n'
    after='''        from .opening_contract import scoped_opening
        if occasion=='campaign_opening' and result.get('mode')=='fiction' and (not narration or reason):
            # A rejected/offline opening is pending, not delivered. Never manufacture
            # a long placeholder to satisfy the narrative length contract.
            result.pop('narration',None);result.pop('claims',None);result.pop('presentation_receipt',None)
            result['narration_source']='unavailable';result['narrative_error']=reason or 'provider_missing'
            result['narrative_fallback_reason']=reason or 'provider_missing';result['opening_pending']=True
            self._persist_final_result(state,request_id,result)
            return result

        if not narration or reason:
'''
    s=replace_once(s,before,after)
    s=replace_once(s,"if result.get('mode')=='fiction' and occasion!='continuation' and result.get('narration'):","if result.get('mode')=='fiction' and occasion!='continuation' and result.get('narration_source')=='provider' and not reason:")
    files['barbara/pipeline.py']=s.encode()
    s=files['barbara/fallback.py'].decode();s=replace_once(s,'    FALLBACK_CODES = {', "    FALLBACK_CODES = {\n        'gemini_output_truncated','opening_repetitive','fato_claim_sem_evidencia','regra_claim_sem_evidencia','rumor_sem_evidencia','world_introduction_claimed_but_missing',")
    files['barbara/fallback.py']=s.encode()
    s=files['barbara/gemini.py'].decode()
    s=replace_once(s,"'Return only the requested JSON object.'", "'Use the Mestre Humano Dinâmico narrative profile. A campaign_opening needs 5,000–6,000 characters, at least 5,000, in eight or more substantial distinct paragraphs. Build a playable situation from the authorized public premise, people and geography; atmospheric decoration alone is not a complete opening. Never pad or repeat paragraphs to reach the count. Preserve the existing chronology and player agency.','Return only the requested JSON object.'")
    old="        try: raw=payload['candidates'][0]['content']['parts'][0]['text']; out=json.loads(raw)"
    new="        try:\n            candidate=payload['candidates'][0]\n            if candidate.get('finishReason')=='MAX_TOKENS':raise ValueError('gemini_output_truncated')\n            raw=''.join(part.get('text','') for part in candidate['content']['parts'] if isinstance(part,dict) and not part.get('thought'))\n            out=json.loads(raw)"
    s=replace_once(s,old,new)
    files['barbara/gemini.py']=s.encode()
    rec=next(n for n in files if n.endswith('.dist-info/RECORD'));out=io.StringIO();writer=csv.writer(out,lineterminator='\n')
    for n,b in files.items():writer.writerow([n,'sha256='+base64.urlsafe_b64encode(hashlib.sha256(b).digest()).decode().rstrip('=') if n!=rec else '',len(b) if n!=rec else ''])
    files[rec]=out.getvalue().encode()
    with zipfile.ZipFile(wheel,'w',zipfile.ZIP_DEFLATED) as z:
        for n,b in files.items():z.writestr(n,b)
    app=root/'app/src/main/assets/web/app';p=app/'sheets.js';s=p.read_text(encoding='utf-8-sig')
    s=replace_once(s,'Produza uma cena completa, sensorial e jogável, com NPCs/fatos apenas quando compatíveis com o contexto estruturado.', 'Use o perfil Mestre Humano Dinâmico. Escreva uma abertura de 5.000 a 6.000 caracteres, no mínimo 5.000, em pelo menos oito parágrafos substanciais e distintos. Apresente uma situação concreta a partir da premissa pública e dos fatos disponíveis, com NPCs/fatos apenas quando compatíveis com o contexto estruturado. Evite ambientação genérica, repetição e listas no lugar da história.')
    s=replace_once(s,'A primeira resposta estruturalmente válida deve ser exibida; enriquecimento visual/TTS vem depois.','Exiba apenas a abertura que cumpra todo o contrato narrativo; enriquecimento visual/TTS vem depois.')
    s=s.replace("        if(!cleanRemote)throw new Error('provider_narration_empty_after_sanitize');", "        if(!cleanRemote)throw new Error('provider_narration_empty_after_sanitize');\n        if(cleanRemote.length<5000)throw new Error('opening_narration_too_short');")
    s=replace_once(s,"    if(reason==='cena_sem_abertura_para_decisao')", "    if(['historia_de_abertura_resumida_demais','historia_com_poucos_paragrafos','world_introduction_too_short','world_introduction_too_few_paragraphs','opening_repetitive','opening_narration_too_short'].includes(reason))return 'A abertura ainda não atingiu o padrão de 5.000–6.000 caracteres com uma cena completa, mesmo após a correção automática. Ela continua pendente; a campanha foi preservada. Peça ao Mestre para apresentar a cena atual, sem reiniciar a aventura.';\n    if(reason==='cena_sem_abertura_para_decisao')")
    p.write_text(s)
    p=root/'app/build.gradle.kts';s=p.read_text();s=replace_once(s,'versionCode = 4177','versionCode = 4178');s=replace_once(s,'versionName = "4.1.77"','versionName = "4.1.78"');p.write_text(s)
    p=app/'index.html';p.write_text(p.read_text().replace('build=4177','build=4178'))
    print('Applied R5.78: 5k opening contract, bounded full-presentation repair, host adventure-scoped delivery, no fallback acknowledgement')

if __name__=='__main__':apply(sys.argv[1])
