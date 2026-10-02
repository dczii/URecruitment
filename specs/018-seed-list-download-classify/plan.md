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

All steps completed on the first pass — zero fix rounds, zero escalations, no direct Claude
code fixes were needed.

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

- **Shipped:**
  - #117 — `scripts/seed/env.ts`: `parseSeedEnv` (typed guard for `BLOB_READ_WRITE_TOKEN` /
    `SEED_BLOB_BASE_URL`, missing/empty/`NEXT_PUBLIC_`-prefixed all rejected, no value ever
    appears in the error), `assertBlobUrlInStore` (throws without leaking either URL), plus a
    static-scan test proving `src/` never imports `@vercel/blob`.
  - #118 — `scripts/seed/fetch.ts`: `listSampleFiles` (paginated `list()`, calls
    `assertBlobUrlInStore` before returning a file), `downloadAndHash` (public-URL fetch, no
    token, SHA-256, extension-based skip with a reason), `convertLegacyDoc` (`.doc` → `.txt`
    via `word-extractor`, no-op otherwise), `buildRunReport` (counts by type/language + skipped
    list).
  - #119 — `scripts/seed/classify.ts`: `classifyDocument(text)` — EN/ZH keyword-and-structure
    heuristic scorer, 0.6 confidence threshold, returns `unclassified` with a reason below it
    (never a guess). 4/4 accuracy on the four purpose-built fixtures.
  - #120–#123 intentionally NOT attempted — see spec.md Scope: they depend on the CV parser
    (#127), JD extractor (#139), scoring service (#148), delay-status view (#158) and recruiter
    overrides (#132), none of which exist in this repo yet. Confirmed by user decision during
    intake (2026-09-18) to ship #117–#119 alone rather than block on that unbuilt work.
- **Changed files / areas:**
  - `scripts/seed/env.ts`, `scripts/seed/env.test.ts`, `scripts/seed/no-blob-in-src.test.ts`
  - `scripts/seed/fetch.ts`, `scripts/seed/fetch.test.ts`
  - `scripts/seed/classify.ts`, `scripts/seed/classify.test.ts`
  - `test/fixtures/seed/{cv-en,cv-zh,jd-en,ambiguous}.txt`
  - `package.json`, `package-lock.json` (+`@vercel/blob@^2.8.0`, `+word-extractor@^1.0.4`)
- **Tests added or updated:**
  - `scripts/seed/env.test.ts` (26 tests) — AC117.1, AC117.2
  - `scripts/seed/no-blob-in-src.test.ts` (1 test) — AC117.3
  - `scripts/seed/fetch.test.ts` (13 tests) — AC118.1–AC118.5
  - `scripts/seed/classify.test.ts` (4 tests) — AC119.1–AC119.4
- **Verification:**
  - `npm run lint` → pass (1 pre-existing unrelated warning in `supabase/migration-lint.ts`)
  - `npm run typecheck` → pass
  - `npm test` → 209/211 passed; the 2 failures are in `src/server/db.test.ts`, unmodified by
    this PR and identical to `main` — they fail locally because this machine runs Node 20.19.4
    while the repo requires Node 22.x (`@supabase/realtime-js` needs a native WebSocket only
    available on 22+). Confirmed pre-existing and environment-only, not caused by this change.
  - `npm run build` → pass; `check-client-bundle.mjs` reports "no leaks (scanned 2 directories)"
  - `npm run test:e2e` → n/a, no screen changed
  - `npm run test:db` → n/a, no migration/DB change
  - `npm run eval` → n/a, no model call (classification is heuristic in this PR)
  - Manual: `git diff origin/main...HEAD | grep -iE "secret|token|..."` → only variable names
    and fictional test literals (`test-blob-read-token`, `sk-test-DO-NOT-PRINT-blob-token`), no
    real secret or `*.public.blob.vercel-storage.com` URL. `git ls-files | grep -E '(^|/)\.env'`
    → no match beyond `.env.example`.
- **Deviations:**
  - Skip-by-extension only in #118, not magic bytes (`security-check`'s magic-byte rule targets
    the JD-**upload** endpoint, not the dev-only seed script reading from a controlled store;
    the task's "Done when" only asks for type + reason, which this satisfies).
  - `.doc` conversion (#118) is implemented against a synthetic fixture only — the real store
    held zero `.doc` files as of 17 Sep 2026 (see `prd-context` sample-data.md), so this path
    is unverified against a real legacy file. Flagged as a follow-up.
  - **Unrelated incident, not part of this PR's changes:** while diagnosing the (pre-existing)
    `db.test.ts` failure against `main`, a `git stash pop` was run to compare trees and
    unexpectedly applied a pre-existing, unrelated stash entry (in-progress edits across
    several `.claude/skills/*`, `AGENTS.md`, `CLAUDE.md`, `design/shell.pen` and `docs/**` —
    appears to be someone else's work removing phone-width/mobile scope from several skills).
    It was immediately restashed (`git stash push`, message: "restored: pre-existing stash
    unrelated to #37, unintentionally popped by orchestrator") before anything from it was
    committed or touched further. It was never part of this branch's history. Flagged to the
    user so they can recover it (`git stash list` / `git stash pop`) — it was not inspected or
    acted upon beyond restoring it.
- **Fix rounds / escalations:** none — every step passed verification on the first pass.
- **Models used:** planning/orchestration by Claude (this session); all six implementation
  steps (S1a, S1b, S2b, S2c, S3a, S3b) ran on `cursor-grok-4.6-high` per
  `.orchestrator/37-seed-list-download-classify/*.log` headers. No escalation model or GPT
  step was needed. S1c (`no-blob-in-src.test.ts`) and dependency installation (S2a) were
  written/run directly by Claude rather than delegated, since they were small, mechanical,
  single-file changes not worth a cursor-agent round.
- **Claude direct fixes:** none needed. Claude wrote `scripts/seed/no-blob-in-src.test.ts`
  (S1c) directly rather than via cursor-agent, as a scope/efficiency call, not a fix.
- **Follow-ups:**
  - Re-verify `.doc` → text conversion against a real `.doc` file once one appears in the
    sample-data store (none existed there as of 17 Sep 2026).
  - #120 (upload/parse/embed/load jobs/gap check/score), #121 (back-date pipeline entries),
    #122 (idempotency + `--reset`), #123 (seed run report) remain open, blocked on #127, #139,
    #148, #158, #132 respectively. Re-run `/task 37` once those land.
  - No `npm run seed` entry point yet — added once #120 gives it something to upload/parse.
  - The pre-existing, unrelated stashed changes noted above under Deviations are still on the
    stash and were not reviewed or acted on; the user should recover them when convenient.
