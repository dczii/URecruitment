# Plan — #53 Recruiters filter results and see how fresh each CV is

| | |
|---|---|
| Issue | https://github.com/dczii/URecruitment/issues/53 |
| Parent | Story #53 → Epic #8 |
| Milestone | MVP |
| Branch | `feat/53-search-screen` (stacked on `feat/52-search-query-hybrid`, PR #230 still open) |
| Created | 2026-09-19 |
| Status | In progress |

## Problem

The search-query prompt (#152) and hybrid SQL (#153) exist but nothing calls them. This Story builds the search screen: a plain-language box, the five PRD filters, and results showing each CV's last-updated date.

## PRD references

| PRD section | Item | Status |
|---|---|---|
| Talent search → requirement 2 | filters: skills, years, location, language, CV date | proposed |
| Talent search → requirement 4 | results show CV last-updated date | proposed |
| UI design → Candidate search | decided |

No open PRD items. Design already exists (`design/specs/search.md`, from closed task #103) — **desktop-only**, explicitly confirmed in that screen's own spec ("superseded by the 2026-09-18 desktop-only decision"), same established precedent as every screen shipped so far. The issue's own AC3 and #154's Done-when list ("at phone width") predate that decision, same pattern already documented repeatedly since #218 — flagged, not re-litigated.

## Scope

**In scope**
- `src/server/search/run-search.ts` — orchestrates: `runAi` with the search-query prompt (#152) → `query.ts`'s `searchCandidates` (#153) with the parsed filters/keyword text (embedding passed as `null` — see Assumptions on `embedText`) → returns results + `ignored_terms` for the UI to show
- `src/app/search/page.tsx` — replace the stub with the real search screen: plain-language box, five filter controls, results table with CV last-updated date (relative + exact), loading/empty/error states, an "Ignored: …" chip for protected terms
- `e2e/search.spec.ts` — desktop only (established precedent)

**Out of scope**
- The SQL or prompt (#152/#153, already built)
- Job-scoped search (#54)
- Saving searches or alerts (non-goal, no email)
- Building `embedText`/batched embedding (flagged as an unresolved follow-up from #48 — this Story ships without real semantic ranking; keyword + filters still work, see Assumptions)

## Acceptance criteria

- [ ] **AC1** — All five filters narrow results. _Proved by:_ `search.spec.ts › AC1: five filters narrow results` (written; not executed — established local-environment constraint)
- [ ] **AC2** — Every result shows its CV's last-updated date. _Proved by:_ `search.spec.ts › AC2` (written; not executed) + `run-search.test.ts` (data presence, executed)
- [ ] **AC3** — Desktop-only (see the flagged precedent above) — the phone-width requirement from the issue/task predates the desktop-only decision. _Proved by:_ n/a at phone width; desktop layout has no horizontal overflow, covered by the shared `expectNoHorizontalOverflow` pattern at desktop width in `search.spec.ts`

## Guardrails that apply

- [x] AI output schema-validated, logged to `ai_runs` — the search-query parse is a model call via `runAi`, same as every other prompt
- [x] Protected terms never become filters — surfaced to the recruiter as an "Ignored: …" chip, per `talent-search`'s own UI instruction
- [x] Server-only data access
- [x] Works at phone width — **N/A, desktop-only**, same established precedent flagged repeatedly since #218; the design spec for this exact screen says so explicitly
- [x] Fictional data only

## Assumptions

- **`embedText` doesn't exist yet** (flagged as a follow-up from #48 — only `embedCvProfile`/`embedJobVersion` were built, not a generic text-embedding entry point). This Story's `run-search.ts` calls `searchCandidates` with `embedding: null`, so search works via hard filters + PGroonga keyword matching only, with no semantic/vector ranking component until `embedText` is built. This is a real, acknowledged limitation — flagged clearly, not silently worked around — and doesn't block AC1/AC2 (filters and keyword search both still work; only the "meaning" half of hybrid search is inactive).
- "A query the model cannot interpret produces a helpful message" (#154's own Done-when) is handled by: if the search-query `runAi` call fails or returns a schema-invalid result, `run-search.ts` catches it and the UI shows a specific "Couldn't understand that search — try rephrasing, or use the filters directly" message, distinct from the "no results" empty state.
- CV last-updated date comes from `search_candidates`'s `cv_updated_at` column (already returned by #153's SQL function) — no new query needed.
- The plain-language box always goes through the model (per `talent-search`'s flow diagram) in this Story; the skill's "skip the model call when the recruiter uses only filters" optimization is a reasonable future refinement, not required for AC1-3.

## Open questions

- none (the `embedText` gap is a flagged, deliberate limitation, not an open PRD question)

## Approach

`run-search.ts` is a small orchestration function: validate the query isn't empty, call `runAi` with the search-query prompt/schema, on success call `searchCandidates` with the parsed `filters`/`keyword_text` (and `embedding: null` per the Assumption above), and return `{ results, ignoredTerms }` or an explicit `{ error: "..." }` shape the UI renders distinctly from "no results." The page is a client-driven flow (type a query, submit, see results) backed by a Server Action calling `run-search.ts`, matching this codebase's established Server Action pattern (`createJob`, `closeGapFlag`, etc.).

## Skills in scope

- `prd-context` — Talent search requirements 2/4
- `talent-search` — search flow, UI copy for ignored terms, CV freshness display
- `ui-build` — shared loading/empty/error patterns, desktop-only precedent
- `nextjs-app` — Server Action conventions
- `ai-pipeline` — `runAi` usage for the search-query prompt
- `testing` — Playwright, desktop only

## Files

| File | Change |
|---|---|
| `src/server/search/run-search.ts` + `.test.ts` | new — orchestration: prompt → SQL → results/error |
| `src/app/search/actions.ts` | new — Server Action wrapping `run-search.ts` |
| `src/app/search/page.tsx` | modify — replace stub with the real screen |
| `e2e/search.spec.ts` | new — desktop only |

## Dependencies

- #152, #153 (this session's own predecessor, PR #230, still open)
- #103 (closed) — design

## Steps

- [ ] **T1a** `grok` — Failing tests first in `run-search.test.ts` (fake model + mocked `searchCandidates`): a successful query calls `runAi` then `searchCandidates` with the parsed filters/keyword text and `embedding: null`, returning results including `cvUpdatedAt`; protected terms in the parsed output are surfaced as `ignoredTerms` in the return shape (not applied as a filter — proving the pass-through, not re-testing the prompt's own logic); a schema-invalid or failed model call returns a distinct "couldn't understand" error shape, not an empty result; an empty query string is rejected before any model call.
  - Verify: `npm test -- search/run-search` → fails (module missing)
- [ ] **T1b** `grok` — Implement `run-search.ts` until T1a passes.
  - Verify: `npm test -- search/run-search` → pass; `npm run typecheck`
- [ ] **T2** `grok` — Build `src/app/search/actions.ts` + `src/app/search/page.tsx` (plain-language box, five filter controls, results table with relative + exact last-updated date, loading/empty/error states including the "couldn't understand" message, an "Ignored: …" chip). Add `e2e/search.spec.ts` (desktop only).
  - Rules: `ui-build` — shared patterns; desktop-only, no phone work; `talent-search` — ignored-terms UI copy
  - Verify: `npm run lint`; `npm run typecheck`; `npm run build`; `npx playwright test e2e/search.spec.ts --project=desktop --list`
- [ ] **S3** `none` — Full verification, close out docs. Do not run `pr-review`.

## Test plan

| AC | Test | Type |
|---|---|---|
| AC1 | `run-search.test.ts`, `search.spec.ts` | unit + e2e (written; local execution constraints) |
| AC2 | `run-search.test.ts` (data), `search.spec.ts` | unit + e2e |
| AC3 | desktop-only, N/A at phone; `expectNoHorizontalOverflow` at desktop | e2e |

## Verification

```
npm run lint
npm run typecheck
npm test -- search/run-search
npm run build
npx playwright test e2e/search.spec.ts --project=desktop --list
```

## UX / design

`design/specs/search.md` (desktop, 1440px).

## Data / API changes

None — reuses #152/#153's prompt and SQL function.

## Risks & rollback

Depends on unmerged PR chain (#213→#230), including #52's unverified SQL. If the underlying `search_candidates` function has a bug CI later surfaces, this Story's screen will need no changes — only the SQL. Net-new modules + one modified page; rollback is reverting/deleting.

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
