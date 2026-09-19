# Plan — #163 Guarantee-ending flag

| | |
|---|---|
| Issue | https://github.com/dczii/URecruitment/issues/163 |
| Parent | Story #59 "After a candidate is placed" → Epic #10 (Placements & guarantee) |
| Milestone | MVP |
| Branch | `feat/57-placement-create` (stacked on `feat/56-delay-status`, PR #234) |
| Created | 2026-09-19 |
| Status | In review |

## Problem

The dashboard's guarantee section (#161) needs to know which placements' guarantees are ending soon
or have already ended, derived at read time (no cron, per CLAUDE.md hard rule 9).

## PRD references

| PRD section | Item | Status |
|---|---|---|
| Pipeline tracking → After Placed | dashboard flags the guarantee 5 working days before it ends | proposed — implemented as written, not settled here |

## Scope

**In scope**
- `resolveGuaranteeFlag(today, guaranteeEndDate, holidays)`: pure boundary function, `"ok" |
  "ending-soon" | "ended"`.
- `placements_guarantee_flag`: security-invoker view returning only flagged (`ending-soon`/`ended`)
  rows, mirroring the TS function.
- `getFlaggedPlacements()` typed reader for #161.

**Out of scope**
- Any email/notification.
- The dashboard UI itself (#161, separate stacked PR).
- Changing the 5-working-day figure (PRD proposed, implemented as written).

## Acceptance criteria

- [x] **AC1** — Exactly 5 working days before the end date, the flag is `ending-soon`. _Proved by:_
  `guarantee.test.ts › AC: exactly five working days before the end date is ending-soon`.
- [x] **AC2** — 6 working days before, not flagged. _Proved by:_ `› AC: six working days before the
  end date is not flagged`.
- [x] **AC3** — The day itself, flagged. _Proved by:_ `› AC: the day itself (guarantee ends today)
  is ending-soon`.
- [x] **AC4** — Already past the end date, `ended`. _Proved by:_ `› AC: a date already past the end
  date is ended`.
- [x] **AC5** — A window spanning a weekend is not inflated by weekend days. _Proved by:_ `› AC: a
  window spanning a weekend …`.
- [x] **AC6** — A window spanning a public holiday shifts the boundary (holiday excluded from the
  count, comparative test against the no-holiday case for the same dates). _Proved by:_ `› AC: a
  window spanning a public holiday shifts the boundary`.

## Guardrails that apply

- [x] Server-only — `guarantee.ts` starts `import "server-only"`.
- [x] RLS respected — `placements_guarantee_flag` is `security_invoker`, no grant to
  `anon`/`authenticated`.
- [x] Free-tier limits — derived on read, no cron.
- [x] Fictional data only — tests use fictional dates only.
- [ ] Typed recruiter name — n/a, read-only.

## Assumptions

- The 5-working-day rule is expressed as: walk 5 SG working days forward from today
  (`addWorkingDays`/`sg_add_working_days`, #116); if that landing date is on or after the guarantee
  end date, fewer than (or exactly) 5 working days remain, so the flag is `ending-soon`. This is the
  same "landing date" shape #158's `pipeline_status` view already uses for its own boundary, kept
  consistent across both views.
- `placements_guarantee_flag` excludes `ok` rows entirely (only returns flagged placements) — the
  same "no row = nothing to show" shape as `pipeline_status` (#158) uses for excluded end states,
  since #161 only wants the ones worth surfacing.
- `GuaranteeFlagsClient` in `guarantee.ts` is a narrow local type over `getDb()`, the same pattern
  `status.ts` (#158) and `create.ts` (#162) use for views/columns the generated `Database` types
  don't include yet (needs a local Supabase stack to regenerate; CI's `db:types:check` flags drift).

## Files

| File | Change |
|---|---|
| `src/server/placements/guarantee.ts` | new — `resolveGuaranteeFlag`, `getFlaggedPlacements` |
| `src/server/placements/guarantee.test.ts` | new — test-first, AC1–AC6 |
| `supabase/migrations/20260919160000_placements_guarantee_flag_view.sql` | new — the view |

## Dependencies

- #162 (create the placement record) — same branch, earlier commit.
- #116 (working-day functions) — closed, merged.

## Steps

- [x] **S1a** `grok` — Write failing tests in `guarantee.test.ts` for AC1–AC6.
  - Rules: `testing` — test-first, frozen boundary dates, name by AC.
  - Verify: `npm test -- placements/guarantee` → fails
- [x] **S1b** `grok` — Implement `resolveGuaranteeFlag` and `getFlaggedPlacements` until S1a passes.
  - Rules: `supabase-db` — read-only view reader, server-only; `prd-context` — 5-working-day figure
    is proposed, implemented as written.
  - Verify: `npm test -- placements/guarantee` → pass; `npm run typecheck`
- [x] **S2** `grok-low` — Add the `placements_guarantee_flag` view migration.
  - Rules: `supabase-db` — security invoker, one concern per migration, no new grant.
  - Verify: migration file only, validated in CI.
- [x] **S3** `none` — Full verification, close out docs.

## Test plan

| AC | Test | Type |
|---|---|---|
| AC1–AC6 | `guarantee.test.ts` (6 tests) | unit |

## Verification

```
npm run lint
npm run typecheck
npm test -- placements/guarantee
npm test
```

`npm run test:db` not run locally (no Docker; the view is validated in CI). `npm run build` /
`test:e2e` / `eval` don't apply — no screen or AI change in this PR.

## UX / design

n/a — #161 (dashboard) consumes `getFlaggedPlacements()` in a later, stacked PR.

## Data / API changes

- New security-invoker view `placements_guarantee_flag` (placement id, pipeline entry id, start
  date, guarantee end date, flag), only `ending-soon`/`ended` rows.
- New TS reader `getFlaggedPlacements()`.

## Risks & rollback

- Same view-depends-on-function caveat as #158's `pipeline_status` (dropping/altering
  `sg_add_working_days`'s signature later requires dropping this view first). Rollback: a new
  migration, never editing this one.

## Outcome

- **Shipped:** `resolveGuaranteeFlag` pure boundary function, `placements_guarantee_flag`
  security-invoker view (only flagged rows), `getFlaggedPlacements()` reader.
- **Changed files / areas:** see Files above.
- **Tests added or updated:** `guarantee.test.ts`, 6 tests (AC1–AC6).
- **Verification:** `npm run lint` pass; `npm run typecheck` pass; `npm test -- placements/guarantee`
  6/6 pass; full `npm test` — same 5 pre-existing unrelated failures as PR #233/#234, nothing new.
- **Deviations:** none.
- **Fix rounds / escalations:** 1 (the TS boundary function's SGT-instant-to-date conversion lost a
  day on the first pass — `addWorkingDays`'s return value is a UTC instant of SGT midnight, and
  reading it back needs the same +8h shift as `sgtCalendarDate`; fixed directly, tests then passed).
- **Models used:** planning + implementation — Claude Sonnet 5 (this session, direct implementation).
- **Claude direct fixes:** the SGT conversion bug above.
- **Follow-ups:** #164 (placements screen) builds on this and #162.
