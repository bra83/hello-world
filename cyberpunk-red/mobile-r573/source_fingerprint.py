"""Fingerprint the exact Android overlay and installer, excluding test-only changes."""
import hashlib
from pathlib import Path

root = Path(__file__).parent
digest = hashlib.sha256()
paths = [root/'apply.py', *sorted((root/'overlay').rglob('*'))]
for path in paths:
    if path.is_file():
        digest.update(path.relative_to(root).as_posix().encode())
        digest.update(b'\0')
        digest.update(hashlib.sha256(path.read_bytes()).digest())
print(digest.hexdigest())
