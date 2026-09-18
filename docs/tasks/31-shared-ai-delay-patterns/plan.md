# Plan — #31 [Story] Shared patterns make AI results and delays unambiguous

Spec: [spec.md](./spec.md) · Branch: `feat/31-shared-ai-delay-patterns` · Created: 2026-09-18

## Approach

Design all five patterns as one `design/patterns.pen` file with a readable `design/specs/patterns.md`
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
- `ui-design` — governs `design/patterns.pen` (pencil MCP only, semantic tokens, desktop+phone
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
| `design/patterns.pen` | new — five pattern frames at desktop + phone width, all states |
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

- [ ] **S1** `claude` — Create `design/patterns.pen` and `design/specs/patterns.md`: `AiSuggestion`
  (value + score variant with model version/date), `SourceQuote` (collapsed/expanded, EN + ZH),
  `DelayStatusBadge` (on-track/due-soon/overdue/no-status, greyscale-legible), `TypedNameDialog`
  (first use, remembered, change), `EmptyState`/`ErrorState`/loading skeleton — desktop + phone frames
  for each (covers AC1–AC4; Task #98).
  - Rules: `ui-design` §Tooling (pencil MCP only, never Read/Grep `.pen`), §Frames (1440/390, every
    state), §PRD design rules 1–3/5 (suggestion label, source quote, ZH Noto Sans SC, name prompt);
    `prd-context` guardrail 7 (device-remembered name, no sign-in); `compliance-review` §A (AI only
    suggests, source text shown).
  - Verify: pen.dev validation of `design/patterns.pen`; greyscale check of the delay badge frame;
    confirm `design/specs/patterns.md` lists every pattern's props/states so Grok can build without
    opening the `.pen` file.
- [ ] **S2a** `grok` — Add devDependencies (`@testing-library/react`, `@testing-library/jest-dom`,
  `jsdom`) and write failing tests: `AiSuggestion.test.tsx` (label always shown; score variant fails
  typecheck without model version+date — assert via a `// @ts-expect-error` case plus a runtime
  render assertion), `DelayStatusBadge.test.tsx` (wording + `aria-label` per status; end states/Placed
  render no status), `src/lib/recruiter-name.test.ts` (rejects blank/whitespace, persists and reads
  back a name) (covers AC1, AC3, half of AC4; Task #99).
  - Rules: `testing` §Test-first protocol, "typed-name validation" in the always-test-first list, no
    network, use `// @vitest-environment jsdom` per file; `ui-build` §Tests (aria/badge text, name
    persistence).
  - Verify: `npm test -- src/components/patterns/AiSuggestion.test.tsx src/components/patterns/DelayStatusBadge.test.tsx src/lib/recruiter-name.test.ts` → fails because the modules don't exist yet, not because of import/config errors.
- [ ] **S2b** `grok` — Implement `AiSuggestion.tsx`, `DelayStatusBadge.tsx`, `src/lib/recruiter-name.ts`
  from `design/specs/patterns.md` until S2a is green (covers AC1, AC3, half of AC4; Task #99).
  - Rules: `ui-build` §Rules 1–5 (tokens only, shadcn-first, no automatic-decision UI, accessibility);
    `prd-context` guardrail 7 (device-remembered name).
  - Verify: `npm test -- src/components/patterns/AiSuggestion.test.tsx src/components/patterns/DelayStatusBadge.test.tsx src/lib/recruiter-name.test.ts` → pass; `npm run typecheck`.
- [ ] **S3a** `grok` — Write failing tests: `SourceQuote.test.tsx` (expand/collapse, `lang="zh-Hans"`
  on Chinese text, CSS truncation class present — never string slicing) and `TypedNameDialog.test.tsx`
  (opens on first render when no name is stored, rejects blank/whitespace submission, stores and
  reuses the name, "change name" reopens the dialog) (covers AC2, rest of AC4; Task #99).
  - Rules: `testing` §Test-first protocol; `ui-build` §Rules 3, 7 (`SourceQuote`, Chinese `lang` +
    CSS truncation) and §4 (`TypedNameDialog`).
  - Verify: `npm test -- src/components/patterns/SourceQuote.test.tsx src/components/patterns/TypedNameDialog.test.tsx` → fails because the components don't exist yet.
- [ ] **S3b** `grok` — Add the shadcn `dialog` primitive, then implement `SourceQuote.tsx` and
  `TypedNameDialog.tsx` (using `src/lib/recruiter-name.ts` from S2b) until S3a is green (covers AC2,
  rest of AC4; Task #99).
  - Rules: `ui-build` §Rules 2–4, 7 (shadcn-first, `SourceQuote`/`TypedNameDialog` contracts, ZH
    handling); `prd-context` guardrail 7.
  - Verify: `npm test -- src/components/patterns/SourceQuote.test.tsx src/components/patterns/TypedNameDialog.test.tsx` → pass; `npm run typecheck`.
- [ ] **S4** `grok` — Build `states.tsx` (`EmptyState`, `ErrorState`, loading skeletons) matching
  `design/specs/patterns.md`; no dedicated logic, so no test-first split (Task #99).
  - Rules: `ui-build` §Rules 1, 3, 5 (tokens, shared states, accessibility).
  - Verify: `npm run typecheck`; `npm run lint`.
- [ ] **S5** `none` — Inspect the complete Story diff, run all verification until green, visually
  compare each component against `design/patterns.pen`/`design/specs/patterns.md`. Do not run
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

<!-- Filled after execution. -->

- **Shipped:** 
- **Changed files / areas:**
- **Tests added or updated:** <!-- Name files and covered behaviours, or "none — <concrete reason>". -->
- **Verification:** <!-- Each command and pass/fail. -->
- **Deviations:** 
- **Fix rounds / escalations:** 
- **Models used:** <!-- Role + step/round + exact model ID. Use "unknown (runtime did not expose it)" when necessary; never guess. -->
- **Claude direct fixes:** 
- **Follow-ups:** 
