# Plan — #24 Infrastructure and delivery order are planned

Spec: [spec.md](./spec.md) · Branch: `docs/24-infrastructure-delivery-plan` · Created: 2026-09-17

## Approach

Two records under `docs/plans/`, plus `.env.example`, with one commit per task.

- **#81, the infrastructure plan.** The environment map is a single three-column table, so local,
  preview and production can be compared row by row. The env var inventory is grouped by who reads
  each variable (app runtime, seed and eval, tests and CI, platform). Every row has the same columns:
  where it is set, its scope, whether it is secret, and the task that introduces it. The free-tier
  section keeps the PRD's limit and effect as `prd-context` condenses them, and adds *our* response, an owner and a risk id.
  The recovery section writes out the commands, marking which task adds each one.
- **#82, the delivery plan.** It takes phases and epics from the board and the roadmap JSON, and
  computes the critical path from the tasks' *Depends on* lists instead of asserting it. Sync points
  are listed as "needs → before" pairs, so a task author can check them. The definition of done quotes
  the issue template verbatim.

**Rejected:**

- *Putting the env inventory only in `release-deploy`.* Skills describe the method, and the plan is
  the record that tasks cite and update.
- *A Gantt chart.* The task excludes estimates, and a chart without dates implies them anyway.

## Skills in scope

- `prd-context`: required. Environments and delivery, free-tier limits, hosting and backups, the deadline and the release plan.
- `testing`: required. The e2e base URL and the lock-down test variables. No test runner here.
- `github-workflow`: required. The Phase field values, the branch, the commits, the PR and the board.
- `release-deploy`: the spine of #81. Environments, the env inventory, hard rules for agents, the free-tier runbook, rollback.
- `security-check`: secrets, the public repo, the never-`NEXT_PUBLIC_` list and preview exposure.
- `supabase-db`: the two projects, migrations, `supabase db reset` and the seed flags.
- `ci-setup`: the secrets inventory, the skip-with-notice rule, and the migrate and eval workflows reaching remote projects.
- `nextjs-app`: `after()` for background work and the server-only env module.
- `urec-orchestrator`: the spine of #82's definition of done (Steps 2–10, the final report and the model ledger).
- `backlog-builder`: how the phase structure and roadmap JSON are maintained.

## Files

| File | Change |
|---|---|
| `docs/plans/infrastructure.md` | new (#81) |
| `.env.example` | new (#81): names only, blank values |
| `docs/plans/delivery-plan.md` | new (#82) |
| `docs/tasks/24-infrastructure-delivery-plan/spec.md` | new |
| `docs/tasks/24-infrastructure-delivery-plan/plan.md` | new |

## Dependencies

- None. No package, no migration. `.env.example` introduces **names only**, and nothing reads it yet.

## Steps

- [x] **S1** `claude` — Write `docs/plans/infrastructure.md` and `.env.example` (AC1, AC2, AC4, AC5). Commit as #81.
  - Rules: `release-deploy` (env inventory, hard rules, runbook), `security-check` §Secrets and §Exposure, `ci-setup` §Secrets inventory, `prd-context` free-tier table (as condensed there).
  - Verify: `V4`, `V5`, `V7`.
- [x] **S2** `claude` — Write `docs/plans/delivery-plan.md` (AC3, AC6, AC7). Commit as #82.
  - Rules: `github-workflow` (the Phase field), `urec-orchestrator` (the definition of done), the roadmap JSON as the source of dependencies.
  - Verify: `V6`.
- [x] **S3** `none` — `V1`–`V8`, then Claude review (`pr-review` + `security-check` scope) on an Opus subagent.

## Test plan

**No automated tests are added.** This is documentation plus a names-only env template. No test runner exists before #85.

| AC | Test or manual evidence | Type / reason |
|---|---|---|
| AC1, AC4 | `V4` | docs-only; scripted check |
| AC2, AC5 | `V5` | docs-only; scripted check |
| AC3, AC6, AC7 | `V6` | docs-only; scripted check against the Project 4 field cache and the issue template |
| AC8 | `V1`, `V2`, `V3`, `V7`, `V8` | scripted check |

## Verification

```
V1  git diff --name-only <base>...HEAD | grep -vE '^(docs/|\.env\.example$)'     # empty
V2  relative links and anchors resolve
V3  secret / Blob URL scan on the diff
V4  infrastructure.md: an environment table with Local, Preview and Production columns and Supabase and Vercel rows; every name in .env.example appears in the inventory; every inventory row has Secret and Scope values
V5  all seven PRD free-tier limit rows are present with a "Our response" cell; the recovery section contains `supabase db reset`, `supabase db push` and `npm run seed -- --reset`
V6  delivery-plan.md: all 13 Phase field values from .claude/github-project.fields.json appear; "## Critical path", "## Parallel tracks" and "## Definition of done" are present; the DoD quote matches the #74 issue body's DoD text after whitespace normalisation
V7  git ls-files -z | xargs -0 grep -InE '(SEED_BLOB_BASE_URL|BLOB_READ_WRITE_TOKEN)=[^[:space:]]' | grep -v '^.env.example'
    # only the pattern text itself may match; and every assignment in .env.example is `NAME=` with nothing after it.
    # Run it over TRACKED files. The task's original form (`grep -R … .`) also scans the gitignored
    # .env.local and would print a local value to the terminal.
V8  every issue number exists
```

`npm run lint`, `typecheck`, `test`, `build`, `test:e2e`, `test:db` and `eval` are n/a, because the repository is not scaffolded until #83.

## Risks & rollback

- **Risk: the inventory drifts from the code.** The rule "add a variable in the PR that introduces it" is stated, and #84's env schema is written against this list.
- **Risk: the keep-alive assumption is wrong,** meaning the read does not count as activity. #178 must confirm it after a quiet week.
- **Rollback:** revert the commits.

## Outcome

- **Shipped:**
  - **`docs/plans/infrastructure.md`** (#81) contains:
    - the environment map: local, preview and production, each with its app, region, Supabase project, Vercel environment, schema source, data and reach;
    - the known limitation on previews and schema changes;
    - migration promotion, including the expand/contract rule;
    - an env var inventory in four groups, by name only, with Local / Dev / Prev / Prod / CI columns, scope, secret status and the introducing task, plus a never-`NEXT_PUBLIC_` list;
    - two placeholders, one for #92 and one for #93;
    - all seven PRD free-tier limits, each with our response, an owner and a risk id;
    - a proposed daily keep-alive for production;
    - recovery by migrations plus seed, with the exact commands, cost and time;
    - rollback.
  - **`.env.example`** lists every locally set name, with no values.
  - **`docs/plans/delivery-plan.md`** (#82) contains:
    - phases P0–P12, each with its epics, what it delivers, and its entry and exit conditions;
    - the two phases that finish in two halves;
    - the critical path, both as planned and as computed from dependencies. The computed path is 19 tasks through seed, answer key, eval and go/no-go, with DT-1 and recruiter verification on it;
    - parallel tracks A–G;
    - sync points S1–S9;
    - the definition of done for a task, story, phase and the MVP;
    - how the plan changes.
- **Changed files / areas:** `docs/plans/infrastructure.md`, `docs/plans/delivery-plan.md`, `.env.example`, plus this task's `spec.md` and `plan.md`.
- **Tests added or updated:** none. This PR is documentation plus a names-only env template, and no test runner exists before #85 (spec A12).
- **Verification:**
  - V1: only `docs/` and `.env.example` changed.
  - V2: links and anchors resolve, including `#supabase-free-pauses-after-a-week-idle` and `ai-eval-plan.md#when-it-runs-and-what-it-costs`.
  - V3: clean.
  - V4: the environment table has Local, Preview and Production. All 15 `.env.example` names appear in the inventory, and all 19 inventory rows are complete.
  - V5: all 7 free-tier rows are present, and the recovery commands are present.
  - V6: all 13 Phase values appear, the three sections exist, and the definition-of-done quote matches the template after whitespace normalisation.
  - V7: over tracked files, only the pattern text itself matches, and every `.env.example` line is `NAME=`.
  - V8: every cited issue exists.
- **Deviations:**
  - V7 was run over tracked files rather than the task's original command. The original also scans the gitignored `.env.local` and prints a local value.
  - Recovery no longer uses `--reset` on production (review F1).
- **Fix rounds / escalations:** none on implementation. One review round: 1 blocker, 5 major, 9 minor, several nits, all applied.
- **Models used:**
  - Planning, writing and verification: Claude Opus 5 (`claude-opus-5`).
  - Review, including security-check scope: a Claude subagent with the `opus` model alias. The runtime did not expose the exact model ID.
  - No `cursor-agent` call was made.
- **Claude direct fixes:** every step was Claude-executed by design (spec A2).
- **Review findings (all applied):**
  - F1: #122's `--reset` is refused outside local/dev, so the production rebuild uses the idempotent `npm run seed`.
  - F2: the Supabase URL and secret key are removed from Vercel *Development*, so `vercel env pull` never copies the dev secret.
  - F3: `SUPABASE_URL` is added to CI (eval).
  - F4: no task builds the migrate workflow; this is recorded, with #177 as the manual path until one does.
  - F5: #178 covers the runbook only; the route, cron and secret are a follow-up.
  - F6: `supabase db reset --linked`, marked destructive.
  - F7: cron wording.
  - F8: the terms check is left to #178.
  - F9: the seed report has counts, not byte totals.
  - F10: `supabase login` / `link` usage.
  - F11: expand/contract migrations.
  - F12: missing token and pattern dependencies.
  - F13: #112 depends on #111.
  - F14: the definition-of-done source is `render.jq`.
  - F15: "always" only once #83 exists.
  - F16: nits.
- **Follow-ups:**
  1. Add a task for the migrate workflow.
  2. Widen #178, or add a task, for the keep-alive route, the cron entry and `CRON_SECRET`.
  3. Add `SUPABASE_URL` and `SUPABASE_SECRET_KEY` to `ci-setup`'s secrets table.
  4. Add missing dependencies to the issues and roadmap: #120 ← #142; #131/#134/#154/#161/#164 ← #95/#99; #122 ← #132.
  5. Split #111 so `match_scores` can land before DT-1.
  6. Add the definition-of-done section to the Task issue form.
  7. #123 prints byte totals.
  8. #92 and #178 confirm the platform points: Vercel Standard Protection on previews, and Supabase's restore window.
