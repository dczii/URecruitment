# Spec — #26 Supabase dev and prod projects are wired to the app

| | |
|---|---|
| Issue | https://github.com/dczii/URecruitment/issues/26 (Story) |
| Tasks | #87 (E01-S02-T01), #88 (E01-S02-T02), in dependency order |
| Parent | Story #26 → Epic #2 "Foundation & delivery" |
| Milestone | MVP |
| Branch | `feat/26-supabase-client-wiring`, stacked on `feat/25-app-scaffold-foundation` ([PR #191](https://github.com/dczii/URecruitment/pull/191)) |
| Created | 2026-09-18 |
| Status | In review <!-- Planned → In progress → In review --> |

## Problem

The scaffold from #25 has no database. Before any schema work in E03 can start, the repository needs
the place a migration goes, the command that regenerates types, and the one client the app is allowed
to reach Postgres through — with the boundary proven rather than asserted.

The boundary is the whole point. With **no sign-in in the MVP**, the server process is the only gate
([ADR-0001](../../decisions/adr-0001-architecture.md) D1). The secret key bypasses RLS, so a single
client-side import of the database client would hand the entire database to anyone with the URL.

## PRD references

| PRD section | Item | Status |
|---|---|---|
| Technical architecture → Backend | Supabase Postgres, Storage, Edge Functions if needed | **decided** |
| Technical architecture → Database region | `ap-southeast-1` | **decided** |
| Security (suggested) → 1 | The Supabase secret key lives only in Vercel env vars and never reaches the browser or the repo | **proposed** in the PRD, **binding** via `CLAUDE.md` hard rule 3 |
| Security (suggested) → 2 | RLS on every table with no public policies | **proposed** in the PRD, **binding** via `CLAUDE.md` hard rule 3 |
| Environments & delivery | Supabase Free allows 2 active projects: dev/preview and prod | **suggested** |
| Free-tier limits | 500 MB database, 1 GB storage, 50 MB per file, pauses after a week idle | **decided** (facts) |

## Scope

**In scope**

- **#87:**
  - `supabase init` output — `supabase/config.toml` — and `supabase/migrations/` with a `.gitkeep`;
  - `npm run db:types`, regenerating `src/lib/database.types.ts` from the local stack;
  - a committed `src/lib/database.types.ts` for the current (empty) schema, so the repo typechecks;
  - `vitest.db.config.ts` and a real `npm run test:db`, replacing #85's stub, matching
    `src/**/*.db.test.ts` and `supabase/tests/*.db.test.ts`;
  - a `README.md` section: start the stack, apply migrations, regenerate types, run the DB tests.
- **#88:**
  - `src/server/db.ts` — `import "server-only"`, typed from `Database`, holding the **secret key**;
  - failing tests first, then passing: the module is server-only, it is a process-level singleton
    (one client per serverless instance, safe only because it carries no per-request state), and it
    never reads a `NEXT_PUBLIC_*` variable;
  - `scripts/check-client-bundle.mjs`, which greps the built client bundle for the server env var
    **names** and any secret-shaped value, wired into `npm run build`;
  - a DB integration test file proving the **RLS lock-down** shape, which reports zero tests until
    E03 adds a table.

**Out of scope**

- Any table, policy, view, function or migration — that is **E03**.
- A Storage bucket or signed-URL helper (E03-S02-T01).
- Linking to, or applying anything against, a **remote** Supabase project. `supabase-db`: *"Only CI
  and the release process apply migrations to remote projects. Agents never do."*
- Creating or moving the Supabase projects themselves — see **#193**, which is a human step.
- Seeding (E03-S04) and CI workflow YAML (#91, story #27).

## Acceptance criteria

Story ACs (#26):

- [ ] **AC1** — Given Docker is running, when I run `supabase start` and `npm run db:types`, then the
  local stack comes up and generated database types are written to `src/lib/database.types.ts`.
  _Proved by:_ the committed types file plus `npm run typecheck`; **the stack itself cannot run on
  this machine** (Assumption A3) so the round trip is proved in CI by #91.
- [x] **AC2** — Given any client component, when it imports the Supabase client, then the build fails.
  _Proved by:_ `src/server/db.test.ts › "AC2: the db module is server-only"` plus a **live build
  probe** recorded in the verification log.
- [ ] **AC3** — Given the publishable key, when it is used against any table, then it reads nothing,
  because RLS is on with no public policies. _Proved by:_ two tests that cover different moments.
  `supabase/migrations.test.ts` needs no Docker and runs on every pull request: it lints the migration
  SQL and rejects any `create table` without both `enable row level security` and
  `revoke all … from anon, authenticated`, any `create policy` that reaches `anon`, `authenticated` or
  the PUBLIC default, any later `disable row level security`, and any view without `security_invoker`.
  `supabase/tests/rls.db.test.ts` proves it against a live stack, asserting
  `has_table_privilege` is false for **both** roles and that the publishable key reads nothing over
  HTTP. **Neither asserts anything today, because no table exists** (Assumption A5); the lint's rules
  are themselves tested against fixture SQL in `supabase/migration-lint.test.ts`.

Task done-when:

- [ ] **AC4** (#87) — The local stack starts and `supabase migration list` runs clean on an empty
  migrations folder. _Proved by:_ `supabase/config.toml` committed and `supabase --version`
  recorded; the stack is a CI step (#91).
- [x] **AC5** (#87) — Type generation produces a committed `database.types.ts` that typechecks.
  _Proved by:_ `npm run typecheck` and `src/lib/database.types.test.ts`.
- [x] **AC6** (#87) — `npm run test:db` runs and reports **zero tests rather than failing**.
  _Proved by:_ the command's exit code in the verification log.
- [x] **AC7** (#88) — Failing-then-passing tests prove a client component cannot import the server
  client. _Proved by:_ `src/server/db.test.ts` plus the build probe.
- [x] **AC8** (#88) — A check over the production bundle finds no Supabase secret and is wired into
  `npm run build`. _Proved by:_ `scripts/check-client-bundle.mjs`, its unit test
  `scripts/check-client-bundle.test.ts` (which feeds it a bundle that *does* contain a secret and
  asserts it exits non-zero), and `npm run build` running it.
- [x] **AC9** (#88) — The client is typed against the generated database types. _Proved by:_
  `npm run typecheck` and an assertion in `src/server/db.test.ts`.

## Guardrails that apply

- [ ] AI only suggests — no AI code in this story.
- [x] **No email sent** — no mail library.
- [x] **Server-only data access; the secret key never reaches the browser** — `src/server/db.ts` is
  `server-only` and reads `serverEnv()`; the bundle check is a second, independent proof.
- [ ] **RLS everywhere with no public policies** — not yet applicable: no table exists yet, so there is nothing to
  enable RLS *on*. The lock-down **test harness** ships here so that E03 cannot add a table without
  it. Recorded honestly rather than ticked as done.
- [ ] AI output — no AI.
- [ ] Protected attributes — n/a, no scoring.
- [x] **UTC / SGT** — `supabase-db` requires `timestamptz` everywhere; no column exists yet.
- [ ] Typed name — n/a.
- [ ] Phone width — no UI change.
- [x] **Fictional data only; no secrets committed** — no value is committed; the bundle check exists
  precisely to catch one.
- [x] **Free-tier limits** — nothing here consumes quota. No remote project is touched.

## UX / design

None. This story adds no route, screen or component.

## Data / API changes

- New folder `supabase/` (`config.toml`, `migrations/.gitkeep`, `tests/`).
- New module `src/server/db.ts`. No query, table or policy.
- New scripts: `npm run db:types`, a real `npm run test:db`, and `scripts/check-client-bundle.mjs`
  invoked from `npm run build`.

## Assumptions

- **A1 — One PR for the story, stacked on #25** (user instruction, 2026-09-18). The branch is cut from
  `feat/25-app-scaffold-foundation`, not `main`, because #87 needs #83's `package.json` and #88 needs
  #84's `src/server/env.ts`. Merge order: **#190 → #191 → this**. One commit per task, and the PR
  closes #87, #88 and #26. This deviates from `urec-orchestrator`'s "one Task, one PR"; the user chose
  the story-level shape and it is stated in the PR body.
- **A2 — Generated types live in `src/lib/database.types.ts`, not `src/server/db/types.ts`.** The
  `supabase-db` skill suggests the latter, but #85 shipped
  `src/server/scaffold.test.ts › "every module under src/server starts with import \"server-only\""`,
  which walks the whole directory. A generated file cannot carry that marker: the generator rewrites
  the file on every run and would drop it, breaking the build on the next `npm run db:types`. The
  types are pure type declarations with no runtime, so they are safe anywhere. Issue #87 already names
  `src/lib/database.types.ts`; the issue wins and the skill should be updated (follow-up).
- **A3 — Docker is not installed on this machine**, so `supabase start`, `supabase db reset` and
  `supabase gen types --local` cannot run here. `supabase init` does not need Docker and was run. The
  committed `database.types.ts` is the canonical **empty-schema** generator output, which typechecks
  and is replaced wholesale the first time E03 runs `npm run db:types` against a real stack. The
  round trip is verified in CI by #91 (story #27). Stated in the PR rather than implied.
- **A4 — `npm run test:db` uses `passWithNoTests`.** #87's done-when asks for "zero tests rather than
  failing", which is exactly that flag. It is scoped to the DB config only; the unit config keeps
  `passWithNoTests: false` so an empty unit run still fails loudly.
- **A5 — The lock-down guarantee is split in two, and neither asserts anything until E03.** That is
  deliberate: `supabase-db` requires the check "for each new table", and a harness that already exists
  is much harder to skip than one E03 has to remember to write.
  - `supabase/migrations.test.ts` + `supabase/migration-lint.ts` are a **unit** test. They read the
    migration SQL, need no Docker, and therefore run on every pull request — which is where the
    mistake is cheapest to catch. The lint's own rules are exercised against fixture SQL in
    `supabase/migration-lint.test.ts`, covering both directions: valid lock-down is accepted (quoted
    schema, either role order, a `grant` to a non-locked role, one revoke covering several tables)
    and real escapes are rejected (a policy with no `to` clause, which defaults to PUBLIC;
    `disable row level security`; `unlogged`/`foreign`/`temporary` tables).
  - `supabase/tests/rls.db.test.ts` proves it against a live stack.
  **The DB harness skips on stack *reachability*, never on which env vars are set.** An earlier
  version keyed off env vars, so `supabase start && npm run test:db` without exporting them reported
  "no tests" and exited 0 even with unprotected tables on the running stack. It now always attempts
  the local connection: a refused connection means no stack (zero tests, exit 0, satisfying AC6),
  any other error fails loudly, and a non-local host is refused outright.
- **A6 — The bundle check greps for variable *names* and secret *shapes*, not for the live value.**
  A build has no secret set in this repo, so grepping for the real value would pass vacuously. The
  check looks for `SUPABASE_SECRET_KEY`, `SUPABASE_URL`, `SUPABASE_JWT_SECRET`,
  `SUPABASE_SERVICE_ROLE_KEY` and `sb_secret_`-shaped strings in `.next/static`, and it is unit-tested
  against a fixture bundle that does contain one, so the check itself cannot rot silently.
- **A7 — The remote Supabase project is in the wrong region and this story does not fix it.** The
  project the Vercel integration provisioned sits in **East US (North Virginia)**, not
  `ap-southeast-1`, which `prd-context` marks **decided**. A Supabase region cannot be changed after
  creation. Both of #26's tasks are local-only by design, so nothing here is blocked, and nothing
  here writes to that project. Recreating it is **#193**, assigned to the repository owner because
  `release-deploy` forbids agents acting on remote infrastructure. Nothing has been built on it yet —
  no migration, table, bucket or row — so the cost of moving is at its lowest right now.
- **A8 — The Vercel integration injected `NEXT_PUBLIC_SUPABASE_*` variables the app must not use.**
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are set in Vercel Preview and Production. They are not
  secrets — the anon key is designed to be public and RLS is what protects it — but they contradict
  [ADR-0001](../../decisions/adr-0001-architecture.md) D3. This story's defence is in code: `src/lib/env.ts`
  does not declare them, `src/server/db.ts` reads only `serverEnv()`, and a unit test asserts the db
  module never mentions `NEXT_PUBLIC`. Removing them from Vercel is part of **#193**.

## Open questions

- None new. The **which-paid-plan** and **backups** questions (`prd-context` open items 2 and 3) stay
  open and are untouched here.
