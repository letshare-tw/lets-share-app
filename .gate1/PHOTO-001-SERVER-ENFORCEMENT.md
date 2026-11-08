# DEPLOY-03 / PHOTO-001 — 300 KB server-side enforcement plan (NOT DEPLOYED)

Decision: one placement photo must be <= **300,000 bytes** (decimal KB), automatically converted to WebP, longest edge <= 1280 px. C09 V5 performs client-side compression before Storage upload. Client checks are UX, not a security boundary.

## Enforce actual bytes on the server

1. **Do not change any remote bucket now.** Both remote projects currently allow 10,485,760 bytes for private `share-placement-photos`; old C09 may upload larger JPEGs. Changing the bucket immediately would break legacy uploads.
2. During staged rollout, first test a separate isolated local Supabase bucket with `file_size_limit=300000` and `allowed_mime_types=['image/webp']`. Verify a 300,000-byte WebP succeeds and a 300,001-byte object is rejected through the real Storage API, including attempts bypassing C09. Verify JPEG/PNG are rejected by Storage while the new C09 converts them to WebP.
3. Confirm all active clients have migrated to the WebP flow and existing drafts can still read older images. Then obtain separate approval to change the remote bucket size and MIME restrictions. **Do not** enforce WebP-only on the shared bucket while legacy C09 remains active; consider a separate V5 bucket if parallel support is required.
4. A Storage bucket byte cap does not validate image pixel dimensions or actual content bytes. For server-side verification of <=1280 px and genuine WebP format, use a trusted image-validation/transform endpoint or verified processing pipeline; do not rely on the file extension or client-reported MIME alone. Block formal submission unless the stored image has passed validation; ensure validation is tied to the member-owned draft.
5. Existing >300 KB files must remain readable under any migration, unless a separately authorized retention/cleanup procedure applies. Rollback is to restore the saved bucket configuration and previous application routing; never delete committed user data.
6. Acceptance: real Chromium tests PNG/JPEG/WebP input, 1280px/300000-byte output, actual Storage request body; real local Storage negative tests for 300001 bytes and MIME bypass; cross-user RLS denial; preflight/submit/bag/48-hour E2E; rollback simulation. Keep `main`, production site, and remote Supabase unchanged until separately authorized.

Current status: client enforcement implemented in test branch. Server-side enforcement is **planned only**; it is not implemented or verified in remote environments.
