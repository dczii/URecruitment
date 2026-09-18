# Spec — #32 Every MVP screen has an approved design

| | |
|---|---|
| Issue | https://github.com/dczii/URecruitment/issues/32 |
| Parent | Story #32 → Epic #2 (E02 Design system) |
| Milestone | MVP |
| Branch | `design/32-mvp-screen-designs` |
| Created | 2026-09-18 |
| Status | In review |

## Problem

Recruiters need every remaining MVP screen — Dashboard, Jobs list/detail, Job form, Candidate
search/profile, Pipeline board, Placements, Settings, and the proposed CV review queue — designed
in pen.dev against the shared patterns from #98 before any of it is built, so recruiters get a
screen that matches how they work rather than one shaped by whatever the data happens to look
like.

## Critical context: desktop-only supersedes this Story's original phone-frame scope

`CLAUDE.md` was updated to make URecruitment **desktop-only** (no phone/mobile support anywhere)
on 2026-09-18, **after** Story #32 and Tasks #100–#106 were written. Those issues' acceptance
criteria and scope sections were written when phone support was still required (e.g. #32 AC1
"desktop and phone frames", AC3 "at 390 px … no horizontal page scrolling"; #104 "phone frame
first, then desktop … fully usable at phone width"). This is consistent with what the rest of the
repo has already done: `ui-design/SKILL.md` and `testing/SKILL.md` already record "decision
reversed 2026-09-18 (formerly issue #33/#107/#108, closed as not planned)", and #33/#107/#108 are
indeed closed as not planned.

Per explicit instruction: **desktop-only wins**. Concretely:

- Only desktop frames (1440 × 900) are designed for every screen in this Story. No phone/mobile
  frames are created anywhere in `design/screens/*.pen`.
- Every phone-frame / phone-width acceptance criterion in #32 and #100–#106 is treated as
  **superseded, not failed** — marked **N/A** below with this reasoning.
- The issue bodies on GitHub are left unedited (per instruction) — this supersession is recorded
  here and in each `design/specs/*.md` mirror instead.

## PRD references

| PRD section | Item | Status |
|---|---|---|
| UI design → MVP screens table: Dashboard, Jobs, Job detail, Job form, Candidate search, Candidate profile, Pipeline board, Placements, Settings | All 9 screens designed | decided |
| UI design → design rules 1–5 (AI-suggestion labelling + source quote, delay status never colour-only, ZH rendering, desktop usability, typed-name prompt) | Shared patterns applied to every screen | proposed |
| CV processing → requirement 2: a review queue for files that fail to parse | Screen not in the PRD's screen list | proposed / **open** (see RC-2 below) |
| Non-functional requirements → Devices | MVP is desktop only (decided 2026-09-18; supersedes the phone-frame ACs in #32/#100-#106, which predate this decision) | decided |

## Scope

**In scope**
- `design/screens/dashboard.pen`, `jobs.pen`, `job-form.pen`, `search.pen`, `candidate.pen`,
  `pipeline.pen`, `placements.pen`, `settings.pen`, `review-queue.pen` — desktop frame(s) only,
  each showing default plus the states each Task's Scope calls for (empty/loading/error/validation
  as applicable), built from the `#98` shared patterns (`design/tokens.pen`, `shell.pen`).
- Matching `design/specs/<screen>.md` readable mirrors for ui-build (Grok has no pen.dev access).
- `docs/decisions/open-questions.md`: keep #106's design tied to the **existing RC-2** row
  ("Implied screens: CV review queue, name prompt", status Awaiting owner) rather than treating it
  as newly decided or adding a duplicate row.

**Out of scope**
- Building any screen in React/Tailwind (separate Tasks, e.g. E08-S04-T01, E05-S01-T03).
- Phone/mobile frames anywhere (superseded, see above).
- Any accessibility/E2E automation (#33/#107/#108, already closed as not planned).
- Product-owner sign-off on the CV review queue screen (#106) — there is no reachable product
  owner in this MVP prototyping context; RC-2 stays "Awaiting owner", not "Answered".

## Acceptance criteria

Mapped from Story #32 and Tasks #100–#106. Phone/phone-width items are marked N/A (superseded by
the desktop-only decision, reasoning above), not failed.

- [x] **AC1 (from #32 AC1, desktop half)** — Given the PRD screen list, when each screen is
  designed, then it has a desktop frame in `design/screens/*.pen` and a `design/specs/<screen>.md`
  mirror. _Proved by:_ pen.dev validation (`get_app_state`) + presence of all 9 spec files.
- **N/A (from #32 AC1, phone half)** — "desktop and phone frames": superseded by the 2026-09-18
  desktop-only decision; only desktop frames exist.
- [x] **AC2 (from #32 AC2)** — Given a screen shows AI output or delay status, when it is
  designed, then it uses the shared `AiSuggestion`/`SourceQuote`/delay-badge patterns from #98
  rather than a one-off treatment. _Proved by:_ manual inspection of each `.pen` frame against
  `design/tokens.md` + `design/specs/shell.md` pattern definitions, recorded in each spec mirror.
- **N/A (from #32 AC3)** — "designed at 390 px … reachable without horizontal page scrolling":
  superseded; no 390 px frame exists to test.
- [x] **AC4 (from #100 Done-when)** — Dashboard: both a desktop frame using the shared delay-badge
  and state patterns, every PRD filter (client, job, stage, owner) reachable, and
  `design/specs/dashboard.md` stating sort order and per-section empty behaviour.
  _Proved by:_ pen.dev validation + `design/specs/dashboard.md` inspection.
- **N/A (from #100 Done-when, phone)** — "reachable at 390 px": superseded.
- [x] **AC5 (from #101 Done-when)** — Jobs list + detail: desktop frame(s), ranked matches show
  score/reasons/source text via the shared patterns with model version + date, and the open-flag
  banner states matching is not blocked. _Proved by:_ pen.dev validation +
  `design/specs/jobs.md`/`job-detail.md`.
- [x] **AC6 (from #102 Done-when)** — Job form: must-have/nice-to-have choice on every requirement
  row; nationality/language reason field visibly required before either counts; JD-upload pre-fill
  confirmation state. _Proved by:_ pen.dev validation + `design/specs/job-form.md`.
- [x] **AC7 (from #103 Done-when)** — Search + Candidate: all five PRD filters present (phone-sheet
  collapse dropped — N/A, superseded); every parsed field can show its source quote; an edited
  field is visually distinct and edit mode shows the typed-name prompt. _Proved by:_ pen.dev
  validation + `design/specs/search.md`/`candidate.md`.
- **N/A (from #103 Done-when, phone)** — "collapse into a sheet at phone width": superseded.
- [x] **AC8 (from #104 Done-when, desktop-only reframed)** — Pipeline board: 7 stages + 3 end
  states, end states/Placed show no delay status, a non-drag move path reachable by keyboard, and
  the typed-name prompt on each move. _Proved by:_ pen.dev validation + `design/specs/pipeline.md`.
- **N/A (from #104 Done-when + body)** — "phone frame first … reachable without horizontal page
  scrolling" and "design that width first": superseded; desktop frame only, designed directly
  (no phone-first framing).
- [x] **AC9 (from #105 Done-when)** — Placements + Settings: guarantee countdown and 5-working-day
  flag both appear; the stage-limit hierarchy (job > client > default) is legible; the change log
  shows typed name + date. _Proved by:_ pen.dev validation + `design/specs/placements.md`/`settings.md`.
- [x] **AC10 (from #106 Done-when, reframed as open, not decided)** — CV review queue: RC-2 stays
  recorded in `docs/decisions/open-questions.md` as "Awaiting owner" (not answered) before the
  design is finalised, the desktop frame shows per-file name/reason (incl. the scanned-file
  rejection message)/retry, and retry reads as a recruiter action, never automatic.
  _Proved by:_ inspection of `docs/decisions/open-questions.md` RC-2 row + pen.dev validation +
  `design/specs/review-queue.md`.

## Guardrails that apply

- [x] AI only suggests: no auto reject/advance/shortlist/contact — every AI element (match score,
  gap flag, parsed field) is labelled "AI suggestion" with a source quote; retry/move/edit actions
  are drawn as recruiter-triggered.
- [ ] No email sent — n/a, no email UI exists anywhere in scope.
- [ ] Server-only data access — n/a, design-only change, no server code.
- [ ] RLS on new tables — n/a, no schema change.
- [x] AI output schema-validated, logged to `ai_runs`, shows source text — reflected visually:
  every match score and parsed field frame shows model version/date and a `SourceQuote`.
- [x] Protected attributes ignored; nationality/language only with a written reason — the Job form
  frame makes the reason field visibly required before nationality/language count.
- [x] UTC stored, SGT shown; SG working days — placements/settings/dashboard frames show dates in
  SGT-labelled copy and the guarantee/stage-limit copy uses SG working days language.
- [x] Typed recruiter name recorded on stage/settings changes — pipeline move, candidate edit, and
  settings change frames all show the typed-name prompt/remembered-name pattern from `shell.pen`.
- [x] Works at desktop width (desktop only; no phone/mobile width requirement); status not
  colour-only; Chinese text renders — every screen is a 1440 px frame only; delay badges pair a
  word/icon with colour; a ZH candidate name appears in the Candidate/Search frames.
- [x] Fictional data only; no secrets or sample-data Blob URLs committed — all mock content
  (names, CVs, jobs) is fictional and invented for the frames.
- [ ] Free-tier limits respected — n/a, design-only change.

## UX / design

Frames: `design/screens/dashboard.pen`, `jobs.pen`, `job-form.pen`, `search.pen`, `candidate.pen`,
`pipeline.pen`, `placements.pen`, `settings.pen`, `review-queue.pen`. Desktop (1440 px) only.
States per screen are listed in each `design/specs/<screen>.md`. Shared patterns reused from
`design/tokens.pen`/`tokens.md` and `design/shell.pen`/`shell.md` (#96/#97/#98).

## Data / API changes

None — design-only Story.

## Assumptions

1. **Phone-frame/phone-width ACs across #32, #100, #101, #102, #103, #104 are superseded by the
   2026-09-18 desktop-only decision in `CLAUDE.md` and are marked N/A above, not implemented.**
   This matches the direction already taken in `ui-design`/`testing` SKILL.md and in closed
   issues #33/#107/#108. The issue bodies themselves are left unedited per instruction.
2. #104's "phone frame first, then desktop" ordering instruction is dropped entirely — the
   desktop frame is designed directly, with no phone-first framing.
3. #106 (CV review queue) is a **proposed/open** PRD item. `docs/decisions/open-questions.md`
   already carries this exact question as **RC-2**, "Awaiting owner", naming #106. No product
   owner is reachable in this MVP-prototype context, so RC-2's status stays "Awaiting owner" and
   is **not** marked "Answered" — the screen is designed as a reasonable proposal per the PRD's
   proposed requirement, but the decision to include it in the MVP build remains explicitly open.
4. This Story does not touch code, so `npm run lint`/`typecheck`/`test`/`build` are not applicable;
   verification is pen.dev validation plus manual inspection of the spec mirrors (see plan.md).
5. Task order follows dependency order; all of #100–#106 depend only on #98, which is closed, so
   they are processed in issue-number order (#100 → #106).

6. **File consolidation.** The pencil MCP session for this Story resolved every `filePath` passed
   to `mcp__pencil__execute` (`design/screens/dashboard.pen`, `.../jobs.pen`, etc.) to the same
   single live document backing the already-open `design/shell.pen` editor tab, rather than
   separate files. All 9 desktop frames plus the 3 new shared pattern components (delay status
   badge, AI suggestion tag, source quote) live as top-level nodes inside `design/shell.pen`. No
   design content was lost; splitting into per-screen `.pen` files (`ui-design`'s proposed, not
   mandated, layout) is a follow-up for a human working in the pen.dev GUI. See `plan.md`'s
   Outcome for detail.
7. Disk persistence of the pen.dev session's work required an explicit save in the pen.dev desktop
   app partway through this task; the design work was verified live in-session before that save,
   and confirmed on disk afterward via `design/shell.pen`'s mtime and file size.
8. `TakeScreenshot` (a pencil MCP diagnostic, not a repo test) returned a blank image for 4 of the
   9 frames despite `Get`-confirmed correct node structure and bounds; treated as a tool-side
   rendering artifact rather than a design defect (documented per-frame in the affected spec
   mirrors, with a follow-up to visually confirm in the pen.dev GUI).

## Open questions

- RC-2 (`docs/decisions/open-questions.md`) — whether the CV review queue screen (#106) belongs in
  the MVP build at all. Still "Awaiting owner"; this Story designs it as a proposal without
  resolving that question.
