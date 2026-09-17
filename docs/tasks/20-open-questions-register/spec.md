# Spec — #20 Every PRD open question has an owner and a decision issue

| | |
|---|---|
| Issue | https://github.com/dczii/URecruitment/issues/20 (Story) |
| Tasks | #74 (E00-S02-T01) |
| Parent | Story #20 → Epic #1 "Decisions, architecture & delivery plan" |
| Milestone | MVP |
| Branch | `docs/20-open-questions-register` (stack base: `main`) |
| Created | 2026-09-17 |
| Status | In progress <!-- Planned → In progress → In review --> |

## Problem

The PRD (17 Sep 2026) ends with six open questions, and the project skills add three MVP
confirmations of their own: the default stage limits, the CV review-queue screen and whether Vercel
Hobby's non-commercial terms cover the MVP. These questions are currently scattered across the PDF,
the skills and a handful of issue bodies. Nothing gives the product owner one place to see what is
waiting on them, and nothing stops an implementation PR from quietly picking an answer because it
was convenient. This story creates that one place, with a rule contributors follow.

## PRD references

| PRD section | Item | Status |
|---|---|---|
| Open questions | *"Nothing blocks the MVP build. Six items remain for the real-data release, and three of them have a set point when they get decided."* | **open** (all six) |
| Open questions → 1 | What must be in place before real CVs are loaded: sign-in, consent recording, the retention job, a legal review. No owner named | **open** |
| Open questions → 2, 3 | Which paid plans; how backups work and how long they are kept | **open** |
| Open questions → 4, 5 | Duplicate rule; real-data release date — both set after the MVP go/no-go | **open** |
| Open questions → 6 | Targets for the four success metrics, set once Manatal baselines are exported | **open** |
| Pipeline tracking → Pipeline (approved) | Default stage limits: Sourced 2, Screening 3, Shortlisted 2, Submitted to client 5, Client interview 7, Offer 5 | **decided** (approved), reading to be confirmed before seeding |
| CV processing → Requirements 2 | A file that fails to parse goes to a review queue with the reason | **proposed** |
| UI design → MVP screens / design rule 5 | Nine screens listed; the review queue and the name prompt are not among them | **decided** (list) / **proposed** (rule) |
| Free-tier limits → Vercel Hobby | Non-commercial use only; move to Pro before recruiters use the portal for real work | **decided** (as a limit and response) |
| Open questions → closing note | The AI provider, intake mailbox, OneDrive folders and `.doc` conversion are setup details for the dev team | **decided** (ownership) / **open** (the choices) |

## Scope

**In scope**

- `docs/decisions/open-questions.md`: one row per question with its status, owner slot, when it is
  decided, what it blocks, the deciding issue and what unblocks it.
- The six PRD open questions, quoted verbatim.
- The three repo confirmations: default stage limits (#159), the CV review-queue screen (#106) and
  Vercel Hobby commercial use (#92).
- The dev-team setup decisions, cross-referenced to where each one lives (ADR-0003 for the AI provider).
- The contributor rule: an open question is never settled inside an implementation PR.
- A decision log with a fixed entry format. It holds only answers the product owner has actually given.
- An index entry in `docs/decisions/README.md`.
- The `needs-decision` label on the three tasks ADR-0003 D5 names as blocked on the provider
  (#111, #145, #128). This is needed for AC2.

**Out of scope**

- Answering any question.
- Creating new decision issues. They already exist in the backlog and are linked, not duplicated.
- Editing issue bodies or posting issue comments.

## Acceptance criteria

- [ ] **AC1** — Given the PRD lists six open questions, when I open `docs/decisions/open-questions.md`, then each one shows its status, owner slot, what unblocks it and the issue that will decide it. _Proved by:_ `V4` (six OQ rows, verbatim PRD text, all columns filled).
- [ ] **AC2** — Given an item is open, when a task depends on it, then that task carries the `needs-decision` label and names the open question. _Proved by:_ `V5` (every issue in a "Blocks"/"Deciding issue" cell that is an open task carries `needs-decision`); the register's rule 2 obliges the task spec to name the ID.
- [ ] **AC3** — Given a question is answered, when the register is updated, then the answer is recorded with its date and the issues it unblocks. _Proved by:_ `V6` (the decision log has a Date and an Unblocks column, and the procedure says both are required).
- [ ] **AC4** (#74) — All six PRD open questions and the three repo confirmations appear, each linked to its `needs-decision` issue or to an explicit written deferral. _Proved by:_ `V4`, `V5`.
- [ ] **AC5** (#74) — No entry records an answer that the product owner has not given. _Proved by:_ `V7` (every log entry cites a source that attributes it to the product owner) and review.
- [ ] **AC6** (#74) — The register states that MVP build is not blocked by the six PRD questions. _Proved by:_ `V4` (verbatim PRD sentence present).
- [ ] **AC7** — Only files under `docs/` change, every relative link resolves, every linked issue number exists, and no secret appears. _Proved by:_ `V1`, `V2`, `V3`, `V8`.

## Guardrails that apply

- [x] **AI only suggests** — the register records the AI provider as a dev-team decision (ADR-0003). It does not touch AI behaviour.
- [ ] No email sent — nothing here sends anything.
- [ ] Server-only data access — no code.
- [ ] RLS / Storage — no schema.
- [ ] AI output schema-validated — no AI code.
- [ ] Protected attributes — not touched.
- [ ] UTC / SGT — dates in the log are calendar dates in Singapore time, which the register states.
- [ ] Typed recruiter name — no code.
- [ ] Phone width — no UI.
- [x] **Fictional data only; no secrets or Blob URLs** — the register mentions no store URL, token or person.
- [x] **Free-tier limits respected** — the Hobby question (RC-3) is recorded as open, not worked around.

## UX / design

n/a (documentation only).

## Data / API changes

None.

## Assumptions

- **A1 — One PR for the story.** The user asked for one PR per story, stacked. This story has one task, so the PR matches the orchestrator's "one Task, one PR" rule anyway. The PR also closes the story, as PR #183 did.
- **A2 — Claude writes it.** #74 carries `Executor hint: claude (judgment-heavy)`. The register is a list of quotations and cross-references, so correctness depends on checking each one against the PRD and the backlog.
- **A3 — Owner slots stay empty.** The PRD names no owner for any of the six questions ("no owner named" appears only on question 1, but no question names one). Filling a name would be a decision the product owner has not made. The register shows who the PRD *points at* in a separate column and leaves the owner slot blank.
- **A4 — Question 6 gets a written deferral, not a new issue.** The epic's exit criterion allows "a decision issue labelled `needs-decision`, or an explicit written deferral". No backlog issue sets metric targets, and #74 forbids creating issues. The deferral names its trigger (the Manatal baseline export) and #181 carries the question into the go/no-go pack.
- **A5 — The name prompt is recorded with RC-2 but not as blocking.** It is absent from the PRD screen list, but its behaviour is stated twice in the PRD (design rule 5, security control 4) and is `CLAUDE.md` hard rule 8. Only its form as a dialog rather than a screen needs confirming. Story #21 flags it for the owner.
- **A6 — The provider-blocked tasks get the label now.** ADR-0003 D5 (merged) already says #111, #145 and #128 are blocked, and its consequence 5 says their issues carry `needs-decision`. Applying the label is the step PR #183 left as follow-up 3. Removing a label is reversible.
- **A7 — The decision log starts with PRD-resolved items only.** The only entries are ones the PRD or `prd-context` attributes to the product owner on 17 Sep 2026. The answer-key drafting rule is left out because its source does not name who decided it.
- **A8 — No test runner.** As in #19 (spec A8), verification is a set of shell checks. `package.json` arrives with #83.

## Open questions

All nine items are recorded as open. None is settled here.
