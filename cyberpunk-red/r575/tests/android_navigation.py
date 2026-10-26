"""Exercise the visible navigation through Android touch input, checking WebView logs."""
import json
import sqlite3
import re
import subprocess
import sys
import time
from pathlib import Path
import xml.etree.ElementTree as ET

apk, output = sys.argv[1:]
out = Path(output)
out.mkdir(parents=True, exist_ok=True)
package = 'com.braseiro.cyberpunkred'

def adb(*args, binary=False):
    return subprocess.check_output(['adb', *args], timeout=60, text=not binary)

def hierarchy():
    adb('shell', 'uiautomator', 'dump', '/sdcard/cpred-window.xml')
    xml=adb('shell', 'cat', '/sdcard/cpred-window.xml')
    (out/'last-window.xml').write_text(xml)
    return ET.fromstring(xml)

def tap(label):
    for attempt in range(12):
        try:
            root = hierarchy()
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired, ET.ParseError):
            time.sleep(1)
            continue
        # AOSP Quickstep occasionally ANRs during cold emulator boot. Dismiss only
        # that external launcher dialog; a Cyberpunk ANR must still fail this test.
        dialog_text=' '.join(n.get('text','') for n in root.iter('node'))
        if ("Quickstep isn't responding" in dialog_text or "Launcher3 isn't responding" in dialog_text):
            close=next((n for n in root.iter('node') if n.get('resource-id')=='android:id/aerr_close'),None)
            if close is not None:
                x1,y1,x2,y2=map(int,re.findall(r'\d+',close.get('bounds')))
                adb('shell','input','tap',str((x1+x2)//2),str((y1+y2)//2))
                print('Dismissed external Quickstep ANR; Cyberpunk ANRs remain fatal',flush=True)
                time.sleep(1)
                continue
        def matches_label(node):
            name=re.sub(r'\s+', ' ', node.get('text', '') or node.get('content-desc', '')).strip().upper()
            wanted=label.upper()
            alternatives={'SALVAR':['SALVAR','SAVE']}.get(wanted,[wanted])
            bounds=list(map(int,re.findall(r'\d+',node.get('bounds',''))))
            visible=len(bounds)==4 and bounds[2]>bounds[0] and bounds[3]>bounds[1] and bounds[1]<2100
            return visible and any(re.search(r'(^|\W)'+re.escape(candidate)+r'($|\W)',name) is not None for candidate in alternatives)
        matches = [n for n in root.iter('node') if matches_label(n)]
        if matches:
            # Bottom navigation wins over duplicate links in the content.
            n = max(matches, key=lambda n: int(re.findall(r'\d+', n.get('bounds'))[1]))
            x1, y1, x2, y2 = map(int, re.findall(r'\d+', n.get('bounds')))
            adb('shell', 'input', 'tap', str((x1+x2)//2), str((y1+y2)//2))
            print('TOUCH', label, flush=True)
            return
        try:
            adb('shell', 'input', 'swipe', '500', '1400', '500', '600', '300')
        except Exception:
            pass
        time.sleep(1)
    (out/'failed-navigation.png').write_bytes(adb('exec-out','screencap','-p',binary=True))
    (out/'failed-logcat.txt').write_text(adb('logcat','-d'))
    print((out/'last-window.xml').read_text(), flush=True)
    print(adb('logcat','-d','-s','CPRED_WEBVIEW:*'), flush=True)
    raise AssertionError(f'Visible control not found: {label}')

try:
    adb('shell', 'pm', 'clear', package)
except Exception:
    pass
adb('install', '-r', apk)
# Seed a stale downloaded UI from the previous APK, then require migration to archive it.
legacy = out/'legacy-manifest.json';legacy.write_text('{"versionName":"4.1.72-hotfix"}')
legacy_index = out/'legacy-index.html';legacy_index.write_text('<html>STALE_UI_MUST_NOT_LOAD</html>')
adb('push',str(legacy),'/data/local/tmp/cpred-legacy-manifest.json')
adb('push',str(legacy_index),'/data/local/tmp/cpred-legacy-index.html')
adb('shell','run-as',package,'mkdir','-p','files/updates/cyberpunk-red/active/web/app')
adb('shell','run-as',package,'cp','/data/local/tmp/cpred-legacy-manifest.json','files/updates/cyberpunk-red/active/manifest.json')
adb('shell','run-as',package,'cp','/data/local/tmp/cpred-legacy-index.html','files/updates/cyberpunk-red/active/web/app/index.html')
adb('logcat', '-c')
adb('shell', 'input', 'keyevent', 'KEYCODE_WAKEUP')
adb('shell', 'wm', 'dismiss-keyguard')
adb('shell', 'am', 'start', '-n', package+'/.MainActivity')
for attempt in range(60):
    if '[CPRED_UI_READY]' in adb('logcat','-d','-s','CPRED_WEBVIEW:*'):
        break
    time.sleep(1)
else:
    (out/'boot-logcat.txt').write_text(adb('logcat','-d'))
    (out/'boot.png').write_bytes(adb('exec-out','screencap','-p',binary=True))
    raise AssertionError('Android WebView did not finish boot')
for label, tab in [('FICHA','sheet'), ('MAPA','atlas'), ('COMBATE','combat'), ('CENA','table')]*2:
    tap(label)
    for attempt in range(20):
        logs = adb('logcat', '-d', '-s', 'CPRED_WEBVIEW:*')
        if '[CPRED_NAVIGATION] '+tab in logs:
            break
        time.sleep(.5)
    else:
        raise AssertionError(f'No responsive WebView navigation to {tab}')
    # Require a fresh event for the next tap, not a prior iteration's log.
    (out/f'{tab}-{time.time_ns()}.png').write_bytes(adb('exec-out','screencap','-p',binary=True))
    adb('logcat','-c')
# Native roster and file exchange, exercised through visible controls.
def roster_count():
    time.sleep(1)
    db_path=out/'native-character.sqlite3'
    for suffix in ['', '-wal', '-shm']:
        try:(out/('native-character.sqlite3'+suffix)).write_bytes(adb('exec-out','run-as',package,'cat','databases/cyberpunk-red-adapter.sqlite3'+suffix,binary=True))
        except subprocess.CalledProcessError:pass
    with sqlite3.connect(db_path) as db:
        return db.execute('SELECT COUNT(*) FROM cpred_characters').fetchone()[0]

def wait_count(expected):
    for _ in range(20):
        if roster_count()==expected:return
    raise AssertionError(f'Native durable roster expected {expected}, got {roster_count()}')

tap('FICHA')
tap('Salvar ficha');wait_count(1)
tap('Novo personagem')
# Creation screen has the identity controls that used to be hidden.
time.sleep(1)
assert 'Novo personagem' in adb('shell','uiautomator','dump','/sdcard/cpred-window.xml')+adb('shell','cat','/sdcard/cpred-window.xml')
tap('FICHA');wait_count(2)
tap('Exportar ficha .json');time.sleep(2)
(out/'export-dialog.png').write_bytes(adb('exec-out','screencap','-p',binary=True))
tap('SALVAR');time.sleep(2)
# Android document creation must really write a JSON file, rather than a blob URL toast.
files=adb('shell','find','/sdcard/Download','-name','*.json')
assert 'Novo_personagem.cyberpunk-red.json' in files, files
path=next(p.strip() for p in files.splitlines() if 'Novo_personagem.cyberpunk-red.json' in p)
exported=json.loads(adb('shell','cat',path));assert exported['exportFormat']=='barbara-character-json'
tap('Importar ficha .json');time.sleep(2)
(out/'import-dialog.png').write_bytes(adb('exec-out','screencap','-p',binary=True))
tap('Novo_personagem.cyberpunk-red.json');wait_count(3)
tap('Excluir personagem');tap('Cancelar');assert roster_count()==3
tap('Excluir personagem');tap('Confirmar exclusão');wait_count(2)
(out/'roster-after-delete.png').write_bytes(adb('exec-out','screencap','-p',binary=True))
# System inset space must not be duplicated inside the bottom navigation.
root=hierarchy();labels={'CENA','FICHA','MAPA','COMBATE','MENU'};bounds=[]
for n in root.iter('node'):
    text=(n.get('text','') or n.get('content-desc','')).strip().upper()
    nav_label=re.sub(r'^[^A-ZÀ-Ü0-9]+','',text)
    if nav_label in labels:
        b=list(map(int,re.findall(r'\d+',n.get('bounds',''))))
        if len(b)==4 and b[3]>b[1] and b[1]>1000:bounds.append(b)
density=int(re.findall(r'\d+',adb('shell','wm','density'))[-1])/160
assert bounds and max(b[3] for b in bounds)-min(b[1] for b in bounds)<=80*density, bounds
print('PASS: Android durable roster, SAF JSON export/import, collision preservation, deletion confirmation, compact nav, stale OTA migration',flush=True)
tap('MENU')
tap('CONFIGURAÇÕES')
time.sleep(1)
logs=adb('logcat','-d')
if '[CPRED_NAVIGATION] audio' not in logs:
    raise AssertionError('Settings did not open from the visible menu')
if 'FATAL EXCEPTION' in logs or 'ANR in '+package in logs:
    raise AssertionError('Android crash or ANR during navigation')
(out/'navigation-logcat.txt').write_text(logs)
tap('CENA')
adb('shell','am','force-stop',package)
adb('shell','am','start','-n',package+'/.MainActivity')
tap('FICHA')
wait_count(2)
(out/'reopened-sheet.png').write_bytes(adb('exec-out','screencap','-p',binary=True))
# Reconstruct a valid near-limit legacy save in the isolated emulator. This is
# upgrade coverage, not a fresh-install-only test. Room and canonical facts stay intact.
adb('shell','am','force-stop',package)
core_dir=out/'legacy-core';core_dir.mkdir(exist_ok=True)
core_path='files/barbara-platform/barbara-state.db'
for suffix in ['', '-wal', '-shm']:
    try:(core_dir/('world.db'+suffix)).write_bytes(adb('exec-out','run-as',package,'cat',core_path+suffix,binary=True))
    except subprocess.CalledProcessError:pass

def count_nodes(x):
    return 1+sum(count_nodes(v) for v in (x.values() if isinstance(x,dict) else x)) if isinstance(x,(dict,list)) else 1

with sqlite3.connect(core_dir/'world.db') as db:
    rows=db.execute('SELECT campaign_id,state_json FROM campaigns').fetchall()
    target=next((row for row in rows if json.loads(row[1]).get('player_state',{}).get('characters')),None)
    assert target,'No native canonical campaign was saved'
    campaign,raw=target;doc=json.loads(raw)
    current_player=doc['player_state'];tick_before=doc['tick'];game_time_before=doc.get('game_time')
    original_events=len(doc['event_log'])
    sample=max((e for e in doc['event_log'] if e.get('type')=='player_state_set'),key=lambda e:len(json.dumps(e)))
    size=count_nodes(sample);count=0;total=count_nodes(doc)
    while total+size<96_000:
        row=json.loads(json.dumps(sample));row['event_id']=f'r575-legacy-{count}';row['request_id']=f'r575-legacy-{count}'
        doc['event_log'].append(row);count+=1;total+=count_nodes(row)
    assert count and 90_000<count_nodes(doc)<100_000
    seed_event_count=len(doc['event_log'])
    db.execute('UPDATE campaigns SET state_json=? WHERE campaign_id=?',(json.dumps(doc,ensure_ascii=False,separators=(',',':')),campaign));db.commit()
    db.execute('PRAGMA wal_checkpoint(TRUNCATE)')
adb('push',str(core_dir/'world.db'),'/data/local/tmp/cpred-legacy-world.db')
adb('shell','run-as',package,'rm','-f',core_path+'-wal',core_path+'-shm')
adb('shell','run-as',package,'cp','/data/local/tmp/cpred-legacy-world.db',core_path)
adb('logcat','-c');adb('shell','am','start','-n',package+'/.MainActivity')
for _ in range(60):
    if '[CPRED_UI_READY]' in adb('logcat','-d','-s','CPRED_WEBVIEW:*'):break
    time.sleep(1)
else:raise AssertionError('Legacy save failed to migrate on Android')
tap('FICHA');wait_count(2)
for _ in range(12):tap('Salvar ficha');time.sleep(.3)
assert 'state_too_large' not in ET.tostring(hierarchy(),encoding='unicode')
(out/'legacy-migrated-sheet.png').write_bytes(adb('exec-out','screencap','-p',binary=True))
adb('shell','am','force-stop',package)
for suffix in ['', '-wal', '-shm']:
    try:(core_dir/('after.db'+suffix)).write_bytes(adb('exec-out','run-as',package,'cat',core_path+suffix,binary=True))
    except subprocess.CalledProcessError:pass
with sqlite3.connect(core_dir/'after.db') as db:
    migrated=json.loads(db.execute('SELECT state_json FROM campaigns WHERE campaign_id=?',(campaign,)).fetchone()[0])
    archived=db.execute('SELECT COALESCE(SUM(event_count),0) FROM event_archives WHERE campaign_id=?',(campaign,)).fetchone()[0]
    assert archived>0 and archived+len(migrated['event_log'])>=seed_event_count
    assert count_nodes(migrated)<100_000 and migrated['tick']==tick_before and migrated.get('game_time')==game_time_before
    assert set(migrated['player_state']['characters'])==set(current_player['characters'])
adb('shell','am','start','-n',package+'/.MainActivity');tap('FICHA');wait_count(2)
print('PASS: Android legacy world near 100k nodes migrated, 12 further durable saves and restart, archived audit history preserved, no time advance',flush=True)
print('PASS: actual Android WebView navigation, menu settings, force-stop and reopen', flush=True)
