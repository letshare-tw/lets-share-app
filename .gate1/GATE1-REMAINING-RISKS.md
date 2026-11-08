# Remaining risks and exact Gate 1 boundary

This is a disposable CI Gate 1, never a production deployment approval.

- All six handed-off sources remain byte-identical. The original transaction
  fixture is not claimed to pass unchanged: it publishes with wall-clock time
  while product preflight compares transaction-start time. CI materializes a
  three-timestamp fixture correction and publishes its diff. The initial failure
  is run 42498945925; strict supplemental tests verify exact SQLSTATE and state.
- Product `SECURITY-V5-REVIEW.sql` also remains unchanged. A separate reviewed
  supplement revokes the legacy function's inherited authenticated EXECUTE.
  Never deploy the original V5 alone and assume this fix is included.
- Plain PG17 mocks model SQL dependencies and role semantics only. Actual Auth,
  Storage, PostgREST, JWT and MIME/size checks run separately against a completely
  local Supabase stack in GitHub Actions. Neither job reaches a hosted project.
- The pinned `index.ts` is a fixture manager, not a member submit endpoint. Its
  original handler is executed with only its fixed origin retargeted to loopback;
  Deno denies network access to that hosted origin. Requests otherwise exercise
  real local Auth/Storage/PostgREST. This is not a cloud Edge gateway test.
- `runtime/submit.ts` and `internal-submit.sql` are new CI-only adapters: real
  JWT validation precedes a service-only trusted-subject wrapper. Tests cover
  HTTP input denial, ownership, both members' success, retry and two concurrent
  same-request submissions. The website does not use this adapter, and nothing
  has been remotely deployed. Production integration needs a separate review.
- Email/SMS/OAuth providers, frontend gestures, logistics, payments, broad load,
  every crash window, and in-flight external API fencing are not proven here.
  A lease cannot revoke an already executing external HTTP request.
- The original fixture manager refuses unknown objects and partial states rather
  than guessing at destructive cleanup. Unknown-object refusal and safe recovery
  are tested. External SQL draft cleanup explicitly reconciles its ledger rows.
- Sequence consumption is audited and is deliberately not reset. Transaction
  rollback restores rows and settings, not nextval() or external HTTP writes.
- Local test users/files/sessions are removed through actual APIs; new-connection
  SQL postflight verifies absence. Audit ledger/events remain until the whole
  local stack's containers/volumes are destroyed. No hosted cleanup is permitted.
- Gate 1 PASS requires all dependency jobs, expected artifacts, explicit assertion
  results and fresh postflight evidence. Green type-check or migration alone is
  insufficient. Failed/skipped/missing checks make the final gate fail.
