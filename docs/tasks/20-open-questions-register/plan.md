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
- `github-workflow`: required. Covers the branch, the commits, the `Closes` lines, the Project 4 moves and the `needs-decision` label on #111/#145/#128/#121.
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

- [x] **S1** `claude` — Write `docs/decisions/open-questions.md` (AC1, AC3, AC4, AC5, AC6).
  - Rules: `prd-context` (quote the open questions unchanged; "never settle it silently"), `release-deploy` (Hobby is "an open decision; raise it, don't do it"), `compliance-review` (Risk 1 "accepted risk for fictional data only").
  - Verify: `V4`, `V6`, `V7`.
- [x] **S2** `claude` — Add the register to the `docs/decisions/README.md` index.
  - Verify: `V2`.
- [x] **S3** `claude` — Label #111, #145, #128 and #121 `needs-decision` (AC2).
  - Rules: `github-workflow` (`needs-decision` means "Blocked on a PRD open question or product call"). ADR-0003 consequence 5.
  - Verify: `V5`.
- [x] **S4** `none` — Full verification `V1`–`V8`, then Claude review (`pr-review` + `compliance-review` + `security-check` scope).

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
- **Rollback:** revert the commit and remove the four labels.

## Outcome

- **Shipped:** `docs/decisions/open-questions.md`, the single register of everything undecided:
  - the six PRD open questions, quoted verbatim (OQ-1…6), with OQ-6 as an explicit written deferral;
  - the three repo confirmations (RC-1…3);
  - the four dev-team setup decisions (DT-1…4);
  - the items the PRD already resolved;
  - the contributor rules;
  - an append-only decision log with three PRD-attributed entries.

  The ADR index links to the register. #111, #145, #128 and #121 are now labelled `needs-decision`.
- **Changed files / areas:** `docs/decisions/open-questions.md` (new), `docs/decisions/README.md` (index section), this task's `spec.md` and `plan.md`. On GitHub, four issues were labelled.
- **Tests added or updated:** none. The change is documentation only, and there is no test runner before #85 (spec A8).
- **Verification:** all checks pass after the review fixes. V1 (docs only), V2 (links and anchors), V3 (no secret patterns) and V8 (every cited issue exists) ran through the scripted checker. V4 found all six PRD questions verbatim and every row fully populated. V5 confirmed `needs-decision` on every open task in a Blocked or Deciding cell (#14–#18, #92, #106, #111, #121, #128, #131, #145, #159, #181). V6 confirmed the log's Date and Unblocks columns and the completeness rule. V7: each log entry cites its PRD source and the product-owner attribution.
- **Deviations:**
  1. The DT-1…4 setup decisions and the "already resolved" list were added. #74 asks only for six questions and three confirmations, but the PRD's closing note lists the setup choices as undecided.
  2. #121 was labelled because RC-1 blocks it.
- **Fix rounds / escalations:** none on implementation. One review round: 5 major, 6 minor and 2 nit findings, all applied (listed below).
- **Models used:**
  - Planning, writing and verification: Claude Opus 5 (`claude-opus-5`).
  - Review: a Claude subagent run with the `opus` model alias; the runtime did not expose the exact model ID.
  - No `cursor-agent` call was made.
- **Claude direct fixes:** every step was Claude-executed by design (spec A2).
- **Review findings (all applied):**
  - F1: OQ-1 no longer implies which prerequisites are settled.
  - F2: OQ-3 no longer caps backup retention.
  - F3: #181 and #92 are described as putting or recording the question, not deciding it.
  - F4: RC-3 now cites ADR-0001's "is fine" and the PRD's sessions-on-Hobby release plan.
  - F5: #121's label is reflected in the spec and plan.
  - F6: RC-1's reason for blocking #121 is reworded.
  - F7: rule 2 now covers "Deciding issue".
  - F8: the two PRD wordings of the name prompt are recorded.
  - F9: `.doc` conversion location marked proposed.
  - F10: log entries state "None" for unblocks and their attribution.
  - F11: this Outcome.
  - F12: "Open" status definition clarified.
  - F13: the PRD section name is corrected.
- **Follow-ups:**
  1. Name DT-1 or RC-1, and tick "Depends on a PRD open question", in the bodies of #111, #145, #128 and #121. Add #159 to #121's *Depends on*. Sync `docs/backlog/roadmap/*.json`.
  2. A future superseding ADR reconciles ADR-0001's "Hobby … is fine" with RC-3 once the owner answers.
  3. #92's scope says it records the Hobby question "with an owner", but the register leaves that owner slot empty until one is named.
  4. #106, #159 and #92 write the owner's answer into this register when they run.
