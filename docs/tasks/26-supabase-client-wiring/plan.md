# Plan — #26 Supabase dev and prod projects are wired to the app

Spec: [spec.md](./spec.md) · Branch: `feat/26-supabase-client-wiring` ·
Base: `feat/25-app-scaffold-foundation` ([PR #191](https://github.com/dczii/URecruitment/pull/191)) ·
Created: 2026-09-18

## Approach

Two tasks, in dependency order, one commit each.

1. **#87 — the place schema goes.** `supabase init` (no Docker needed), an empty `migrations/`
   folder, the `db:types` script, a committed empty-schema types file, a separate Vitest config for
   the DB layer, and a README section. #85 shipped `test:db` as a stub that printed a message; this
   replaces it with a real runner that reports zero tests.
2. **#88 — the one way in, test-first.** `src/server/db.ts` holding the secret key, proved shut from
   the browser three independent ways: the `server-only` marker (build-time), a unit test on the
   module's source, and a grep over the built client bundle wired into `npm run build`.

The third proof matters because the first two can both be satisfied by a file that still leaks: the
`server-only` marker stops a client component *importing* the module, but not a Server Component
reading the secret and passing it down as a prop. That value lands in the RSC flight payload and the
prerendered HTML, so the check reads `.next/server/app` as well as `.next/static`.

**Rejected:**

- *Generating types from the remote project* (`supabase gen types --project-id`). `supabase-db` says
  agents never touch remote projects, and that project is in the wrong region anyway (spec A7).
- *Putting the generated types under `src/server/`.* The `server-only` marker test from #85 walks
  that whole directory, and the generator rewrites its output file every run (spec A2).
- *Grepping the bundle for the live secret value.* No value is set in this repo, so it would pass
  vacuously (spec A6).
- *Waiting for #193.* Both tasks are local-only; the remote project's region blocks nothing here.

## Skills in scope

- `prd-context`: required. Region, free-tier limits, the no-sign-in threat model.
- `testing`: required. The DB layer's location and command, the RLS lock-down test, test-first for
  logic, no network in unit tests.
- `github-workflow`: required. Branch, commits, stacked PR, board.
- `supabase-db`: the migrations folder, `snake_case`, type regeneration, the RLS lock-down rule, the
  server-only client with the secret key, "agents never apply migrations remotely".
- `nextjs-app`: rule 1 (`import "server-only"` in every `src/server/**` file, the browser never
  talks to Supabase), rule 7 (the env module split, never `NEXT_PUBLIC_` a secret).
- `security-check`: §Data access (Supabase called only from `src/server/**`, RLS lock-down test
  covers every new table), §Secrets (no `NEXT_PUBLIC_` on the secret key; no value committed),
  §Dependencies (new deps listed in the plan).
- `compliance-review`: the region finding (spec A7) is a PDPA overseas-transfer concern once real
  CVs arrive; it is recorded in #193, not silently accepted.
- `release-deploy`: agents never create, delete or reconfigure remote projects.

## Files

| File | Change |
|---|---|
| `supabase/config.toml` | new — `supabase init` output, project id `urecruitment` |
| `supabase/migrations/.gitkeep` | new — the folder E03 fills |
| `supabase/tests/rls.db.test.ts` | new — the RLS lock-down harness against a live stack (zero tables today) |
| `supabase/migration-lint.ts` | new — pure lint for migration SQL (added at review; see Outcome) |
| `supabase/migration-lint.test.ts` | new — the lint's rules, tested against fixture SQL both ways |
| `supabase/migrations.test.ts` | new — applies the lint to the committed migrations |
| `supabase/.gitignore` | new — `supabase init` output |
| `src/lib/database.types.ts` | new — committed empty-schema generator output (spec A2, A3) |
| `src/lib/database.types.test.ts` | new — AC5: the file exports `Database` and typechecks |
| `vitest.db.config.ts` | new — DB layer config, `passWithNoTests: true` |
| `src/server/db.ts` | new — `import "server-only"`, typed, secret key, process-level singleton |
| `src/server/db.test.ts` | new — AC2/AC7/AC9, test-first |
| `scripts/check-client-bundle.mjs` | new — AC8, greps `.next/static` **and** `.next/server/app` (the RSC payload and prerendered HTML) |
| `scripts/check-client-bundle.test.ts` | new — AC8, proves the check catches a planted secret |
| `package.json` | modify — add `db:types`, replace the `test:db` stub, run the bundle check after `build` |
| `vitest.config.ts` | modify — run `supabase/*.test.ts` in the unit layer, exclude `supabase/tests/**` (the DB layer) |
| `README.md` | new or modify — the DB section (#87) |

## Dependencies

- **`@supabase/supabase-js`** — the only new **runtime** dependency. It is the client `supabase-db`
  assumes throughout.
- **`postgres`** (devDependency, added during review) — a direct Postgres connection for the RLS
  harness's table discovery. `information_schema` is not exposed through PostgREST, and asking
  PostgREST what the *publishable* key can see is self-defeating: a correctly revoked table
  disappears from that view, so the harness would find nothing and pass vacuously. Test-only; it
  never ships to Vercel.
- **`supabase` CLI** — already installed on this machine (2.106.0, Homebrew). **Not** added to
  `package.json`: it is a developer tool, and adding it as a dependency would put a large binary in
  every install. The README names the version and how to install it. CI installs it itself (#91).
- **Env vars:** none new. `SUPABASE_URL` and `SUPABASE_SECRET_KEY` already exist in
  `src/server/env.ts` from #84 and in `.env.example` from #81. `SUPABASE_PUBLISHABLE_KEY` is read by
  the RLS test only, from the local stack, and is already in the inventory as a test-only name.
- **Migrations:** none. E03 adds the first.

## Steps

- [x] **S1** `claude` — `supabase init` and the folder skeleton.
  - Run `supabase init` (no Docker required), keep `supabase/config.toml`, add
    `supabase/migrations/.gitkeep`, and check `.gitignore` covers `supabase/.branches` and
    `supabase/.temp` (it already does).
  - Verify: `supabase/config.toml` exists; `git status` shows nothing unexpected.
- [x] **S2** `grok` — #87 test tooling and types.
  - Rules: `testing` §Layers (DB tests are `src/**/*.db.test.ts` and `supabase/tests/*.db.test.ts`,
    command `npm run test:db`, local stack only, never a remote project); `supabase-db`
    §Migrations (regenerate types after every schema change) and §Security (the RLS lock-down test
    covers every table); `nextjs-app` rule 1.
  - Files: `vitest.db.config.ts`, `src/lib/database.types.ts`, `src/lib/database.types.test.ts`,
    `supabase/tests/rls.db.test.ts`, `vitest.config.ts`, `package.json`, `README.md`.
  - Verify: `npm run typecheck`, `npm test`, `npm run test:db` (must exit 0 with zero tests).
- [x] **S3a** `grok` — #88 failing tests only (AC2, AC7, AC9).
  - Write `src/server/db.test.ts` and `scripts/check-client-bundle.test.ts`. **No implementation.**
  - Verify: `npm test` → both fail on the missing modules, not on a syntax error. Checked by Claude.
- [x] **S3b** `grok` — #88 implementation until S3a is green.
  - Rules: `nextjs-app` rule 1 and rule 7; `security-check` §Data access and §Secrets; `supabase-db`
    §Security ("the app connects with the secret key, from `src/server/db` only. The secret key
    bypasses RLS, which is exactly why it must never leave the server").
  - Files: `src/server/db.ts`, `scripts/check-client-bundle.mjs`, `package.json`.
  - Verify: `npm test`, `npm run typecheck`, `npm run build`, `node scripts/check-client-bundle.mjs`.
- [x] **S4** `none` — Claude verification and review.
  - Full gate, the **live client-import build probe**, then `pr-review` plus `security-check` and
    `compliance-review` on an Opus subagent.

**Executor note (spec A12 of #25, still in force):** no `cursor-agent` step may run
`npm run test:e2e`; Playwright's Chromium segfaults in that sandbox. Claude runs e2e itself.

## Test plan

| AC | Test or manual evidence | Type |
|---|---|---|
| AC1 | `src/lib/database.types.test.ts` + `npm run typecheck`; the stack round trip is CI (#91) — **no local proof possible**, spec A3 | unit + deferred |
| AC2 | `src/server/db.test.ts › "AC2: the db module is server-only"` + the live build probe | unit + manual |
| AC3 | `supabase/tests/rls.db.test.ts` — enumerates `public` tables and asserts each reads zero rows. **Zero tables today**, spec A5 | DB (deferred to E03) |
| AC4 | `supabase/config.toml` committed; `supabase --version` recorded | manual |
| AC5 | `src/lib/database.types.test.ts` + `npm run typecheck` | unit |
| AC6 | `npm run test:db` exits 0 reporting zero tests | command |
| AC7 | `src/server/db.test.ts` (test-first: S3a red, S3b green) + the build probe | unit + manual |
| AC8 | `scripts/check-client-bundle.test.ts` (plants a secret in a fixture bundle, asserts a non-zero exit) + `npm run build` running the check | unit + command |
| AC9 | `src/server/db.test.ts` asserts the `Database` generic; `npm run typecheck` | unit |

## Verification

```
npm run lint
npm run typecheck
npm test
npm run build              # now also runs scripts/check-client-bundle.mjs
npm run test:db            # zero tests, exit 0
npm run test:e2e           # unchanged by this story; run to prove no regression
node scripts/check-client-bundle.mjs
npm audit --omit=dev
# live probe: a client component importing @/server/db must fail npm run build
```

## Risks & rollback

- **Risk: no Docker here**, so the local-stack half of #87 is unproven on this machine. Mitigated by
  committing the empty-schema types, keeping the command in the README, and leaving the round trip to
  CI (#91). Stated plainly in the PR rather than implied.
- **Risk: the bundle check passes vacuously.** Mitigated by unit-testing the checker against a
  fixture bundle that does contain a secret (spec A6).
- **Risk: the RLS harness lulls a reviewer** into thinking lock-down is proved. Mitigated by the test
  failing loudly when the publishable key is absent, and by saying in the spec and the PR that it
  covers zero tables today.
- **Rollback:** revert the branch. Nothing remote was touched.

## Outcome

- **Shipped:** `supabase init` (project `urecruitment`, Postgres 17), an empty `supabase/migrations/`,
  `npm run db:types`, a committed empty-schema `src/lib/database.types.ts`, a real DB test layer, and
  `src/server/db.ts` — the one server-only, typed, secret-key Supabase client — plus a client-bundle
  leak check wired into `npm run build`.
- **Tests:** 90 unit tests in 13 files (52 after #87, 64 after #88, 90 after the review fixes), plus
  the DB layer which reports zero tests until E03 adds a table, plus 8 unchanged e2e tests.
- **Verification (Claude, Node 22.12.0):** `lint`, `typecheck`, `npm test` 90 passed, `build` (with
  the leak check), `test:db` exit 0 zero tests, `test:e2e` 8 passed, `npm audit --omit=dev` clean.
  Live probes: a client component importing `@/server/db` fails the build; a secret planted in a real
  `.next/static` chunk **and** in a real `.rsc` payload is caught and exits 1; a bad migration is
  rejected by the lint.
- **Deviations:**
  1. `postgres` added as a devDependency (see Dependencies).
  2. `supabase/migration-lint.ts`, `migration-lint.test.ts` and `migrations.test.ts` added beyond the
     planned files, with `vitest.config.ts` adjusted so `supabase/*.test.ts` runs in the **unit**
     layer while `supabase/tests/**` stays in the DB layer.
  3. Generated types live in `src/lib/database.types.ts` (spec A2). The `supabase-db` skill said
     `src/server/db/types.ts`; **the skill has been corrected in this PR** rather than left as a
     follow-up, because the next task to read it would otherwise repeat the mistake.
  4. `[auth]` disabled in `supabase/config.toml` alongside `[inbucket]` — the MVP has no sign-in.
  5. Claude ran `npm run test:e2e`, not the executor (#25 spec A12).
- **Fix rounds / escalations:** no executor fix rounds, no escalations. Claude made the review fixes
  directly (`urec-orchestrator` Step 8 allows either), because they are surgical changes to the
  security controls themselves.
- **Models used:**
  - Planning, prompts, inspection, verification, review fixes, PR: **Claude Opus 5** (`claude-opus-5`).
  - S2, S3a, S3b: **`cursor-grok-4.6-high`** via `cursor-agent` (confirmed in each
    `.orchestrator/26-supabase-client-wiring/S*.log` header).
  - S1 (`supabase init`): Claude Opus 5.
  - Review: a Claude subagent on the `opus` alias; the runtime does not expose the exact ID.
- **Review findings:** see the PR body. Verdict was CHANGES REQUIRED with no blockers; all three
  majors and the documentation findings are fixed here.
- **Follow-ups:** #193 (Supabase region), #91 (CI runs the stack so AC1/AC3/AC4 are proved somewhere),
  and `.env.example` may need `SUPABASE_DB_URL` if #91 sets it explicitly.
