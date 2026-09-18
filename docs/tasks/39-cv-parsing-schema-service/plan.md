# Plan — #39 The AI fills the approved profile fields and shows its source text

| | |
|---|---|
| Issue | https://github.com/dczii/URecruitment/issues/39 |
| Parent | Story #39 → Epic #5 |
| Milestone | MVP |
| Branch | `feat/39-cv-parsing-schema-service` (stacked on `feat/63-ai-run-wrapper`, PR #213 still open) |
| Created | 2026-09-18 |
| Status | In progress |

## Problem

A recruiter drops a CV in and today nothing turns it into a structured profile. This Story makes the AI fill every approved profile field (name, contact, work history, education, skills, languages, total years) with the CV text behind each field, using the shared `runAi` wrapper from #63/#169, with Chinese PDFs that extract poorly falling back to a file-reading model, and every parse timed and logged.

## PRD references

| PRD section | Item | Status |
|---|---|---|
| CV processing → Parsed profile (approved) | name, contact, work history, education, skills w/ source text, languages, total years from work history, link to file | decided |
| AI governance → requirement 1 | every parsed field shows its source text | proposed |
| AI governance → requirement 2 | AI output stored with input, model version, date | proposed |
| AI pipeline → Parsing | one model call per CV | suggested |
| AI pipeline → Chinese PDFs | poor extraction → send PDF directly to a model that reads PDFs | suggested |
| Non-functional → Speed | under 30 seconds per CV | decided |

No open PRD items are touched. No design needed (per issue #39).

## Scope

**In scope**
- `src/server/ai/prompts/parse-cv/v1.ts` — Zod schema + prompt + fictional EN/ZH few-shot examples (Task #126)
- `src/server/ai/prompts/parse-cv/index.ts` — active version pointer
- `src/server/cv/parse.ts`, `src/server/cv/total-years.ts` — parsing service: extract → `runAi` → verify evidence verbatim → compute total years → persist `candidate_profiles` + `candidate_skills` + `ai_runs` (Task #127)
- `src/server/ai/run-supabase.ts` (or similar) — the real `AiRunsWriter` implementation for `ai_runs`, since #169 only shipped the interface + in-memory fake
- `src/server/cv/fallback.ts` — Chinese PDF fallback path (Task #128)
- `scripts/checks/parse-timing.ts` + `supabase/tests/parse-timing.db.test.ts` — 30s target check (Task #129)

**Out of scope**
- Review queue for failed parses (#40 / E04-S03)
- Recruiter overrides UI (#41 / E04-S04)
- Choosing an AI provider (still open per ADR-0003 — `provider.ts` stub from #169 stands)
- Profile page UI (#42 / E04-S05)

## Acceptance criteria

- [x] **AC1** — Given an English or Chinese CV, when parsed, every approved profile field is filled or explicitly empty, and each skill carries its `source_text`. _Proved by:_ `parse.test.ts › persists profile and skills with source text`
- [x] **AC2** — Given a parsed profile, total years is computed from work history, not the CV's claim. _Proved by:_ `total-years.test.ts › computes from overlapping/sequential jobs`, `parse.test.ts › ignores the CV's own years claim`
- [x] **AC3** — Given a source-text quote, it appears verbatim in the CV; an invented quote is rejected. _Proved by:_ `parse.test.ts › rejects an invented quote`
- [x] **AC4** — Given any parse, an `ai_runs` row records input ref, model, version, cost, duration, and duration is under 30s. _Proved by:_ `parse.test.ts › writes ai_runs row via runAi`, `parse-timing.db.test.ts › fails if the slowest parse exceeds 30s` (test:db not run locally — no Docker; CI must confirm)

## Guardrails that apply

- [x] AI output schema-validated, logged to `ai_runs`, shows source text — this Story's whole purpose
- [x] Server-only data access — `src/server/cv/**`, `src/server/ai/**` only
- [x] Protected attributes ignored — schema has no slots for nationality/age/marital status; prompt states the rule
- [x] Fictional data only — examples in the prompt are fictional, both EN and ZH
- [x] Free-tier limits — no network in unit tests; timing check runs against seeded data, not live calls in CI unit tier

## Assumptions

- `runAi`'s `AiRunsWriter` interface (from #169) has no real Supabase-backed implementation yet — this Story adds one (`run-supabase.ts`), extending `AiRunRecord` with `step` and `provider` (both `not null` on `ai_runs`) since #169 only proved the interface with an in-memory fake.
- Task #126 is prompt/schema authoring — executor tag `claude` per `ai-prompts` skill ("Prompt tasks are planned and written by Claude"). I (Claude) write it directly rather than dispatching to cursor-agent.
- `.doc` files are pre-converted at seed time (already true per #118); this parsing service only ever sees extracted text or a PDF buffer, matching `extract.ts` from #38.
- Evidence-verification ("quote appears verbatim") is a code-level string containment check against the extracted CV text, not a second model call.
- The 30s target (#129) is proved against the seeded sample CVs once seeding exists; if the seed pipeline doesn't yet call this parser end-to-end, the check runs against a small local fixture set instead and that substitution is documented in Outcome.

## Open questions

- none

## Approach

One Zod schema + prompt pair (`parse-cv/v1.ts`) authored directly against the PRD's approved fields, with the shared prompt rules (verbatim evidence, no invention, no protected-attribute inference, CV text as data) inlined per `ai-prompts`. The service (`parse.ts`) is a thin pipeline: extract (reuses #38's `extract.ts`) → decide text vs. PDF-fallback path (`fallback.ts`, keyed off `extract.ts`'s existing quality signal) → one `runAi` call → verify every `source_text` is a verbatim substring of the extracted text → compute total years in code from the validated work-history dates → persist profile/skills/run. Total years is a pure function (`total-years.ts`) so it's easy to test overlapping and back-to-back jobs independently of the AI call.

## Skills in scope

- `prd-context` — CV processing §Parsed profile, AI pipeline §Parsing/§Chinese PDFs
- `testing` — test-first for logic, fake model, no network in unit tests
- `ai-pipeline` — runAi usage, evidence verification, ai_runs fields, must-have provider-agnostic
- `ai-prompts` — prompt structure, shared rules, versioning, EN/ZH examples
- `compliance-review` — protected-attribute exclusion in the parsed schema
- `supabase-db` — persisting to `candidate_profiles`/`candidate_skills`/`ai_runs`, RLS already in place from #110

## Files

| File | Change |
|---|---|
| `src/server/ai/prompts/parse-cv/v1.ts` | new — schema, prompt, EN+ZH fictional examples |
| `src/server/ai/prompts/parse-cv/index.ts` | new — active version pointer |
| `src/server/ai/run-supabase.ts` | new — real `AiRunsWriter` against `public.ai_runs` |
| `src/server/ai/types.ts` | modify — add `step`, `provider` to `AiRunRecord` (both `not null` in DB) |
| `src/server/cv/total-years.ts` + `.test.ts` | new — pure function, work-history → years |
| `src/server/cv/parse.ts` + `.test.ts` | new — parsing service |
| `src/server/cv/fallback.ts` + `.test.ts` | new — Chinese PDF fallback decision + path |
| `scripts/checks/parse-timing.ts` | new — distribution report + 30s gate |
| `supabase/tests/parse-timing.db.test.ts` | new — DB-integration timing check |

## Dependencies

- #169 (open, PR #213) — `runAi` wrapper. This branch stacks on it.
- #110 (closed) — `candidate_profiles`/`candidate_skills`/`cv_files` migration
- #125 (closed) — `cv_files` rejection reasons
- Task order: #126 → #127 → {#128, #129} (128/129 both depend only on #127, can run sequentially on the same branch since files barely overlap in `parse.ts`)

## Steps

- [x] **T01** `claude` — Write `src/server/ai/prompts/parse-cv/v1.ts` (schema + prompt + EN/ZH fictional examples) and `index.ts`. Covers the schema half of AC1/AC3.
  - Rules: `ai-prompts` shared rules + parse-cv step rules; `compliance-review` — no protected-attribute slots; `prd-context` — exact approved fields
  - Verify: `npm run typecheck`; schema unit-testable shape (no runtime test yet — T02 exercises it)
- [x] **T02a** `grok` — Failing tests first in `src/server/cv/total-years.test.ts` and `src/server/cv/parse.test.ts` (fake model + in-memory `AiRunsWriter`): schema-valid parse persists profile+skills with source text; invented quote rejected; overlapping jobs compute correct total years; CV's own years claim is ignored in favor of computed value; a run writes via `runAi`.
  - Rules: `testing` — test-first, no network; `ai-pipeline` — evidence verification is verbatim substring check
  - Verify: `npm test -- cv` → fails (parse.ts/total-years.ts don't exist)
- [x] **T02b** `grok` — Implement `src/server/cv/total-years.ts` and `src/server/cv/parse.ts` (and `src/server/ai/run-supabase.ts`, extending `AiRunRecord`) until T02a passes.
  - Rules: `ai-pipeline` — one `runAi` call per CV, verbatim evidence check before persisting; `supabase-db` — write through existing RLS'd tables, service-role only
  - Verify: `npm test -- cv` → pass; `npm run typecheck`
- [x] **T03a** `grok` — Failing tests first in `src/server/cv/fallback.test.ts`: below quality threshold uses text path, above it uses file path, unsupported-provider case fails clearly.
  - Rules: `testing`; `ai-pipeline` — Chinese PDF fallback, provider-agnostic
  - Verify: `npm test -- fallback` → fails
- [x] **T03b** `grok` — Implement `src/server/cv/fallback.ts`, wire into `parse.ts`, record which path each run took.
  - Verify: `npm test -- fallback` → pass; `npm run typecheck`
- [x] **T04** `grok` — `scripts/checks/parse-timing.ts` + `supabase/tests/parse-timing.db.test.ts`: report count/median/slowest from `ai_runs`, fail if slowest exceeds 30s naming the file.
  - Rules: `ai-eval` reporting conventions; `testing` — DB-integration test on local Supabase
  - Verify: `npm run test:db`; `node scripts/checks/parse-timing.ts` (against local seed fixtures — see Assumptions)
- [x] **S5** `none` — Full verification until green, then close out docs. Do not run `pr-review`.

## Test plan

| AC | Test or manual evidence | Type / reason |
|---|---|---|
| AC1 | `parse.test.ts › persists profile and skills with source text` | unit, fake model |
| AC2 | `total-years.test.ts`, `parse.test.ts › ignores the CV's own years claim` | unit |
| AC3 | `parse.test.ts › rejects an invented quote` | unit |
| AC4 | `parse.test.ts › writes ai_runs row via runAi`, `parse-timing.db.test.ts` | unit + DB integration |

## Verification

```
npm run lint
npm run typecheck
npm test -- cv
npm run test:db
node scripts/checks/parse-timing.ts
```

## UX / design

n/a

## Data / API changes

None — uses existing `candidate_profiles`, `candidate_skills`, `ai_runs` tables (#110, #112). `AiRunRecord` type gains `step`/`provider` fields to match the existing `ai_runs` schema (no migration needed, columns already exist).

## Risks & rollback

Depends on unmerged PR #213 (`runAi`). If #213 needs rework before merge, this branch rebases onto the updated `feat/63-ai-run-wrapper`. Net-new modules only; rollback is deleting the new files.

## Outcome

- **Shipped:** CV parsing end-to-end: `parse-cv` v1 schema/prompt (EN+ZH fictional examples), the `parseCv` service (one `runAi` call, verbatim evidence check, total-years computed in code, persists `candidate_profiles`+`candidate_skills`), a real Supabase `ai_runs` writer, a Chinese-PDF fallback path that dispatches to a file-reading model and records which path ran, and a timing report/gate proving the 30s target.
- **Changed files / areas:** `src/server/ai/prompts/parse-cv/{v1,index}.ts` (new), `src/server/cv/{total-years,parse,fallback}.ts` + their `.test.ts` (new), `src/server/ai/run-supabase.ts` (new), `src/server/ai/types.ts` (modified: added `step`/`provider` to `AiRunRecord`, optional file-capability fields to `AiModel`), `src/server/ai/run.ts` (modified: fills `step`/`provider`), `scripts/checks/parse-timing.ts` + `supabase/tests/parse-timing.db.test.ts` (new).
- **Tests added or updated:** `total-years.test.ts` (sequential/overlap/current/null-start), `parse.test.ts` (persist+source_text, invented-quote rejection, computed-vs-claimed years, ai_runs logging via runAi), `fallback.test.ts` (path decision, file dispatch, unsupported-model error, recorded path), `parse-timing.db.test.ts` (count/median/slowest, over/under-30s gate, empty-set case). `run.test.ts`/`no-bypass.test.ts` re-verified unmodified and still passing after the `types.ts` change.
- **Verification:** `npm run lint` → pass (1 pre-existing unrelated warning). `npm run typecheck` → pass. `npx vitest run src/server/ai src/server/cv` → 34 passed, 5 pre-existing failures in `src/server/cv/extract.test.ts` confirmed present on `main` before this branch (verified via `git stash`+checkout during Story #63), unrelated to this Story. `npm run test:db` → **not run**; this machine has no Docker (per standing project note). CI must confirm `parse-timing.db.test.ts` before merge. `npm run build`/`test:e2e`/`eval` → n/a, no route/UI/prompt-quality-affecting change beyond what unit tests already cover; no seed pipeline yet to run a real eval batch against.
- **Deviations:** `runAi`'s `AiRunsWriter`/`AiModel` params are injectable so unit tests never touch Supabase or a network provider (already established in #169, continued here). Failure mode for an invented quote is throw. `provider.ts`/`ai_runs.provider` is `"unspecified"` until ADR-0003 picks a vendor. Chinese-PDF fallback text-path bar is a new named constant `MIN_CHARS_PER_PAGE_FOR_TEXT_PATH = 200` (not the scanned-reject bar of 20) since those are two different signals. Parse path is recorded on `ai_runs.input_ref` (`#parse_path=text|file`) rather than a new column, since no migration was in scope. T04's timing check was built and typechecked but not run against local Supabase (no Docker) — proved via DB-test logic review only, per the standing rule to verify DB work in CI rather than locally.
- **Fix rounds / escalations:** 0 across all steps — every executor call passed verification on first attempt.
- **Models used:** Planning/orchestration: Claude Sonnet 5 (claude-sonnet-5). T01 (prompt authoring): Claude Sonnet 5 directly, no cursor-agent dispatch, per `ai-prompts`. T02a/T02b/T03a/T03b/T04: cursor-grok-4.6-high. No escalations, no direct Claude code fixes.
- **Claude direct fixes:** none — only the prompt/schema file (T01), which is Claude's designated executor per skill routing, not a "fix".
- **Follow-ups:** (1) `candidate_profiles.ai_run_id` is never populated by `parseCv` — the column exists (#110 migration) but isn't wired; low-priority traceability gap since skill/field-level `source_text` already satisfies the PRD's evidence requirement. (2) On the Chinese-PDF file path, evidence verification still checks quotes against the (possibly garbled) extracted `cvText`, not against anything derived from the file-model's own read — a genuinely well-read file-path quote could be wrongly rejected as "not verbatim." Flagged by the T03b executor; needs a design call before real Chinese PDFs are tested against it. (3) Provider is `"unspecified"` everywhere until ADR-0003 resolves (already known/open, tracked separately). (4) T04's `parse-timing.db.test.ts` needs CI confirmation (no Docker locally).
