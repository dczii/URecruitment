# Plan — #48 CVs and jobs have multilingual embeddings

| | |
|---|---|
| Issue | https://github.com/dczii/URecruitment/issues/48 |
| Parent | Story #48 → Epic #7 |
| Milestone | MVP |
| Branch | `feat/48-embeddings-service` (stacked on `feat/47-gap-flag-resolve-checklist`, PR #225 still open) |
| Created | 2026-09-19 |
| Status | In progress |

## Problem

Nothing today turns a CV or job version into a vector for meaning-based search/matching. This Story builds one embedding service the whole app uses, provider-agnostic, storing the embedding model id with every vector.

## PRD references

| PRD section | Item | Status |
|---|---|---|
| AI pipeline → Embeddings | multilingual model (EN + Simplified Chinese), stored with pgvector | suggested |
| Technical architecture → Search | pgvector for meaning-based search | proposed |
| Provider notes | embeddings may need a second provider from the one chosen for text generation | noted |

No open PRD items. No design needed.

## Scope

**In scope**
- `src/server/ai/embeddings.ts` — `embedText(text)`, `embedCvProfile(...)`, `embedJobVersion(...)`, all returning the model id used; re-embedding the same text with the same model is skipped (no redundant vector written)
- Extend `src/server/ai/provider.ts` with an embedding entry point (the only module allowed to name a provider, per its own existing header comment and AC3's grep-ability requirement) — no new provider chosen, same stub-throws pattern as `generateWithConfiguredProvider`
- Batched embedding for the seed's expected volume (per #145's own scope: "batched embedding for the seed's volume")

**Out of scope**
- Retrieval or ranking (#49, #51)
- Choosing the provider (still open per ADR-0003)
- The pgvector index (already created by #111, closed)

## Acceptance criteria

- [ ] **AC1** — An EN or ZH CV, when embedded, stores a vector with the embedding model's id. _Proved by:_ `embeddings.test.ts › AC1: embedding a CV profile stores a vector with the model id`
- [ ] **AC2** — A saved job version's embedding is created and stored the same way. _Proved by:_ `embeddings.test.ts › AC2: embedding a job version stores a vector with the model id`
- [ ] **AC3** — No provider name appears outside the configured client module. _Proved by:_ `embeddings.test.ts › AC3: no provider name outside provider.ts` (a static grep-style test, same pattern as `no-bypass.test.ts` from #169)

## Guardrails that apply

- [x] AI output logged with model id/version — every stored vector carries `embedding_model`
- [x] Server-only data access
- [x] Provider-agnostic — `ai-pipeline` rule, this Story's core purpose
- [x] Free-tier limits — no network in unit tests; batching keeps real embedding calls bounded for the seed's volume

## Assumptions

- The `embeddings` table (#111, closed) already exists with `owner_type`, `owner_id`, `embedding vector`, `embedding_model`, `ai_run_id` — no migration needed.
- "Dimension mismatch against the stored schema is rejected" (per #145's own scope) is checked in code against a documented expected dimension (the fake embedder in tests can return a wrong-length vector to prove the check) — the real dimension depends on the eventual provider's model and isn't hardcoded to a magic number beyond what the fake-embedder tests assert.
- "Re-embedding the same text with the same model is skipped" is implemented as: before embedding, check whether an `embeddings` row already exists for this `(owner_type, owner_id, embedding_model)` combination; if so, skip the model call and reuse the existing row (or a content-hash check if that's more precise — implementer's call, documented in the test).
- This service doesn't call `runAi` (that wrapper is for schema-validated JSON generation, not embeddings) — it uses its own thin `ai_runs`-logging path via the injected `AiRunsWriter`, matching the `ai_runs` table's general shape (embeddings don't have a Zod output schema to validate, just a vector).

## Open questions

- none

## Approach

`provider.ts` gains `embedWithConfiguredProvider(text)` (stub, throws until ADR-0003/ADR-0004 pick a provider — same pattern as `generateWithConfiguredProvider`), reachable only through a role-aware `getEmbedder()` export. `embeddings.ts` never imports a vendor SDK; it calls `getEmbedder()`, checks the returned vector's dimension against the expected size, skips the call entirely if an up-to-date embedding already exists for that owner+model, logs the run (model id, cost, duration) to `ai_runs`, and writes the `embeddings` row.

## Skills in scope

- `ai-pipeline` — provider-agnostic rule, embeddings requirement, `ai_runs` logging
- `supabase-db` — `embeddings` table, existing RLS from #111
- `testing` — test-first with a fake embedder, no network

## Files

| File | Change |
|---|---|
| `src/server/ai/provider.ts` | modify — add `embedWithConfiguredProvider`/`getEmbedder`, additive |
| `src/server/ai/embeddings.ts` + `.test.ts` | new — embed text/CV/job version, dimension check, skip-if-unchanged, batching |

## Dependencies

- #111 (closed) — `embeddings` table
- #169 (this session's own predecessor work, in the PR stack)

## Steps

- [ ] **T1a** `grok` — Failing tests first in `embeddings.test.ts` using a fake embedder: embedding a CV profile stores a vector + model id (AC1); embedding a job version does the same (AC2); a fake embedder returning the wrong vector dimension is rejected with a clear error; re-embedding the same owner+model with unchanged content skips the call (no new `ai_runs` row, no duplicate `embeddings` row); a static test asserts no file outside `provider.ts` imports a provider/vendor SDK (AC3).
  - Verify: `npm test -- embeddings` → fails (module missing)
- [ ] **T1b** `grok` — Implement `provider.ts`'s embedding addition + `embeddings.ts` until T1a passes.
  - Verify: `npm test -- embeddings` → pass; `npm run typecheck`
- [ ] **S2** `none` — Full verification, close out docs. Do not run `pr-review`.

## Test plan

| AC | Test | Type |
|---|---|---|
| AC1 | `embeddings.test.ts › AC1` | unit, fake embedder |
| AC2 | `embeddings.test.ts › AC2` | unit, fake embedder |
| AC3 | `embeddings.test.ts › AC3` | unit, static import check |

## Verification

```
npm run lint
npm run typecheck
npm test -- embeddings
```
(`npm run test:db`, named in #145's own verification block, is not applicable here — no DB-integration test needed; this task uses mocked `../db` like every other module so far in this codebase.)

## UX / design

n/a — no UI.

## Data / API changes

None — reuses the existing `embeddings` table from #111.

## Risks & rollback

Depends on unmerged PR chain (#213→#225). Net-new module + additive provider.ts change; rollback is reverting.

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
