# Validation guide

Validation guide plus local execution evidence below.

## Preconditions

Claude reviews this draft and links the Story issue before implementation. Use npm and the installed dependencies. No Git mutations or remote Supabase/Vercel/GitHub actions. Read the local Next.js guide named in plan.md before code changes.

## Local proof

1. Write and run the behaviour tests named in tasks.md before each adapter/integration change; confirm failures are meaningful rather than missing fixture setup.
2. Run npm run lint, npm run typecheck, npm test, npm run build and npm run test:e2e after implementation. Report failures and skipped cases without weakening tests.
3. For E2E, unset PLAYWRIGHT_BASE_URL so playwright.config.ts uses e2e/run-local.mjs and its fictional localhost Supabase mock. Inspect the actual configuration variable before running; never target a preview or production URL. Use no remote seed command.
4. Run the focused e2e/dropdowns.spec.ts in desktop and phone projects. All new scenarios must execute on fictional local fixtures; inspect skipped count explicitly.

## Required evidence

- Four dashboard filter choices, independent clearing, Clear filters, unrelated query parameter retention and Back/Forward restoration.
- Stale URL value shown as unavailable; recruiter can recover through All.
- Job Client: exact ID submitted, blank validation focus, error description, pending state, empty list, duplicate names and other input retained.
- Keyboard open, arrows, Home/End, typeahead, Enter commitment, Escape cancellation/focus return and Tab exit. Highlight alone does not update URL or form value.
- Phone touch targets ≥44px; desktop ≥40px. Long English/Chinese/unbroken names, 100 options, internal scrolling and bottom/right-edge placement. No horizontal page overflow.
- Light/dark screenshots of closed/open/selected/highlighted/invalid/disabled controls at both widths; contrast measured against FR-007. At 200% text sizing full labels and controls remain reachable.
- No opening/closing animation, keyboard delays or reduced-motion transform. Manually check assistive-technology announcement and touch scrolling where automated coverage is insufficient.

Record actual evidence and limitations in the implementation report; do not mark this guide as passed in advance.


## Execution evidence — 2026-10-06

Implementation authorised by the user’s “implement it” and subsequent “continue”. T001’s external issue/reviewer follow-up remains open, rather than being falsely marked complete. The stale .specify/feature.json and reviewer checklist markers were not modified.

| Command / check | Result |
| --- | --- |
| npm run lint | PASS; 10 pre-existing warnings in unchanged repository/worktree files |
| npm run typecheck | PASS |
| npm test | PASS; 66 files, 430 tests |
| npm run build | Environment failure: “binding to a port — Operation not permitted (os error 1)” from Turbopack worker creation |
| npm exec -- next build --webpack | PASS; production compilation, type validation and route generation |
| node scripts/check-client-bundle.mjs | PASS; “no leaks (scanned 2 directories)” |
| npm run test:e2e -- --config .orchestrator/dropdown.config.ts | PASS; 70 passed, 38 existing fixture/desktop-only skips; no newly skipped tests |
| Same command with e2e/dropdowns.spec.ts after final evidence additions | PASS; 14/14, no skips, desktop and phone |
| git diff --check | PASS |

Build commands use fictional localhost Supabase configuration with Sentry DSNs blank, as in the existing local harness. The ignored temporary Playwright config inherits the repository config and overrides baseURL/webServer to localhost:3100 because port 3000 was occupied. PLAYWRIGHT_BASE_URL and PLAYWRIGHT_BYPASS_SECRET were unset; the provider remains localhost:54329. Existing tests with no seeded clients/candidates retain their prior skip rules; new deterministic client scenarios run without skips and assert helper counts of 1, 3 and 101.

### Regression proof

- Tests were added before the shared module and consumer migrations. Initial failures exposed the missing component, native popup interaction mismatch and unavailable URL display; new consumer tests subsequently passed after migration.
- Exact client IDs, duplicate names, empty clearing, disabled/pending states, existing server error recovery and retained input pass unit tests.
- Dashboard pointer/keyboard interactions, All/Clear, unrelated URL state, history and unavailable values pass local browser tests.
- Home/End, arrows, typeahead, Enter/Space, Escape/focus restoration and Tab exit pass at both widths. Browser tests wait for Base UI’s initial focus handoff before sending the next key.
- Phone targets, internally scrolling 100-item lists, long English/Chinese labels, 200% text and viewport boundaries pass. The popup accounts for its border when limiting the list to available height.
- Rendered normal/selected text passes 4.5:1; popup borders, open trigger borders and focus-ring colour against the field surface pass 3:1 in both themes. Contrast results are attached to the focused Playwright runs.

### Visual review and limits

Reviewed generated screenshots of desktop/phone dropdowns, light/dark selected and highlighted rows, validation, long labels and enlarged text. Screenshots are in ignored test-results/dropdowns-*/dropdown-*.png (closed, open, highlight, enlarged, invalid and disabled states). The selected checkmark remains separate from keyboard highlight and the same client stays selected while navigation moves.

No physical-device or screen-reader session was performed. Phone evidence is Chromium touch emulation and accessible-name/description/focus assertions, not a claim of manual assistive-technology certification. Existing phone header crowding at 200% text was observed outside dropdown scope. No global theme, header, server or recruitment-policy change was made.
