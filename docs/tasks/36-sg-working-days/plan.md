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

- **Shipped:** `sg_public_holidays` table + RLS + idempotent 2025–2027 seed (#115); `workingDaysElapsed`/`addWorkingDays` in TypeScript and `sg_working_days_between`/`sg_add_working_days` in SQL, both skipping weekends and holidays with the SGT-midnight boundary and a stated no-round-up rule, plus a cross-check DB test proving SQL and TypeScript agree (#116).
- **Changed files / areas:**
  - `supabase/migrations/20260918000006_sg_public_holidays.sql` — table, RLS (no policies), seed, `sg_working_days_between`, `sg_add_working_days`
  - `supabase/tests/holidays.db.test.ts` — unique key, RLS/grants, seeded counts, re-seed idempotency
  - `src/lib/working-days.ts` — TypeScript mirror
  - `src/lib/working-days.test.ts` — 12 unit tests covering every edge case in the issue plus the rounding rule
  - `supabase/tests/working-days.db.test.ts` — SQL vs TypeScript cross-check over a 13-date range (weekends, single holiday, consecutive-holiday run, ordinary weekdays) × multiple day-counts
- **Tests added or updated:** all three DB/unit test files above are new; none deleted, skipped, or weakened.
- **Verification:**
  - `npm run typecheck` → pass
  - `npm run lint` → pass (1 pre-existing unrelated warning in `supabase/migration-lint.ts`, not touched by this Story)
  - `npm test` → 180 passed, 2 failed in `src/server/db.test.ts` (pre-existing, unrelated: `@supabase/realtime-js` native-WebSocket error in this Node/sandbox environment — reproduced identically on `main` before this Story's changes; not introduced here)
  - `npm run test:db` → `holidays.db.test.ts` and `working-days.db.test.ts` fail with `ECONNREFUSED 127.0.0.1:54322` (no Docker/local Supabase in this environment, per the repo's documented no-Docker-locally constraint). Both files were written test-first, reviewed, and are expected to pass once CI's `db.yml` job runs them against an ephemeral local Supabase stack.
- **Deviations:**
  - Seed for #115 lives inside the same migration file as the table (not a separate `supabase/seed/holidays.sql`), since the table and its seed are one migration-time concern and no other file was planned for it.
  - The S2b executor also revoked `execute` from `public` (not only `anon`/`authenticated`) on the two SQL functions, since Postgres grants `execute` to `public` by default — a correct tightening beyond what the prompt asked, noted here rather than silently accepted.
  - Some 2027 Islamic-calendar and Vesak Day dates in the #115 seed are best-known estimates pending the official MOM 2027 gazette (moon-sighting-dependent holidays cannot be certain this far out); flagged as an open follow-up below rather than treated as fully authoritative.
- **Fix rounds / escalations:** none — every step passed verification on the first executor run; no fix loop was needed, no escalation to `-xhigh` models, no Claude direct fix.
- **Models used:**
  - Planning/orchestration (spec, plan, prompts, review, docs close-out, PR): Claude Sonnet 5
  - S1 (Task #115 migration + DB test): `cursor-grok-4.6-high`
  - S2a (Task #116 failing tests): `cursor-grok-4.6-high`
  - S2b (Task #116 implementation, TS + SQL): `cursor-grok-4.6-high`
  - S3 (cross-check DB test): written directly by Claude Sonnet 5 (tagged `none` — verification/glue step, not delegated)
- **Claude direct fixes:** none — S3 was a planned `none`-tagged step (Claude writes it directly), not a fix of failed executor work.
- **Follow-ups:**
  - Once PR #206 and PR #207 merge: rebase `feat/36-sg-working-days` onto `main`, retarget this PR's base to `main`, and confirm the diff still contains only this Story's changes.
  - Confirm CI's `db.yml` job actually runs `holidays.db.test.ts` and `working-days.db.test.ts` green against the ephemeral local Supabase stack (could not be verified locally — no Docker).
  - Reconcile the 2027 Hari Raya Puasa/Haji, Vesak Day, and Deepavali dates in the seed against the official MOM 2027 gazette once published, and update the seed migration (or a follow-up migration) if any date is off by the ±1 day moon-sighting variance.
