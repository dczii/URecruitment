# URecruitment

AI-assisted recruitment portal. Stack, commands and product rules live in `CLAUDE.md`.

## Database

Local development uses the Supabase CLI against Docker. Agents and developers never apply migrations to a remote project; only CI and the release process do.

**Prerequisites**

- Docker
- [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) **2.106.0** (`supabase --version`)

**Commands**

```bash
supabase start       # local stack (API on :54321, Postgres on :54322)
supabase db reset    # replay migrations from scratch on the local stack
npm run db:types     # regenerate src/lib/database.types.ts from the local schema
npm run test:db      # DB integration tests against the local stack
```

Before `npm run test:db`, export the three values `supabase status` prints:

```bash
export SUPABASE_DB_URL=...          # DB URL — used to list tables from information_schema
export SUPABASE_URL=...             # API URL
export SUPABASE_PUBLISHABLE_KEY=... # the key that must read nothing
```

`SUPABASE_DB_URL` defaults to the local stack (`postgresql://postgres:postgres@127.0.0.1:54322/postgres`), so it can be left unset on a default `supabase start`. With **none** of the three set, `npm run test:db` reports zero tests and exits 0; with **any** of them set it fails loudly rather than skipping, so a half-configured stack can never look like a pass.

Two tests enforce the RLS lock-down, and both matter:

| Test | Needs Docker? | Runs on |
|---|---|---|
| `supabase/migrations.test.ts` | no | every PR (`npm test`) — reads the migration SQL and fails any `create table` that does not also enable RLS and revoke from `anon, authenticated` |
| `supabase/tests/rls.db.test.ts` | yes | `npm run test:db` — proves it against a live stack with the publishable key |

## Demo data

Every screen reads from Supabase, so a fresh database shows empty pages. `seed:demo` writes fictional rows covering all of them — clients, jobs with versions and gap flags, candidates with parsed profiles and skills, pipeline entries at every stage, match scores, placements, `ai_runs` and a settings log.

```bash
npm run seed:demo:check   # report how many rows each table already has
npm run seed:demo         # write (or refresh) the demo rows
npm run seed:demo -- --reset   # delete the demo rows first, then rewrite them
```

It needs only `SUPABASE_URL` and `SUPABASE_SECRET_KEY` (read from `.env.local` if present) — no AI provider and no Blob token. Set `AI_MODEL_MATCH` too: match scores are keyed to the match model version, so without it the app reads every seeded score as stale.

Notes:

- Every row has a fixed id and is upserted, so re-running converges rather than duplicating.
- Pipeline entries are back-dated in Singapore working days against the seeded stage limits, so `pipeline_status` shows on-track, due-soon and overdue rows on whichever day the seed runs; the two placements show one guarantee ending soon and one ended.
- The stage limits it writes are **demo values**, not the PRD's — the per-stage table is still an open item (ADR-0002 D3).
- No CV files are uploaded to Storage, so the CV links on candidate pages have nothing behind them. Embeddings are not seeded either (the vector dimension is undecided), so talent search matches on keywords only.
- This is not the sample-data seed described in the `supabase-db` skill: that one lists the Vercel Blob store and runs the real parser and matcher, and arrives with the AI provider decision.
- Every person, client and employer in it is invented (CLAUDE.md hard rule 6).
