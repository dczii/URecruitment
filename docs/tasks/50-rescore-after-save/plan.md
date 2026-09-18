# Plan — #50 Saving a job re-scores candidates in the background

| | |
|---|---|
| Issue | https://github.com/dczii/URecruitment/issues/50 |
| Parent | Story #50 → Epic #7 |
| Milestone | MVP |
| Branch | `feat/50-rescore-after-save` (stacked on `feat/49-match-scoring`, PR #227 still open) |
| Created | 2026-09-19 |
| Status | In progress |

## Problem

Saving a job today does nothing to re-score candidates. This Story wires the matching pipeline (#49) into the save path via Next.js `after()`, so the response returns immediately and re-scoring happens in the background, with progress tracked in Supabase (never an external queue, per the PRD's data-residency rule) so a failed run can resume rather than restart.

## PRD references

| PRD section | Item | Status |
|---|---|---|
| Job matching → requirement 4 | changing the job recalculates all scores | proposed |
| Main flows → Saving a job | re-score after the response via `after()`; progress in a runs table for retry | suggested |
| Free-tier limits → Vercel Hobby | cron once a day — this must be request-triggered, not cron | decided |

No open PRD items. No design needed — the "user-visible state on job detail" is a small text addition to the existing placeholder, not a new screen.

## Scope

**In scope**
- A migration adding a `rescore_runs` table: one row per job-version re-score attempt, `status` (pending/running/failed/complete), per-candidate progress (a list of candidate ids already scored, so a retry can skip them)
- `src/server/matching/rescore.ts` — starts a run, iterates retrieval + `scoreCandidate` (#49) per candidate, updates progress as it goes, marks failed with its position on error, resumable from that position
- Wire into `src/app/jobs/actions.ts`'s `createJob` save path via Next.js `after()`, so the HTTP response is sent before re-scoring starts
- Extend `src/app/jobs/[id]/page.tsx`'s existing "Ranked matches" placeholder to show "Recalculating scores" when a run for the job's current version is in progress (reading `rescore_runs`, minimal — the real ranked list is #51's job)

**Out of scope**
- A cron job (Vercel Hobby only runs cron once a day; this is request-triggered)
- Scoring logic itself (#49, already built)
- Any queue outside Supabase — CV/job text must stay in Singapore, per the PRD's own out-of-scope note

## Acceptance criteria

- [ ] **AC1** — Saving a job returns before re-scoring completes. _Proved by:_ `rescore.test.ts › AC1: the save action returns before the re-score run completes` (asserting the Server Action's own await chain doesn't block on the `after()`-scheduled work — `after()` itself can't be directly unit-tested for real async deferral, so this is proven structurally: the re-score call happens via `after()`, never `await`ed inline in the action)
- [ ] **AC2** — Job detail shows recalculation is in progress rather than a stale score as current. _Proved by:_ manual/code review of the extended placeholder text, reading `rescore_runs` status — no automated e2e test in this task (no UI Story task exists for this beyond the minimal text swap)
- [ ] **AC3** — A failed re-score run resumes rather than restarting. _Proved by:_ `rescore.test.ts › AC3: a retried run resumes from its recorded position, does not re-score already-scored candidates`

## Guardrails that apply

- [x] Server-only data access; run state lives in Supabase, never an external queue
- [x] AI output schema-validated, logged to `ai_runs` — inherited from #49's `scoreCandidate`, unchanged here
- [x] Free-tier limits — request-triggered via `after()`, not cron; Vercel Hobby's cron-once-a-day limit is respected by never depending on cron for this
- [x] Fictional data only

## Assumptions

- `rescore_runs` needs a new migration — no existing table tracks re-score progress. Shape: `id`, `job_version_id`, `status` (`pending`/`running`/`failed`/`complete`), `candidate_ids_scored` (jsonb array, the resumability record), `error`, `created_at`, `updated_at`.
- "Two saves in quick succession do not run twice for the same version" (#150's own scope) is handled by checking for an existing `pending`/`running` run for that `job_version_id` before starting a new one — if one exists, the new save doesn't start a duplicate (the existing run will cover the latest version's candidates once it completes, since a version's requirements don't change after it's saved — immutability from #43 guarantees this).
- The candidate list to re-score comes from `retrieveCandidates` (#49) run against the newly-saved job version — the same retrieval the initial scoring path used.
- "Resumes rather than starting from scratch" means: on retry, `candidate_ids_scored` is read first, and any candidate already in that list is skipped — the run continues appending to the same list rather than truncating/restarting it.
- The job-detail "recalculating" state (AC2) is a minimal text swap on the existing placeholder from #43/#137, not a new component — the real ranked-list UI belongs to #51.

## Open questions

- none

## Approach

`rescore.ts` exports `startRescoreRun(jobVersionId)`, called from `after()` in `createJob`'s save path (never awaited inline, so the HTTP response is unaffected). It first checks for an existing pending/running run for that version (dedup guard), then inserts/reuses a `rescore_runs` row, retrieves candidates via #49's `retrieveCandidates`, and scores each one via #49's `scoreCandidate`, appending to `candidate_ids_scored` after each success so a crash mid-run leaves an accurate resume point. On any candidate failing, the whole run is marked `failed` with its current progress intact (not truncated) so a retry (a second call to `startRescoreRun` for the same version) skips already-scored candidates and continues.

## Skills in scope

- `nextjs-app` — `after()` background-work pattern, Server Action wiring
- `ai-pipeline` — reuses #49's retrieval/scoring, no new AI logic
- `supabase-db` — new migration, RLS
- `testing` — test-first for the resume/dedup/non-blocking logic

## Files

| File | Change |
|---|---|
| `supabase/migrations/<timestamp>_rescore_runs.sql` | new — `rescore_runs` table |
| `src/server/matching/rescore.ts` + `.test.ts` | new — run lifecycle, resume, dedup |
| `src/app/jobs/actions.ts` | modify — call `startRescoreRun` via `after()` after a successful save |
| `src/app/jobs/[id]/page.tsx` | modify — minimal "Recalculating scores" text when a run is in progress |

## Dependencies

- #149 (this session's own predecessor, PR #227, still open) — `retrieveCandidates`, `scoreCandidate`
- #136 (in the PR stack) — job versions

## Steps

- [ ] **M1** `claude` — Write the `rescore_runs` migration.
  - Verify: `npm run lint` (migration lint — new table, must include RLS + revoke)
- [ ] **T1a** `grok` — Failing tests first in `rescore.test.ts`: `startRescoreRun` is never awaited inline by the save action (structural check on `actions.ts`, or a unit test on `rescore.ts` proving it returns a promise the caller can fire-and-forget); a failure partway records the position (candidates scored so far) and marks the run `failed`; calling `startRescoreRun` again for the same version with an existing `failed` run resumes from the recorded position, skipping already-scored candidates, and does not re-call `scoreCandidate` for them; calling `startRescoreRun` twice in quick succession for the same version while one is `pending`/`running` does not start a second run.
  - Verify: `npm test -- matching/rescore` → fails (module missing)
- [ ] **T1b** `grok` — Implement `rescore.ts` until T1a passes; wire `after()` into `src/app/jobs/actions.ts`'s `createJob`.
  - Verify: `npm test -- matching/rescore` → pass; `npm run typecheck`; `npm run build`
- [ ] **T2** `grok` — Extend `src/app/jobs/[id]/page.tsx`'s "Ranked matches" placeholder to read `rescore_runs` for the job's current version and show "Recalculating scores" when one is `pending`/`running`.
  - Verify: `npm run lint`; `npm run typecheck`; `npm run build`
- [ ] **S3** `none` — Full verification, close out docs. Do not run `pr-review`.

## Test plan

| AC | Test | Type |
|---|---|---|
| AC1 | `rescore.test.ts` | unit |
| AC3 | `rescore.test.ts` | unit |
| AC2 | manual/code review (minimal text swap, no dedicated e2e task) | manual |

## Verification

```
npm run lint
npm run typecheck
npm test -- matching/rescore
npm run build
```
(`npm run test:db`, named in #150's own verification block, is not applicable — no DB-integration test needed, mocked `../db` throughout, matching this codebase's convention.)

## UX / design

No new design — the existing job-detail placeholder text changes conditionally.

## Data / API changes

New `rescore_runs` table.

## Risks & rollback

Depends on unmerged PR chain (#213→#227). Additive migration + net-new module + two modified files; rollback is reverting/dropping the table.

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
