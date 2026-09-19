# Plan — #162 Create the placement record with the start-date check and guarantee end date

| | |
|---|---|
| Issue | https://github.com/dczii/URecruitment/issues/162 |
| Parent | Story #59 "After a candidate is placed" → Epic #10 (Placements & guarantee) |
| Milestone | MVP |
| Branch | `feat/57-placement-create` (stacked on `feat/56-delay-status`, PR #234) |
| Created | 2026-09-19 |
| Status | In review <!-- Planned → In progress → In review --> |

## Problem

When a candidate reaches Placed, nothing records their confirmed start date or computes when the
client's replacement guarantee ends. #163 (the guarantee-ending flag) and #164 (the placements
screen) both need this record to exist first.

## PRD references

| PRD section | Item | Status |
|---|---|---|
| Pipeline tracking → After Placed | portal confirms the start date and tracks a 30-day replacement guarantee | decided |
| Data model → placements | start-date check and guarantee end date | suggested |
| Data model → clients | clients hold their own guarantee period | suggested |
| Audit | typed recruiter name on every write | decided |

## Scope

**In scope**
- `createPlacement`: reads the client's `guarantee_period_days` (already defaults to 30 at the
  column level, set in `20260918000001_clients_jobs.sql`) and computes `guarantee_end_date` from it.
- A start date before the pipeline entry's Placed-stage entry date is refused.
- One placement per pipeline entry: a second call updates the existing row and recomputes the end
  date, rather than inserting a duplicate.
- `savePlacementAction`, a `"use server"` wrapper requiring the typed recruiter name.
- Migration adding `placements.recruiter_name` (not-null, non-blank) and a unique constraint on
  `pipeline_entry_id`.

**Out of scope**
- The guarantee-ending flag itself (#163, separate stacked PR).
- The placements screen UI (#164).
- Invoicing, fees, or replacement workflows.

## Acceptance criteria

- [x] **AC1** — Given a job limit... *(not applicable, carried from template; see below)*
- [x] **AC1** — Given a client's own guarantee period, when a placement is created, then the end
  date uses that period. _Proved by:_ `create.test.ts › AC1: the client's own guarantee period is
  used when set`.
- [x] **AC2** — Given a client with the 30-day default, when a placement is created, then the
  30-day default applies. _Proved by:_ `create.test.ts › AC2: the 30-day default applies when the
  client has no period`.
- [x] **AC3** — Given a start date before the placed date, when saving, then the save is refused.
  _Proved by:_ `create.test.ts › AC3: a start date before the placed date is refused, no write`.
- [x] **AC4** — Given an existing placement, when the start date changes, then the end date
  recomputes on the same row (no duplicate). _Proved by:_ `create.test.ts › AC4: changing the start
  date recomputes the end date on the existing placement`.

## Guardrails that apply

- [x] Typed recruiter name recorded — `placements.recruiter_name`, Zod + `isValidRecruiterName`
  gated in `savePlacementAction`.
- [x] Server-only data access — `create.ts` starts `import "server-only"`.
- [x] RLS respected — no new table; `placements` RLS (locked down, no policies) from
  `20260918000004_pipeline_audit.sql` is untouched; the new columns/constraint don't grant anything.
- [x] Fictional data only — tests use fictional UUIDs and names.
- [ ] Free-tier limits — n/a, no cron.

## Assumptions

- **Calendar vs working days (the open question this task must answer once):** the guarantee period
  itself (`guarantee_period_days`, "a 30-day guarantee") is a **calendar-day** count, computed with
  plain date arithmetic (`addCalendarDays` in `create.ts`). This is distinct from the 5-**working**-day
  lead time on the guarantee-ending flag (#163), which does use the SG working-day clock — the two
  are different rules and this task only decides the guarantee length's own unit. Reversible: if the
  product owner says otherwise, only `addCalendarDays` changes.
- "The start date cannot be before the placed date" is checked against the pipeline entry's
  `entered_at` at the time it last moved into `Placed` (from #156's clock-reset-on-every-move
  behaviour), converted to its SGT calendar date. This is the simplest reading consistent with #156's
  "the entry clock resets on every move, including into an end state" behaviour — `entered_at` on a
  `Placed` row is exactly the placed date.
- No new `placements` migration touches `guarantee_period_days`'s existing DB default (30) — the
  client's own row is always read explicitly rather than relying on that default appearing in
  `createPlacement`'s own logic, since a client row might have a different explicit value.
- `PlacementsClient` in `create.ts` is a narrow local type over `getDb()`'s return, the same pattern
  `src/server/pipeline/status.ts` uses for `pipeline_status` — the generated `Database` types don't
  include `placements.recruiter_name` yet (needs a local Supabase stack to regenerate; CI's
  `db:types:check` will flag the drift and the fix commit regenerates it, same as PR #233's history).

## Files

| File | Change |
|---|---|
| `src/server/placements/create.ts` | new — `createPlacement(...)` |
| `src/server/placements/create.test.ts` | new — test-first |
| `src/app/placements/actions.ts` | new — `savePlacementAction` Server Action wrapper |
| `supabase/migrations/20260919150000_placements_recruiter_name.sql` | new — `recruiter_name` column + unique constraint |

## Dependencies

- #156 (stage model + move action) — in PR #233, this branch is stacked on it via #234.
- #116 (working-day functions) — closed, merged; not directly used here (calendar days), see Assumptions.

## Steps

- [x] **S1a** `grok` — Write failing tests in `create.test.ts` for AC1–AC4 plus the missing-name and
  wrong-stage refusals, mocking `../db`.
  - Rules: `testing` — test-first, name by AC id, no network; `prd-context` — 30-day default,
    typed-name audit.
  - Verify: `npm test -- placements/create` → fails
- [x] **S1b** `grok` — Implement `create.ts` until S1a passes.
  - Rules: `supabase-db` — server-only, typed client shim for undrifted columns; `nextjs-app` —
    typed-name 1–80 chars.
  - Verify: `npm test -- placements/create` → pass; `npm run typecheck`
- [x] **S2** `grok-low` — Add the migration; `src/app/placements/actions.ts` Server Action wrapper.
  - Rules: `supabase-db` — one concern per migration, never edit a merged one; `nextjs-app` —
    Server Action shape.
  - Verify: `npm run typecheck`; `npm run lint`
- [x] **S3** `none` — Full verification, close out docs. Do not run `pr-review`.

## Test plan

| AC | Test | Type |
|---|---|---|
| AC1 | `create.test.ts › AC1: …` | unit |
| AC2 | `create.test.ts › AC2: …` | unit |
| AC3 | `create.test.ts › AC3: …` | unit |
| AC4 | `create.test.ts › AC4: …` | unit |

## Verification

```
npm run lint
npm run typecheck
npm test -- placements/create
npm test
```

`npm run test:db` not run locally (no Docker; the migration is validated in CI). `npm run build` /
`test:e2e` / `eval` don't apply — no screen or AI change in this PR.

## UX / design

n/a — no screen in this PR; #164 (placements screen) calls `savePlacementAction` in a later, stacked PR.

## Data / API changes

- New migration: `placements.recruiter_name` (not-null, non-blank), unique `pipeline_entry_id`.
- New Server Action `savePlacementAction`.

## Risks & rollback

- The unique constraint on `pipeline_entry_id` assumes no pre-existing duplicate rows — safe, since
  no seed data exists yet for `placements`. Rollback: a new migration dropping the constraint/column,
  never editing this one.

## Outcome

- **Shipped:** `createPlacement` (client-period-aware guarantee end date, explicit 30-day default,
  start-date-before-placed refusal, upsert-by-pipeline-entry recompute), `savePlacementAction`, and
  the `recruiter_name` + uniqueness migration.
- **Changed files / areas:** see Files above.
- **Tests added or updated:** `create.test.ts`, 6 tests (AC1–AC4 plus missing-name and wrong-stage).
- **Verification:** `npm run lint` pass (pre-existing warnings only); `npm run typecheck` pass;
  `npm test -- placements/create` 6/6 pass; full `npm test` — same 5 pre-existing unrelated failures
  as PR #233/#234, nothing new.
- **Deviations:** none from plan.
- **Fix rounds / escalations:** 0.
- **Models used:** planning + implementation — Claude Sonnet 5 (this session, direct implementation
  rather than a cursor-agent call, to keep pace with the dependency chain already in flight).
- **Claude direct fixes:** n/a.
- **Follow-ups:** #163 (guarantee flag) and #164 (placements screen) build on this.
