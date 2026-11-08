from pathlib import Path
import json,os,sys,datetime,urllib.request
from zoneinfo import ZoneInfo

root=Path('.gate1-evidence');out=Path('.gate1-final');out.mkdir(exist_ok=True)
needs=json.loads(os.environ['NEEDS_JSON'])
failures=[name+': '+state['result'] for name,state in needs.items() if state['result']!='success']
repo=os.environ['GITHUB_REPOSITORY'];run=os.environ['GITHUB_RUN_ID'];sha=os.environ['GITHUB_SHA']
url=f'https://github.com/{repo}/actions/runs/{run}'
matrix=[]
def json_line(path,key=None):
 for line in path.read_text().splitlines():
  try:value=json.loads(line.strip())
  except ValueError:continue
  if key and isinstance(value,dict) and key in value:return value[key]
  # psql prints the JSON cell itself, not the column-name wrapper returned by
  # a database connector. Require the strict result's identifying fields.
  if key=='submission_validation' and isinstance(value,dict) and {'tests','sequence_before','sequence_after','inside_counts'}<=value.keys():return value
  if key is None and isinstance(value,list):return value
 raise AssertionError('Missing machine-readable result '+str(path))
if not failures:
 try:
  db=root/'gate1-v5-transaction-rls'
  tx=json_line(db/'strict-transaction.log','submission_validation')
  assert len(tx['tests'])==55 and all(x['status']=='PASS' for x in tx['tests'])
  matrix.extend({**x,'suite':'strict-pg17'} for x in tx['tests'])
  roles=json_line(db/'rls.log')
  actual=[x for x in roles if x['role_name'] in ('authenticated','anon')]
  assert len(actual)>=24
  assert any(x['name']=='authenticated is neither owner superuser nor bypassrls' and x['role_name']=='authenticated' for x in actual)
  matrix.extend({**x,'suite':'restricted-role-pg17','status':'PASS'} for x in actual)
  assert 'PASS: fresh-connection postflight' in (db/'postflight-strict.log').read_text()
  assert 'PASS: scoped original cleanup' in (db/'cleanup.log').read_text()
  api=root/'gate1-local-supabase-api'
  reports=['original-edge-fixtures','original-edge-cleanup','original-window-creation','original-window-cleanup','original-retired','submit-http-api']
  for name in reports:
   value=json.loads((api/(name+'.json')).read_text())
   assert value['tests'] and all(x['status']=='PASS' for x in value['tests'])
   if name=='submit-http-api':assert value['completed'] is True
   matrix.extend({**x,'suite':name} for x in value['tests'])
  assert 'PASS: new connection confirms real Auth' in (api/'local-final-postflight.log').read_text()
  assert 'PostgreSQL 17' in (root/'gate1-pg17-smoke'/'pg-version.txt').read_text() or (root/'gate1-pg17-smoke'/'pg-version.txt').read_text().startswith('17.')
 except Exception as e:failures.append(type(e).__name__+': '+str(e))
jobs=[]
try:
 request=urllib.request.Request(f'https://api.github.com/repos/{repo}/actions/runs/{run}/jobs?per_page=100',headers={'Authorization':'Bearer '+os.environ['GH_TOKEN'],'Accept':'application/vnd.github+json'})
 jobs=json.load(urllib.request.urlopen(request,timeout=20))['jobs']
 jobs=[{k:j[k] for k in ('id','name','status','conclusion','html_url')} for j in jobs if j['name']!='gate1-result']
except Exception as e:failures.append('Job evidence unavailable: '+str(e))
decision='Gate 1 PASS (isolated CI scope)' if not failures else 'NO-GO'
now=datetime.datetime.now(ZoneInfo('Asia/Taipei')).isoformat()
result={'decision':decision,'commit':sha,'run_id':run,'url':url,'timestamp_taipei':now,'jobs':jobs,'assertions':matrix,'failures':failures}
(out/'matrix.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
by_suite={}
for case in matrix:by_suite[case['suite']]=by_suite.get(case['suite'],0)+1
report=f'''# DEV-01B V5 Gate 1 final result

**{decision}**

- Commit: `{sha}`
- Run: [{run}]({url})
- Completed evidence aggregation (Asia/Taipei): {now}
- Explicit normalized assertions: {len(matrix)}
- Scope: disposable PG17.11 mock DB plus actual loopback Supabase Auth/Storage/PostgREST and Deno HTTP handler; no hosted project access or deployment.

## Jobs

| Job | ID | Result | Evidence |
|---|---:|---|---|
'''
for job in jobs:report+=f"| {job['name']} | {job['id']} | {job['conclusion']} | [job]({job['html_url']}) |\n"
report+='\n## Assertion suites\n\n| Suite | Explicit assertions |\n|---|---:|\n'
for name,count in by_suite.items():report+=f'| {name} | {count} |\n'
report+='''
## Actual test commands

- `sha256sum --check .gate1/SHA256SUMS` and `.gate1/CI-SHA256SUMS`.
- `psql -X -v ON_ERROR_STOP=1 -f` the original ledger/V5 migrations, reviewed legacy ACL supplement, scoped fixtures and RLS checks.
- `prepare_original_transaction.py` materializes the original assertion matrix with a documented three-timestamp fixture correction; `transaction-ci.psql` runs in one connection and rolls back.
- `build_strict_transaction.py` plus `strict-transaction.psql` enforces 55 exact error/state assertions, both success paths and a real mid-write uniqueness failure.
- New psql connections run the original postflight selects plus fatal postflight assertions, and original scoped cleanup.
- Supabase CLI 3.0.0 starts only local containers, never links/pushes/targets a hosted project.
- Deno executes original fixture handler, expiry/retirement and cleanup-recovery tests using real local APIs with loopback-only network permissions and the hosted origin explicitly denied.
- A new CI-only member submission adapter is tested through actual loopback HTTP, verified local JWTs, successful requests, replays and two concurrent same-request submissions. It is not the original fixture endpoint or a deployed website route.
- Actual Storage HTTP tests check ownership, MIME/size restrictions and cleanup. Final independent SQL requires zero Auth/session/identity/token/profile/request/bag/photo fixtures, closed settings, no direct member submit grant, and reconciled ledger resources.
- `supabase stop --no-backup` destroys local containers/volumes. Audit ledger remains intentionally until teardown. Sequence consumption is recorded, never reversed.

## Source and scope qualifications

All six original files are byte-identical. Original wall-clock transaction fixture initially failed and was not relabeled PASS unchanged; a derived fixture correction and diff are archived. Product V5 SQL is untouched; legacy ACL fix is a separate supplement.

Original `index.ts` fixture APIs and the new submission adapter are distinguished. This is not an authorization to merge main, deploy Pages, contact remote Supabase, or claim real website/OAuth/SMS/logistics/load coverage.

Raw per-case SQLSTATE/roles, API outcomes, source hashes, diffs and postflight logs are attached in the dependency artifacts. See `matrix.json` and `GATE1-REMAINING-RISKS.md`.
'''
if failures:report+='\n## Failures\n\n'+'\n'.join('- '+x for x in failures)+'\n'
(out/'GATE1-RESULTS.md').write_text(report)
(out/'GATE1-REMAINING-RISKS.md').write_text(Path('.gate1/GATE1-REMAINING-RISKS.md').read_text())
print(decision, len(matrix), 'assertions')
if failures:sys.exit(1)
