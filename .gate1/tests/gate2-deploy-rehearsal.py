"""Gate 2 deployment rehearsal: loopback-only static staging, rollback, no remote calls."""
from pathlib import Path
import hashlib, http.server, socketserver, threading, urllib.request, tempfile, shutil
from urllib.error import HTTPError

ROOT=Path.cwd()
SOURCES=['index.html','app/c09-v5.html','app/c09-v5.js']
for path in SOURCES:
    assert (ROOT/path).is_file(), f'missing source: {path}'
assert 'noindex' in (ROOT/'index.html').read_text(), 'production landing must remain unchanged'
assert '未部署' in (ROOT/'app/c09-v5.html').read_text(), 'C09 V5 must remain marked undeployed'
js=(ROOT/'app/c09-v5.js').read_text()
assert "const loopback=['127.0.0.1','localhost'].includes(location.hostname)" in js
assert "key:localConfig&&localUrl(localConfig.base)?String(localConfig.key||''):''" in js
assert "submitEndpoint:localConfig&&localUrl(localConfig.submitEndpoint)?localConfig.submitEndpoint:''" in js
with tempfile.TemporaryDirectory(prefix='gate2-local-stage-') as td:
    stage=Path(td)/'site'
    for rel in SOURCES:
        dst=stage/rel
        dst.parent.mkdir(parents=True,exist_ok=True)
        shutil.copyfile(ROOT/rel,dst)
    baseline={rel:hashlib.sha256((stage/rel).read_bytes()).hexdigest() for rel in SOURCES}
    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(stage),**kwargs)
        def log_message(self,*args):pass
        def end_headers(self):
            self.send_header('Cache-Control','no-store')
            self.send_header('X-Robots-Tag','noindex, nofollow')
            super().end_headers()
    class Server(socketserver.TCPServer):
        allow_reuse_address=True
    with Server(('127.0.0.1',0),Handler) as server:
        thread=threading.Thread(target=server.serve_forever,daemon=True)
        thread.start()
        origin=f'http://127.0.0.1:{server.server_address[1]}'
        for rel in SOURCES:
            with urllib.request.urlopen(origin+'/'+rel,timeout=5) as resp:
                assert resp.status==200
                assert resp.headers['X-Robots-Tag']=='noindex, nofollow'
                assert hashlib.sha256(resp.read()).hexdigest()==baseline[rel]
            print('PASS local staged HTTP content: '+rel)
        # Simulate a broken deployment and verify rollback restores exact bytes.
        target=stage/'app/c09-v5.js'
        target.write_text('// broken release simulation\n')
        assert hashlib.sha256(target.read_bytes()).hexdigest()!=baseline['app/c09-v5.js']
        shutil.copyfile(ROOT/'app/c09-v5.js',target)
        assert hashlib.sha256(target.read_bytes()).hexdigest()==baseline['app/c09-v5.js']
        with urllib.request.urlopen(origin+'/app/c09-v5.js',timeout=5) as resp:
            assert hashlib.sha256(resp.read()).hexdigest()==baseline['app/c09-v5.js']
        print('PASS local staged rollback byte-for-byte')
        server.shutdown()
print('PASS Gate2 loopback-only deployment rehearsal; NO remote deployment')
