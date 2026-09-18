---
name: supabase-db
description: >
  Supabase/Postgres rules for URecruitment: migrations with the Supabase CLI, the 17-table model,
  RLS on every table with no public policies, private Storage + signed URLs, pgvector and PGroonga,
  security-invoker views (delay status), SG working-day SQL, generated types, and the idempotent
  seed that pulls sample CVs from the public Vercel Blob store. Use for any schema, migration, query, view,
  function, storage or seed change.
---

# Supabase & database

The table list and invariants are in `prd-context` → `references/data-model.md`. This skill covers **how** to build them.

## Environments

- **Two Supabase Free projects:** `dev` (local dev + Vercel previews + CI) and `prod`. Both are in **`ap-southeast-1`**.
- **Local development** uses `supabase start` (requires Docker).
- Only CI and the release process apply migrations to remote projects. Agents never do.
- Free-tier limits: 500 MB database, 1 GB storage, 50 MB per file, and the project **pauses after 1 week idle**.

## Migrations

- **Create:** `npx supabase migration new <snake_case_name>`. **Never edit a migration that has been merged.** Add a new one.
- **One concern per migration.** Each must be re-runnable on a fresh database, and `supabase db reset` must succeed.
- **Conventions:**
  - `snake_case` names.
  - `id uuid primary key default gen_random_uuid()`.
  - `created_at timestamptz not null default now()`, and `updated_at` where rows change.
  - `timestamptz` everywhere; store UTC.
  - Enums as Postgres `enum` or a `check` constraint, documented in the migration.
  - Foreign keys use explicit `on delete` behaviour.
- **Regenerate types** after every schema change: `npm run db:types`
  (`supabase gen types typescript --local > src/lib/database.types.ts`).
  The generated file lives in **`src/lib`**, not `src/server`: every module under `src/server`
  must begin `import "server-only"` and a generated file cannot keep that marker across
  regenerations. The types are pure type declarations with no runtime, so they erase at compile
  time and cannot reach a client bundle. Fixed in #87.

## Security (hard rules)

```sql
alter table public.<t> enable row level security;
-- No policies for anon/authenticated. The publishable key must read nothing.
revoke all on table public.<t> from anon, authenticated;
```

- **Every new table** gets both statements in the **same migration** that creates it.
- **Views** use `with (security_invoker = true)`. Revoke them from `anon, authenticated` too.
- **Functions:** `security definer` only with a pinned `search_path` and a comment explaining why. Revoke `execute` from `anon, authenticated`.
- **Server-only client.** The app connects with the **secret key**, from `src/server/db` only. The secret key bypasses RLS, which is exactly why it must never leave the server.
- **Storage:**
  - One **private** bucket for CVs and JDs (e.g. `cv-files`), with no public policies.
  - Files open only through `createSignedUrl(path, <= 300 s)` generated on the server.
  - File size ≤ 50 MB. Path: `<kind>/<uuid>/<original-filename>`.
- **Required test:** with the publishable key, `select` on each table returns an error or 0 rows. Add a check for each new table.

## Model notes

- **`candidate_profiles`:** keep `parsed jsonb` (AI output) and `overrides jsonb` (recruiter edits) **separately**. The effective profile = parsed merged with overrides (overrides win). Re-parsing writes only `parsed`.
- **`match_scores`:** the unique key is `(candidate_id, job_version_id, model_version)`. Queries always filter by the job's **current** version and the active model version.
- **`job_versions`:** immutable rows. `jobs.current_version_id` points to the latest.
- **`stage_events`:** append-only, `recruiter_name text not null`. **`settings_log`** has the same shape for settings.
- **`ai_runs`:**
  - input reference (+ hash), step, provider, model id, model version, prompt version, output jsonb, status, error, token counts, cost, duration, timestamps;
  - **no secrets**.
- **`cv_files`:**
  - `source` (`seed-blob` in the MVP);
  - `source_ref` (the blob `pathname`, e.g. `Elaine Koh CV.pdf`) and `source_hash` (SHA-256 of the bytes), together giving idempotent seeding;
  - `storage_path` (the private Supabase Storage copy);
  - `doc_kind` (`cv`/`jd`), `parse_status`, `parse_error`, `language`.
  - **Never store the public blob URL.**
- **Consent and retention columns** on `candidates` (consent status/date/method, last activity) exist from the start, but stay unused until the real-data release.

## Search extensions

```sql
create extension if not exists vector;
create extension if not exists pgroonga;
```

- **pgvector:** the dimension depends on the embedding model, and **the provider isn't chosen**. The embedding task fixes the dimension and stores the `model` column next to each vector. Use an HNSW index with `vector_cosine_ops`.
- **PGroonga:** index the searchable text (profile summary, skills, titles) with `using pgroonga`, which covers EN and Simplified Chinese keywords. Query with `&@~`.
- **Hybrid search:** one SQL function combines the filters, the PGroonga score and the vector distance (see `talent-search`).

## Working days and delay status

- **`sg_public_holidays(date primary key, name)`.**
- **`sg_working_days_between(from timestamptz, to timestamptz) returns int`:**
  - counts Mon–Fri minus holidays, using **Asia/Singapore local dates**;
  - is `stable` and unit-tested with pgTAP or through the app's integration tests.
- **The limit resolver** picks the job-level limit, else the client's, else the default (`stage_limits.scope in ('default','client','job')`).
- **The delay view** (e.g. `pipeline_status`) exposes: entry, stage, waiting_on, limit_days, used_days, `status in ('on_track','due_soon','overdue')`, days_over, client, job, owner.
  - Due soon: `used / limit >= 0.8`.
  - End states and Placed have `status = null`.
  - **Keep it a view, not a cron.**
- **The TS mirror** in `src/lib` must agree with the SQL. Share the test cases.

## Seed (`npm run seed`)

The rules are in `prd-context` → `references/sample-data.md`. Mechanics:

- **Script:** a TypeScript script under `supabase/seed/`. It runs locally or in CI with everything **from env**:
  - the Supabase secret key;
  - `BLOB_READ_WRITE_TOKEN`, used only for `list()` on the sample-data store;
  - `SEED_BLOB_BASE_URL`, used to check that listed URLs belong to the expected store.
- **Downloads** use the public blob URLs, with no token. **Never** `put`, `copy` or `del` on the store.
- **Blob is the source only.** Every file is re-uploaded to the private Supabase Storage bucket, and the app reads it only from there.
- **Uses the app's own services** (parser, embeddings, matcher, gap check). Never a separate code path.
- **Idempotent:** upsert on `cv_files.source_ref` and the job natural keys. `--reset` truncates the seeded tables in dependency order first.
- **Back-dated pipeline entries:** use explicit, documented offsets so all three delay statuses appear. Recompute them relative to "today" on each run.
- **Prints a report:** CVs by language, rejected files with reasons, jobs, scores created, and the AI cost.
- **Never commits** downloaded files. Use a temp directory.

## Don't

- Don't create policies granting `anon` or `authenticated` anything.
- Don't use the Supabase JS client in the browser.
- Don't store CV text in logs or `ai_runs.error`.
- Don't add scheduled jobs (`pg_cron`, Vercel cron) for delay status.
