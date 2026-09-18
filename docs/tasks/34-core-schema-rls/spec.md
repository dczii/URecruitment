# Spec — #34 The core schema exists with RLS locked down

| | |
|---|---|
| Issue | https://github.com/dczii/URecruitment/issues/34 |
| Parent | Story #34 → Epic #3 (E03 Data & seed) |
| Milestone | MVP |
| Branch | `feat/34-core-schema-rls` |
| Created | 2026-09-18 |
| Status | In progress |

## Problem

Right now `supabase/migrations/` is empty and `src/lib/database.types.ts` is a placeholder with no
tables. No recruiter-facing feature can be built until the sixteen MVP tables this Story owns exist,
every one of them locked down so that a portal with no sign-in still cannot leak a row.

## PRD references

| PRD section | Item | Status |
|---|---|---|
| Data model | The seventeen core tables | suggested (ADR-0002 D1 makes table ownership decided-by-the-team) |
| Data model | Match scores keyed to job version + model version | decided as an invariant (ADR-0002 D4 invariant 1) |
| Data model → `candidate_profiles` | Recruiter edits stored separately so re-parsing never overwrites them | suggested (ADR-0002 D4 invariant 2) |
| Security | RLS on every table, no public policies, publishable key reads nothing | suggested, but CLAUDE.md hard rule 3 and ADR-0001 D1.2 make it not negotiable |
| AI governance | Every AI output stored with input, model version, cost, duration | proposed (ADR-0002 D4 invariant 3, for `ai_runs`) |
| Pipeline tracking → Time limits | Working days, Mon–Fri, skipping SG public holidays | decided (schema only here: `stage_limits`; the SQL/TS logic is a later task, #116) |
| ADR-0003 (AI provider) | Embedding model, and therefore the pgvector dimension | **open** |

## Scope

**In scope**
- Five migrations, one per Task, each creating its tables with RLS enabled and revoked from
  `anon, authenticated` in the same migration (ADR-0002 D2):
  - #109 `clients`, `jobs`, `job_versions`, `gap_flags`
  - #110 `candidates`, `cv_files`, `candidate_profiles`, `candidate_skills`
  - #111 `vector` extension, `embeddings`, `match_scores`
  - #112 `pipeline_entries`, `stage_events`, `stage_limits`, `placements`, `settings_log`, `ai_runs`
  - #113 the RLS lock-down proof: a DB test enumerating every table from the catalogue
- Regenerating `src/lib/database.types.ts` after every migration (kept a placeholder here — see
  Assumptions; real generation needs the local Supabase stack)
- The `job_versions` constraint that nationality/language requirements need a written reason
- The `pipeline_entries` constraint that a candidate occupies exactly one stage per job
- Non-empty typed-name checks on `stage_events` and `settings_log`

**Out of scope**
- `sg_public_holidays` (owned by #115, E03-S01 is not its parent — ADR-0002 D1 row 17)
- Parsing, matching, gap-check, search, pipeline and seed *logic* (later epics read/write these tables)
- The override-merge rule, delay-status view, limit resolver, `runAi` writer (each has its own task)
- Fixing the pgvector dimension or adding an ANN index (blocked on ADR-0003, see Assumptions)
- Storage bucket creation (E03-S02-T01)

## Acceptance criteria

- [ ] **AC1** — Given the migrations are applied to an empty database, when I list the tables, then
  all sixteen tables this Story owns exist with the columns ADR-0002 D1 specifies (the seventeenth,
  `sg_public_holidays`, is #115's). _Proved by:_ `supabase/tests/rls.db.test.ts` (enumerates
  `information_schema.tables`) — DB-integration, needs local Supabase (Docker); `supabase/migrations.test.ts`
  proves every committed migration file is lock-down-compliant without Docker.
- [ ] **AC2** — Given the publishable (anon) key, when it queries any table, then it returns no rows
  and no error that reveals the schema. _Proved by:_ `supabase/tests/rls.db.test.ts › the anon key
  reads zero rows from every table` — DB-integration, needs local Supabase.
- [ ] **AC3** — Given a match score, when it is stored, then its key includes the candidate, the job
  version and the model version. _Proved by:_ `supabase/tests/match_scores.db.test.ts › rejects a
  duplicate (candidate, job_version, model_version)` — DB-integration, needs local Supabase.
- [ ] **AC4** — Given a recruiter edit to a parsed field, when the CV is parsed again, then the edit
  is stored separately and is not overwritten. _Proved by:_ `supabase/tests/candidate_profiles.db.test.ts
  › parsed and overrides occupy separate columns; re-writing parsed leaves overrides untouched` —
  DB-integration, needs local Supabase.

## Guardrails that apply

- [x] RLS on new tables, no public policies; private Storage + signed URLs — every migration below
  enables RLS and revokes `anon, authenticated` in the same file (ADR-0002 D2); Storage bucket itself
  is out of scope (E03-S02-T01).
- [x] AI output schema-validated, logged to `ai_runs`, shows source text — `ai_runs` and the
  `ai_run_id`/`source_text` columns on AI-derived tables are created here so later tasks have
  somewhere to write; the writer itself is #175/`ai-pipeline` work, out of scope.
- [x] Protected attributes ignored; nationality/language only with a written reason —
  `job_versions` gets a `check` constraint requiring `nationality_reason`/`language_reason` whenever
  the corresponding requirement is set.
- [x] UTC stored, SGT shown; SG working days — every timestamp column is `timestamptz`; `stage_limits`
  stores limits in working days (the counting logic is #116, out of scope).
- [x] Typed recruiter name recorded on stage/settings changes — `stage_events.recruiter_name` and
  `settings_log.recruiter_name` are `text not null`.
- [x] Fictional data only; no secrets or sample-data Blob URLs committed — no seed data is written by
  this Story; `cv_files.source_ref`/`source_hash` never store the public blob URL (ADR-0002 rejected
  alternatives).
- [x] Free-tier limits respected — no `pg_cron`/Vercel cron added; the delay view (later task) stays a
  view, not a job.
- [ ] AI only suggests / No email sent / Server-only data access / Search & delay-status logic /
  phone width & Chinese text — not applicable to a schema-only Story.

## UX / design

n/a — no screen changes.

## Data / API changes

Five new migrations under `supabase/migrations/`, listed in Scope. `src/lib/database.types.ts`
regeneration is attempted; see Assumptions for what happens without Docker.

## Assumptions

- **`embeddings.embedding` has no fixed pgvector dimension.** ADR-0003 (the AI/embedding provider) is
  still **open**, and the dimension is a consequence of that choice (ADR-0002 D2 "Open dependency").
  ADR-0003 line 179 is explicit that only the *dimension* is blocked for #111 — "the rest of that
  migration (`match_scores`) is not blocked." This Story therefore creates `embeddings.embedding` as
  an **unconstrained `vector`** column (pgvector allows a `vector` type with no dimension; only an
  ANN index requires one) and stores `embedding_model text not null` beside every vector, per
  ADR-0002 D1 row 9. **No HNSW/IVFFlat index is created in this migration** — indexing genuinely needs
  the fixed dimension. A follow-up migration, once ADR-0003 resolves, adds `check (vector_dims(embedding) = <n>)`
  (or recreates the column typed) and the HNSW index. This is recorded here, not settled silently:
  #111 keeps its `needs-decision` label and this spec cites ADR-0003 as open.
- **`database.types.ts` is committed as a hand-written mirror of the migrations, not the CLI's
  generated output.** `npm run db:types` needs `supabase start` (Docker), which this machine does not
  have (session memory: verify DB work in CI, not locally). Generating types by hand from the same
  migrations is a reversible stand-in — CI's `db:types:check` (once wired by #115/ci-setup work) will
  catch any drift the next time it runs against the real CLI. This is flagged as a follow-up, not
  hidden.
- **DB-integration tests (`npm run test:db`) are written test-first but cannot be run to green on
  this machine.** They are verified for syntax/typecheck only here; running them against a live local
  Supabase stack is deferred to CI's database job (`ci-setup` skill), which is the environment this
  project's own `testing` skill designates for that layer. This is called out explicitly in Outcome,
  not silently skipped.
- **Task ordering follows the dependency chain in the Story body** (#109 → #110 → #111 → #112 →
  #113), one commit per task, all on one branch/PR per the Story workflow.

## Open questions

- The embedding model and its pgvector dimension (ADR-0003) — **open**, not settled by this Story
  (see Assumptions).
- Stage-limit day counts (ADR-0002 D3, "the PRD's per-stage day table is partly garbled") — not this
  Story's job to fix; `stage_limits` here is schema-only, seeded with no default day values. The task
  that seeds real numbers must confirm them with the product owner (ADR-0002 D3).
