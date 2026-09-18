# Plan — #31 [Story] Shared patterns make AI results and delays unambiguous

Spec: [spec.md](./spec.md) · Branch: `feat/31-shared-ai-delay-patterns` · Created: 2026-09-18

## Approach

Design all five patterns as one `design/pattern.pen` file with a readable `design/specs/patterns.md`
mirror (Task #98, Claude via pencil MCP), then build them as small, composable React components under
`src/components/patterns/` (Task #99, Grok via cursor-agent), test-first for every piece of logic:
badge wording/aria mapping, `AiSuggestion`'s score-requires-model-version-and-date typing, name
validation, and `localStorage` persistence. Components stay presentational and take only the props
they render (no data fetching), so later screen Stories can wire them in without churn. Vitest's
default `environment: "node"` cannot render React components, so component tests opt into `jsdom` per
file via a `// @vitest-environment jsdom` docblock rather than changing the global config and risking
existing node-only tests. `@testing-library/react` and `jsdom` are added as dev dependencies since
this is the first Story to unit-test rendered components.

## Skills in scope

- `prd-context` — required for every task; supplies the decided/proposed status of every PRD item
  above and the guardrail that the name prompt is device-remembered, not server sign-in.
- `testing` — required for every task; test-first for typed-name validation logic per the "always
  test-first" list, Vitest fixtures only, no network, frozen fake data.
- `ui-design` — governs `design/pattern.pen` (pencil MCP only, semantic tokens, desktop+phone
  frames, states) and the `design/specs/patterns.md` mirror Grok builds from.
- `ui-build` — governs the component contracts for `AiSuggestion`, `SourceQuote`,
  `DelayStatusBadge`, `TypedNameDialog`, `EmptyState`/`ErrorState`, token-only Tailwind, shadcn-first
  composition, Chinese `lang`/CSS truncation, accessibility (aria-live, labelled inputs, focus).
- `compliance-review` — AI guardrails A: every AI result must be labelled a suggestion and show
  source text; scoring/attribute rules don't apply here (no scoring logic in this Story).
- `github-workflow` — Story branch/PR mechanics, one commit per Task, Project 4 status, closing
  references for both Tasks and the Story.

## Files

| File | Change |
|---|---|
| `design/pattern.pen` | new — five pattern frames at desktop + phone width, all states |
| `design/specs/patterns.md` | new — readable spec: props, states, copy per pattern |
| `src/components/patterns/AiSuggestion.tsx` | new — suggestion label; score variant requires model version + date |
| `src/components/patterns/AiSuggestion.test.tsx` | new — label/score-variant tests (AC1) |
| `src/components/patterns/SourceQuote.tsx` | new — collapsible EN/ZH source excerpt, CSS truncation |
| `src/components/patterns/SourceQuote.test.tsx` | new — expand/collapse, `lang="zh-Hans"`, truncation tests (AC2) |
| `src/components/patterns/DelayStatusBadge.tsx` | new — icon + word + colour badge, `aria-label`, no-status variant |
| `src/components/patterns/DelayStatusBadge.test.tsx` | new — wording/aria/no-status tests (AC3) |
| `src/components/patterns/TypedNameDialog.tsx` | new — name prompt, validation, device persistence |
| `src/components/patterns/TypedNameDialog.test.tsx` | new — validation + persistence tests (AC4) |
| `src/lib/recruiter-name.ts` | new — `localStorage` get/set/validate helpers used by the dialog |
| `src/lib/recruiter-name.test.ts` | new — validation + persistence unit tests (AC4) |
| `src/components/patterns/states.tsx` | new — `EmptyState`, `ErrorState`, loading skeletons |
| `src/components/ui/dialog.tsx` | new — shadcn dialog primitive (generated) for `TypedNameDialog` |
| `test/setup.ts` | modify — extend the jsdom cleanup (`@testing-library/react` `cleanup`) after each test, only if needed once jsdom tests exist |
| `package.json` / `package-lock.json` | modify — add `@testing-library/react`, `@testing-library/jest-dom`, `jsdom` as devDependencies |
| `docs/tasks/31-shared-ai-delay-patterns/spec.md` | new — Story contract |
| `docs/tasks/31-shared-ai-delay-patterns/plan.md` | new — execution and evidence |

## Dependencies

- `@testing-library/react@^16` — render and query patterns components in Vitest.
- `@testing-library/jest-dom@^6` — DOM assertion matchers (`toHaveAttribute`, `toBeVisible`, etc.).
- `jsdom@^25` — DOM environment for the per-file `@vitest-environment jsdom` pragma.
- shadcn `dialog` primitive (`npx shadcn@latest add dialog`) — generated into `src/components/ui/`,
  not a new npm dependency beyond what `shadcn` already pulls in (Base UI, already installed).

## Steps

- [x] **S1** `claude` — Create `design/pattern.pen` and `design/specs/patterns.md`: `AiSuggestion`
  (value + score variant with model version/date), `SourceQuote` (collapsed/expanded, EN + ZH),
  `DelayStatusBadge` (on-track/due-soon/overdue/no-status, greyscale-legible), `TypedNameDialog`
  (first use, remembered, change), `EmptyState`/`ErrorState`/loading skeleton — desktop + phone frames
  for each (covers AC1–AC4; Task #98).
  - Rules: `ui-design` §Tooling (pencil MCP only, never Read/Grep `.pen`), §Frames (1440/390, every
    state), §PRD design rules 1–3/5 (suggestion label, source quote, ZH Noto Sans SC, name prompt);
    `prd-context` guardrail 7 (device-remembered name, no sign-in); `compliance-review` §A (AI only
    suggests, source text shown).
  - Verify: pen.dev validation of `design/pattern.pen`; greyscale check of the delay badge frame;
    confirm `design/specs/patterns.md` lists every pattern's props/states so Grok can build without
    opening the `.pen` file.
- [x] **S2a** `grok` — Add devDependencies (`@testing-library/react`, `@testing-library/jest-dom`,
  `jsdom`) and write failing tests: `AiSuggestion.test.tsx` (label always shown; score variant fails
  typecheck without model version+date — assert via a `// @ts-expect-error` case plus a runtime
  render assertion), `DelayStatusBadge.test.tsx` (wording + `aria-label` per status; end states/Placed
  render no status), `src/lib/recruiter-name.test.ts` (rejects blank/whitespace, persists and reads
  back a name) (covers AC1, AC3, half of AC4; Task #99).
  - Rules: `testing` §Test-first protocol, "typed-name validation" in the always-test-first list, no
    network, use `// @vitest-environment jsdom` per file; `ui-build` §Tests (aria/badge text, name
    persistence).
  - Verify: `npm test -- src/components/patterns/AiSuggestion.test.tsx src/components/patterns/DelayStatusBadge.test.tsx src/lib/recruiter-name.test.ts` → fails because the modules don't exist yet, not because of import/config errors.
- [x] **S2b** `grok` — Implement `AiSuggestion.tsx`, `DelayStatusBadge.tsx`, `src/lib/recruiter-name.ts`
  from `design/specs/patterns.md` until S2a is green (covers AC1, AC3, half of AC4; Task #99).
  - Rules: `ui-build` §Rules 1–5 (tokens only, shadcn-first, no automatic-decision UI, accessibility);
    `prd-context` guardrail 7 (device-remembered name).
  - Verify: `npm test -- src/components/patterns/AiSuggestion.test.tsx src/components/patterns/DelayStatusBadge.test.tsx src/lib/recruiter-name.test.ts` → pass; `npm run typecheck`.
- [x] **S3a** `grok` — Write failing tests: `SourceQuote.test.tsx` (expand/collapse, `lang="zh-Hans"`
  on Chinese text, CSS truncation class present — never string slicing) and `TypedNameDialog.test.tsx`
  (opens on first render when no name is stored, rejects blank/whitespace submission, stores and
  reuses the name, "change name" reopens the dialog) (covers AC2, rest of AC4; Task #99).
  - Rules: `testing` §Test-first protocol; `ui-build` §Rules 3, 7 (`SourceQuote`, Chinese `lang` +
    CSS truncation) and §4 (`TypedNameDialog`).
  - Verify: `npm test -- src/components/patterns/SourceQuote.test.tsx src/components/patterns/TypedNameDialog.test.tsx` → fails because the components don't exist yet.
- [x] **S3b** `grok` — Add the shadcn `dialog` primitive, then implement `SourceQuote.tsx` and
  `TypedNameDialog.tsx` (using `src/lib/recruiter-name.ts` from S2b) until S3a is green (covers AC2,
  rest of AC4; Task #99).
  - Rules: `ui-build` §Rules 2–4, 7 (shadcn-first, `SourceQuote`/`TypedNameDialog` contracts, ZH
    handling); `prd-context` guardrail 7.
  - Verify: `npm test -- src/components/patterns/SourceQuote.test.tsx src/components/patterns/TypedNameDialog.test.tsx` → pass; `npm run typecheck`.
- [x] **S4** `grok` — Build `states.tsx` (`EmptyState`, `ErrorState`, loading skeletons) matching
  `design/specs/patterns.md`; no dedicated logic, so no test-first split (Task #99).
  - Rules: `ui-build` §Rules 1, 3, 5 (tokens, shared states, accessibility).
  - Verify: `npm run typecheck`; `npm run lint`.
- [x] **S5** `none` — Inspect the complete Story diff, run all verification until green, visually
  compare each component against `design/pattern.pen`/`design/specs/patterns.md`. Do not run
  `pr-review`. Close out docs when checks are green.

## Test plan

| AC | Test or manual evidence | Type / reason |
|---|---|---|
| AC1 | `src/components/patterns/AiSuggestion.test.tsx › AC1` | unit — label + score-variant requirement |
| AC2 | `src/components/patterns/SourceQuote.test.tsx › AC2` | unit — expand/collapse, `lang`, CSS truncation |
| AC3 | `src/components/patterns/DelayStatusBadge.test.tsx › AC3` | unit — wording, aria, no-status |
| AC4 | `src/lib/recruiter-name.test.ts › AC4` + `src/components/patterns/TypedNameDialog.test.tsx › AC4` | unit — validation, persistence, dialog behaviour |
| — (Task #99 "matches its frame") | manual — Claude visually compares each component against `design/specs/patterns.md` in S5 | manual; no screen exists yet to assert against in Playwright (Assumption A1) |

## Verification

```
npm run lint
npm run typecheck
npm test
npm run build        # app code changed
```

`npm run test:e2e`, `npm run test:db` and `npm run eval` do not apply — no screen wiring, no DB/schema
change, no AI prompt/parsing change in this Story.

## Risks & rollback

- **jsdom/testing-library are new to this repo.** Using a per-file `@vitest-environment jsdom`
  pragma keeps the existing node-environment unit tests unaffected; if that pragma doesn't resolve
  cleanly with the current Vitest version, fall back to a dedicated `vitest.jsdom.config.ts` scoped
  to `src/components/patterns/**` instead of changing the global config.
- **`AiSuggestion`'s score-requires-model-version-and-date rule is a typecheck-time guarantee.** If a
  discriminated-union prop type proves awkward to test at runtime, add a small runtime assertion too
  so the rule is provable both ways, and note it under Deviations.
- **Scope creep into screen wiring.** Keep every component receiving only the props it renders; no
  Supabase/data-fetching imports enter `src/components/patterns/`.
- **Rollback:** revert the Story's commits; no migration, no data, no external resource.

## Outcome

- **Shipped:** Five shared patterns — `AiSuggestion`, `SourceQuote`, `DelayStatusBadge`,
  `TypedNameDialog`, and `EmptyState`/`ErrorState`/loading skeletons — plus the
  `src/lib/recruiter-name.ts` device-persistence helper and the shadcn `dialog` primitive. Three of
  the five patterns (`AiSuggestion`, `DelayStatusBadge`, `SourceQuote`) also have working frames in
  `design/pattern.pen`; `TypedNameDialog` and the states pattern are fully specified in
  `design/specs/patterns.md` but not yet drawn in `.pen` (see Deviations/Follow-ups).
- **Changed files / areas:** `design/pattern.pen`, `design/specs/patterns.md`,
  `src/components/patterns/{AiSuggestion,DelayStatusBadge,SourceQuote,TypedNameDialog,states}.tsx`
  + their `.test.tsx` files, `src/lib/recruiter-name.ts` + its test, `src/components/ui/dialog.tsx`,
  `package.json`/`package-lock.json` (added `@testing-library/react`, `@testing-library/jest-dom`,
  `jsdom` as devDependencies).
- **Tests added or updated:** `AiSuggestion.test.tsx` (AC1), `DelayStatusBadge.test.tsx` (AC3),
  `recruiter-name.test.ts` (AC4 persistence), `SourceQuote.test.tsx` (AC2), `TypedNameDialog.test.tsx`
  (AC4 dialog behaviour) — 25 tests total, all test-first (failing commit, then a separate
  implementation commit). `states.tsx` has no dedicated test file: it has no branching logic per the
  plan's S4 rationale (verified by typecheck/lint and visual inspection instead).
- **Verification:** `npm run lint` → pass (1 pre-existing warning in `supabase/migration-lint.ts`,
  untouched by this Story). `npm run typecheck` → pass. `npm test` → 158/160 pass; the 2 failures are
  in `src/server/db.test.ts`, pre-existing and unrelated (local Node v20 vs the repo's required v22,
  a Supabase realtime-js WebSocket-constructor check — the file predates this branch, commit
  `041904c`). `npm run build` → pass, including the client-bundle secret-leak scan ("no leaks").
  `npm run test:e2e`/`test:db`/`eval` → not applicable (no screen wiring, no DB/schema or AI-prompt
  change).
- **Deviations:**
  - The pencil MCP tools initially failed with "a file needs to be open in the editor"; the user then
    opened `design/pattern.pen` (singular, not the `patterns.pen` originally planned) directly in
    pen.dev mid-session, and docs/spec were updated to the actual filename.
  - Partway through drawing frames, the pen.dev renderer in this session started returning blank
    screenshots and clipped bounds for newly created nodes (reproducible via `Get` bounds, not just a
    screenshot artifact) while previously-created frames kept rendering correctly. `AiSuggestion`,
    `DelayStatusBadge` and `SourceQuote` frames were built and screenshot-verified before this started;
    `TypedNameDialog` and the states pattern have correct underlying node data (verified via `Get`)
    but exhibit the clipping bug visually. `design/specs/patterns.md` — the actual contract Grok built
    from — is complete and correct for all five patterns regardless.
  - `npx shadcn@latest add dialog` failed inside the cursor-agent sandbox (network 403); Grok
    hand-authored `src/components/ui/dialog.tsx` to match the existing generated `sheet.tsx`. Claude
    re-ran the CLI directly afterward (network was reachable outside the sandbox) and overwrote it
    with the official registry version; `TypedNameDialog`'s tests still pass unchanged against it.
  - `AiSuggestion`'s SGT date formatting: `Intl.DateTimeFormat("en-SG", …)` renders "Sept" on this
    Node's ICU data; the implementation normalizes it to "Sep" to match the spec/tests.
- **Fix rounds / escalations:** None — every executor step passed its stated verification on the
  first attempt; no fix-loop rounds or model escalations were needed.
- **Models used:** Planning/orchestration: Claude (Sonnet 5, this session). Design (S1, frames +
  `design/specs/patterns.md`): Claude via the pencil MCP (this session). Implementation steps S2a,
  S2b, S3a, S3b, S4: `cursor-grok-4.6-high` (per `.claude/github-project.json` `executor.model`,
  resolved by `run-executor.sh grok`; exact per-call model identity not independently exposed by the
  `cursor-agent` CLI output beyond this configured id — treated as `cursor-grok-4.6-high` per the
  logged invocation, not "unknown", since the wrapper always passes this literal `--model` value).
  Direct fix: Claude re-ran `npx shadcn@latest add dialog` against the real registry (S3b deviation
  above); no code fix rounds were otherwise needed.
- **Claude direct fixes:** Re-generated `src/components/ui/dialog.tsx` from the official shadcn
  registry (replacing Grok's hand-authored fallback) after confirming the S3a tests still pass
  unchanged.
- **Follow-ups:**
  - Open `design/pattern.pen` in pen.dev and finish the `TypedNameDialog` and
    `EmptyState`/`ErrorState`/skeleton frames — the node data is present but needs a fresh session to
    resolve the renderer clipping bug and get clean screenshots.
  - No screen yet consumes these five patterns; the next Story in this area should wire them into a
    real screen and add Playwright coverage per Assumption A1/A4.
  - `src/server/db.test.ts`'s 2 pre-existing failures (Node v20 vs required v22) are unrelated to this
    Story but worth flagging separately — CI likely runs Node 22 per `package.json` `engines`, so this
    may only affect local runs on an older Node.
