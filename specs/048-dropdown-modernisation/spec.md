# Feature Specification: Dropdown modernisation

**Created**: 2026-10-05
**Status**: Implemented and verified locally; user authorised implementation after the draft and reiterated “continue” on 2026-10-06.
**Story**: Unassigned; deferred external workflow follow-up under the user’s explicit implementation instruction.
**Input**: Plan enhanced, modern dropdown UI using orchestrator and Emil design engineering.

## Context and scope

Modernise the four dashboard filters (Client, Job, Stage, Owner) and the job form's Client selector. These are the five current uses of the shared native Select. This is a focused follow-up to implemented UI polish (045) and preserves the brand system (046) and recruiter authentication (047).

Sources: constitution, CLAUDE.md, docs/ux/screen-inventory.md S1/S4, docs/ux/flows.md, docs/plans/accessibility-standard.md, design/tokens.md, and the repository Emil design engineering skill. No recruitment policy or open PRD decision is settled here. This is proposed presentation work, not a new PRD business capability.

Exclude action menus, searchable comboboxes, multiselect, new filters, new routes, schema changes and backend changes. All five selectors use one consistent visual language.

## User Scenarios & Testing

### User Story 1 — Filter attention items confidently (P1)

A recruiter can read the current filter, open its choices, identify the selected choice and change or clear it.

**Why this priority**: These controls are repeated throughout daily dashboard work.
**Independent test**: Select and clear each filter with pointer and keyboard; compare the URL and visible result set with the existing behaviour.

**Acceptance scenarios**:
1. Given an unfiltered dashboard, each control displays All; choosing a value updates only its corresponding URL parameter and retains unrelated parameters.
2. Given an applied filter, reopening shows its selected item with a checkmark; highlighting a different item does not itself commit it. Choosing All clears only that parameter.
3. Given several filters, Clear filters preserves unrelated URL parameters; browser Back/Forward restores visible values.
4. Given a URL value missing from refreshed options, the control displays that value as unavailable and permits choosing All or an available value; it never silently clears the URL.

### User Story 2 — Choose the correct job client (P1)

A recruiter selects a client by name while the form retains the corresponding identifier and validation behaviour.

**Why this priority**: A presentation change must not corrupt saved job data or error recovery.
**Independent test**: Select a fictional client, submit through a mocked action, and verify the exact client identifier. Submit with no client and verify focus and error association.

**Acceptance scenarios**:
1. Given no selection, the trigger displays Select a client; the form does not choose the first client automatically.
2. Given a selected client, its name appears; saving passes its original identifier. The recruiter can return to the empty selection.
3. Given a missing client on submission after title and owner are filled, Client receives focus and its existing error is announced; other input remains intact.
4. Given no clients, a disabled trigger displays No clients available. While saving, the selector is disabled and retains its value.

### User Story 3 — Use every dropdown comfortably (P2)

A recruiter can operate the same controls on desktop, phone, with keyboard or enlarged text.

**Why this priority**: Consistency includes interaction and accessibility, not just appearance.
**Independent test**: Exercise keyboard, touch, long labels and popup boundaries at 1440×900 and 390×844, plus 200% text sizing.

**Acceptance scenarios**:
1. Enter/Space opens, arrows navigate, typeahead finds choices, Enter commits, Escape cancels and restores focus; Tab dismisses and continues normal focus order without trapping it.
2. Long English/Chinese names and unbroken text do not widen the page; the popup makes full labels readable and its list scrolls within the available viewport.
3. Selected and highlighted states are distinguishable without colour alone. Disabled controls do not open. Keyboard and reduced-motion interactions have no animation.

### Edge cases

Empty collections, one choice, 100 fictional choices, duplicate labels with different client IDs, long labels, stale dashboard URL values, viewport-edge placement, scrolling, reopening and rapid dismissal. Dashboard with no real choices still offers All; job form with no clients remains disabled.

## Requirements

- **FR-001**: All five controls share consistent trigger, popup, item and focus styling while preserving visible labels.
- **FR-002**: Dashboard selection, All, Clear filters and history preserve existing URL/result semantics, including unrelated parameters and unavailable values.
- **FR-003**: Job Client preserves empty state, client ID, pending/empty disabled states, validation focus, error descriptions and retained input.
- **FR-004**: Keyboard opening, navigation, typeahead, commitment, cancellation and normal Tab exit work without animation or focus traps.
- **FR-005**: Selection includes a checkmark and accessible selected state; highlight never implicitly commits; errors remain textual.
- **FR-006**: Triggers and items are at least 44px tall on phone and 40px on desktop. Popups stay within the viewport, scroll internally and expose full option labels without horizontal page overflow.
- **FR-007**: Use the existing brand, typography and light/dark semantic colours. Text meets 4.5:1; meaningful boundaries, icons and focus indicators meet 3:1 against adjacent surfaces.
- **FR-008**: Repeated dropdown interactions remain instant, with no entrance/exit, item stagger or selection animation. Existing reduced-motion behaviour is preserved.
- **FR-009**: Preserve recruiter decisions, server-only data access, typed-name audit, authentication and fairness rules. No new dependencies, remote operations, product AI, emails or persistence are introduced.

## Success Criteria

- **SC-001**: All five controls pass their pointer and keyboard acceptance scenarios with matching URL values or saved client IDs.
- **SC-002**: At both target widths, all choices are reachable and the page has zero horizontal overflow, including long-label and 100-option fixtures.
- **SC-003**: Every control retains an accessible name; validation focuses the correct control; selected state is perceivable without colour.
- **SC-004**: No interaction waits for an animation; light/dark contrast checks meet FR-007, and 200% text remains usable.

## Assumptions and clarification review

“Dropdown” means the existing single-value selection controls, since no action dropdown exists in current source. Native keyboard typeahead is retained via the replacement primitive; adding a search input is deferred. Brand and surrounding layout remain owned by 046/045.

Scope, states, accessibility, integration and edge cases were reviewed. No blocking product clarification was identified. Claude review and Story linkage remain external follow-ups. The user explicitly requested implementation after those prerequisites were reported; local implementation proceeded without modifying review checkboxes or creating remote issues.
