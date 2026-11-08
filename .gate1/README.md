# DEV-01B V5 Gate 1 — execution boundary

This branch is **test-only**. Never merge to main or deploy to GitHub Pages.

## Verified contents
- .github/workflows/dev01b-v5-gate1.yml: PostgreSQL 17 smoke rollback and Deno runner.
- The workflow's PostgreSQL smoke test is **not** the DEV-01B V5 migration/transaction test.
- The Deno job currently deliberately fails until .gate1/dev01b/index.ts is present.
- Do not label Gate 1 PASS based on the smoke job.

## Files required for complete Gate 1
Copy the reviewed existing sources **without changing their contents** from the local Gate 1 package:
- .gate1/dev01b/index.ts
- .gate1/dev01b/retired.ts
- .gate1/dev01b/ledger_design.sql
- .gate1/dev01b/transaction_test.psql
- .gate1/dev01b/cleanup_drafts.psql
- .gate1/dev01b/postflight.sql

Then build **isolated** PostgreSQL 17 Supabase Auth/Storage dependency fixtures, and run the actual SQL tests. Do not point the workflow at any remote Supabase database. The V5 transaction test expects two synthetic Auth users, their profiles/drafts and Storage object metadata; a bare PostgreSQL 17 server cannot satisfy those preconditions.

## Gate criteria
1. Deno check on real index.ts and retired.ts passes.
2. The real ledger migration executes against PG17 with required roles, with EXECUTE revoked for anon/authenticated.
3. Actual transaction_test.psql runs in one psql connection with all synthetic fixture IDs and ends ROLLBACK, leaving no persistent mutations (except sequence effects, which must not be reset).
4. cleanup and uncertain recovery tested in isolated fixtures; no unknown objects deleted.
5. Attach actual Actions logs and report all PASS/FAIL; do not infer a PASS from syntax alone.

No Supabase remote writes are authorized in Gate 1.
