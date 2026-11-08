"""P1-FIX static contract checks; zero remote requests and zero production writes."""
from pathlib import Path
import re
html=Path('app/c09-v5.html').read_text()
js=Path('app/c09-v5.js').read_text()
old=Path('app/c09.html').read_text()
checks={
 'separate test-only UI': 'c09-v5.js' in html and '分享衣物' in html,
 'existing C09 preserved': 'rpc/lx_attach_my_draft_placement' in old,
 'no legacy placement RPC in V5': 'lx_attach_my_draft_placement' not in js,
 'V5 details upsert': 'lx_share_draft_details?on_conflict=request_id' in js,
 'V5 owner draft photo path': "state.uid+'/'+state.draft+'/'+Date.now()" in js,
 'V5 storage private bucket': "bucket:'share-placement-photos'" in js,
 'preflight RPC': 'rpc/lx_share_submission_preflight' in js,
 'three explicit consent flags': all(x in js for x in ['transfer_agreed:true','no_return_agreed:true','recycling_agreed:true']),
 'trusted Edge endpoint gate': "submitEndpoint:''" in js and 'if(!CONFIG.submitEndpoint)' in js,
 'no privileged key in browser': not any(x in js for x in ['service_role','SERVICE_ROLE_KEY','sb_secret_']),
 'no dev production URL in V5': 'wxvauoeykusmbxdtwgxo' not in js,
 'test key intentionally unset': "key:''" in js,
 'no direct privileged submit RPC': 'rpc/lx_submit_share_request' not in js,
 '48-hour deadline from server': 'result.pickup_deadline_at' in js,
 'no client-supplied identity to submit': 'user_id:' not in js[js.index('async function submit()'):js.index('async function init()')],
}
for name,ok in checks.items():
 print(('PASS' if ok else 'FAIL')+': '+name)
if not all(checks.values()):raise SystemExit(1)
