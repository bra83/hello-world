from pathlib import Path
import sys, shutil

def apply(root):
    root = Path(root)
    here = Path(__file__).parent
    java = root / 'app/src/main/java/com/braseiro/cyberpunkred'
    app = root / 'app/src/main/assets/web/app'
    
    # 1. Update BarbaraRuntime.kt with canonical rules parity
    if (here / 'native/BarbaraRuntime.kt').exists():
        (java / 'BarbaraRuntime.kt').write_bytes((here / 'native/BarbaraRuntime.kt').read_bytes())
        print('Updated BarbaraRuntime.kt with definitive rules parity resolver')
        
    # 2. Update web assets: adventure_engine_v2.js and cyberpunk_host_adapters.js
    adv_v2 = app / 'adventure_engine_v2.js'
    if adv_v2.exists():
        s = adv_v2.read_text(encoding='utf-8')
        old_clause = "const requiredBlocked = (r?.ok !== true || r?.resolved !== true || r?.blocked === true);"
        new_clause = "const requiredBlocked = (r?.ok !== true || r?.resolved !== true || r?.blocked === true || r?.passed === false || r?.success === false);"
        if old_clause in s:
            s = s.replace(old_clause, new_clause)
            adv_v2.write_text(s, encoding='utf-8')
            print('Patched adventure_engine_v2.js requiredBlocked check')

    adapters = app / 'cyberpunk_host_adapters.js'
    if adapters.exists():
        s = adapters.read_text(encoding='utf-8')
        old_timeout = "requestBrowserResolver(action, payload, 80)"
        new_timeout = "requestBrowserResolver(action, payload, 5000)"
        if old_timeout in s:
            s = s.replace(old_timeout, new_timeout)
            adapters.write_text(s, encoding='utf-8')
            print('Patched cyberpunk_host_adapters.js timeout to 5000ms')
            
    # 3. Update index.html build version
    idx = app / 'index.html'
    if idx.exists():
        s = idx.read_text(encoding='utf-8')
        s = s.replace('build=4180', 'build=4182').replace('build=4181', 'build=4182')
        idx.write_text(s, encoding='utf-8')
        print('Patched index.html build=4182')

    # 4. Update build.gradle.kts versionCode and versionName
    gradle_file = root / 'app/build.gradle.kts'
    if gradle_file.exists():
        s = gradle_file.read_text(encoding='utf-8')
        s = s.replace('versionCode = 4180', 'versionCode = 4182').replace('versionCode = 4181', 'versionCode = 4182')
        s = s.replace('versionName = "4.1.80"', 'versionName = "4.1.82"').replace('versionName = "4.1.81"', 'versionName = "4.1.82"')
        gradle_file.write_text(s, encoding='utf-8')
        print('Patched build.gradle.kts to versionCode 4182, versionName 4.1.82')

    # 5. Update androidTest MediaDiceSpeechTest.kt
    test_src = here / 'androidTest/MediaDiceSpeechTest.kt'
    test_dst = root / 'app/src/androidTest/java/com/braseiro/cyberpunkred/MediaDiceSpeechTest.kt'
    if test_src.exists() and test_dst.parent.exists():
        test_dst.write_bytes(test_src.read_bytes())
        print('Updated MediaDiceSpeechTest.kt with 3-cycle persistence tests')

    print('Applied 4.1.82 Cyberpunk RED definitive canonical rules audit & runtime parity.')

if __name__ == '__main__':
    apply(sys.argv[1])
