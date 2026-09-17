---
name: testing
description: >
  URecruitment testing strategy and rules: test-first for logic (Vitest), DB integration tests on
  local Supabase, Playwright for key screens at desktop and phone width, fake AI models (no network
  in unit tests), frozen Singapore time, fictional fixtures, and what each layer must cover. Use
  when writing or reviewing any test, planning test steps, or when a task says "test-first".
---

# Testing

## Layers

| Layer | Tool | Location | Command | Runs against |
|---|---|---|---|---|
| Unit | Vitest | `src/**/*.test.ts(x)`, next to the code | `npm test` | Pure code, fake DB/AI |
| DB integration | Vitest (separate config) | `src/**/*.db.test.ts`, `supabase/tests/` | `npm run test:db` | Local Supabase (`supabase start`, needs Docker) |
| E2E | Playwright | `e2e/*.spec.ts` | `npm run test:e2e` | Local dev server or a Vercel preview URL, seeded |
| AI quality | eval script | `eval/` | `npm run eval` | Real models + the answer key (see `ai-eval`) |

**No coverage gate.** Quality comes from test-first logic and acceptance-criteria mapping.

## Test-first protocol (logic)

1. **Write tests** from the spec's acceptance criteria and edge cases. The test names quote the AC id: `it("AC2: caps score at 50 when a must-have is missing")`.
2. **Run them. They must fail for the stated reason** (an assertion, not an import error or a typo).
3. **Implement** the minimum to pass.
4. **Refactor** with the tests green.
5. **Map every AC** to a test in the plan's Test plan table.

**Always test-first:**
- working days and SG holidays;
- limit hierarchy (job > client > default);
- delay status (80% due soon, days over, end states);
- guarantee end date and the 5-working-day flag;
- must-have cap;
- protected-attribute redaction;
- evidence verification;
- total years (overlapping jobs);
- the recruiter-override merge;
- missing-field gap rules;
- search filter building and fusion;
- eval scoring rules;
- the spend cap;
- env parsing;
- typed-name validation.

## Rules

- **Fictional fixtures only.**
  - Small EN and ZH CV/JD snippets live in `test/fixtures/`.
  - Never use real people.
  - Never download from the Blob store in unit or DB tests. Blob belongs to the seed and eval only.
- **No network in unit tests.** Use the fake AI model (see `ai-pipeline`), and make unexpected `fetch` calls fail the test.
- **Time:**
  - Freeze it with `vi.setSystemTime()`.
  - Cover Singapore boundaries: 23:59 vs 00:00 SGT (15:59/16:00 UTC), Fridays, weekends, and the eve and day of a public holiday.
  - Use explicit holiday fixtures, not the live table.
- **DB tests:**
  - Each test runs in a transaction that is rolled back, or on a freshly reset schema.
  - Include the **RLS lock-down test** (the publishable key reads nothing) for every table.
- **Playwright:**
  - **Projects:** `desktop` (1440×900) and `phone` (390×844, `isMobile: true`).
  - Every key screen: renders seeded data; the primary action works; delay badges contain words; **no horizontal overflow at phone width**.
  - Stage moves exercise the typed-name prompt.
  - Prefer role/label locators. Add `data-testid` only where no accessible name exists.
  - An accessibility scan (e.g. axe) is welcome **if the plan adds the dependency**.
- **No flakes.**
  - No `waitForTimeout`; wait on UI state.
  - A flaky test is fixed or quarantined via an issue. It is never silently retried into green.
- **Never** delete, `.skip` or loosen an assertion to make a build pass. If a test is wrong, fix it and explain why in the PR.
- **Keep it fast:** unit tests under ~10 s total. Push slow cases into the DB/E2E layers.

## What each area must prove (minimum)

| Area | Must prove |
|---|---|
| CV parsing | Scanned files are rejected with a reason; EN + ZH fixtures parse to the schema; the evidence check flags an invented quote; overrides survive re-parse |
| Matching | Redaction removes each protected attribute; nationality/language count only with a reason; cap applied; score key includes the job + model version; stale scores hidden |
| Gap check | Each missing-field rule; open flags don't block matching; resolve/dismiss needs a note and a name |
| Search | Filters exclude correctly; ZH keyword hit; job-scoped ranking; ignored protected terms |
| Pipeline | Status transitions and thresholds; the "waiting on" mapping; end states have no status; every move writes `stage_events` with a name |
| Placements | Guarantee end date uses the client period (default 30); flag appears 5 working days before the end |
| Security | Publishable key reads nothing; no secret in the client bundle (build check) |
