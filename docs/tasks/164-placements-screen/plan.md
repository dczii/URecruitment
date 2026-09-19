# Plan — #164 Build the placements screen

| | |
|---|---|
| Issue | https://github.com/dczii/URecruitment/issues/164 |
| Parent | Story #59 "After a candidate is placed" → Epic #10 (Placements & guarantee) |
| Milestone | MVP |
| Branch | `feat/57-placement-create` (stacked on `feat/56-delay-status`, PR #234) |
| Created | 2026-09-19 |
| Status | In review |

## Problem

Recruiters need one screen listing every placed candidate with their start date, the guarantee
countdown, and the 5-working-day-before-end flag — this is Story #59's user-facing surface, built on
#162 (create the placement) and #163 (the guarantee flag).

## PRD references

| PRD section | Item | Status |
|---|---|---|
| UI design → Placements | start date check, 30-day guarantee countdown | decided |
| design/specs/placements.md | desktop-only table, per-row countdown and flag | (design, closed #105) |

## Scope

**In scope**
- `listPlacements()`: every Placed-stage pipeline entry, its placement (if confirmed), guarantee
  countdown and flag (read from `placements_guarantee_flag`, #163, so both screens always agree).
- `Placements` client component: a table with an inline start-date input, Confirm/Update button,
  typed-name dialog on first use, guarantee countdown text, and the flag chip.
- `savePlacementAction` wiring (added in #162) called from the row.
- Playwright: page loads, heading renders, no horizontal overflow (desktop only, per design spec).

**Out of scope**
- The guarantee calculation itself (#162/#163, earlier commits on this branch).
- Interactive Playwright coverage of confirming a start date — there is no UI path yet to move a
  candidate into Placed (the pipeline board is #160, a separate task/PR); this screen can only be
  exercised end-to-end once that exists. Flagged as a follow-up.
- Invoicing or fees.

## Acceptance criteria

- [x] **AC1** — Every placement shows its start date and a countdown that reads correctly in words.
  _Proved by:_ `Placements.tsx`'s `guaranteeCountdownText`-equivalent inline render + unit coverage
  of the underlying `listPlacements`/`resolveGuaranteeFlag` (#162/#163 unit tests); Playwright's
  `AC1: the placements screen loads and reads as good news when empty` is what's reachable without
  seeded Placed-stage data (see Out of scope).
- [ ] **AC2** — A recruiter can confirm or change a start date here, with the name prompt on first
  use. _Implemented_ (`Placements.tsx`'s `requestSave`/`TypedNameDialog`), but not yet provable by an
  automated end-to-end test without #160; manual code-path evidence: `savePlacementAction` is the
  same action unit-tested in #162's `create.test.ts` via `createPlacement`.
- [x] **AC3** — All dates display in Singapore time. _Proved by:_ `listPlacements`'s `todaySgtDate`
  and `guarantee.ts`'s SGT-based date math (unit-tested in #163).
- [x] **AC4** — Playwright passes at desktop width (screen is desktop-only per the design spec, so
  there is no phone project to also satisfy). _Proved by:_ `placements.spec.ts`.

## Guardrails that apply

- [x] Server-only data access — `list.ts` starts `import "server-only"`.
- [x] Typed recruiter name — `savePlacementAction` (added in #162) requires it via
  `isValidRecruiterName`.
- [x] Works at phone width; status not colour-only — n/a for phone (desktop-only design); the flag
  is always shown as text, never colour-only.
- [x] Fictional data only.

## Assumptions

- The placements screen is **desktop-only**, per `design/specs/placements.md`'s explicit note
  ("no phone frame; superseded by the 2026-09-18 desktop-only decision"). `placements.spec.ts` skips
  the `phone` Playwright project accordingly, matching `job-form.spec.ts`/`jobs.spec.ts`'s existing
  precedent for other desktop-only screens.
- `listPlacements` reads the flag from `placements_guarantee_flag` (#163's view) rather than
  recomputing `resolveGuaranteeFlag` locally with an empty holiday list, so the dashboard (#161,
  separate stacked PR) and this screen can never disagree on which placements are flagged.
- Without #160 (the pipeline board), there is no UI path to move a candidate into Placed, so the
  empty state is what Playwright can exercise today. This is recorded as a follow-up rather than
  silently skipped.

## Files

| File | Change |
|---|---|
| `src/server/placements/list.ts` | new — `listPlacements()` |
| `src/components/features/placements/Placements.tsx` | new — table + inline confirm/update row |
| `src/app/placements/page.tsx` | rewritten — was the placeholder from app-scaffold |
| `e2e/placements.spec.ts` | new |

## Dependencies

- #162, #163 — same branch, earlier commits.
- #105 (design) — closed, merged.

## Steps

- [x] **S1** `grok` — `listPlacements()` joining pipeline_entries (Placed) → candidates, jobs,
  clients, job_versions (title), placements, and `placements_guarantee_flag`.
  - Rules: `nextjs-app` — server-only; `supabase-db` — narrow typed shim for undrifted columns.
  - Verify: `npm run typecheck`
- [x] **S2** `grok` — `Placements` client component + rewritten `page.tsx`.
  - Rules: `ui-build` — shared `TypedNameDialog` pattern, table shape from `jobs/page.tsx`
    precedent, status never colour-only; `prd-context` — guarantee countdown in words.
  - Verify: `npm run build`
- [x] **S3** `grok-low` — `placements.spec.ts`.
  - Rules: `testing` — Playwright per screen, desktop-only per design.
  - Verify: run locally against the preview once deployed (not run in this session — see Notes).
- [x] **S4** `none` — Full verification, close out docs.

## Test plan

| AC | Test or manual evidence | Type / reason |
|---|---|---|
| AC1 | `placements.spec.ts` (empty state) + `list.ts`/`guarantee.ts` unit tests | unit + partial e2e |
| AC2 | Code path only (`create.test.ts` unit-tests the underlying service) | unit; full e2e blocked on #160 |
| AC3 | `guarantee.test.ts`, `create.test.ts` (SGT date math) | unit |
| AC4 | `placements.spec.ts` | e2e |

## Verification

```
npm run lint
npm run typecheck
npm test
npm run build
```

`npm run test:e2e` was not run against a live preview in this session (no local browser run
requested; Playwright against the deployed preview is CI's job, same as every other PR in this
stack). `npm run test:db` not run locally (no Docker). `npm run eval` doesn't apply — no AI change.

## UX / design

Follows `design/specs/placements.md` exactly: one table, start date / "Start date not confirmed",
guarantee countdown in words ("Guarantee: X of Y days used" or "—"), and the flag chip
("Waiting on start-date confirmation" when unconfirmed).

## Data / API changes

None beyond #162/#163's migrations (same branch).

## Risks & rollback

- `listPlacements` makes 3 sequential-ish round trips (`pipeline_entries` join, `job_versions`,
  `placements` + `placements_guarantee_flag` in parallel) — acceptable at MVP scale (a handful of
  placements), flagged if it ever needs a single RPC like `search_candidates`.

## Outcome

- **Shipped:** `listPlacements`, the `Placements` table component with inline start-date
  confirm/update and the typed-name gate, the rewritten `/placements` page, and desktop-only
  Playwright coverage of the empty state.
- **Changed files / areas:** see Files above.
- **Tests added or updated:** `placements.spec.ts` (1 test, desktop only); relies on #162/#163's
  unit coverage for the underlying logic.
- **Verification:** `npm run lint` pass; `npm run typecheck` pass; `npm test` — same 5 pre-existing
  unrelated failures as the rest of this stack, nothing new; `npm run build` pass (all routes compile,
  including `/placements`).
- **Deviations:** AC2 (confirm/change start date) is implemented but not provable by an automated
  e2e test in this PR — there is no UI path yet to reach the Placed stage (#160, the pipeline board,
  is a separate task). Recorded as a follow-up, not silently skipped.
- **Fix rounds / escalations:** 0.
- **Models used:** planning + implementation — Claude Sonnet 5 (this session, direct implementation).
- **Claude direct fixes:** n/a.
- **Follow-ups:** once #160 (pipeline board) ships, add e2e coverage that moves a candidate through
  to Placed and exercises the confirm/update flow and the flag chip directly.
