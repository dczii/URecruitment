# Tasks: Sidebar account and build identity

**Input**: specs/048-sidebar-account-build/
**Status**: Implementation authorized; all implementation tasks intentionally unchecked until verified.

## Phase 1: Setup
- [x] T001 Confirm the user-authorized spec/plan/tasks in specs/048-sidebar-account-build/ and read local installed Next.js layout/client-boundary docs. No git or remote operations by executor.

## Phase 2: Foundational
- [x] T002 Confirm existing layout, auth fixture, theme/modality rules and logout tests in src/components/patterns/AppShell.tsx, src/app/globals.css, e2e/auth.spec.ts and e2e/auth-fixture.ts (read-only task).

## Phase 3: US1 Account footer (P1)
- [x] T003 [US1] Write failing account behavior tests in src/components/patterns/SidebarAccount.test.tsx and adjust ownership assertions in src/components/patterns/AppNavigation.test.tsx; test name add/change, unset/long names, menu-to-dialog focus and explicit logout form. Confirm failure for the intended missing feature.
- [x] T004 [US1] Add existing-dependency Base UI wrappers in src/components/ui/dropdown-menu.tsx and src/components/ui/tooltip.tsx; implement SidebarAccount in src/components/patterns/SidebarAccount.tsx with existing TypedNameDialog/storage/logout.
- [x] T005 [US1] Integrate account footer in src/components/patterns/AppNavigation.tsx; remove header controls, keep notice and scrollable links in desktop/mobile.
- [x] T006 [US1] Extend e2e/shell.spec.ts and e2e/auth.spec.ts for account location, mobile access, full keyboard name flow and local mocked sign-out regression. Preserve existing authentication assertions.

## Phase 4: US2 Collapse (P2)
- [x] T007 [US2] Add failing toggle/accessibility/state tests in src/components/patterns/AppNavigation.test.tsx; add desktop/phone cases in e2e/sidebar-account.spec.ts for labels, tooltips, route-state retention, resize, repeated toggles, reduced motion and keyboard.
- [x] T008 [US2] Implement collapse state/toggle/icon rail and transform-only FLIP controller in src/components/patterns/AppNavigation.tsx; coordinate main column in src/components/patterns/AppShell.tsx. Preserve full branding/accessibility and do not scale text.
- [x] T009 [US2] Add narrowly scoped transform/opacity, modality and reduced-motion rules in src/app/globals.css; adapt SidebarAccount compact trigger in src/components/patterns/SidebarAccount.tsx. Verify interruption cleanup and all 44px hit targets.
- [x] T010 [US2] Update e2e/shell.spec.ts keyboard order assertions to include the new toggle and mobile account-in-drawer location, preserving skip-link and destination coverage.

## Phase 5: US3 Build identity (P3)
- [x] T011 [US3] Write failing pure build-format/validation tests in src/lib/build-info.test.ts for valid, missing and malformed metadata, plus page-bottom assertions in e2e/sidebar-account.spec.ts.
- [x] T012 [US3] Implement server-only resolver and pure exported formatter in src/lib/build-info.ts; read package.json version with validated deployment SHA. Add semantic footer after main in src/components/patterns/AppShell.tsx. Do not change package version.

## Phase 6: Verification
- [ ] T013 Run all five required npm gates; visually verify desktop/phone, long names, short heights, slow-motion reversal and focus. Record actual evidence in specs/048-sidebar-account-build/checklists/ux.md; mark tasks only with evidence and authorization.

## Dependencies & Execution Order
T001 → T002 → T003 → T004 → T005 → T006 → T007 → T008 → T009 → T010 → T011 → T012 → T013. Tests precede each implementation. US3 is independently buildable after foundation but listed last to avoid AppShell edit contention. No parallel agents requested.

## Coverage
FR-001–003: T003–T006; FR-004–005: T007–T010; FR-006: T005–T010; FR-007: T011–T012; FR-008: T003–T010. SC-001–004: T006–T013.

## Verification record (2026-10-03)
- Test-first checks failed for the missing account component, build formatter and collapse toggle before implementation.
- npm run lint: pass, with 10 existing unrelated unused-variable warnings.
- npm run typecheck: pass.
- npm test: 66 files / 419 tests pass.
- npm run test:e2e -- --config=/tmp/urecruitment-sidebar-playwright.config.ts: 66 pass, 38 existing fixture-dependent skips. No test skip added by this feature.
- Final feature browser checks: 12 pass, including short viewports, resize recovery, keyboard, reduced motion, name editing, tooltip accessibility, build footer and transform-only motion.
- npm run build: fails in this environment because Turbopack cannot bind its worker port: `Operation not permitted (os error 1)`.
- Supported webpack production builds through the local Playwright harness: pass; node scripts/check-client-bundle.mjs: pass (`no leaks`).
- Used local port 3001 through a temporary Playwright config because an existing server owns port 3000. No remote services used.
- Existing brand-theme and ui-polish browser tests were additionally updated to preserve their assertions through the relocated account menu.
- Requirements-quality checklists remain read-only; actual implementation evidence is recorded here.
