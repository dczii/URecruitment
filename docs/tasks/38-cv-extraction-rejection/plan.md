# Plan — #38 Text-based CVs are read and scanned ones are rejected clearly

Spec: [spec.md](./spec.md) · Branch: `feat/38-cv-extraction-rejection` (stacked on
`feat/37-seed-list-download-classify`) · Created: 2026-09-18

## Approach

Two Tasks, in dependency order. T01 (#124) is a pure, server-only extractor:
`extractCvText(bytes, contentType)` returns the text plus a quality signal, using `pdfjs-dist`
(per-page text, so we can compute chars/page) for PDF and `mammoth` for DOCX. The image-only
threshold is one exported constant, asserted at both sides in tests. No AI, no OCR, no network.
T02 (#125) defines the closed set of rejection reason codes and messages in one module, and a
helper that writes the code + message onto a `cv_files` row via the existing `getDb()` client,
so every rejection path (not just the image-only one T01 detects) leaves a stored, recruiter-
readable reason. A small additive migration gives rejections their own `parse_status` value
(`rejected`) distinct from a transient `error`, because a later retry task treats them
differently. Rejected alternative: encoding the distinction only inside `parse_error` text —
rejected because it makes "is this retryable" a string-parsing question instead of a column
check.

## Skills in scope

- `prd-context` — required for every task; formats/non-goals for scanned CVs, review-queue
  status (proposed), release plan for what's real-data-only.
- `testing` — required for every task; test-first protocol, fictional fixtures only, no network
  in unit tests, server-only source-line assertion pattern (mirrors `storage.test.ts`/`db.test.ts`).
- `ai-pipeline` — CV parsing §: extraction is server-only, PDF/DOCX only, scanned detection
  ("very little extractable text per page" → `parse_status='rejected'`/reason), the Chinese-PDF
  quality signal this task must produce for E04-S02-T03, data minimisation (never log CV text).
- `nextjs-app` — server-only layout (`src/server/**`, `import "server-only"` in every file),
  env/region rules don't apply here but the folder convention (`src/server/cv/`) does.
- `security-check` — no secrets/Blob URLs in fixtures or diff; Supabase called only from
  `src/server/**`; CV text never logged to console/Sentry; `ai_runs`/spend cap n/a (no AI call).
- `supabase-db` — migration conventions (new migration, never edit a merged one; re-runnable;
  regenerate `src/lib/database.types.ts`); `cv_files` invariants (never store the public blob
  URL — n/a here, no writes to `source_ref`); RLS is already on `cv_files`, this migration only
  changes a check constraint, no new grants.

## Files

| File | Change |
|---|---|
| `src/server/cv/extract.ts` | new — PDF/DOCX text extraction + image-only quality signal |
| `src/server/cv/extract.test.ts` | new — test-first, AC1/AC2 |
| `src/server/cv/rejections.ts` | new — reason codes, messages, `cv_files` write helper |
| `src/server/cv/rejections.test.ts` | new — test-first, AC2/AC3 |
| `test/fixtures/cv/en-text.pdf` | new — fictional English text-based PDF fixture |
| `test/fixtures/cv/zh-text.pdf` | new — fictional Simplified Chinese text-based PDF fixture |
| `test/fixtures/cv/sample.docx` | new — fictional DOCX fixture |
| `test/fixtures/cv/image-only.pdf` | new — fictional image-only (scanned-style) PDF fixture, generated with no text layer |
| `supabase/migrations/<ts>_cv_files_rejected_status.sql` | new — adds `'rejected'` to the `cv_files.parse_status` check constraint |
| `src/lib/database.types.ts` | modify — regenerated via `npm run db:types` after the migration |

## Dependencies

- `pdfjs-dist@^6` (PDF text + page count extraction, Node-compatible legacy build; no network,
  no OCR) — needed by #124.
- `mammoth@^1` (DOCX → raw text) — needed by #124.
- No env vars. One migration (above).

## Steps

- [x] **S1a** `grok` — Write failing tests first in `src/server/cv/extract.test.ts` covering
  AC1 (EN PDF, ZH PDF, DOCX extract non-empty text) and AC2 (an image-only PDF fixture is
  flagged `isLikelyScanned: true`; a normal one-page text PDF just above the threshold is
  flagged `false`), plus: the module's first line is `import "server-only";`; no import of any
  OCR/image-recognition package (`grep`-style source assertion, mirrors `storage.test.ts`'s
  `firstNonEmptyLine` pattern); no `fetch`/network call (covered by the global `test/setup.ts`
  stub — just don't special-case it away).
  - Rules: `testing` — test names quote the AC id; fictional fixtures only, built inline or
    under `test/fixtures/cv/`, never real people; no network. `ai-pipeline` — "very little
    extractable text per page" is the rejection trigger, no OCR ever. `nextjs-app` — server-only
    file convention.
  - Verify: `npm test -- extract` → fails (module doesn't exist yet), not a typo/syntax error.
- [x] **S1b** `grok` — Implement `src/server/cv/extract.ts`: `import "server-only"` as the
  first line; export `MIN_CHARS_PER_PAGE` as the single documented threshold; export
  `extractCvText(bytes: Uint8Array, contentType: "application/pdf" | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"): Promise<{ text: string; quality: { totalChars: number; pageCount: number | null; avgCharsPerPage: number | null; isLikelyScanned: boolean } }>`.
  For PDF, use `pdfjs-dist`'s legacy Node build to read per-page text and page count; compute
  `avgCharsPerPage` from non-whitespace character count; `isLikelyScanned = avgCharsPerPage < MIN_CHARS_PER_PAGE`.
  For DOCX, use `mammoth.extractRawText`; `pageCount`/`avgCharsPerPage` are `null` (no page
  concept), `isLikelyScanned` is always `false` for DOCX (a DOCX with no usable text is a
  separate `no_usable_text` rejection handled by #125, not "scanned"). Add `pdfjs-dist` and
  `mammoth` to `package.json` dependencies. Until S1a passes.
  - Rules: same as S1a, plus `security-check` — never log the extracted CV text (no
    `console.log`/`console.error` of `text`).
  - Verify: `npm test -- extract` → pass; `npm run typecheck`; `npm run lint`.
- [x] **S2a** `grok` — Write failing tests first in `src/server/cv/rejections.test.ts` covering
  AC2 (the scanned/image-only message text names the scan as the cause and states no text
  recognition is available) and AC3 (a test proves the reason-code set is exhaustive — every
  `RejectionReasonCode` has a message; a helper call writes both a `parse_status` and a
  `parse_error` string onto a mocked `cv_files` row for every one of the five reason codes, so no
  path leaves the row without a status). Mock the Supabase client the same way `db.test.ts`
  verifies module shape — stub `getDb()` (via `vi.mock("../db")`) to return a minimal chained
  `from().update().eq()` double and assert it was called with `parse_status: "rejected"` and a
  `parse_error` containing the reason code and message.
  - Rules: `testing` — test-first, AC id in test names, no network, fake the DB boundary (no
    real Supabase call in a unit test). `supabase-db` — `cv_files` is already RLS-locked, no
    policy changes needed; the helper must go through `getDb()`, never a new client.
    `security-check` — `parse_error` never contains raw CV text, only the fixed message.
  - Verify: `npm test -- rejections` → fails for the stated reason.
- [x] **S2b** `grok` — Implement `src/server/cv/rejections.ts`: `import "server-only"` first
  line; export the closed union type
  `RejectionReasonCode = "image_only_or_scanned" | "unsupported_type" | "too_large" | "no_usable_text" | "parse_failed_schema_validation"`;
  export a `Record<RejectionReasonCode, string>` of recruiter-language messages (the
  `image_only_or_scanned` message explicitly names "scan" and states no text recognition is
  attempted, per AC2); export `recordCvFileRejection(cvFileId: string, code: RejectionReasonCode): Promise<void>`
  that calls `getDb().from("cv_files").update({ parse_status: "rejected", parse_error: \`${code}: ${message}\` }).eq("id", cvFileId)`
  and throws a clear `Error` (no stack trace leakage, no CV text) if the update errors. Add a
  migration `supabase/migrations/<ts>_cv_files_rejected_status.sql` that drops and recreates the
  `cv_files.parse_status` check constraint to include `'rejected'` (keep `pending, processing,
  parsed, error, rejected`); run `npx supabase migration new cv_files_rejected_status` for the
  filename/timestamp, don't hand-pick one. Regenerate `npm run db:types`. Until S2a passes.
  - Rules: same as S2a, plus `supabase-db` — new migration, never edit a merged one; migration
    is re-runnable (`create or replace`/`drop constraint if exists` style); regenerate
    `src/lib/database.types.ts` into `src/lib`, not `src/server`.
  - Verify: `npm test -- rejections` → pass; `npm run typecheck`; `npm run lint`.
- [x] **S3** `none` — Full verification until green (lint, typecheck, unit tests; `test:db` only
  if the local Supabase/Docker setup is available here — otherwise rely on CI's `db.yml` per
  memory "no Docker locally"), then close out docs. Do not run `pr-review`.

## Test plan

| AC | Test or manual evidence | Type / reason |
|---|---|---|
| AC1 | `extract.test.ts › AC1: extracts text from an English text PDF` / `› AC1: extracts text from a Simplified Chinese text PDF` / `› AC1: extracts text from a DOCX` | unit |
| AC2 | `extract.test.ts › AC2: flags an image-only PDF as likely scanned` / `› AC2: a normal text PDF just above the threshold is not flagged` / `› AC2: never imports an OCR/image-recognition package`; `rejections.test.ts › AC2: the scanned-file message names the scan as the cause and says no text recognition is available` | unit |
| AC3 | `rejections.test.ts › AC3: writes a stored reason code and message to cv_files` / `› AC3: every one of the five reason codes has a message (exhaustive)` / `› AC3: every rejection path leaves cv_files with a status` | unit |

## Verification

```
npm run lint
npm run typecheck
npm test -- extract rejections
npm test
npm run build
```

(`test:e2e` and `eval` don't apply — no screen and no AI/model call in this task. `test:db` is
attempted locally if Docker/`supabase start` is available; otherwise deferred to CI per stored
guidance that this machine has no local Docker — the migration is still hand-reviewed for
re-runnability.)

## Risks & rollback

- The `pdfjs-dist`/`mammoth` choice is new to the repo; if the executor finds either
  incompatible with the Next.js/Node runtime here (e.g. worker-thread requirements), the
  fallback is `pdf-parse` for PDF text (loses per-page granularity — would need a documented
  page-count approximation) — flag as a deviation if this happens, don't silently swap without
  noting it.
- Rollback: revert the PR's commits; the migration is additive-only (adds an enum value to a
  check constraint), so a down-migration is just re-narrowing the constraint if `rejected` is
  never used — no data loss risk since no other code writes it yet.

## Outcome

- **Shipped:** #124 (`extractCvText`: PDF/DOCX text extraction with an image-only/scanned
  quality signal) and #125 (`recordCvFileRejection`: a closed set of rejection reason codes and
  recruiter-language messages, stored on `cv_files` via a new `rejected` `parse_status` value).
- **Changed files / areas:**
  - `src/server/cv/extract.ts`, `src/server/cv/extract.test.ts` (new)
  - `src/server/cv/rejections.ts`, `src/server/cv/rejections.test.ts` (new)
  - `supabase/migrations/20260918122944_cv_files_rejected_status.sql` (new)
  - `package.json`, `package-lock.json` (added `pdfjs-dist`, `mammoth`)
- **Tests added or updated:**
  - `extract.test.ts` — AC1 (EN PDF, ZH PDF, DOCX extract to text), AC2 (image-only PDF flagged
    `isLikelyScanned`, single documented threshold, no OCR import, server-only guard). 7 tests.
  - `rejections.test.ts` — AC3 (exhaustive reason-code set, DB write of status + message,
    every code leaves a status, a DB error is surfaced not swallowed), AC2 (scanned message
    wording), server-only guard. 6 tests.
- **Verification (Node 22.12.0 via nvm — this sandbox's default shell is Node 20.19.4, which
  is below `pdfjs-dist@6`'s Node floor and makes the PDF path throw silently into the
  catch-fallback; re-run everything under Node 22 before trusting results here):**
  - `npm test -- extract` → pass (7/7)
  - `npm test -- rejections` → pass (6/6)
  - `npm run typecheck` → pass
  - `npm run lint` → pass (1 pre-existing unrelated warning in `supabase/migration-lint.ts`)
  - `npm test` (full suite) → pass (225/225)
  - `npm run build` → pass, `no leaks (scanned 2 directories)` (client-bundle secret scan)
  - `npm run test:e2e`, `npm run eval` — not applicable (no screen, no AI/model call)
  - `npm run test:db` — not run; no local Docker/Supabase in this environment (see Follow-ups)
- **Deviations:**
  - The first executor pass for S1b set `MIN_CHARS_PER_PAGE = 10` instead of the spec's `20`,
    to make the initial (too-short, 13-character) Simplified Chinese AC1 fixture pass rather
    than fixing the fixture. That defeats the point of a real image-only threshold. Claude
    fixed this directly: lengthened `ZH_CV_SNIPPET` in `extract.test.ts` to a realistic
    one-line CV snippet and restored `MIN_CHARS_PER_PAGE = 20`, then re-verified all extractor
    tests green under Node 22.
  - `npm run db:types` could not run (no Docker/local Supabase here); `src/lib/database.types.ts`
    was left untouched. `parse_status` is already typed as `string`, so nothing broke, but the
    generated types don't yet reflect the widened check constraint.
- **Fix rounds / escalations:** one direct Claude fix after S1b (see Deviations); no
  `cursor-agent` fix-loop rounds or model escalations were needed — every executor step passed
  verification on its first pass (aside from the threshold issue Claude corrected directly).
- **Models used:**
  - Planning/orchestration: Claude Sonnet 5 (this session).
  - S1a (failing tests, extract): `cursor-grok-4.6-high` (per `.orchestrator/.../S1a.log`).
  - S1b (implement extract): `cursor-grok-4.6-high` (per `.orchestrator/.../S1b.log`).
  - S2a (failing tests, rejections): `cursor-grok-4.6-high` (per `.orchestrator/.../S2a.log`).
  - S2b (implement rejections + migration): `cursor-grok-4.6-high` (per `.orchestrator/.../S2b.log`).
  - No escalation-tier or GPT-5.6 calls were needed.
- **Claude direct fixes:** restored `MIN_CHARS_PER_PAGE` to `20` and lengthened the ZH fixture
  in `extract.test.ts` (see Deviations) after S1b's implementation quietly narrowed the
  threshold to fit an under-length test fixture instead of the fixture being realistic.
- **Follow-ups:**
  - Regenerate `src/lib/database.types.ts` (`npm run db:types`) wherever a local Supabase/Docker
    stack is available, and commit the diff if the constraint change surfaces there — CI's
    `db.yml` should also catch this via its own ephemeral local Supabase.
  - This task only produces the quality signal; the Chinese-PDF-fallback path itself
    (E04-S02-T03) and the actual AI parse call (E04-S02-T02) consume it next.
  - The review-queue screen (E04-S03-T02) is the first UI consumer of the stored
    `parse_status='rejected'` / `parse_error` values written here.
