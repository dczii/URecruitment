# Plan — #52 Recruiters search in plain language

| | |
|---|---|
| Issue | https://github.com/dczii/URecruitment/issues/52 |
| Parent | Story #52 → Epic #8 |
| Milestone | MVP |
| Branch | `feat/52-search-query-hybrid` (stacked on `feat/51-ranked-matches`, PR #229 still open) |
| Created | 2026-09-19 |
| Status | In progress |

## Problem

Nothing today turns a recruiter's plain-language query into search results. This Story builds the search-query prompt/schema (query → filters + search text, protected terms reported not applied) and the hybrid SQL function combining PGroonga keyword matching, pgvector similarity, and hard filters — all in one query, fast enough for the PRD's 3-second budget.

## PRD references

| PRD section | Item | Status |
|---|---|---|
| Talent search → requirement 1 | plain-language search | proposed |
| Technical architecture → Search | pgvector + PGroonga | proposed |
| AI pipeline → Search | one model call → filters + search text; Postgres runs keyword/vector/filter together | suggested |
| Non-functional → Speed | under 3 seconds | decided |

No open PRD items. Design needed for the search screen itself is **out of scope for this Story's own tasks** (#152/#153 are prompt + SQL only; the screen is #53's job).

## Scope

**In scope**
- `src/server/ai/prompts/search-query/{v1,index}.ts` — schema (skills, min/max years, locations, languages, `cv_updated_after`, `keyword_text`, `semantic_text`, `ignored_terms`) + prompt with EN/ZH fictional examples, protected-term handling (reported via `ignored_terms`, never applied as a filter), ambiguity guidance
- A migration enabling `pgroonga`, indexing searchable candidate text, and a `searchable_candidates` view (MVP: passes all candidates; the real-data release will change only this view, per `talent-search` skill's own instruction)
- `search_candidates(filters jsonb, keyword text, embedding vector, job_version_id uuid default null, lim int, off int)` — one SQL function: hard filters → PGroonga keyword score → vector similarity → reciprocal rank fusion (or job-version match-score ranking when `job_version_id` is given) → returns ranked rows with a keyword highlight
- `src/server/search/query.ts` — thin TS wrapper calling the SQL function

**Out of scope**
- The search screen UI (#53)
- Searching from a job's UI wiring (#54) — though the SQL function's `job_version_id` argument is built here per #153's own scope
- External sources (non-goal, but the `searchable_candidates` view must not preclude adding one later)
- Choosing an AI/embedding provider (still open, same stub as everywhere else)

## Acceptance criteria

- [ ] **AC1** — A plain-language query becomes filters + search text; results reflect both. _Proved by:_ `search-query` prompt/schema tests (schema shape) + `query.test.ts` (SQL wrapper applies both filters and keyword/vector text)
- [ ] **AC2** — A protected attribute mentioned in a query never becomes a filter or scoring criterion. _Proved by:_ prompt example + `query.test.ts › protected terms never reach the filter object`
- [ ] **AC3** — Search over the seeded set completes in under 3 seconds. _Proved by:_ `supabase/tests/search.db.test.ts` (DB-integration timing assertion — **not run locally**, no Docker; CI must confirm)
- [ ] **AC4** — A Simplified Chinese query finds Chinese keyword matches. _Proved by:_ prompt EN/ZH examples + `search.db.test.ts › Chinese keyword hit` (DB-integration, not run locally)

## Guardrails that apply

- [x] Protected terms never become filters — `talent-search` skill's own fairness rule, this Story's core purpose
- [x] AI output logged to `ai_runs` — search-query parse is a model call like any other
- [x] Server-only data access; the SQL function is `security_invoker`, revoked from `anon`/`authenticated`
- [x] Free-tier limits — search must stay well under 3s on Supabase Free
- [x] Fictional data only

## Assumptions

- No `searchable_candidates` view or PGroonga extension exists yet — both are new in this Story's migration.
- The embeddings table (#111) still has no fixed vector dimension (an open provider question, per that migration's own comment) — the hybrid function's vector-similarity clause is written against `embeddings.embedding` as-is; no HNSW index is added yet (matches #111's own deferral), so vector search works correctly but isn't ANN-accelerated until a provider/dimension is chosen. This is a documented, inherited limitation, not a new one.
- "One database query" (per #153's own Done-when) means the SQL function itself does filters + keyword + vector + fusion server-side — `query.ts` is a thin pass-through, not a second round of filtering in application code.
- The 3-second timing test and the Chinese-keyword-hit test are both DB-integration tests (`supabase/tests/*.db.test.ts`) — consistent with every prior Story's handling, these are written but not executable in this environment (no Docker/local Supabase); CI must confirm.
- Reciprocal rank fusion constants live in one place (per the skill's own instruction) and are covered by a unit-level test on the fusion math itself (not just the DB-integration test), so the core logic is verified even without Docker.

## Open questions

- none

## Approach

`search-query/v1.ts` (written directly, executor tag `claude`) mirrors the other prompts' structure, with an explicit rule: any protected term (age, gender, race, religion, marital status, and nationality/language unless clearly meant as a language filter) goes into `ignored_terms` with a reason, never into `filters`. The migration enables `pgroonga`, adds a PGroonga index on a searchable-text expression over `candidate_profiles`/`candidate_skills`, and creates `searchable_candidates` (a permissive view in the MVP). `search_candidates(...)` does hard filters first, then PGroonga (`&@~`) keyword scoring, then vector cosine similarity, fused by reciprocal rank fusion (constants named and tested), with a `job_version_id` argument that switches ranking to the stored match score when given. `query.ts` is a minimal TypeScript wrapper.

## Skills in scope

- `prd-context` — Talent search requirements
- `talent-search` — the exact SQL function signature, fusion rule, visibility-hook view, fairness rule (already documented in the skill, followed precisely)
- `ai-prompts` — schema/prompt structure, versioning
- `ai-pipeline` — `runAi`, `ai_runs` logging (via the prompt task, not this Story's SQL task)
- `supabase-db` — PGroonga/pgvector extensions, `security_invoker`, RLS
- `testing` — test-first, DB-integration test conventions
- `compliance-review` — protected-term handling

## Files

| File | Change |
|---|---|
| `src/server/ai/prompts/search-query/{v1,index}.ts` | new — schema, prompt, EN+ZH examples |
| `supabase/migrations/<timestamp>_search_hybrid.sql` | new — pgroonga, searchable_candidates view, search_candidates function |
| `src/server/search/query.ts` + `.test.ts` | new — SQL wrapper + fusion-math unit test |
| `supabase/tests/search.db.test.ts` | new — DB-integration: filters, Chinese keyword, fusion determinism, job-scoped ranking, timing budget |

## Dependencies

- #169 (`runAi`, in the PR stack)
- #145 (embeddings, in the PR stack)
- #111 (closed) — pgvector/match_scores schema

## Steps

- [ ] **T1** `claude` — Write `src/server/ai/prompts/search-query/v1.ts` + `index.ts`: schema (filters: skills[], min_years, max_years, locations[], languages[], cv_updated_after; plus keyword_text, semantic_text, ignored_terms[] each with a reason), prompt with the protected-term rule, ambiguity guidance ("if the query is too vague to extract anything useful, return broad search text rather than empty filters, so the recruiter gets something to refine from"), EN + Simplified Chinese fictional examples including at least one with a protected term correctly routed to `ignored_terms`.
  - Rules: `ai-prompts`; `talent-search` — exact output shape; `compliance-review` — protected terms never become filters
  - Verify: `npm run typecheck`
- [ ] **T2a** `grok` — Write the migration (pgroonga extension, PGroonga index, `searchable_candidates` view, `search_candidates` SQL function per the `talent-search` skill's documented signature and fusion rule). Write failing unit tests first for the **fusion math** in isolation (a small pure TS or SQL-adjacent test proving reciprocal rank fusion combines two rank lists deterministically) plus `supabase/tests/search.db.test.ts` (DB-integration: each filter excludes correctly, a Chinese keyword matches, fusion order is deterministic, `job_version_id` switches to match-score ranking, a timing assertion under 3s).
  - Verify: migration lints clean (new table? no — `searchable_candidates` is a view; function has no RLS requirement but must be `security_invoker` and revoked); DB-integration tests are written but **not run** (no Docker) — CI must confirm
- [ ] **T2b** `grok` — Implement `src/server/search/query.ts` (thin wrapper calling `search_candidates` via `getDb().rpc(...)`) and a small fusion-math unit test file that CAN run locally (pure function, no DB).
  - Verify: `npm test -- search/query` → pass locally (the pure fusion-math part); `npm run typecheck`
- [ ] **S3** `none` — Full verification, close out docs. Do not run `pr-review`.

## Test plan

| AC | Test | Type |
|---|---|---|
| AC1 | `query.test.ts` (wrapper shape), search-query schema | unit |
| AC2 | `query.test.ts`, prompt example | unit |
| AC3 | `search.db.test.ts` timing assertion | DB integration (not run locally) |
| AC4 | `search.db.test.ts` Chinese keyword case | DB integration (not run locally) |

## Verification

```
npm run lint
npm run typecheck
npm test -- search
```
(`npm run test:db` named in #153's own verification block cannot run locally — no Docker — consistent with every prior Story.)

## UX / design

n/a for this task (the search screen is #53's job).

## Data / API changes

New: `pgroonga` extension, `searchable_candidates` view, `search_candidates` function.

## Risks & rollback

Depends on unmerged PR chain (#213→#229). This is a DB-heavy task whose core SQL correctness can't be verified in this environment — flagged clearly, CI-dependent. Net-new modules + migration; rollback is dropping the function/view/extension and deleting the files.

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
