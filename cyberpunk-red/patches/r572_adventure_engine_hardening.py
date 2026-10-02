#!/usr/bin/env python3
from pathlib import Path
import shutil
import sys

if len(sys.argv) != 2:
    raise SystemExit('usage: r572_adventure_engine_hardening.py <android-root>')

root=Path(sys.argv[1])
app=root/'app/src/main/assets/web/app'
sheets=app/'sheets.js'
repo_cyberpunk=Path(__file__).resolve().parents[1]
runtime=repo_cyberpunk/'adventure-engine/runtime'

for name in ('adventure_engine_v2.js','cyberpunk_adventure_controller_v2.js'):
    src=runtime/name
    if not src.is_file(): raise SystemExit(f'missing hardening runtime: {src}')
    shutil.copy2(src,app/name)

if not sheets.is_file(): raise SystemExit(f'missing required file: {sheets}')
s=sheets.read_text(encoding='utf-8')
old="import {CyberpunkAdventureController} from './cyberpunk_adventure_controller.js';"
new="import {CyberpunkAdventureController} from './cyberpunk_adventure_controller_v2.js';"
if new not in s:
    if old not in s: raise SystemExit('R572_HARDENING_CONTROLLER_IMPORT_NOT_FOUND')
    s=s.replace(old,new,1)
sheets.write_text(s,encoding='utf-8')

for needle in (new,):
    if needle not in sheets.read_text(encoding='utf-8'): raise SystemExit('R572_HARDENING_POSTCONDITION_FAILED')
print('R5_72_ADVENTURE_ENGINE_HARDENING_APPLIED')
