# Tasks: Dropdown modernisation

**Input**: spec.md, plan.md, research.md, data-model.md, contracts/select.md.
**Status**: T002–T012 implemented and verified locally. The user explicitly authorised proceeding after the draft prerequisites were reported. T001 remains unchecked because external Story linkage and Claude review have not occurred; review checklist markers are unchanged.
**Tests**: Required; behaviour proof before new control/adapter logic. No new dependencies.

## Phase 1: Setup

- [ ] T001 Resolve Story linkage and Claude review in specs/048-dropdown-modernisation/spec.md and plan.md; reconcile the stale feature pointer before selecting this feature. Review checklists/ux.md as reviewer. Do not create remote issues or mutate .specify state within an executor task.

## Phase 2: Shared foundation

- [x] T002 Write failing behaviour tests in src/components/ui/select.test.tsx for accessible label, value/label identity, empty value versus placeholder, disabled state, explicit commitment, error association and focusable trigger; confirm meaningful failures before implementation. Covers FR-001, FR-003–005, FR-009.
- [x] T003 Implement src/components/ui/select.tsx per contracts/select.md and plan.md with installed Base UI parts, theme tokens, viewport positioning, wrapping, checkmark and instant interaction; pass T002. Read the installed Next.js client-component guide first. Covers FR-001, FR-004–009.

## Phase 3: US1 — Dashboard filters (P1)

**Goal**: Modernise four filters with unchanged URL semantics.
**Independent test**: Selection/All/Clear filters/history preserve all expected parameters and results.

- [x] T004 [US1] Add failing integration tests in src/components/features/dashboard/FilterBar.test.tsx for each parameter, unrelated parameters, All, Clear filters, current-value restoration and missing-option display; verify before migrating. Covers FR-002.
- [x] T005 [US1] Migrate src/components/features/dashboard/FilterBar.tsx to SelectField with explicit options/value callbacks and unavailable-value handling; retain router semantics and pass T004. Covers FR-001/002/005.
- [x] T006 [US1] Update e2e/dashboard.spec.ts and e2e/ui-polish.spec.ts from native selectOption to visible accessible choices; retain assertions and add history/parameter retention checks at both widths. Covers FR-002, SC-001.

## Phase 4: US2 — Job client selection (P1)

**Goal**: Modern client choice with exact identifier and existing form recovery.
**Independent test**: Mocked save receives exact client ID; blank submission focuses Client with its error text.

- [x] T007 [US2] Extend src/components/features/jobs/JobForm.test.tsx first: blank-client focus/error linkage, exact selected ID, duplicate names, clear-to-empty, pending and zero-client disabled state, retained other fields. Update existing interaction to visible choice while preserving all original assertions; confirm failures before migration. Covers FR-003.
- [x] T008 [US2] Migrate src/components/features/jobs/JobForm.tsx to SelectField, preserving name, id, validation and onValueChange mapping; pass T007. Covers FR-001/003/005.
- [x] T009 [US2] Update e2e/seeded.ts to count actual client options through the opened popup and maintain its 1+client-count contract; add a reusable accessible client-selection helper if useful. Update e2e/job-form.spec.ts, e2e/jobs.spec.ts, e2e/search-from-job.spec.ts and e2e/gap-flags.spec.ts to use accessible selection, retaining all assertions and existing fixture semantics. No added skips. Covers FR-003, SC-001.

## Phase 5: US3 — Keyboard and responsive proof (P2)

**Goal**: Both journeys work with keyboard, touch, long content and alternate display settings.
**Independent test**: Dedicated dropdown scenarios execute without fixture skips at both configured widths.

- [x] T010 [US3] Add deterministic fictional long-label, duplicate-name, empty and 100-option scenarios using e2e/mock-supabase.mjs and e2e/dropdowns.spec.ts; keep existing fixtures stable. Test keyboard/typeahead, highlight versus commit, Escape/focus, Tab, touch, internal scroll, viewport edges, no page overflow, 200% text, instant motion and reduced motion. Assert appropriate targets at both widths and seeded helper count semantics. Covers FR-004–008, SC-002–004.
- [x] T011 [US3] Capture and review light/dark closed/open/selected/highlighted/invalid/disabled states at both widths; measure contrast and note manual assistive-technology/touch results in specs/048-dropdown-modernisation/quickstart.md. Correct only src/components/ui/select.tsx where needed and rerun affected checks. Covers FR-005–008, SC-002–004.

## Phase 6: Verification

- [x] T012 Run npm run lint, npm run typecheck, npm test, npm run build and npm run test:e2e with the local fictional harness; inspect skips and preserve all existing assertions. Record evidence/limitations in specs/048-dropdown-modernisation/quickstart.md. Confirm no server, dependency, policy, input/textarea or global-style drift. Covers FR-009 and SC-001–004.

## Dependencies and execution order

T001 → T002 → T003 → T004 → T005 → T006 → T007 → T008 → T009 → T010 → T011 → T012.

US1 and US2 both require the shared foundation. Deliver US1 first as the smallest reviewable increment, then US2, then cross-cutting US3 proof. No deployment is implied. Tests for both consumers could be prepared independently after T003 by an authorised team; no parallel agents are requested in this handoff. T010/T011 depend on both migrations and must not run against half-migrated helper semantics.

## Requirement coverage

| Requirement | Tasks |
| --- | --- |
| FR-001 | T002, T003, T005, T008 |
| FR-002 | T004, T005, T006 |
| FR-003 | T002, T007, T008, T009 |
| FR-004 | T002, T003, T010 |
| FR-005 | T002, T003, T005, T008, T010, T011 |
| FR-006 | T003, T010, T011 |
| FR-007 | T003, T010, T011 |
| FR-008 | T003, T010, T011 |
| FR-009 | T002, T003, T012 |
| SC-001 | T006, T009, T012 |
| SC-002–004 | T010, T011, T012 |


## Execution evidence

See quickstart.md for final commands, test counts, environment limitations and visual review. No new test skips, dependency changes, Git mutations or remote operations. The added test-only helper is documented in plan.md.
