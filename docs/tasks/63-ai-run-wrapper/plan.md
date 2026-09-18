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

- [ ] **AC1** — Given any AI call, when it completes or fails, then a row in `ai_runs` records input ref, model + version, prompt version, output, cost and duration. _Proved by:_ `run.test.ts › writes ai_runs row on success` and `› writes ai_runs row on provider error`
- [ ] **AC2** — Given an AI output, when it is stored, then it was schema-validated first. _Proved by:_ `run.test.ts › rejects schema-invalid output and still logs a failed run`
- [ ] **AC3** — Given a new AI call added outside `runAi`, when tests run, then it is caught. _Proved by:_ `run.test.ts › fails if a model call bypasses runAi`

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

- [ ] **S1a** `grok` — Write failing tests in `src/server/ai/run.test.ts` using a fake model: valid call writes a complete `ai_runs` row; schema-invalid response is rejected and still writes a failed run; provider error writes a failed run with its reason; cost and duration are always recorded. Also write `src/server/ai/no-bypass.test.ts` asserting no file under `src/server/**` other than `src/server/ai/**` imports the AI SDK directly.
  - Rules: `testing` — test-first for logic, no network in unit tests; `ai-pipeline` — ai_runs must record input ref/model/version/prompt version/cost/duration on success and failure
  - Verify: `npm test -- ai` → fails because `run.ts`/`fake-model.ts` don't exist yet
- [ ] **S1b** `grok` — Implement `src/server/ai/run.ts`, `src/server/ai/fake-model.ts`, `src/server/ai/provider.ts` until S1a passes.
  - Rules: `ai-pipeline` — provider-agnostic via Vercel AI SDK, schema-validate with Zod before returning, log failures too; `security-check` — server-only, no secret key exposed to client bundle
  - Verify: `npm test -- ai` → pass; `npm run typecheck`
- [ ] **S2** `none` — Full verification until green, then close out docs. Do not run `pr-review`.

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

- **Shipped:**
- **Changed files / areas:**
- **Tests added or updated:**
- **Verification:**
- **Deviations:**
- **Fix rounds / escalations:**
- **Models used:**
- **Claude direct fixes:**
- **Follow-ups:**
