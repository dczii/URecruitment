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
