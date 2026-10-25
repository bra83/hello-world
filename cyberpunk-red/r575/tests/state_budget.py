"""Regression for real SQLite/CAS history growth and legacy save migration."""
import sys, zipfile, tempfile, json, copy, sqlite3, hashlib
from pathlib import Path
wheel, mode = sys.argv[1:]
root=Path(tempfile.mkdtemp(prefix='cpred-budget-test-'));zipfile.ZipFile(wheel).extractall(root/'wheel');sys.path.insert(0,str(root/'wheel'))
from barbara.state import CampaignState, _validate_canonical_value
from barbara.state_store import DurableStateStore, StateVersionConflict
from barbara.effects import EffectResolver
from barbara.engine import BarbaraEngine

def nodes(x):return 1+sum(nodes(v) for v in (x.values() if isinstance(x,dict) else x)) if isinstance(x,(dict,list,tuple)) else 1

def character():
    return {'characterId':'persistent-character','name':'Edgerunner','hp':35,'wallet':200,
      'campaignState':{'adventureState':{'adventureId':'cyberpunk_sandbox','currentLocationId':'Watson'},'world':{
       'actors':{str(i):{'id':i,'alive':True,'memories':[{'event':'event '+str(j),'known':True} for j in range(6)],'relations':{'ally':i+1,'rival':i+2}} for i in range(87)}}}}

store=DurableStateStore(str(root/'world.db'));store.create_campaign(CampaignState('budget','cyberpunk-red'))
engine=BarbaraEngine(provider=None);effects=EffectResolver();expected_events=[];first_raw=None
limit=80 if mode=='old' else 180
failed=None
for i in range(limit):
    try:
        state=store.load('budget');previous=state.state_version
        c=character();c['revision']=i
        resolution={'effects':[{'type':'player_state_set','path':'characters.one','value':c}],'metadata':{'source':'typed_save'}}
        fp=engine._fingerprint(state,'Salvar ficha',True,'normal',resolution,'GM_HELP',True)
        state.state_version=previous+1
        effects.apply(state,resolution['effects'],f'save-{i}',state.state_version)
        expected_events.append(copy.deepcopy(state.event_log[-1]))
        result={'tick':0,'state_version':state.state_version,'resolution':resolution,'effects_applied':resolution['effects']}
        if i==0:first_raw=copy.deepcopy(result)
        engine._remember_request(state,f'save-{i}',fp,result)
        store.compare_and_swap(expected_state_version=previous,new_state=state,command_id=f'save-{i}',fingerprint=hashlib.sha256(str(i).encode()).hexdigest(),response={'ok':True,'revision':i})
    except ValueError as e:
        failed=(i,str(e));break
if mode=='old':
    assert failed and failed[1]=='state_too_large',failed
    print('REPRODUCED baseline:',failed,'without large images or invalid game data')
    sys.exit(0)
assert failed is None,failed
state=store.load('budget');assert state.player_state['characters']['one']['revision']==limit-1
assert state.player_state['characters']['one']['hp']==35 and state.player_state['characters']['one']['wallet']==200
assert state.state_version==limit and nodes(state.__dict__)<100_000
history=store.load_event_history('budget');assert history==expected_events
assert engine._stored_result(state.request_log['save-0'])==first_raw
assert store.lookup_command('budget','save-0',hashlib.sha256(b'0').hexdigest())['response']=={'ok':True,'revision':0}
try:store.lookup_command('budget','save-0','0'*64)
except ValueError as e:assert str(e)=='request_id_collision'
else:raise AssertionError('Receipt collision accepted')
# Close/reopen and export/import preserve every event, payload, receipt and active fact.
version=state.state_version;store.close();store=DurableStateStore(str(root/'world.db'))
assert store.load('budget').state_version==version
backup=store.export_campaign('budget');other=DurableStateStore(str(root/'import.db'));other.import_campaign(backup)
assert other.load_event_history('budget')==history
assert other.load('budget').player_state==state.player_state
assert other.lookup_command('budget','save-0',hashlib.sha256(b'0').hexdigest())['response']=={'ok':True,'revision':0}
# Replay the earliest engine request after restart with its normalized historical fingerprint.
legacy_resolution=first_raw['resolution'];fp=engine._fingerprint(state,'Salvar ficha',True,'normal',legacy_resolution,'GM_HELP',True)
assert state.request_log['save-0']['fingerprint']==fp
changed=copy.deepcopy(legacy_resolution);changed['effects'][0]['value']['wallet']+=1
assert fp!=engine._fingerprint(state,'Salvar ficha',True,'normal',changed,'GM_HELP',True)
# Reproduce a near-limit pre-upgrade save and migrate it without advancing time/version.
legacy=CampaignState('legacy','cyberpunk-red').to_dict();legacy['player_state']={'characters':{'one':character()}}
event=expected_events[0];count=0
while nodes(legacy)+nodes(event)<96_000:
    e=copy.deepcopy(event);e['event_id']=f'legacy-{count}';e['request_id']=f'legacy-{count}';legacy['event_log'].append(e);count+=1
raw=json.dumps(legacy);store.create_campaign(CampaignState('legacy','cyberpunk-red'))
store._db.execute('UPDATE campaigns SET state_json=? WHERE campaign_id=?',(raw,'legacy'))
loaded=store.load('legacy');assert loaded.state_version==0 and loaded.tick==0
assert loaded.player_state==legacy['player_state'];assert store.load_event_history('legacy')==legacy['event_log']
# Existing node/depth/value limits still reject genuinely oversized current facts.
bad=CampaignState('bad','cyberpunk-red');bad.player_state={'large':list(range(100_001))}
try:bad.validate()
except ValueError as e:assert str(e)=='state_too_large'
else:raise AssertionError('Canonical limit was bypassed')
# An archive write followed by an UPDATE failure must roll back as a single transaction.
store.create_campaign(CampaignState('atomic','cyberpunk-red'))
atomic=copy.deepcopy(legacy);atomic['campaign_id']='atomic';raw_atomic=json.dumps(atomic)
store._db.execute('UPDATE campaigns SET state_json=? WHERE campaign_id=?',(raw_atomic,'atomic'))
store._db.execute("CREATE TRIGGER reject_compaction BEFORE UPDATE ON campaigns WHEN OLD.campaign_id='atomic' BEGIN SELECT RAISE(ABORT,'test_disk_failure'); END")
try:store.load('atomic')
except sqlite3.IntegrityError:pass
else:raise AssertionError('Injected storage failure not observed')
assert store._db.execute("SELECT COUNT(*) FROM event_archives WHERE campaign_id='atomic'").fetchone()[0]==0
assert store._db.execute("SELECT state_json FROM campaigns WHERE campaign_id='atomic'").fetchone()[0]==raw_atomic
# Malformed old events cannot be hidden in an archive by the migration.
store._db.execute('DROP TRIGGER reject_compaction');atomic['event_log'][0]['payload']={'invalid':float('nan')}
poison=json.dumps(atomic);store._db.execute('UPDATE campaigns SET state_json=? WHERE campaign_id=?',(poison,'atomic'))
try:store.load('atomic')
except ValueError:pass
else:raise AssertionError('Invalid archived data was accepted')
assert store._db.execute("SELECT COUNT(*) FROM event_archives WHERE campaign_id='atomic'").fetchone()[0]==0
print('PASS: 180 durable saves; lossless event history and request replay; legacy migration; restart; backup/import; collision rejection; canonical limits; atomic rollback; invalid-data rejection')
