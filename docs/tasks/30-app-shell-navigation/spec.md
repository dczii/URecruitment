# Spec — #30 [Story] Recruiters can navigate the portal on desktop and on a phone

| | |
|---|---|
| Issue | https://github.com/dczii/URecruitment/issues/30 |
| Tasks | #96 (E02-S02-T01), #97 (E02-S02-T02) |
| Parent | Story #30 → Epic #3 "Design system & screens" |
| Milestone | MVP |
| Branch | `feat/30-app-shell-navigation` |
| Base | `design/29-visual-language-tokens` (stacked on PR #201) |
| Created | 2026-09-18 |
| Status | In review <!-- Planned → In progress → In review --> |

## Problem

The portal has visual tokens but no shared frame or navigation. Recruiters cannot move predictably
between the five top-level MVP destinations, and later screens have no agreed desktop/phone
structure, page-header placement, or visible recruiter-name affordance. This Story designs that
frame and builds an accessible shell that works at 1440 px and 390 px.

## PRD references

| PRD section | Item | Status |
|---|---|---|
| UI design → MVP screens | Nine MVP screens and their purposes | **decided** |
| Non-functional requirements → Devices | Desktop and mobile browsers | **decided** |
| UI design → Design rule 4 | Dashboard and pipeline board are fully usable at phone width | **proposed** |
| UI design → Design rule 5 | Ask for the recruiter name before the first change on a device | **proposed** |
| Users / Security control 4 | MVP actions use a typed, remembered name rather than sign-in | **decided** |

## Scope

**In scope**
- `design/shell.pen` desktop (1440 px), phone (390 px), and phone-navigation-open frames.
- A readable `design/specs/shell.md` implementation contract.
- Persistent desktop navigation and a phone navigation sheet for Dashboard, Jobs, Candidates,
  Placements and Settings.
- A page header/content region, skip link, active destination treatment, and recruiter-name
  affordance at both widths.
- Placeholder pages for the five top-level destinations and `/` redirecting to `/dashboard`.
- Playwright coverage for one-click navigation, keyboard focus, sheet focus behaviour, and phone
  overflow.

**Out of scope**
- Individual screen content and contextual routes such as job detail, job form, candidate profile,
  and a job-specific pipeline board.
- The typed-name dialog, validation, persistence or audit writes (Stories #31 and later).
- The unconfirmed CV review queue navigation entry (RC-2).
- Data fetching, Supabase access, AI behaviour, animations, and motion design.

## Acceptance criteria

- [x] **AC1** (#96, #97) — Given the desktop app shell, when a recruiter inspects and follows the
  primary navigation, then Dashboard, Jobs, Candidates, Placements and Settings are visible and
  each destination is reachable in one click. _Proved by:_ `e2e/shell.spec.ts › AC1`.
- [x] **AC2** (#96, #97) — Given the shell at 390 px, when a recruiter opens the menu and navigates
  to every top-level destination, then the sheet is usable, its trigger regains focus on close,
  nothing is cut off, and no page scrolls horizontally. _Proved by:_
  `e2e/shell.spec.ts › AC2`.
- [x] **AC3** (#97) — Given keyboard-only use, when a recruiter tabs from the start of a page, then
  the skip link and every navigation target are reachable in reading order and focused targets have
  a visible token-based focus indicator. _Proved by:_ `e2e/shell.spec.ts › AC3`.
- [x] **AC4** (#96, #97) — Given either shell width, when the frame renders, then the current page
  title, content region and visible recruiter-name affordance are present without implementing the
  name dialog. _Proved by:_ `e2e/shell.spec.ts › AC4` and pen.dev design review.

## Guardrails that apply

<!-- Tick only what applies and say why. Leave the rest unticked. -->

- [ ] AI only suggests: no auto reject/advance/shortlist/contact
- [ ] No email sent
- [ ] Server-only data access; secret key never reaches the browser
- [ ] RLS on new tables, no public policies; private Storage + signed URLs
- [ ] AI output schema-validated, logged to `ai_runs`, shows source text
- [ ] Protected attributes ignored; nationality/language only with a written reason
- [ ] UTC stored, SGT shown; SG working days
- [x] Typed recruiter name recorded on stage/settings changes — this Story exposes the affordance
  only; it does not implement or bypass the later typed-name audit flow.
- [x] Works at phone width; status not colour-only; Chinese text renders — shell frames and tests
  cover 390 px with token-based focus and no status UI.
- [x] Fictional data only; no secrets or sample-data Blob URLs committed — placeholders contain
  generic recruiter copy only.
- [ ] Free-tier limits respected (no frequent cron, file ≤ 50 MB)

## UX / design

`design/shell.pen` is the visual source of truth; `design/specs/shell.md` is its build contract.
Frames cover desktop default, phone default, phone sheet open, active navigation, a remembered
fictional recruiter name, an unset-name affordance, and long page-title/breadcrumb stress cases.
Individual page loading, empty and error states remain with their owning screen designs.

## Data / API changes

None. Placeholder routes render static content only.

## Assumptions

- **A1 — Five primary destinations.** The accepted navigation map reads "nine MVP areas" as five
  top-level links: Dashboard, Jobs, Candidate search, Placements and Settings. Job detail, Job form,
  Candidate profile and Pipeline require context and are reached from those screens, not invented
  as empty global destinations.
- **A2 — Stacked delivery.** Both tasks depend on #29/#94/#95, so this Story branches from
  `design/29-visual-language-tokens` and its PR targets that branch until PR #201 merges.
- **A3 — Sheet on phone.** The accepted Phase 0 map and task #97 already specify a navigation sheet;
  bottom tabs were rejected because five destinations plus the name affordance do not fit robustly
  at 390 px or 320 px.
- **A4 — Name affordance only.** The shell displays "Recording as Maya Tan · Change" (fictional)
  and an unset state, while the dialog and persistence remain in #98/#99. This does not settle RC-2.
- **A5 — No shell motion.** Task #96 excludes motion design. Open/close behaviour uses the
  underlying accessible sheet primitive without adding bespoke animation decisions.

## Open questions

<!-- Items the PRD marks open, or anything needing a product decision. "none" if none. -->

- RC-2 remains open for the CV review queue screen and the final form of the typed-name prompt.
  It does not block this Story: the queue is omitted and the name affordance is a reversible shell
  entry point only.
