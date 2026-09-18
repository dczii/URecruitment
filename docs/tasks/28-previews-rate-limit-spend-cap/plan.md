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

- [ ] **S1a** `grok`: #92. Write `test/infra/vercel-config.test.ts` (AC1, AC2). It must fail because
  `docs/plans/infrastructure.md` has no `### What is set where (#92)` section yet.
  - Rules: `testing` (AC ids in names; no network), `release-deploy` (names only), `security-check`
    (no values).
  - Verify: `npx vitest run test/infra/vercel-config.test.ts`. The AC1 region test and the
    names-only test pass; the matrix test fails because the section is missing.
- [ ] **S1b** `claude`: #92 docs. Fill the matrix and the observed state in the infrastructure plan;
  update RC-3. Claude writes these because the issue's executor hint is `claude` (judgment-heavy
  records). The executor can't observe Vercel.
  - Verify: `npx vitest run test/infra/vercel-config.test.ts` → pass.
  - **Commit:** `docs(release): record Vercel environments and variable matrix (#92)`.
- [ ] **S2a** `grok`: #93. Write the failing tests `src/lib/ai-routes.test.ts` (AC6),
  `test/infra/ai-rate-limit-rule.test.ts` (AC4, AC7), `test/infra/ai-route-prefix.test.ts` and the
  helper `test/infra/ai-route-guard.ts` (AC5).
  - Rules: `testing`, `nextjs-app` rule 4, `security-check` (AI endpoints under `/api/ai/*`).
  - Verify: the tests fail because `src/lib/ai-routes.ts` and `infra/vercel/ai-rate-limit.rule.json`
    don't exist. The guard's fixture tests pass (the helper is part of the test step).
- [ ] **S2b** `grok`: #93. Implement `src/lib/ai-routes.ts` and `infra/vercel/ai-rate-limit.rule.json`
  until S2a is green, except AC7, which needs S2c's doc.
  - Verify: `npm test`. Everything passes except the AC7 doc-sync test.
- [ ] **S2c** `claude`: #93 docs. Write `src/app/api/ai/README.md` and the infra plan section, and
  make the consistency edits to the baseline and the two skills. Executors may not touch `.claude/**`,
  and the text is judgment-heavy.
  - Verify: `npm test` → all pass.
  - **Commits:** `test(release): …`, then `feat(release): …` / `docs(release): …` (#93).
- [ ] **S3** `none`: full verification. `npm run lint && npm run typecheck && npm test && npm run
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

<!-- Filled after execution. -->

- **Shipped:** 
- **Changed files / areas:**
- **Tests added or updated:**
- **Verification:**
- **Deviations:** 
- **Fix rounds / escalations:** 
- **Models used:**
- **Claude direct fixes:** 
- **Review findings:** 
- **Follow-ups:** 
