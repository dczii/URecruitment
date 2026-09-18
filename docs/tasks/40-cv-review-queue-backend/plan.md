# Plan — #40 Files that fail to parse land in a review queue (backend only)

| | |
|---|---|
| Issue | https://github.com/dczii/URecruitment/issues/40 |
| Parent | Story #40 → Epic #5 |
| Milestone | MVP |
| Branch | `feat/40-cv-review-queue-backend` (stacked on `feat/39-cv-parsing-schema-service`, PR #214 still open) |
| Created | 2026-09-18 |
| Status | In progress |

## Problem

Today a CV that fails to parse just sits with an error on `cv_files` — nothing surfaces it or lets a recruiter retry. Task #130 builds the query and retry action. **Task #131 (the screen) is explicitly blocked** — do not build it in this task.

## PRD references

| PRD section | Item | Status |
|---|---|---|
| CV processing → requirement 2 | a file that fails to parse goes to a review queue with the reason | proposed |
| UI design | the review-queue screen is not in the PRD's screen list | **open — RC-2, `docs/decisions/open-questions.md`, status "Awaiting owner"** |

**This Story touches an open PRD item.** Per `docs/decisions/open-questions.md` RC-2: *"The queue's query and retry action (#130) are built, because requirement 2 is stated; only the screen waits."* This plan builds **only #130** (query + retry, backend). **#131 (the review-queue screen) is not started** — it is explicitly gated on product-owner confirmation that the screen is in the MVP. #106 (design) already produced a **proposal** mirror at `design/specs/review-queue.md`, but that proposal does not answer the open question per RC-2's own note, and #131's Done-when list requires "The product owner's confirmation is recorded before this task is started" — which has not happened. Story #40 as a whole (its issue and both tasks) stays open; this PR closes only #130.

## Scope

**In scope**
- `src/server/cv/review-queue.ts` — server query listing failed `cv_files` with reason, file name, failed-at time, attempt count; a `retryParse` action that reprocesses one file through the existing `parseCv`/extraction path
- A migration adding `attempt_count` (and `last_attempted_at`) to `cv_files`, since neither column exists yet and #130 requires a visible attempt count

**Out of scope**
- #131 — the review-queue screen (blocked on RC-2, open PRD question)
- Automatic/background retries — retry is always a recruiter action (per #130's own scope)
- Editing parsed results (#41 / E04-S04)

## Acceptance criteria

Story #40's ACs (AC1–AC3) are all screen-facing ("when I open the review queue…") and cannot be proved without #131. This task instead proves #130's own Done-when list as the acceptance surface for this PR:

- [ ] **T130-AC1** — Given a file with `parse_status = 'error'`, when the queue query runs, it is returned with its reason, file name and failed-at time. _Proved by:_ `review-queue.test.ts › lists failed files with reason`
- [ ] **T130-AC2** — Given a queued file, when retried and the retry succeeds, it leaves the queue (status becomes `parsed`). _Proved by:_ `review-queue.test.ts › a successful retry clears the file from the queue`
- [ ] **T130-AC3** — Given a queued file, when retried and it fails again, it stays queued with an updated reason and incremented attempt count. _Proved by:_ `review-queue.test.ts › a repeated failure keeps the file queued with an updated reason and attempt count`
- [ ] **T130-AC4** — No code path retries a file without an explicit recruiter-invoked call. _Proved by:_ code review — `retryParse` takes no scheduler/cron entry point; it's a plain exported function only a Server Action (future #131) would call.

## Guardrails that apply

- [x] AI only suggests — retry re-runs the same suggestion-only parser, nothing auto-advances a candidate
- [x] Server-only data access
- [x] RLS on new/changed tables — `cv_files` already has RLS + no public policies (#110); the new columns don't change that
- [x] Fictional data only

## Assumptions

- `attempt_count`/`last_attempted_at` don't exist on `cv_files` yet — adding them via migration is necessary for #130's own Done-when ("an attempt count so a file that keeps failing is visible"), and is a reversible, additive schema change.
- "Retry through the same parse path" reuses `extractCvText` (#38) + `parseCv` (#39, this Story's own earlier PR) — no new extraction logic.
- Never building #131 without the open question resolved is treated as the reversible default per RC-2's explicit note; this is not a silent settlement of the open item — it's already how RC-2 says the split should go.

## Open questions

- **RC-2** (`docs/decisions/open-questions.md`): is the CV review-queue screen in the MVP? Status: Awaiting owner. Blocks #131 only. Not resolved here.

## Approach

`review-queue.ts` exports a query (`listFailedCvFiles`) reading `cv_files` where `parse_status = 'error'`, and a `retryParse(cvFileId)` that re-extracts and re-parses, updating `parse_status`, `parse_error`, `attempt_count` and `last_attempted_at` on completion — success clears the row from future query results (status flips to `parsed`), failure increments the attempt count and replaces the reason.

## Skills in scope

- `prd-context` — CV processing requirement 2; RC-2 open-questions entry
- `nextjs-app` — server query/action conventions (no route/page in this task)
- `supabase-db` — migration for `attempt_count`/`last_attempted_at`, RLS unaffected
- `testing` — test-first, DB integration for the migration

## Files

| File | Change |
|---|---|
| `supabase/migrations/<timestamp>_cv_files_attempt_count.sql` | new — add `attempt_count integer not null default 0`, `last_attempted_at timestamptz` to `cv_files` |
| `src/server/cv/review-queue.ts` + `.test.ts` | new — query + retry action |

## Dependencies

- #125 (closed), #127 (this Story's own PR #214, still open) — branch stacks on `feat/39-cv-parsing-schema-service`

## Steps

- [ ] **M1** `grok-low` — Write the migration adding `attempt_count`/`last_attempted_at` to `cv_files`.
  - Rules: `supabase-db` — additive, RLS already correct, no new policies needed
  - Verify: `npm run lint` (migration lint), `npm run typecheck`
- [ ] **T1a** `grok` — Failing tests first in `review-queue.test.ts`: lists failed files with reason; successful retry clears the queue; repeated failure keeps it queued with incremented attempt count and updated reason.
  - Rules: `testing` — test-first, no network; mock `../db` per `rejections.test.ts` pattern
  - Verify: `npm test -- review-queue` → fails (module missing)
- [ ] **T1b** `grok` — Implement `review-queue.ts` until T1a passes.
  - Rules: `supabase-db` — server-only, service-role writes; reuse `extractCvText`/`parseCv`
  - Verify: `npm test -- review-queue` → pass; `npm run typecheck`
- [ ] **S2** `none` — Full verification, close out docs. Do not run `pr-review`.

## Test plan

| AC | Test or manual evidence | Type |
|---|---|---|
| T130-AC1–3 | `review-queue.test.ts` | unit, mocked db |
| T130-AC4 | code inspection (no scheduler entry point) | manual |

## Verification

```
npm run lint
npm run typecheck
npm test -- review-queue
npm run test:db   # migration — Docker unavailable locally; CI must confirm
```

## UX / design

n/a for this task (#131 is the screen, blocked)

## Data / API changes

Migration adds `attempt_count`, `last_attempted_at` to `cv_files`.

## Risks & rollback

Depends on unmerged PR #214. Net-new query/action module + additive migration; rollback is dropping the columns and deleting the files.

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
