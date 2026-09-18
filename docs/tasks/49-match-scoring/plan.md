# Plan — #49 Each shortlisted-by-similarity candidate gets a fair, explained score

| | |
|---|---|
| Issue | https://github.com/dczii/URecruitment/issues/49 |
| Parent | Story #49 → Epic #7 |
| Milestone | MVP |
| Branch | `feat/49-match-scoring` (stacked on `feat/48-embeddings-service`, PR #226 still open) |
| Created | 2026-09-19 |
| Status | In progress |

## Problem

Nothing scores a candidate against a job yet. This Story builds the full matching pipeline: retrieval (hard filters + top-50 by vector similarity), the match-score prompt/schema, the scoring service (protected-attribute redaction in code, must-have cap in code, evidence verification), and a read path that never shows a stale score.

## PRD references

| PRD section | Item | Status |
|---|---|---|
| Job matching → requirement 1 | nationality/language only with a written reason | decided |
| Job matching → requirement 2 | scoring ignores name, photo, age, gender, race, religion, marital status | decided |
| Job matching → requirement 3 | missing must-have caps the score | proposed |
| Job matching → requirement 4 | model version + date shown; changing the job recalculates | proposed |
| AI pipeline → Matching | filters first, top 50 by vector similarity, one model call per candidate | suggested |
| AI governance → requirement 1 | every score shows the text it was based on | proposed |

No open PRD items. No design needed (code + prompt only, no UI in this Story — the ranked-match UI is #51).

## Scope

**In scope**
- `src/server/ai/prompts/match-score/{v1,index}.ts` — schema + prompt with rubric anchors (90/70/50/30 bands), EN/ZH fictional examples, evidence required for every matched/missing/uncertain skill, explicit "no protected attributes, no decision recommendation" rules
- `src/server/matching/retrieve.ts` — hard filters (from job requirements) + top-50-by-vector-similarity retrieval, one query, deterministic tie-breaking
- `src/server/matching/redact.ts` — builds the redacted "scoring profile" sent to the model: strips name/contact/protected fields always; includes nationality/language only when the job version requires them with a written reason
- `src/server/matching/score.ts` — orchestrates: redact → one `runAi` call with the match-score prompt → verify evidence verbatim → apply the must-have cap in code → persist to `match_scores`
- `src/server/matching/read.ts` — read path resolving scores only for the job's current version + current model version; explicit not-yet-scored state

**Out of scope**
- Re-scoring triggered by a job save (#50)
- The ranked-match list UI (#51)
- Plain-language search (Epic 8)
- Workplace Fairness Act attributes (not in scope, same note as #46)

## Acceptance criteria

- [x] **AC1** — Protected attributes (name, photo ref, age, gender, race, religion, marital status) never reach the scoring call. _Proved by:_ `redact.test.ts` — one case per attribute
- [x] **AC2** — Nationality/language never affect the score unless the job requires them with a written reason. _Proved by:_ `redact.test.ts › nationality/language included only when required+reasoned`
- [x] **AC3** — A missing must-have caps the score at the agreed value. _Proved by:_ `score.test.ts` — at/above/below the cap boundary, multiple missing must-haves don't stack below the cap
- [x] **AC4** — A displayed score shows its model version and date; a stale (older job/model version) score is never shown. _Proved by:_ `read.test.ts` — old job version, old model version, not-yet-scored cases

## Guardrails that apply

- [x] Fair scoring — this Story's entire purpose: protected attributes excluded in code (not just prompt), nationality/language gated on a written reason
- [x] AI output schema-validated, logged to `ai_runs`, shows source text — every score's evidence quotes verified verbatim
- [x] Server-only data access
- [x] Match scores keyed to job version + model version — CLAUDE.md hard rule 4's own example
- [x] Fictional data only

## Assumptions

- `match_scores` (#111, closed) already has `raw_score` (pre-cap) vs `score` (post-cap), `matched`/`missing`/`uncertain` jsonb, and a unique `(candidate_id, job_version_id, model_version)` key — no migration needed.
- Since `parse-cv`'s schema (#39) never captures age/gender/race/religion/marital status or a photo reference in the first place, `redact.ts` still explicitly builds an allow-listed "scoring profile" (name/skills/work-history/education, no contact fields) as defense-in-depth, per compliance-review's rule that exclusion must be enforced in code, not merely implied by schema absence.
- "The cap" (AC3) uses the PRD's own example value of 50, applied as: `score = missingMustHave ? min(rawScore, 50) : rawScore`. Multiple missing must-haves don't push the cap lower than 50 (per #148's own scope: "multiple missing must-haves do not stack below the cap").
- Retrieval's hard filters come from the job version's requirements (skills text match at minimum) plus nationality/language filters only when the job requires them with a reason — mirroring the redaction rule so retrieval and scoring apply the same fairness gate consistently.
- "Deterministic tie-breaking" in retrieval means: when similarity scores tie, order by `candidate_id` (or another stable, documented key) so retrieval is reproducible across runs.
- No seed pipeline calls this matching code yet (consistent with every prior Story's follow-up note) — this Story ships the pipeline; wiring it into an actual seed/re-score trigger is #50's job.

## Open questions

- none

## Approach

`match-score/v1.ts` (written directly, executor tag `claude`) mirrors `parse-cv`/`extract-jd`/`gap-check`'s structure: shared rules, rubric anchors at 90/70/50/30, EN + Simplified Chinese fictional examples, explicit "never infer or use a protected attribute, never recommend a decision" rules. `retrieve.ts` runs one SQL query: apply hard filters (skills, nationality/language when gated), order by vector distance, limit 50, stable tie-break. `redact.ts` is a pure function building the model-facing profile from a merged candidate profile + job version, allow-listing only what's safe. `score.ts` composes redact → `runAi` → evidence verification → cap → persist. `read.ts` is the only place any caller resolves "the" score for a candidate×job — it joins against the job's `current_version_id` and a configured "current model version," so an old version can never leak through.

## Skills in scope

- `prd-context` — Job matching requirements 1-4; AI pipeline matching
- `ai-prompts` — schema/prompt structure, rubric anchors, versioning
- `ai-pipeline` — `runAi`, evidence verification, `ai_runs` logging, retrieval-then-score pattern
- `compliance-review` — protected-attribute redaction enforced in code, nationality/language gate
- `supabase-db` — `match_scores`/`embeddings` queries, existing RLS from #111
- `testing` — test-first for logic (redaction, cap, retrieval, stale-score protection)
- `ai-eval` — rubric anchors feed the later eval's scoring rubric (not built in this Story, but the prompt must be eval-ready)

## Files

| File | Change |
|---|---|
| `src/server/ai/prompts/match-score/{v1,index}.ts` | new — schema, prompt, EN+ZH examples |
| `src/server/matching/retrieve.ts` + `.test.ts` | new — hard filters + top-50 vector retrieval |
| `src/server/matching/redact.ts` + `.test.ts` | new — protected-attribute-safe scoring profile |
| `src/server/matching/score.ts` + `.test.ts` | new — orchestrates redact → score → cap → persist |
| `src/server/matching/read.ts` + `.test.ts` | new — current-version/current-model read path |

## Dependencies

- #145 (this session's own predecessor, PR #226, still open) — embeddings
- #136 (in the PR stack) — job versions
- #169 (in the PR stack) — `runAi`

## Steps

- [x] **T1** `claude` — Write `src/server/ai/prompts/match-score/v1.ts` + `index.ts`: schema (score 0-100, `matched`/`missing`/`uncertain` arrays each with `requirement_id`/`source_text`/`note`), prompt with rubric anchors at 90/70/50/30, "only the job's stated requirements count," "never infer or use a protected attribute," "never recommend a decision," EN + Simplified Chinese fictional examples.
  - Rules: `ai-prompts`; `compliance-review`; `ai-eval` — rubric anchors must be eval-ready
  - Verify: `npm run typecheck`
- [x] **T2a** `grok` — Failing tests first in `retrieve.test.ts`: hard filters exclude correctly; exactly 50 returned when more qualify; fewer than 50 returns all; deterministic tie-breaking; nationality/language never used as a filter unless the job requires them with a reason.
  - Verify: `npm test -- matching/retrieve` → fails (module missing)
- [x] **T2b** `grok` — Implement `retrieve.ts` until T2a passes.
  - Verify: `npm test -- matching/retrieve` → pass; `npm run typecheck`
- [x] **T3a** `grok` — Failing tests first in `redact.test.ts`: one case per protected attribute (name, photo ref if modeled, age, gender, race, religion, marital status) proving it's absent from the built scoring profile; nationality/language present only when the job version requires them with a written reason.
  - Verify: `npm test -- matching/redact` → fails (module missing)
- [x] **T3b** `grok` — Implement `redact.ts` until T3a passes.
  - Verify: `npm test -- matching/redact` → pass; `npm run typecheck`
- [x] **T4a** `grok` — Failing tests first in `score.test.ts` (fake model + in-memory writer/db mocks): a missing must-have caps the score at 50; a score already below 50 is unchanged; multiple missing must-haves don't push below 50; an invented (non-verbatim) evidence quote invalidates that skill claim rather than being stored; every run writes to `ai_runs` with model/version/prompt-version/cost/duration.
  - Verify: `npm test -- matching/score` → fails (module missing)
- [x] **T4b** `grok` — Implement `score.ts` (composing `redact.ts`, `runAi` with the match-score prompt, evidence check, cap, persist) until T4a passes.
  - Verify: `npm test -- matching/score` → pass; `npm run typecheck`
- [x] **T5a** `grok` — Failing tests first in `read.test.ts`: a score for a job version that isn't the job's current version is not returned; a score from an older model version than the configured current one is marked stale/not returned as current; a job with no scores yet returns an explicit not-yet-scored state, not an empty array indistinguishable from "scored zero candidates."
  - Verify: `npm test -- matching/read` → fails (module missing)
- [x] **T5b** `grok` — Implement `read.ts` until T5a passes.
  - Verify: `npm test -- matching/read` → pass; `npm run typecheck`
- [x] **S6** `none` — Full verification, close out docs. Do not run `pr-review`.

## Test plan

| AC | Test | Type |
|---|---|---|
| AC1 | `redact.test.ts` | unit |
| AC2 | `redact.test.ts` | unit |
| AC3 | `score.test.ts` | unit, fake model |
| AC4 | `read.test.ts` | unit |

## Verification

```
npm run lint
npm run typecheck
npm test -- matching
```

## UX / design

n/a — no UI in this Story.

## Data / API changes

None — reuses `match_scores`/`embeddings` from #111.

## Risks & rollback

Depends on unmerged PR chain (#213→#226). Net-new modules; rollback is deleting the files. Largest Story so far (4 tasks, 5 modules, 8 executor steps) — the fix loop (Step 7) applies per-step if any step fails verification.

## Outcome

- **Shipped:** The full matching pipeline for Story #49 (#146-#149): `match-score` v1 prompt/schema with rubric anchors; `retrieveCandidates` (one query, hard filters + top-50 vector similarity, deterministic tie-break, nationality/language gated); `buildScoringProfile` (allow-list redaction, never a pass-through); `scoreCandidate` (redact → one `runAi` call → verbatim evidence check → must-have cap in code → persist); `getMatchScore`/`listMatchScoresForJob` (current-job-version + current-model-version resolution, with `"current"`/`"stale"`/`"not_scored"` states that correctly distinguish "an old score exists" from "nothing has been scored yet").
- **Changed files / areas:** `src/server/ai/prompts/match-score/{v1,index}.ts` (new, written directly by Claude), `src/server/matching/{retrieve,redact,score,read}.ts` + `.test.ts` (new, 4 modules).
- **Tests added or updated:** `retrieve.test.ts` (6), `redact.test.ts` (7), `score.test.ts` (7), `read.test.ts` (10) — 30 new tests across the Story, all executed, all passing.
- **Verification:** `npm run lint` → pass (4 warnings, all pre-existing/intentional-unused-param style, none new errors). `npm run typecheck` → pass. `npx vitest run src/server/matching src/server/ai` → 47/47 passing. `npx vitest run src/server` (full) → 165 passed, 5 pre-existing unrelated failures (2 `db.test.ts` local WebSocket quirk, 3 `extract.test.ts` tracked against Story #38) — same known set as every prior Story in this session.
- **Deviations:** None from the plan's intent, though the executor-designed contracts refined several details beyond the plan's own wording: (1) `retrieveCandidates` takes the job version snapshot + its embedding as input (not just a `jobVersionId`) so retrieval stays one query with no prior fetch. (2) The `read.ts` contract explicitly avoids pre-filtering the `match_scores` query by `model_version`, since doing so would silently collapse "stale" into "not_scored" — a real correctness risk the T5a executor caught and documented before T5b implemented against it. (3) `redact.ts` allow-lists explicitly (never spreads the input), proven by defensive tests that bolt extra properties (`age`, `nationality`, `photo_url`) onto fixture inputs and assert they never leak through — stronger than the plan's literal wording since the parsed schema has no such fields to test directly today.
- **Fix rounds / escalations:** 0 across all 8 executor steps (T2a/b, T3a/b, T4a/b, T5a/b) plus T1 (prompt authoring) — everything passed verification on first attempt.
- **Models used:** Planning/orchestration + T1 (prompt authoring): Claude Sonnet 5 (claude-sonnet-5). T2a/T2b/T3a/T3b/T4a/T4b/T5a/T5b: cursor-grok-4.6-high. No escalations, no direct Claude fixes.
- **Claude direct fixes:** none.
- **Follow-ups:** (1) Nationality has no field anywhere in the parsed candidate-profile schema (#39 deliberately never captures it) — `retrieve.ts`'s nationality filter and `redact.ts`'s nationality exclusion are both correctly *gated* but have no real data to act on yet; a future schema decision would need to introduce a nationality field before this filter does anything beyond proving the gate logic. (2) Nothing yet calls this pipeline in bulk — no seed→retrieve→score pipeline exists. Wiring it (and re-scoring on job save) is #50's job. (3) The ranked-match list UI is #51's job — `read.ts`'s `listMatchScoresForJob` is built and ready for it.
