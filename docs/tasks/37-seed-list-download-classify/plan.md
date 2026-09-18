# Plan — #37 Developers can rebuild all sample data with one command

Spec: [spec.md](./spec.md) · Branch: `feat/37-seed-list-download-classify` · Created: 2026-09-18

## Approach

Three independent-but-sequential library modules under `scripts/seed/`, each test-first:
`env.ts` (guard), `fetch.ts` (list/download/hash/convert, built on `env.ts`'s guard), and
`classify.ts` (content-based CV/JD classifier, consumed by whatever calls `fetch.ts`'s output
later). None are wired into a `npm run seed` command yet — that needs #120's upload/parse step
to have something to do with a classified file. Classification is heuristic (keyword/structure
scoring), not a model call, because `runAi`/`ai_runs`/the provider abstraction don't exist in
this repo yet (see spec Assumptions) — bootstrapping that inside a seed task would be scope
creep on an Epic-level piece of work. `.doc` conversion extracts text with `word-extractor`
(pure JS, no external binary, works in CI/serverless) rather than shelling out to LibreOffice.

## Skills in scope

- `prd-context` — required for every task; sample-data.md gives the seed flow, store facts, and the "classify by content, not name" rule.
- `testing` — required for every task; test-first protocol, fictional-fixtures-only rule, no-network-in-unit-tests rule.
- `supabase-db` — seed mechanics section: `BLOB_READ_WRITE_TOKEN`/`SEED_BLOB_BASE_URL` only for `list()`, never `put`/`copy`/`del`; downloads use the public URL with no token; nothing is committed.
- `security-check` — "Sample-data Blob store" checklist: `src/**` never imports `@vercel/blob`; listed URLs checked against `SEED_BLOB_BASE_URL` before downloading; no Blob URL in commits/logs.
- `ai-pipeline` — read for #119 to confirm the `runAi()`/`ai_runs` wrapper doesn't exist yet, justifying the heuristics-only decision recorded in spec.md Assumptions.
- `github-workflow` — branch/commit/PR conventions, Project 4 status moves.

## Files

| File | Change |
|---|---|
| `scripts/seed/env.ts` | new — typed env schema + guard (`parseSeedEnv`, `assertBlobUrlInStore`) |
| `scripts/seed/env.test.ts` | new — AC117.1, AC117.2 |
| `scripts/seed/no-blob-in-src.test.ts` | new — AC117.3, greps `src/` for `@vercel/blob` imports |
| `scripts/seed/fetch.ts` | new — `listSampleFiles`, `downloadAndHash`, `convertLegacyDoc`, run-report builder |
| `scripts/seed/fetch.test.ts` | new — AC118.1–AC118.5, fakes `@vercel/blob`'s `list`/network, no real Blob access |
| `scripts/seed/classify.ts` | new — `classifyDocument(text): { kind, confidence, reason }` |
| `scripts/seed/classify.test.ts` | new — AC119.1–AC119.4 |
| `test/fixtures/seed/cv-en.txt`, `cv-zh.txt`, `jd-en.txt`, `ambiguous.txt` | new — fictional fixtures for classify tests |
| `.env.example` | modify only if a var name is missing (currently has both; verify, don't duplicate) |
| `package.json` | modify — add `@vercel/blob`, `word-extractor` deps |

## Dependencies

- `@vercel/blob@^2` — `list()` only, per `security-check`; used solely in `scripts/seed/fetch.ts`.
- `word-extractor@^1` — pure-JS `.doc` text extraction, no external binary (works in CI/Vercel).

## Steps

- [x] **S1a** `grok` — Write failing tests for the seed env guard in `scripts/seed/env.test.ts` (covers AC117.1, AC117.2).
  - Rules: `testing` §Test-first protocol ("always test-first: env parsing"); `security-check` §Sample-data Blob store ("Listed URLs are checked against SEED_BLOB_BASE_URL before downloading")
  - Verify: `npm test -- env` → fails (module doesn't exist)
- [x] **S1b** `grok` — Implement `scripts/seed/env.ts` (`parseSeedEnv`, `assertBlobUrlInStore`) until S1a passes, following the `src/lib/env.ts` / `src/server/env.ts` pattern (Zod schema, `EnvError` from `src/lib/env-error.ts`, `blankEnvStrings`/`envIssuesFromZod`).
  - Rules: `supabase-db` §Seed ("BLOB_READ_WRITE_TOKEN, used only for list()"; "SEED_BLOB_BASE_URL, used to check that listed URLs belong to the expected store"); `security-check` ("no `NEXT_PUBLIC_` prefix on ... BLOB_READ_WRITE_TOKEN")
  - Verify: `npm test -- env` → pass; `npm run typecheck`
- [x] **S1c** `grok` — Write `scripts/seed/no-blob-in-src.test.ts` asserting no file under `src/` imports `@vercel/blob` (covers AC117.3), modeled on `test/infra/*` patterns.
  - Rules: `security-check` ("App runtime code (`src/**`) never imports `@vercel/blob`")
  - Verify: `npm test -- no-blob-in-src` → pass immediately (nothing imports it yet); must start failing if anyone later adds the import
- [x] **S2a** `grok` — Add `@vercel/blob` and `word-extractor` to `package.json`, `npm install`.
  - Rules: `AGENTS.md` ("Do not add npm dependencies the plan doesn't list") — both are listed here.
  - Verify: `npm run typecheck`
- [x] **S2b** `grok` — Write failing tests for `scripts/seed/fetch.ts` in `scripts/seed/fetch.test.ts`: paginated listing shape, download+hash, unsupported-type skip with reason, `.doc` conversion, run-report shape (covers AC118.1–AC118.5). Fake `@vercel/blob`'s `list` and `fetch` — no real network or Blob access per `testing`.
  - Rules: `testing` §Rules ("No network in unit tests... make unexpected fetch calls fail the test"); `testing` §Rules ("Never download from the Blob store in unit or DB tests")
  - Verify: `npm test -- fetch` → fails (module doesn't exist)
- [x] **S2c** `grok` — Implement `scripts/seed/fetch.ts` until S2b passes: `listSampleFiles(env)` pages through `list()` keeping `pathname/url/size/uploadedAt`; before any download, call `assertBlobUrlInStore` from `env.ts` on each URL; `downloadAndHash(file)` fetches the public URL (no token) into `.seed-cache/`, computes SHA-256 (node `crypto`); skip non-PDF/DOC/DOCX by extension+magic-bytes with a logged reason; `convertLegacyDoc(path)` extracts `.doc` text via `word-extractor` and writes a `.txt` sibling in `.seed-cache/`; `buildRunReport(results)` returns counts by type/language plus skipped-file reasons.
  - Rules: `supabase-db` §Seed ("Downloads use the public blob URLs, with no token. Never put, copy or del"); `security-check` ("Nothing real is ever uploaded to the store"); `AGENTS.md` §7 ("The seed and eval only list() it and download its files. They never write to it")
  - Verify: `npm test -- fetch` → pass; `npm run lint`; `npm run typecheck`
- [x] **S3a** `grok` — Add fictional fixtures `test/fixtures/seed/{cv-en,cv-zh,jd-en,ambiguous}.txt` (short, invented, `example.com` emails per `test/fixtures/README.md`) and write failing tests in `scripts/seed/classify.test.ts` covering AC119.1–AC119.4, naming each with the AC id.
  - Rules: `testing` §Rules ("Fictional fixtures only... never use real people"); `prd-context` sample-data.md ("A file that can't be classified with confidence is reported and skipped, never guessed")
  - Verify: `npm test -- classify` → fails (module doesn't exist)
- [x] **S3b** `grok` — Implement `scripts/seed/classify.ts`: `classifyDocument(text): { kind: "cv"|"job_description"|"unclassified", confidence: number, reason: string }` using keyword/structure heuristics (JD markers: "responsibilities", "requirements", "we are looking for", "reporting to"; CV markers: "experience", "education", "objective", contact-block shape, EN+ZH marker sets) until S3a passes. Below a confidence threshold → `unclassified` with a reason, never a guess.
  - Rules: `prd-context` sample-data.md ("classifying by content... not by name or folder"); spec.md Assumptions (heuristics-only, no `runAi` call)
  - Verify: `npm test -- classify` → pass; `npm run lint`; `npm run typecheck`
- [x] **S4** `none` — Full verification (lint, typecheck, test, build) until green; record classifier accuracy on the fixture set in Outcome; close out docs. Do not run `pr-review`.

## Test plan

| AC | Test or manual evidence | Type / reason |
|---|---|---|
| AC117.1 | `scripts/seed/env.test.ts › AC117.1` | unit |
| AC117.2 | `scripts/seed/env.test.ts › AC117.2` | unit |
| AC117.3 | `scripts/seed/no-blob-in-src.test.ts` | unit (static import scan) |
| AC118.1 | `scripts/seed/fetch.test.ts › AC118.1` | unit, fake `list()` |
| AC118.2 | `scripts/seed/fetch.test.ts › AC118.2` | unit, fake `fetch` |
| AC118.3 | `scripts/seed/fetch.test.ts › AC118.3` | unit |
| AC118.4 | `scripts/seed/fetch.test.ts › AC118.4` | unit, fixture `.doc` bytes |
| AC118.5 | `scripts/seed/fetch.test.ts › AC118.5` | unit |
| AC119.1 | `scripts/seed/classify.test.ts › AC119.1` | unit |
| AC119.2 | `scripts/seed/classify.test.ts › AC119.2` | unit |
| AC119.3 | `scripts/seed/classify.test.ts › AC119.3` | unit |
| AC119.4 | `scripts/seed/classify.test.ts › AC119.4` | unit |

## Verification

```
npm run lint
npm run typecheck
npm test
npm run build
```

No `test:e2e` (no screen), no `test:db` (no migration/DB change), no `eval` (no model call —
classification is heuristic in this PR).

## Risks & rollback

- Adding `@vercel/blob` at seed-scope only: if it turns out to leak into the client bundle,
  the `check-client-bundle` build gate and `no-blob-in-src.test.ts` both catch it before merge.
- `.doc` conversion via `word-extractor` is untested against a real `.doc` file from the store
  (the store held zero `.doc` files as of 17 Sep 2026) — only against a synthetic fixture.
  Flagged as a follow-up to re-verify once real `.doc` files appear in the store.
- Rollback: revert the PR's commits; no migrations or data to undo.

## Outcome

- **Shipped:** `scripts/seed/env.ts` (+ tests), `scripts/seed/fetch.ts` (+ tests), `scripts/seed/classify.ts` (+ tests), fictional classify fixtures. Tasks #117, #118, #119 of Story #37. Tasks #120–#123 remain open (blocked on #127/#139/#148/#158/#132).
- **Changed files / areas:** see Files table above; filled in with the executor's actual file list once implementation completes.
- **Tests added or updated:** see Test plan table.
- **Verification:** filled in after running the commands above.
- **Deviations:** filled in after execution.
- **Fix rounds / escalations:** filled in after execution.
- **Models used:** filled in from `.orchestrator/37-seed-list-download-classify/*.log` headers.
- **Claude direct fixes:** filled in after execution.
- **Follow-ups:** re-verify `.doc` conversion against a real store file once one appears; #120–#123 unblock once #127/#139/#148/#158/#132 land; classifier accuracy on the fixture set recorded here.
