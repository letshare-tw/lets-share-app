from pathlib import Path
import json,urllib.parse,shlex,sys
mode=sys.argv[1]
root=Path('.gate1/local-stack')
if mode=='config':
 (root/'supabase/config.toml').write_text('''project_id = "dev01b-gate1-local"
[api]
enabled = true
port = 54321
schemas = ["public"]
extra_search_path = ["public","extensions"]
[db]
port = 54322
shadow_port = 54320
major_version = 17
[db.seed]
enabled = false
[db.pooler]
enabled = false
[studio]
enabled = false
[realtime]
enabled = false
[local_smtp]
enabled = true
port = 54324
[storage]
enabled = true
file_size_limit = "50MiB"
[storage.vector]
enabled = false
[auth]
enabled = true
site_url = "http://127.0.0.1:3000"
jwt_expiry = 3600
enable_signup = true
minimum_password_length = 8
[auth.email]
enable_signup = true
enable_confirmations = false
[edge_runtime]
enabled = false
[analytics]
enabled = false
''')
elif mode=='env':
 status=json.loads((root/'status.private.json').read_text())
 api=urllib.parse.urlparse(status['API_URL']);db=urllib.parse.urlparse(status['DB_URL'])
 assert api.hostname in ('127.0.0.1','localhost') and db.hostname in ('127.0.0.1','localhost')
 assert status['ANON_KEY'] and status['SERVICE_ROLE_KEY']
 for k,v in {'PGHOST':db.hostname,'PGPORT':str(db.port),'PGDATABASE':db.path.lstrip('/'),'PGUSER':db.username,'PGPASSWORD':db.password}.items():
  assert v and '\n' not in v;print(k+'='+v)
elif mode=='fixture-env':
 import uuid,re
 m=json.loads(Path('.gate1-artifacts/local-fixture-manifest.json').read_text())
 values={}
 for label in ('a','b'):
  f=m[label];assert str(uuid.UUID(f['id']))==f['id'] and str(uuid.UUID(f['request_id']))==f['request_id']
  assert re.fullmatch(re.escape(f['id']+'/'+f['request_id'])+r'/[0-9]+-[a-z0-9]{1,8}\.png',f['photo_path'])
  values.update({label+'_uid':f['id'],label+'_request':f['request_id'],label+'_photo':f['photo_path']})
 Path('.gate1/local-stack/fixture.env').write_text(''.join('export '+k+'='+shlex.quote(v)+'\n' for k,v in values.items()))
elif mode=='redact':
 import re
 text=(root/'start.private.log').read_text()
 text=re.sub(r'eyJ[A-Za-z0-9_.-]+','[ephemeral-local-JWT-redacted]',text)
 text=re.sub(r'sb_(?:secret|publishable)_[A-Za-z0-9_-]+','[ephemeral-local-key-redacted]',text)
 Path('.gate1-artifacts/local-stack-start.log').write_text(text)
else:raise ValueError(mode)
