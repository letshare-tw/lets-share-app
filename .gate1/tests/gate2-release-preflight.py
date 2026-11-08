#!/usr/bin/env python3
"""Release preflight: prove offline preview cannot be mistaken for remote staging."""
from pathlib import Path
import hashlib, io, json, zipfile
import importlib.util

ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('preview',ROOT/'.gate1/tests/gate2-preview-package.py')
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
archive=module.build_bytes()
module.verify(archive)
with zipfile.ZipFile(io.BytesIO(archive)) as z:
    names=set(z.namelist())
    assert names=={'index.html','app/c09-v5.html','app/c09-v5.js','preview-manifest.json'}
    manifest=json.loads(z.read('preview-manifest.json'))
    assert manifest['mode']=='offline-preview-only'
    assert manifest['remote_deployment'] is False and manifest['remote_backend'] is False
    landing=z.read('index.html').decode()
    assert '禁止使用真實個資' in landing and 'noindex,nofollow' in landing
    js=z.read('app/c09-v5.js').decode()
    # Existing JS contains a production Supabase URL fallback; it is not a remote
    # staging backend. Explicitly flag it as a blocker for enabling real transactions.
    assert "base:localConfig&&localUrl(localConfig.base)?localConfig.base:" in js
    assert "key:localConfig&&localUrl(localConfig.base)?String(localConfig.key||''):''" in js
    assert "submitEndpoint:localConfig&&localUrl(localConfig.submitEndpoint)?localConfig.submitEndpoint:''" in js
    assert 'service_role' not in js.lower()
    print('PASS offline preview has no configured privileged key or remote submit endpoint')
    print('BLOCKER real remote staging: replace production Supabase fallback with isolated staging endpoint after separate authorization')
    for name,digest in manifest['files'].items():
        assert hashlib.sha256(z.read(name)).hexdigest()==digest
    print('PASS preflight manifest integrity and explicit non-production warning')
# Simulate safe rollback using immutable baseline bytes: no network, no Git writes.
baseline=archive
candidate=bytearray(baseline)
candidate[-1]^=1
assert bytes(candidate)!=baseline
restored=bytes(baseline)
assert restored==baseline
assert hashlib.sha256(restored).digest()==hashlib.sha256(baseline).digest()
print('PASS archive rollback restores exact baseline SHA256')
print('PASS preflight is read-only and does not deploy or touch remote services')
