# Plan — #34 The core schema exists with RLS locked down

Spec: [spec.md](./spec.md) · Branch: `feat/34-core-schema-rls` · Created: 2026-09-18

## Approach

Five sequential migrations, one per Task, in dependency order (#109 → #110 → #111 → #112 → #113),
each self-contained and re-runnable (`supabase db reset` must succeed from scratch, per
`supabase-db`). Every migration creates its tables and locks them down in the same file (ADR-0002
D2), so `supabase/migrations.test.ts` (the lock-down lint, no Docker needed) is green after every
commit, not just at the end. `database.types.ts` is regenerated (hand-written, since Docker isn't
available — see spec Assumptions) after each migration so `npm run typecheck` stays green
throughout. #113 adds the DB-integration RLS proof plus per-table DB tests for AC1–AC4; these are
written test-first and syntax-checked, but actually running green needs the CI database job (no
Docker locally).

Rejected alternative: one giant migration for all 16 tables. Rejected because `supabase-db` says
"one concern per migration" and the Story's own Task split already draws the boundaries; one
migration per Task keeps `git blame` and revert granularity aligned with the issue tracker.

## Skills in scope

- `prd-context` — required for every task; table ownership and invariants come from its
  `references/data-model.md`, expanded by ADR-0002.
- `testing` — required for every task; test-first for DB constraints, DB tests roll back /
  reset, no live-holiday-table dependency here.
- `supabase-db` — migrations, RLS pattern, `candidate_profiles` parsed/overrides split,
  `match_scores` unique key, `ai_runs` shape, pgvector/PGroonga extension, type regeneration. Matches
  every file in this Story.
- `compliance-review` — fair-employment constraint on `job_versions` (nationality/language reason),
  consent/retention inert columns on `candidates`, no real data.
- `security-check` — RLS lock-down is the whole point of #113; secrets/Blob-URL hygiene on
  `cv_files`.
- `github-workflow` — Story workflow: one branch, one PR, per-task commits, closing keywords.

## Files

| File | Change |
|---|---|
| `supabase/migrations/<ts>_clients_jobs.sql` | new — #109 |
| `supabase/migrations/<ts>_candidates.sql` | new — #110 |
| `supabase/migrations/<ts>_embeddings_scores.sql` | new — #111 |
| `supabase/migrations/<ts>_pipeline_audit.sql` | new — #112 |
| `src/lib/database.types.ts` | modify after each migration — regenerated types |
| `supabase/tests/rls.db.test.ts` | new — #113, enumerates tables, proves RLS + zero anon rows |
| `supabase/tests/match_scores.db.test.ts` | new — #113, proves the unique key (AC3) |
| `supabase/tests/candidate_profiles.db.test.ts` | new — #113, proves parsed/overrides separation (AC4) |
| `vitest.db.config.ts` | modify — drop `passWithNoTests: true` once #113 adds real DB tests |

## Dependencies

- none (all extensions used — `pgcrypto`/`gen_random_uuid`, `vector` — are core Postgres / already
  available in the Supabase image).

## Steps

- [x] **S1** `grok` — #109: create `clients`, `jobs`, `job_versions`, `gap_flags` with RLS + revoke,
  the nationality/language-reason check constraint on `job_versions`, and regenerate types.
  - Rules: `supabase-db` §Migrations, §Security; ADR-0002 D1 rows 1–4, D4 invariant 4 (timestamptz/UTC)
  - Verify: `npm test -- supabase/migrations.test.ts`; `npm run typecheck`
- [x] **S2** `grok` — #110: create `candidates` (with inert consent/retention columns), `cv_files`,
  `candidate_profiles` (`parsed`/`overrides` jsonb, separate), `candidate_skills` (source-text
  required), RLS + revoke, regenerate types.
  - Rules: `supabase-db` §Model notes (`candidate_profiles`, `cv_files`); ADR-0002 D1 rows 5–8, D3,
    D4 invariant 2; `compliance-review` §C (consent/retention columns exist but stay inert)
  - Verify: `npm test -- supabase/migrations.test.ts`; `npm run typecheck`
- [x] **S3** `grok` — #111: enable `vector` extension; create `embeddings` (unconstrained `vector`
  column + `embedding_model text not null`, no ANN index — see spec Assumptions) and `match_scores`
  (unique key `(candidate_id, job_version_id, model_version)`), RLS + revoke, regenerate types.
  - Rules: `supabase-db` §Search extensions, §Model notes (`match_scores`); ADR-0002 D1 rows 9–10, D4
    invariant 1; spec Assumptions (dimension deferred, ADR-0003 open)
  - Verify: `npm test -- supabase/migrations.test.ts`; `npm run typecheck`
- [x] **S4** `grok` — #112: create `pipeline_entries` (one-stage-per-job constraint),
  `stage_events`/`settings_log` (non-empty `recruiter_name`), `stage_limits`, `placements`, `ai_runs`,
  RLS + revoke, regenerate types.
  - Rules: `supabase-db` §Model notes (`ai_runs`, `stage_events`); ADR-0002 D1 rows 11–16, D4
    invariant 3
  - Verify: `npm test -- supabase/migrations.test.ts`; `npm run typecheck`
- [x] **S5a** `grok` — #113: write failing DB tests — `supabase/tests/rls.db.test.ts` (dynamic table
  enumeration, RLS-enabled + zero-anon-rows for every table), `match_scores.db.test.ts` (duplicate
  key rejected), `candidate_profiles.db.test.ts` (parsed/overrides separation). Wire into
  `vitest.db.config.ts` (drop `passWithNoTests`).
  - Rules: `testing` §DB tests, §Test-first protocol; `security-check` §Data access
  - Verify: syntax/typecheck only here (no Docker) — `npm run typecheck`; note in report that
    `npm run test:db` needs the CI database job to actually run
- [x] **S6** `none` — Full verification (lint, typecheck, unit test) until green on this machine;
  record the `npm run test:db` / `supabase migration up` gap explicitly; close out docs. Do not run
  `pr-review`.

## Test plan

| AC | Test or manual evidence | Type / reason |
|---|---|---|
| AC1 | `supabase/tests/rls.db.test.ts › lists all Story tables` + `supabase/migrations.test.ts` (lock-down lint, runs now) | DB-integration (needs CI) + unit (runs now) |
| AC2 | `supabase/tests/rls.db.test.ts › the anon key reads zero rows from every table` | DB-integration (needs CI) |
| AC3 | `supabase/tests/match_scores.db.test.ts › rejects a duplicate (candidate, job_version, model_version)` | DB-integration (needs CI) |
| AC4 | `supabase/tests/candidate_profiles.db.test.ts › parsed and overrides occupy separate columns` | DB-integration (needs CI) |

## Verification

```
npm run lint
npm run typecheck
npm test
npm run test:db      # cannot run on this machine (no Docker); deferred to CI database job
```

`npm run build` and `npm run test:e2e` are not run: no app code or screens change in this Story.
`npm run eval` is not run: no AI prompts/schemas change.

## Risks & rollback

- **Wrong table shape.** Each migration is reversible by adding a new down-equivalent migration
  (never editing a merged one, per `supabase-db`); nothing here is applied to a shared environment
  yet, so a revert commit is enough pre-merge.
- **pgvector dimension deferred.** Real risk: a later task creates the HNSW index with a dimension
  that doesn't match how #145 (embedding service) actually calls the model. Mitigated by recording
  the exact follow-up needed (spec Assumptions) rather than guessing a dimension now.
- **Type-drift risk.** Hand-written `database.types.ts` could diverge from what `supabase gen types`
  would produce. Mitigated by keeping the migrations as the single source of truth and flagging
  `db:types:check` (CI) as the follow-up that catches drift.

## Outcome

- **Shipped:** All five Tasks (#109–#113) on one branch: four migrations creating the sixteen
  MVP-owned tables from ADR-0002 D1 (rows 1–16), each locked down with RLS + revoke in the same
  file; hand-written `database.types.ts` updates after each; the DB-integration RLS/invariant test
  suite for #113.
- **Changed files / areas:**
  - `supabase/migrations/20260918000001_clients_jobs.sql` — `clients`, `jobs`, `job_versions`
    (nationality/language-reason check constraints), `gap_flags` (#109)
  - `supabase/migrations/20260918000002_candidates.sql` — `candidates` (inert consent/retention
    columns), `cv_files`, `candidate_profiles` (parsed/overrides split), `candidate_skills`
    (source-text required) (#110)
  - `supabase/migrations/20260918000003_embeddings_scores.sql` — `vector` extension, `embeddings`
    (unconstrained vector, no index — ADR-0003 open), `match_scores` (unique candidate/job-version/
    model-version key) (#111)
  - `supabase/migrations/20260918000004_pipeline_audit.sql` — `pipeline_entries` (one-stage-per-job
    unique constraint), `stage_events`, `stage_limits`, `placements`, `settings_log`, `ai_runs` (#112)
  - `src/lib/database.types.ts`, `src/lib/database.types.test.ts` — extended after every migration
  - `supabase/tests/rls.db.test.ts` — rewritten: dynamic catalogue discovery (no hard-coded table
    list), RLS-enabled + zero-policy assertion per table, anon-key zero-rows assertion per table (#113)
  - `supabase/tests/match_scores.db.test.ts` — new, proves the unique-key rejection (AC3)
  - `supabase/tests/candidate_profiles.db.test.ts` — new, proves parsed/overrides separation (AC4)
  - `vitest.db.config.ts` — dropped `passWithNoTests: true` now that real DB tests exist
- **Tests added or updated:** `supabase/tests/rls.db.test.ts`, `supabase/tests/match_scores.db.test.ts`,
  `supabase/tests/candidate_profiles.db.test.ts` (all new/rewritten, DB-integration layer);
  `src/lib/database.types.test.ts` extended for each new table set (unit layer, runs now).
- **Verification:**
  - `npm run lint` → pass (1 pre-existing warning in `migration-lint.ts`, unrelated to this diff)
  - `npm run typecheck` → pass
  - `npm test` → 162 passed, 2 failed (`src/server/db.test.ts` — pre-existing `ECONNREFUSED`/missing
    native WebSocket failure, confirmed present on `main` before this branch existed, untouched by
    this Story)
  - `npm run test:db` → fails with `ECONNREFUSED 127.0.0.1:54322` on all three new DB test files —
    **expected**: this machine has no Docker/local Supabase stack (session-level constraint, not a
    code defect). Deferred to the CI database job per the `testing` skill's own layer assignment.
    `supabase migration up` was not run for the same reason.
  - `npm run build` / `npm run test:e2e` / `npm run eval` — not run: no app code or screens or AI
    prompts changed in this Story.
- **Deviations:**
  - S1's executor also updated `src/lib/database.types.test.ts` (not originally listed as an
    allowed file in that step's prompt) because the existing test asserted the placeholder empty
    `Tables` shape and would otherwise fail after the type change — inspected and kept; each
    subsequent step's prompt explicitly allowed this file.
  - `database.types.ts` is a **hand-written mirror** of the migrations, not `supabase gen types`
    output, because generating for real needs the local Supabase CLI stack (Docker), unavailable on
    this machine. Flagged as a follow-up below.
  - S5a's executor removed the old `SKIP_DB_TESTS`/connection-error-skip behaviour from
    `rls.db.test.ts` (previously: no local stack → 0 tests, exit 0) in favour of a hard connection
    error. This is intentional now that real tables exist — a silent pass would defeat #113's own
    purpose — but it means `npm run test:db` now fails loudly (not exits 0) on any machine without
    Docker. Confirmed no other file depends on `SKIP_DB_TESTS`.
- **Fix rounds / escalations:** none — all five steps (S1–S5a) passed inline verification
  (`supabase/migrations.test.ts`, `npm run typecheck`, `database.types.test.ts`) on the first
  attempt. No escalation to `cursor-grok-4.6-xhigh` was needed.
- **Models used:**
  - Planning/orchestration: Claude (Sonnet 5, `claude-sonnet-5`), this session.
  - S1 (#109 migration): `cursor-grok-4.6-high` — 1 attempt, exit 0.
  - S2 (#110 migration): `cursor-grok-4.6-high` — 1 attempt, exit 0.
  - S3 (#111 migration): `cursor-grok-4.6-high` — 1 attempt, exit 0.
  - S4 (#112 migration): `cursor-grok-4.6-high` — 1 attempt, exit 0.
  - S5a (#113 tests): `cursor-grok-4.6-high` — 1 attempt, exit 0.
  - (Ledger built from `.orchestrator/34-core-schema-rls/*.log` headers.)
- **Claude direct fixes:** none needed — every step passed inline review and verification as
  delivered.
- **Follow-ups:**
  - Regenerate `src/lib/database.types.ts` for real with `npm run db:types` (and run
    `npm run db:types:check` in CI) the first time this branch — or a later one touching these
    tables — runs against a live local/CI Supabase stack, to catch any drift between the hand-written
    mirror and the CLI's actual output.
  - Run `npm run test:db` and `supabase migration up`/`supabase db reset` for real in CI (the
    database job) before merge, to get an actual green/red on AC1–AC4 rather than the typecheck-only
    verification done here.
  - Once ADR-0003 (embedding provider) resolves: add a follow-up migration that fixes
    `embeddings.embedding`'s vector dimension and adds the HNSW `vector_cosine_ops` index (spec
    Assumptions; #111 keeps its `needs-decision` label until then).
  - `stage_limits` carries no seeded day values (ADR-0002 D3: the PRD's per-stage table is partly
    garbled); the task that seeds real numbers must confirm them with the product owner and label
    itself `needs-decision` if it cannot.
  - Storage bucket creation (E03-S02-T01) and the seed script are separate, out-of-scope tasks that
    can now proceed against this schema.
