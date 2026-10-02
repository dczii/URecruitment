# Tasks: Recruitment UI and experience polish

Scope: specification FR-001–016; preserve existing actions and domain logic. Tests precede changed UI logic. Current user additionally requests implementation and a PR; Git actions await explicit override of repository executor restrictions. No remote Supabase mutations.

## Phase 1 — Setup

- [ ] T001 Capture default/phone baseline and scope ownership in `specs/045-ui-experience-polish/research.md`; link the Story before implementation when GitHub workflow is authorized.
- [ ] T002 Add screen acceptance coverage in `e2e/ui-polish.spec.ts` and read-only `test/ui-fixture-server.mjs` for AC1–12, widths/zoom/EN/ZH, pending/errors, keyboard and reduced motion (FR-015).

## Phase 2 — Foundation

- [x] T003 Establish shared labelled responsive tables/cards and feedback styling in `src/components/ui/table.tsx`, `src/components/patterns/states.tsx` and `src/app/globals.css`; retain table semantics and token contract (FR-006,009,010,014).

## Phase 3 — US1: Workspace

- [x] T004 [US1] Write failing identity/storage and keyboard-dialog tests in `src/components/patterns/AppNavigation.test.tsx` (FR-003).
- [x] T005 [US1] Implement named desktop navigation, logo, compact phone header and actual device-name dialog in `src/components/patterns/AppNavigation.tsx` and `src/lib/recruiter-name.ts` for same-tab identity synchronization; add `public/user-logo.png` (FR-001–003).
- [x] T006 [US1] Add descriptive per-route titles in `src/app/layout.tsx`, `src/app/dashboard/page.tsx`, `src/app/jobs/page.tsx`, `src/app/jobs/new/page.tsx`, `src/app/jobs/[id]/page.tsx`, `src/app/candidates/[id]/page.tsx`, `src/app/search/page.tsx`, `src/app/placements/page.tsx`, `src/app/settings/page.tsx` (FR-002,016).

## Phase 4 — US2: Dashboard

- [x] T007 [US2] Write failing selection-reconciliation and aligned-table/card tests in `src/components/features/dashboard/Dashboard.test.tsx` (FR-004–006).
- [x] T008 [US2] Correct selection headers, give lists full width, provide phone cards and reconcile selected IDs with displayed rows in `src/components/features/dashboard/Dashboard.tsx` (FR-004–006,011).
- [x] T009 [US2] Polish existing conditional action preview and announcements in `src/components/features/dashboard/SelectionBar.tsx`; preserve the mutation/name path (FR-005,009,013).
- [x] T010 [US2] Add visible filter scope/reset and distinguish no-match from no-work in `src/components/features/dashboard/FilterBar.tsx` and `src/components/features/dashboard/Dashboard.tsx` (FR-007,009).

## Phase 5 — US3: Browse and edit

- [x] T011 [US3] Apply labelled responsive rows and consistent page composition in `src/app/jobs/page.tsx`, `src/components/features/search/SearchScreen.tsx`, `src/components/features/search/JobScopedResults.tsx`, `src/components/features/placements/Placements.tsx` (FR-006–009,011).
- [x] T012 [US3] Write failing first-invalid-field focus and preserved-input tests in `src/components/features/jobs/JobForm.test.tsx` and `src/components/features/placements/Placements.test.tsx`; implement shared focus recovery in `src/components/features/jobs/JobForm.tsx` and reuse in `src/components/features/cv-processing/CandidateProfile.tsx`/`src/components/features/placements/Placements.tsx` only where needed (FR-008).
- [x] T013 [US3] Polish readable job/profile sections and honest settings/empty/error states in `src/app/jobs/[id]/page.tsx`, `src/components/features/cv-processing/CandidateProfile.tsx`, `src/app/settings/page.tsx`, `src/components/patterns/states.tsx` (FR-009,016).

## Phase 6 — US4: Interaction

- [x] T014 [US4] Write failing modality/reduced-motion tests in `src/components/patterns/InteractionProvider.test.tsx`; implement shared transient modality in `src/components/patterns/InteractionProvider.tsx` and integrate `src/components/patterns/AppShell.tsx` (FR-012).
- [x] T015 [US4] Replace broad transitions and apply pointer-only press/overlay rules in `src/components/ui/button.tsx`, `src/components/ui/dialog.tsx`, `src/components/ui/sheet.tsx`, `src/app/globals.css` (FR-010,012,014).

## Phase 7 — Verification and handoff

- [x] T016 Update `design/specs/shell.md`, `design/tokens.md` only if token changes require it, and `specs/045-ui-experience-polish/quickstart.md` with actual gate evidence and measured desktop/phone results (FR-010–015).
- [ ] T017 Run lint/typecheck/unit/build/E2E and source scope review; record failures honestly in `specs/045-ui-experience-polish/checklists/ux.md`, preserving security and name safeguards (FR-013–015).
- [x] T018 Prepare the PR body from `.github/pull_request_template.md` with current spec path and real results; stage only task-owned files and create the authorized PR after Git restrictions are explicitly overridden.

## Dependencies and parallel opportunities

T001 → T002 → T003. US1: T004 → T005 → T006. US2: T007 → T008 → T009 → T010. US3: T011 and T012 → T013. US4: T014 → T015. All stories → T016 → T017 → T018. US1 and US2 can be reviewed independently after foundation; US3 and US4 have distinct files except shared primitives and must integrate sequentially. No concurrent edits to shared files; no sub-agent execution is required.

## Requirement coverage

| Requirements | Tasks | Acceptance |
| --- | --- | --- |
| FR-001–003 | T004–006 | AC1–3 |
| FR-004–005 | T007–009 | AC4–5 |
| FR-006 | T003,T008,T011 | AC6,8 |
| FR-007 | T010–011 | AC7 |
| FR-008 | T011–012 | AC9 |
| FR-009 | T003,T009–013 | AC10 |
| FR-010 | T003,T015–017 | AC1–2,6,8,12 |
| FR-011 | T008,T011,T016–017 | AC6,8 |
| FR-012 | T014–015 | AC11–12 |
| FR-013–015 | T002–003,T009,T015–017 | Existing guardrail suites + all ACs |
| FR-016 | T006,T013 | AC10 |

## Implementation strategy

First useful increment: shell and dashboard (US1+US2). Then responsive browse/form feedback and shared motion. Keep tests meaningful: prove externally observable behavior, not class strings that merely mirror implementation. Every changed behavior needs a failing assertion before its implementation; all new tests use fictional fixtures and mocked actions.

## Execution notes

T001 baseline was inspected at desktop and phone widths; Story linkage remains pending. T002 covers shell, selection, filters, job validation, EN/ZH, six routes at 200% text, and reduced motion. Candidate profile already uses readable card sections and was retained; no new profile behavior was needed. T016 keeps theme tokens unchanged. T017 cannot be marked complete while seeded/mutation cases cannot pass against the read-only fixture. No skip was added; two obsolete UI assertions now check the specified conditional selection area. T018 PR body is prepared locally, but branch/commit/push have not been authorized after automatic approval rejection.

Publication completed with explicit user authorization: https://github.com/dczii/URecruitment/pull/248. The task-only branch starts from main and excludes unrelated local changes. Exact PR verification used Node 22: lint/typecheck/build and 334 unit tests pass; E2E 39 pass/7 fixture-related fail/30 existing skips. Seeded acceptance and Claude review remain pending.
