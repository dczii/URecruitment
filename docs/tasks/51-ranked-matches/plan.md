# Plan — #51 Recruiters review ranked matches and decide themselves

| | |
|---|---|
| Issue | https://github.com/dczii/URecruitment/issues/51 |
| Parent | Story #51 → Epic #7 |
| Milestone | MVP |
| Branch | `feat/51-ranked-matches` (stacked on `feat/50-rescore-after-save`, PR #228 still open) |
| Created | 2026-09-19 |
| Status | In progress |

## Problem

Scores exist (#49) but nothing shows them. This Story builds the ranked-match list on job detail: candidates ordered by score, with matched/missing/uncertain skills and CV evidence, sortable/filterable without any AI call, and an explicit add-to-pipeline action the recruiter takes — nothing pre-selected.

## PRD references

| PRD section | Item | Status |
|---|---|---|
| Job matching → Match output | ranked list, sort/filter, AI never shortlists | decided |
| Job matching → requirement 4 | score shows model version + date | proposed |
| UI design → Job detail | ranked matches with scores and reasons | decided |
| AI governance | AI only suggests | decided |

No open PRD items. Design already exists (`design/specs/job-detail.md`'s "Ranked matches" section, from closed task #101) — desktop-only, same established precedent as every screen shipped so far.

**Cross-epic dependency flag**: #151 lists a dependency on `#156` ("Implement the stage model and the move action with typed-name audit," Phase P8 = Epic 9, Pipeline & delays) — an Epic **outside** what was requested for this session (Epics 5, 6, 7, 8 only). #156 is the canonical, full stage-move system (move validation, audit trail, backwards-move clock reset, end states) and does not exist yet. This Story does NOT build #156. Instead, "add to pipeline" here is implemented as the minimal, self-contained piece #156's own scope already names as a sub-behavior ("Adding a candidate to a job creates the entry in Sourced"): inserting one `pipeline_entries` row with `stage: "Sourced"` and the typed recruiter name (CLAUDE.md hard rule 8), using the already-closed #112 migration's schema directly — no stage-move logic, no `stage_events` audit row (that's #156's own job, since it explicitly covers "the move action," and initial creation isn't a move). This is flagged, not silently resolved, and should be reconciled with #156 when Epic 9 is worked.

## Scope

**In scope**
- `src/server/matching/matches.ts` — server query reading stored `match_scores` for a job's current version (via #49's `listMatchScoresForJob`), joined with candidate names and skills evidence — no AI call
- `src/components/features/matching/RankedMatches.tsx` — client component: sortable/filterable list (client-side, no re-fetch, no AI call), `AiSuggestion` + model version/date on every score, `SourceQuote` on every skill claim, an "Add to pipeline" button per candidate
- A minimal `addCandidateToPipeline(jobId, candidateId, typedName)` Server Action — creates one `pipeline_entries` row in `"Sourced"`, nothing more (explicitly not #156's full move/audit system — see the cross-epic flag above)
- Replace the "Ranked matches" placeholder on `src/app/jobs/[id]/page.tsx` with the real component
- `e2e/matches.spec.ts` — desktop only (established precedent)
- A test proving no AI call happens on page load (per #151's own Done-when list)

**Out of scope**
- Scoring or re-scoring (#49/#50, already built)
- Bulk add or any candidate pre-selection
- Sending a shortlist anywhere (non-goal)
- The full stage model, stage moves, `stage_events` audit trail, delay status (#156, Epic 9 — explicitly deferred, see flag above)
- The embedded pipeline board (`design/specs/job-detail.md`'s separate section) — that's Epic 9's board, not this task

## Acceptance criteria

- [ ] **AC1** — Job open shows candidates ranked with score, matched/missing/uncertain, and CV evidence. _Proved by:_ `matches.spec.ts › AC1: ranked list shows score and skill evidence` (written; not executed — established local-environment constraint)
- [ ] **AC2** — Sort/filter updates the ranking without any AI call. _Proved by:_ `matches.spec.ts › AC2` (client-side sort, no network call) + a static/behavioral test proving no AI call happens on page load
- [ ] **AC3** — Adding a candidate to the pipeline is the recruiter's own action; nothing is pre-selected. _Proved by:_ `matches.test.ts › AC3: no candidate selected by default; add-to-pipeline requires an explicit click` (component-level) + `pipeline-add.test.ts › a typed name is required, one row created in Sourced`
- [ ] **AC4** — A score is labelled a suggestion and shows its model version and date. _Proved by:_ `matches.spec.ts › AC4` (written; not executed) — the underlying data (`modelVersion`, `createdAt`) is already proven present by #49's `read.test.ts`

## Guardrails that apply

- [x] AI only suggests — nothing pre-selected, add-to-pipeline is explicit, no AI call on page load
- [x] AI output schema-validated, logged to `ai_runs`, shows source text — this screen only reads already-validated scores from #49, no new AI call
- [x] Typed recruiter name recorded on changes — CLAUDE.md hard rule 8, the minimal pipeline-add action
- [x] Server-only data access
- [x] Works at phone width — **N/A, desktop-only**, same established precedent flagged repeatedly since #218
- [x] Fictional data only

## Assumptions

- "No AI call on page load" (#151's own Done-when) is proven by: the page/query path never imports `runAi`, `getModel`, or any `src/server/ai/**` module — a static check, mirroring the `no-bypass.test.ts` pattern from #169, rather than a live network-call assertion (this codebase has no network in tests anywhere).
- Sort/filter state lives entirely client-side (already-fetched score data), never triggering a new server fetch or AI call — matches #151's explicit "without re-running any AI call."
- The minimal `addCandidateToPipeline` action is a deliberate, flagged simplification of #156's eventual "creates the entry in Sourced" sub-behavior — when #156 is built, its stage-model module should absorb or supersede this action rather than the two diverging.
- `listMatchScoresForJob`'s `"stale"` entries (from #49) are shown distinctly (e.g. de-emphasized, no score number) rather than omitted, so a recruiter isn't confused by a candidate silently missing from the list — pick a clear, minimal treatment and document it.

## Open questions

- none (the #156 cross-epic dependency is flagged and deliberately worked around, not an open PRD question)

## Approach

`matches.ts` calls #49's `listMatchScoresForJob` (no new query logic duplicated) plus a join for candidate display names and evidence text, returning plain data — no AI import anywhere in this module or its callers. `RankedMatches.tsx` receives the full list once (Server Component fetch) and does all sorting/filtering in the browser with already-loaded data. The minimal pipeline-add action is a single-purpose Server Action, explicitly scoped to avoid overlapping with #156's eventual real implementation.

## Skills in scope

- `prd-context` — Job matching → Match output; UI design → Job detail
- `ui-build` — `AiSuggestion`/`SourceQuote` reuse, desktop-only precedent
- `nextjs-app` — Server Component + Server Action conventions
- `testing` — no-AI-call proof, Playwright
- `compliance-review` — nothing pre-selected, AI-only-suggests

## Files

| File | Change |
|---|---|
| `src/server/matching/matches.ts` + `.test.ts` | new — ranked list read, no AI import |
| `src/components/features/matching/RankedMatches.tsx` | new — sortable/filterable list, add-to-pipeline |
| `src/app/jobs/[id]/pipeline-add-actions.ts` + `.test.ts` | new — minimal Sourced-entry creation |
| `src/app/jobs/[id]/page.tsx` | modify — replace the placeholder |
| `e2e/matches.spec.ts` | new — desktop only |

## Dependencies

- #149 (this session's own predecessor, PR #227/#228, still open) — `listMatchScoresForJob`
- #137 (in the stack) — job detail page
- #112 (closed) — `pipeline_entries` schema
- **#156 (Epic 9, not requested this session) — explicitly NOT built here; see the cross-epic flag above**

## Steps

- [ ] **T1a** `grok` — Failing tests first in `matches.test.ts`: `getRankedMatches(jobId)` returns candidates ordered by score descending, each with matched/missing/uncertain + evidence, model version + date; a `"stale"` entry from #49's read path is included but marked distinctly (no score shown as current); a static test asserts no file in this module's import chain touches `src/server/ai/**`.
  - Verify: `npm test -- matching/matches` → fails (module missing)
- [ ] **T1b** `grok` — Implement `matches.ts` until T1a passes.
  - Verify: `npm test -- matching/matches` → pass; `npm run typecheck`
- [ ] **T2a** `grok` — Failing tests first in `pipeline-add-actions.test.ts`: a missing/blank typed name is refused; a valid call inserts exactly one `pipeline_entries` row with `stage: "Sourced"`; nothing pre-populates this action — it's only ever called on an explicit invocation.
  - Verify: `npm test -- jobs/pipeline-add` → fails (module missing)
- [ ] **T2b** `grok` — Implement `pipeline-add-actions.ts` until T2a passes.
  - Verify: `npm test -- jobs/pipeline-add` → pass; `npm run typecheck`
- [ ] **T3** `grok` — Build `RankedMatches.tsx` (sort/filter client-side, `AiSuggestion`+`SourceQuote`, add-to-pipeline button with the typed-name gate reusing `TypedNameDialog`/`recruiter-name.ts` exactly as in #133/#47), replace the job-detail placeholder. Add `e2e/matches.spec.ts` (desktop only).
  - Rules: `ui-build` — reuse patterns exactly; `compliance-review` — nothing pre-selected
  - Verify: `npm run lint`; `npm run typecheck`; `npm run build`; `npx playwright test e2e/matches.spec.ts --project=desktop --list`
- [ ] **S4** `none` — Full verification, close out docs. Do not run `pr-review`.

## Test plan

| AC | Test | Type |
|---|---|---|
| AC1 | `matches.test.ts`, `matches.spec.ts` | unit + e2e (written; local execution constraints) |
| AC2 | `matches.test.ts` (no-AI-import static check) + `matches.spec.ts` | unit + e2e |
| AC3 | `pipeline-add-actions.test.ts`, `matches.spec.ts` | unit + e2e |
| AC4 | `matches.test.ts` (data present), `matches.spec.ts` (rendered) | unit + e2e |

## Verification

```
npm run lint
npm run typecheck
npm test -- matching/matches jobs/pipeline-add
npm run build
npx playwright test e2e/matches.spec.ts --project=desktop --list
```

## UX / design

`design/specs/job-detail.md` — "Ranked matches" section (desktop, 1440px).

## Data / API changes

None — reuses `match_scores` (#111), `pipeline_entries` (#112).

## Risks & rollback

Depends on unmerged PR chain (#213→#228). Net-new modules + one modified page; rollback is reverting/deleting.

## Outcome

- **Shipped:**
- **Changed files / areas:**
- **Tests added or updated:**
- **Verification:**
- **Deviations:**
- **Fix rounds / escalations:**
- **Models used:**
- **Claude direct fixes:**
- **Follow-ups:**
