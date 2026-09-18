# Spec — #36 Working days follow the Singapore calendar

| | |
|---|---|
| Issue | https://github.com/dczii/URecruitment/issues/36 |
| Parent | Epic E03 (Data & seed) |
| Milestone | MVP |
| Branch | `feat/36-sg-working-days` |
| Created | 2026-09-18 |
| Status | Planned <!-- Planned → In progress → In review --> |

## Problem

A candidate who enters a stage on Friday afternoon must not be flagged overdue by Monday morning — the delay dashboard needs to count Singapore working days (Mon–Fri, minus SG public holidays), not calendar days, so recruiters see real delays instead of weekend/holiday noise.

## PRD references

| PRD section | Item | Status |
|---|---|---|
| Pipeline tracking → Time limits | Limits count working days, Monday to Friday, skipping Singapore public holidays | decided |
| Data model → `sg_public_holidays` | Singapore public holidays used for working-day counts | proposed |
| Main flows → Delay status | A database view works it out; no scheduled job | proposed |

## Scope

**In scope**
- `sg_public_holidays` table: date, name, year, unique key on date, RLS enabled with no policy (#115)
- A migration/seed loading gazetted SG public holidays for the years the fictional sample data spans (2025–2027, to comfortably cover a Dec 2026 MVP launch and back-dated sample data)
- A SQL function computing working days elapsed between two timestamps, and the date N working days after a date, both skipping weekends and holidays (#116)
- A TypeScript mirror of the same two functions, same signatures/semantics
- Tests-first for every edge case: Friday entry, Saturday/Sunday entry, eve of a holiday, the holiday itself, a run of consecutive holidays, and the SGT midnight boundary (15:59 vs 16:00 UTC)
- A cross-check test proving the SQL function and the TypeScript mirror agree over a range of dates

**Out of scope**
- The Settings screen for editing holidays (E10-S02-T01)
- Delay status view itself, limit resolution, guarantee dates (later Epic 08/09 tasks)
- Holidays for any country other than Singapore

## Acceptance criteria

- [x] **AC1** — Given a stage entered on a Friday, when Monday arrives, then one working day has elapsed, not three. _Proved by:_ `working-days.test.ts › counts Friday→Monday as one working day`
- [x] **AC2** — Given a Singapore public holiday, when it falls inside a stage, then it does not count towards the limit. _Proved by:_ `working-days.test.ts › excludes a single SG public holiday` and `› excludes a run of consecutive holidays`
- [x] **AC3** — Given a timestamp stored in UTC, when working days are counted, then the day boundary used is Singapore local midnight. _Proved by:_ `working-days.test.ts › treats 15:59 UTC and 16:00 UTC as different SGT days`
- [x] **AC4** — Given the same inputs, when the SQL function and the TypeScript mirror both compute working days, then they agree. _Proved by:_ `working-days.db.test.ts › SQL and TypeScript agree across a date range`

## Guardrails that apply

- [x] RLS on new tables, no public policies; private Storage + signed URLs — `sg_public_holidays` gets RLS enabled with zero policies, same as every existing table.
- [x] UTC stored, SGT shown; SG working days — this Story implements the SG-working-day arithmetic itself; timestamps stay UTC in storage, converted to Asia/Singapore only for day-boundary math.
- [x] Fictional data only; no secrets or sample-data Blob URLs committed — the holiday list is public gazetted data, not candidate data; no secrets involved.
- [x] Free-tier limits respected (no frequent cron, file ≤ 50 MB) — no cron job added; working-day arithmetic is called synchronously from a DB view/function, per PRD's "no scheduled job" note.

## UX / design

n/a — no screen changes. This Story ships arithmetic/data only.

## Data / API changes

- New table `sg_public_holidays` (date primary/unique, name, year), RLS enabled, no policies.
- Seed data: gazetted SG public holidays for 2025–2027.
- New SQL function(s) for working-day arithmetic (elapsed days between two timestamps; date N working days after a date).
- New TypeScript module `src/lib/working-days.ts` mirroring the SQL function's signatures.

## Assumptions

- Holiday years: seeded 2025–2027 to cover both the MVP's Dec 2026 launch and any back-dated fictional sample data without guessing at a broader range. Recorded here since the issue doesn't pin exact years.
- Rounding rule: a working day is counted as elapsed only once a full SGT calendar day boundary (local midnight) has passed; partial days do not round up. Stated once in `working-days.ts` and mirrored in SQL, per #116's "Done when" requirement.
- No Docker locally in this environment: `npm run test:db` cannot run here (`ECONNREFUSED`, no local Supabase). DB-integration tests are written and reviewed but only actually execute in CI's `db.yml` job — documented explicitly, not silently skipped.

## Open questions

- none
