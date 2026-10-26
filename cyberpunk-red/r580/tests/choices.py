from pathlib import Path
import io,json
# Same production HostBridge/SystemModule setup as the retained narration regression.
setup=(Path(__file__).parents[2]/'r579/tests/flow.py').read_text().split('scene=(')[0]
exec(compile(setup,'host_setup.py','exec'))
choices=['Perguntar a Mara o que aconteceu com o leitor','Examinar o leitor sem desmontá-lo','Observar a banca e a passagem ao lado']
class HTTP(io.BytesIO):
 def __enter__(self):return self
 def __exit__(self,*a):self.close()
def http(request,timeout):
 body=json.loads(request.data)
 assert 'recommendedActions' in body['generationConfig']['responseSchema']['properties']['presentation']['properties']
 out={'narration':'Mara mantém o leitor sem sinal à vista na bancada de manutenção em Watson. O papel onde se lê Balcão 7 está parcialmente coberto. Ela aguarda junto às ferramentas.','claims':['FACT: Local atual: Watson'],'presentation':{'coverage':[],'recommendedActions':choices}}
 return HTTP(json.dumps({'candidates':[{'content':{'parts':[{'text':json.dumps(out)}]}}]}).encode())
gemini.urllib.request.urlopen=http
s=new_state();out=bridge.turn(s.to_json(),{'text':'Apresente a cena atual.','request_id':'choices','importance':'climax','input_channel':'PLAYER_ACTION'})
assert out['result']['narration_source']=='provider',out['result'].get('narrative_error')
assert out['result']['presentation']['recommendedActions']==choices
assert CampaignState.from_json(out['state']).player_state==s.player_state
assert CampaignState.from_json(out['state']).tick==1
engine.close()
print('PASS: optional concrete Gemini choices survive real schema/parser/engine/pipeline without applying any player action or mutating the character')
