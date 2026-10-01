---
name: supabase-db
description: >
  Supabase/Postgres rules for HRManagement: Supabase CLI migrations, the 17-table model, RLS on
  every table with no public policies, private Storage and signed URLs, PGroonga keyword search,
  security-invoker views (delay status), SG working-day SQL, generated types and the idempotent
  seed. Use for any schema, migration, query, view, function, storage or seed change.
---

# Supabase & database

Read `docs/decisions/adr-0002-data-model.md` (tables and invariants), `docs/decisions/adr-0001-architecture.md`, `docs/security/baseline.md`, and `docs/plans/infrastructure.md`. `prd-context/references/data-model.md` and `pipeline-rules.md` give the PRD view. Existing migrations are in `supabase/migrations/`; read the latest ones for the area before writing a new one.

## Environments

Supabase Free, `ap-southeast-1`; local dev uses `supabase start` (needs Docker, **not available on this machine**: verify in CI via `.github/workflows/db.yml`). Only CI (`migrate.yml`) applies migrations remotely. Agents never touch a remote project. Free limits: 500 MB DB, 1 GB storage, 50 MB/file, pauses after a week idle.

## Migrations

- `npx supabase migration new <snake_case>`. **Never edit a merged migration**; add a new one. One concern each; `supabase db reset` must succeed.
- Conventions: `id uuid primary key default gen_random_uuid()`, `created_at timestamptz not null default now()`, `timestamptz` everywhere, explicit `on delete`, enums as `check` or enum type.
- After any schema change run `npm run db:types` (writes `src/lib/database.types.ts`); CI runs `db:types:check`.
- `supabase/migrations.test.ts` and `migration-lint.ts` fail a migration that creates a table without RLS and revoke.

## Security (hard)

```sql
alter table public.<t> enable row level security;
revoke all on table public.<t> from anon, authenticated;
```

Same migration as the `create table`. No policies for `anon`/`authenticated`. Views: `with (security_invoker = true)` and revoke. Functions: `security definer` only with a pinned `search_path` and a comment; revoke `execute` from `anon, authenticated`. The app uses the **secret key** from `src/server/db.ts` only. Storage: one private bucket (`cv_files` rows point into it), signed URLs ≤ 300 s created server-side, path `<kind>/<uuid>/<filename>`. Add a lock-down case to `supabase/tests/rls.db.test.ts` for every new table.

## Model notes

- `candidate_profiles`: `parsed jsonb` and `overrides jsonb` stay separate; effective profile = parsed merged with overrides (overrides win), implemented in `src/server/cv`. In the MVP, recruiters fill the profile (status `not_yet_parsed`).
- `job_versions` are immutable; `jobs.current_version_id` points at the latest.
- `stage_events` is append-only with `recruiter_name not null`; `settings_log` likewise.
- `cv_files`: `source`, `source_ref` (blob pathname) and `source_hash` give idempotent seeding. **Never store the public blob URL.**
- **Dormant AI tables** (`embeddings`, `match_scores`, `ai_runs`, `rescore_runs`, `vector` extension) exist from early migrations. Don't read or write them from app code. Removal is an open ADR-0002 question.
- Consent/retention columns on `candidates` exist but stay unused until the real-data release.

## Working days and delay status

`sg_public_holidays(date, name)`; `sg_working_days_between` and `sg_add_working_days` count Mon–Fri minus holidays on Asia/Singapore dates. `resolve_stage_limit` picks job, else client, else default. `pipeline_status` view exposes `on_track | due_soon | overdue` (due soon at ≥ 80% of limit), `placements_guarantee_flag` view flags 5 working days before guarantee end. **Views, not cron.** The TS mirror (`src/lib/working-days.ts`, `stage-limits.ts`) must agree with SQL; share test cases.

## Search

PGroonga (`&@~`) over `candidate_search_text`; `searchable_candidates` view; `search_candidates(filters jsonb, keyword text, lim int, off int)` is keyword + filters only. See `talent-search`.

## Seed (`npm run seed`, `scripts/seed/`)

Env only: Supabase secret key, `BLOB_READ_WRITE_TOKEN` (for `list()`), `SEED_BLOB_BASE_URL`. Download public URLs without a token, never `put/copy/del`. Re-upload to the private bucket. Idempotent upsert on `cv_files.source_ref`; `--reset` truncates in dependency order. Back-date pipeline entries relative to today so all delay statuses show. Never commit downloaded files. `src/**` never imports `@vercel/blob`. Details: `prd-context/references/sample-data.md`.

## Don't

Create policies for anon/authenticated; use the Supabase client in the browser; log CV text; add `pg_cron` or Vercel cron for delay status.
