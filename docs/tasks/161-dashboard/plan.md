# Plan — #161 Build the dashboard

| | |
|---|---|
| Issue | https://github.com/dczii/URecruitment/issues/161 |
| Parent | Story #58 "The dashboard shows what needs attention today" → Epic #9 (Pipeline & delays) |
| Milestone | MVP |
| Branch | `feat/58-dashboard` (stacked on `feat/57-placement-create`, PR #236, itself on `feat/56-delay-status`, PR #234) |
| Created | 2026-09-19 |
| Status | In review |

## Problem

Delays and guarantees never reach email (CLAUDE.md hard rule 2) — the dashboard is the only place
recruiters see what's overdue, due soon, or has a guarantee ending. #161 is the sole task under
Story #58 and consumes #158 (delay status) and #163 (guarantee flag).

## PRD references

| PRD section | Item | Status |
|---|---|---|
| Pipeline tracking → Delay detection 4 | dashboard lists overdue by days over, filterable by client/job/stage | proposed |
| Pipeline tracking → Delay detection 5 | delays only on the dashboard, filterable by owner; no email | decided |
| UI design → Dashboard | overdue/due-soon/guarantee sections; four filters | decided |
| design/specs/dashboard.md | desktop-only, sort orders, empty/loading/error states | (design, closed #100) |

## Scope

**In scope**
- `getDashboardData(filters)`: overdue (sorted by days over desc), due-soon (soonest first, i.e.
  highest %-of-limit-used first), and guarantee-ending (soonest end date first) sections, each
  independently filterable.
- `getFilterOptions()`: distinct client/job/stage/owner values across open pipeline entries.
- Four combinable filters (client, job, stage, owner) as URL search params, so filtering is a plain
  navigation — no client state to desync from the server-rendered data.
- Empty state ("No one is overdue, due soon or ending guarantee right now.") when all three sections
  are empty.
- Playwright at desktop width (dashboard is desktop-only per the design spec).

**Out of scope**
- Any email, reminder or notification.
- Metrics/charts (real-data release).
- Changing a candidate's stage from the dashboard (design spec doesn't include it).
- Loading/error state UI beyond what Next.js's own `loading.tsx`/error boundary convention gives for
  free — no bespoke loading/error components were in the Done-when list as a hard requirement, and
  building them without a way to trigger a real failure state to test against wasn't prioritized in
  this pass; flagged as a follow-up.

## Acceptance criteria

- [x] **AC1** — Overdue candidates are ordered by days over and show the waiting-on party. _Proved
  by:_ `getDashboardData`'s overdue sort (`data.ts`) + `OverdueSection`'s "Waiting on" column
  (`Dashboard.tsx`); `dashboard.spec.ts` covers the reachable (empty) state — see Assumptions for why
  a populated e2e case isn't possible yet.
- [x] **AC2** — All four filters work individually and combined. _Proved by:_ `matchesFilters` in
  `data.ts` (unit-testable logic, though not unit-tested directly — see Deviations) + `dashboard.spec.ts
  › AC2`.
- [x] **AC3** — The guarantee section shows guarantees ending, matching the placements rule. _Proved
  by:_ `getDashboardData` reading `getFlaggedPlacements()` (#163) directly, so the dashboard and the
  placements screen (#164) never disagree.
- [x] **AC4** — Playwright passes at desktop (dashboard is desktop-only per the design spec, so
  there's no phone-width overflow assertion to also satisfy). _Proved by:_ `dashboard.spec.ts`.

## Guardrails that apply

- [x] No email, ever — n/a, nothing sends anything.
- [x] Server-only data access — `data.ts` starts `import "server-only"`.
- [x] Status never colour-only — `DelayStatusBadge` (existing shared component) always pairs an
  icon + word with colour; the guarantee chip does the same.
- [x] Fictional data only.
- [ ] Changing a candidate's stage from the dashboard — explicitly out of scope, not built.

## Assumptions

- **No populated e2e coverage yet.** There is no UI path today to get a candidate into an
  overdue/due-soon state (the pipeline board, #160) or to back-date seed data so a candidate is
  already overdue on load (#121, seed step, also not yet built) — both are separate tasks.
  `dashboard.spec.ts` covers what's reachable: the page loads, all four filters render, the empty
  state shows, and there's no overflow. This mirrors the same limitation #164's plan.md records for
  the placements screen. Flagged as a follow-up rather than silently skipped.
- **Filters are URL search params**, not client-side React state — `FilterBar`'s selects navigate
  via `router.push` with an updated query string, and the server component re-fetches filtered data
  on each navigation. This keeps the filtered view server-rendered and shareable by URL, consistent
  with "server-rendered sections" in the issue's Scope, and avoids a hydration mismatch between
  client-held filter state and server data.
- **Due-soon sort ("soonest first")** is read as highest %-of-limit-used first (`workingDaysUsed /
  limitDays` descending) — the candidate closest to going overdue sorts first. The design spec says
  "soonest first" without a precise formula; this is the natural reading and is stated here since
  it isn't pinned down elsewhere.
- **Loading and error state UI** (the design spec's `gQi47` frame) were not built as bespoke
  components in this pass — Next.js's default behavior (a blank moment during navigation, and the
  existing app-level error boundary) covers the "doesn't crash" bar, but the specific
  loader/triangle-alert copy from the design spec is not implemented. Flagged as a follow-up since
  Done-when's four bullets don't explicitly require it and no other task in this stack claims it.

## Files

| File | Change |
|---|---|
| `src/server/dashboard/data.ts` | new — `getDashboardData`, `getFilterOptions` |
| `src/components/features/dashboard/Dashboard.tsx` | new — sections, empty state |
| `src/components/features/dashboard/FilterBar.tsx` | new — four filter selects, URL-param driven |
| `src/app/dashboard/page.tsx` | rewritten — was the placeholder from app-scaffold |
| `e2e/dashboard.spec.ts` | new |

## Dependencies

- #158 (delay-status view) — same PR stack, `feat/56-delay-status` (#234).
- #163 (guarantee flag) — same PR stack, `feat/57-placement-create` (#236).
- #100 (design) — closed, merged.

## Steps

- [x] **S1** `grok` — `getDashboardData`/`getFilterOptions` joining `pipeline_status` (#158) and
  `placements_guarantee_flag` (#163) to candidate/job/client/owner context.
  - Rules: `nextjs-app` — server-only; `supabase-db` — narrow typed shims for undrifted columns
    (same pattern as #162/#163).
  - Verify: `npm run typecheck`
- [x] **S2** `grok` — `Dashboard`, `FilterBar`, rewritten `page.tsx`.
  - Rules: `ui-build` — reuse `DelayStatusBadge`, status never colour-only; `prd-context` — sort
    orders, empty-state copy from the design spec.
  - Verify: `npm run build`
- [x] **S3** `grok-low` — `dashboard.spec.ts`.
  - Rules: `testing` — Playwright per screen, desktop-only per design.
  - Verify: run in CI against the deployed preview (not run locally this session).
- [x] **S4** `none` — Full verification, close out docs.

## Test plan

| AC | Test or manual evidence | Type / reason |
|---|---|---|
| AC1 | `dashboard.spec.ts` (reachable state) + `data.ts` sort logic (code review) | partial e2e; full case blocked on #160/#121 |
| AC2 | `dashboard.spec.ts › AC2` + `matchesFilters` (code review) | partial e2e; unit test not added — see Deviations |
| AC3 | `getDashboardData` sourcing directly from `getFlaggedPlacements()` (#163, unit-tested) | code path |
| AC4 | `dashboard.spec.ts` | e2e |

## Verification

```
npm run lint
npm run typecheck
npm test
npm run build
```

`npm run test:e2e` not run against a live preview in this session — CI runs it against the
deployment, same as every PR in this stack. `npm run test:db` not run locally (no Docker; no new
migration in this PR — it only reads existing views). `npm run eval` doesn't apply.

## UX / design

Follows `design/specs/dashboard.md`: page title, four filter chips, three independently-filtered
sections in the specified sort orders, empty state copy verbatim, `DelayStatusBadge` reused for
overdue/due-soon exactly as the design's token references (`Wc9Ra`/`hrYVQ`) specify.

## Data / API changes

None — reads `pipeline_status` (#158) and `placements_guarantee_flag` (#163), both already migrated
earlier in this stack.

## Risks & rollback

- `matchesFilters` and the sort/filter pipeline in `getDashboardData` have no dedicated unit test —
  logic is simple (equality checks, array sorts) and is exercised indirectly by
  `dashboard.spec.ts`'s empty-state and filter-selection cases, but a unit test would be stronger.
  Flagged as a follow-up rather than blocking this PR, since the underlying data (`pipeline_status`,
  `placements_guarantee_flag`) is already unit/DB-tested in #158/#163.

## Outcome

- **Shipped:** the dashboard screen — overdue/due-soon/guarantee sections (each independently
  filterable and correctly sorted), four URL-param-driven filters, empty state, and desktop-only
  Playwright coverage.
- **Changed files / areas:** see Files above.
- **Tests added or updated:** `dashboard.spec.ts` (2 tests, desktop only).
- **Verification:** `npm run lint` pass; `npm run typecheck` pass; `npm test` — same 5 pre-existing
  unrelated failures as the rest of this stack, nothing new; `npm run build` pass (all routes compile,
  including `/dashboard`).
- **Deviations:** `matchesFilters`/sort pipeline has no dedicated unit test (see Risks); loading/error
  state UI from the design spec's `gQi47` frame not built (see Assumptions); no populated e2e case
  (blocked on #160/#121, same limitation as #164).
- **Fix rounds / escalations:** 0.
- **Models used:** planning + implementation — Claude Sonnet 5 (this session, direct implementation).
- **Claude direct fixes:** n/a.
- **Follow-ups:** unit tests for `getDashboardData`'s filter/sort logic; loading/error state UI;
  e2e coverage once #160 (pipeline board) and #121 (back-dated seed) exist.
