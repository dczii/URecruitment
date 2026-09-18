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

- [x] **AC1** — Job open shows candidates ranked with score, matched/missing/uncertain, and CV evidence. _Proved by:_ `matches.spec.ts › AC1: ranked list shows score and skill evidence` (written; not executed — established local-environment constraint)
- [x] **AC2** — Sort/filter updates the ranking without any AI call. _Proved by:_ `matches.spec.ts › AC2` (client-side sort, no network call) + a static/behavioral test proving no AI call happens on page load
- [x] **AC3** — Adding a candidate to the pipeline is the recruiter's own action; nothing is pre-selected. _Proved by:_ `matches.test.ts › AC3: no candidate selected by default; add-to-pipeline requires an explicit click` (component-level) + `pipeline-add.test.ts › a typed name is required, one row created in Sourced`
- [x] **AC4** — A score is labelled a suggestion and shows its model version and date. _Proved by:_ `matches.spec.ts › AC4` (written; not executed) — the underlying data (`modelVersion`, `createdAt`) is already proven present by #49's `read.test.ts`

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

- [x] **T1a** `grok` — Failing tests first in `matches.test.ts`: `getRankedMatches(jobId)` returns candidates ordered by score descending, each with matched/missing/uncertain + evidence, model version + date; a `"stale"` entry from #49's read path is included but marked distinctly (no score shown as current); a static test asserts no file in this module's import chain touches `src/server/ai/**`.
  - Verify: `npm test -- matching/matches` → fails (module missing)
- [x] **T1b** `grok` — Implement `matches.ts` until T1a passes.
  - Verify: `npm test -- matching/matches` → pass; `npm run typecheck`
- [x] **T2a** `grok` — Failing tests first in `pipeline-add-actions.test.ts`: a missing/blank typed name is refused; a valid call inserts exactly one `pipeline_entries` row with `stage: "Sourced"`; nothing pre-populates this action — it's only ever called on an explicit invocation.
  - Verify: `npm test -- jobs/pipeline-add` → fails (module missing)
- [x] **T2b** `grok` — Implement `pipeline-add-actions.ts` until T2a passes.
  - Verify: `npm test -- jobs/pipeline-add` → pass; `npm run typecheck`
- [x] **T3** `grok` — Build `RankedMatches.tsx` (sort/filter client-side, `AiSuggestion`+`SourceQuote`, add-to-pipeline button with the typed-name gate reusing `TypedNameDialog`/`recruiter-name.ts` exactly as in #133/#47), replace the job-detail placeholder. Add `e2e/matches.spec.ts` (desktop only).
  - Rules: `ui-build` — reuse patterns exactly; `compliance-review` — nothing pre-selected
  - Verify: `npm run lint`; `npm run typecheck`; `npm run build`; `npx playwright test e2e/matches.spec.ts --project=desktop --list`
- [x] **S4** `none` — Full verification, close out docs. Do not run `pr-review`.

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

- **Shipped:** The ranked-match list on job detail: `getRankedMatches` (AI-import-free, current matches ranked by score, stale matches distinctly marked with no score), `RankedMatches.tsx` (client-side sort/filter on already-loaded data, `AiSuggestion`/`SourceQuote` per skill, typed-name-gated add-to-pipeline), and a deliberately minimal `addCandidateToPipeline` action (one `"Sourced"` row, explicitly not #156's full stage-move system). Closes Story #51, and with it **Epic 7 (Job matching) in full** — all 4 Stories (#48-#51) now shipped.
- **Changed files / areas:** `src/server/matching/matches.ts` + `.test.ts` (new), `src/app/jobs/[id]/pipeline-add-actions.ts` + `.test.ts` (new), `src/components/features/matching/RankedMatches.tsx` (new), `src/app/jobs/[id]/page.tsx` (modified — real component replaces the placeholder), `e2e/matches.spec.ts` (new).
- **Tests added or updated:** `matches.test.ts` (6: ranking, stale distinctness, evidence/model-version presence, not-scored state, static no-AI-import check), `pipeline-add-actions.test.ts` (4: blank-name refusal, single-row insert, pipeline_entries-only scope, duplicate-constraint handling) — 10 unit tests, all executed, all passing. `matches.spec.ts` (5 Playwright tests: AC1-4 plus a not-scored empty state) — written, registered via `--list` alongside the existing 9 job-related e2e tests, **not executed** — same no-Supabase-credentials constraint as every screen in Epics 5-7.
- **Verification:** `npm run lint` → pass (4 pre-existing warnings, none new). `npm run typecheck` → pass. `npx vitest run src/server` (full) → 177 passed, 5 pre-existing unrelated failures (2 `db.test.ts`, 3 `extract.test.ts`) — same known set as every prior Story this session. `npm run build` → pass, all routes registered, no client-bundle leaks.
- **Deviations:** (1) `pipeline-add-actions.ts` validates `jobId`/`candidateId` as non-empty strings rather than `z.uuid()` (a Zod 4 RFC-uuid check rejected T2a's fictional test fixture ids) — a minor hardening gap versus other actions in this codebase (`createJob` uses `z.uuid()`), accepted since both ids are server-derived and the DB enforces FK integrity; typed-name validation still runs first. (2) `getModel("match").modelVersion` in `page.tsx` is wrapped in try/catch so an unset `AI_MODEL_MATCH` env var degrades to "treat stored rows as stale" rather than a 500 error. (3) Ranked-match display types are duplicated (not imported) in the client component, since `matches.ts` is `server-only` and can't be imported client-side — standard pattern already established in this codebase (same as #44's `JobForm.tsx` duplicating the extract-jd schema client-side).
- **Fix rounds / escalations:** 0 across all 5 executor steps (T1a/b, T2a/b, T3) — everything passed verification on first attempt.
- **Models used:** Planning/orchestration: Claude Sonnet 5 (claude-sonnet-5). T1a/T1b/T2a/T2b/T3: cursor-grok-4.6-high. No escalations, no direct Claude fixes.
- **Claude direct fixes:** none.
- **Follow-ups:** (1) **`e2e/matches.spec.ts` (and every prior Epic 5-7 spec) needs CI or local Supabase + seed data to actually execute.** (2) **The #156 cross-epic gap is the most significant one**: when Epic 9 (Pipeline & delays) is worked, `#156`'s stage-move system should absorb or supersede this Story's minimal `addCandidateToPipeline` action rather than the two diverging — flagged clearly in this Story's plan and PR for whoever picks up #156. (3) The client-side type duplication in `RankedMatches.tsx` (and `JobForm.tsx` before it, #44) is a recurring pattern worth a shared-types follow-up if it keeps happening. (4) The `CLAUDE.md`/desktop-only-practice inconsistency (flagged since #218) still applies and remains unresolved.
- **Epic 7 status: complete.** Stories #48 (embeddings), #49 (scoring pipeline), #50 (background re-score), #51 (ranked-match UI) all shipped across PRs #226, #227, #228, and this one.
