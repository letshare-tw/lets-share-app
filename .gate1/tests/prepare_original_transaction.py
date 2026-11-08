"""Preserve original source; materialize an explicitly reviewed CI fixture fix.

V5 compares a.published_at <= now() (transaction start). The original fixture
uses clock_timestamp() later in the same transaction, making ready=true
impossible. Only its three fixture timestamps change, never product SQL.
"""
from pathlib import Path
import hashlib,difflib
source=Path('.gate1/dev01b/transaction_test.psql')
original=source.read_text()
assert hashlib.sha256(source.read_bytes()).hexdigest()=='4a7439bacd7dfc47166cf8e9342abedd02a51a02400d72b9abdf7d5e5b7fbd24'
assert original.count('clock_timestamp()')==3
fixed=original.replace('clock_timestamp()','transaction_timestamp()')
out=Path('.gate1-artifacts');out.mkdir(exist_ok=True)
(out/'transaction-ci.psql').write_text(fixed)
(out/'transaction-fixture-fix.diff').write_text(''.join(difflib.unified_diff(original.splitlines(True),fixed.splitlines(True),fromfile=str(source),tofile='derived/transaction-ci.psql')))
print('Applied reviewed fixture-only timestamp correction; all original source bytes preserved.')
