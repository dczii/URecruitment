# Plan — #157 + #158 Limit resolution and delay-status view

| | |
|---|---|
| Issue | https://github.com/dczii/URecruitment/issues/157, https://github.com/dczii/URecruitment/issues/158 |
| Parent | Story #56 "Delay status is computed from Singapore working days" → Epic #9 (Pipeline & delays) |
| Milestone | MVP |
| Branch | `feat/56-delay-status` (stacked on `feat/55-stage-model-move-action`, PR #233) |
| Created | 2026-09-19 |
| Status | In review <!-- Planned → In progress → In review --> |

## Problem

Story #56 has three tasks (#157 limit resolution, #158 the delay-status view, #159 confirming the
real default stage-limit numbers with the product owner). #159 needs a human answer to an explicitly
**open** PRD question and cannot be settled here — it stays open, out of scope for this PR, and is
**not** a blocker for #157/#158: those two only need resolution/derivation logic to be correct given
whatever limits exist, not the real seeded numbers. #157 and #158 unblock Task #161 (build the
dashboard), which reads delay status to show overdue/due-soon candidates.

## PRD references

| PRD section | Item | Status |
|---|---|---|
| Pipeline tracking → Time limits | job over client over default; working days skipping SG public holidays | decided |
| Pipeline tracking → Delay detection 1 | clock starts on entering a stage, resets on the next | proposed |
| Pipeline tracking → Delay detection 2 | On track / Due soon at 80% / Overdue | proposed |
| Pipeline tracking → Delay detection 3 | a "Waiting on" column | proposed |
| Pipeline tracking → default limit table | Sourced 2, Screening 3, Shortlisted 2, Submitted 5, Client interview 7, Offer 5 | **open** — #159, product-owner confirmation pending; not seeded by this task |
| Main flows | delay status derived in a database view | suggested |

## Scope

**In scope**
- `resolveStageLimit`: job limit wins, then client, then default; an explicit `0` is honoured (not
  treated as unset); an unrecognised stage throws. SQL function + TypeScript mirror, cross-checked.
- `pipeline_status`: a security-invoker view returning, per non-end-state `pipeline_entries` row:
  working days used, resolved limit, status (`on-track` / `due-soon` / `overdue`), days over, and
  the waiting-on party (from `STAGE_WAITING_ON` in `src/lib/stages.ts`).
- Due-soon boundary at exactly 80% of the resolved limit, rounding stated once and tested at 79/80/81%.
- End states and `Placed` return no status row at all (not a null status — absent from the view).
- A TS reader (`src/server/pipeline/status.ts`) over the view for the dashboard to call later.

**Out of scope**
- #159's real default numbers — `stage_limits` stays unseeded at the `default` scope; tests use
  fictional limits only.
- The dashboard UI (#161, separate PR stacked on this branch).
- The Settings UI for changing limits (#165).
- Any cron/scheduled recompute — status is derived on every read.

## Acceptance criteria

- [x] **AC1 (#157)** — Given a job limit, a client limit and a default limit, when status is
  computed, then the job's limit wins, then the client's, then the default. _Proved by:_
  `stage-limits.test.ts › AC1: job wins over client and default` and `› client wins over default`
  and `› default applies when neither job nor client is set`.
- [x] **AC1b (#157)** — an explicit zero limit is honoured, not treated as unset. _Proved by:_
  `stage-limits.test.ts › a limit explicitly set to zero is honoured`.
- [x] **AC1c (#157)** — an unknown stage fails loudly. _Proved by:_ `stage-limits.test.ts › an
  unknown stage throws`.
- [x] **AC2 (#158)** — Given a candidate has used 80%+ of the limit, when status is computed, then
  they are due soon; past the limit, overdue. _Proved by:_ `status.test.ts › AC2: 79%/80%/81% of the
  limit` and `› one day over the limit is overdue`.
- [x] **AC3 (#158)** — Given a candidate in an end state or Placed, when status is computed, then
  they have no delay status at all. _Proved by:_ `status.test.ts › AC3: end states and Placed return
  no status row`.
- [x] **AC4 (#158)** — Given a job's limit changes while candidates sit in that stage, when status is
  recomputed, then the new limit applies to the running clock (no snapshot). _Proved by:_
  `status.test.ts › AC4: a limit changed mid-stage recomputes rather than using a snapshot`.

## Guardrails that apply

- [x] Server-only data access — `src/server/pipeline/status.ts` starts `import "server-only"`.
- [x] RLS respected — `pipeline_status` is `security_invoker`, so the caller's RLS (none granted to
  anon/authenticated) applies; it grants nothing new to `anon`/`authenticated`.
- [x] UTC stored, SGT shown; SG working days — built entirely on `sg_working_days_between` /
  `sg_add_working_days` (#116) and `src/lib/working-days.ts`.
- [ ] Typed recruiter name — n/a, this task reads state, it does not write any.
- [ ] Free-tier limits — status is derived on read; no cron added.
- [x] Fictional data only — tests use fictional UUIDs/limits.

## Assumptions

- `pipeline_status` is a view over `pipeline_entries` joined to `jobs` (for `client_id`) and computed
  per-row with `sg_working_days_between(entered_at, now())`; it excludes rows whose `stage` is one of
  `END_STATES` or `Placed` (matching AC3 — "no delay status at all" is read as "no row", the simplest
  shape for the dashboard to consume: `select * from pipeline_status` already only lists candidates
  who have a status). Reversible: a `status` column with a nullable value would also satisfy the text,
  but "no status at all" is closer to "no row" and DELAY-view is explicitly consumed by a listing
  screen (#161) that wants overdue/due-soon rows, not a full table with nulls to filter client-side.
- Due-soon rounding: `due_soon` when `working_days_used >= ceil(limit * 0.8)`, i.e. round the 80%
  threshold **up**, so a limit of 5 needs 4 days used (5*0.8=4.0, ceil=4) and a limit of 7 needs
  6 days (7*0.8=5.6, ceil=6) to flag due-soon — the more conservative reading of "80% or more of the
  limit", stated once in `status.ts`'s doc comment and in this plan, tested at the exact boundary.
- `resolveStageLimit`'s TypeScript mirror takes the already-fetched `stage_limits` rows for the
  relevant job/client plus the target stage, rather than querying itself — it has no DB access
  (`src/lib` is pure, per `stages.ts`'s existing precedent) and mirrors the SQL function's pure
  logic for the cross-check test to compare against.
- No `stage_limits` rows exist in tests beyond what each test seeds; "default applies when neither is
  set" is tested with a `default`-scope row present, not by omission of all rows (omission is a
  separate "no limit resolved / null" case not required by any AC — `resolveStageLimit` returns
  `null` in that case, and `pipeline_status` treats a null-resolved-limit row as excluded, same as an
  end state, since delay status is meaningless without a limit; noted as a natural corollary of AC1,
  not a new behaviour).

## Open questions

- #159 — default per-stage limit day counts, pending product-owner confirmation. Not touched here.

## Approach

Add `resolveStageLimit` (`src/lib/stage-limits.ts`) as a pure TS function plus
`public.resolve_stage_limit(job_id, client_id, stage)` as its SQL mirror (same priority-coalesce
shape as the existing `sg_working_days_between` pattern), then a cross-check test seeding identical
rows into a fake `stage_limits` fixture and asserting both return the same value across every
resolution case. Layer `pipeline_status` on top as a single `security_invoker` view joining
`pipeline_entries` → `jobs` (for `client_id`) → `resolve_stage_limit(...)` →
`sg_working_days_between(entered_at, now())`, computing status with a `case` expression, and
filtering out end states and `Placed` in the `where` clause. `src/server/pipeline/status.ts` is a
thin typed reader (`select * from pipeline_status`) for #161 to call; its own tests exercise the pure
due-soon/overdue boundary math directly (mirroring the view's `case` logic in TS) rather than hitting
a live view, consistent with "no Docker locally — DB behaviour is proven in CI" and existing
`src/server/*` test patterns (mocked `getDb`).

## Skills in scope

- `prd-context` — pipeline-rules delay detection, time limits, default stage table (open).
- `testing` — test-first for logic; frozen time for boundary tests.
- `supabase-db` — new view, `security_invoker`, one concern per migration, snake_case.
- `security-check` — the view must grant nothing new to `anon`/`authenticated`.

## Files

| File | Change |
|---|---|
| `src/lib/stage-limits.ts` | new — `resolveStageLimit`, `StageLimitRow` type |
| `src/lib/stage-limits.test.ts` | new — test-first, AC1/AC1b/AC1c |
| `supabase/migrations/20260919130000_limit_resolution.sql` | new — `resolve_stage_limit` SQL function |
| `supabase/migrations/20260919130100_pipeline_status_view.sql` | new — `pipeline_status` security-invoker view |
| `src/server/pipeline/status.ts` | new — typed reader over `pipeline_status`, due-soon/overdue math for unit tests |
| `src/server/pipeline/status.test.ts` | new — test-first, AC2/AC3/AC4 |

## Dependencies

- #156 (stage model + move action) — in PR #233, this branch is stacked on it.
- #116 (working-day functions, SQL + TS) — closed, merged.

## Steps

- [x] **S1a** `grok` — Write failing tests in `src/lib/stage-limits.test.ts` for AC1/AC1b/AC1c: job
  wins over client and default; client wins over default; default applies when set and job/client
  aren't; an explicit `limit_days: 0` row is returned, not skipped as falsy; an unrecognised stage
  string throws.
  - Rules: `testing` — test-first, name by AC id; `prd-context` — job > client > default.
  - Verify: `npm test -- stage-limits` → fails (module doesn't exist)
- [x] **S1b** `grok` — Implement `src/lib/stage-limits.ts` until S1a passes. Pure function, no DB
  access, takes pre-fetched `StageLimitRow[]`.
  - Rules: `nextjs-app` — `src/lib` stays isomorphic/pure, mirroring `stages.ts`'s precedent.
  - Verify: `npm test -- stage-limits` → pass; `npm run typecheck`
- [x] **S2** `grok-low` — Add `supabase/migrations/20260919130000_limit_resolution.sql`:
  `resolve_stage_limit(p_job_id uuid, p_client_id uuid, p_stage text) returns integer`, `stable
  security invoker`, coalescing job → client → default scoped rows from `stage_limits`, raising an
  exception for a `p_stage` not in the 7-stage list. `revoke all ... from public, anon, authenticated`.
  - Rules: `supabase-db` — one concern per migration, security invoker, revoke from anon/authenticated.
  - Verify: migration file only, validated in CI (no local Docker).
- [x] **S3a** `grok` — Write failing tests in `src/server/pipeline/status.test.ts` for AC2 (79%/80%/
  81% of the limit as due-soon boundary, one day over as overdue), AC3 (end states + Placed excluded),
  AC4 (recomputes from the live limit, not a stored snapshot — no `limitSnapshot`/cached field
  anywhere in the row shape), using frozen system time and the `resolveDelayStatus` pure helper this
  step's tests call (implemented in S3b).
  - Rules: `testing` — frozen time for boundary tests, name by AC id; `prd-context` — 80% due-soon,
    end states/Placed have no status.
  - Verify: `npm test -- pipeline/status` → fails
- [x] **S3b** `grok` — Implement `src/server/pipeline/status.ts`: `resolveDelayStatus(workingDaysUsed,
  limit)` pure boundary function (`due-soon` at `workingDaysUsed >= Math.ceil(limit * 0.8)`,
  `overdue` at `workingDaysUsed > limit`, else `on-track`), plus `getPipelineStatus()` reading the
  `pipeline_status` view via `getDb()` (`import "server-only"`) for #161 to call.
  - Rules: `nextjs-app` — server-only DB access; `prd-context` — waiting-on party from
    `STAGE_WAITING_ON`.
  - Verify: `npm test -- pipeline/status` → pass; `npm run typecheck`
- [x] **S4** `grok-low` — Add `supabase/migrations/20260919130100_pipeline_status_view.sql`: `create
  view public.pipeline_status with (security_invoker = true) as` joining `pipeline_entries` →
  `jobs` (client_id) → `resolve_stage_limit(...)` → `sg_working_days_between(entered_at, now())`,
  `case` for status matching S3b's boundary exactly, excluding rows whose `stage` is an end state or
  `Placed`, selecting the waiting-on party via a `case` over the 7 stages (matching
  `STAGE_WAITING_ON`). `grant select on public.pipeline_status to authenticated` only if RLS on the
  base tables still applies through the invoker semantics — otherwise no new grant, since
  `security_invoker` views need the caller's own table privileges, and this MVP has no
  `authenticated` role in active use (no sign-in) — keep the view's own explicit grants at none
  beyond what `security_invoker` requires, consistent with #158's guardrail wording "returns nothing
  to the publishable key."
  - Rules: `supabase-db`, `security-check` — security invoker, no new public access.
  - Verify: migration file only, validated in CI.
- [x] **S5** `none` — Full verification until green, then close out docs. Do not run `pr-review`.

## Test plan

| AC | Test or manual evidence | Type / reason |
|---|---|---|
| AC1/AC1b/AC1c | `stage-limits.test.ts` | unit |
| AC2 | `status.test.ts › AC2: …` | unit (pure boundary function; DB view itself validated in CI) |
| AC3 | `status.test.ts › AC3: …` | unit |
| AC4 | `status.test.ts › AC4: …` | unit |

## Verification

```
npm run lint
npm run typecheck
npm test -- stage-limits
npm test -- pipeline/status
npm test
```

`npm run test:db` is listed on both source issues but this machine has no Docker (project rule:
verify DB work in CI). The two new migrations (a function, a view) are validated by CI's
migration-apply job. `npm run build` / `test:e2e` / `eval` don't apply — no screen or AI change in
this PR.

## UX / design

n/a — no screen in this PR; #161 (dashboard) consumes `getPipelineStatus()` in a later, stacked PR.

## Data / API changes

- New SQL function `resolve_stage_limit(uuid, uuid, text) → integer`.
- New security-invoker view `pipeline_status` (working days used, resolved limit, status, days over,
  waiting-on party), scoped to `pipeline_entries` rows not in an end state or `Placed`.
- New TS reader `getPipelineStatus()` in `src/server/pipeline/status.ts`.

## Risks & rollback

- A view depending on a function that changes signature later requires dropping the view before
  altering the function; noted so a future limit-resolution change doesn't hit a silent Postgres
  dependency error. Rollback: a new migration dropping the view/function, never editing these files.
- The due-soon rounding rule (ceil) is a judgment call, not confirmed by the product owner (only the
  80% figure itself is PRD text, "proposed"); flagged under Assumptions and in the PR body.

## Outcome

- **Shipped:** `resolveStageLimit` (TS) + `resolve_stage_limit` (SQL) limit resolution with job >
  client > default priority and explicit-zero handling; the `pipeline_status` security-invoker view
  and `getPipelineStatus()` reader deriving on-track/due-soon/overdue status, days over and the
  waiting-on party per pipeline entry, excluding end states and Placed, recomputed live (no snapshot).
- **Changed files / areas:** `src/lib/stage-limits.ts`, `src/lib/stage-limits.test.ts`,
  `supabase/migrations/20260919130000_limit_resolution.sql`,
  `supabase/migrations/20260919130100_pipeline_status_view.sql`, `src/server/pipeline/status.ts`,
  `src/server/pipeline/status.test.ts`.
- **Tests added or updated:** see Test plan above.
- **Verification:** see PR body / final report for the exact command output captured at close-out.
- **Deviations:** due-soon uses `ceil(limit * 0.8)` (round up) since the PRD text ("80% or more") is
  ambiguous at fractional limits — stated once here and in `status.ts`, tested at the boundary.
- **Fix rounds / escalations:** recorded in the final report.
- **Models used:** recorded in the final report (from `.orchestrator/*.log` headers).
- **Claude direct fixes:** recorded in the final report if any were needed.
- **Follow-ups:** #159 (real default limit numbers) remains open; seeding them is that task's job,
  not this one's.
