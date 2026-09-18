# Spec — #37 Developers can rebuild all sample data with one command

| | |
|---|---|
| Issue | https://github.com/dczii/URecruitment/issues/37 |
| Tasks in this PR | #117, #118, #119 (Story #37, Tasks 4–7 remain open, see Scope) |
| Milestone | MVP |
| Branch | `feat/37-seed-list-download-classify` |
| Created | 2026-09-18 |
| Status | In review |

## Problem

`npm run seed` doesn't exist yet, so there is no way to rebuild the fictional dataset. This
PR builds the **foundation** of that pipeline: a hard environment guard that stops the seed
from ever touching the wrong Blob store or leaking its address (#117), the step that lists,
downloads, hashes and converts the sample files from the public sample-data store into a
local cache (#118), and the step that tells CVs and job descriptions apart by content (#119).
Uploading to Storage, parsing, embedding, scoring and back-dating pipeline entries (#120–#123)
depend on code that doesn't exist in this repo yet (CV parser #127, JD extractor #139, scoring
service #148, delay-status view #158, recruiter overrides #132) and are explicitly **out of
scope** for this PR — see Scope below.

## PRD references

| PRD section | Item | Status |
|---|---|---|
| Non-functional requirements → MVP data | 200 fictional CVs (~20 Simplified Chinese) + 20 sample jobs, preloaded by developers | decided |
| CV processing → Intake | Developers run the sample CVs through the real parser | decided |
| Main flows → Seeding | Upload, parse, embed, score, back-date stage entries | proposed |
| Free-tier limits | No backups; re-seed from the repo | decided |
| Sample data → Source | Public Vercel Blob store is the seed source only; app stores originals in private Supabase Storage | decided |
| Sample data → Data quirks | Flat layout means classifying CV vs JD by content, not by name; unclassifiable files are reported and skipped, never guessed | decided |
| Non-goals | Duplicate detection; resubmissions become separate candidates | decided (not exercised by this PR) |

## Scope

**In scope**
- #117 — Env guard: typed env vars for `BLOB_READ_WRITE_TOKEN` / `SEED_BLOB_BASE_URL`, wrong-store abort, missing-variable abort, a check that `src/` never imports the blob client.
- #118 — List (paginated), download to gitignored `.seed-cache/`, SHA-256 hash, skip unsupported types with a reason, convert legacy `.doc`, and a run report (counts by type/language, skipped files).
- #119 — Classify each downloaded file as `cv` / `job_description` / `unclassified` by content, with a confidence, reporting anything unclassified rather than guessing.

**Out of scope (remain open, blocked on unbuilt dependencies)**
- #120 (upload to Storage, parse, embed, load jobs, gap check, score) — needs the CV parser (#127), JD extractor (#139) and scoring service (#148), none of which exist in `src/` yet.
- #121 (back-date pipeline entries) — needs the delay-status view (#158).
- #122 (idempotency + `--reset`) — needs recruiter overrides (#132) to prove overrides survive re-parse, and needs #120's upsert target.
- #123 (seed run report: counts, skipped, resubmissions) — depends on #122.

This PR does not add `scripts/seed/index.ts` or the `seed` npm script that wires the steps
together into a single command; that lands with #120 once there is something to upload and
parse. #118 and #119 each expose a function tested and runnable directly (see Verification per
task), not yet a `npm run seed` entry point.

## Acceptance criteria

### #117 — Seed environment guard

- [x] **AC117.1** — Given `SEED_BLOB_BASE_URL` or `BLOB_READ_WRITE_TOKEN` is unset, when the seed env is parsed, then it aborts naming the missing variable and no value. _Proved by:_ `scripts/seed/env.test.ts › AC117.1`
- [x] **AC117.2** — Given a listed file's URL does not start with the configured `SEED_BLOB_BASE_URL`, when it is checked, then the run aborts. _Proved by:_ `scripts/seed/env.test.ts › AC117.2`
- [x] **AC117.3** — Given the repository, when scanned, then no base URL, token or downloaded file appears anywhere in it, and `src/` never imports `@vercel/blob`. _Proved by:_ `scripts/seed/no-blob-in-src.test.ts`

### #118 — List, download, hash, convert

- [x] **AC118.1** — Given the sample-data store, when listed, then every page is walked and each entry keeps `pathname`, `url`, `size`, `uploadedAt`. _Proved by:_ `scripts/seed/fetch.test.ts › AC118.1`
- [x] **AC118.2** — Given a supported file (PDF/DOC/DOCX), when downloaded, then its bytes land in `.seed-cache/` and its SHA-256 is computed. _Proved by:_ `scripts/seed/fetch.test.ts › AC118.2`
- [x] **AC118.3** — Given an unsupported file type, when processed, then it is skipped with a logged reason and never silently dropped. _Proved by:_ `scripts/seed/fetch.test.ts › AC118.3`
- [x] **AC118.4** — Given a legacy `.doc` file, when downloaded, then it is converted to a format the parser can read. _Proved by:_ `scripts/seed/fetch.test.ts › AC118.4`
- [x] **AC118.5** — Given a completed run, when reported, then counts by type and by detected language are printed, plus every skipped file with its reason. _Proved by:_ `scripts/seed/fetch.test.ts › AC118.5`

### #119 — Classify CV vs job description

- [x] **AC119.1** — Given an English CV fixture, when classified, then it returns `cv` with a confidence. _Proved by:_ `scripts/seed/classify.test.ts › AC119.1`
- [x] **AC119.2** — Given a Simplified Chinese CV fixture, when classified, then it returns `cv`. _Proved by:_ `scripts/seed/classify.test.ts › AC119.2`
- [x] **AC119.3** — Given a job description fixture, when classified, then it returns `job_description`. _Proved by:_ `scripts/seed/classify.test.ts › AC119.3`
- [x] **AC119.4** — Given an ambiguous fixture, when classified, then it returns `unclassified` and is reported with its name and reason, never guessed. _Proved by:_ `scripts/seed/classify.test.ts › AC119.4`

## Guardrails that apply

- [x] Server-only data access; secret key never reaches the browser — `BLOB_READ_WRITE_TOKEN` and `SEED_BLOB_BASE_URL` are read only in `scripts/seed/**`, never in `src/`, and never prefixed `NEXT_PUBLIC_`.
- [x] Fictional data only; no secrets or sample-data Blob URLs committed — the whole point of #117; `.seed-cache/` is gitignored (already was).
- [ ] AI only suggests: no auto reject/advance/shortlist/contact — n/a, no candidate-facing decision is made here.
- [ ] No email sent — n/a.
- [ ] RLS on new tables, no public policies; private Storage + signed URLs — n/a, no tables or Storage writes in this PR (upload lands in #120).
- [ ] AI output schema-validated, logged to `ai_runs`, shows source text — n/a for #117/#118. For #119, see Assumptions: the classifier in this PR is heuristic, not a model call, because the `runAi` wrapper and `ai_runs` table don't exist in this repo yet.
- [ ] Protected attributes ignored — n/a, no scoring in this PR.
- [ ] UTC stored, SGT shown; SG working days — n/a, no dates persisted in this PR (uploadedAt is read-only metadata from Blob's listing).
- [ ] Typed recruiter name recorded — n/a, dev-run script, not a recruiter action.
- [ ] Works at phone width — n/a, no UI in this PR.
- [x] Free-tier limits respected — no cron; `.seed-cache/` downloads are local/CI ephemeral, not persisted to Supabase Storage in this PR.

## UX / design

n/a — this PR ships CLI-invokable library functions and their tests, no UI.

## Data / API changes

None. No migrations, no tables, no route handlers. `.env.example` already lists
`BLOB_READ_WRITE_TOKEN` and `SEED_BLOB_BASE_URL` (added by an earlier task); this PR only
consumes them via a new `scripts/seed/env.ts`.

## Assumptions

- **#119's classification method is heuristics only, not a model call.** The task lets the
  spec choose "heuristics, a classification call, or both." `src/server/ai/run.ts` (the
  `runAi` wrapper), `ai_runs`, and the provider abstraction described in `ai-pipeline` do not
  exist anywhere in this repo yet — building them is its own scope (Epic-level AI pipeline
  work), not something to bootstrap inside a seed-classification task. Heuristics (keyword/
  structure scoring: JD-specific terms like "responsibilities", "requirements", "we are
  looking for" vs CV-specific terms like "experience", "education", section headers, contact
  block shape) are a reversible default — a later task can add a model-based second opinion
  through `runAi` once it exists, without changing the `classify()` return shape
  (`{ kind, confidence, reason }`). Accuracy on the fixture set is recorded in the plan's
  Outcome section per the task's "Done when."
- **Docs folder is keyed by the Story number (`37-...`), not a Task number**, per the
  urec-orchestrator Story workflow, even though this PR does not close the Story itself
  (only #117–#119). The next PR that continues #120–#123 will need its own docs folder or an
  update to this one, and must not claim to close #37 until all seven tasks are done.
- **No `npm run seed` script or `scripts/seed/index.ts` entry point yet** — #118 and #119 ship
  as directly-testable/runnable modules (`fetch.ts`, `classify.ts`) since the orchestrating
  entry point needs #120's upload/parse step to be meaningful (there's nothing to do with a
  classified file yet beyond listing it). `.gitignore` already exempts `.seed-cache/` and this
  PR does not need to add anything to it.
- **`.doc` → parseable-format conversion** uses a library dependency rather than shelling out
  to LibreOffice/`soffice`, since CI and Vercel don't guarantee that binary is present locally
  or in CI; the plan step names the exact package once chosen and defends the shell-out
  alternative would need at minimum "record which paths were used" — logged as a follow-up if
  the seed store turns out to contain `.doc` files (as of 17 Sep 2026 the store only holds
  PDFs, so this path is untested against real fixtures and is marked as such in Outcome).

## Open questions

- none — #120–#123 are not "open" PRD items, they are simply blocked on other in-flight work
  (tracked as a blocker in the Story, not a product decision).
