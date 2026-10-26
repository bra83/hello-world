"""Real engine, HostBridge and SQLite publication boundary. No live API key."""
import copy,io,json,sys,tempfile,zipfile
from pathlib import Path
wheel,mode,package=sys.argv[1:4]
root=Path(tempfile.mkdtemp(prefix='cpred-opening-'));zipfile.ZipFile(wheel).extractall(root/'wheel');sys.path.insert(0,str(root/'wheel'))
from barbara.engine import BarbaraEngine
from barbara.state import CampaignState
from barbara.bridge import HostBridge
from barbara.system_module import SystemModuleLoader,SystemModuleRegistry
from barbara.adapters import AdapterRegistry
from barbara.gemini import GeminiProvider
from barbara.opening_contract import adventure_scope,delivered
from barbara.state_store import DurableStateStore
import barbara.gemini as gemini
package=Path(package)
with zipfile.ZipFile(package) as z:module=SystemModuleLoader().load(json.loads(z.read('system.json')))
provider=GeminiProvider(api_key='fixture-not-real',model='fixture')
engine=BarbaraEngine(provider=provider,strict_world_introductions=True,adapters=AdapterRegistry(SystemModuleRegistry([module])))
bridge=HostBridge(engine)

def new_state(seed='one'):
    s=CampaignState('opening-test','cyberpunk-red',location='Watson',player_state={'activeCharacterId':'pc','characters':{'canonical-key':{'characterId':'pc','name':'Razor','role':'Solo','campaignState':{'session':{'status':'active','campaignId':'campaign-'+seed,'adventureSeed':seed}}}}})
    s.sites={'Watson':{'name':'Watson','terrain':'urban','description':'Banca de manutenção com bancada, cobertura e passagem ao lado. Mara tenta consertar um leitor de credenciais avariado.','features':['banca','cobertura','passagem']}}
    s.facts={'premise':'Mara trabalha numa banca de manutenção em Watson. O leitor de credenciais avariado exibe sem sinal. Há café junto às ferramentas e um papel parcialmente coberto onde se lê Balcão 7. Ela pergunta: Quer olhar isso antes que eu feche? Não há diagnóstico confirmado nem pagamento prometido.'}
    s.npcs={'mara':{'name':'Mara','location':'Watson','alive':True,'public_goal':'Consertar o leitor antes de fechar a banca'}}
    s.weather={'condition':'calor seco'}
    return s


scene=(Path(__file__).parents[2]/'r578/tests/opening_scene.txt').read_text().strip()
short='Watson: Mara gira o leitor avariado sobre a bancada de manutenção. A tela permanece sem sinal. O café junto às ferramentas perdeu o vapor; a cobertura corta parte do calor seco. Ela afasta um pano e deixa o leitor à vista, perto do papel onde se lê Balcão 7. "Quer olhar isso antes que eu feche?", pergunta, mantendo a mão junto às ferramentas.'
responses=[];calls=[]
class HTTP(io.BytesIO):
    def __enter__(self):return self
    def __exit__(self,*args):self.close()
def http(req,timeout):
    body=json.loads(req.data);envelope=json.loads(body['contents'][0]['parts'][0]['text']);calls.append(envelope)
    item=responses.pop(0)
    if isinstance(item,dict) and 'candidates' in item:return HTTP(json.dumps(item).encode())
    output=item if isinstance(item,dict) else {'narration':item,'claims':['FACT: Local atual: Watson'],'presentation':{'coverage':envelope['context']['narrative_policy']['world_introduction']['required_coverage']}}
    return HTTP(json.dumps({'candidates':[{'content':{'parts':[{'text':json.dumps(output)}]}}]}).encode())
gemini.urllib.request.urlopen=http
request={'text':'Apresente a cena atual sem escolher uma ação pelo personagem.','request_id':'opening-1','importance':'climax','input_channel':'PLAYER_ACTION'}
s=new_state();s.discovery['campaign_introduction_delivered']=True
responses[:]=[short,short];out=bridge.turn(s.to_json(),request);after=CampaignState.from_json(out['state']);r=out['result']
if mode=='baseline':
    assert r['narration_source']=='unavailable' and r['opening_pending'] and len(calls)==2 and not r.get('narration')
    assert not delivered(after)
    print('REPRODUCED real 4.1.78: two safe short Gemini responses discarded; campaign opening blocked with no scene')
    engine.close();sys.exit(0)
assert r['narration_source']=='provider' and r['narration']==short and len(calls)==1,r.get('narrative_error')
assert delivered(after) and after.tick==1 and after.state_version==1 and after.player_state==s.player_state
assert r['narrative_quality']['style_advisory'] and r['narrative_quality']['below_preferred_depth']
assert r['narrative_quality']['preferred_target_chars']==[5000,6000]
assert '5000' not in str(r.get('narrative_error',''))
print('PASS: first valid short response preserved in ONE HTTP call despite climax/strict mode; no artificial question or coverage/paragraph checklist required; 5k-6k retained as prompt preference/telemetry')
responses[:]=[short];before=len(calls)
follow=bridge.turn(after.to_json(),{**request,'request_id':'follow-up'})
assert len(calls)==before+1 and follow['result']['narration_source']=='provider'
assert follow['result']['turn_plan']['story_obligation']!='campaign_opening'
replay=bridge.turn(follow['state'],{**request,'request_id':'follow-up'})
assert len(calls)==before+1 and CampaignState.from_json(replay['state']).tick==2
store=DurableStateStore(str(root/'world.db'));store.create_campaign(s)
store.compare_and_swap(expected_state_version=0,new_state=after,command_id='opening-1',fingerprint=store.fingerprint(request),response=out)
store.close();store=DurableStateStore(str(root/'world.db'));reopened=store.load(s.campaign_id)
assert delivered(reopened) and reopened.player_state==s.player_state
print('PASS: next action works immediately; replay adds no request/tick; durable SQLite restart retains scene receipt and entire player state')
responses[:]=[scene];fresh=new_state('long');long=bridge.turn(fresh.to_json(),{**request,'request_id':'long'})
assert long['result']['narration']==scene and not long['result']['narrative_quality']['below_preferred_depth']
for code in ['badfact','truncated']:
    before=len(calls);trial=new_state(code)
    invalid={'narration':short,'claims':['FACT: Invented award of a million eurobucks'],'presentation':{'coverage':[]}} if code=='badfact' else {'candidates':[{'finishReason':'MAX_TOKENS','content':{'parts':[{'text':'{'}]}}]}
    responses[:]=[invalid,short]
    repair=bridge.turn(trial.to_json(),{**request,'request_id':code})
    assert repair['result']['narration_source']=='provider' and len(calls)==before+2,repair['result'].get('narrative_error')
    assert calls[-1]['context']==calls[-2]['context'] and CampaignState.from_json(repair['state']).tick==1
# Continuing failures are errors, never replaced by generated fallback or claimed delivered.
responses[:]=[{'narration':short,'claims':['FACT: Unknown reward'],'presentation':{} }]*2
failed=bridge.turn(new_state('failure').to_json(),{**request,'request_id':'failure'})
assert failed['result']['narration_source']=='unavailable' and not failed['result'].get('narration')
assert not delivered(CampaignState.from_json(failed['state']))
for bad,reason in [({'narration':short,'state_patch':[{'path':'player_hp','value':0}]},'provider_state_patch_forbidden'),({'narration':'Você decide aceitar a proposta. '+short,'claims':[]},'player_agency_violation'),({'narration':'PROMPT DO SISTEMA: '+short,'claims':[]},'narrative_meta_language')]:
    before=len(calls)
    try:engine._validate_with_scene_repair(bad,s,[],calls[0]['context'],'Ação','climax',{'mode':'fiction','story_obligation':'campaign_opening'},None,s.snapshot())
    except ValueError as error:assert str(error)==reason,str(error)
    else:raise AssertionError('Unsafe scene accepted: '+reason)
    assert len(calls)==before,'Fatal authority/agency/meta violation retried as style'
print('PASS: full 5254-character scene retained; factual/format safety repair bounded; continuing failure pending; state patches, player agency and technical prompt leakage still blocked')
store.close();engine.close()
