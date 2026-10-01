---
name: testing
description: >
  HRManagement testing rules: Vitest unit tests (test-first for logic), DB integration tests on
  local Supabase (CI only here), Playwright at desktop and phone width, frozen Singapore time,
  fictional fixtures, and what each area must prove. Use when writing or reviewing any test,
  planning test tasks, or when a task says "test-first".
---

# Testing

Contract: `docs/plans/test-strategy.md`. If it and this skill differ, update both. Accessibility checks: `docs/plans/accessibility-standard.md`.

## Layers

| Layer | Tool | Location | Command |
| --- | --- | --- | --- |
| Unit | Vitest (`vitest.config.ts`, jsdom) | `src/**/*.test.ts(x)`, `scripts/**`, `test/**`, `supabase/*.test.ts` | `npm test` |
| DB integration | Vitest (`vitest.db.config.ts`) | `supabase/tests/*.db.test.ts` | `npm run test:db` (needs Docker: **run in CI**, not here) |
| E2E | Playwright, projects `desktop` + `phone` | `e2e/*.spec.ts` | `npm run test:e2e`. Run it yourself, never inside a sandboxed executor |
| AI eval | none | none | Out of scope; no `eval` script exists |

No coverage gate. Quality comes from test-first logic and mapping every acceptance criterion to a test.

## Test-first protocol

1. Write tests from the spec's acceptance scenarios; name them with the scenario id (`it("AC2: …")`).
2. Run them; they must fail for the stated reason (assertion, not import error).
3. Implement the minimum, refactor green, and map every scenario to a test in `tasks.md`.

Always test-first: working days and SG holidays; limit hierarchy (job > client > default); delay status (80% due soon, days over, end states null); guarantee end date and the 5-working-day flag; stage-advance rules; recruiter-override merge; total years (overlapping jobs); missing-field gap rules; search filter building; env parsing; typed-name validation.

## Rules

- **Fictional fixtures only** (`test/fixtures/`, EN and ZH). No real people. Unit and DB tests never download from the Blob store.
- **No network in unit tests.** Unexpected `fetch` fails the test.
- **Time:** freeze with `vi.setSystemTime()`. Cover 23:59 vs 00:00 SGT (15:59/16:00 UTC), Fridays, weekends, holiday eve and day. Use explicit holiday fixtures.
- **DB tests:** transaction rolled back or freshly reset schema. Every new table gets the RLS lock-down case (publishable key reads nothing).
- **Playwright:** key screens render seeded data, primary action works, delay badges contain words, no horizontal overflow at 390 px, stage moves exercise the typed-name prompt. Prefer role/label locators; no `waitForTimeout`.
- Never delete, `.skip` or loosen a test to get green; a wrong test is fixed and explained in the PR.
- Keep unit tests under ~10 s total.

## Minimum per area

| Area | Must prove |
| --- | --- |
| CV intake | Scanned files rejected with a reason; EN + ZH text extracts; overrides merge over parsed values |
| Gap check | Each missing-field rule fires; open flags don't block; resolve/dismiss needs a note and a name |
| Search | Filters exclude correctly; ZH keyword hit; job-scoped path; protected terms ignored |
| Pipeline | Status thresholds; "waiting on" mapping; end states have no status; every move writes `stage_events` with a name |
| Placements | Guarantee end date uses the client period (default 30); flag appears 5 working days before |
| Security | Publishable key reads nothing; no secret in the client bundle; `src/**` never imports `@vercel/blob` |
