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

- [ ] **AC1** — Given an English or Chinese CV, when parsed, every approved profile field is filled or explicitly empty, and each skill carries its `source_text`. _Proved by:_ `parse.test.ts › persists profile and skills with source text`
- [ ] **AC2** — Given a parsed profile, total years is computed from work history, not the CV's claim. _Proved by:_ `total-years.test.ts › computes from overlapping/sequential jobs`, `parse.test.ts › ignores the CV's own years claim`
- [ ] **AC3** — Given a source-text quote, it appears verbatim in the CV; an invented quote is rejected. _Proved by:_ `parse.test.ts › rejects an invented quote`
- [ ] **AC4** — Given any parse, an `ai_runs` row records input ref, model, version, cost, duration, and duration is under 30s. _Proved by:_ `parse.test.ts › writes ai_runs row via runAi`, `parse-timing.db.test.ts › fails if the slowest parse exceeds 30s`

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

- [ ] **T01** `claude` — Write `src/server/ai/prompts/parse-cv/v1.ts` (schema + prompt + EN/ZH fictional examples) and `index.ts`. Covers the schema half of AC1/AC3.
  - Rules: `ai-prompts` shared rules + parse-cv step rules; `compliance-review` — no protected-attribute slots; `prd-context` — exact approved fields
  - Verify: `npm run typecheck`; schema unit-testable shape (no runtime test yet — T02 exercises it)
- [ ] **T02a** `grok` — Failing tests first in `src/server/cv/total-years.test.ts` and `src/server/cv/parse.test.ts` (fake model + in-memory `AiRunsWriter`): schema-valid parse persists profile+skills with source text; invented quote rejected; overlapping jobs compute correct total years; CV's own years claim is ignored in favor of computed value; a run writes via `runAi`.
  - Rules: `testing` — test-first, no network; `ai-pipeline` — evidence verification is verbatim substring check
  - Verify: `npm test -- cv` → fails (parse.ts/total-years.ts don't exist)
- [ ] **T02b** `grok` — Implement `src/server/cv/total-years.ts` and `src/server/cv/parse.ts` (and `src/server/ai/run-supabase.ts`, extending `AiRunRecord`) until T02a passes.
  - Rules: `ai-pipeline` — one `runAi` call per CV, verbatim evidence check before persisting; `supabase-db` — write through existing RLS'd tables, service-role only
  - Verify: `npm test -- cv` → pass; `npm run typecheck`
- [ ] **T03a** `grok` — Failing tests first in `src/server/cv/fallback.test.ts`: below quality threshold uses text path, above it uses file path, unsupported-provider case fails clearly.
  - Rules: `testing`; `ai-pipeline` — Chinese PDF fallback, provider-agnostic
  - Verify: `npm test -- fallback` → fails
- [ ] **T03b** `grok` — Implement `src/server/cv/fallback.ts`, wire into `parse.ts`, record which path each run took.
  - Verify: `npm test -- fallback` → pass; `npm run typecheck`
- [ ] **T04** `grok` — `scripts/checks/parse-timing.ts` + `supabase/tests/parse-timing.db.test.ts`: report count/median/slowest from `ai_runs`, fail if slowest exceeds 30s naming the file.
  - Rules: `ai-eval` reporting conventions; `testing` — DB-integration test on local Supabase
  - Verify: `npm run test:db`; `node scripts/checks/parse-timing.ts` (against local seed fixtures — see Assumptions)
- [ ] **S5** `none` — Full verification until green, then close out docs. Do not run `pr-review`.

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

- **Shipped:**
- **Changed files / areas:**
- **Tests added or updated:**
- **Verification:**
- **Deviations:**
- **Fix rounds / escalations:**
- **Models used:**
- **Claude direct fixes:**
- **Follow-ups:**
