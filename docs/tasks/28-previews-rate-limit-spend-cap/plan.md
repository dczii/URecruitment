# Plan — #28 Previews and production deploy safely and cannot run up costs

Spec: [spec.md](./spec.md) · Branch: `feat/28-previews-rate-limit-spend-cap` · Created: 2026-09-18

## Approach

**What already exists.** The Vercel project already deploys: Git integration builds a preview per PR
push and production from `main`, `vercel.json` pins `sin1`, and previews sit behind Vercel
Authentication. #92 therefore mostly **records** the setup. The agent observed it without
credentials: GitHub deployments by `vercel[bot]`, and `x-vercel-id: sin1::sin1::…` on production.

**#92.** The infrastructure plan gets the required variable matrix and the commands a person uses to
confirm it. A doc-sync test keeps the matrix complete against `.env.example` and pins the region.
RC-3 stays open with a named owner.

**#93.** The AI surface gets exactly one path prefix, `/api/ai/`:

- The Vercel WAF rate-limit rule is committed as JSON in `infra/vercel/`, in the REST API's custom-rule
  shape, and is applied with `vercel firewall rules add --json`.
- Tests tie the JSON to the prefix constant and to Hobby's limits.
- A guard test fails any AI-importing route handler that sits outside the prefix.
- A pure message helper makes a 429 visible to recruiters.

**Alternatives rejected:**

- **`vercel.json` `routes[].mitigate`:** it supports only `deny` and `challenge`, not rate limits
  (Vercel WAF docs, 2026-08-28).
- **`@vercel/firewall` `checkRateLimit()`:** it adds a dependency and still needs the dashboard rule.
  Without an AI route it would protect nothing yet.
- **An app-level Supabase limiter now:** that is #175's scope.

## Skills in scope

Discovery ran over `.claude/skills/*` and `.agents/skills/*` (animation and UI-library skills don't
match: no screen, no motion).

- `prd-context`: required for every task. It covers the Security 5 control, the Hobby non-commercial
  limit, open question 2, and the no-email rule.
- `testing`: required for every task. Doc-sync and guard tests are unit tests with no network, and
  the AC ids go in the test names.
- `github-workflow`: the Story/Task issues, the board status, the commit per Task, and the PR.
- `release-deploy`: the Vercel environments, the env var inventory, *"rate limiting on `/api/ai/*`
  … record which one is in use"*, and the no-remote-changes rule.
- `security-check`: the AI endpoints under `/api/ai/*` are rate-limited, secrets hygiene, preview
  exposure, and the Hobby flag.
- `ai-pipeline`: the spend cap is checked before every call (#175 builds it; this story documents the
  provider side).
- `nextjs-app`: the folder layout (`src/app/api/ai/`), rule 4 (AI through `/api/ai/*`), and shared
  code in `src/lib`.
- `ci-setup`: n/a. No workflow changes; the new tests run in the existing `checks` job.

## Files

| File | Change | Task |
|---|---|---|
| `test/infra/vercel-config.test.ts` | new: pins `sin1`; `.env.example` is names-only; every name has a matrix row | #92 |
| `docs/plans/infrastructure.md` | modify: fill *What is set where (#92)* | #92 |
| `docs/decisions/open-questions.md` | modify: RC-3 owner and link, status stays Open | #92 |
| `src/lib/ai-routes.ts` | new: `AI_ROUTE_PREFIX`, `isAiRoutePath`, message constants, `aiFailureMessage` | #93 |
| `src/lib/ai-routes.test.ts` | new: AC6 | #93 |
| `infra/vercel/ai-rate-limit.rule.json` | new: the committed WAF rule | #93 |
| `test/infra/ai-rate-limit-rule.test.ts` | new: AC4, AC7 | #93 |
| `test/infra/ai-route-guard.ts` | new: pure `aiRouteViolations(files)` | #93 |
| `test/infra/ai-route-prefix.test.ts` | new: AC5 (fixtures plus the real tree) | #93 |
| `src/app/api/ai/README.md` | new: the prefix contract | #93 |
| `docs/plans/infrastructure.md` | modify: fill *Rate limit and spend cap (#93)* | #93 |
| `docs/security/baseline.md` | modify: C5 row and note (Hobby offers the rule) | #93 |
| `.claude/skills/release-deploy/SKILL.md` | modify: the rate-limit control in force | #93 |
| `.claude/skills/nextjs-app/SKILL.md` | modify: rule 4 wording (A4) | #93 |

## Dependencies

- none (no npm package, env var or migration).

## Steps

- [x] **S1a** `grok`: #92. Write `test/infra/vercel-config.test.ts` (AC1, AC2). It must fail because
  `docs/plans/infrastructure.md` has no `### What is set where (#92)` section yet.
  - Rules: `testing` (AC ids in names; no network), `release-deploy` (names only), `security-check`
    (no values).
  - Verify: `npx vitest run test/infra/vercel-config.test.ts`. The AC1 region test and the
    names-only test pass; the matrix test fails because the section is missing.
- [x] **S1b** `claude`: #92 docs. Fill the matrix and the observed state in the infrastructure plan;
  update RC-3. Claude writes these because the issue's executor hint is `claude` (judgment-heavy
  records). The executor can't observe Vercel.
  - Verify: `npx vitest run test/infra/vercel-config.test.ts` → pass.
  - **Commit:** `docs(release): record Vercel environments and variable matrix (#92)`.
- [x] **S2a** `grok`: #93. Write the failing tests `src/lib/ai-routes.test.ts` (AC6),
  `test/infra/ai-rate-limit-rule.test.ts` (AC4, AC7), `test/infra/ai-route-prefix.test.ts` and the
  helper `test/infra/ai-route-guard.ts` (AC5).
  - Rules: `testing`, `nextjs-app` rule 4, `security-check` (AI endpoints under `/api/ai/*`).
  - Verify: the tests fail because `src/lib/ai-routes.ts` and `infra/vercel/ai-rate-limit.rule.json`
    don't exist. The guard's fixture tests pass (the helper is part of the test step).
- [x] **S2b** `grok`: #93. Implement `src/lib/ai-routes.ts` and `infra/vercel/ai-rate-limit.rule.json`
  until S2a is green, except AC7, which needs S2c's doc.
  - Verify: `npm test`. Everything passes except the AC7 doc-sync test.
- [x] **S2c** `claude`: #93 docs. Write `src/app/api/ai/README.md` and the infra plan section, and
  make the consistency edits to the baseline and the two skills. Executors may not touch `.claude/**`,
  and the text is judgment-heavy.
  - Verify: `npm test` → all pass.
  - **Commits:** `test(release): …`, then `feat(release): …` / `docs(release): …` (#93).
- [x] **S3** `none`: full verification. `npm run lint && npm run typecheck && npm test && npm run
  build`, plus the `security-check` secret grep over the diff.

## Test plan

| AC | Test or manual evidence | Type / reason |
|---|---|---|
| AC1 | `test/infra/vercel-config.test.ts › AC1: vercel.json pins functions to sin1` + manual: deployment list and `x-vercel-id` headers recorded in the infra plan | unit + manual (the live region can't be asserted offline) |
| AC2 | `test/infra/vercel-config.test.ts › AC2: .env.example holds names only` and `› AC2: every .env.example name has a row in the set-where matrix` | unit (doc sync). The dashboard confirmation is a person's step (spec A1) |
| AC3 | none. Docs-only: the RC-3 row stays Open, names an owner, and links the infra plan | manual review |
| AC4 | `test/infra/ai-rate-limit-rule.test.ts › AC4: …` (prefix match, one condition, fixed window, IP key, 429, Hobby window bounds, no persistent block) | unit |
| AC5 | `test/infra/ai-route-prefix.test.ts › AC5: …` (fixtures: inside/outside the prefix, `ai`, `@ai-sdk/*`, `@/server/ai`, re-export, dynamic import, bare `/api/ai/route.ts`; plus the real `src/app` tree) | unit |
| AC6 | `src/lib/ai-routes.test.ts › AC6: …` (429 → rate-limit copy; other failures → generic copy; 2xx → null; `isAiRoutePath` edges) | unit |
| AC7 | `test/infra/ai-rate-limit-rule.test.ts › AC7: the infrastructure plan states the committed rule's values` | unit (doc sync); procedure text checked in review |

## Verification

```
npm run lint
npm run typecheck
npm test
npm run build        # src/lib changed
```

`test:e2e` doesn't apply (no screen). `test:db` doesn't apply (no SQL). `eval` doesn't apply (no
prompt or schema).

## Risks & rollback

- **The rule JSON shape may drift from Vercel's API.** The infra plan also gives the equivalent
  flag-form command, and after applying the rule the person runs
  `vercel firewall rules inspect "…" --json`. If the output differs, the committed JSON is updated to
  match.
- **A shared office IP could hit 60/min during a busy session.** The limit is tunable in the JSON and
  re-applied by a person; it needs no deploy.
- **Rollback:** revert the PR. A published rule is removed with `vercel firewall rules remove` plus
  `publish`, by a person.

## Outcome

**Shipped** on `feat/28-previews-rate-limit-spend-cap`, one PR for the story with commits tagged per
task.

| Task | Files | Result |
|---|---|---|
| #92 | `docs/plans/infrastructure.md` (*What is set where (#92)*; the Environments row), `docs/decisions/open-questions.md` (RC-3), `.claude/skills/release-deploy/SKILL.md` (Supabase rows), `test/infra/vercel-config.test.ts` | Recorded the observed Vercel state (previews per PR, production from `main`, `sin1`, Vercel Authentication on previews) and the matrix for every `.env.example` name. The variable names another session saw in the dashboard are recorded, with their gaps. RC-3 stays **Open**, with the agency director as owner |
| #93 | `src/lib/ai-routes.ts`, `infra/vercel/ai-rate-limit.rule.json`, `src/app/api/ai/README.md`, `docs/plans/infrastructure.md` (*Rate limit and spend cap (#93)*), `docs/security/baseline.md` (C5), `.claude/skills/nextjs-app/SKILL.md` (rule 4), `.claude/skills/release-deploy/SKILL.md` (control in force), tests under `test/infra/` and `src/lib/ai-routes.test.ts` | One `/api/ai/` prefix. The committed Hobby WAF rule allows 60 requests per 60 seconds per IP and answers 429. A transitive guard stops AI-reaching route handlers outside the prefix. `aiFailureMessage()` gives recruiter copy for a 429. The spend-cap procedure names owners and a check cadence |

**Tests added:**

- `test/infra/vercel-config.test.ts` (3): the region pin, names-only `.env.example`, and matrix
  completeness.
- `test/infra/ai-rate-limit-rule.test.ts` (4): the rule's shape, prefix and Hobby limits (AC4), and
  doc sync (AC7).
- `test/infra/ai-route-prefix.test.ts` with the helper `test/infra/ai-route-guard.ts`: AC5 fixtures
  (direct, transitive, index resolution, cycles, route groups, optional catch-all) and the real
  `src` tree.
- `src/lib/ai-routes.test.ts`: the prefix contract (AC4) and the messages (AC6).

**Verification** (Node 22, per `.nvmrc`; the machine's default Node 20 fails two existing
`src/server/db.test.ts` cases because it lacks a native WebSocket, which is unrelated):

| Check | Result |
|---|---|
| `npm run lint` | pass (1 existing warning in `supabase/migration-lint.ts`) |
| `npm run typecheck` | pass |
| `npm test` | pass, 130/130 |
| `npm run build` | pass, `no leaks` |
| `security-check` secret grep on the diff | clean (names and prose only) |
| `test:e2e` / `test:db` / `eval` | n/a: no screen, SQL, prompt or schema change |

**Deviations:**

- S1a and S2a ran as one executor call (their files don't overlap). The tests were still committed
  per task.
- **Shared checkout.** Another session (story #29) cut `design/29-visual-language-tokens` in the same
  checkout while this story's spec commit was landing, so that commit also sits on the #29 branch.
  The work moved to its own worktree (`../urecruitment-story28`), the commit was cherry-picked, and
  the #29 session was told. The S1a-S2a log header shows the #29 branch name for that reason; its
  files were moved over unchanged.
- **#193 merged mid-story** (one Supabase project). The branch was rebased onto `main`, and the matrix
  and `release-deploy` now say "the one project".
- **No remote changes** (spec A1). Publishing the rule, confirming the variables and fixing the e2e
  bypass secret moved to [#199](https://github.com/dczii/URecruitment/issues/199), under story #68.

**Fix rounds:** 1 executor fix round (FIX1, from review findings F1, F3 and F6). No escalation.
Claude made the doc fixes directly (F2, F4, F5, and the #193 alignment).

**Review** (`pr-review` + `security-check`, Opus subagent): changes required, then fixed.

| Finding | Severity | What it found | Fix |
|---|---|---|---|
| F1 | major | The guard saw only direct imports | Transitive, service-aware guard |
| F2 | major | The follow-ups for a person weren't tracked | [#199](https://github.com/dczii/URecruitment/issues/199) |
| F3 | minor | Route groups and optional catch-alls could serve the bare `/api/ai` | Guarded |
| F4 | minor | `release-deploy` put the Supabase secret key in Vercel Development | Rows fixed |
| F5 | nit | The spend-cap step named the wrong environments | Wording fixed |
| F6 | nit | Two tests carried the wrong AC labels | Relabelled |

No blockers.

**Model-usage ledger**

| Role | Model |
|---|---|
| Planning, orchestration, spec/plan, S1b and S2c docs, direct doc fixes, verification | `claude-opus-5` |
| S1a+S2a executor (failing tests, guard helper) | `cursor-grok-4.6-high` (`S1a-S2a.log` header) |
| S2b executor (`ai-routes.ts`, rule JSON) | `cursor-grok-4.6-high` (`S2b.log` header) |
| FIX1 executor (transitive guard, F3, F6) | `cursor-grok-4.6-high` (`FIX1.log` header) |
| Escalations | none |
| `pr-review` + `security-check` subagent | unknown (runtime did not expose it; requested alias `opus`) |

**Follow-ups:**

- [#199](https://github.com/dczii/URecruitment/issues/199) (a person), which must be done before the
  first `/api/ai/*` route reaches production:
  - publish the rule and run the burst probe (S-AC2);
  - confirm the variables with `vercel env ls` (#92 done-when 2) and reconcile the recorded gaps;
  - fix `VERCEL_AUTOMATION_BYPASS_SECRET`.
- The provider-side spend cap is set in the ADR-0004 PR (DT-1).
- #175 keeps the app-side cap and may add the app-level limiter.
- RC-3 (Hobby and commercial use) is still open. The owner, the agency director, has not been asked
  yet.
