# Plan — #23 Quality is defined before it is built

Spec: [spec.md](./spec.md) · Branch: `docs/23-quality-test-eval-a11y` · Created: 2026-09-17

## Approach

Write three records under a new `docs/plans/` folder, one commit per task:

- **The test strategy** turns the `testing` skill into a contract. It adds the mapping the skill
  lacks: each test-first behaviour to its PRD rule and owning task, and each area to its minimum
  proof and gate.
- **The eval plan** confirms the `ai-eval` proposal and settles every place where two readings were
  possible. Each refinement is marked ⊕, so a reviewer can see exactly what changed.
- **The accessibility standard** takes the PRD's device and design rules, plus WCAG 2.2 AA as a
  reference. Every rule gets a code for how it is checked, so each one maps to a helper, a unit test,
  an axe tag or a design review.

Two alternatives were rejected:

- **Leaving the scoring method as "proposed" until #173.** Then the method would be decided by the
  person writing the script, after prompts exist. The story exists to prevent that.
- **Pointing to WCAG alone.** A reference without the project's specific rules (390 px, `zh-Hans`,
  the status label pattern, the keyboard move) would not tell a screen task what to assert.

## Skills in scope

- `prd-context`: required. Covers the quality bar, grading, devices, languages, design rules and the parsed-profile fields.
- `testing`: required, and the spine of #78. Covers the layers, the test-first protocol, the fixture and time rules, and the per-area minimums.
- `github-workflow`: required. Covers the branch, commits, PR and board.
- `ai-eval`: the spine of #79. Covers the bar, the key layout and format, the proposed scoring, the options, CI and grading sessions.
- `ai-pipeline`: the fake model in unit tests, evidence verification, the spend cap, and the no-network rule.
- `ui-build`: the spine of #80. Covers accessibility rule 5, phone width (rule 6), Chinese text (rule 7), dates (rule 8), the shared patterns, and the Playwright checks.
- `ui-design`: contrast values, frames, states and the PRD design rules.
- `ci-setup`: the workflows, triggers, secret skipping and required checks for the gates table.
- `security-check` / `compliance-review`: fixture rules (fictional only, no Blob URLs) and the answer key's contents.

## Files

| File | Change |
|---|---|
| `docs/plans/test-strategy.md` | new (#78) |
| `docs/plans/ai-eval-plan.md` | new (#79) |
| `docs/plans/accessibility-standard.md` | new (#80) |
| `docs/tasks/23-quality-test-eval-a11y/spec.md` | new |
| `docs/tasks/23-quality-test-eval-a11y/plan.md` | new |

## Dependencies

- none

## Steps

- [ ] **S1** `claude` — Write `docs/plans/test-strategy.md` (AC2, AC4, AC5). Commit as #78.
  - Rules: `testing` (all); `CLAUDE.md` Commands (exact script names); `ci-setup` workflows.
  - Verify: `V4`.
- [ ] **S2** `claude` — Write `docs/plans/ai-eval-plan.md` (AC1, AC6). Commit as #79.
  - Rules: `ai-eval` (all; mark every change from the proposal); `prd-context` quality bar (verbatim); `security-check` (no Blob URL in the key).
  - Verify: `V5`.
- [ ] **S3** `claude` — Write `docs/plans/accessibility-standard.md` (AC3, AC7). Commit as #80.
  - Rules: `ui-build` rules 5–8 and Tests; `ui-design` contrast and PRD design rules; `testing` Playwright rules.
  - Verify: `V6`.
- [ ] **S4** `none` — `V1`–`V8`, then Claude review (`pr-review` + `compliance-review` scope) on an Opus subagent.

## Test plan

**No automated tests are added.** The change is documentation only, and no test runner exists before #85.

| AC | Test or manual evidence | Type / reason |
|---|---|---|
| AC2, AC4, AC5 | `V4` | docs-only; scripted check |
| AC1, AC6 | `V5` | docs-only; scripted check |
| AC3, AC7 | `V6` | docs-only; scripted check |
| AC8 | `V1`, `V2`, `V3`, `V8` | docs-only; scripted check |

## Verification

```
V1  git diff --name-only <base>...HEAD | grep -v '^docs/'      # empty
V2  relative links and anchors resolve
V3  secret / Blob URL scan on the diff
V4  test strategy: the layer table has Tool, Location, Command and Runs-against columns for the four layers; every `npm run …`/`npm test` it names is one of CLAUDE.md's commands; T1–T15 present and each links an issue; every area row has a "Must prove" cell
V5  eval plan: the bar is quoted verbatim; "Field accuracy: the rule" and "Top-5 agreement: the rule" sections; EN/ZH separate; keys use SHA-256; `verified` excludes; "proposed" and "confirms" both stated
V6  accessibility standard: every rule row ends with a "Checked by" value drawn from {PW, AXE, UT, DR, CR}; C1 contains `scrollWidth <= window.innerWidth`; rules for keyboard (B3), contrast (E3), lang (D1) and overflow (C1) present
V8  every issue number exists
```

`npm run lint`, `typecheck`, `test`, `build`, `test:e2e`, `test:db` and `eval` are n/a, because the repository is not scaffolded until #83.

## Risks & rollback

- **Risk: the eval rules are wrong in a way only real data reveals.** The plan says any change is a PR to this file first, so a later change is visible rather than silent.
- **Risk: the accessibility rules are too strict for the free-tier timeline.** Each rule is tied to a helper that is written once (#107, #108), which keeps the per-screen cost small.
- **Rollback:** revert the commits.

## Outcome

<!-- Filled after execution. -->
