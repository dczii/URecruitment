# Spec — #38 Text-based CVs are read and scanned ones are rejected clearly

| | |
|---|---|
| Issue | https://github.com/dczii/URecruitment/issues/38 |
| Parent | Story #38 → Epic #5 (CV processing) |
| Milestone | MVP |
| Branch | `feat/38-cv-extraction-rejection` |
| Created | 2026-09-18 |
| Status | In review <!-- Planned → In progress → In review -->

## Problem

A recruiter needs to know immediately and plainly when a CV cannot be turned into a profile
because it is a scan or image-only file, rather than seeing a candidate silently missing a
profile. Today there is no server-side text extraction and no stored, recruiter-readable
rejection reason for a CV file.

## PRD references

| PRD section | Item | Status |
|---|---|---|
| CV processing → Formats | Text-based PDF, .doc, .docx; scanned/image-only files rejected with a clear message | decided |
| AI pipeline → Text extraction | PDF and .docx text extracted on the server; legacy .doc converted in the seed script | proposed |
| Non-goals | Scanned or photographed CVs — no OCR | decided |
| CV processing → requirement 2 | A file that fails to parse goes to a review queue with the reason | proposed (review-queue UI is out of scope here; this task supplies the stored reason) |

## Scope

**In scope**
- `src/server/cv/extract.ts`: server-only text extraction from PDF and DOCX bytes, with a
  quality signal (`totalChars`, `pageCount`, `avgCharsPerPage`, `isLikelyScanned`) that a later
  Chinese-PDF-fallback task (E04-S02-T03) can act on.
- A single, documented image-only/scanned threshold (`MIN_CHARS_PER_PAGE`), asserted at both
  sides by a test (#124).
- `src/server/cv/rejections.ts`: a closed set of rejection reason codes, one recruiter-language
  message per code held in one place, and a helper that writes the code + message against a
  `cv_files` row so no rejection path leaves the row without a stored reason (#125).
- A migration adding a `rejected` value to `cv_files.parse_status` (see **Data / API changes**),
  so a definitive, non-retryable rejection is distinguishable from a transient `error` that a
  later retry task (E04-S03-T01) may re-attempt.
- Fictional CV fixtures under `test/fixtures/cv/`: EN text PDF, ZH text PDF, DOCX, and an
  image-only PDF.

**Out of scope**
- Calling any AI model (E04-S02-T02) and the Chinese-PDF-fallback path itself (E04-S02-T03) —
  this task only produces the quality signal that decides it.
- Legacy `.doc` conversion — done by the seed script (E03-S04-T02).
- The review-queue screen (E04-S03-T02) and retrying a rejected/errored file (E04-S03-T01).
- Any OCR or image processing.
- Translating rejection messages into Chinese.

## Acceptance criteria

- [x] **AC1** — Given a text-based PDF or DOCX, when it is processed, then its text is
  extracted on the server and returned for parsing.
  _Proved by:_ `extract.test.ts › AC1: extracts text from an English text PDF`,
  `extract.test.ts › AC1: extracts text from a Simplified Chinese text PDF`,
  `extract.test.ts › AC1: extracts text from a DOCX`.
- [x] **AC2** — Given an image-only or scanned file, when it is processed, then it is rejected
  with a reason a recruiter understands and no text recognition is attempted.
  _Proved by:_ `extract.test.ts › AC2: flags an image-only PDF as likely scanned`,
  `extract.test.ts › AC2: never imports an OCR/image-recognition package`,
  `rejections.test.ts › AC2: the scanned-file message names the scan as the cause and says no text recognition is available`.
- [x] **AC3** — Given a rejected file, when I look at it later, then the reason is stored
  against the file rather than only logged.
  _Proved by:_ `rejections.test.ts › AC3: writes a stored reason code and message to cv_files`,
  `rejections.test.ts › AC3: every rejection path leaves cv_files with a status`.

## Guardrails that apply

- [x] Server-only data access; secret key never reaches the browser — `extract.ts` and
  `rejections.ts` both start `import "server-only"`; a test asserts it (mirrors `storage.test.ts`).
- [x] RLS on new tables/columns, no public policies — the `parse_status` migration touches an
  already-locked-down table (`cv_files`); no new grants are added.
- [x] Fictional data only; no secrets or sample-data Blob URLs committed — all fixtures are
  invented CV snippets under `test/fixtures/cv/`.
- [x] Free-tier limits respected — extraction runs in-process on the existing 50 MB upload cap
  (`storage.ts`); no new external calls.
- [ ] AI only suggests: no auto reject/advance/shortlist/contact — n/a, no AI call in this task.
- [ ] No email sent — n/a.
- [ ] AI output schema-validated, logged to `ai_runs`, shows source text — n/a, no AI call.
- [ ] Protected attributes ignored — n/a, no scoring in this task.
- [ ] UTC stored, SGT shown; SG working days — n/a.
- [ ] Typed recruiter name recorded on stage/settings changes — n/a, no stage/settings change.
- [ ] Works at phone width; status not colour-only; Chinese text renders — n/a, no UI in this task.

## UX / design

n/a — server-only logic. The review-queue screen that will display these messages is E04-S03-T02.

## Data / API changes

- New migration `supabase/migrations/<ts>_cv_files_rejected_status.sql`: replaces the
  `cv_files.parse_status` check constraint to add `'rejected'` alongside the existing
  `pending, processing, parsed, error`. No RLS change (table is already locked down from
  #110/#5's foundation migration). `npm run db:types` regenerates `src/lib/database.types.ts`.
- No new tables. No Server Actions or route handlers (this task is pure library code consumed by
  the future parsing pipeline task, E04-S02).

## Assumptions

- **`rejected` vs `error` split (reversible):** the task body says "closed set of rejection
  reasons… written to `cv_files` parse status and error columns." The existing `error` value
  conflates a definitive, non-retryable rejection (scan, unsupported type, too large) with a
  transient failure a retry task might re-attempt. Adding `rejected` keeps that distinction
  explicit in the schema rather than encoding it only inside the `parse_error` string. This is a
  new migration (never edits a merged one) and is purely additive, so it's cheap to revisit if
  E04-S03-T01 (retrying) wants something different.
- **PDF library choice:** `pdfjs-dist` (per-page text + page count, needed for the
  chars-per-page threshold) for PDFs, `mammoth` for DOCX raw text. Both are widely used,
  dependency-light for this use case, and keep the extractor provider-agnostic (no AI call).
  Recorded under `plan.md → Dependencies`.
- **Image-only threshold:** `MIN_CHARS_PER_PAGE = 20` (non-whitespace characters per page,
  averaged). Chosen as a conservative bar — a genuine one-page CV render always has far more
  text than this; a scanned image page reliably extracts to ~0 characters via `pdfjs-dist`
  (no OCR is ever invoked). Documented as a single exported constant per the task's "stated as a
  single documented threshold" requirement.
- **DOCX "scanned" case:** a DOCX cannot be a scanned image in the same sense as a PDF (no
  embedded page raster with a text layer). If a DOCX extracts to (near) zero characters, it is
  rejected as `no_usable_text`, not `image_only_or_scanned` — that reason is PDF-page-quality
  specific.
- **Branch base:** per explicit instruction, this Story branches from and stacks on
  `feat/37-seed-list-download-classify` (Story #37, in progress) rather than from `main`. Its PR
  will be opened with that branch as base and marked `Stacked on:` / `Merge order:` accordingly,
  even though #37's own PR is not yet open — noted so the merge order is unambiguous for the
  human merging both.

## Open questions

- none
