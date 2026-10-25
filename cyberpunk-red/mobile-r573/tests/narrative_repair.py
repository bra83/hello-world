"""Check the exact patched wheel; never call an external model."""
import sys, zipfile, ast, types
wheel=sys.argv[1]
with zipfile.ZipFile(wheel) as z:
    ns={};exec(z.read('barbara/narrative.py'),ns)
    policy=ns['NarrativePolicy']()
    for text in ['Como você reage?', 'A mulher aguarda sua resposta.', 'Você pode falar com ela ou examinar a porta.', 'O que você faz?']:
        assert policy.validate_scene_ending(text,'climax')
    try: policy.validate_scene_ending('Ele fecha a porta e a cena termina.','climax')
    except ValueError as e: assert str(e)=='cena_sem_abertura_para_decisao'
    else: raise AssertionError('The decision gate was disabled')
    tree=ast.parse(z.read('barbara/engine.py'))
    method=next(n for n in ast.walk(tree) if isinstance(n,ast.FunctionDef) and n.name=='_validate_with_scene_repair')
    ns={};exec(compile(ast.Module(body=[method],type_ignores=[]),'repair','exec'),ns)
    calls=[]
    class Provider:
        enforce_story_contract=True
        def generate(self,text,context,state):calls.append((text,context,state));return {'narration':'Como você reage?'}
    def validate(raw,*args):
        policy.validate_scene_ending(raw['narration'],'climax');return raw
    host=types.SimpleNamespace(provider=Provider(),_validate_provider_output=validate)
    retry=ns['_validate_with_scene_repair']
    context={'authorized':'same facts'};state={'version':9}
    out=retry(host,{'narration':'Cena sem convite.'},None,None,context,'Ação original','climax',None,None,state)
    assert out['narration']=='Como você reage?' and len(calls)==1 and calls[0][1] is context and calls[0][2] is state
    calls.clear()
    retry(host,{'narration':'O que você faz?'},None,None,context,'Ação original','climax',None,None,state)
    assert not calls
    def reject(*args):raise ValueError('provider_state_patch_forbidden')
    host._validate_provider_output=reject
    try:retry(host,{},None,None,context,'Ação','climax',None,None,state)
    except ValueError as e:assert str(e)=='provider_state_patch_forbidden'
    else:raise AssertionError('Mechanical authority bypassed')
    assert not calls
print('PASS: natural PT-BR decision gate; bounded presentation-only repair; valid response not retried; state-patch rejection unchanged')
