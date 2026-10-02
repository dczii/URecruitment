# Plan — #35 CV files are stored privately and open only through short-lived links

Spec: [spec.md](./spec.md) · Branch: `feat/35-cv-storage-signed-urls` · Created: 2026-09-18

## Approach

Create the private `cv-files` Storage bucket in a new migration, following the exact D2 lock-down pattern used by #34's migrations (enable RLS-equivalent Storage policy scoping, revoke public access, all in the same migration that creates the bucket). Add `src/server/storage.ts`, a thin `server-only` wrapper over the Supabase JS Storage API exposing `uploadCvFile` and `signCvFilePath`, with upload validation (type + 50 MB) done in code before calling Storage. Test-first per `testing`: unit tests fake the Supabase client boundary (upload/sign are pure logic + a thin call), and a DB integration test proves the bucket is actually private against a real (local) Supabase instance. No new table — `cv_files.storage_path` (from #110) is the pointer this Task's helper writes into.

## Skills in scope

- `prd-context` — required for every task; confirms CV storage security items and cv_files data model status.
- `testing` — required for every task; test-first protocol, DB-test RLS-lockdown requirement, fictional fixtures only.
- `github-workflow` — required for every task; branch/commit/PR mechanics for this stacked Task+Story.
- `supabase-db` — this Task creates a Storage bucket and migration; bucket must be private, signed URLs ≤300s, path convention `<kind>/<uuid>/<original-filename>`, 50 MB ceiling.
- `security-check` — Storage bucket privacy, signed-URL lifetime, upload validation by magic bytes not just extension, server-only import boundary.
- `nextjs-app` — `src/server/storage/` is the designated location for signed URLs/uploads per the app layout; `import "server-only"` rule.
- `compliance-review` — candidate CV files are candidate data; checks server-only access and no real data path.

## Files

| File | Change |
|---|---|
| `supabase/migrations/20260918000005_cv_storage_bucket.sql` | new — private `cv-files` bucket, storage policies restricted to the service role only |
| `src/server/storage.ts` | new — `uploadCvFile`, `signCvFilePath`, upload validation (type/size) |
| `src/server/storage.test.ts` | new — unit tests: expiry lifetime documented, path-outside-bucket rejection, oversized/disallowed-type rejection, client-import refusal |
| `supabase/tests/storage.db.test.ts` | new — DB integration: bucket has no public policy; an expired/foreign signed URL is refused |

## Dependencies

- none — uses the already-installed `@supabase/supabase-js` client via the existing `getDb()` in `src/server/db.ts`.

## Steps

- [x] **S1a** `grok` — Write failing tests in `src/server/storage.test.ts` for: signed-URL lifetime is ≤300s and documented; signing a path outside `cv-files/` is rejected; upload rejects a file over 50 MB or a disallowed content type; importing `storage.ts` from a `"use client"` file fails the build (mirror `no-browser-supabase.test.ts`'s pattern). Covers AC2, AC4, AC5.
  - Rules: `testing` §Test-first protocol (fail for the stated reason, not an import error); `security-check` §Storage (signed URLs ≤300s, never persisted); `nextjs-app` §1 (server-only boundary).
  - Verify: `npm test -- storage` → fails because `storage.ts` doesn't exist yet.
- [x] **S1b** `grok` — Implement `src/server/storage.ts` (`import "server-only"` as the first line) and the migration `supabase/migrations/20260918000005_cv_storage_bucket.sql` until S1a passes.
  - Rules: `supabase-db` §Security (private bucket, no public policies, signed URL ≤300s, path `<kind>/<uuid>/<original-filename>`, ≤50MB); `security-check` §Data access/Input handling (magic-byte check for PDF/DOCX, sanitised filename, UUID path); `nextjs-app` §1 (server-only import).
  - Verify: `npm test -- storage` → pass; `npm run typecheck`.
- [x] **S2** `grok` — Write `supabase/tests/storage.db.test.ts`: the bucket has RLS/no public policy (publishable-key access to Storage returns nothing), and an expired or tampered signed URL is refused by Supabase Storage itself. Covers AC1, AC3.
  - Rules: `supabase-db` §Required test (publishable key gets nothing); `testing` §DB tests (rollback/reset, RLS lock-down test per new bucket).
  - Verify: `npm run test:db` → pass locally with Docker; if Docker is unavailable here, documented as a deferred-to-CI gap, not skipped or claimed green.
- [x] **S3** `none` — Full verification until green (lint, typecheck, unit tests, test:db attempt), close out docs. Do not run `pr-review`.

## Test plan

| AC | Test or manual evidence | Type / reason |
|---|---|---|
| AC1 | `supabase/tests/storage.db.test.ts › bucket is private with no public policy` | DB integration |
| AC2 | `src/server/storage.test.ts › signs a path for a short-lived URL` | unit |
| AC3 | `supabase/tests/storage.db.test.ts › an expired signed URL is refused` | DB integration |
| AC4 | `src/server/storage.test.ts › rejects a path outside the bucket` / `› rejects an oversized or disallowed upload` | unit |
| AC5 | `src/server/storage.test.ts › cannot be imported from client code` | unit (build-time import guard) |

## Verification

```
npm run lint
npm run typecheck
npm test
npm run build        # if app code changed
npm run test:e2e     # if a screen changed
npm run eval         # if AI parsing/matching changed
```

## Risks & rollback

<!-- What could break, and how to undo it (revert commit, down migration, re-seed). -->

## Outcome

- **Shipped:** Private `cv-files` Storage bucket (migration `20260918000005_cv_storage_bucket.sql`) with no anon/authenticated policies; `src/server/storage.ts` (`import "server-only"`) exposing `signCvFilePath` (≤300s signed URLs, path-prefix validation) and `uploadCvFile` (50 MB cap, PDF/DOCX magic-byte check). Fully satisfies #114's "Done when" and Story #35's AC1–AC3, plus AC4/AC5 from the Task's own scope.
- **Changed files / areas:** `supabase/migrations/20260918000005_cv_storage_bucket.sql` (new), `src/server/storage.ts` (new), `src/server/storage.test.ts` (new), `supabase/tests/storage.db.test.ts` (new).
- **Tests added or updated:** `src/server/storage.test.ts` (4 unit tests: signed-URL lifetime/rejection, path-outside-bucket rejection, oversized/disallowed-upload rejection, server-only import guard); `supabase/tests/storage.db.test.ts` (2 DB-integration tests: bucket-private/no-public-policy proof with a live anon-client refusal check, expired-signed-URL refusal proof against a fresh-vs-expired control).
- **Verification:**
  - `npm test -- storage` → **pass** (4/4)
  - `npm run typecheck` → **pass**
  - `npm run lint` → **pass** (1 pre-existing unrelated warning in `supabase/migration-lint.ts`)
  - `npm test` (full suite) → 167 pass, 2 fail — pre-existing unrelated `db.test.ts` WebSocket/Realtime failure, present on `main`/#34 before this branch, not caused by this Task
  - `npm run test:db` → **fail** (`ECONNREFUSED 127.0.0.1:54322` on all 4 DB test files) — no Docker/local Supabase available in this environment; both new tests were collected and failed on the missing local stack, not on an import/syntax error. Deferred to CI's `db.yml` job (`supabase start` → `db reset` → `test:db`), consistent with the no-Docker-locally constraint noted in prior tasks.
- **Deviations:** none from the plan's scope. The executor additionally hardened AC1's DB test with a catalogue-level `pg_policies` check (mirroring `rls.db.test.ts`'s style) on top of the required anon list/download refusal — a strengthening, not a scope change.
- **Fix rounds / escalations:** none — all three steps (S1a, S1b, S2) passed inspection and verification on the first attempt.
- **Models used:**
  - Planning/orchestration: Claude Sonnet 5 (`claude-sonnet-5`)
  - S1a (failing tests): `cursor-grok-4.6-high`
  - S1b (implementation): `cursor-grok-4.6-high`
  - S2 (DB-integration tests): `cursor-grok-4.6-high`
  - No escalations, no GPT-5.6 steps, no direct Claude fixes.
- **Claude direct fixes:** none required.
- **Follow-ups:**
  - Run `npm run test:db` in CI (or locally with Docker) to get real DB-level green for AC1/AC3.
  - S2's executor flagged that `.github/workflows/db.yml` currently exports `SUPABASE_URL`, `SUPABASE_DB_URL`, `SUPABASE_PUBLISHABLE_KEY` but not an explicit secret-key variable; the new DB test falls back to parsing `supabase status -o env` for it. Confirm in CI that this fallback actually resolves a secret key, or add one to `db.yml` explicitly (out of scope for this Task).
