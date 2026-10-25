"""Apply R5.73 to the SHA-pinned R5.72 Android source, preserving rules and content."""
import argparse
from pathlib import Path
import shutil
import re

def apply(root):
    root = Path(root).resolve()
    overlay = Path(__file__).parent / 'overlay'
    runtime = root / 'app/src/main/java/com/braseiro/cyberpunkred/BarbaraRuntime.kt'
    code = runtime.read_text(encoding='utf-8-sig')
    # Download outside the state transaction; final activation still owns the lock.
    for name in ('checkGitHubUpdate', 'downloadAndApplyGitHubUpdate'):
        old = f'fun {name}(manifestUrl: String? = null): JSONObject = synchronized(canonicalTurnLock) {{'
        new = f'fun {name}(manifestUrl: String? = null): JSONObject {{'
        if old not in code and new not in code:
            raise RuntimeError(f'Unsupported Android source: {name}')
        code = code.replace(old, new)
    code = re.sub(r'\b4172\b', 'BuildConfig.VERSION_CODE', code)
    code = code.replace('"4.1.72"', 'BuildConfig.VERSION_NAME')
    runtime.write_text(code)
    for src in overlay.rglob('*'):
        if src.is_file():
            dest = root / src.relative_to(overlay)
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dest)
    from patch_r574 import apply as apply_r574
    apply_r574(root)
    build = root / 'app/build.gradle.kts'
    code = build.read_text(encoding='utf-8-sig')
    if 'versionCode = 4172' not in code and 'versionCode = 4173' not in code and 'versionCode = 4174' not in code:
        raise RuntimeError('Expected R5.72/R5.73 source version')
    build.write_text(re.sub(r'versionCode = 417[234]', 'versionCode = 4174', re.sub(r'versionName = "4\.1\.7[234]"', 'versionName = "4.1.74"', code)))
    print('R5.74 mobile UI and nonblocking bridge installed:', root)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('android_root')
    apply(parser.parse_args().android_root)
