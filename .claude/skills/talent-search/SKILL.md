---
name: talent-search
description: >
  HRManagement talent search: keyword (PGroonga, English and Simplified Chinese) plus structured
  filters (skills, years, location, language, CV date), job-scoped search, protected-term
  handling, < 3 s target. No natural-language parsing, embeddings or scores in the MVP. Use for
  any search UI, search SQL or search server code.
---

# Talent search

Read `design/specs/search.md`, `docs/ux/flows.md` (search journeys), `prd-context/references/requirements.md` (talent search), and `docs/compliance/baseline.md` (fair employment). Code: `src/server/search/{query,job-scoped}.ts`, `src/app/search/`, `src/components/features/search/`, migration `…180000_search_candidates_keyword`, tests `supabase/tests/search.db.test.ts`, `e2e/search*.spec.ts`.

## What is built

- One RPC: `search_candidates(filters, keyword, lim, off)` returns `candidate_id, full_name, headline, total_years, location, languages, cv_updated_at, keyword_score, highlight`. Default limit 50.
- Filters are typed (`SearchCandidatesFilters`): `skills[]`, `min_years`, `max_years`, `locations[]`, `languages[]`, `cv_updated_after`. Validate input with Zod in the Server Action before calling the RPC.
- Job-scoped search (`getJobScopedResults`) takes a `jobId` and the recruiter's filters, calls the same RPC with no keyword, and returns `not_ready` when the job has no current version. There is no ranking by job fit.

## Rules

1. **No product AI:** no query parsing by a model, no embeddings, no semantic or match score. Don't revive the dropped hybrid function.
2. Results are a list for a human. Nothing is auto-shortlisted, contacted or hidden by a score.
3. Language and nationality filters are allowed only as an explicit job requirement with a written reason; otherwise the UI must not offer them as ranking inputs. Never filter on name, age, gender, race, religion or marital status; ignore those terms if typed and say so.
4. Keyword search must hit Chinese text (test with a ZH fixture). Ensure the highlight is rendered as text, never as raw HTML from CV content.
5. Target < 3 s on the sample set. Check with `explain analyze` when changing the function or indexes.
6. New search SQL goes in a new migration (see `supabase-db`), with a DB test for filters, ZH hit, empty result and offset.
7. Show the empty state with the active filters so recruiters can clear them; results and counts are announced politely (`aria-live`).
