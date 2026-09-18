# Plan — #27 Every pull request runs the CI checks

Spec: [spec.md](./spec.md) · Branch: `feat/27-ci-pr-checks` ·
Base: `feat/26-supabase-client-wiring` ([PR #194](https://github.com/dczii/URecruitment/pull/194)) ·
Created: 2026-09-18

## Approach

Three workflows, one commit each, in dependency order **#89 → #91 → #90**.

#91 is deliberately sequenced ahead of #90, against the issue numbering. Docker is absent from the
development machine, so #26 shipped three acceptance criteria that no machine has proved: the
`supabase start` round trip, the generated-types check and the RLS harness against a real database.
`db.yml` is the first place any of them runs. If one is wrong, it should surface while the Supabase
work is still fresh, not after an unrelated e2e task.

Everything a workflow runs already exists as an npm script. No job reimplements a check in YAML: CI
calls the same `npm run lint`, `npm test`, `npm run build`, `npm run test:db` a developer calls, so
the two cannot drift.

**Rejected:**

- *A single workflow with everything in it.* `db.yml` needs Docker and `e2e.yml` needs a deployment
  event. Merging them would slow the common path — `ci-setup`: *"keep `ci.yml` under ~5 minutes …
  Avoid Docker in `ci.yml`, since it lives in `db.yml`."*
- *Making `e2e.yml` fail when the bypass secret is missing.* AC4 asks for the opposite, and a red X
  on every PR until someone adds a secret trains reviewers to ignore red.
- *Installing `actionlint`.* A system-tool install nobody asked for. The run itself is the proof
  (spec A5).
- *Enabling branch protection.* `ci-setup` forbids agents changing repository settings (spec A7).

## Skills in scope

- `prd-context`: required. The free-tier posture and what CI is expected to cover.
- `testing`: required. The layer table — which command belongs to which job, and that DB tests run
  against a **local** stack only, never a remote project.
- `github-workflow`: required. Branch, commits, stacked PR, board.
- `ci-setup`: the whole file — triggers, least-privilege permissions, concurrency, Node from the
  scaffold, `npm ci`, SHA-pinned third-party actions, secret gating with `::notice::`, artifacts,
  job summaries, and "agents don't change repo settings".
- `security-check`: §Secrets (CI secrets exist only as Actions secrets; workflows skip gracefully on
  forks; never echo a secret) and §Dependencies.
- `supabase-db`: "Only CI and the release process apply migrations to remote projects. Agents never
  do" — `db.yml` touches only the ephemeral local stack.
- `release-deploy`: the environment map, and that agents never reconfigure Vercel.

## Files

| File | Change |
|---|---|
| `.github/workflows/pr-checks.yml` | new — #89: lint, typecheck, unit tests, build |
| `.github/workflows/db.yml` | new — #91: ephemeral Supabase, migrations twice, `test:db`, types check |
| `.github/workflows/e2e.yml` | new — #90: Playwright against the preview, skips without a secret |
| `package.json` | modify — add `db:types:check` so the types-drift check is one command, not inline YAML |
| `docs/plans/infrastructure.md` | modify — record `VERCEL_AUTOMATION_BYPASS_SECRET` as **required**, not conditional, now that preview protection is confirmed on |

## Dependencies

- **No new npm dependency.** Every job runs an existing script.
- **Actions used:** `actions/checkout@v4`, `actions/setup-node@v4`, `actions/upload-artifact@v4`
  (first-party, major tags per `ci-setup`), and `supabase/setup-cli` pinned to a commit SHA.
- **Secrets:** none created. `e2e.yml` *reads* `VERCEL_AUTOMATION_BYPASS_SECRET` if it exists and
  skips when it does not. `ci-setup`'s secrets inventory already lists it.
- **Migrations:** none.

## Steps

- [x] **S1** `grok` — #89 `pr-checks.yml`.
  - Rules: `ci-setup` §Rules (permissions, concurrency, Node from `.nvmrc`, `npm ci` + cache, job
    summary); `testing` §Layers (which commands belong here).
  - Verify: YAML parses; `npm run lint && npm run typecheck && npm test && npm run build` still pass
    locally. The real proof is the run on this PR.
- [x] **S2** `grok` — #91 `db.yml` plus the `db:types:check` script.
  - Rules: `ci-setup` (path filters, SHA-pinned third-party actions, job summary); `supabase-db`
    (agents never apply migrations remotely; regenerate types after every schema change); `testing`
    (DB tests run against a local stack only).
  - Verify: YAML parses; `npm run db:types:check` behaves sanely without Docker (it must fail with a
    clear message, not silently pass).
- [x] **S3** `grok` — #90 `e2e.yml`.
  - Rules: `ci-setup` §Secrets (check first, `::notice::`, exit 0, never echo) and §Artifacts
    (Playwright report on failure only); `testing` §Playwright (both projects).
  - Verify: YAML parses; the skip path is readable.
- [x] **S4** `claude` — the infrastructure-plan update (a docs edit an executor must not make).
- [x] **S5** `none` — Claude verification, the **real CI runs on this PR**, the deliberately-broken
  migration probe (AC5), then `pr-review` + `security-check` on an Opus subagent.

**Executor note:** no `cursor-agent` step may run `npm run test:e2e` (#25 spec A12).

## Test plan

No unit test is appropriate for a workflow file: there is no logic to unit-test, and a YAML mock
would assert the file's own contents back at itself. The evidence is the **live run**, which is
stronger. Recorded explicitly rather than omitted, as the orchestrator requires.

| AC | Test or manual evidence | Type |
|---|---|---|
| AC1 | The `pr-checks.yml` run on this PR, link in the verification log | live run |
| AC2 | The `db.yml` run on this PR (it touches `supabase/**`) | live run |
| AC3 | The `e2e.yml` run — **skips**, see AC4; proved fully once a bypass secret exists | live run, partial |
| AC4 | The `e2e.yml` run reporting `::notice::` and exiting 0 | live run |
| AC5 | A deliberately broken migration on a throwaway branch → failing `db.yml` run, linked, then removed | manual probe |
| AC6 | The `db:types:check` step inside the `db.yml` run | live run |
| AC7 | `permissions: contents: read`, no `secrets.` reference in `pr-checks.yml`, green run | file + live run |

## Verification

```
python3 -c "import yaml,sys;[yaml.safe_load(open(f)) for f in sys.argv[1:]]" .github/workflows/*.yml
npm run lint && npm run typecheck && npm test && npm run build
npm run db:types:check          # must fail clearly without Docker, not pass silently
gh run list --branch feat/27-ci-pr-checks
gh run view <id> --log-failed   # for anything red
```

## Risks & rollback

- **Risk: a workflow is wrong and only fails after the PR opens.** Accepted and planned for — that
  is what the run links are for. `actionlint` is unavailable (spec A5), so the first run *is* the
  test. Any red run gets fixed on this branch before the PR is called done.
- **Risk: `db.yml` exposes a real bug in #26's stack-dependent code** (spec A2). That is the
  intended outcome, not a risk to avoid. Fixes land on this branch and are called out in the PR.
- **Risk: CI minutes.** Public repository, so Actions is free; `db.yml` is path-filtered and
  `pr-checks.yml` avoids Docker.
- **Rollback:** delete the workflow files. Nothing else in the repository depends on them.

## Outcome

**Shipped** on `feat/27-ci-pr-checks` ([PR #196](https://github.com/dczii/URecruitment/pull/196),
stacked on #194). There is one PR for the story, with commits tagged per task (spec A1).

| Task | Files | Result |
|---|---|---|
| #89 | `.github/workflows/pr-checks.yml` | lint → typecheck → unit → build (+ #88 leak check), `contents: read`, no secrets, about 1 min |
| #91 | `.github/workflows/db.yml`, `scripts/db-types.sh` (replaces `db-types-check.sh`), `package.json`, `src/lib/database.types.ts`, `supabase/tests/rls.db.test.ts` (hint text) | ephemeral stack → migrations from scratch → `test:db` → types drift check; generated types uploaded on drift |
| #90 | `.github/workflows/e2e.yml`, `playwright.config.ts`, `e2e/global-setup.ts`, `e2e/bypass-state.ts`, `docs/plans/infrastructure.md` | Playwright desktop + phone on successful **Preview** deployments; skips with a notice without the secret; the secret is swapped for a cookie in global setup |

**Deviations from the plan**

- S1's executor call wrote all three workflows (S1–S3) in one step. It was reviewed and kept, with
  no separate S2/S3 calls.
- The second `db reset` was dropped (spec A8).
- Traces are off against the preview (A9).
- The CLI pin moved to 2.117.0 (A10).
- The auth container runs in the DB job (A11).
- The #26 defects were fixed here (A12).
- `scripts/db-types-check.sh` became `scripts/db-types.sh`.

**What the first real `db.yml` run found** (spec A2 predicted this). There were five red runs before
green, each fixed on this branch:

1. CLI 2.106.0 demands an access token on `gen types --local`; fixed by moving to 2.117.0.
2. The hand-written types differed from generator output; the generated file is now committed,
   recovered byte-exact from the CI log.
3. `db:types` and the unit test disagreed about the header; one script now builds the file.
4. `supabase status` omits the keys with auth disabled; parsing couldn't fix that.
5. It omits them for any stopped container too; the auth container now runs in the DB job only.

**Tests.** No unit test was added for workflow YAML (see Test plan). The regression evidence is the
live runs plus the AC5 probe. `e2e/global-setup.ts` was exercised by hand against the real preview:
with a wrong secret it now fails with *"Vercel bypass was rejected (HTTP 200, ended on vercel.com)"*
and exit 1, and the secret never appears in the output. The first version passed silently because it
followed the redirect to the SSO page.

**Verification**

| Check | Result |
|---|---|
| `npm run lint` | pass (1 warning in `supabase/migration-lint.ts`, from before this story) |
| `npm run typecheck` | pass |
| `npm test` | pass, 90/90 |
| `npm run build` | pass, `no leaks` |
| `npm run test:e2e` (local, Claude outside the sandbox) | pass, 8/8 (desktop + phone) |
| `npm run db:types:check` (local, no Docker) | fails clearly as designed: *"no local Supabase stack is running…"* |
| `checks` on #196 | [pass](https://github.com/dczii/URecruitment/actions/runs/35295639869) |
| `db` on #196 | [pass](https://github.com/dczii/URecruitment/actions/runs/35295639848), after five red runs, each a real defect (above) |
| `e2e` on #196 | [pass, skipped with a notice](https://github.com/dczii/URecruitment/actions/runs/35295673965), no secret yet |
| AC5 probe (#197) | unprotected table → [db red](https://github.com/dczii/URecruitment/actions/runs/35295876235) + [checks red](https://github.com/dczii/URecruitment/actions/runs/35295876232); invalid SQL → [db red](https://github.com/dczii/URecruitment/actions/runs/35296140031) |
| `npm run eval` | n/a, no AI change |

**Review** (`pr-review` + `security-check`, subagent).

- **1 blocker, fixed:** Playwright traces and the HTML report record request headers, so on a
  failure the bypass secret would have been uploaded as a public artifact. It also went to every
  third-party origin.
- **Non-blocking, fixed:**
  - the wrong default-branch comment;
  - Git Fork Protection is now recorded in the infra plan;
  - the second reset only replayed migrations;
  - the AC6 spec wording;
  - `cancel-in-progress` on `main`;
  - `persist-credentials`.
- **Non-blocking, noted:**
  - `test:db` has no tables to test until E03, so the AC5 probe stands in for it;
  - the path filter can't be a required check.

**Fix rounds:** 0 executor fix rounds. Every fix was made directly by Claude, because each depended
on CI evidence and CLI-source reading that the sandboxed executor cannot do. No escalation.

**Model-usage ledger**

| Role | Model |
|---|---|
| Planning, orchestration, spec/plan, S4 docs, all direct fixes, verification | `claude-opus-5` |
| S1 executor (wrote `pr-checks.yml`, `db.yml`, `e2e.yml`, the first `db:types:check`, the first `playwright.config.ts` change) | `cursor-grok-4.6-high` (`.orchestrator/27-ci-pr-checks/S1.log` header) |
| Executor fix rounds / escalations | none |
| `pr-review` + `security-check` subagent | unknown (runtime did not expose it; requested alias `opus`) |

**Follow-ups**

- **User:** add the `VERCEL_AUTOMATION_BYPASS_SECRET` Actions secret (Vercel → Deployment
  Protection → Protection Bypass for Automation), then re-run the latest `e2e` run to prove AC3 end
  to end.
- **User:** once `main` is green, consider branch protection requiring `checks`. `db` is
  path-filtered, so it can't be required as-is. `ci-setup`: agents don't change repo settings.
- **User:** `brew upgrade supabase` (2.106.0 → ≥ 2.117.0) before running `npm run db:types` locally.
- **Harness:** the HTTP half of the RLS check passes on an empty table (0 rows). The grant check
  caught the probe, but E03 should seed one row per table in the harness, or assert a
  permission-denied error, so the HTTP half has teeth.
- **`ci-setup` skill:**
  - it still names the PR workflow `ci.yml` (spec A4) and lists the bypass secret as "only if
    preview protection is on";
  - it should say `deployment_status` runs use the workflow at the deployed commit;
  - it should say previews only (no production).
