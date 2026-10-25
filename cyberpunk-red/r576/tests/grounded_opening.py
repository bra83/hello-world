"""Reproduce the shipped gate and exercise the real engine/Gemini JSON boundary.
HTTP responses are injected: no API credential, quota or network dependency.
"""
import ast,copy,io,json,sys,tempfile,types,zipfile
from pathlib import Path
wheel,baseline=sys.argv[1:]
root=Path(tempfile.mkdtemp(prefix='cpred-grounding-'))
zipfile.ZipFile(wheel).extractall(root);sys.path.insert(0,str(root))
from barbara.grounding import ClaimGrounding
from barbara.grounding_context import prompt_fact_catalog,public_fact_sources
from barbara.state import CampaignState
from barbara.engine import BarbaraEngine
from barbara.gemini import GeminiProvider
import barbara.gemini as gemini

state=CampaignState('grounding-test','cyberpunk-red',location='Watson')
context={'location':'Watson','scene_context':{'location_name':'Watson','description':'As fachadas exibem letreiros gastos.',
 'setting_context':{'region':'Night City'},'private_agenda':'VENENO_SECRETO'},
 'player_input':'O cofre contém 9000 créditos.','narrative_policy':{'instruction':'O dragão está morto.'},
 'fact_grounding':['FACT: Existe um dragão.']}
claim='FACT: Local atual: Watson'
with zipfile.ZipFile(baseline) as z:
    ns={'__name__':'barbara.baseline_grounding','__package__':'barbara'};exec(z.read('barbara/grounding.py'),ns)
try:ns['ClaimGrounding']().validate([claim],state,[],[],context)
except ValueError as e:assert str(e)=='fato_claim_sem_evidencia'
else:raise AssertionError('Baseline did not reproduce the actual failure')
print('REPRODUCED 4.1.75: canonical location in narrator context rejected as unsupported FACT')
gate=ClaimGrounding()
assert gate.validate([claim],state,[],[],context)==[claim]
assert gate.validate(['FACT: setting context / Região: Night City'],state,[],[],context)
assert gate.validate(['FACT: Descrição: As fachadas exibem letreiros gastos.'],state,[],[],context)
for bad in ['FACT: Local atual: Marte','FACT: Local atual: Watson e Marte',
            'FACT: O cofre contém 9000 créditos.','FACT: Existe um dragão.',
            'FACT: VENENO_SECRETO','RULE: Local atual: Watson','RUMOR: Local atual: Watson']:
    try:gate.validate([bad],state,[],[],context)
    except ValueError:pass
    else:raise AssertionError('Unauthorized claim accepted: '+bad)
evidence=[types.SimpleNamespace(kind='LOCATION',text='As placas identificam Watson.',secret=False),
          types.SimpleNamespace(kind='EVENT',text='Uma greve interrompeu o transporte.',secret=False),
          types.SimpleNamespace(kind='LORE',text='O líder secreto morreu.',secret=True)]
assert gate.validate(['FACT: As placas identificam Watson.','FACT: Uma greve interrompeu o transporte.'],state,evidence,[],context)
cat=prompt_fact_catalog(state,evidence,context)
assert claim in cat and all('VENENO' not in s and 'dragão' not in s and '9000' not in s for s in cat)
for item in cat:assert gate.validate([item],state,evidence,[],context)
print('PASS: atomic location/geography/LOCATION/EVENT evidence; invented location, combined facts, secrets, user input and injected catalog rejected')

# Full GeminiProvider serialization/schema/parser + real turn and post-commit
# validation. Fail first FACT, then repair the presentation of the SAME turn.
provider=GeminiProvider(api_key='fixture-not-a-real-key',model='fixture-gemini')
from barbara.system_module import SystemModuleLoader,SystemModuleRegistry
from barbara.adapters import AdapterRegistry
package=Path(wheel).parent.parent/'src/main/assets/barbara/cyberpunk-red-4.0.0.zip'
with zipfile.ZipFile(package) as z:module=SystemModuleLoader().load(json.loads(z.read('system.json')))
engine=BarbaraEngine(provider=provider,strict_world_introductions=False,adapters=AdapterRegistry(SystemModuleRegistry([module])))
s=CampaignState('opening','cyberpunk-red',location='Watson',player_state={'hp':35,'wallet':200})
paragraph='Watson se estende ao redor. O local permanece Watson. O personagem está em Watson, no mesmo local da cena. A situação continua aberta e nenhuma decisão foi tomada pelo personagem. '
narration='\n\n'.join([paragraph]*6)+'\n\nO que você faz?'
calls=[];snapshots=[];responses=[]
class Response(io.BytesIO):
    def __enter__(self):return self
    def __exit__(self,*args):self.close()
def http(request,timeout):
    envelope=json.loads(json.loads(request.data)['contents'][0]['parts'][0]['text'])
    calls.append(envelope);snapshots.append(copy.deepcopy(s.to_dict()))
    assert claim in envelope['context']['fact_grounding']
    claims=responses.pop(0)
    payload={'candidates':[{'content':{'parts':[{'text':json.dumps({'narration':narration,'claims':claims,'presentation':{'coverage':[]}})}]}}]}
    return Response(json.dumps(payload).encode())
gemini.urllib.request.urlopen=http
responses[:]=[['FACT: Local atual: Marte'],[claim]]
result=engine.turn(s,'Descreva o começo da aventura','opening-command',importance='normal')
assert result['claims']==[claim] and result['narration']==narration and len(calls)==2
assert calls[0]['context']==calls[1]['context'] and snapshots[0]==snapshots[1]
assert s.tick==1 and s.state_version==1 and s.player_state=={'hp':35,'wallet':200}
assert result.get('narrative_error') is None
replayed=engine.turn(s,'Descreva o começo da aventura','opening-command',importance='normal')
assert replayed['claims']==[claim] and len(calls)==2 and s.tick==1
print('PASS: real Gemini JSON request/response + full engine turn, bounded repair, same context and canonical snapshot, one tick/version, replay without provider call')
# Second response is validated, never silently relabelled or stripped.
responses[:]=[['FACT: Local atual: Marte'],['FACT: Local atual: Marte']]
before=len(calls)
try:engine.turn(s,'Descreva a situação atual','second-command',importance='normal')
except ValueError as e:assert str(e)=='fato_claim_sem_evidencia'
else:raise AssertionError('Second unsupported response bypassed gate')
assert len(calls)==before+2 and s.tick==2 and s.state_version==2
assert s.player_state=={'hp':35,'wallet':200}
assert s.request_log['second-command']['result']['narrative_error']
# State mutations / player agency remain fatal without a presentation retry.
raw={'narration':narration,'claims':[claim],'state_patch':[{'path':'player_hp','value':0}]}
before=len(calls)
try:engine._validate_with_scene_repair(raw,s,[],context,'Ação', 'normal',None,None,s.snapshot())
except ValueError as e:assert str(e)=='provider_state_patch_forbidden'
else:raise AssertionError('Provider state patch accepted')
assert len(calls)==before
engine.close()
print('PASS: repeated unsupported FACT still fails after two calls; mechanical patch never retried/accepted; current player values unchanged')
