---
name: ai-pipeline
description: >
  How every AI call in URecruitment is built: provider-agnostic Vercel AI SDK wrapper,
  schema-validated structured output, ai_runs logging (input, model, version, prompt version,
  cost, duration), verbatim evidence checks, protected-attribute redaction enforced in code,
  must-have score cap, scores keyed by job + model version, after() re-scoring with retryable
  runs, PDF/DOCX extraction with scanned-file rejection and Chinese PDF fallback, embeddings,
  spend cap. Use for CV parsing, JD extraction, matching, gap check, search query parsing and
  embeddings.
---

# AI pipeline

The AI **only suggests**. Nothing in this layer changes a candidate's stage, contacts anyone or sends anything.

## Provider: not chosen yet

- **Stay provider-agnostic.** Only `src/server/ai/provider.ts` imports provider packages. Everything else asks it for a model by **role**: `parse`, `match`, `gap`, `search`, `jd`, `embed`.
- **Models come from env:** `AI_MODEL_PARSE`, `AI_MODEL_MATCH`, `AI_MODEL_GAP`, `AI_MODEL_SEARCH`, `AI_MODEL_JD`, `AI_EMBED_MODEL`, plus the provider keys. `provider.ts` also returns a `modelVersion` string, which is stored everywhere.
- **Choosing the provider is its own `needs-decision` task.** The PRD criteria: Simplified Chinese quality, cost, and **where data is processed** (PDPA overseas transfer once real CVs arrive). Note that Anthropic offers no embedding model, so choosing Claude means a second provider for embeddings.
- **Check the installed `ai` package version** before writing code. The structured-output and file-input APIs differ between majors. Follow that version's docs.

## The one wrapper: `runAi()`

Every model call goes through `src/server/ai/run.ts`:

1. Insert an `ai_runs` row (`status='running'`, step, prompt id + version, model, model version, input reference + SHA-256 of the input).
2. **Check the monthly spend cap.** Sum `ai_runs.cost` for the month; if it's ≥ `AI_MONTHLY_SPEND_CAP`, fail fast with a clear error. Don't call the model.
3. Call the model with the step's schema. Use low temperature, and set a timeout.
4. **Validate the output with the Zod schema again**, even if the SDK validated it. On failure, retry once with the validation error appended, then fail.
5. **Verify the evidence** (below).
6. Update the `ai_runs` row: output, token counts, cost, duration, `status='succeeded'|'failed'`, and an error message **without CV text**.
7. Return the typed result together with the `ai_run_id`, so stored results link back to their run.

Retry only transient errors (rate limit, 5xx), with backoff, at most 3 attempts. Never retry schema failures more than once.

## Evidence is verbatim

Every AI claim carries `source_text`: a parsed field, a skill, a matched/missing/uncertain item, or a gap flag.

- **In code**, check that `source_text` appears in the input after whitespace normalisation. Handle full-width and half-width characters for Chinese.
- **Unverifiable evidence:** keep the value, set `evidence_verified=false`, and show it as "source not found" in the UI. Never silently invent a quote.

## Fairness is enforced in code, not just in prompts

- **`buildScoringProfile(profile, jobVersion)`** removes name, photo, date of birth/age, gender, race/ethnicity, religion, marital status and contact details before any matching or scoring call.
- **Nationality and language** are included **only** if the job version marks that requirement as required **and** has a non-empty reason.
- **Unit tests (test-first)** prove each attribute is absent from the model input, and that nationality/language only appear with a reason.
- **Not handled yet:** the PRD notes that pregnancy, caregiving, disability and mental health aren't explicitly excluded. Don't add them as scoring inputs. Removing them is a reasonable default; say so in the spec if you do.

## Matching

1. **Filters first** (hard requirements the recruiter set), then the **top 50 by vector similarity** per job version.
2. **One scoring call per candidate:** score 0–100, plus `matched[]`, `missing[]`, `uncertain[]`, each with the requirement id and `source_text`.
3. **Must-have cap (proposed):** in code, if any must-have is in `missing`, the score becomes `min(score, MUST_HAVE_CAP)`. The cap is configurable and defaults to 50. Store the raw score as well.
4. **Upsert** into `match_scores` keyed by `(candidate, job_version, model_version)`. Skip the call if that key already exists and the inputs haven't changed.
5. **The UI shows only** scores for the job's current version and the active model version, together with the model version and date.

**Re-scoring on job save:**
- A Server Action saves the new version, runs the gap check, responds, then calls `after(() => rescoreJob(versionId))`.
- `rescoreJob` records progress in the runs table (queued/running/done/failed, per candidate) so a failed run can be retried from the UI or the seed. Keep job state and queues **in Supabase**, not in an external job service (to keep data in SG).

## CV parsing

1. **Extract text on the server:** PDF and `.docx` only. Legacy `.doc` is converted by the seed script beforehand.
2. **Scanned or image-only detection:** very little extractable text per page means `cv_files.parse_status='rejected'` with a clear reason. No OCR.
3. **Chinese PDFs:** if the extracted text looks broken (replacement characters, a very low CJK ratio for a ZH file, garbled order), send **the PDF itself** as file input. This needs a model that supports PDF input; record which path was used in `ai_runs`.
4. **One parse call per CV** fills the approved fields (see `prd-context`), each with `source_text`.
5. **Computed in code, not by the model:** total years of experience, from merged work-history intervals with overlaps counted once. Test-first.
6. **Store the result** in `candidate_profiles.parsed`. Never touch `overrides`.
7. **Failures** go to the review queue with the reason (proposed).
8. **Target: under 30 s per CV.** Record the duration.

## Embeddings

- **One multilingual model** covers EN and Simplified Chinese. Store the vector together with the `model` id.
- **Embed** the profile summary (skills, titles, experience) and each job version. Re-embed when the source changes or the model changes.
- The dimension is fixed by the chosen model. The migration follows the embedding decision.

## Data minimisation

- Send only the text a step needs.
- Never log CV/JD text to Sentry or the console.
- `ai_runs.input_ref` points at DB rows or files. Store full inputs only when the step needs them for audit, and never with secrets.

## Tests

- **A fake model** (the AI SDK's test mocks if the installed version has them, otherwise a fake implementing the provider interface) is used in unit tests. **No network in unit tests.**
- **Test-first:** redaction, must-have cap, evidence verification, years calculation, the idempotent score upsert, and the spend cap.
- **Quality:** the real-model check is `npm run eval` (see `ai-eval`).
