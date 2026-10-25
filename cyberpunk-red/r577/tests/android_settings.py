"""Run retained native regression, then save model IDs through the real Android UI."""
from pathlib import Path
exec(compile((Path(__file__).parents[2]/'r575/tests/android_navigation.py').read_text(),'android_navigation.py','exec'))
import xml.etree.ElementTree as ET
screen_height=int(re.findall(r'\d+',adb('shell','wm','size'))[-1])

def visible(node):
    b=list(map(int,re.findall(r'\d+',node.get('bounds',''))))
    return len(b)==4 and b[2]>b[0] and b[3]>b[1] and 0<=b[1]<screen_height-100 and b[3]<=screen_height


def settings_page():
    tap('MENU');tap('CONFIGURAÇÕES');time.sleep(1)


def text_model_field():
    for _ in range(8):
        tree=hierarchy()
        candidates=[n for n in tree.iter('node') if visible(n) and n.get('class')=='android.widget.EditText' and (n.get('text','').startswith('gemini-') or n.get('text','').startswith('models/'))]
        if candidates:return candidates[0]
        # Settings is a long page; swipe up to reveal controls below the fold.
        adb('shell','input','swipe','500','1450','500','550','350');time.sleep(.5)
    (out/'settings-field-not-visible.png').write_bytes(adb('exec-out','screencap','-p',binary=True))
    raise AssertionError('Text model edit control not visible')


def enter_model(model):
    n=text_model_field();x1,y1,x2,y2=map(int,re.findall(r'\d+',n.get('bounds')))
    adb('shell','input','tap',str((x1+x2)//2),str((y1+y2)//2))
    adb('shell','input','keyevent','KEYCODE_MOVE_END')
    adb('shell','input','keycombination','113','29')  # CTRL+A
    adb('shell','input','text',model);adb('shell','input','keyevent','KEYCODE_BACK')
    for _ in range(10):
        candidates=[n for n in hierarchy().iter('node') if 'SALVAR MODELOS/VOZ' in n.get('text','')]
        if any(visible(n) and int(re.findall(r'\d+',n.get('bounds'))[-1])<screen_height-240 for n in candidates):break
        adb('shell','input','swipe','500','1350','500','550','300');time.sleep(.2)
    tap('SALVAR MODELOS/VOZ')


def saved_model():
    xml=adb('exec-out','run-as',package,'cat','shared_prefs/cpred-secure-runtime.xml')
    return next(n.text for n in ET.fromstring(xml) if n.get('name')=='gemini_text_model')

settings_page()
# Prefixed IDs previously fell back silently to the previous setting.
enter_model('models/gemini-2.5-flash')
for _ in range(30):
    if saved_model()=='gemini-2.5-flash':break
    time.sleep(.5)
else:raise AssertionError('Native save silently reverted prefixed model')
adb('shell','am','force-stop',package);adb('shell','am','start','-n',package+'/.MainActivity')
settings_page();wait_model='gemini-2.5-flash'
for _ in range(15):
    if text_model_field().get('text')==wait_model:break
    time.sleep(.5)
else:raise AssertionError('Saved model not restored in real UI')
# The legacy migration flag must never undo an explicit user save of this ID.
enter_model('gemini-2.5-flash-lite')
for _ in range(30):
    if saved_model()=='gemini-2.5-flash-lite':break
    time.sleep(.5)
else:raise AssertionError('Native save did not persist explicit legacy model')
adb('shell','am','force-stop',package);adb('shell','am','start','-n',package+'/.MainActivity')
settings_page();wait_model='gemini-2.5-flash-lite'
for _ in range(15):
    if text_model_field().get('text')==wait_model:break
    time.sleep(.5)
else:raise AssertionError('Explicit legacy model not restored in real UI')
(out/'settings-persisted-after-reopen.png').write_bytes(adb('exec-out','screencap','-p',binary=True))
print('PASS: real Android text-model save, models/ normalization, SharedPreferences readback, explicit legacy ID retained and two force-stop/reopen cycles',flush=True)
