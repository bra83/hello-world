"""Exercise the visible navigation through Android touch input, checking WebView logs."""
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
        def matches_label(node):
            name=re.sub(r'\s+', ' ', node.get('text', '') or node.get('content-desc', '')).strip().upper()
            wanted=label.upper()
            bounds=list(map(int,re.findall(r'\d+',node.get('bounds',''))))
            visible=len(bounds)==4 and bounds[2]>bounds[0] and bounds[3]>bounds[1]
            return visible and re.search(r'(^|\W)'+re.escape(wanted)+r'($|\W)',name) is not None
        matches = [n for n in root.iter('node') if matches_label(n)]
        if matches:
            # Bottom navigation wins over duplicate links in the content.
            n = max(matches, key=lambda n: int(re.findall(r'\d+', n.get('bounds'))[1]))
            x1, y1, x2, y2 = map(int, re.findall(r'\d+', n.get('bounds')))
            adb('shell', 'input', 'tap', str((x1+x2)//2), str((y1+y2)//2))
            print('TOUCH', label, flush=True)
            return
        time.sleep(1)
    (out/'failed-navigation.png').write_bytes(adb('exec-out','screencap','-p',binary=True))
    (out/'failed-logcat.txt').write_text(adb('logcat','-d'))
    raise AssertionError(f'Visible control not found: {label}')

adb('install', '-r', apk)
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
(out/'reopened-sheet.png').write_bytes(adb('exec-out','screencap','-p',binary=True))
print('PASS: actual Android WebView navigation, menu settings, force-stop and reopen', flush=True)
