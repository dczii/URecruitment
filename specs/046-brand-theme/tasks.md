# Tasks: USER brand theme

- [x] T001 Create feature artifacts and preserve branch from current checkout.
- [x] T002 Measure logo red and specify complete semantic palette.
- [x] T003 Add contrast/neutral-brand regression tests and confirm failures before styling.
- [x] T004 Implement shared palette, light default, logo backing and accessible interaction treatments.
- [x] T005 Update readable design tokens and screen specs.
- [x] T006 Run lint, typecheck, unit tests and production build.
- [x] T007 Run desktop/phone shell and primary-action browser checks.
- [x] T008 Record final results, limitations and changed-file review.
- [ ] T009 Reconcile encrypted Pencil documents when supported tools are available.
- [ ] T010 Validate database-dependent screens when local Supabase and fixtures are available.

## Validation results

- `npm run lint`: pass, two pre-existing unused-variable warnings (gap-check test and migration lint).
- `npm run typecheck`: pass.
- `npm test`: 52 files, 368 tests passed. New contrast/brand checks initially failed three cases under the old palette, then passed after implementation.
- `npm run build`: pass, including client-bundle security check.
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 npm run test:e2e -- e2e/brand-theme.spec.ts --workers=2`: 6 passed, no skipped cases. Tested real production /settings at desktop and phone widths, keyboard navigation, touch menu reopening, white default/logo backing and primary hover contrast in both themes.
- Real /settings request: HTTP 200. Reviewed [desktop](../../analysis/screenshots/brand-theme-desktop.png) and [phone](../../analysis/screenshots/brand-theme-phone.png) screenshots.
- `git diff --check`: pass. All source edits are presentation-only; branch remains `design/white-red-black-theme`. No dependencies, lockfiles, server logic or database changes.

## Limitations and deviations

Default Playwright webServer readiness initially waited on `/` -> `/dashboard`, which returned `Invalid environment: SUPABASE_URL (missing), SUPABASE_SECRET_KEY (missing)`. That attempt was stopped; a local dev-runner override also timed out after the interrupted runner left an orphan service. Final validation used the separately started production build and existing PLAYWRIGHT_BASE_URL support; no server responses were mocked or assertions disabled. A touch-project navigation check initially used mouse click after keyboard focus; the final suite exercises keyboard opening and actual touch taps explicitly.

The full existing database-dependent browser suite and database integration suite remain unrun: the local stack is unavailable after prior Postgres-image disk exhaustion. Shared tokens apply across those routes, but their rendered screen states are not claimed validated. Pencil documents remain stale because supported tools are unavailable. Spec Kit was unavailable during the initial implementation; after rebasing onto main, the installed workflow/scripts were inspected and feature context updated to 046-brand-theme. No commit, push, merge or PR was requested for this implementation.

## Rebase validation (2026-10-02)

- [x] T011 Rebase `design/white-red-black-theme` onto `origin/main` (`e01f31e`), preserve local work, and resolve conflicts in `design/tokens.md` and `src/app/layout.tsx`.
- [x] T012 Renumber feature to `specs/046-brand-theme/`; update `specs/README.md`, `design/tokens.md`, `analysis/05-white-red-black-theme-plan.md`, feature docs and `.claude/skills/project-map/SKILL.md`. Local ignored `.specify/feature.json` points to the renumbered folder.
- [x] T013 Revalidate merged code: lint passed with the same two existing warnings; typecheck passed; 53 files / 375 unit tests passed; production build and bundle-security check passed; all 6 production desktop/phone theme tests passed using `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3110`.
- [x] T014 Verify no unmerged index entries, no stale active feature-folder references, and preserved test/screenshot bytes match the pre-rebase stash. Spec Kit `check-prerequisites.sh --json --require-tasks --include-tasks` resolves 046-brand-theme successfully.

User authorized committing and publishing the theme branch after validation. Pre-rebase backup is retained in Git stash (`brand-theme-before-main-rebase`). Existing database/Pencil limitations above remain unchanged. Upstream's HRManagement project naming and changes outside the theme are preserved.

## Publication

User explicitly requested commit, push and PR creation on 2026-10-02. Publish the existing `design/white-red-black-theme` branch against `main`; no Story issue was supplied, so do not invent closing references. Database/Pencil follow-ups remain outstanding.
