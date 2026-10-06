# Feature Specification: Fifteen-minute technical demo

**Feature Branch**: none (user controls Git)
**Created**: 2026-10-05
**Status**: Ready for implementation
**Input**: Implement the necessary repository changes and create a 15-minute presenter script with real screenshots.

## User Scenarios & Testing

### User Story 1 - Consistent placement countdown (Priority: P1)
A recruiter sees the same accurate elapsed-day count on load, after saving a start date, and after reloading.
**Independent Test**: compare a fixed placement's load and save outputs and reload the browser.
**Acceptance Scenarios**:
1. **Given** January 31 and a Singapore date of February 1, **when** the countdown loads, **then** one calendar day has elapsed (FR-001).
2. **Given** a 30-day guarantee and 60 elapsed days, **when** loaded or saved, **then** the display reads 30 of 30 days used (FR-002).
3. **Given** a future or today's start, **when** loaded, **then** zero days are used; crossing Singapore midnight increments once (FR-001, FR-002).
4. **Given** a recruiter saves a valid start date with a typed name, **when** reloaded, **then** the count, date and flag agree with the save result (FR-003).
5. **Given** an invalid calendar date or a date before placement, **when** submitted, **then** no write occurs and useful feedback preserves the input (FR-004).

### User Story 2 - Reproducible local working session (Priority: P1)
A presenter runs the real application using fictional local data without contacting remote services.
**Independent Test**: start, sign in locally, save, reload and reset.
**Acceptance Scenarios**:
1. **Given** a fresh local demo, **when** signed in, **then** unconfirmed, future, active, ending-soon, end-today and ended placements are available (FR-005).
2. **Given** a saved change, **when** reset, **then** the original fixture returns (FR-005).
3. **Given** desktop or phone width, **when** saving and reading statuses, **then** controls are usable, statuses contain words, and the page has no horizontal overflow (FR-006).

### User Story 3 - Evidence-led 15-minute script (Priority: P2)
A presenter follows analysis (3m), specification (2.5m), implementation (5m), verification/traceability (4.5m).
**Independent Test**: run evidence and screenshot commands and follow the documented links.
**Acceptance Scenarios**:
1. **Given** fixed inputs, **when** consistency verification runs, **then** actual changed outputs must equal independently specified expected values; unexpected differences fail (FR-007).
2. **Given** a screenshot in the script, **when** inspected, **then** it is an actual browser capture with source state, viewport and scenario identified (FR-008).
3. **Given** prepared artifacts, **when** presenting, **then** the script distinguishes prepared evidence, actual agent work and future live Copilot work (FR-009).

### Edge Cases
Month/year transitions, leap day, Singapore midnight, missing/future starts, end-today versus ended, non-30-day periods, invalid dates, save failure, empty list, phone layout. Existing five-working-day warning semantics stay unchanged.

## Requirements
- **FR-001**: Count elapsed Singapore calendar dates, correctly across month/year/leap boundaries. Start date is day zero.
- **FR-002**: Display “X of Y days used” with X clamped to [0,Y]. Keep existing status semantics: ended only after the end date.
- **FR-003**: Initial load and successful save use the same calculation; browser displays the server result. Retain typed-name attribution and access guards.
- **FR-004**: Invalid calendar dates and dates before placement must be rejected without writes.
- **FR-005**: Provide local-only start/reset commands, fixed demo time, linked fictional fixtures and persistent in-memory saves. No production demo endpoints or remote writes.
- **FR-006**: Verify desktop 1440×900 and phone 390×844, including populated interaction, empty/error states and textual flags.
- **FR-007**: Generate repeatable before/expected/after comparison evidence with source/spec identity and actual command results. Mock results must not claim SQL/RLS verification.
- **FR-008**: Capture real before/after, typed-name, error, desktop and phone browser screenshots and link them from the script.
- **FR-009**: Deliver exact prompts/commands, a 15-minute runbook, trace links and labeled fallback evidence; do not fabricate Copilot execution or human review.

### Key Entities
Placement: existing pipeline entry, start, client period, guarantee end, typed name. Demo fixture: fictional linked records plus scenario clock. Evidence: code/spec identity, inputs, expected/actual outputs, command results and capture metadata.

## Success Criteria
- **SC-001**: All specified date cases and load/save/reload checks pass.
- **SC-002**: A fresh local run supports the complete placement interaction and reset without remote access.
- **SC-003**: Every demo requirement links to verification evidence or an explicit limitation.
- **SC-004**: Script budgets total 15 minutes and contain real screenshots. Human delivery timing is a presenter rehearsal, not claimed by automated checks.

## Clarifications
2026-10-05: User answered “Yes — use capped days used (recommended)” to retaining days-used wording, capping at the period, zero before/on start, and ended beginning the day after the end date. No unresolved product decision remains in this feature.

## Assumptions
Use existing components, authentication and local provider. No new dependencies, schema, production route, remote operation, branch or commit. Settings, general product expansion and slide deck are excluded. References: constitution; docs/prepare-live-walkthrough.prompt.md; specs/043-guarantee-flag/plan.md; specs/044-placements-screen/plan.md. Older desktop-only and no-auth assumptions are superseded by current repository rules.
