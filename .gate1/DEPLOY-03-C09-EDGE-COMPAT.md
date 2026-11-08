# DEPLOY-03: Edge + transaction RPC + C09 coexistence (candidate, NOT DEPLOYED)

## Scope
All changes are on test/dev01b-v5-gate1-20261108 only. No main, production site or remote Supabase modifications.

## Candidate path
- `supabase/functions/share-submit/index.ts` validates the request origin against an explicit allowlist, responds to CORS preflight, and delegates JWT verification, request validation, consent and replay to `.gate1/runtime/submit.ts`.
- The production candidate invokes `public.lx_edge_submit_share_request`, defined in `.gate1/runtime/edge-submit-candidate.sql`. This function is EXECUTE-granted only to `service_role` and explicitly rejects non-service JWT role claims. Edge must use its server-only service credential; browser must never receive it.
- The candidate uses the verified member ID from `auth.getUser(token)`; it must never trust a caller-supplied `user_id`. The adapter temporarily sets the request JWT subject within a single SQL transaction so the existing audited `lx_submit_share_request` enforces the same ownership, agreement, lock and atomic bag creation. This is a deliberate trusted-server identity bridge, not a browser API.
- Original `gate1_internal_submit` is kept for historical isolated tests; the real C09 browser E2E exercises the new candidate RPC.

## C09 compatibility and rollout
1. **Legacy C09 remains unchanged.** Existing `app/c09.html` and its legacy photo path and `lx_attach_my_draft_placement` remain available. Never revoke legacy grants until old sessions and drafts have been migrated or expired.
2. **V5 is a separate entrypoint**, `app/c09-v5.html`, using `user/draft/timestamp-random.webp`, `lx_share_draft_details`, preflight and the Edge API. Its default submit endpoint is intentionally empty; production configuration and routing require separate approval.
3. Do not enforce the 300 KB / WebP-only Storage bucket setting on the shared remote bucket while legacy C09 is in use. A separate V5 bucket or a versioned compatibility period is required.
4. V5 does not yet migrate old `lx_share_draft_placements` into `lx_share_draft_details`. Preserve old drafts and provide a deliberate migration/continue-in-old-version UX before switching all members.
5. C09 V5 photo replacement should explicitly clean up or track the prior object. Do not delete already submitted evidence.

## Remaining predeployment blockers
- Test the production Edge entrypoint itself (not only the shared handler), including real deployed local Edge runtime CORS, JWT and service secrets; current local E2E invokes the handler through a loopback Deno server.
- Verify the SQL adapter role claim and ownership denial in real local PostgREST, plus same-request retry and concurrent submit.
- Separate browser publishable key and endpoint configuration from loopback-only test injection, without embedding service keys.
- Confirm storage limits and pixel validation for the intended V5 bucket; PHOTO-001 local 300000-byte bucket boundary test already passes.
- Verify old C09 RPC permissions and existing-draft compatibility in a local fixture, including rollback.
- Save SQL grants, function definitions, bucket policies and main commit snapshots before any authorized deployment.

## Rollback
Close submission gate first, restore previous C09 routing and Edge version, then restore prechange RPC GRANT and Storage policies only as needed. Do not delete committed requests or bags. Remote rollout requires a separate explicit authorization and an independently verified backup.
