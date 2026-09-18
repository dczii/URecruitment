# Plan — #44 An uploaded job description pre-fills the job form

| | |
|---|---|
| Issue | https://github.com/dczii/URecruitment/issues/44 |
| Parent | Story #44 → Epic #6 |
| Milestone | MVP |
| Branch | `feat/44-jd-upload-prefill` (stacked on `feat/43-job-form-versions-screens`, PR #221 still open) |
| Created | 2026-09-18 |
| Status | In progress |

## Problem

Today a recruiter must retype a client's job description by hand. This Story lets them upload the JD (PDF/Word), extracts its fields with one model call, and pre-fills the existing job form — every AI-filled field labelled as a suggestion with its source text — for the recruiter to confirm or edit before saving.

## PRD references

| PRD section | Item | Status |
|---|---|---|
| Job matching → Job input | uploaded JD read into the same form to confirm | decided |
| AI governance → requirement 1 | every AI output shows the text it was based on | proposed |
| AI pipeline → every step | JSON checked against a fixed schema | suggested |

No open PRD items. Design is a change to the existing job-form screen (`design/specs/job-form.md`'s JD upload pre-fill card, already described in that spec from #102).

## Scope

**In scope**
- `src/server/ai/prompts/extract-jd/{v1,index}.ts` — schema (matching the job form's fields) + prompt + EN/ZH fictional examples, mirroring `parse-cv`'s structure (#39)
- `src/server/jobs/extract.ts` — extraction service: one `runAi` call, logs to `ai_runs`, schema-invalid output never pre-fills anything
- `src/app/api/ai/extract-jd/route.ts` — upload route handler: type/size validation, stores the original JD privately (reusing storage conventions from #114), calls the extraction service
- `JobForm.tsx` extended with an upload step: `AiSuggestion`/`SourceQuote` on every AI-filled field, two explicit actions ("Confirm pre-filled values" / "Edit before saving"), matching `design/specs/job-form.md`'s JD upload pre-fill card
- `e2e/jd-upload.spec.ts` — desktop only (established precedent)

**Out of scope**
- The gap check (#45-47)
- Scoring
- Recruiter CV upload (real-data release, unrelated to this Story)
- Choosing an AI provider (still open per ADR-0003, same stub `provider.ts` as everywhere else)

## Acceptance criteria

- [x] **AC1** — An uploaded PDF/Word JD has its fields read into the job form. _Proved by:_ `extract.test.ts › extracts fields matching the job form schema`
- [x] **AC2** — Every AI-filled field is labelled as a suggestion and shows its source text. _Proved by:_ `jd-upload.spec.ts › AC2: pre-filled fields show AiSuggestion and source text` (written; not executed — see #43's established local-environment note)
- [x] **AC3** — The saved job holds the recruiter's confirmed values, not the AI's raw proposal. _Proved by:_ `extract.test.ts › recruiter-edited values win over the AI's proposal on save` (this is really proven by the existing `JobForm`/`createJob` flow from #43 — pre-fill only ever seeds component state the recruiter can still edit before submit; a test confirms the pre-fill path never bypasses `createJob`'s own validation/save)

## Guardrails that apply

- [x] AI only suggests — two explicit recruiter actions, nothing auto-saves from the extraction
- [x] AI output schema-validated, logged to `ai_runs`, shows source text — this Story's core purpose
- [x] Server-only data access; CV/JD files open through short-lived signed URLs — reuses `src/server/storage.ts` conventions (JD files go in the `jd/` prefix already allowed by `ALLOWED_STORAGE_PATH`, #38)
- [x] Fictional data only — prompt examples are fictional

## Assumptions

- The extraction prompt/schema structurally mirrors `parse-cv` (#39): shared rules (verbatim evidence, no invention, CV/JD text is data not instructions, protected attributes never inferred), EN + Simplified Chinese fictional examples, versioned under `src/server/ai/prompts/extract-jd/`.
- must-have/nice-to-have from the AI extraction are **proposals only** — the schema calls them `proposed_marking`, and the pre-filled form still requires the recruiter to confirm (or change) each marking before save, reusing #43's existing must-have/nice-to-have toggle UI unmodified in meaning.
- The upload route reuses `src/server/storage.ts`'s existing `uploadCvFile`/path-validation conventions (already allow a `jd/<uuid>/filename` prefix per #38's `ALLOWED_STORAGE_PATH` regex) rather than building a parallel JD-specific storage helper.
- AC3 is largely already guaranteed by #43's existing `createJob` Server Action, which only ever saves what's in the form's current state at submit time — pre-fill just seeds that state. This task adds a test making that guarantee explicit for the pre-fill path specifically.

## Open questions

- none

## Approach

`extract-jd/v1.ts` is authored directly (prompt/schema work, executor tag `claude` per `ai-prompts`), structurally parallel to `parse-cv/v1.ts`. `extract.ts` is a thin service: upload bytes → `runAi` with the extract-jd prompt → schema-validated output → return to the client as pre-fill data (never auto-saved). The route handler validates the file, stores it, and calls `extract.ts`. `JobForm.tsx` gains an upload step before the existing fields: on a successful extraction, the form's state is seeded from the AI output (each field visually marked as AI-suggested with its source text), and the recruiter proceeds through the exact same "Save job" path already built in #43 — no new save path, no new validation path.

## Skills in scope

- `prd-context` — Job matching → Job input; AI governance §1
- `ai-prompts` — schema/prompt structure, shared rules, versioning (mirrors #39's pattern)
- `ai-pipeline` — `runAi` usage, evidence verification, `ai_runs` logging
- `nextjs-app` — route handler conventions, Server Action reuse
- `ui-build` — `AiSuggestion`/`SourceQuote` reuse
- `security-check` — upload validation (type/size/magic bytes), signed URL for the stored JD
- `testing` — test-first for the extraction service

## Files

| File | Change |
|---|---|
| `src/server/ai/prompts/extract-jd/{v1,index}.ts` | new — schema, prompt, EN+ZH examples |
| `src/server/jobs/extract.ts` + `.test.ts` | new — extraction service |
| `src/app/api/ai/extract-jd/route.ts` | new — upload route handler |
| `src/components/features/jobs/JobForm.tsx` | modify — upload step, pre-fill, AiSuggestion/SourceQuote |
| `e2e/jd-upload.spec.ts` | new — desktop only |

## Dependencies

- #135 (this Story's own predecessor, PR #221, still open) — `JobForm.tsx`, `jobVersionInputSchema`
- #169 (`runAi`, PR #213, still open)
- #114 (closed) — storage conventions

## Steps

- [x] **T1** `claude` — Write `src/server/ai/prompts/extract-jd/v1.ts` + `index.ts`: schema matching the job form's fields (title, requirements with text + `proposed_marking` + `source_text`, `requires_nationality`/`nationality_reason`/`requires_language`/`language_reason` proposals with evidence), prompt with the shared rules + the "proposals only, recruiter confirms" rule, EN + Simplified Chinese fictional examples.
  - Rules: `ai-prompts` shared rules + versioning; `compliance-review` — no protected-attribute slots beyond what the job form itself allows (nationality/language proposals still require evidence, mirroring the human-entered reason rule's spirit even though the AI's "reason" is only a suggestion the recruiter must still confirm/rewrite)
  - Verify: `npm run typecheck`
- [x] **T2a** `grok` — Failing tests first in `extract.test.ts`: schema-invalid extraction does not return pre-fillable data; an unsupported file type is rejected with a reason; extraction writes an `ai_runs` row; a fixture test confirms the pre-fill path never bypasses `createJob`'s own validation (AC3's explicit test).
  - Verify: `npm test -- jobs/extract` → fails (module missing)
- [x] **T2b** `grok` — Implement `extract.ts` + `route.ts` until T2a passes.
  - Verify: `npm test -- jobs/extract` → pass; `npm run typecheck`
- [x] **T3** `grok` — Extend `JobForm.tsx` with the upload step + pre-fill (AiSuggestion/SourceQuote on every AI-filled field, "Confirm pre-filled values"/"Edit before saving"). Add `e2e/jd-upload.spec.ts` (desktop only).
  - Rules: `ui-build` — reuse `AiSuggestion`/`SourceQuote` exactly; design spec's exact two-action pattern
  - Verify: `npm run lint`; `npm run typecheck`; `npx playwright test e2e/jd-upload.spec.ts --project=desktop --list`
- [x] **S4** `none` — Full verification, close out docs. Do not run `pr-review`.

## Test plan

| AC | Test | Type |
|---|---|---|
| AC1 | `extract.test.ts` | unit, fake model |
| AC2 | `jd-upload.spec.ts` | e2e (written; local execution constraints — see #43) |
| AC3 | `extract.test.ts › recruiter-edited values win`, existing `createJob` behavior from #43 | unit + inherited guarantee |

## Verification

```
npm run lint
npm run typecheck
npm test -- jobs/extract
npx playwright test e2e/jd-upload.spec.ts --project=desktop --list
```

## UX / design

`design/specs/job-form.md` — JD upload pre-fill card section.

## Data / API changes

None — reuses the existing private CV/JD storage bucket (#38/#114) and `ai_runs` table.

## Risks & rollback

Depends on unmerged PR chain (#213→#221). Net-new modules + one modified component; rollback is reverting.

## Outcome

- **Shipped:** JD upload → extraction → pre-fill, closing Story #44 in full: `extract-jd` v1 schema/prompt (mirrors `parse-cv`), a schema-validated `runAi`-backed extraction service that only ever returns pre-fill data (never writes `jobs`/`job_versions`), a private-bucket upload route, and a `JobForm.tsx` upload step with `AiSuggestion`/`SourceQuote` on every AI-filled field and two explicit recruiter actions before anything reaches editable form state.
- **Changed files / areas:** `src/server/ai/prompts/extract-jd/{v1,index}.ts` (new, written directly by Claude), `src/server/jobs/extract.ts` + `.test.ts` (new), `src/app/api/ai/extract-jd/route.ts` (new), `src/components/features/jobs/JobForm.tsx` (modified — upload step), `e2e/jd-upload.spec.ts` (new). **Also fixed** a pre-existing bug in `src/server/cv/extract.ts` (Story #38, already merged) — see Deviations.
- **Tests added or updated:** `extract.test.ts` (5 tests: schema-valid pre-fill data with no `jobs`/`job_versions` writes, schema-invalid rejection, `ai_runs` logging via `runAi`, AC3's structural recruiter-edit-wins guarantee, unsupported file type rejected before any model call) — executed, all passing. `jd-upload.spec.ts` (2 tests: AC2 labelling/source text, AC3 marking override) — written, registered via `--list` alongside the existing `job-form.spec.ts`/`jobs.spec.ts` (6 total across the three specs), **not executed** — same no-Supabase-credentials/no-seed-data constraint as every Epic 5/6 screen so far.
- **Verification:** `npm run lint` → pass (1 pre-existing unrelated warning). `npm run typecheck` → pass. `npx vitest run src/server/jobs src/server/ai src/server/cv` → 65 passed, 3 pre-existing unrelated `extract.test.ts` failures (tracked against Story #38, unchanged by this Story's build fix — confirmed same 3 failures before and after). `npm run build` → **initially failed**, fixed in this Story (see Deviations), now passes; all three new/changed routes (`/api/ai/extract-jd`, `/jobs`, `/jobs/[id]`, `/jobs/new`) registered, no client-bundle leaks. `npm run test:e2e` → not run (no Supabase env/seed locally).
- **Deviations:** (1) Client-side Zod validation of the `extract-jd` output shape is duplicated in `JobForm.tsx` (a client component) rather than importing the server-only prompt module — a real, acknowledged drift risk if the schema changes later without updating both copies; flagged as a follow-up. (2) "Confirm pre-filled values" and "Edit before saving" both seed the same form state; "Edit" additionally focuses the title field. (3) **Fixed a pre-existing build-blocking bug**: `src/server/cv/extract.ts` (Story #38) resolved `pdfjs-dist`'s asset paths eagerly at module scope via `createRequire(import.meta.url)`, which is unreliable during Next's build-time page-data collection. This route (`/api/ai/extract-jd`) is the first one ever to import that module into the app's route graph, which is why the bug was dormant until now. Fixed by deferring the resolution to first real call (lazy, memoized) — runtime behavior is unchanged, confirmed by the same 3 pre-existing `extract.test.ts` failures persisting identically before and after the fix (i.e. the fix didn't change extraction behavior, only build-time evaluation timing).
- **Fix rounds / escalations:** 0 within the executor pipeline (T1/T2a/T2b/T3 all passed on first attempt). 1 direct Claude fix (the `extract.ts` build bug, found and fixed by Claude during final verification, outside the executor loop).
- **Models used:** Planning/orchestration + T1 (prompt authoring) + the `extract.ts` build fix: Claude Sonnet 5 (claude-sonnet-5). T2a/T2b/T3: cursor-grok-4.6-high. No escalations.
- **Claude direct fixes:** `src/server/cv/extract.ts` — lazy pdfjs-dist path resolution (see Deviations #3). This is a genuine bug fix to already-merged code, not part of this Story's own scope, done because it blocked a required verification command (`npm run build`).
- **Follow-ups:** (1) `jd-upload.spec.ts`/`job-form.spec.ts`/`jobs.spec.ts` (6 tests) need CI or local Supabase + seed data to actually execute. (2) The duplicated client-side Zod schema in `JobForm.tsx` should be reconciled with `extract-jd`'s server-only schema — consider a shared non-server-only type/schema file if this pattern recurs. (3) The `src/server/cv/extract.ts` fix should be verified again once CI runs a real `npm run test:e2e` against a seeded environment, to confirm no runtime regression in actual PDF parsing (only build-time behavior was changed; unit tests already confirm no change to parsing results). (4) The `CLAUDE.md`/desktop-only-practice inconsistency (flagged in #218, reiterated in #221) still applies here and remains unresolved.
