# Feature Specification: Recruitment UI and experience polish

**Created**: 2026-10-02
**Status**: Implemented locally; release validation and draft PR publication in progress
**Feature directory**: `specs/001-ui-experience-polish`
**Working branch**: `codex/ui-experience-polish`, isolated from `origin/main`
**Story issue**: Not assigned. User requested implementation and a PR; the user subsequently explicitly confirmed branch/commit/push and draft PR creation.
**Input**: Enhance the overall design and UX using Emil design engineering and Spec Kit.

## Context and scope

Improve the existing recruiter journeys, shared shell, responsive layouts, readability, feedback and accessibility. Keep the supplied USER logo, current dark default, semantic palette and Geist/Noto Sans SC typography. Prioritize clarity and usable information density over decorative effects. This specification proposes presentation changes, not new recruitment capabilities.

Sources: `.specify/memory/constitution.md`, `CLAUDE.md`, `docs/ux/flows.md`, `docs/ux/screen-inventory.md`, `docs/plans/accessibility-standard.md`, `design/tokens.md`, and `.claude/skills/prd-context/references/screens.md`. Existing delay and guarantee behavior retains its `prd:proposed` classification where applicable; thresholds and ordering do not change.

Includes dashboard, jobs list/detail/form, global and job-scoped candidate search, candidate profile, placements and presentation of the settings stub. No settings editor, new route, database change, upload capability, authentication, product AI, communication, ranking or automated stage action.

## User Scenarios & Testing

### User Story 1 — Understand and navigate the workspace (P1)

A recruiter recognizes the agency, current page and available destinations without guessing an icon.

**Why this priority**: Shared chrome affects every journey.
**Independent Test**: Navigate each existing primary destination using pointer and keyboard at desktop and phone widths.

**Acceptance Scenarios**:
1. **AC1** Given any primary page, when it opens, then the logo is undistorted, one descriptive page heading and title identify the route, and desktop destinations have visible names with an active cue beyond color.
2. **AC2** Given a phone, when the navigation sheet opens and closes with Escape or a destination link, then focus is trapped and restored appropriately and the main content remains reachable via the skip link.
3. **AC3** Given an unset or previously stored recruiter name, when the header renders or Change is activated, then it shows the actual stored identity or Add name and uses the existing typed-name dialog. Merely changing this device preference causes no recruitment mutation and must not imply sign-in.

### User Story 2 — Read and act on dashboard attention items (P1)

A recruiter identifies a delayed candidate, job, stage, delay and waiting party without scrolling across a mislabelled row.

**Why this priority**: Current header/body mismatch and narrow table allocation hide the information the dashboard exists to show.
**Independent Test**: Use fictional overdue, due-soon and guarantee fixtures, change filters, select rows, and inspect the existing move preview without submitting a mutation.

**Acceptance Scenarios**:
1. **AC4** Given overdue or due-soon rows, then each selection cell has a matching labelled header; candidate, job/client, stage, status and waiting-party/working-days values appear under the correct headers and remain visible at 1440×900.
2. **AC5** Given no selection, then the attention list uses the full available content width. When rows are selected, a reachable action area appears without obscuring rows, focus or primary controls; destinations and typed-name safeguards retain their existing behavior.
3. **AC6** Given phone width, then each row becomes a labelled card containing the same information and selection control. All groups including guarantee items remain reachable with no horizontal page scroll.
4. **AC7** Given active filters or no matching results, then the applied scope is clear, Clear filters resets only dashboard filter parameters, and empty copy distinguishes no work from no matches. Back/forward restores the URL filter state.

### User Story 3 — Browse and edit with consistent feedback (P2)

A recruiter browses jobs/candidates/placements and completes existing forms with predictable grouping and recovery.

**Independent Test**: Exercise current search, job and profile scenarios using long English and Simplified Chinese fixtures and validation errors.

**Acceptance Scenarios**:
1. **AC8** Given jobs, search results or placements at phone width, then labelled cards expose the same substantive fields/actions as desktop tables. Job detail and candidate profile sections remain readable and keyboard accessible.
2. **AC9** Given an invalid existing form submission, then the first invalid field receives focus, every error names the problem and is linked to its field, inputs survive failure, and nationality/language reason requirements remain enforced.
3. **AC10** Given loading, failure or success, then meaningful text and an appropriate live region explain the state, actions prevent duplicate submission while pending, and no false success is shown. Empty states link only to existing, relevant actions. Settings honestly remains a placeholder.

### User Story 4 — Receive purposeful interaction feedback (P2)

A recruiter gets immediate input feedback without distracting movement during repeated work.

**Independent Test**: Inspect pointer, keyboard, touch and reduced-motion overlay/button behavior, including rapid open/close.

**Acceptance Scenarios**:
1. **AC11** Given pointer activation, then controls respond immediately with brief press feedback; dialogs/sheets use intentional, interruptible transitions. Keyboard-initiated actions have no animation delay or movement; focus is immediate.
2. **AC12** Given reduced motion or touch input, then position/scale motion is suppressed or hover motion is absent respectively; statuses and feedback remain understandable. Rapid Escape/reopen does not leave an overlay or focus trap behind.

### Edge cases

- Long unbroken names, Chinese text, 200% text zoom and narrow viewports; essential data must wrap without clipping.
- Empty group, all-empty dashboard, filters producing zero rows, selected entries disappearing after filtering; stale selections must be cleared against displayed entry IDs before any action.
- Missing/denied localStorage: render Add name and allow the dialog without a crash; do not invent an identity.
- Slow responses, rejected promises, partial existing mutation results: preserve input and report actual server outcomes.
- Two keyboard/pointer interactions in quick succession, browser Back, Escape during pending work, virtual keyboard and sticky action areas.

## Requirements

### Functional Requirements

- **FR-001** Preserve logo aspect ratio and alt text; use a coherent shell with visible desktop navigation labels and a compact phone header.
- **FR-002** Keep semantic navigation, active-page indication, one main landmark, one h1, a descriptive route title, skip link and predictable focus restoration.
- **FR-003** Show actual device recruiter-name state and make Add name/Change keyboard-operable using existing validation/storage and dialog.
- **FR-004** Align every dashboard table header with its body column, including selection; show delay and waiting-party information without horizontal scroll at desktop acceptance width.
- **FR-005** Use space for attention items when selection is empty; make the existing action preview reachable without covering content and clear hidden/stale selections before action.
- **FR-006** Provide labelled phone cards for dashboard, jobs, search results and placements with equivalent information/actions; keep detail screens usable without horizontal page scroll.
- **FR-007** Expose filter scope and clear/reset behavior while preserving URL navigation and existing search semantics.
- **FR-008** Use consistent field grouping, visible labels, associated text errors, first-invalid-field focus, input preservation and explicit pending state.
- **FR-009** Provide coherent loading/empty/error/success states and accessible announcements using existing actions only.
- **FR-010** Use semantic theme tokens; maintain 4.5:1 normal-text contrast, 3:1 meaningful control/focus contrast, and at least 44×44 CSS-pixel touch targets for phone controls.
- **FR-011** Preserve Simplified Chinese coverage and use Asia/Singapore for date/time presentation; date-only values must not shift timezone.
- **FR-012** Restrict animation to purposeful interactions; suppress keyboard motion, honor reduced motion, gate pointer hover, specify transitioned properties and keep UI transitions at or below 250 ms.
- **FR-013** Preserve all current domain rules, stage audit/name safeguards, protected-attribute restrictions, server-only data access and private CV links. No email, AI, autonomous decision or client transmission.
- **FR-014** Reuse installed shadcn/Base UI primitives and shared patterns. Introduce no npm dependencies or new backend interfaces.
- **FR-015** Validate at desktop 1440×900 and phone 390×844 with fictional deterministic fixtures, keyboard-only use, long EN/ZH text and reduced motion; never weaken tests.
- **FR-016** Keep the settings stub honest; decorative or unavailable actions must not appear functional.

### Key Entities

No new persisted entities. Existing job, candidate, pipeline-entry, guarantee and device recruiter-name concepts keep their current contracts. Selection and input modality are temporary UI state.

## Success Criteria

- **SC-001** All scoped pages have no horizontal page overflow at 390×844 and 200% text zoom; cards expose the desktop fields and actions.
- **SC-002** All six dashboard selection-table cells have corresponding headers; essential status/waiting fields are visible at 1440×900.
- **SC-003** Every existing primary destination is available in one desktop click or phone menu plus one click, with keyboard equivalence.
- **SC-004** All exercised invalid forms focus the first invalid field and preserve entered values; pending actions issue at most one request per activation.
- **SC-005** Tested controls meet contrast/touch-target criteria; reduced-motion and keyboard checks show no position/scale transition. Allowed pointer overlays complete within 250 ms.
- **SC-006** Existing lint, typecheck, unit, build and desktop/phone E2E gates pass before implementation is declared complete; observed failures are reported honestly.

## Assumptions and Open Questions

Dark default, supplied logo and existing palette remain the baseline; this is not a palette redesign. No new product decision is required for these presentation changes. The product register `docs/decisions/open-questions.md` remains authoritative; its unresolved real-data, hosting, duplicate and integration questions are excluded. Story issue assignment is a workflow prerequisite, not an invented issue. Optional later brand recoloring or new settings behavior requires a separate request.
