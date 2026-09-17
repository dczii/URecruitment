# Open questions and decision log

## Status

**Living register** · created 2026-09-17 by [#74](https://github.com/dczii/URecruitment/issues/74)
(story [#20](https://github.com/dczii/URecruitment/issues/20), epic
[#1](https://github.com/dczii/URecruitment/issues/1))

This is the one place that lists everything URecruitment has **not** decided yet. Unlike an ADR, it is
**edited in place**: a row changes status when its answer arrives. The [decision log](#decision-log)
at the bottom only ever grows, and it holds the history.

> **Nothing in this register is answered unless the decision log says so.** Every row below is a
> question, not a recommendation. An "MVP position" describes what the build does *while the question
> is open*. It never describes the answer.

> **The MVP build is not blocked by the six PRD questions.** The PRD says so directly:
> *"Nothing blocks the MVP build. Six items remain for the real-data release, and three of them have a
> set point when they get decided."* All six belong to the real-data release. The three repo
> confirmations (RC-1…3) and the AI provider (DT-1) touch the MVP, and each says exactly what it
> blocks.

Read [README.md](README.md) for the status vocabulary the ADRs use. The PRD is
`docs/URecruitment-PRD.pdf` (17 Sep 2026), condensed in the `prd-context` skill.

## Rules for contributors

1. **An open question is never settled inside an implementation PR.** Not in code, a migration, a
   seed value, an env var, a prompt or a PR description. If a task cannot finish without the answer,
   it stops and says so.
2. **A task that depends on an open item carries the `needs-decision` label** and names the item's ID
   (for example `OQ-2` or `RC-1`) in its spec under *Open questions*. The row below lists that task
   under **Blocked tasks**, or under **Deciding issue** when the question is put to the owner or
   recorded there. Label and row change together, in the same PR.
3. **A question that is not here gets a row before work continues.** Add it with status **Open**, an
   empty owner slot, and the task that found it. Do not pick an answer to keep moving.
4. **Only the owner answers.** An answer is recorded in the [decision log](#decision-log) with its date,
   who gave it, where it was given, and every issue it unblocks. The row's status then becomes
   **Answered** and links to the log entry, and each unblocked issue loses `needs-decision`.
5. **An "MVP position" is a reversible default, never an answer.** A row may say what the MVP does
   meanwhile (for example "Vercel Hobby and Supabase Free", which the PRD decided for the MVP). It never
   presents that default as the resolution.
6. **Dates are Singapore calendar dates** (`YYYY-MM-DD`, SGT), matching `CLAUDE.md` hard rule 7.

### Status words

| Status | Meaning |
|---|---|
| **Open** | No answer, and the question has not yet been put to the owner. "(set point)" means the PRD says when it gets decided |
| **Awaiting owner** | The question has been, or is due to be, put to the owner. No answer yet |
| **Deferred** | Deliberately parked with a named trigger that reopens it. No decision issue exists yet |
| **Answered** | The owner answered. See the linked log entry |

## Summary

| ID | Question | Status | Decided when | Deciding issue | Blocked tasks |
|---|---|---|---|---|---|
| [OQ-1](#oq-1--what-must-be-in-place-before-real-cvs-are-loaded) | Prerequisites before real CVs | Open | Before real data; no set point | [#16](https://github.com/dczii/URecruitment/issues/16), [#15](https://github.com/dczii/URecruitment/issues/15) | Real-data epics (stubs) |
| [OQ-2](#oq-2--which-paid-plans-to-move-to) | Paid plans | Open | Before recruiters do real work | [#18](https://github.com/dczii/URecruitment/issues/18) | Real-data epics (stubs) |
| [OQ-3](#oq-3--how-backups-work-and-how-long-they-are-kept) | Backups and retention of backups | Open | Before real data | [#18](https://github.com/dczii/URecruitment/issues/18) | Real-data epics (stubs) |
| [OQ-4](#oq-4--the-duplicate-candidate-rule) | Duplicate-candidate rule | Open (set point) | After the MVP go/no-go | [#17](https://github.com/dczii/URecruitment/issues/17) | Real-data epics (stubs) |
| [OQ-5](#oq-5--the-real-data-release-date) | Real-data release date | Open (set point) | After the MVP go/no-go | [#181](https://github.com/dczii/URecruitment/issues/181) | Real-data epics (stubs) |
| [OQ-6](#oq-6--targets-for-the-four-success-metrics) | Success-metric targets | **Deferred** (set point) | Once Manatal baselines are exported | none; written deferral, carried by [#181](https://github.com/dczii/URecruitment/issues/181) | none |
| [RC-1](#rc-1--default-stage-limits) | Default stage limits | Awaiting owner | Before default limits are seeded | [#159](https://github.com/dczii/URecruitment/issues/159) | [#159](https://github.com/dczii/URecruitment/issues/159), [#121](https://github.com/dczii/URecruitment/issues/121) |
| [RC-2](#rc-2--screens-implied-by-the-requirements) | Implied screens: CV review queue, name prompt | Awaiting owner | Before the review-queue design is finalised | [#106](https://github.com/dczii/URecruitment/issues/106) | [#106](https://github.com/dczii/URecruitment/issues/106), [#131](https://github.com/dczii/URecruitment/issues/131) |
| [RC-3](#rc-3--vercel-hobby-and-commercial-use) | Vercel Hobby and commercial use | Open | Before recruiters are invited | [#92](https://github.com/dczii/URecruitment/issues/92) | none in the build |
| [DT-1](#dt-1--the-ai-provider) | AI provider | Open | When [ADR-0003](adr-0003-ai-provider.md) D6 is met | ADR-0003 → ADR-0004 | [#111](https://github.com/dczii/URecruitment/issues/111), [#145](https://github.com/dczii/URecruitment/issues/145), [#128](https://github.com/dczii/URecruitment/issues/128) |
| [DT-2](#dt-2--the-intake-mailbox) | Intake mailbox address | Open | Real-data release | [#14](https://github.com/dczii/URecruitment/issues/14) | Real-data epic (stub) |
| [DT-3](#dt-3--the-onedrive--sharepoint-folders) | OneDrive / SharePoint folders | Open | Real-data release | [#14](https://github.com/dczii/URecruitment/issues/14) | Real-data epic (stub) |
| [DT-4](#dt-4--converting-legacy-doc-files) | Converter for legacy `.doc` | Open (implementation choice) | Inside the seed task | none; chosen in [#118](https://github.com/dczii/URecruitment/issues/118)'s spec | none |

The real-data epics are [#14](https://github.com/dczii/URecruitment/issues/14) to
[#18](https://github.com/dczii/URecruitment/issues/18). They are stubs with no tasks yet, and each
already carries `needs-decision`.

---

## A. PRD open questions (real-data release)

The six questions are quoted **exactly** as the PRD writes them (*Open questions → Before real data*).
The PRD names no owner for any of them, so every **owner slot is empty** until the product owner fills
it. **Who the PRD points at** records only what the PRD text says about who is involved. It is not an
assignment.

### OQ-1 — What must be in place before real CVs are loaded

| | |
|---|---|
| PRD text | *"What must be in place before real CVs are loaded: sign-in, consent recording, the retention job, a legal review? No preference given yet, and no owner named"* |
| Status | **Open** |
| Owner slot | — *(unassigned; the PRD says "no owner named")* |
| Who the PRD points at | Nobody. Elsewhere the PRD notes that Microsoft 365 sign-in and office-network-only access are *"the cheapest fixes"* for Risk 1 |
| Decided when | Before any real CV is loaded. The PRD gives no set point |
| Why it matters | **Risk 1** (accepted for the MVP): *"Anyone who finds the portal's address could see every CV."* Loading real CVs without sign-in would break PDPA's Protection Obligation (PDPC can fine up to S$1 million or 10% of Singapore turnover for firms above S$10 million, whichever is higher) |
| MVP position | No sign-in, **fictional data only** (PRD, decided: *"The MVP has no sign-in, confirmed on 17 Sep 2026"*). This is not an answer to OQ-1 |
| Blocked tasks | Everything in the real-data release. [#16](https://github.com/dczii/URecruitment/issues/16) (access protection) says nothing there starts before this is decided |
| Deciding issue | [#16](https://github.com/dczii/URecruitment/issues/16) E15 for sign-in or network access; [#15](https://github.com/dczii/URecruitment/issues/15) E14 for consent recording and the retention job. The question is put to the owner in the go/no-go pack, [#181](https://github.com/dczii/URecruitment/issues/181) |
| What unblocks it | (1) an owner is named; (2) the compliance baseline ([#77](https://github.com/dczii/URecruitment/issues/77)) lists the candidate prerequisites; (3) the go/no-go pack ([#181](https://github.com/dczii/URecruitment/issues/181)) puts them to the product owner, PDPA protection first; (4) the owner decides which of sign-in, consent recording, the retention job and a legal review must be in place, and whether anything else is needed |

### OQ-2 — Which paid plans to move to

| | |
|---|---|
| PRD text | *"Which paid plans to move to, since Vercel Hobby doesn't allow commercial use and Supabase Free has no backups"* |
| Status | **Open** |
| Owner slot | — *(unassigned)* |
| Who the PRD points at | Nobody. The free-tier table's suggested response is *"Move to Vercel Pro before recruiters use the portal for real work"* |
| Decided when | Before recruiters use the portal for real work |
| MVP position | Vercel Hobby and Supabase Free (PRD *Technical architecture* → *Plans for the MVP*, **decided**) |
| Blocked tasks | The real-data release ([#18](https://github.com/dczii/URecruitment/issues/18), stub) |
| Deciding issue | [#18](https://github.com/dczii/URecruitment/issues/18) E17 *Paid plans & backups* |
| What unblocks it | An owner; a cost figure for the plans sized to the PRD's post-MVP scale (*"Under 1,000 CVs per month; 6–20 recruiters"*); the MVP's measured usage from the infrastructure plan's runbook |
| Related | [RC-3](#rc-3--vercel-hobby-and-commercial-use) asks whether the MVP itself already needs Pro |

### OQ-3 — How backups work and how long they are kept

| | |
|---|---|
| PRD text | *"How backups will work, and how long they are kept"* |
| Status | **Open** |
| Owner slot | — *(unassigned)* |
| Who the PRD points at | Nobody |
| Decided when | Before real data. The PRD's non-functional table says backups are *"None in the MVP; fictional data is re-seeded from the repo. Needed before real data"* (decided) |
| MVP position | No backups. Recovery is migrations plus a re-seed (PRD, decided) |
| Blocked tasks | The real-data release ([#18](https://github.com/dczii/URecruitment/issues/18), stub) |
| Deciding issue | [#18](https://github.com/dczii/URecruitment/issues/18) E17 *Paid plans & backups* |
| What unblocks it | OQ-2, because a backup policy depends on the plan chosen. The answer must also take account of the 12-month data-retention rule (PRD *Retention*, **decided**; built in [#15](https://github.com/dczii/URecruitment/issues/15)) |

### OQ-4 — The duplicate-candidate rule

| | |
|---|---|
| PRD text | *"Rule for spotting duplicate candidates, decided after the MVP go/no-go"* |
| Status | **Open** (has a set point) |
| Owner slot | — *(unassigned)* |
| Who the PRD points at | Nobody by name. The set point is the go/no-go decision |
| Decided when | After the MVP go/no-go |
| MVP position | Duplicate detection is a non-goal. Every sample file becomes its own candidate, and the seed logs likely resubmissions ([#123](https://github.com/dczii/URecruitment/issues/123)) as evidence for this decision |
| Blocked tasks | The real-data release ([#17](https://github.com/dczii/URecruitment/issues/17), stub) |
| Deciding issue | [#17](https://github.com/dczii/URecruitment/issues/17) E16 *Duplicate candidates* |
| What unblocks it | The go/no-go decision ([#181](https://github.com/dczii/URecruitment/issues/181)) and the seed's likely-resubmission report |

### OQ-5 — The real-data release date

| | |
|---|---|
| PRD text | *"Real-data release date, set after the MVP go/no-go"* |
| Status | **Open** (has a set point) |
| Owner slot | — *(unassigned)* |
| Who the PRD points at | The go/no-go decision. [#181](https://github.com/dczii/URecruitment/issues/181) records that the product owner makes it |
| Decided when | After the MVP go/no-go. The PRD release plan says: *"No date; depends on the MVP outcome"* |
| MVP position | Not scheduled |
| Blocked tasks | Scheduling of every real-data epic ([#14](https://github.com/dczii/URecruitment/issues/14)–[#18](https://github.com/dczii/URecruitment/issues/18), stubs) |
| Deciding issue | [#181](https://github.com/dczii/URecruitment/issues/181) E12-S03-T01 *Assemble the go/no-go pack and record the decision* puts it to the product owner at go/no-go and records the owner's decision. **#181 itself settles nothing**; its scope says so |
| What unblocks it | A "go" decision, and answers to OQ-1, OQ-2 and OQ-3, which the date depends on |

### OQ-6 — Targets for the four success metrics

| | |
|---|---|
| PRD text | *"Targets for the four success metrics, set once Manatal baselines are exported"* |
| Status | **Deferred**, with a set point |
| Owner slot | — *(unassigned for the targets)* |
| Who the PRD points at | The **baselines**: *"Agency ops/admin export baselines from Manatal before it is switched off"*. The PRD lists "baseline owner" among the items resolved on 17 Sep 2026. It names nobody for the **targets** |
| Decided when | Once the Manatal baselines are exported |
| The four metrics | Time to shortlist · Recruiter time saved · Overdue candidates · Placements (PRD *Goals, non-goals & success metrics*). They *"apply from the real-data release"* |
| MVP position | No targets. The MVP is judged by recruiter feedback and the quality bar, not by these metrics |
| Blocked tasks | none. No MVP task measures these metrics |
| Deciding issue | **None. This is an explicit written deferral.** No backlog issue sets metric targets, and the trigger (the export) happens outside this repository. [#181](https://github.com/dczii/URecruitment/issues/181) carries the question into the go/no-go pack |
| What unblocks it | **The trigger:** ops/admin confirm that the Manatal baseline export exists. At that point a `needs-decision` issue is created under the real-data release and linked here |
| Risk if left | Manatal is switched off before the export and the baselines are lost. The go/no-go pack should restate that timing |

---

## B. Repo-level confirmations (MVP)

These are not in the PRD's open-questions list. They are points where the project skills found the PRD
ambiguous or silent **and** an MVP task needs a clear answer. Each one has a `needs-decision` task.

### RC-1 — Default stage limits

| | |
|---|---|
| Source | PRD *Pipeline tracking & delays → Pipeline (approved)*; `prd-context` → `references/pipeline-rules.md` |
| The values as read | Sourced **2** · Screening **3** · Shortlisted **2** · Submitted to client **5** · Client interview **7** · Offer **5** working days (Placed: none). Waiting on: Recruiter, Recruiter, Recruiter, Client, Client / candidate, Candidate |
| Why it is a question | The PRD **approved** the table, but the PDF table was partly garbled in the first text extraction around Screening and Shortlisted. A clean extraction reads the values above without ambiguity. The owner is asked to confirm the **reading**, not to redesign the table |
| Status | **Awaiting owner** |
| Owner slot | Product owner (the table is theirs). Not yet asked |
| Decided when | Before the seed writes any default limit |
| MVP position | Tests use explicit fixture limits. **No default limit is seeded until the owner confirms** ([#159](https://github.com/dczii/URecruitment/issues/159) says so) |
| Blocked tasks | [#159](https://github.com/dczii/URecruitment/issues/159), its seeding step. [#121](https://github.com/dczii/URecruitment/issues/121) (back-dated entries), because its back-dated spread is computed against the default limits, which are unconfirmed, and its DB test proves all three delay statuses after seeding |
| Not blocked | The delay view ([#158](https://github.com/dczii/URecruitment/issues/158)) and the limit resolver ([#157](https://github.com/dczii/URecruitment/issues/157)). Their tests use fixture limits |
| Deciding issue | [#159](https://github.com/dczii/URecruitment/issues/159) E08-S02-T03 *Confirm the default stage limit table with the product owner* |
| What unblocks it | The owner says yes or gives corrections. #159 writes the answer to the decision log and seeds only confirmed values |

### RC-2 — Screens implied by the requirements

| | |
|---|---|
| Source | PRD *UI design → MVP screens* (nine screens, **decided**); *CV processing → Requirements 2* (**proposed**); *Design rules 5* (**proposed**) |
| The question | Two screens are implied by the requirements but absent from the PRD's screen list: **(a) the CV review queue**, from *"A file that fails to parse goes to a review queue with the reason"*, and **(b) the typed-name prompt**, from *"Before a recruiter's first change on a device, the portal asks for their name"*. Are both in the MVP as designed screens? |
| Status | **Awaiting owner** |
| Owner slot | Product owner. Not yet asked |
| Decided when | (a) before the review-queue design is finalised; (b) alongside it |
| MVP position | (a) The queue's **query and retry action** ([#130](https://github.com/dczii/URecruitment/issues/130)) are built, because requirement 2 is stated; only the **screen** waits. (b) Recording the typed name is binding (PRD security control 4; `CLAUDE.md` hard rule 8). The PRD words the prompt two ways: design rule 5 says *"Before a recruiter's first change on a device, the portal asks for their name"*, while the Pipeline board row says *"typed-name prompt on each move"*. So the owner confirms its **form**. The remembered-name dialog designed in [#98](https://github.com/dczii/URecruitment/issues/98) and built in [#99](https://github.com/dczii/URecruitment/issues/99) and [#167](https://github.com/dczii/URecruitment/issues/167) (asked once per device, then shown on each move with "not you?") is a reversible default, so (b) blocks nothing |
| Blocked tasks | [#106](https://github.com/dczii/URecruitment/issues/106) (design the review queue), [#131](https://github.com/dczii/URecruitment/issues/131) (build it) |
| Deciding issue | [#106](https://github.com/dczii/URecruitment/issues/106) E02-S04-T07 *Design the CV review queue screen* |
| What unblocks it | The owner confirms (a) and (b). #106 records the answer here before the review-queue design is finalised. The screen inventory (story [#21](https://github.com/dczii/URecruitment/issues/21), task [#75](https://github.com/dczii/URecruitment/issues/75)) will flag both for the owner |

### RC-3 — Vercel Hobby and commercial use

| | |
|---|---|
| Source | PRD *Free-tier limits and risks*, row *"Vercel Hobby is for non-commercial, personal use only"*: effect *"Using it for agency work breaks Vercel's terms"*; suggested response *"Move to Vercel Pro before recruiters use the portal for real work"*. PRD *Technical architecture* → *Plans for the MVP*: Vercel Hobby and Supabase Free (**decided**) |
| The question | Where exactly is the line? Does inviting recruiters to MVP feedback sessions on **fictional** data count as "agency work" under Vercel's terms, or does the move to Pro wait for real work on real data (OQ-2)? |
| Status | **Open** |
| Owner slot | — *(unassigned; it is a spend and terms decision)* |
| Decided when | Before recruiters are invited to the MVP |
| MVP position | Hobby, as the PRD decided. `release-deploy` says the move to Pro is *"an open decision; raise it, don't do it"* |
| Blocked tasks | None in the build |
| Checked by | The release-readiness check ([#179](https://github.com/dczii/URecruitment/issues/179)) restates this row's status before recruiters are invited. Its scope already says so, and it does not need the answer to finish |
| Deciding issue | [#92](https://github.com/dczii/URecruitment/issues/92) E01-S04-T01 *Configure the Vercel project, regions and per-environment variables* records the question as open and links here. **It does not decide it**; its scope excludes choosing a plan |
| What unblocks it | An owner, and the terms read for the MVP's actual use. If the answer is "Pro now", this row feeds OQ-2 |
| Related | [ADR-0001](adr-0001-architecture.md) says the MVP on fictional data *"is fine"* on Hobby, and the PRD release plan runs the feedback sessions on Hobby: *"Runs on Vercel Hobby and Supabase Free. Ends with recruiter feedback sessions and a go/no-go decision"*. Neither is a reading of Vercel's terms, so this row keeps the question open. If the answer is "Pro now", a new ADR supersedes that part of ADR-0001 in the same PR |

---

## C. Dev-team setup decisions

The PRD closes with: *"Remaining setup details are for the dev team: the AI provider, the intake
mailbox, the OneDrive folders and converting legacy .doc files."* The **ownership** is decided (the dev
team). The **choices** are not. They are listed here so the register is complete. Each one lives in its
own record or issue.

### DT-1 — The AI provider

| | |
|---|---|
| Status | **Open**. Held open by [ADR-0003](adr-0003-ai-provider.md) |
| Owner slot | Dev team (PRD, decided). No individual named; naming one is ADR-0003 D6 step 0 |
| Decided when | When the five conditions in ADR-0003 D6 are met. The PRD sets no date, but the eval gate cannot pass before a real model runs |
| Deciding issue | None of its own. [#73](https://github.com/dczii/URecruitment/issues/73), now closed, created ADR-0003 as the holding record. The answer is a new record, ADR-0004 |
| Blocked tasks | [#111](https://github.com/dczii/URecruitment/issues/111) (vector dimension), [#145](https://github.com/dczii/URecruitment/issues/145) (embedding model), [#128](https://github.com/dczii/URecruitment/issues/128) (PDF file input). See ADR-0003 D5. All three carry `needs-decision` |
| Buildable meanwhile | Everything else, against the contract in ADR-0003 D2 |
| What unblocks it | The five conditions in ADR-0003 D6. The answer is recorded as `adr-0004-ai-provider-selection.md`, which supersedes ADR-0003, **and** as an entry in the decision log below |

### DT-2 — The intake mailbox

| | |
|---|---|
| Status | **Open** |
| Source | PRD *Integrations*, row *"Intake mailbox"*: used for *"Receiving emailed CVs"*, release *"Real-data release"*, still to decide *"Address, set up later by the dev team"* |
| Owner slot | Dev team (PRD, decided). No individual named |
| Decided when | During the real-data release |
| Blocked tasks | Real-data release only ([#14](https://github.com/dczii/URecruitment/issues/14), stub) |
| Deciding issue | [#14](https://github.com/dczii/URecruitment/issues/14) E13 *Real CV intake*, once it has stories |
| What unblocks it | A "go" decision ([#181](https://github.com/dczii/URecruitment/issues/181)) and OQ-1 |
| Note | The portal **receives** CVs by email in that release and **never sends** email (`CLAUDE.md` hard rule 2) |

### DT-3 — The OneDrive / SharePoint folders

| | |
|---|---|
| Status | **Open** |
| Source | PRD *Integrations*, row *"OneDrive / SharePoint"*: used for a *"One-time import of CVs changed in the last 12 months"*, release *"Real-data release"*, still to decide *"Which folders"* |
| Owner slot | Dev team (PRD, decided). No individual named |
| Decided when | During the real-data release |
| Blocked tasks | Real-data release only ([#14](https://github.com/dczii/URecruitment/issues/14), stub) |
| Deciding issue | [#14](https://github.com/dczii/URecruitment/issues/14) E13 *Real CV intake*, once it has stories |
| What unblocks it | A "go" decision ([#181](https://github.com/dczii/URecruitment/issues/181)) and OQ-1. Risk 2 (resolved) already fixes the import window at 12 months |

### DT-4 — Converting legacy `.doc` files

| | |
|---|---|
| Status | **Open** (implementation choice) |
| Source | PRD *AI pipeline → Text extraction*: *"Legacy .doc files need a converter, which serverless functions can't run easily. For the MVP, the seed script converts them first"* |
| Owner slot | Dev team (PRD, decided) |
| MVP position | Where the conversion happens is **proposed** (PRD *AI pipeline (suggested)*): in the seed script. **Which converter** is chosen and recorded by the seed task |
| Decided when | When the seed task is planned |
| Blocked tasks | none |
| Where it is chosen | In the spec of [#118](https://github.com/dczii/URecruitment/issues/118) E03-S04-T02. This is an implementation choice inside that task, not a product question, so it carries no `needs-decision` label |
| What unblocks it | Nothing external. The converter must run on a developer machine or in CI, never in a serverless function |

---

## D. Already resolved, so do not reopen

The PRD records these as settled. They are listed so nobody mistakes them for open questions.

| Item | Where it is decided |
|---|---|
| No sign-in in the MVP | PRD *Users*: *"The MVP has no sign-in, confirmed on 17 Sep 2026"* |
| CV fields, ignored attributes, guarantee period, devices, performance targets, baseline owner, external source approver | PRD closing note: *"Resolved on 17 Sep 2026"* |
| Who picks the AI provider | PRD *AI governance*: *"The dev team picks the AI provider (decided)"* |
| MVP plans and backups | PRD *Technical architecture*: Vercel Hobby + Supabase Free; no backups (**decided**) |
| Sample-data source | Public Vercel Blob store, seed source only (`prd-context` → `references/sample-data.md`: *"decided by the product owner, 17 Sep 2026"*) |

---

## Decision log

Answers are **appended**. An entry is never edited, except to fix a broken link. A reversed decision
gets a new entry that names the one it replaces.

**Every entry needs all six columns.** An entry without a date, or without the issues it unblocks
(or an explicit "none"), is incomplete and fails review.

| Date (SGT) | ID | Decision | Decided by | Where it was given | Unblocks |
|---|---|---|---|---|---|
| 2026-09-17 | — | The MVP has no sign-in. Risk 1 is accepted **for fictional data only**. This does **not** answer OQ-1 | Product owner | PRD *Users* and *Data, privacy & compliance → Risk 1*; attributed to the product owner by the PRD's opening note (*"Decisions come from Q&A with the product owner on 17 Sep 2026"*) | None. No issue was blocked; it was resolved before the backlog existed |
| 2026-09-17 | — | Resolved: CV fields, ignored attributes, guarantee period, devices, performance targets, baseline owner and external source approver | Product owner | PRD closing note (*"Resolved on 17 Sep 2026"*); attributed as above | None. No issue was blocked; it was resolved before the backlog existed |
| 2026-09-17 | — | The sample-data source is a public Vercel Blob store, used as the seed source only. The app stores files in private Supabase Storage | Product owner | `prd-context` → `references/sample-data.md` | Seed tasks [#117](https://github.com/dczii/URecruitment/issues/117)–[#123](https://github.com/dczii/URecruitment/issues/123) |

### Recording an answer

1. Append a row with the **date** (SGT), the **ID**, the **decision** in the owner's words (or a
   faithful summary with a link), **who decided**, **where** (meeting note, issue comment, or PRD
   revision), and **every issue it unblocks**.
2. Set the row's status above to **Answered**, and link the log entry from it.
3. Remove `needs-decision` from each unblocked issue. Keep it on anything still waiting on another item.
4. If the answer changes an ADR, write the superseding ADR in the same PR.
5. If the answer changes the PRD condensation (`prd-context`), update the skill in the same PR, as
   [#159](https://github.com/dczii/URecruitment/issues/159) does for the stage-limit note.
