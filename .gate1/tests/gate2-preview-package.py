#!/usr/bin/env python3
"""Build a non-deploying, fail-closed C09 V5 preview bundle. Never publishes files."""
from pathlib import Path
import argparse, hashlib, json, zipfile, io

ROOT=Path(__file__).resolve().parents[2]
FILES=('app/c09-v5.html','app/c09-v5.js')
LANDING='''<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>樂享家｜隔離測試預覽</title><body><h1>樂享家｜隔離測試預覽</h1><p>僅供測試，尚未連接遠端測試後端，禁止使用真實個資。</p><a href="app/c09-v5.html">開啟 C09 V5 測試頁面</a></body></html>'''
def build_bytes():
    source={name:(ROOT/name).read_bytes() for name in FILES}
    js=source['app/c09-v5.js'].decode()
    assert "const loopback=['127.0.0.1','localhost'].includes(location.hostname)" in js
    assert "submitEndpoint:localConfig&&localUrl(localConfig.submitEndpoint)?localConfig.submitEndpoint:''" in js
    assert "key:localConfig&&localUrl(localConfig.base)?String(localConfig.key||''):''" in js
    assert 'service_role' not in js.lower(), 'privileged credential marker detected'
    html=source['app/c09-v5.html'].decode()
    assert '未部署' in html
    source['index.html']=LANDING.encode()
    manifest={'mode':'offline-preview-only','remote_deployment':False,'remote_backend':False,
              'files':{name:hashlib.sha256(data).hexdigest() for name,data in sorted(source.items())}}
    source['preview-manifest.json']=(json.dumps(manifest,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()
    buffer=io.BytesIO()
    with zipfile.ZipFile(buffer,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as archive:
        for name,data in sorted(source.items()):
            info=zipfile.ZipInfo(name,date_time=(2020,1,1,0,0,0))
            info.compress_type=zipfile.ZIP_DEFLATED
            info.external_attr=0o644<<16
            archive.writestr(info,data,compress_type=zipfile.ZIP_DEFLATED,compresslevel=9)
    return buffer.getvalue()
def verify(blob):
    with zipfile.ZipFile(io.BytesIO(blob)) as archive:
        names=archive.namelist()
        assert names==sorted([*FILES,'index.html','preview-manifest.json'])
        manifest=json.loads(archive.read('preview-manifest.json'))
        assert manifest['remote_deployment'] is False and manifest['remote_backend'] is False
        for name,digest in manifest['files'].items():
            assert hashlib.sha256(archive.read(name)).hexdigest()==digest
        assert b'noindex,nofollow' in archive.read('index.html')
        assert b'localhost' in archive.read('app/c09-v5.js')
    print('PASS offline preview package manifest, hashes, noindex and fail-closed contract')
if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--output',default='.gate2-out/lets-share-c09-v5-offline-preview.zip')
    args=parser.parse_args()
    first=build_bytes()
    assert first==build_bytes(), 'non-deterministic archive'
    verify(first)
    output=Path(args.output)
    output.parent.mkdir(parents=True,exist_ok=True)
    output.write_bytes(first)
    assert output.read_bytes()==first
    print('PASS deterministic offline preview bundle; sha256='+hashlib.sha256(first).hexdigest())
    print('NO remote deployment, NO remote Supabase, NO production index replacement')
