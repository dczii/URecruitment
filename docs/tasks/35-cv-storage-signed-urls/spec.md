# Spec — #35 CV files are stored privately and open only through short-lived links

| | |
|---|---|
| Issue | https://github.com/dczii/URecruitment/issues/35 |
| Parent | Story #35 → Epic #… |
| Milestone | MVP |
| Branch | `feat/35-cv-storage-signed-urls` |
| Created | 2026-09-18 |
| Status | In review <!-- Planned → In progress → In review --> |

## Problem

A recruiter needs to open a candidate's original CV from their profile. Nothing today stops that file from being reachable by anyone who guesses its URL — there is no private bucket and no signed-URL helper. Task #114 builds both, test-first, on top of the `cv_files` table shipped in #34/#110.

## PRD references

| PRD section | Item | Status |
|---|---|---|
| Security | CV files sit in a private bucket and open through short-lived signed links | suggested |
| CV processing | Parsed profile keeps a link to the original file, always kept | approved |
| Data model | `cv_files`: files in Storage with parse status and errors | suggested |

## Scope

**In scope**
- A migration creating a private Storage bucket (`cv-files`) with no public policy.
- `src/server/storage.ts` (`import "server-only"`): upload a file into the bucket, and sign a path for a short, documented lifetime (300 s, the `supabase-db` ceiling).
- Upload validation: allowed types (PDF/DOCX) and the Supabase Free 50 MB per-file ceiling.
- Failing-then-passing tests: signed URL expires; signing rejects a path outside the bucket; the helper cannot be imported from client code; RLS/no-public-policy DB proof.

**Out of scope**
- Recruiter upload UI (real-data release).
- Text extraction (E04-S01-T01).
- Serving files through the app instead of via signed URLs.

## Acceptance criteria

- [x] **AC1** — Given the storage bucket, when it is inspected, then it is private and has no public read policy. _Proved by:_ `supabase/tests/storage.db.test.ts › bucket is private with no public policy`
- [x] **AC2** — Given a recruiter opens a CV, when the link is generated, then it is a signed URL that expires after a short, documented lifetime (≤ 300 s). _Proved by:_ `src/server/storage.test.ts › signs a path for a short-lived URL`
- [x] **AC3** — Given an expired signed URL, when it is used, then the file is not served. _Proved by:_ `supabase/tests/storage.db.test.ts › an expired signed URL is refused`
- [x] **AC4** (from #114 scope) — Given a path outside the bucket, or an upload over the size/type limit, when signing/uploading is attempted, then it is rejected with a clear reason. _Proved by:_ `src/server/storage.test.ts › rejects a path outside the bucket` and `› rejects an oversized or disallowed upload`
- [x] **AC5** — Given `storage.ts` is imported, when it is imported from client code, then the build fails. _Proved by:_ `src/server/storage.test.ts › cannot be imported from client code` (asserts the `server-only` import guard, mirroring `no-browser-supabase.test.ts`)

## Guardrails that apply

- [x] Server-only data access; secret key never reaches the browser — `storage.ts` is `import "server-only"` and only called from server code.
- [x] RLS on new tables, no public policies; private Storage + signed URLs — this Task *is* that guardrail: private bucket, ≤300s signed URLs, no public policy.
- [x] Fictional data only; no secrets or sample-data Blob URLs committed — test fixtures are synthetic bytes, not real CVs.
- [x] Free-tier limits respected (no frequent cron, file ≤ 50 MB) — upload validation enforces the 50 MB Supabase Free ceiling.

## UX / design

n/a — no screen in this Task (upload UI is real-data release scope).

## Data / API changes

- New migration: private Storage bucket `cv-files`, no public policies (Storage-level RLS via `storage.objects` policies scoped to server role only).
- New file `src/server/storage.ts`: `uploadCvFile(path, bytes, contentType)`, `signCvFilePath(path, expiresInSeconds = 300)`.
- No new tables (`cv_files` already exists from #110).

## Assumptions

- Bucket name `cv-files` (matches `supabase-db` skill's example and #114's file-path hints).
- Signed-URL lifetime fixed at 300 seconds — the skill's stated ceiling — since #114 asks for "a short, documented lifetime" without naming a number.
- Allowed upload types: PDF and DOCX only, per #114's "Upload validation: allowed types" and the CV-processing PRD scope (no other file kinds are parsed in the MVP).

## Open questions

- none
