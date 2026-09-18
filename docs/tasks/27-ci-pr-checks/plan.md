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

- [ ] **S1** `grok` — #89 `pr-checks.yml`.
  - Rules: `ci-setup` §Rules (permissions, concurrency, Node from `.nvmrc`, `npm ci` + cache, job
    summary); `testing` §Layers (which commands belong here).
  - Verify: YAML parses; `npm run lint && npm run typecheck && npm test && npm run build` still pass
    locally. The real proof is the run on this PR.
- [ ] **S2** `grok` — #91 `db.yml` plus the `db:types:check` script.
  - Rules: `ci-setup` (path filters, SHA-pinned third-party actions, job summary); `supabase-db`
    (agents never apply migrations remotely; regenerate types after every schema change); `testing`
    (DB tests run against a local stack only).
  - Verify: YAML parses; `npm run db:types:check` behaves sanely without Docker (it must fail with a
    clear message, not silently pass).
- [ ] **S3** `grok` — #90 `e2e.yml`.
  - Rules: `ci-setup` §Secrets (check first, `::notice::`, exit 0, never echo) and §Artifacts
    (Playwright report on failure only); `testing` §Playwright (both projects).
  - Verify: YAML parses; the skip path is readable.
- [ ] **S4** `claude` — the infrastructure-plan update (a docs edit an executor must not make).
- [ ] **S5** `none` — Claude verification, the **real CI runs on this PR**, the deliberately-broken
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

*(filled in at Step 9)*
