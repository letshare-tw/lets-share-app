"""Gate 2 isolated integration readiness audit; read-only, no network or credentials."""
from pathlib import Path
import ast
root=Path('.')
v5=(root/'app/c09-v5.js').read_text()
legacy=(root/'app/c09.html').read_text()
edge=(root/'.gate1/runtime/edge-submit-handler.ts').read_text()
candidate=(root/'.gate1/runtime/edge-submit-candidate.sql').read_text()
browser=(root/'.gate1/tests/p1-browser-e2e.cjs').read_text()
checks={
 'V5 is separate from legacy C09': 'c09-v5.js' in (root/'app/c09-v5.html').read_text() and 'rpc/lx_attach_my_draft_placement' in legacy,
 'test config injected on loopback only': "const loopback=['127.0.0.1','localhost'].includes(location.hostname)" in v5,
 'test key is unset without local injection': "key:localConfig&&localUrl(localConfig.base)?String(localConfig.key||''):''" in v5,
 'V5 submit disabled without trusted local endpoint': "submitEndpoint:localConfig&&localUrl(localConfig.submitEndpoint)?localConfig.submitEndpoint:''" in v5 and 'if(!CONFIG.submitEndpoint)' in v5,
 'no privileged service key in browser': all(s not in v5 for s in ('SERVICE_ROLE_KEY','sb_secret_','service_role')),
 'JWT verified server-side': 'auth.auth.getUser(token)' in edge,
 'service-role-only RPC': 'GRANT EXECUTE ON FUNCTION public.lx_edge_submit_share_request' in candidate and 'TO service_role;' in candidate and 'FROM PUBLIC,anon,authenticated;' in candidate,
 'real browser checks cross-account denial': 'PASS actual Edge entry rejects cross-account request' in browser,
 'real browser checks idempotent replay': 'PASS actual Edge entry idempotent replay' in browser,
 'real browser checks 403 SQL 42501': "direct.status!==403||directResult.code!=='42501'" in browser,
 'real browser checks storage and 48-hour SLA': 'PASS DB verifies submitted request, Storage photo, one bag, exact 48 hours' in browser,
}
for name,passed in checks.items():
 print(('PASS' if passed else 'FAIL')+' Gate2 readiness: '+name)
if not all(checks.values()): raise SystemExit('Gate 2 readiness contract failed')
print('Gate2 readiness audit PASS: %d static checks; NOT a hosted test deployment or runtime certification'%len(checks))
