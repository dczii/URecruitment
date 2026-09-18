# Spec — #27 Every pull request runs the CI checks

| | |
|---|---|
| Issue | https://github.com/dczii/URecruitment/issues/27 (Story) |
| Tasks | #89 (E01-S03-T01), #91 (E01-S03-T03), #90 (E01-S03-T02), in dependency order |
| Parent | Story #27 → Epic #2 "Foundation & delivery" |
| Milestone | MVP |
| Branch | `feat/27-ci-pr-checks`, stacked on `feat/26-supabase-client-wiring` ([PR #194](https://github.com/dczii/URecruitment/pull/194)) |
| Created | 2026-09-18 |
| Status | In review <!-- Planned → In progress → In review --> |

## Problem

Every check that protects this repository runs only where someone remembers to run it. #25 and #26
shipped a lint, a typecheck, 90 unit tests, a build-time client-bundle leak check, a migration
lock-down lint and an RLS harness — and a reviewer today has no way to know any of them ran.

That matters more here than in most repositories, because two of those checks are the **only**
enforcement of hard rules: `scripts/check-client-bundle.mjs` is what stops the Supabase secret key
reaching a browser, and `supabase/migrations.test.ts` is what stops E03 adding a table without RLS.
A guard that runs only on a developer's laptop is a guard that will eventually not run.

## PRD references

| PRD section | Item | Status |
|---|---|---|
| Environments & delivery (suggested) → CI | CI applies migrations with the Supabase CLI and runs the tests and the AI quality script | **suggested** (→ **proposed** in this repo's vocabulary) |
| Non-functional requirements → Testing | Vitest, Playwright, AI quality script | **proposed** |
| Environments & delivery | Every pull request gets a Vercel preview deployment; `main` deploys to production | **suggested** |
| Technical architecture → Hosting | Vercel functions in `sin1` | **decided** |

## Scope

**In scope**

- **#89 — `.github/workflows/pr-checks.yml`:** `pull_request` and `push: main`; Node from `.nvmrc`;
  `npm ci` with the npm cache; lint → typecheck → unit tests → build; `permissions: contents: read`;
  a concurrency group that cancels superseded runs; a job summary. No secret.
- **#91 — `.github/workflows/db.yml`:** path-filtered on `supabase/**` and `src/server/db*`; starts
  an ephemeral local Supabase; applies every migration from scratch (`supabase db reset`); exports
  the stack's values and runs `npm run test:db`; and checks the **committed generated types match
  the schema**, which is the half of #87 that no machine had yet proved.
- **#90 — `.github/workflows/e2e.yml`:** `deployment_status` on **Preview** deployments only; both
  Playwright projects against `deployment_status.target_url`; the report uploaded as an artifact on
  failure only; skips with a `::notice::` when there is no preview **or no bypass secret**. A
  Playwright global setup (`e2e/global-setup.ts`) swaps the bypass secret for Vercel's cookie so no
  test sends the secret.

**Out of scope**

- `eval.yml` (#174) and `migrate.yml` — the release workflow (E12-S01-T01).
- Writing product e2e tests; feature tasks own those.
- Applying migrations to any **remote** project. `supabase-db`: *"Only CI and the release process
  apply migrations to remote projects. Agents never do."* — and nothing here reaches one.
- Enabling branch protection or required checks. `ci-setup`: *"Agents don't change repo settings."*
  Recommended to the user instead.
- Creating any repository secret.

## Acceptance criteria

- [x] **AC1** — Given a pull request, when CI runs, then lint, typecheck, unit tests and build all
  report status on the PR. _Proved by:_ `checks` green on #196 at `f1c3e83`
  ([run 35295639869](https://github.com/dczii/URecruitment/actions/runs/35295639869)), about 1 minute, with no `.env.local` and no secrets.
- [x] **AC2** — Given a pull request that changes a migration, when CI runs, then the migrations are
  applied to an ephemeral local Supabase and the DB integration tests run. _Proved by:_ `db` green on
  #196 at `f1c3e83` ([run 35295639848](https://github.com/dczii/URecruitment/actions/runs/35295639848)). This was the first time the local stack ran
  anywhere (A2), and it surfaced four real defects that are fixed on this branch (A10–A12). With no
  tables yet the RLS harness registers zero tests, so its teeth are proved by the AC5 probe instead.
- [ ] **AC3** — Given a Vercel preview is ready, when the Playwright job runs, then it tests the
  preview URL at both desktop and phone width. _Proved by:_ the `e2e.yml` run. **It will skip on this
  PR** because previews are SSO-protected and no bypass secret exists (Assumption A3); the skip is
  itself AC4's evidence, and the job is proved end to end once the user adds the secret.
- [x] **AC4** — Given a workflow needs a secret, when it runs on a fork or without that secret, then
  the job is skipped with a clear message rather than failing. _Proved by:_ every `e2e` run on #196
  before the secret existed, e.g. [run 35294013637](https://github.com/dczii/URecruitment/actions/runs/35294013637): `##[notice]e2e skipped:
  VERCEL_AUTOMATION_BYPASS_SECRET is not set…`, job green. All three gate paths (no URL, no secret,
  ready) were also run locally against the extracted step script.
- [x] **AC5** (#91) — A deliberately broken migration fails the job. _Proved by:_ throwaway draft
  PR #197 (closed, branch deleted):
  - a table with no RLS and no revoke → `db` red: the RLS harness fails with *"anon holds SELECT on
    public.probe_unprotected"* and the types check fails on drift
    ([run 35295876235](https://github.com/dczii/URecruitment/actions/runs/35295876235)); `checks` red on the migration lint's `missing-rls` and
    `missing-revoke` ([run 35295876232](https://github.com/dczii/URecruitment/actions/runs/35295876232));
  - invalid SQL → `db` red at `supabase start`: *syntax error at or near "tabel"*
    ([run 35296140031](https://github.com/dczii/URecruitment/actions/runs/35296140031)).
- [x] **AC6** (#91) — CI proves the committed `src/lib/database.types.ts` matches the schema.
  _Proved by:_ the `db` step `npm run db:types:check` (`scripts/db-types.sh --check`: generates to a
  temp file, fails on an empty file, `diff -u` against the committed file). It failed on the
  hand-written #87 copy, then passed once the generated file was committed
  ([run 35295639848](https://github.com/dczii/URecruitment/actions/runs/35295639848)).
- [x] **AC7** (#89) — The workflow needs no repository secret and uses least-privilege permissions.
  _Proved by:_ `permissions: contents: read` and no `secrets.` reference in `pr-checks.yml`,
  `persist-credentials: false` on checkout, and the green run with an empty repository secret list.

## Guardrails that apply

- [ ] AI only suggests — no AI code; `eval.yml` is out of scope.
- [x] **No email sent** — no workflow sends mail; GitHub's own run notifications are a platform
  setting, not something this repo configures.
- [x] **Server-only data access; no secrets in the repo** — no secret value appears in any workflow;
  secrets are referenced by name only, and every job that needs one checks for it first.
- [x] **RLS everywhere with no public policies** — this is the story that makes #26's lock-down
  guards actually run on every pull request, which is the point of them existing.
- [ ] AI output — no AI.
- [ ] Protected attributes — n/a.
- [x] **UTC / SGT** — CI runs in UTC; the unit config already pins `TZ=UTC`.
- [ ] Typed name — n/a.
- [x] **Phone width** — `e2e.yml` runs both Playwright projects, so the 390 px overflow assertion
  runs in CI too, once a bypass secret exists.
- [x] **Fictional data only** — no data. The DB job starts an empty database and seeds nothing.
- [x] **Free-tier limits** — GitHub Actions on a public repository is free. The DB job is
  path-filtered so it does not run on every PR, and `pr-checks.yml` avoids Docker to stay fast.

## UX / design

None. No route, screen or component changes.

## Data / API changes

None. Three workflow files and one `package.json` script (`db:types:check`).

## Assumptions

- **A1 — One PR for the story, stacked on #26** (user instruction, 2026-09-18). Branch cut from
  `feat/26-supabase-client-wiring`, because `db.yml` runs `npm run test:db` and `npm run db:types`,
  both of which #26 introduced, and `pr-checks.yml` runs the build-time leak check from #88.
  Merge order: **#190 → #191 → #194 → this.** One commit per task; the PR closes #89, #90, #91 and
  the story.
- **A2 — This is the first time the local Supabase stack runs anywhere.** Docker is not installed on
  the development machine, so #26 shipped its stack-dependent halves unproven and said so. `db.yml`
  is where they are finally exercised: the `supabase start` round trip, the generated-types check,
  and the RLS harness against a real database. If any of them is wrong, this PR is where it surfaces
  — which is the point, and why #91 is sequenced before #90 rather than after.
- **A3 — `e2e.yml` skips on this PR, and that is the expected result.** Vercel Authentication is
  **on** for previews (verified: a preview URL answers `302 → vercel.com/sso-api`), so Playwright
  would hit a login page rather than the app. `VERCEL_AUTOMATION_BYPASS_SECRET` is the documented way
  through, and the repository has **no** Actions secrets set today. The job therefore checks for the
  secret, writes a `::notice::` and exits 0 — which is exactly what AC4 asks for. Adding the secret
  is a user step, recorded in the PR and on [#90](https://github.com/dczii/URecruitment/issues/90).
- **A4 — The workflow is `pr-checks.yml`, not the `ci.yml` the `ci-setup` skill sketches.** Issue #89
  names it, and `docs/plans/test-strategy.md` already resolved the clash in the task's favour:
  *"`ci-setup` sketches the PR workflow as `ci.yml`; the owning task #89 names it `pr-checks.yml`.
  The task's name wins."* The skill should be corrected (follow-up).
- **A5 — `actionlint` is not installed here**, and installing a system tool unasked is out of scope.
  YAML is validated by parsing it, and the real proof is the run itself: these workflows execute on
  this very pull request, and the run links go in the PR. That is stronger evidence than a linter.
- **A6 — Third-party actions are pinned to a commit SHA**, per `ci-setup`. First-party `actions/*`
  use major tags. The only third-party action needed is the Supabase CLI setup in `db.yml`.
- **A7 — Branch protection is recommended, not applied.** `ci-setup`: *"Agents don't change repo
  settings."* The PR lists the checks worth marking required once they are green on `main`.
- **A8 — Migrations are proved replayable from scratch, not idempotent.** #91 asks for a check that
  the set "applies cleanly twice in a row *where the project requires idempotency*". The project
  doesn't: `supabase-db` requires migrations to be *"re-runnable on a fresh database, and `supabase
  db reset` must succeed"*. A second `db reset` recreates the database, so it only replays what the
  first proved, and it was dropped after review. #91's "not reversible" can't be checked either,
  because Supabase migrations have no down step.
- **A9 — No traces against the preview (deviation from #90).** #90 asks for traces and the HTML
  report as failure artifacts. Traces record request headers and cookies, and artifacts on a public
  repository can be downloaded by anyone, so against a protected preview they would carry the bypass
  credential. `security-check` treats any secret exposure as blocking, so there the job keeps
  screenshots and the report. Traces are still on for local runs.
- **A10 — Supabase CLI 2.117.0 in CI.** 2.106.0 (the first pin, and the Homebrew version on the
  development machine) asks for a Supabase access token on `gen types` even with `--local`, which
  failed the first `db.yml` run. 2.117.0 doesn't. Developers running `npm run db:types` locally need
  2.117.0 or later too.

- **A11 — The DB job runs the local auth container.** `config.toml` disables `[auth]` (no sign-in
  in the MVP), and `supabase status` only prints the publishable key while GoTrue is running, so the
  RLS harness could never get the key #26 said to export. `db.yml` sets `SUPABASE_AUTH_ENABLED=true`
  for its own job only. `config.toml` is unchanged, the app never runs in that job, and the
  `anon`/`authenticated` roles under test exist either way. The harness's setup hint says the same
  for local runs.
- **A12 — Defects from #26 fixed here** (all found by the first real `db.yml` run, all inside this
  story's CI scope):
  - the committed `database.types.ts` was hand-written and differed from generator output;
  - `npm run db:types` wrote raw CLI output without the header `database.types.test.ts` requires, so
    regenerating would have broken `npm test`, and a failed generation truncated the file;
  - the harness's env instructions could not work with auth disabled (A11).
  One script, `scripts/db-types.sh`, now builds the file the same way for `db:types` and
  `db:types:check`.
- **A1 update — the orchestrator now says one PR per story.** At the user's request (2026-09-18),
  [PR #195](https://github.com/dczii/URecruitment/pull/195) changes `urec-orchestrator` to match
  this PR's shape, so A1 is no longer a deviation once #195 merges.

## Open questions

- None new. The **paid-plan** and **backup** questions stay open and are untouched.
