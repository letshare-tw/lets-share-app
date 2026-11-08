# DEV-01B V5 Gate 1 — executable isolated verification

Only branch `test/dev01b-v5-gate1-20261108` is authorized. No main/Pages/hosted
Supabase mutations, no real accounts or hosted service keys.

Run `.github/workflows/dev01b-v5-gate1.yml` on this branch. Required jobs:

1. `isolated-pg17`: pinned PostgreSQL 17.11 ledger, lease/fencing and grants.
2. `v5-pg17-migration`: unchanged V5 migration on minimal mocks.
3. `deno-runtime`: original two sources type-check.
4. `v5-transaction-rls`: actual original assertion matrix with a reviewed
   timestamp fixture correction, 55 strict SQLSTATE/state cases, restricted
   authenticated/anon RLS and Storage policies, fresh postflight and cleanup.
5. `local-supabase-api`: real disposable local Supabase Auth/Storage/PostgREST,
   original fixture-handler authorization/retries/expiry/recovery/retirement,
   scoped cleanup, and a new test-only member submission adapter over real
   loopback HTTP (including concurrent replay). Hosted origin denied by Deno.
6. `gate1-result`: fails unless every job and required assertion artifact passes;
   emits commit/run/job-bound results and explicit remaining limitations.

Original six source checksums remain in `SHA256SUMS`. Additional executable
inputs and workflow are pinned in `CI-SHA256SUMS`. Pinned originals are not
silently changed: `prepare_original_transaction.py` emits a three-timestamp
fixture diff. `compatibility-fix.sql` separately closes the legacy default-ACL
EXECUTE hole. Product V5 SQL remains byte-identical.

See `GATE1-RESULTS.md` and `GATE1-REMAINING-RISKS.md`; final authoritative report
is Actions artifact `gate1-final-report`. An isolated PASS is not approval to
publish agreements, deploy a member endpoint, merge main or change hosted data.
