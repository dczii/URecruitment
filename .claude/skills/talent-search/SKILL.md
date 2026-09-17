---
name: talent-search
description: >
  URecruitment talent search: plain-language query → filters + keyword text + semantic text,
  hybrid ranking (PGroonga keyword + pgvector similarity + hard filters in one SQL function),
  filters for skills / years / location / language / CV date, search from a job ranked by match
  score, protected-term handling, <3 s target, and hooks for later consent/retention filtering and
  external sources. Use for any search UI, search SQL or search-query prompt work.
---

# Talent search

**Scope:** the agency's **own database only**. There are no external sources at launch. All search requirements are **proposed**, so label the issues `prd:proposed`.

## Flow

```
query text
  └─ search-query prompt (ai-prompts)      → { filters, keyword_text, semantic_text, ignored_terms }
       └─ embed(semantic_text)             → vector
            └─ search_candidates(...) SQL  → ranked rows + highlights
                 └─ UI: results, filters, CV date, ignored-terms chip
```

- **Skip the model call** when the recruiter uses only filters (no free text).
- **Cache** the parsed query by a normalised-query hash, so repeat searches are fast and free.
- **Log** each query parse to `ai_runs`, like any AI call.

## SQL: `search_candidates(filters jsonb, keyword text, embedding vector, job_version_id uuid default null, lim int, off int)`

1. **Hard filters first** (these are the recruiter's own choices; the AI only proposes them):
   - skills, via `candidate_skills` with normalised names;
   - `min_years`/`max_years` on the computed total years;
   - locations and languages;
   - `cv_updated_after`.
2. **Keyword score:** PGroonga on the indexed profile text (`&@~`). This works for EN and Simplified Chinese.
3. **Vector score:** cosine similarity on the candidate embedding (same model id as the query vector).
4. **Fusion (proposed):** reciprocal rank fusion of the keyword and vector ranks. The constants go in one place and are covered by tests.
5. **When `job_version_id` is given**, rank by that version's **current-model match score** instead, and return the stored reasons (the same ones Job matching shows).
6. **Return:** candidate id, name, headline, total years, location, languages, **CV last-updated date**, score components, and a keyword highlight snippet.
7. **Visibility hook:** select from a `searchable_candidates` view.
   - In the MVP it passes all candidates.
   - In the real-data release it will hide candidates without consent or past 12-month retention.
   - **Build the view now, so the release only changes the view.**

Mark the function `stable`, use `security_invoker` semantics, and revoke it from `anon, authenticated` (see `supabase-db`).

## Fairness

- **Protected terms** in the query never become filters. The prompt puts them in `ignored_terms`, and the UI shows an "Ignored: …" chip explaining why.
- **Language filters** are allowed only because recruiters choose them explicitly. The UI copy reminds them that language counts only for real job requirements.

## Performance: under 3 s end to end

- **Budget:** query parse (cached or skipped when possible) + embed + one SQL call.
- **Measure:** a Playwright test records the timing on seeded data, and the service logs the duration.
- **Indexes:** PGroonga on the search text, HNSW on the vectors, btree on the filter columns. Use `EXPLAIN ANALYZE` in the PR when you change the SQL.

## Later: external sources (don't build now)

Keep the search service behind an interface (`SearchSource`) with a single `internal` implementation. Later, approved sources get their own implementation plus an **on/off switch** in Settings, and the agency director approves each one. **Don't add any external calls in the MVP.**

## Tests

- **SQL/integration** with fixture candidates in EN and ZH:
  - a ZH keyword (e.g. "会计") finds ZH profiles;
  - an EN semantic query finds a relevant ZH profile;
  - filters exclude correctly;
  - job-scoped ranking uses the current version's scores only.
- **Prompt unit tests** (with the fake model) for the schema, and for the handling of `ignored_terms`.
- **E2E:** search → filter → open profile, at desktop and phone width.
