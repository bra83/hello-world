"""Real engine, HostBridge and SQLite publication boundary. No live API key."""
import copy,io,json,sys,tempfile,zipfile
from pathlib import Path
wheel,baseline=sys.argv[1:]
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
package=Path(wheel).parent.parent/'src/main/assets/barbara/cyberpunk-red-4.0.0.zip'
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

# An already-used world must still offer an opening for a new host adventure.
s=new_state();s.discovery['campaign_introduction_delivered']=True
assert engine._story_occasion(s,{'mode':'fiction'})=='campaign_opening'
with zipfile.ZipFile(baseline) as z:
    ns={'__name__':'barbara.baseline_narrative','__package__':'barbara'};exec(z.read('barbara/narrative.py'),ns)
assert ns['NarrativePolicy'].STORY_TARGETS['campaign_opening'][0]==1800
assert engine.narrative.STORY_TARGETS['campaign_opening']==(5000,6000)
print('REPRODUCED baseline: 1800-character opening target and world-global receipt did not identify a new character adventure')

# A deliberately varied, concrete fixture, with no fabricated lore/mechanics. The
# exact prose is test data, not a fallback shipped to the player.
valid=(Path(__file__).parent/'opening_scene.txt').read_text().strip()
assert 5000<=len(valid)<=6000,len(valid)
short='Watson está diante de Razor. A luz é moderada e os sons do ambiente chegam de longe. '+('A atmosfera da cidade pede atenção. '*25)+'O que você faz?'
responses=[];calls=[];snapshots=[]
class HTTP(io.BytesIO):
    def __enter__(self):return self
    def __exit__(self,*args):self.close()
def http(req,timeout):
    body=json.loads(req.data);assert body['generationConfig']['maxOutputTokens']==8192
    envelope=json.loads(body['contents'][0]['parts'][0]['text']);calls.append(envelope)
    assert envelope['context']['narrative_policy']['world_introduction']['target_chars']==[5000,6000]
    text=responses.pop(0)
    if isinstance(text,dict):return HTTP(json.dumps(text).encode())
    coverage=envelope['context']['narrative_policy']['world_introduction']['required_coverage']
    out={'narration':text,'claims':['FACT: Local atual: Watson'],'presentation':{'coverage':coverage}}
    return HTTP(json.dumps({'candidates':[{'content':{'parts':[{'text':json.dumps(out)}]}}]}).encode())
gemini.urllib.request.urlopen=http
responses[:]=[short,valid]
request={'text':'Apresente a cena atual sem escolher uma ação pelo personagem.','request_id':'opening-1','importance':'climax','input_channel':'PLAYER_ACTION'}
out=bridge.turn(s.to_json(),request);after=CampaignState.from_json(out['state']);r=out['result']
if r['narration_source']!='provider':
    try:engine._validate_provider_output({'narration':valid,'claims':['FACT: Local atual: Watson'],'presentation':{'coverage':calls[0]['context']['narrative_policy']['world_introduction']['required_coverage']}},after,[],calls[0]['context'],request['text'],'climax',r['turn_plan'],None)
    except Exception as error:print('Detailed gate:',error)
assert r['narration_source']=='provider' and r.get('narration')==valid, {k:v for k,v in r.items() if k in ['narrative_error','narration_source','narrative_fallback_reason']}
assert len(calls)==2 and calls[0]['context']==calls[1]['context']
assert delivered(after) and after.tick==1 and after.state_version==1
assert after.player_state==s.player_state
print('PASS: real Gemini JSON + full HostBridge/pipeline: short first response repaired automatically to',len(valid),'characters; one tick/version; player state intact; validated delivery scoped to adventure')
# Real durable commit and restart retain delivery metadata and every player field.
store=DurableStateStore(str(root/'world.db'));store.create_campaign(s)
store.compare_and_swap(expected_state_version=0,new_state=after,command_id='opening-1',fingerprint=store.fingerprint(request),response=out)
store.close();store=DurableStateStore(str(root/'world.db'));reopened=store.load(s.campaign_id)
assert delivered(reopened) and reopened.player_state==s.player_state
# Same character, different adventure seed in an already-introduced world.
reopened.player_state['characters']['canonical-key']['campaignState']['session']['adventureSeed']='two'
assert not delivered(reopened) and engine._story_occasion(reopened,{'mode':'fiction'})=='campaign_opening'
responses[:]=[short,short];before=len(calls)
req2={**request,'request_id':'opening-2'}
out2=bridge.turn(reopened.to_json(),req2);failed=CampaignState.from_json(out2['state']);r2=out2['result']
assert r2['narration_source']=='unavailable' and r2['opening_pending'] and not r2.get('narration')
assert not delivered(failed) and len(calls)==before+2
assert failed.tick==2 and failed.state_version==2
responses[:]=[valid]
out3=bridge.turn(failed.to_json(),{**request,'request_id':'opening-3'});repaired=CampaignState.from_json(out3['state'])
assert out3['result']['turn_plan']['story_obligation']=='campaign_opening' and delivered(repaired)
assert out3['result']['narration']==valid
print('PASS: new adventure in used world still requires full opening; two short responses stay pending without fallback text/receipt; next request is still an opening; SQLite restart retains metadata')
# Authority rejection cannot be repaired by dropping/reclassifying a state patch.
raw={'narration':valid,'claims':[],'state_patch':[{'path':'player_hp','value':0}]}
try:engine._validate_with_scene_repair(raw,s,[],calls[0]['context'],'Ação','climax',{'mode':'fiction','story_obligation':'campaign_opening'},None,s.snapshot())
except ValueError as e:assert str(e)=='provider_state_patch_forbidden'
else:raise AssertionError('Provider state patch was accepted')
# Provider format repair is bounded; split content excludes thought text.
for malformed in (
    {'candidates':[{'finishReason':'MAX_TOKENS','content':{'parts':[{'text':'{'}]}}]},
    {'candidates':[{'content':{'parts':[{'text':'not JSON'}]}}]},
):
    trial=new_state('format-'+str(len(calls)));before=len(calls);responses[:]=[malformed,valid]
    fixed=bridge.turn(trial.to_json(),{**request,'request_id':'format-'+str(before)})
    assert fixed['result']['narration_source']=='provider',fixed['result'].get('narrative_error')
    assert len(calls)==before+2 and delivered(CampaignState.from_json(fixed['state']))
    assert calls[-1]['context']==calls[-2]['context']
    assert CampaignState.from_json(fixed['state']).tick==1
out_json=json.dumps({'narration':valid,'claims':['FACT: Local atual: Watson'],'presentation':{'coverage':calls[-1]['context']['narrative_policy']['world_introduction']['required_coverage']}})
responses[:]=[{'candidates':[{'content':{'parts':[{'thought':True,'text':'private reasoning'},{'text':out_json[:130]},{'text':out_json[130:]}]}}]}]
trial=new_state('split');before=len(calls)
split=bridge.turn(trial.to_json(),{**request,'request_id':'split'})
assert split['result']['narration']==valid and len(calls)==before+1
# A replay cannot request another scene or apply another tick.
replay=bridge.turn(split['state'],{**request,'request_id':'split'})
assert len(calls)==before+1 and CampaignState.from_json(replay['state']).tick==CampaignState.from_json(split['state']).tick
print('PASS: invalid JSON/truncated response corrected in exactly two HTTP calls with same context; split content ignores thoughts; valid first response uses one call; request replay adds no call/tick')
store.close();engine.close()
print('PASS: provider mechanical authority remains forbidden; no generated fallback padding or repeated text is used to meet the length contract')
