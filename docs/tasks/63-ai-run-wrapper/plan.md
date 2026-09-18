# Plan — #63 Every AI call is traceable

| | |
|---|---|
| Issue | https://github.com/dczii/URecruitment/issues/63 |
| Parent | Story #63 → Epic #12 |
| Milestone | MVP |
| Branch | `feat/63-ai-run-wrapper` |
| Created | 2026-09-18 |
| Status | In progress <!-- Planned → In progress → In review --> |

## Problem

No AI call in the app goes through a common path today, so there is no way to see what a model was asked, which model answered, what it cost, or to check the output was schema-valid — a result can't be checked months later. This wrapper is also a hard dependency of CV parsing (#126/#127), JD extraction (#138), gap-check (#141), matching (#146), embeddings (#145) and search-query parsing (#152) — every AI feature in Epics 5–8 is blocked on it.

## PRD references

| PRD section | Item | Status |
|---|---|---|
| AI governance → requirement 2 | Each AI output is stored with its input, model version and date | proposed |
| Technical architecture → AI access | Vercel AI SDK, provider swappable without a rewrite | proposed |
| AI pipeline → every step | Returns JSON checked against a fixed schema | suggested |
| Data model → ai_runs | suggested |

No open PRD items are touched by this task.

## Scope

**In scope**
- `src/server/ai/run.ts`: `runAi({ prompt, schema, inputRef, model })` — provider-agnostic call via Vercel AI SDK, Zod-validates output, writes one `ai_runs` row on success or failure (input ref, model id/version, prompt version, output, cost, duration)
- `src/server/ai/fake-model.ts`: fake model for unit tests (no network)
- `src/server/ai/provider.ts`: provider-agnostic model resolution (provider still undecided — keep swappable)
- A lint/test guard that fails if an AI call bypasses `runAi`

**Out of scope**
- Any specific prompt (CV parsing, JD extraction, etc.)
- Rate limit / spend cap (E11-S04-T01, separate task)
- Choosing a provider

## Acceptance criteria

- [x] **AC1** — Given any AI call, when it completes or fails, then a row in `ai_runs` records input ref, model + version, prompt version, output, cost and duration. _Proved by:_ `run.test.ts › writes ai_runs row on success` and `› writes ai_runs row on provider error`
- [x] **AC2** — Given an AI output, when it is stored, then it was schema-validated first. _Proved by:_ `run.test.ts › rejects schema-invalid output and still logs a failed run`
- [x] **AC3** — Given a new AI call added outside `runAi`, when tests run, then it is caught. _Proved by:_ `no-bypass.test.ts › fails if a model call bypasses runAi`

## Guardrails that apply

- [x] AI output schema-validated, logged to `ai_runs`, shows source text — this task builds that logging path
- [x] Server-only data access; secret key never reaches the browser — `runAi` is server-only (`src/server/`)
- [x] Free-tier limits respected — no network calls in unit tests, cost is recorded not spent

## Assumptions

- Provider is still unchosen per ADR-0003 (#73, closed) — `provider.ts` reads a swappable config, no hardcoded SDK provider import outside that file.
- "Bypass detection" (AC3) is implemented as a lint rule or grep-based test over `src/server/**` disallowing direct AI SDK imports outside `src/server/ai/`, since a runtime detector can't catch a call that was never made through the wrapper.

## Open questions

- none

## Approach

One thin wrapper function around the Vercel AI SDK's `generateObject`-style call, parameterized by a Zod schema and an input reference id. It always writes an `ai_runs` row — before returning on success, and also on any thrown error — so failure is never silent. Cost/duration are computed inside the wrapper so no caller has to remember to log them. Provider selection is isolated in `provider.ts` behind an interface so choosing a provider later is a one-file change.

## Skills in scope

- `prd-context` — AI governance §2, data model §ai_runs
- `testing` — test-first for logic, fake model, no network in unit tests
- `ai-pipeline` — the canonical wrapper pattern, ai_runs fields, provider-agnostic rule
- `security-check` — server-only data access, no secret key in browser bundle

## Files

| File | Change |
|---|---|
| `src/server/ai/run.ts` | new — `runAi` wrapper |
| `src/server/ai/run.test.ts` | new — failing-then-passing tests |
| `src/server/ai/fake-model.ts` | new — fake model for unit tests |
| `src/server/ai/provider.ts` | new — provider-agnostic model resolution |
| `src/server/ai/no-bypass.test.ts` | new — guard test that AI calls only happen through `runAi` |

## Dependencies

- #112 (closed) — `ai_runs` table migration
- #73 (closed) — ADR-0003 provider-agnostic contract

## Steps

- [x] **S1a** `grok` — Write failing tests in `src/server/ai/run.test.ts` using a fake model: valid call writes a complete `ai_runs` row; schema-invalid response is rejected and still writes a failed run; provider error writes a failed run with its reason; cost and duration are always recorded. Also write `src/server/ai/no-bypass.test.ts` asserting no file under `src/server/**` other than `src/server/ai/**` imports the AI SDK directly.
  - Rules: `testing` — test-first for logic, no network in unit tests; `ai-pipeline` — ai_runs must record input ref/model/version/prompt version/cost/duration on success and failure
  - Verify: `npm test -- ai` → failed as expected (missing modules)
- [x] **S1b** `grok` — Implement `src/server/ai/run.ts`, `src/server/ai/fake-model.ts`, `src/server/ai/provider.ts` until S1a passes.
  - Rules: `ai-pipeline` — provider-agnostic via Vercel AI SDK, schema-validate with Zod before returning, log failures too; `security-check` — server-only, no secret key exposed to client bundle
  - Verify: `npm test -- ai` → pass (43/43); `npm run typecheck` → pass
- [x] **S2** `none` — Full verification until green, then close out docs. Do not run `pr-review`.

## Test plan

| AC | Test or manual evidence | Type / reason |
|---|---|---|
| AC1 | `run.test.ts › writes ai_runs row on success`, `› on provider error` | unit (fake model, no network) |
| AC2 | `run.test.ts › rejects schema-invalid output and still logs a failed run` | unit |
| AC3 | `no-bypass.test.ts › fails if a model call bypasses runAi` | unit (static import check) |

## Verification

```
npm run lint
npm run typecheck
npm test -- ai
```

## UX / design

n/a

## Data / API changes

None — uses the existing `ai_runs` table from migration #112.

## Risks & rollback

Low risk: net-new server module, no existing caller to break. Rollback is deleting the new files; nothing else depends on this branch yet.

## Outcome

- **Shipped:** `runAi` — the shared, provider-agnostic AI call wrapper with Zod validation and `ai_runs` logging on success and failure, plus a static bypass guard. This unblocks CV parsing (#126/#127), JD extraction (#138), gap-check (#141), embeddings (#145), matching (#146) and search-query parsing (#152).
- **Changed files / areas:** `src/server/ai/run.ts`, `src/server/ai/fake-model.ts`, `src/server/ai/provider.ts`, `src/server/ai/types.ts`, `src/server/ai/run.test.ts`, `src/server/ai/no-bypass.test.ts`.
- **Tests added or updated:** `run.test.ts` (success logging, schema-invalid rejection + failed row, provider error + failed row, cost/duration always recorded), `no-bypass.test.ts` (static guard against AI SDK imports outside `src/server/ai/**`).
- **Verification:** `npm test -- ai` → 43/43 pass. `npm run lint` → 0 errors (1 pre-existing unrelated warning in `supabase/migration-lint.ts`). `npm run typecheck` → pass. Full `npm test` shows 5 pre-existing failures in `src/server/cv/extract.test.ts`, confirmed present on `main` before this branch — unrelated to this task, not introduced by it.
- **Deviations:** `runAi` takes an injectable `runs: AiRunsWriter` and `model: AiModel` (not just `{prompt, schema, inputRef, model}`) so unit tests never touch Supabase or a network provider — required to satisfy "no network in unit tests". Failure mode is throw-after-logging, one of two options the plan allowed. Vercel AI SDK (`ai` package) is not yet in `package.json`; per ADR-0003 (#73) no provider is chosen, so `provider.ts` is a stub with the one-file swap point reserved for when a provider is picked — it imports no vendor SDK.
- **Fix rounds / escalations:** 0 — both steps passed on first attempt.
- **Models used:** Planning/orchestration: Claude Sonnet 5 (claude-sonnet-5). Executor S1a: cursor-grok-4.6-high. Executor S1b: cursor-grok-4.6-high. No escalations, no direct Claude fixes.
- **Claude direct fixes:** none.
- **Follow-ups:** Choosing an AI provider (still open per ADR-0003) will require implementing the real call inside `provider.ts` only — no other file should need to change. The pre-existing `src/server/cv/extract.test.ts` failures (missing/mismatched `avgCharsPerPage` on scanned-file detection) are unrelated to this task and should be tracked separately against Story #38.
