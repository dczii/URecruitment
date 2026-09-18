# Plan — #36 Working days follow the Singapore calendar

Spec: [spec.md](./spec.md) · Branch: `feat/36-sg-working-days` · Created: 2026-09-18

## Approach

Ship the Story as two Tasks in dependency order. #115 first: a plain reference table (`sg_public_holidays`) with RLS and no policies, seeded with gazetted SG holidays for 2025–2027, proven by a DB test asserting the count and idempotent re-seeding. #116 second: working-day arithmetic implemented twice — once as a SQL function (for the future delay-status view) and once as a TypeScript mirror (for app code and its unit tests) — built test-first, with every edge case from the issue plus a cross-check test that runs both implementations over the same date range and asserts they agree. No scheduled job; arithmetic is pure/synchronous per the PRD's decided "no cron for delay status" rule.

## Skills in scope

- `prd-context` — required for every task; confirms "limits count SG working days" is decided, and that `sg_public_holidays`/no-cron delay status are proposed (build as written).
- `testing` — required for every task; test-first for logic, frozen Singapore time for the boundary tests, DB integration tests run against local Supabase (unavailable here — CI gap documented).
- `supabase-db` — matches the new table/migration, RLS-with-no-policy convention, and the SQL working-day function.
- `github-workflow` — issues/branches/commits/PR mechanics for this Story.

## Files

| File | Change |
|---|---|
| `supabase/migrations/20260918000006_sg_public_holidays.sql` | new — table + RLS + working-day SQL function(s) |
| `supabase/seed/holidays.sql` | new — idempotent seed of gazetted SG public holidays 2025–2027 |
| `supabase/tests/holidays.db.test.ts` | new — table shape/RLS/seed-count/idempotency DB tests (#115) |
| `src/lib/working-days.ts` | new — TypeScript mirror of the SQL working-day functions |
| `src/lib/working-days.test.ts` | new — failing-then-passing unit tests for every edge case (#116) |
| `supabase/tests/working-days.db.test.ts` | new — SQL vs TypeScript cross-check DB test (#116) |

## Dependencies

- none (no new npm packages; depends only on existing Supabase migration/test tooling already in the repo)

## Steps

- [x] **S1** `grok` — Implement Task #115: create the `sg_public_holidays` migration (table + RLS, no policies) and the idempotent seed for 2025–2027, plus `supabase/tests/holidays.db.test.ts` asserting unique-key, RLS-enabled, correct year count, and no duplicates on re-seed.
  - Rules: `supabase-db` (RLS on every table, no public policies; unique key on date), `testing` (DB integration test proves the seed)
  - Verify: `npm run test:db` (documented as CI-only here — no Docker); `npm run typecheck`
- [x] **S2a** `grok` — Write failing tests first for Task #116 in `src/lib/working-days.test.ts`: Friday→Monday = 1 day; Saturday/Sunday entry; eve-of-holiday; the holiday itself; a run of consecutive holidays; 15:59 UTC vs 16:00 UTC (SGT midnight boundary). Frozen Singapore time via `vi.setSystemTime`.
  - Rules: `testing` (test-first for logic; frozen SG time), `prd-context` (SG working days, SGT display)
  - Verify: `npm test -- working-days` → fails because `src/lib/working-days.ts` doesn't exist yet
- [x] **S2b** `grok` — Implement `src/lib/working-days.ts` (elapsed working days between two UTC timestamps; date N working days after a date) and the matching SQL function(s) in the S1 migration file, until S2a passes. State the partial-day rounding rule once in code comments and assert it in a test.
  - Rules: `supabase-db` (SQL function alongside the table, security-invoker-safe), `testing` (never weaken tests to pass)
  - Verify: `npm test -- working-days` → pass; `npm run typecheck`
- [x] **S3** `none` — Write `supabase/tests/working-days.db.test.ts`: run both the SQL function and the TS mirror over the same range of dates (including all S2a edge cases) and assert identical results. Full verification and docs close-out. Do not run `pr-review`.
  - Verify: `npm run lint && npm run typecheck && npm test`; `npm run test:db` (CI-only here)

## Test plan

| AC | Test or manual evidence | Type / reason |
|---|---|---|
| AC1 | `working-days.test.ts › counts Friday→Monday as one working day` | unit |
| AC2 | `working-days.test.ts › excludes a single SG public holiday` / `› excludes a run of consecutive holidays` | unit |
| AC3 | `working-days.test.ts › treats 15:59 UTC and 16:00 UTC as different SGT days` | unit |
| AC4 | `working-days.db.test.ts › SQL and TypeScript agree across a date range` | DB integration (CI-only here, no local Docker) |
| #115 table/seed | `holidays.db.test.ts › unique key, RLS enabled, correct seeded count, idempotent re-seed` | DB integration (CI-only here) |

## Verification

```
npm run lint
npm run typecheck
npm test
npm run test:db      # migrations/SQL changed — CI-only in this environment (ECONNREFUSED, no Docker)
```

## Risks & rollback

New table and pure functions only; no existing behaviour touched. Rollback is a down-migration dropping `sg_public_holidays` and the working-day SQL function(s), plus reverting the two commits. No data migration risk since nothing else reads these yet.

## Outcome

- **Shipped:** `sg_public_holidays` table + seed (#115) and working-day arithmetic in SQL + TypeScript with full edge-case and cross-check coverage (#116).
- **Changed files / areas:** see Files table above.
- **Tests added or updated:** `supabase/tests/holidays.db.test.ts` (new), `src/lib/working-days.test.ts` (new), `supabase/tests/working-days.db.test.ts` (new).
- **Verification:** see PR body / final report for command-by-command results.
- **Deviations:** none expected; record here if any step diverges.
- **Fix rounds / escalations:** recorded per step during execution.
- **Models used:** recorded from `.orchestrator/36-sg-working-days/*.log` headers.
- **Claude direct fixes:** none expected.
- **Follow-ups:** none expected beyond the standard stacked-PR rebase-onto-main follow-up once PR #206 and PR #207 merge.
