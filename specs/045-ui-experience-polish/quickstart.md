# Validation guide

## Prerequisites

Use npm and the supported Node 22 runtime. Story linkage and Claude review remain release workflow items. Use deterministic fictional fixtures/local Supabase only; do not reuse remote credentials for mutation tests. Do not print .env values. Existing local credentials do not imply permission to query a remote project.

## Automated gates after implementation

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Run meaningful targeted Vitest/Playwright cases while editing, then the complete gate once stable. Test-first for any new selection, identity, input-modality or form-focus logic. No database test gate is added because schema/DB behavior is unchanged. If infrastructure is unavailable, report blocked checks and preserve the tests.

## Acceptance walkthrough

1. At 1440×900, visit dashboard/jobs/search/placements/settings and fixture job/detail/profile routes. Check named navigation, logo/title/name and skip-link focus (AC1–3).
2. At dashboard, confirm six aligned headers/cells and visible delay/waiting fields. Select two fictional rows, inspect preview, clear them without mutation. Filter out a selected row and verify it is no longer eligible for action (AC4–7).
3. At 390×844, repeat using cards and the phone menu. All fields/actions remain usable; no document overflow. Test the action area with the virtual keyboard and last card focused (AC2,6,8).
4. Exercise the existing EN/ZH long-data fixtures and 200% text zoom; verify forms focus the first invalid input, reason fields remain mandatory, and failed submissions preserve input (AC8–10).
5. Emulate slow/error/success results using existing fixture routes or test stubs; verify correct announcements and one mutation request per activation. Do not send real requests for visual checks (AC9–10).
6. Test dialog/sheet pointer open, Escape close, rapid reopen, keyboard activation and reduced motion. Verify immediate focus, ≤250ms pointer transition, no keyboard transform and no touch hover (AC11–12).
7. Measure text/control/focus contrast and target rectangles; capture desktop/phone default, pending, empty, error and selected states for review. These are implementation evidence, not already completed checks.

## Release limits

The user requested a PR. Automatic approval review rejected branch creation because AGENTS.md reserves Git operations for Claude. An explicit authorization question is pending; do not bypass the rejection. No remote Supabase mutations or deployment are authorized. The user merges manually.

## Local implementation evidence — 2026-10-02

- `npm run lint`: pass, 10 existing warnings in domain tests/local worktrees.
- `npm run typecheck`: pass.
- `npm test`: 334 tests pass across 51 files. New identity, selection, modality, job and placement error-focus tests were red before implementation.
- `npm run build`: pass, including client-bundle secret scan (`no leaks`). Runtime is Node 20; the package declares Node 22 and Supabase warns accordingly.
- Production UI verification runs with local fictional REST fixtures only; mutations receive HTTP 403 and never reach a real database.
- Desktop 1440×900 and phone 390×844 screenshots reviewed: named sidebar/phone sheet, undistorted logo, aligned six-column table and labelled cards.
- Existing input, color and type tokens retained. Contrast-wide audit and seeded candidate-profile/CV checks remain unverified.

Reproduce safely in separate terminals:

```sh
node test/ui-fixture-server.mjs
SUPABASE_URL=http://127.0.0.1:54329 SUPABASE_SECRET_KEY=fictional-test-key npm run build
SUPABASE_URL=http://127.0.0.1:54329 SUPABASE_SECRET_KEY=fictional-test-key npm run start -- --port 3001
PLAYWRIGHT_BASE_URL=http://localhost:3001 npm run test:e2e -- e2e/ui-polish.spec.ts e2e/shell.spec.ts
```

The fake key is intentionally non-secret. No `.env` file is copied into test artifacts. Full-suite log is `.orchestrator/ui-polish-e2e.log` (ignored). Generated dashboard screenshots are `test-results/design-desktop.png` and `test-results/design-phone.png` (ignored).

Final browser results: the focused shell/redesign suite passes **18/18** at desktop and phone widths, including all six routes at 200% text. Full suite: **39 passed, 7 failed, 30 pre-existing conditional skips**. No new skip was added. The seven failures are the three gap-flag seeded-record cases and four accepted-save/job-created navigation cases. The fixture intentionally supplies no gap flags and refuses database writes; these need a seeded writable local Supabase project before a merge claim.

```text
7 failed
  gap-flags: banner count, evidence/question, resolving prompt (3)
  job-form: accepted save (1)
  jobs: created job list/details (2)
  search-from-job: created job navigation (1)
30 skipped
39 passed (16.3s)
```

All changed selection, itemized-validation, shell and zoom cases pass in the full run. Final `git diff --check` passes.
