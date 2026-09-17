# Plan — #22 Security and compliance baselines are written before any code

Spec: [spec.md](./spec.md) · Branch: `docs/22-security-compliance-baselines` · Created: 2026-09-17

## Approach

Write three records, one commit per task:

- **#76, security baseline.** It opens with the exposure model (what "no sign-in, public repo"
  means per surface). The six PRD controls follow as a control → task → test table, then the
  inherited controls grouped as `security-check` groups them. Each row names where the control is
  built and how it is proven. "Gap" marks a control no task owned.
- **#77, compliance baseline and risk register.** The baseline takes one section per PDPA row with
  the same four fields (PRD requirement, MVP position, what the MVP must be designed for, real-data
  requirement), then fair employment and the governance mapping. The risk register is a living
  file with a summary table and one section per risk. Each risk states what it becomes at the
  real-data release.

The Workplace Fairness Act revisit also gets a row in the open-questions register, because
register rule 3 applies to this task too.

Two alternatives were rejected:

- **One combined security and compliance file.** The `security-check` and `compliance-review` skills
  review separately and cite separately, and #76 and #77 name separate paths.
- **Only restating the skills.** The skills say *what* to check but not *which task* builds a
  control or *which test* proves it, and the story asks for exactly that mapping.

## Skills in scope

- `prd-context`: required. Covers the security list, the PDPA table, Risks 1 and 2, fair employment, the governance requirements and the free-tier table.
- `testing`: required. Covers the test names and layers each control's proof lives in (unit, DB, e2e). No test runner applies here.
- `github-workflow`: required. Covers the branch, commits, PR and board.
- `security-check`: the whole checklist, which is the spine of #76. Severity rules and commands.
- `compliance-review`: the whole checklist, which is the spine of #77. "Not legal advice"; blocker and major severities.
- `supabase-db`: RLS + revoke in the same migration, `security_invoker` views, the private bucket, signed URLs of ≤ 300 s, the required lock-down test, and the consent and retention columns.
- `release-deploy`: the env inventory names, preview exposure, `sin1` and `ap-southeast-1`, the free-tier runbook and the rule that agents never touch remote settings.
- `ai-pipeline`: `runAi()`, redaction in code, verbatim evidence, the spend cap and data minimisation (via ADR-0003).
- `nextjs-app`: `src/server/**` with `import "server-only"`, Zod on every Server Action and route, and no stack traces.
- `talent-search`: protected terms are never turned into filters; the consent and retention filter hooks.
- `ci-setup`: CI secrets skip with a notice; least privilege.

## Files

| File | Change |
|---|---|
| `docs/security/baseline.md` | new (#76) |
| `docs/compliance/baseline.md` | new (#77) |
| `docs/compliance/risk-register.md` | new (#77) |
| `docs/decisions/open-questions.md` | modify — add RV-1, the Workplace Fairness Act revisit (#77) |
| `docs/tasks/22-security-compliance-baselines/spec.md` | new |
| `docs/tasks/22-security-compliance-baselines/plan.md` | new |

## Dependencies

- none

## Steps

- [ ] **S1** `claude` — Write `docs/security/baseline.md` (AC1, AC4, AC5). Commit as #76.
  - Rules: `security-check` (all sections, quoted as controls); `supabase-db` §Security; `prd-context` Security 1–6 (verbatim); `release-deploy` §Hard rules for agents.
  - Verify: `V4`, `V3`.
- [ ] **S2** `claude` — Write `docs/compliance/baseline.md` and `docs/compliance/risk-register.md`; add RV-1 to the register (AC2, AC3, AC6). Commit as #77.
  - Rules: `compliance-review` §A–E; `prd-context` PDPA table, Risks 1–2 and fair employment (verbatim); `ai-pipeline` redaction and evidence; open-questions rule 1 (don't settle RV-1).
  - Verify: `V5`, `V6`.
- [ ] **S3** `none` — `V1`–`V8`, then Claude review (`pr-review` + `security-check` + `compliance-review`) on an Opus subagent.

## Test plan

**No automated tests are added.** The change is documentation only, and there is no test runner before #85.

| AC | Test or manual evidence | Type / reason |
|---|---|---|
| AC1, AC4, AC5 | `V4` | docs-only; scripted check |
| AC2, AC6 | `V5` | docs-only; scripted check + verbatim quote check |
| AC3 | `V6` | docs-only; scripted check |
| AC7 | `V1`, `V2`, `V3`, `V8` | docs-only; scripted check |

## Verification

```
V1  git diff --name-only <base>...HEAD | grep -v '^docs/'      # empty
V2  relative links and anchors resolve
V3  secret / Blob URL / key-shaped scan on the diff
V4  security baseline: C1–C6 rows, each with an issue link in "Implementing" and a named test (or "not in the MVP" for C6); a Blob-store section saying "seed source only" with no URL; a "before real CVs" section linking #16
V5  compliance baseline: six PDPA sections (Protection, Consent, Retention, Overseas transfer, Access & correction, Breach notification), each with "MVP position" and "Real-data requirement"; the ignored-attributes rule verbatim; pregnancy, caregiving, disability and mental health listed as not covered; RV-1 present in the register
V6  risk register: R-01 marked Accepted for fictional data only; both "Microsoft 365 sign-in" and "office-network-only access" present
V8  every issue number exists
```

`npm run lint`, `typecheck`, `test`, `build`, `test:e2e`, `test:db` and `eval` are n/a because the repository is not scaffolded until #83.

## Risks & rollback

- **Risk: a proving test path drifts from what the owning task creates.** The baseline says the owning task's PR ticks or corrects its row.
- **Risk: reading the baseline as legal sign-off.** The compliance baseline opens with "not legal advice", and a legal review stays inside OQ-1.
- **Rollback:** revert the commits.

## Outcome

<!-- Filled after execution. -->
