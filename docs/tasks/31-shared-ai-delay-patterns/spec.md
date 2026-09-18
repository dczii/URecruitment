# Spec — #31 [Story] Shared patterns make AI results and delays unambiguous

| | |
|---|---|
| Issue | https://github.com/dczii/URecruitment/issues/31 |
| Tasks | #98 (E02-S03-T01), #99 (E02-S03-T02) |
| Parent | Story #31 → Epic #3 "Design system & screens" |
| Milestone | MVP |
| Branch | `feat/31-shared-ai-delay-patterns` |
| Base | `main` |
| Created | 2026-09-18 |
| Status | Planned <!-- Planned → In progress → In review --> |

## Problem

Every screen still has to invent its own way to mark an AI result as a suggestion, show the text it
came from, present a delay status, or ask a recruiter for their name. Without one shared
implementation, screens will drift — some labelling AI output, some not; some badges relying on
colour alone. Recruiters need every AI value to read as a suggestion with its evidence, every delay
status to be legible without colour, and a lightweight name prompt so stage/settings changes carry
an audit name, all built once and reused everywhere.

## PRD references

| PRD section | Item | Status |
|---|---|---|
| AI governance → requirement 1 | Every score, flag and parsed field shows the text it was based on | proposed |
| AI governance → requirement 2 | Each AI output is stored with its input, model version and date | proposed |
| UI design → design rule 1 | Every AI result is labelled as a suggestion | proposed |
| UI design → design rule 2 | Delay status uses a word or icon as well as colour | proposed |
| UI design → design rule 5 | The portal asks for the recruiter's name before their first change on a device | proposed |
| Guardrails → 7 | Settings/stage changes log the typed recruiter name, remembered on the device | decided |

## Scope

**In scope**
- `design/pattern.pen` with a frame per pattern (AI suggestion label, source quote, delay badge,
  typed-name prompt, empty/loading/error states) at desktop and phone width, plus
  `design/specs/patterns.md` as the readable build contract (Task #98).
- `src/components/patterns/AiSuggestion.tsx`, `SourceQuote.tsx`, `DelayStatusBadge.tsx`,
  `TypedNameDialog.tsx`, and shared `EmptyState`/`ErrorState`/loading-skeleton components, each with
  failing-then-passing unit tests for their logic (badge wording/aria, name validation and
  device-persistence, Chinese source-quote marking) (Task #99).
- A small client-side name-persistence hook/util (`localStorage`, device-only) used by
  `TypedNameDialog`.

**Out of scope**
- Wiring these patterns into any real screen (dashboard, job, candidate, pipeline) — later Stories.
- Server-side persistence of the recruiter name, or writing `stage_events`/`settings_log` audit rows
  — this Story only builds the client-remembered name prompt component.
- Storing AI runs (`ai_runs`) — Story E11-S01-T01.
- Screen-level layout — E02-S04.

## Acceptance criteria

- [ ] **AC1** (#98, #99) — Given any AI-derived value on screen, when it is displayed via
  `AiSuggestion`, then it carries a visible "AI suggestion" label, and when the value is a score it
  also shows its model version and date; passing a score without them fails typecheck.
  _Proved by:_ `src/components/patterns/AiSuggestion.test.tsx › AC1`.
- [ ] **AC2** (#98, #99) — Given an AI-derived value, when its `SourceQuote` is expanded, then the
  exact CV/job text it came from is shown, and Chinese text renders with `lang="zh-Hans"` and is
  truncated by CSS, never by slicing the string.
  _Proved by:_ `src/components/patterns/SourceQuote.test.tsx › AC2`.
- [ ] **AC3** (#98, #99) — Given a delay status, when `DelayStatusBadge` renders it, then it shows an
  icon and a word as well as colour, carries an `aria-label` stating the status in full, and end
  states / Placed render no status.
  _Proved by:_ `src/components/patterns/DelayStatusBadge.test.tsx › AC3`.
- [ ] **AC4** (#98, #99) — Given a recruiter's first change on a device, when they act, then
  `TypedNameDialog` asks for their name, rejects blank/whitespace-only input, and remembers the name
  on the device so it does not ask again until it is changed.
  _Proved by:_ `src/components/patterns/TypedNameDialog.test.tsx › AC4`.

## Guardrails that apply

- [x] AI only suggests: no auto reject/advance/shortlist/contact — `AiSuggestion` only labels and
  displays values; it triggers no action.
- [ ] No email sent
- [ ] Server-only data access; secret key never reaches the browser
- [ ] RLS on new tables, no public policies; private Storage + signed URLs
- [x] AI output schema-validated, logged to `ai_runs`, shows source text — this Story builds the
  source-text display (`SourceQuote`) and the suggestion label; `ai_runs` storage itself is a later
  Story (E11-S01-T01), noted as out of scope above.
- [ ] Protected attributes ignored; nationality/language only with a written reason
- [ ] UTC stored, SGT shown; SG working days
- [x] Typed recruiter name recorded on stage/settings changes — this Story builds the device-
  remembered name prompt and validation; writing the audit log itself happens where stage/settings
  changes are implemented.
- [x] Works at phone width; status not colour-only; Chinese text renders — every pattern gets a
  desktop and phone frame, the delay badge pairs colour with icon/word, and `SourceQuote` covers
  Simplified Chinese.
- [x] Fictional data only; no secrets or sample-data Blob URLs committed — all component fixtures
  and design copy are fictional.
- [ ] Free-tier limits respected (no frequent cron, file ≤ 50 MB)

## UX / design

`design/pattern.pen` is the visual source of truth; `design/specs/patterns.md` is its build
contract. Frames: `AiSuggestion` (value + score variants), `SourceQuote` (collapsed/expanded, EN/ZH),
`DelayStatusBadge` (on-track/due-soon/overdue/no-status), `TypedNameDialog` (first use, remembered,
changing the name), and `EmptyState`/`ErrorState`/loading skeleton — each at desktop and phone width.

## Data / API changes

None. The name prompt persists to `localStorage` only; no server action or table in this Story.

## Assumptions

- **A1 — Components only, no screen wiring.** Task #99's "Done when" item "Each component matches
  its frame … on review" is proved by Claude's visual inspection step (S4), not a screen-level
  Playwright test, since no screen consumes these patterns yet.
- **A2 — Name persistence mechanism.** `localStorage` under a single versioned key is used for the
  device-remembered name (reversible, no PRD conflict — guardrail 7 only requires "remembered on the
  device").
- **A3 — Not stacked.** #98's dependencies (#94, #80) and #99's (#98, #95) are all closed/merged, so
  this Story branches from `main` directly rather than stacking on an open PR.
- **A4 — Unit tests only for this Story.** No screen exists yet to exercise these patterns end to
  end, so Playwright coverage is deferred to the Story that wires them into a screen; this is stated
  under Out of scope and Test plan rather than silently skipped.

## Open questions

- none
