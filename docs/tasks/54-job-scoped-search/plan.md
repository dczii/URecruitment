# Plan — #54 Searching from a job ranks by that job's match score

| | |
|---|---|
| Issue | https://github.com/dczii/URecruitment/issues/54 |
| Parent | Story #54 → Epic #8 |
| Milestone | MVP |
| Branch | `feat/54-job-scoped-search` (stacked on `feat/53-search-screen`, PR #231 still open) |
| Created | 2026-09-19 |
| Status | In progress |

## Problem

Search (#52/#53) ranks by keyword/vector relevance; the job's own ranked list (#51) ranks by match score. This Story lets a recruiter enter search from a job so results are ordered by that job's stored score instead, with the same reasons/evidence the ranked list already shows — and critically, without triggering any new AI call (no re-scoring, no query-parsing model call either, since this is a filter-and-browse flow, not a plain-language search).

## PRD references

| PRD section | Item | Status |
|---|---|---|
| Talent search → requirement 3 | search from a job ranks by that job's match score, same reasons | proposed |
| Job matching → requirement 4 | scores keyed to job version | proposed |

No open PRD items. Design is a change to the existing search screen (entry point from job detail), not a new screen.

## Scope

**In scope**
- `src/server/search/job-scoped.ts` — `getJobScopedResults(jobId, filters?)`: calls `searchCandidates` (#153) with `job_version_id` set and `keyword`/`embedding` both `null` — **zero AI calls**, ranking comes entirely from the SQL function's stored-match-score path; a candidate with no `match_scores` row for the current job version is mapped to an explicit `matchStatus: "not_scored"`, never a `0`
- An entry point on job detail (`src/app/jobs/[id]/page.tsx`) linking into the search screen with the job's id/version carried through
- `src/components/features/search/JobScopedResults.tsx` (or extend `SearchScreen`) reusing the exact same evidence-rendering pieces `RankedMatches.tsx` (#51) already built (`AiSuggestion`/`SourceQuote` on matched/missing/uncertain) — no new evidence-display component
- `e2e/search-from-job.spec.ts` — desktop only (established precedent)

**Out of scope**
- Re-scoring from search (that's #50's job save path, unrelated to search)
- Changing scoring rules
- Adding candidates to the pipeline from search (design spec doesn't call for it; #51 already has add-to-pipeline on the job's own ranked list)

## Acceptance criteria

- [ ] **AC1** — Searching from a job ranks results by that job's match score. _Proved by:_ `job-scoped.test.ts › AC1: results ordered by stored match score`
- [ ] **AC2** — A job-scoped result shows the same reasons/evidence as the job's ranked list. _Proved by:_ `job-scoped.test.ts › AC2: matched/missing/uncertain match the stored match_scores row` (same data source as #51's `getRankedMatches`)
- [ ] **AC3** — A candidate with no score for that job version shows as not-yet-scored, not zero. _Proved by:_ `job-scoped.test.ts › AC3: null match_score maps to not_scored, never 0`

## Guardrails that apply

- [x] AI only suggests — this flow makes literally zero AI calls, reusing only stored data
- [x] Match scores keyed to job version — CLAUDE.md hard rule 4, reuses #52's already-correct SQL
- [x] Server-only data access
- [x] Works at phone width — **N/A, desktop-only**, same established precedent
- [x] Fictional data only

## Assumptions

- "No AI call during job-scoped search" is interpreted strictly: NOT ONLY no re-scoring, but also no search-query prompt call — job-scoped search is filter-only browsing (skills/years/location/language/CV-date filters, all optional), never a plain-language query box in this mode. This matches the task's own scope note ("ranking by stored match score... with filters still applied" — filters, not free text) and the `talent-search` skill's own "skip the model call when the recruiter uses only filters" guidance, applied here as the default (not optional) behavior for the job-scoped case specifically.
- `getJobScopedResults` calls `searchCandidates({ filters, keyword: null, embedding: null, jobVersionId })` — reusing #153's existing `job_version_id` argument, which already ranks by `coalesce(match_score, -1)` (nulls sort last) while keeping the raw `match_score` column `null` for unscored candidates — exactly what AC3 needs, already built in the SQL from #52.
- The job's *current* version is resolved the same way #49/#50/#51 already do (`getCurrentJobVersion`) — never a stale/superseded version.
- Reasons/evidence (`matched`/`missing`/`uncertain`) come straight from the `search_candidates` row (already joined to `match_scores` in #52's SQL) — no second query, no divergence from what `RankedMatches.tsx` shows on the job's own page.

## Open questions

- none

## Approach

`job-scoped.ts` is a thin wrapper: resolve the job's current version, call `searchCandidates` with `job_version_id` set and no keyword/embedding, map `match_score: null` rows to an explicit not-scored status, and return results in the SQL function's own order (already score-descending with nulls last). The UI reuses `RankedMatches.tsx`'s evidence-rendering sub-components directly (extracting a shared piece if needed) so job-scoped search visually and structurally matches the job's own ranked list, per AC2's own requirement.

## Skills in scope

- `talent-search` — job-scoped ranking, skip-the-model-for-filters-only guidance
- `ai-pipeline` — confirming zero AI calls (no `runAi` import anywhere in this path)
- `testing` — test-first, no-AI-call proof
- `ui-build` — reuse `RankedMatches.tsx`'s evidence components, desktop-only precedent

## Files

| File | Change |
|---|---|
| `src/server/search/job-scoped.ts` + `.test.ts` | new — job-scoped SQL call, not-scored mapping, no-AI-call proof |
| `src/app/jobs/[id]/page.tsx` | modify — "Search for more candidates" entry point linking to job-scoped search |
| `src/app/search/page.tsx` or a new job-scoped route/component | modify/new — job-scoped results view reusing #51's evidence rendering |
| `e2e/search-from-job.spec.ts` | new — desktop only |

## Dependencies

- #154 (this session's own predecessor, PR #231, still open) — search screen
- #149 (in the PR stack) — match-score read path

## Steps

- [ ] **T1a** `grok` — Failing tests first in `job-scoped.test.ts` (mocked `searchCandidates`, mocked `getCurrentJobVersion`): results ordered by stored `match_score` descending; a row with `match_score: null` maps to `{ matchStatus: "not_scored" }` rather than `0`; `matched`/`missing`/`uncertain` pass through unchanged from the SQL row; a static test asserts `job-scoped.ts` never imports `runAi`, `getModel`, or any `src/server/ai/**` module (same `no-bypass.test.ts` pattern used throughout this session).
  - Verify: `npm test -- search/job-scoped` → fails (module missing)
- [ ] **T1b** `grok` — Implement `job-scoped.ts` until T1a passes.
  - Verify: `npm test -- search/job-scoped` → pass; `npm run typecheck`
- [ ] **T2** `grok` — Add the job-detail entry point into job-scoped search, and the results view reusing #51's evidence-rendering pieces. Add `e2e/search-from-job.spec.ts` (desktop only): entering search from a job shows score-ordered results with evidence matching the job's ranked list, and an unscored candidate shows "Not yet scored."
  - Rules: `ui-build` — reuse `RankedMatches.tsx`'s evidence rendering exactly, don't rebuild it; desktop-only
  - Verify: `npm run lint`; `npm run typecheck`; `npm run build`; `npx playwright test e2e/search-from-job.spec.ts --project=desktop --list`
- [ ] **S3** `none` — Full verification, close out docs. Do not run `pr-review`.

## Test plan

| AC | Test | Type |
|---|---|---|
| AC1 | `job-scoped.test.ts` | unit |
| AC2 | `job-scoped.test.ts` + shared component reuse | unit + manual/code review |
| AC3 | `job-scoped.test.ts` | unit |

## Verification

```
npm run lint
npm run typecheck
npm test -- search/job-scoped
npm run build
npx playwright test e2e/search-from-job.spec.ts --project=desktop --list
```

## UX / design

Entry point into the existing search screen from job detail — no new screen design, reuses `design/specs/search.md` and `design/specs/job-detail.md`'s ranked-matches evidence pattern.

## Data / API changes

None — reuses #153's `search_candidates` (`job_version_id` argument already built) and #111's `match_scores`.

## Risks & rollback

Depends on unmerged PR chain (#213→#231), including #52's unverified SQL (job-scoped search relies on the same `job_version_id` path). Net-new module + two modified files; rollback is reverting/deleting.

## Outcome

- **Shipped:**
- **Changed files / areas:**
- **Tests added or updated:**
- **Verification:**
- **Deviations:**
- **Fix rounds / escalations:**
- **Models used:**
- **Claude direct fixes:**
- **Follow-ups:**
