def advisory_style(state,plan):
    return bool(adventure_scope(state) and isinstance(plan,dict) and plan.get('mode')=='fiction')


def assess_style(narration,plan):
    paragraphs=len([p for p in re.split(r'\n\s*\n',narration) if p.strip()])
    opening=plan.get('story_obligation')=='campaign_opening'
    return {'reference':'forbidden-lands/master-orchestrator-e7efd725','style_advisory':True,
            'characters':len(narration),'paragraphs':paragraphs,
            'preferred_target_chars':[5000,6000] if opening else plan.get('target_chars'),
            'below_preferred_depth':bool(opening and (len(narration)<5000 or paragraphs<8))}


def validate_complete(engine,out,state,context,text,importance,plan,resolution):
    if not advisory_style(state,plan):return out
    narration=out['narration'].replace('\r','').strip().strip('“\"\'”').strip()
    narration=re.sub(r'^(?:RESPOSTA|NARRAÇÃO|NARRACAO)\s*:\s*','',narration,flags=re.I).strip()
    if not narration:raise ValueError('invalid_narration')
    WorldConsistencyGate().validate(narration,context.get('scene_context') or {})
    ContinuityGate().validate(narration,state,claims=out.get('claims'),resolution=resolution)
    quality=NarrativeQualityGate().inspect(narration)
    if quality.get('errors'):raise ValueError(quality['errors'][0])
    # Port the reference guard's separation: style is observed, agency/meta are fatal.
    normalized=''.join(c for c in unicodedata.normalize('NFD',narration.lower()) if unicodedata.category(c)!='Mn')
    if plan.get('story_obligation')=='campaign_opening' and re.search(r'\b(?:voce decide|voce resolveu|voce escolhe|voce aceita|voce recusa|voce concorda|sem pensar voce|voce sente medo|voce fica triste|voce fica impressionado|voce odeia)\b',normalized):
        raise ValueError('player_agency_violation')
    if any(marker in narration.upper() for marker in ('FIM DO CONTEXTO','END OF CONTEXT','NARRATIVE_POLICY','WORLD_STATE_FOR_DRAMATIZATION','PROMPT DO SISTEMA','SYSTEM PROMPT','PRESENTATION.COVERAGE','CONTEXTO DO MESTRE','INSTRUÇÃO DE NARRAÇÃO','INSTRUCAO DE NARRACAO')):
        raise ValueError('narrative_meta_language')
    return {**out,'narration':narration}

