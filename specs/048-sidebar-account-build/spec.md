# Feature Specification: Sidebar account, collapse and build identity

**Created**: 2026-10-03
**Status**: Planned; implementation authorized by user
**Feature Branch**: No branch created
**Input**: Move sign out and recruiter name into the left sidebar, make it collapsible with purposeful animation, and put the current build version at the page bottom.

## User Scenarios & Testing

### User Story 1 - Account controls in navigation (Priority: P1)
Recruiters see and change their recording name and sign out from the navigation footer.
**Why this priority**: Keeps account controls consistently discoverable.
**Independent Test**: Set a fictional name, change it from navigation, then sign out in local mocked authentication.
**Acceptance Scenarios**:
1. Given a stored typed name, when navigation is shown, then its account footer displays that name and exposes Change name and Sign out.
2. Given no stored name, when opening account controls, then Add name opens the existing typed-name dialog without fabricating identity.
3. Given phone width, when opening navigation, then the same controls are available and closing overlays restores focus.
4. Given sign-out submission, then the existing logout behavior redirects to login and revokes local authenticated access as already implemented.

### User Story 2 - Compact navigation (Priority: P2)
Recruiters collapse desktop navigation to an icon rail to gain space.
**Why this priority**: Gives content more room while retaining navigation.
**Independent Test**: Toggle repeatedly, navigate in both states, and use keyboard and reduced motion.
**Acceptance Scenarios**:
1. Given expanded desktop navigation, when Collapse sidebar is pressed, then all five destinations and account controls remain reachable from an icon rail.
2. Given collapsed navigation, when Expand sidebar is pressed, then labels and branding return without distorted text or a blocked interaction.
3. Given keyboard activation or reduced motion, then the state change is immediate with focus retained.
4. Given route navigation, then the collapse choice survives client navigation; a reload defaults to expanded.

### User Story 3 - Identify the running build (Priority: P3)
Recruiters can read the current version at the bottom of the page.
**Why this priority**: Helps report problems with an identifiable build.
**Independent Test**: Check the footer on a short page and after scrolling a long page.
**Acceptance Scenarios**:
1. Given an authenticated page, then the footer appears after main content, at viewport bottom on short pages and document bottom on long pages.
2. Given deployment commit metadata, then release version and a short build identifier are visible; without it, the release version remains visible with a local-build label.

### Edge Cases
Missing or inaccessible name storage; long English or Chinese names; rapid toggles; focus inside account menu on resize; short-height viewport; narrow screen; missing or malformed build identifier.

## Requirements

### Functional Requirements
- **FR-001**: Put account controls in the desktop sidebar footer and mobile navigation footer, removing duplicate header controls.
- **FR-002**: Reuse the typed recording name and existing Add/Change name dialog; authentication never replaces typed-name auditing.
- **FR-003**: Preserve the existing explicit sign-out operation; navigation or menu opening must never sign out.
- **FR-004**: Provide expanded desktop navigation and a compact icon rail with a labelled toggle, current-page indication, and accessible destination names.
- **FR-005**: Keep controls usable during repeated toggles; animate only pointer-triggered transitions, under 300ms, and disable all added motion with reduced motion.
- **FR-006**: Retain the mobile navigation drawer with account access, scrollable content, focus restoration, and no horizontal overflow.
- **FR-007**: Show release version and available build identifier in a page-bottom footer on authenticated routes.
- **FR-008**: Long names must truncate visually with the complete value accessible, and every action must support keyboard and a minimum 44px target.

### Key Entities
Typed recruiter name (existing device value); transient sidebar state; public release/build identity. No new database entities.

## Success Criteria
- **SC-001**: All five destinations, name editing, and sign-out are reachable at 1440×900 and 390×844.
- **SC-002**: Neither viewport has horizontal overflow in expanded, compact, or drawer states.
- **SC-003**: Pointer collapse settles within 250ms; keyboard and reduced-motion changes have no animated duration.
- **SC-004**: Every authenticated page displays the running release version at its bottom.

## Assumptions
Name means the existing typed recruiter recording name. Desktop collapse is session-local and initially expanded; mobile remains a drawer. Login is excluded from the authenticated shell footer. No account-profile schema, remote setup, new dependencies, or product behavior changes.

## Dependencies
ADR-0004 recruiter auth; specs/047-recruiter-email-otp; specs/045-ui-experience-polish; specs/046-brand-theme; docs/ux/flows.md; docs/plans/accessibility-standard.md.
