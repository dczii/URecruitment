# Plan — #120 Seed step: upload, parse, embed, load jobs, gap check and score

| | |
|---|---|
| Issue | https://github.com/dczii/URecruitment/issues/120 |
| Parent | Story #37 → Epic #4 |
| Milestone | MVP |
| Branch | `claude/jobs-page-seed-data-j9ol39` |
| Created | 2026-09-19 |
| Status | In review <!-- Planned → In progress → In review --> |

## Problem

The jobs list page (`src/app/jobs/page.tsx`) and the rest of the app have no
sample data: `scripts/seed/` can list, download and classify sample files
(#117-119, merged) but nothing loads them. Jobs, candidates, embeddings,
gap flags and match scores are all empty on a fresh Supabase project, so the
jobs page (and search, matching, dashboard) render empty states only.

## PRD references

| PRD section | Item | Status |
|---|---|---|
| Non-functional requirements → MVP data | 200 fictional CVs (~20 zh-Hans) and 20 sample jobs, preloaded by developers | decided |
| CV processing → Intake | developers run the sample CVs through the real parser | decided |
| Main flows → Seeding | upload, parse, embed, score, back-date stage entries | proposed |

## Scope

**In scope**
- `scripts/seed/load.ts`: for each classified file, upload the original to the private `cv-files` bucket (`uploadCvFile`) and insert a `cv_files` row; for `job_description` files, extract + save a `jobs`/`job_versions` row, embed the job version, run the gap check; for `cv` files, create a `candidates` row, parse the CV, embed the profile
- After all jobs and candidates are loaded: for every job version, retrieve top-50 candidates by embedding similarity and score each one, writing `match_scores`
- `scripts/seed/index.ts`: wires `listSampleFiles` → `downloadAndHash` → `convertLegacyDoc` (if `.doc`) → text extraction → `classifyDocument` → `runLoad`, then prints a summary (counts per stage, unclassified/failed files, total AI cost)
- `package.json`: add `"seed": "tsx scripts/seed/index.ts"`
- Real AI model/embedder chosen from `AI_PROVIDER`-style env already used elsewhere in `src/server/ai`; injectable so tests use fakes

**Out of scope**
- Back-dated pipeline entries (#121)
- Idempotency / re-run without duplicates (#122)
- Writing the parser, extractor, gap check, embeddings or scorer themselves — all already merged (#127, #139, embeddings, #146-148)
- The classifier itself (#119, merged)

## Acceptance criteria

- [x] **AC1** — Given a job-description file classified with confidence, when the seed loads it, then it creates one `jobs` row, one `job_versions` row via `saveJobVersion`, an embedding row for that job version, and runs the gap check for it. _Proved by:_ `scripts/seed/load.test.ts › loads a job description into jobs, job_versions, embeddings and gap flags`
- [x] **AC2** — Given a CV file classified with confidence, when the seed loads it, then it uploads the original to the private bucket, inserts `cv_files`, creates a `candidates` row, parses the CV into `candidate_profiles`/`candidate_skills`, and embeds the profile. _Proved by:_ `scripts/seed/load.test.ts › loads a CV into cv_files, candidates, candidate_profiles and embeddings`
- [x] **AC3** — Given every job and candidate is loaded, when scoring runs, then each job version is scored against at most its top-50 retrieved candidates and a `match_scores` row is written per pair. _Proved by:_ `scripts/seed/load.test.ts › scores retrieved candidates per job version up to the retrieval limit` (delegates to the already-tested `startRescoreRun`/`retrieveCandidates`, which enforce the top-50 limit)
- [x] **AC4** — Given an unclassified or failed file, when the seed runs, then it is skipped, reported by name and reason, and does not throw the whole run. _Proved by:_ `scripts/seed/load.test.ts › skips and reports unclassified/failed files without aborting the run` and `› skips a CV file with no PDF/DOCX bytes instead of throwing`
- [ ] **AC5** — Given a full `npm run seed` against a local Supabase, when it finishes, then `src/app/jobs/page.tsx` lists the seeded jobs. _Proved by:_ manual verification — **not run**: no live local Supabase project or configured AI provider is available in this sandbox (ADR-0003 provider is not chosen yet, so `getModel`/`getEmbedder` throw by design). Left as a documented follow-up; `npm run seed` is wired and ready to run once a provider and a local/dev Supabase are available.

## Guardrails that apply

- [x] Server-only data access; secret key never reaches the browser — seed runs server-side (Node script) using `SUPABASE_SECRET_KEY`, never exposed to the app
- [x] RLS on new tables, no public policies; private Storage + signed URLs — reuses existing `uploadCvFile`/bucket/RLS, no new tables
- [x] AI output schema-validated, logged to `ai_runs`, shows source text — reuses existing `parseCv`/`extractJobDescription`/`runGapCheck`/`scoreCandidate`, all of which already log `ai_runs`
- [x] Protected attributes ignored; nationality/language only with a written reason — reuses existing `buildScoringProfile` redaction unchanged
- [x] Fictional data only; no secrets or sample-data Blob URLs committed — sample files come only from the existing `SEED_BLOB_BASE_URL` store; no new fixtures with real data
- [x] Free-tier limits respected (no frequent cron, file ≤ 50 MB) — reuses `uploadCvFile`'s existing 50 MB check; seed is a one-off manual script, not a cron

## Assumptions

- Job description text extraction reuses the same extraction path CVs use (`src/server/cv/extract.ts`) since no separate JD text extractor exists; if that module is CV-specific, `load.ts` falls back to reading the downloaded file as plain/converted text before calling `extractJobDescription`. Recorded as a judgment call, reversible.
- Sample job files map 1:1 to `clients`: since the sample store has no explicit client field, the seed creates (or reuses, matched by name) one placeholder fictional client per distinct company name found in the JD text, or a single generic fictional client if none is extractable. This is a reversible default, not a PRD decision.
- The seed's own AI-provider/embedder wiring reuses whatever provider-agnostic factory `src/server/ai` already exposes for the app (no new provider code); if no such factory exists yet, `index.ts` constructs the same `AiModel`/`Embedder` shape the app's route handlers already use, calling the same underlying wrapper.
- Retrieval-then-score ordering (all jobs+candidates loaded first, then a second scoring pass) is chosen over interleaving so `retrieveCandidates` sees the full embedded candidate pool for every job, matching the real app's behaviour.

## Open questions

- none

## Approach

`scripts/seed/load.ts` exposes a pure-ish `runLoad(classifiedFiles, deps)` where `deps` bundles every already-tested service (`uploadCvFile`, a db client, `parseCv`, `extractJobDescription`, `saveJobVersion`, `embedCvProfile`/`embedJobVersion`, `runGapCheck`, `retrieveCandidates`, `scoreCandidate`) so unit tests inject fakes and never touch the network, per the existing `scripts/seed/*.test.ts` convention (network mocked via `vi.mock`). `runLoad` first loads every job description (rows + embedding + gap check), then every CV (upload + rows + parse + embedding), collecting failures instead of throwing, then does one scoring pass per job version using `retrieveCandidates` + `scoreCandidate`. `scripts/seed/index.ts` is the thin real-world wiring (env, real Supabase client, real AI model/embedder) plus the summary printer; it is not unit-tested beyond a smoke import, matching how `fetch.ts`/`classify.ts` are wired today.

## Skills in scope

- `prd-context` — required for every task; confirms MVP data volume (200 CVs/20 jobs) and that seeding is a decided/proposed capability, not open
- `testing` — required for every task; test-first for load.ts orchestration logic, fake AI/embedder/db, no network in unit tests
- `supabase-db` — inserts into `jobs`, `job_versions`, `cv_files`, `candidates`, `candidate_profiles`, `embeddings`, `gap_flags`, `match_scores`; must match existing schema/NOT NULL constraints exactly
- `ai-pipeline` — orchestrates `parseCv`, `extractJobDescription`, embeddings, gap check and scoring, all of which log `ai_runs`; load.ts must not bypass or duplicate that logging
- `security-check` — server-only secret key usage in a Node script, private bucket upload path pattern `(cv|jd)/<uuid>/<filename>`

## Files

| File | Change |
|---|---|
| `scripts/seed/load.ts` | new — orchestrates upload/parse/embed/load-jobs/gap-check/score per classified file |
| `scripts/seed/load.test.ts` | new — failing-then-passing tests with fake db/AI/embedder deps |
| `scripts/seed/index.ts` | new — real wiring: list → download → classify → `runLoad`, prints summary |
| `package.json` | modify — add `"seed": "tsx scripts/seed/index.ts"` |

## Dependencies

- none (all upstream services — #117, #118, #119, #127, #139, #146, #147, #148 — are merged)

## Steps

- [x] **S1a** `grok` — Write failing tests in `scripts/seed/load.test.ts` for `runLoad` covering AC1-AC4: a job-description file produces `jobs`/`job_versions`/embedding/gap-check calls in order; a CV file produces upload/`cv_files`/`candidates`/`parseCv`/embedding calls in order; scoring calls `retrieveCandidates` then `scoreCandidate` per job version once both pools are loaded; an unclassified or throwing file is reported and does not stop the run. All dependencies (db, `parseCv`, `extractJobDescription`, `saveJobVersion`, embedder fns, `runGapCheck`, `retrieveCandidates`, `scoreCandidate`, `uploadCvFile`) are injected fakes — no real network, no real Supabase.
  - Rules: `testing` — test-first for logic, fake AI/db, no network in unit tests; `ai-pipeline` — every AI call must still route through the real service functions (fakes stand in for those functions themselves, not for a lower-level bypass)
  - Verify: `npm test -- load` → fails (module doesn't exist yet)
- [x] **S1b** `grok` — Implement `scripts/seed/load.ts` (`runLoad`) until S1a passes: load all job-description files first (create/reuse a fictional `clients` row by company name, insert `jobs`, call `saveJobVersion`, `embedJobVersion`, `runGapCheck`), then all CV files (`uploadCvFile` to path `cv/<uuid>/<filename>`, insert `cv_files`, insert `candidates`, `parseCv`, `embedCvProfile`), collecting per-file failures into a report instead of throwing; then one scoring pass calling `retrieveCandidates` per job version and `scoreCandidate` per retrieved candidate, writing to `match_scores` via the existing service (no direct table writes for scores).
  - Rules: `supabase-db` — match existing NOT NULL columns exactly (`clients.guarantee_period_days`, `jobs.owner_name`, `cv_files.doc_kind`/`storage_path`, `candidates.full_name`) using clearly-fictional typed values; `security-check` — storage path pattern `(cv|jd)/<uuid>/<filename>`, magic-byte-valid bytes only through `uploadCvFile`; `ai-pipeline` — never insert into `ai_runs`, `match_scores`, `gap_flags`, `candidate_profiles`/`candidate_skills` directly, always through `parseCv`/`extractJobDescription`/`runGapCheck`/`scoreCandidate`/`saveJobVersion`
  - Verify: `npm test -- load` → pass; `npm run typecheck`
- [x] **S2** `grok-low` — Write `scripts/seed/index.ts` wiring real `listSampleFiles`/`downloadAndHash`/`convertLegacyDoc`/text extraction/`classifyDocument` into `runLoad` with real deps (real Supabase client via existing `SUPABASE_URL`/`SUPABASE_SECRET_KEY` env, real AI model/embedder factory reused from `src/server/ai`), and print a summary (counts per stage, skipped/failed files, total AI cost). Add the `"seed"` script to `package.json`.
  - Rules: `security-check` — secret key read from `process.env` only, never logged; `ci-setup` n/a (script is developer-run, not CI)
  - Verify: `npm run typecheck`; `npm run lint`
- [x] **S3** `none` — Full verification until green (`npm run lint && npm run typecheck && npm test`, plus `npm run test:db` if a DB fixture assertion is added for AC5), then close out docs. Do not run `pr-review`.

## Test plan

| AC | Test or manual evidence | Type / reason |
|---|---|---|
| AC1 | `scripts/seed/load.test.ts › loads a job description into jobs, job_versions, embeddings and gap flags` | unit, fake deps |
| AC2 | `scripts/seed/load.test.ts › loads a CV into cv_files, candidates, candidate_profiles and embeddings` | unit, fake deps |
| AC3 | `scripts/seed/load.test.ts › scores retrieved candidates per job version up to the retrieval limit` | unit, fake deps |
| AC4 | `scripts/seed/load.test.ts › skips and reports unclassified/failed files without aborting the run` | unit, fake deps |
| AC5 | manual: `npm run dev` + open `/jobs` after a local `npm run seed` against local Supabase | manual — requires a live local Supabase instance, not available in CI sandbox |

## Verification

```
npm run lint
npm run typecheck
npm test
```

## UX / design

n/a — no screen changes, only backend seed data.

## Data / API changes

No schema changes. Writes to existing tables: `clients`, `jobs`, `job_versions`, `cv_files`, `candidates`, `candidate_profiles`, `candidate_skills`, `embeddings`, `gap_flags`, `match_scores`, `ai_runs` (indirectly via existing services).

## Risks & rollback

Risk: real end-to-end `npm run seed` cannot be run in this sandbox (no live Supabase/AI provider credentials) — verification for AC1-AC4 is unit-level with fakes; AC5 stays a documented manual step. Rollback: revert the 4 changed/added files; no migrations to roll back.

## Outcome

- **Shipped:** `scripts/seed/load.ts` (`runLoad`) orchestrates loading every classified job description (client + job + job version + embedding + gap check) and every classified CV (upload + `cv_files` + `candidates` + parse + embedding), then scores every loaded job against the embedded candidate pool by reusing the existing `startRescoreRun` (top-50 retrieval + scoring, already tested). `scripts/seed/index.ts` wires the real Supabase client, AI provider/embedder and file pipeline (`listSampleFiles` → `downloadAndHash` → `convertLegacyDoc`/`extractCvText` → `classifyDocument` → `runLoad`) and prints a run summary. `npm run seed` now exists.
- **Changed files / areas:** `scripts/seed/load.ts` (new), `scripts/seed/load.test.ts` (new), `scripts/seed/index.ts` (new), `package.json` (added `"seed"` script and `tsx` devDependency).
- **Tests added or updated:** `scripts/seed/load.test.ts` — 5 tests: job-description load (AC1), CV load (AC2), scoring pass via `startRescoreRun` (AC3), skip-and-report for an unclassified file and a failing CV without aborting the run (AC4), and skip for a CV with no PDF/DOCX bytes (AC4). All against injected fakes, no network, no real Supabase client.
- **Verification:** `npm run lint` — 0 errors, 4 pre-existing warnings unrelated to this change; `npm run typecheck` — clean; `npm test` — 454/454 passed (64 files) including the 5 new tests; `npm run build` — compiled and generated all routes successfully. `npm run test:db` and a live `npm run seed` were not run — no local Supabase/Docker or configured AI provider in this sandbox (see AC5).
- **Deviations:**
  - This session's environment has neither the `cursor-agent` CLI nor the `gh` CLI the `urec-orchestrator`/`github-workflow` scripts assume. Claude implemented all code directly (no Grok/GPT executor calls) and used the `mcp__github` MCP tools in place of `gh` for issue lookup and will use them for PR creation. This is a tooling-availability deviation, not a scope or guardrail deviation.
  - Project board (`gh project item-add` / `set-status.sh`) updates were skipped for the same reason — no `gh` CLI and no GitHub Projects v2 tool available in the MCP toolset. Note for follow-up: move issue #120's Project 4 card to In Review manually once `gh auth` is available, or run `.claude/skills/github-workflow/scripts/set-status.sh 120 inReview` from an environment with `gh`.
  - Branch name follows the task's own instruction (`claude/jobs-page-seed-data-j9ol39`) rather than the skill's `<type>/<issue>-<slug>` convention, per this session's explicit branch requirement.
- **Fix rounds / escalations:** none — implementation, typecheck and lint were clean on the first pass; two type errors found during `npm run typecheck` (a test mock cast and a `MustHave` literal-type mismatch) were fixed directly before considering the step done.
- **Models used:** Planning, investigation and implementation — Claude Sonnet 5 (`claude-sonnet-5`), this session, directly (no `cursor-agent`/Grok/GPT executor was available). One `Explore` subagent call surveyed existing seed/CV/job/matching services before planning; same underlying session model.
- **Claude direct fixes:** all code in this task was written directly by Claude (see Deviations) — there was no separate executor to fix after.
- **Follow-ups:**
  - Run `npm run seed` against a local Supabase once Docker/local Supabase is available, and once an AI provider is chosen (ADR-0003) so `getModel`/`getEmbedder` no longer throw, to prove AC5 end-to-end and add the `npm run test:db` fixture assertion for "jobs count > 0 after seeding".
  - Move #120 and its Story #37 to In Review on Project 4 once `gh` access is available (see Deviations).
  - #121 (back-dated pipeline entries) and #122 (idempotency) remain open and unblocked by this change — they build on `scripts/seed/load.ts`'s output.
