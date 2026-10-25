"""Host-scoped introduction receipts and final presentation checks.
No rules, clocks, rewards or other canonical game effects are applied here.
"""
import hashlib,json,re
from .context import WorldConsistencyGate
from .continuity import ContinuityGate
from .quality import NarrativeQualityGate

MIN_OPENING_CHARS=5000
MAX_DELIVERY_SCOPES=64


def adventure_scope(state):
    p=getattr(state,'player_state',{})
    if not isinstance(p,dict):return None
    active=p.get('activeCharacterId');characters=p.get('characters',{})
    if not isinstance(active,str) or not isinstance(characters,dict):return None
    matches=[c for c in characters.values() if isinstance(c,dict) and c.get('characterId')==active and not c.get('deleted')]
    if len(matches)!=1:return None
    session=(matches[0].get('campaignState') or {}).get('session')
    if not isinstance(session,dict) or session.get('status')!='active':return None
    seed=session.get('adventureSeed')
    if not isinstance(seed,str) or not seed.strip() or len(seed)>240:return None
    data=[active,str(session.get('campaignId') or ''),seed]
    return hashlib.sha256(json.dumps(data,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()


def delivered(state):
    scope=adventure_scope(state)
    entries=getattr(state,'discovery',{}).get('adventure_introductions',{})
    entry=entries.get(scope) if isinstance(entries,dict) else None
    return bool(scope and isinstance(entry,dict) and entry.get('delivered') is True)


def mark_delivered(state):
    scope=adventure_scope(state)
    if not scope:return
    entries=state.discovery.setdefault('adventure_introductions',{})
    if not isinstance(entries,dict):raise ValueError('invalid_introduction_receipts')
    entries[scope]={'delivered':True,'tick':state.tick}
    while len(entries)>MAX_DELIVERY_SCOPES:
        victim=next(k for k in entries if k!=scope);entries.pop(victim)


def scoped_opening(state,plan):
    return bool(adventure_scope(state) and isinstance(plan,dict) and plan.get('mode')=='fiction' and plan.get('story_obligation')=='campaign_opening')


def validate_complete(engine,out,state,context,text,importance,plan,resolution):
    if not scoped_opening(state,plan):return out
    scene=context.get('scene_context') or {}
    narration=out['narration'].replace('\r','').strip().strip('“\"\'”').strip()
    narration=re.sub(r'^(?:RESPOSTA|NARRAÇÃO|NARRACAO)\s*:\s*','',narration,flags=re.I).strip()
    out={**out,'narration':narration}
    engine.narrative.validate_story_obligation(narration,'campaign_opening',strict=True)
    WorldConsistencyGate().validate(narration,scene)
    WorldConsistencyGate().validate_depth(narration,scene,mode='fiction',importance=importance,story_obligation='campaign_opening')
    ContinuityGate().validate(narration,state,claims=out.get('claims'),resolution=resolution)
    quality=NarrativeQualityGate().inspect(narration)
    if quality.get('errors'):raise ValueError(quality['errors'][0])
    if 'repetition' in quality.get('warnings',[]):raise ValueError('opening_repetitive')
    if any(marker in narration.upper() for marker in ('FIM DO CONTEXTO','END OF CONTEXT','NARRATIVE_POLICY','WORLD_STATE_FOR_DRAMATIZATION','PROMPT DO SISTEMA','SYSTEM PROMPT','PRESENTATION.COVERAGE','CONTEXTO DO MESTRE','INSTRUÇÃO DE NARRAÇÃO','INSTRUCAO DE NARRACAO')):
        raise ValueError('narrative_meta_language')
    return out


def repairable(reason):
    code=str(reason).split(':',1)[0]
    return code in {
        'cena_sem_abertura_para_decisao','fato_claim_sem_evidencia','regra_claim_sem_evidencia','rumor_sem_evidencia',
        'invalid_narration','narrativa_resumida_demais','perguntas_nao_respondidas',
        'historia_de_abertura_resumida_demais','historia_com_poucos_paragrafos','historia_substituida_por_relatorio','historia_sem_cena_suficiente',
        'narrative_too_few_paragraphs','narrative_too_short','narrative_meta_language','opening_repetitive',
        'world_introduction_too_short','world_introduction_too_few_paragraphs','world_introduction_missing_coverage_manifest',
        'world_introduction_missing_coverage','world_introduction_claimed_but_missing','world_introduction_missing_sensory_scene',
        'world_introduction_missing_agency_return','world_introduction_missing_location_anchor',
    }
