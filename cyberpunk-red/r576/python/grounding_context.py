"""Evidence projection shared by narrator prompts and FACT validation.

Only host-owned public fields are eligible. Instructions, player input, generated
narration, rumor/inference and a provider-supplied catalog are never FACT sources.
"""
from .security import public_view

SCENE_FIELDS = ('location_id', 'location_name', 'terrain', 'features', 'description',
                'hydrology', 'water_present', 'lighting', 'physical_environment',
                'noise', 'temperature', 'geometry', 'connections',
                'location_hierarchy', 'setting_context', 'region', 'region_id',
                'nearby_places')
LABELS = {'location': 'Local atual', 'location_name': 'Local atual',
          'location_id': 'Identificador do local', 'terrain': 'Terreno',
          'features': 'Características', 'description': 'Descrição',
          'region': 'Região', 'temperature': 'Temperatura', 'noise': 'Ruído'}


def records(value, path=''):
    """Keep each key/value relationship; never flatten unrelated records together."""
    if isinstance(value, dict):
        for key, item in value.items():
            label = LABELS.get(key, str(key).replace('_', ' '))
            yield from records(item, f'{path} / {label}' if path else label)
    elif isinstance(value, (list, tuple)):
        for item in value:
            yield from records(item, path)
    elif value is not None and str(value).strip():
        yield f'{path}: {value}' if path else str(value)


def public_fact_sources(state, evidence, context=None):
    """Never trust a context's fact_grounding field: rebuild from authorized data."""
    facts = public_view(getattr(state, 'facts', {}))
    sources = list(records(facts))
    sources += [e.text for e in evidence
                if getattr(e, 'kind', None) in {'LORE', 'MEMORY', 'LOCATION', 'EVENT'}
                and not getattr(e, 'secret', False)]
    if context is not None:
        if not isinstance(context, dict):
            raise ValueError('invalid_public_context')
        context = public_view(context)
        # These are the exact trusted projections supplied by narrator_context.
        for key in ('location', 'site', 'public_ledger', 'npcs'):
            if key in context:
                sources.extend(records(context[key], LABELS.get(key, key)))
        scene = context.get('scene_context')
        if isinstance(scene, dict):
            for key in SCENE_FIELDS:
                if key in scene:
                    sources.extend(records(scene[key], LABELS.get(key, key.replace('_', ' '))))
    return list(dict.fromkeys(source for source in sources if source.strip()))


def prompt_fact_catalog(state, evidence, context):
    # Bounded guidance, not a new state store. Validation uses the complete source
    # projection, so catalog truncation can never authorize an unsupported claim.
    out=[];size=0
    for source in public_fact_sources(state, evidence, context):
        if len(source)>1500: continue
        if len(out)>=80 or size+len(source)>16000: break
        out.append('FACT: '+source);size+=len(source)
    return out


def supports_public_fact(claim, sources):
    # New structured projections require an exact atomic snippet (case/whitespace
    # insensitive). Fuzzy overlap with generic labels must not authorize a
    # different location, number, NPC, polarity or combination of source records.
    normalize=lambda text: ' '.join(str(text).casefold().split())
    return normalize(claim) in {normalize(source) for source in sources}
