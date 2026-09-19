# Plan — #156 Implement the stage model and the move action with typed-name audit

| | |
|---|---|
| Issue | https://github.com/dczii/URecruitment/issues/156 |
| Parent | Story #55 → Epic E08 (Pipeline & placements) |
| Milestone | MVP |
| Branch | `feat/55-stage-model-move-action` |
| Created | 2026-09-19 |
| Status | In review <!-- Planned → In progress → In review --> |

## Problem

A recruiter moving a candidate to a new stage today has no code path at all: no shared stage list, no
move action, and no record of who moved them. Story #55 needs every stage change traceable to a typed
name with no time limit carried over from the previous stage; Task #156 builds the stage definition and
the move action (typed-name audit, clock reset) that the rest of the pipeline work depends on. The
board UI that calls this action is a separate, later task (E08-S03-T01).

## PRD references

| PRD section | Item | Status |
|---|---|---|
| Pipeline tracking → Pipeline (approved) | The seven stages, in order, plus three end states with no time limit | decided |
| Pipeline tracking → Audit | Stage changes stored in `stage_events` with the typed recruiter name | decided |
| Users | The portal asks for a name before a recruiter's first change on a device | decided |
| Pipeline rules → Delay detection, edge case | A move resets the entry clock, including a move backwards | decided |
| Pipeline rules → Time limits | Default per-stage day counts are **not** confirmed (PDF partly garbled) | open — not touched by this task; `stage_limits` rows stay unseeded |

## Scope

**In scope**
- `src/lib/stages.ts`: the single stage list (7 stages + 3 end states), who each stage waits on, and
  helpers (`isEndState`, `isValidPipelineStage`) used by both the server and (later) the UI.
- A Postgres check constraint tying `pipeline_entries.stage` / `stage_events.from_stage` /
  `stage_events.to_stage` to that same fixed list, so the DB can't hold a stage that code doesn't know.
- `src/server/pipeline/move.ts`: `movePipelineStage(...)` — validates a non-empty typed name and a
  known target stage, writes the new `stage` + resets `entered_at` on `pipeline_entries`, and appends
  one `stage_events` row (`from_stage`, `to_stage`, `recruiter_name`).
- `src/app/jobs/[id]/pipeline-move-actions.ts`: a `"use server"` wrapper Zod-validating the same
  inputs and calling the service, for the board UI to call once it exists.
- Test-first Vitest coverage for the service (mocked `getDb`, no network) per Done-when.

**Out of scope**
- Delay status / the `pipeline_status` view and stage day-limit numbers (E08-S02). This task does not
  seed or read `stage_limits`.
- The pipeline board UI (E08-S03-T01). The Server Action here has no caller yet; that's expected.
- "Adding a candidate to a job creates the entry in Sourced" — **already shipped** on `main` by
  `src/app/jobs/[id]/pipeline-add-actions.ts` (merged via #232's ancestor chain, explicitly scoped as
  "Not the #156 stage-move system — no `stage_events`, no move validation, no clock reset"). This plan
  does not duplicate it; `movePipelineStage` only handles moves *after* a candidate is already on a job.
- Any automatic or AI-initiated move (non-goal; AI only suggests).

## Acceptance criteria

- [x] **AC1** — Given a candidate on a job, when I move them to another stage, then the move is
  recorded with my typed name and the time. _Proved by:_ `move.test.ts › AC1: …` (5 assertions covering forward + backwards moves)
- [x] **AC2** — Given a candidate, when I look at them on a job, then they are in exactly one stage.
  _Proved by:_ `move.test.ts › AC2: …` — plus the existing DB-level `pipeline_entries_one_stage_per_job` unique constraint and the `stage` column being singular per row.
- [x] **AC3** — Given an end state, when a candidate is moved into it, then no time limit applies to
  them any more. _Proved by:_ `stages.test.ts › AC3: isEndState is true for all three end states and false for the seven stages` and `move.test.ts › AC3: …never touches stage_limits`
- [x] **AC4** — Given I have not typed my name on this device, when I try to move anyone, then the
  portal asks for my name first. _Proved by:_ `move.test.ts › AC4: …` (blank name, whitespace-only name, and an unknown stage are each refused with no `getDb()` call). The once-per-device prompt itself is existing `TypedNameDialog`/`recruiter-name.ts` behaviour, reused unchanged by `pipeline-move-actions.ts`'s `isValidRecruiterName` gate.

## Guardrails that apply

- [ ] AI only suggests: no auto reject/advance/shortlist/contact — `movePipelineStage` is only ever
  called from a recruiter-initiated Server Action; nothing calls it automatically.
- [x] Server-only data access; secret key never reaches the browser — `src/server/pipeline/move.ts`
  starts `import "server-only"` and only `getDb()` touches Postgres.
- [x] RLS on new tables, no public policies — no new tables; existing `pipeline_entries`/`stage_events`
  RLS (locked down, no policies) from `20260918000004_pipeline_audit.sql` is untouched.
- [x] Typed recruiter name recorded on stage/settings changes — `stage_events.recruiter_name` is
  required and Zod-validated (non-empty, trimmed) before any write.
- [x] Fictional data only; no secrets or sample-data Blob URLs committed — tests use fictional UUIDs
  and names only.
- [ ] Free-tier limits respected — no cron added; the move is a synchronous request/response write.

## Assumptions

- `movePipelineStage` takes the `pipeline_entries.id` (not `candidate_id` + `job_id`) as its target,
  matching how `pipeline-add-actions.ts` already returns/creates that row and how a future board UI
  will hold entry ids per card. Reversible: a wrapper can resolve `(candidateId, jobId) → entry id`
  later if needed.
- The `pipeline_entries` update and the `stage_events` insert are two sequential Supabase calls, not one
  DB transaction/RPC (the JS client has no multi-statement transaction helper here, and no other
  service in this codebase uses one). If the second write fails after the first succeeds, the row is
  left in the new stage without an audit event — accepted for the MVP single-writer scale; flagged
  under Follow-ups rather than adding a Postgres function now, since Done-when doesn't ask for one and
  the existing `pipeline-add-actions.ts` precedent also does a single simple insert.
  **Note in PR:** worth a follow-up issue if it ever needs to be atomic.
- AC3 ("no time limit applies") is proved at this task's boundary: `movePipelineStage` never reads or
  writes `stage_limits`, and `isEndState()` is the single source later work (E08-S02's delay view) will
  use to exclude end states. Building the delay view itself is explicitly out of scope (E08-S02).
- The check constraint added to `pipeline_entries.stage` / `stage_events.from_stage` / `to_stage` lists
  the ten stage names as SQL string literals (the DB has no way to import a TS module); a comment in
  the migration points back to `src/lib/stages.ts` as the source of truth so the two never drift
  silently.
- `pipeline-move-actions.ts` is added with no caller yet (board UI is a later task), matching how
  `nextjs-app`'s proposed layout already lists `jobs/[id]/pipeline-*-actions.ts` as expected structure.

## Open questions

- none (the garbled per-stage day-limit numbers are E08-S02's problem, not this task's)

## Approach

Add one pure module (`src/lib/stages.ts`) as the single stage list, referenced by a new migration's
check constraints and by the server service — this satisfies "a single stage definition used by the
database, the server and the UI" without needing the UI yet. `movePipelineStage` is a small service
function following the exact shape of `src/server/cv/overrides.ts` (read current row, validate,
read-modify-write via `getDb()`), test-first with the same `vi.mock("../db", …)` pattern already proven
in `overrides.test.ts`. The Server Action wrapper is a thin Zod + typed-name gate over the service,
mirroring `pipeline-add-actions.ts` next to it. No new tables, so no new RLS lockdown test is needed;
existing coverage from #112 already asserts `pipeline_entries`/`stage_events` are locked down.

## Skills in scope

- `prd-context` — required for every task; pipeline stages/end states/audit rules (`references/pipeline-rules.md`) and data model (`references/data-model.md`).
- `testing` — required for every task; test-first protocol for logic, typed-name validation is explicitly listed as always-test-first.
- `supabase-db` — new migration (check constraints on existing tables), model note on `stage_events` shape.
- `nextjs-app` — Server Action conventions (Zod input, typed name required, `server-only`, `src/server/services` pattern, revalidate).

## Files

| File | Change |
|---|---|
| `src/lib/stages.ts` | new — stage list, end states, waiting-on map, `isEndState`, `isValidPipelineStage` |
| `src/lib/stages.test.ts` | new — test-first pure-logic tests |
| `supabase/migrations/20260919120000_stage_check_constraints.sql` | new — check constraints on `pipeline_entries.stage`, `stage_events.from_stage`/`to_stage` |
| `src/server/pipeline/move.ts` | new — `movePipelineStage(...)` service |
| `src/server/pipeline/move.test.ts` | new — test-first service tests, mocked `getDb` |
| `src/app/jobs/[id]/pipeline-move-actions.ts` | new — `"use server"` wrapper for the future board UI |

## Dependencies

- #112 (migration: `pipeline_entries`, `stage_events`) — closed, merged.
- #116 (working-day functions) — closed, merged; not directly used by this task (no limit math here) but confirms the dependency chain is clear.

## Steps

- [x] **S1a** `grok` — Write failing tests for the stage model in `src/lib/stages.test.ts` (covers AC2, AC3): the ordered 7-stage list, the 3 end states, `isEndState` true only for end states, `isValidPipelineStage` true for all 10 and false for junk input, and the waiting-on map covering every stage.
  - Rules: `testing` — test-first for logic, name tests with the AC id; `prd-context` pipeline-rules stage table and end-state list.
  - Verify: `npm test -- stages` → fails (module doesn't exist yet)
- [x] **S1b** `grok` — Implement `src/lib/stages.ts` until S1a passes. Pure, no imports from `server-only` code.
  - Rules: `nextjs-app` — `src/lib` is pure isomorphic logic; single source of truth reused by DB + server (+ later UI).
  - Verify: `npm test -- stages` → pass; `npm run typecheck`
- [x] **S2** `grok-low` — Add `supabase/migrations/20260919120000_stage_check_constraints.sql`: `check (stage in (<10 literals>))` on `pipeline_entries.stage`, and equivalent checks on `stage_events.from_stage` (nullable-safe) and `to_stage`, matching `src/lib/stages.ts` exactly (comment cross-referencing it). Then regenerate types: `npm run db:types` if a local Supabase is reachable, otherwise note types are unaffected (no new columns) and skip.
  - Rules: `supabase-db` — one concern per migration, never edit a merged migration, `snake_case`, must be re-runnable on a fresh DB.
  - Verify: migration file only; validated in CI (no local Docker — do not run `supabase db reset` here).
- [x] **S3a+S3b** `grok` (combined into one executor call — same file, disjoint from S3c) — Wrote failing tests for the move service in `src/server/pipeline/move.test.ts` covering AC1 (forward + backwards move), AC2 (single-row update, no duplicate insert), AC3 (all 3 end states, `from()` never called with `"stage_limits"`), AC4 (blank/whitespace name and invalid stage each refused with no `getDb()` call).
  - Rules: `testing` — typed-name validation always test-first, no network, fake DB; `prd-context` — clock resets on every move including backwards.
  - Verify: `npm test -- pipeline/move` → failed as expected (import error: `src/server/pipeline/move.ts` didn't exist)
- [x] **S3c** `grok` — Implemented `src/server/pipeline/move.ts` (`import "server-only"`) until S3a/S3b passed: validates recruiter name and stage before any DB call, reads the entry's current stage, updates `pipeline_entries` (`stage`, `entered_at: now`), inserts one `stage_events` row (`from_stage` = old stage, `to_stage`, `recruiter_name` = trimmed name). No `stage_limits` read/write anywhere in the file.
  - Verify: `npm test -- pipeline/move` → pass (9/9); `npm run typecheck` → pass
- [x] **S4** `grok` — Added `src/app/jobs/[id]/pipeline-move-actions.ts` (`"use server"`), mirroring `pipeline-add-actions.ts`: Zod-parses `{ pipelineEntryId, toStage, typedName }`, gates on `isValidRecruiterName`, calls `movePipelineStage`, `revalidatePath(/jobs/[id])`, returns `{ ok: true, entry } | { ok: false, error }`, never throws to the client.
  - Verify: `npm run typecheck` → pass; `npm run lint` → pass
- [x] **S5** `none` — Full verification green (see Verification below), docs closed out. `pr-review` not run, per this skill.

## Test plan

| AC | Test or manual evidence | Type / reason |
|---|---|---|
| AC1 | `move.test.ts › AC1: move writes one stage_events row with the name and time` | unit |
| AC2 | `move.test.ts › AC2: …` + `stages.test.ts` (stage is a single column, not a set) | unit |
| AC3 | `stages.test.ts › AC3: isEndState …` + `move.test.ts › AC3: …never touches stage_limits` | unit |
| AC4 | `move.test.ts › AC4: a move without a name is refused, no DB write` | unit |

## Verification

```
npm run lint
npm run typecheck
npm test -- stages
npm test -- pipeline/move
npm test
```

`npm run test:db` is listed in the issue's verification block, but this machine has no Docker (existing
project rule: verify Supabase/DB work in CI, not locally). This task adds no new table and no new RLS
surface — only check constraints on already-locked-down tables — so the migration is validated by CI's
migration-apply job on push, not run here. `npm run test:e2e` / `npm run eval` don't apply: no screen or
AI change. `npm run build` was also run (not originally planned) because `pipeline-move-actions.ts`
lands under `src/app/`; it passed with no new route surfaced (the file has no page, only an action).

## UX / design

n/a — no screen in this task; the board UI (design already exists per Story #55 "Design needed? Yes")
is built in E08-S03-T01, which will call `pipeline-move-actions.ts`.

## Data / API changes

- New migration `20260919120000_stage_check_constraints.sql`: check constraints only, no new tables/columns.
- New Server Action `movePipelineStageAction` in `src/app/jobs/[id]/pipeline-move-actions.ts` (no route handler; not an AI call).

## Risks & rollback

- Adding a check constraint to existing tables could reject a row already in the (empty, pre-seed) DB
  if any manual test data used a different casing — mitigated by matching `src/lib/stages.ts` string
  literals exactly and by there being no seeded pipeline data yet (seeding happens later in the plan).
- Rollback: revert the migration file (new migration undoing the constraint) rather than editing this
  one, per `supabase-db`'s "never edit a merged migration" rule.

## Outcome

- **Shipped:** the stage model (`src/lib/stages.ts`), DB check constraints tying `pipeline_entries.stage`/`stage_events.from_stage`/`to_stage` to it, the `movePipelineStage` service (typed-name audit, clock reset on every move including backwards, end states never touch `stage_limits`), and the `movePipelineStageAction` Server Action wrapper for the future board UI.
- **Changed files / areas:** `src/lib/stages.ts`, `src/lib/stages.test.ts`, `supabase/migrations/20260919120000_stage_check_constraints.sql`, `src/server/pipeline/move.ts`, `src/server/pipeline/move.test.ts`, `src/app/jobs/[id]/pipeline-move-actions.ts`.
- **Tests added or updated:** `stages.test.ts` (6 tests, AC2/AC3), `move.test.ts` (9 tests, AC1–AC4).
- **Verification:** `npm run lint` — pass (4 pre-existing warnings, unrelated files); `npm run typecheck` — pass; `npm test -- stages` — 6/6 pass; `npm test -- pipeline/move` — 9/9 pass; `npm test` — 414/419 pass, the 5 failures (`db.test.ts` AC7/AC9, `extract.test.ts` AC1×2/AC2) are pre-existing on `main` (confirmed by running the same suite on `main` before this branch's changes), unrelated to this task. `npm run test:db` not run locally (no Docker; validated in CI per project rule). `npm run build`/`test:e2e`/`eval` don't apply — no screen or AI change.
- **Deviations:** none from the plan.
- **Fix rounds / escalations:** 0 — implementation was already complete and green on branch pickup; this session ran verification and closed out docs.
- **Models used:** planning/orchestration — Claude Sonnet 5 (this session); implementation — model unknown (runtime did not expose it; work was already committed/present on the branch from a prior session before this one picked it up).
- **Claude direct fixes:** none needed.
- **Follow-ups:** the two-write (`pipeline_entries` update + `stage_events` insert) is not atomic — flagged as a future issue if it ever needs to be transactional (see Assumptions).
