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

- [x] **S1** `claude` — Write `docs/security/baseline.md` (AC1, AC4, AC5). Commit as #76.
  - Rules: `security-check` (all sections, quoted as controls); `supabase-db` §Security; `prd-context` Security 1–6 (verbatim); `release-deploy` §Hard rules for agents.
  - Verify: `V4`, `V3`.
- [x] **S2** `claude` — Write `docs/compliance/baseline.md` and `docs/compliance/risk-register.md`; add RV-1 to the register (AC2, AC3, AC6). Commit as #77.
  - Rules: `compliance-review` §A–E; `prd-context` PDPA table, Risks 1–2 and fair employment (verbatim); `ai-pipeline` redaction and evidence; open-questions rule 1 (don't settle RV-1).
  - Verify: `V5`, `V6`.
- [x] **S3** `none` — `V1`–`V8`, then Claude review (`pr-review` + `security-check` + `compliance-review`) on an Opus subagent.

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

- **Shipped:**
  - **`docs/security/baseline.md`** (#76) contains:
    - the exposure model, one row per surface;
    - the six PRD controls, C1–C6, each with its implementing task(s) and proving test(s);
    - the inherited controls in nine groups, each with where it is built and how it is proven;
    - four gaps, each assigned to a task:
      - security headers → #83, with the e2e assertion in #85;
      - `npm audit` → #89;
      - the rate-limit test → #175;
      - the preview-protection check → #92;
    - the prompt-injection case, flagged as a gap for the prompt-wiring services;
    - what the real-data release is expected to add, linking E15 (#16).
  - **`docs/compliance/baseline.md`** (#77) covers:
    - the six PDPA rows, each with the PRD requirement verbatim, the MVP position, what the MVP must be designed for, and the real-data requirement;
    - fair employment, with the ignored attributes quoted exactly, the reason rule, gap flags and search;
    - the Workplace Fairness Act table, with the four attributes not yet covered;
    - the Model AI Governance mapping;
    - known inconsistencies K1–K3.
  - **`docs/compliance/risk-register.md`** (#77) holds R-01…R-13. R-01 is accepted for fictional data only, with its two cheapest fixes named.
  - **Register row RV-1** (open, with an end-2027 deadline) is in the open-questions register.
- **Changed files / areas:**
  - `docs/security/baseline.md`, `docs/compliance/baseline.md` and `docs/compliance/risk-register.md` (all new);
  - `docs/decisions/open-questions.md` (the RV-1 row and section);
  - this task's `spec.md` and `plan.md`.
- **Tests added or updated:** none. This change is documentation only, and no test runner exists before #85 (spec A10).
- **Verification:**
  - V1 docs only.
  - V2 links and anchors resolve, including `#r-01--no-sign-in`, `#r-08-…`, `#r-12-…`, `#rv-1-…` and `#the-workplace-fairness-act-an-open-revisit`.
  - V3 no secret patterns, no Blob URL.
  - V4 C1–C6 each link a task and name a proof; the Blob store is "seed source only"; the real-data section links #16.
  - V5 six PDPA sections, each with an MVP position and a real-data requirement; the ignored-attributes rule is verbatim; all four Act attributes are listed; RV-1 is present.
  - V6 R-01 is accepted for fictional data only, with Microsoft 365 sign-in and office-network-only access both named.
  - V8 every cited issue exists.
  - Every italic PRD quote was checked against the PDF text.
- **Deviations:**
  - The security baseline assigns four gaps; the plan named two.
  - K2 and K3 were added after review.
  - RV-1 is **Open (deadline)** rather than Deferred, because register rule 3 says a new item starts Open.
- **Fix rounds / escalations:** none on implementation. One review round (4 major, 7 minor, 2 nit), all applied.
- **Models used:**
  - Planning, writing, verification: Claude Opus 5 (`claude-opus-5`).
  - Review (security and compliance scope): a Claude subagent with the `opus` model alias; the runtime did not expose the exact model ID.
  - No `cursor-agent` call was made.
- **Claude direct fixes:** every step was Claude-executed, by design (spec A2).
- **Review findings (all applied):**
  - F1 — the PDPC 3-day clock is now stated correctly, and the identity dependency is left to OQ-1.
  - F2 — per the ADRs, #175 records which rate-limit control is in force, and a rate-limit test is assigned to #175.
  - F3 — the header proof moved to `curl` in #83 plus an e2e assertion in #85.
  - F4 — K2 (`ai-pipeline` vs RV-1).
  - F5 — the invented prompt-injection and filter test paths were replaced with gap assignments.
  - F6 — K3 (text-only nationality and language preferences).
  - F7 — K1 no longer argues for one option.
  - F8 — the provider-side cap is credited to #93.
  - F9 — scope extensions are marked as gaps.
  - F10 — RV-1 is now Open, with a "Found by" line.
  - F11 — "at least" is removed from the real-data list.
  - F12 — the eval-plan path is attributed to #79.
  - F13 — this Outcome.
- **Follow-ups:**
  1. Carry the gap assignments into the specs of #83, #85, #89, #92, #175, #127, #139, #142, #148, #153, #180 and #179. #83, #85 and #89 are handled in this run's Epic #2 PRs.
  2. Resolve K1 (`last_activity_at`), K2 (align the `ai-pipeline` redaction line with RV-1) and K3 (#141's spec).
