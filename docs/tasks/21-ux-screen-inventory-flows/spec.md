# Spec — #21 The UX structure is agreed before any screen is designed

| | |
|---|---|
| Issue | https://github.com/dczii/URecruitment/issues/21 (Story) |
| Tasks | #75 (E00-S03-T01) |
| Parent | Story #21 → Epic #1 "Decisions, architecture & delivery plan" |
| Milestone | MVP |
| Branch | `docs/21-ux-screen-inventory-flows` (stacked on `docs/20-open-questions-register`) |
| Created | 2026-09-17 |
| Status | In review <!-- Planned → In progress → In review --> |

## Problem

The PRD lists nine MVP screens in one table and five design rules in another. Nothing yet says how
the screens connect, which ones a recruiter reaches from the navigation, how each behaves on a phone,
or which design task owns it. If the eight E02 design tasks start from the PRD table alone, each
screen gets designed in isolation. Navigation then gets invented per screen, and the phone-width
rule gets checked only where someone remembers it. This story fixes the information architecture and
the three daily journeys first, so the designs join up.

## PRD references

| PRD section | Item | Status |
|---|---|---|
| UI design → MVP screens | Nine screens: Dashboard, Jobs, Job detail, Job form, Candidate search, Candidate profile, Pipeline board, Placements, Settings, with purpose and key elements | **decided** |
| UI design → Design rules 1–5 | AI suggestion label and source text; delay status not colour-only; Noto Sans SC; dashboard and board usable at phone width; name prompt before the first change | **proposed** |
| UI design | *"The portal must work in desktop and mobile browsers."* | **decided** |
| CV processing → Requirements 2 | Failed files go to a review queue with the reason | **proposed** |
| Pipeline tracking → Pipeline, Delay detection 1–5, After Placed | Seven stages and three end states; delay statuses; waiting on; dashboard ordering and filters; dashboard only, no email; guarantee flag | **decided** / **proposed** as marked in the PRD |
| Users → 3 | *"Actions are tied to a typed name, not a verified person."* | **decided** |
| Architecture → Main flows 2, 3, 5 | No AI call on page load; save creates a version, gap check, `after()` re-score; delay status from a view | **proposed** |

## Scope

**In scope**

- `docs/ux/screen-inventory.md`: for each screen, its purpose, the PRD key elements, entry points,
  what it leads to, phone-width behaviour, the rules it must show, its states, and its owning design
  and build tasks. Also the navigation model at desktop and phone width, and the five PRD design rules
  restated as checkable constraints.
- `docs/ux/flows.md`: find candidates for a job and shortlist them; move a candidate and record my
  name; clear today's overdue list. Each flow is mapped screen by screen with every state change.
- The CV review queue and the typed-name prompt, flagged for product-owner confirmation and linked to
  RC-2 in the open-questions register.

**Out of scope**

- Any `.pen` file or visual design (E02).
- Token values ([#94](https://github.com/dczii/URecruitment/issues/94)).
- Component APIs ([#99](https://github.com/dczii/URecruitment/issues/99)).
- The phone layout choice for the pipeline board
  ([#104](https://github.com/dczii/URecruitment/issues/104)).
- Any feature the PRD does not list.

## Acceptance criteria

- [x] **AC1** — Given the PRD screen list, when I read `docs/ux/screen-inventory.md`, then every screen shows its purpose, its key elements, its phone-width behaviour and the design task that will draw it. _Proved by:_ `V4`.
- [x] **AC2** — Given a recruiter's day, when I read the flows, then "find candidates for a job", "move a candidate and record my name" and "clear today's overdue list" are each mapped end to end across screens. _Proved by:_ `V5`.
- [x] **AC3** — Given two screens are implied by the requirements but absent from the PRD screen list (the CV review queue and the typed-name prompt), when the inventory is written, then both are marked as needing the product owner's confirmation. _Proved by:_ `V6`.
- [x] **AC4** (#75) — All nine PRD screens plus the review queue and name prompt appear with purpose and owning design task. _Proved by:_ `V4`.
- [x] **AC5** (#75) — The three flows each name every screen and state change they cross. _Proved by:_ `V5` (every step row has a Screen and a State-change cell; each flow ends with "Screens crossed" and "Tables written", and those match its steps).
- [x] **AC6** (#75) — The navigation model says what is in the primary navigation on desktop and what collapses on a phone. _Proved by:_ `V7`.
- [x] **AC7** (#75) — The five PRD design rules are restated as constraints every screen design must show. _Proved by:_ `V7` (rules R1–R5 quoted verbatim from the PRD).
- [x] **AC8** — Only files under `docs/` change, every relative link and anchor resolves, every issue number exists, and no secret appears. _Proved by:_ `V1`, `V2`, `V3`, `V8`.

## Guardrails that apply

- [x] **AI only suggests** — R1 and every flow mark AI output as a stored suggestion. Nothing is pre-selected or moved by the AI (flow checks table).
- [x] **No email sent** — Flow 3 makes the dashboard the only alert.
- [x] **Server-only data access** — flow 1.12 opens the CV through a server-created signed URL that is never stored.
- [ ] RLS on new tables — no schema.
- [x] **AI output shows source text** — R1; flows 1.3, 1.7, 1.10.
- [x] **Protected attributes** — flow 1.4 (a written reason is required) and 1.11 (protected terms are ignored in search).
- [x] **UTC stored, SGT shown** — both records state it; stage history shows Singapore time.
- [x] **Typed recruiter name** — R5, S11, and Flow 2 end to end.
- [x] **Phone width; status not colour-only; Chinese text** — R2, R3, R4 and a phone-width row for every screen.
- [x] **Fictional data only** — the only example name is a placeholder (*name*). No person appears.
- [x] **Free-tier limits** — Flow 3 records why delay status is a view, not a cron.

## UX / design

This task *is* the UX structure. No `.pen` frame is produced.

## Data / API changes

None. The flows *describe* writes to tables that E03 creates.

## Assumptions

- **A1 — One PR per story (user instruction), stacked on #20.** It is stacked because the inventory links to RC-2 in the register that #20 adds.
- **A2 — Claude writes it.** #75 carries `Executor hint: claude (judgment-heavy)`.
- **A3 — Primary navigation has five entries.** They are Dashboard, Jobs, Candidates, Placements and Settings, plus the review queue only if RC-2 confirms it. Job detail, the Job form and the Pipeline board need a job, and the PRD places the board inside Job detail. #96 says "navigation for the nine MVP areas". This record reads that as *reachability* of all nine, not nine top-level links, and says so. #96 can revisit it.
- **A4 — Phone navigation is a sheet,** because #97 already scopes "Mobile navigation in a sheet".
- **A5 — Three routes are proposed here** (`/jobs/[id]/edit`, `/jobs/[id]/pipeline`, `/search?job=`). The rest come from the build tasks' affected files. Every route is marked proposed, and the build task may rename it.
- **A6 — The pipeline board's phone layout is left to #104,** because `ui-design` assigns that choice to the design spec. This record fixes only the constraint: no horizontal *page* scroll.
- **A7 — "Clearing" the overdue list adds no feature.** The PRD has no snooze or acknowledge, so the flow clears rows only through real state changes (a move, an end state, a limit change). It says so explicitly rather than inventing a control.
- **A8 — The name prompt appears before any change,** including a job save and a start-date confirmation. PRD design rule 5 says *"first change"* without restricting the kind of change. What is *recorded* per change follows #167's scope.
- **A9 — Mermaid is used for the navigation map,** because GitHub renders it and it stays diffable. No image is added.
- **A10 — No test runner** (as #19 A8).

## Open questions

- **RC-2** (open-questions register): whether the CV review queue is an MVP screen, and whether the name prompt is a dialog. Both are flagged, and neither is settled here.
