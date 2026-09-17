# Plan — #20 Every PRD open question has an owner and a decision issue

Spec: [spec.md](./spec.md) · Branch: `docs/20-open-questions-register` · Created: 2026-09-17

## Approach

Write one living register, `docs/decisions/open-questions.md`, next to the ADRs. It is not an ADR.
An ADR is superseded, never edited, while the register is edited in place every time an answer
arrives. The history lives in its decision log, where entries are only ever added.

The register has four groups:

- **OQ-1…6**, the PRD's six open questions, quoted verbatim;
- **RC-1…3**, the repo-level MVP confirmations;
- **DT-1…4**, the dev-team setup decisions, cross-referenced to where each one lives;
- a short list of what the PRD already resolved, so nobody re-opens it.

Every row names its deciding issue or carries an explicit written deferral.

Two alternatives were rejected. Keeping the questions only as GitHub issues gives the owner no
single view, and the six real-data questions sit on stub epics nobody opens. Folding them into
ADR-0001 would bury questions that change often inside a record that must not change.

## Skills in scope

- `prd-context`: required. Supplies the six questions (verified verbatim against the PDF), the stage table, the implied screens, the free-tier limits and the dev-team setup list.
- `testing`: required. It confirms that no test runner applies: no logic, and no `package.json` until #83.
- `github-workflow`: required. Covers the branch, the commits, the `Closes` lines, the Project 4 moves and the `needs-decision` label on #111/#145/#128.
- `security-check`: the public-repo rule. The register must not name the sample-data store URL or any token.
- `compliance-review`: OQ-1 is the PDPA protection question. The register must record Risk 1 as accepted for fictional data only and must not soften it.
- `release-deploy`: RC-3 and OQ-2/OQ-3. It lists Hobby as non-commercial ("raise it, don't do it").

## Files

| File | Change |
|---|---|
| `docs/decisions/open-questions.md` | new — the register and decision log |
| `docs/decisions/README.md` | modify — index row for the register |
| `docs/tasks/20-open-questions-register/spec.md` | new |
| `docs/tasks/20-open-questions-register/plan.md` | new |

## Dependencies

- none

## Steps

- [ ] **S1** `claude` — Write `docs/decisions/open-questions.md` (AC1, AC3, AC4, AC5, AC6).
  - Rules: `prd-context` (quote the open questions unchanged; "never settle it silently"), `release-deploy` (Hobby is "an open decision; raise it, don't do it"), `compliance-review` (Risk 1 "accepted risk for fictional data only").
  - Verify: `V4`, `V6`, `V7`.
- [ ] **S2** `claude` — Add the register to the `docs/decisions/README.md` index.
  - Verify: `V2`.
- [ ] **S3** `claude` — Label #111, #145 and #128 `needs-decision` (AC2).
  - Rules: `github-workflow` (`needs-decision` means "Blocked on a PRD open question or product call"). ADR-0003 consequence 5.
  - Verify: `V5`.
- [ ] **S4** `none` — Full verification `V1`–`V8`, then Claude review (`pr-review` + `compliance-review` + `security-check` scope).

## Test plan

**No automated tests are added.** The change adds no logic and no application code, and `npm test`
does not exist until #85. The evidence is the shell checks below.

| AC | Test or manual evidence | Type / reason |
|---|---|---|
| AC1 | `V4` | docs-only; scripted check |
| AC2 | `V5` | GitHub state; scripted check |
| AC3 | `V6` | docs-only; scripted check |
| AC4 | `V4`, `V5` | docs-only; scripted check |
| AC5 | `V7` + review | docs-only; each log entry's source read by the reviewer |
| AC6 | `V4` | docs-only; scripted check |
| AC7 | `V1`, `V2`, `V3`, `V8` | docs-only; scripted check |

## Verification

```
V1  git diff --name-only origin/main...HEAD | grep -v '^docs/'          # must be empty
V2  every relative markdown link in the changed files resolves
V3  git diff origin/main...HEAD | grep -nEi "(secret|api[_-]?key|token|password|service_role|eyJ[a-zA-Z0-9_-]{10,}|sk-[a-zA-Z0-9]{10,}|vercel_blob_rw_|blob\.vercel-storage\.com)"   # only env var names
V4  OQ-1..OQ-6 rows present, each with the verbatim PRD sentence, a status, an owner slot, a deciding issue or deferral, and an unblock condition; RC-1..RC-3 present; the "Nothing blocks the MVP build" sentence present
V5  every open task the register names as blocked or deciding carries needs-decision (gh issue view)
V6  decision log has Date and Unblocks columns; the procedure names both as required
V7  every decision-log entry cites a source that attributes it to the product owner
V8  every #N / issues/N reference in the changed files exists (gh api)
```

`npm run lint`, `typecheck`, `test`, `build`, `test:e2e`, `test:db` and `eval` are n/a because the repository is not scaffolded until #83.

## Risks & rollback

- **Risk: an owner is implied where none was named.** Mitigated by A3 (the owner slot stays blank) and by review.
- **Risk: the register drifts from issue labels.** Rule 2 in the register and `V5` tie them together. A later task that adds or clears a question updates both in the same PR.
- **Rollback:** revert the commit and remove the three labels.

## Outcome

<!-- Filled after execution. -->
