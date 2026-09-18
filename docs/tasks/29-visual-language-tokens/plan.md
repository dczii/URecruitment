# Plan — #29 The portal has one visual language defined as tokens

Spec: [spec.md](./spec.md) · Branch: `design/29-visual-language-tokens` · Created: 2026-09-18

## Approach

Define the visual language once as semantic pen.dev variables, then mirror it in Markdown before
touching app code. The implementation uses Tailwind v4's CSS-first `@theme inline` bridge so
shadcn variables remain the runtime source and component utilities remain semantic. Contract tests
parse the Markdown and CSS to prevent the two representations drifting, while a local ESLint rule
guards component literals and Playwright proves the CJK font on rendered text. A JavaScript
Tailwind config and a new lint dependency were rejected because the installed stack already
supports CSS-first theming and ESLint's local-plugin API.

## Skills in scope

<!--
Inventory all repository-local skill descriptions before planning. List every matching skill
and why it applies. Re-run discovery and update this list if the file or subsystem scope expands.
Each step below says which selected skills it must obey.
-->

- `prd-context` — supplies the decided pen.dev workflow and proposed token, Chinese-font and
  non-colour status rules without settling any PRD open item.
- `testing` — maps every acceptance criterion to a design review, unit/contract test, E2E test or
  command and prohibits weakened or networked tests.
- `github-workflow` — governs the Story branch, per-Task commits, issue readiness, PR linkage and
  Project 4 statuses.
- `ui-design` — governs `.pen` access, semantic token minimums, contrast thresholds, Noto Sans SC
  and the readable Markdown mirror; the pen.dev step stays with Claude.
- `ui-build` — requires tokens-only components, the installed Tailwind major, accessible contrast,
  Chinese language/font handling and desktop/phone Playwright coverage.
- `nextjs-app` — requires checking Next 16.3.5's shipped API/types and using Server Components by
  default; applies to root font loading and home-page rendering.
- `emil-design-eng` — informs restrained professional defaults and cohesive type/space/radius
  choices; no animation work is introduced.

## Files

| File | Change |
|---|---|
| `design/tokens.pen` | new — encrypted pen.dev variable source and visual reference board |
| `design/tokens.md` | new — readable token, mapping and contrast contract |
| `src/app/theme-contract.test.ts` | new — verifies the Markdown/CSS token mapping |
| `test/eslint-config.test.ts` | new — proves forbidden component literals fail lint |
| `eslint.config.mjs` | modify — local design-token guard scoped to `src/components` |
| `src/app/globals.css` | modify — Tailwind v4 and shadcn semantic variable mappings |
| `src/app/layout.tsx` | modify — self-host Geist and Noto Sans SC through Next font |
| `src/app/page.tsx` | modify — semantic scaffold styles and stable Chinese font sample |
| `e2e/smoke.spec.ts` | modify — rendered CJK font/language assertion |
| `docs/tasks/29-visual-language-tokens/spec.md` | new — Story contract |
| `docs/tasks/29-visual-language-tokens/plan.md` | new — execution and evidence |

## Dependencies

<!-- New npm packages (name@range, why), env vars, migrations. "none" if none. -->

- none

## Steps

<!--
One step = one executor call. Executor tag: grok (default) | gpt (GPT-5.6 Sol; state why) | claude (pen.dev design, or the selected executor failed twice) | none (verification only).
Logic is test-first: (a) failing tests, then (b) implementation.
Mark `parallel-safe` only when files don't overlap with any other step.
-->

- [x] **S1** `claude` — Create `design/tokens.pen` and `design/tokens.md` with semantic colour,
  typography, spacing, radius and shadow groups, their app mappings, and measured contrast (covers
  AC1–AC3; Task #94).
  - Rules: `ui-design` §Tooling, §Starting point and §Output; `prd-context` guardrails;
    `docs/plans/accessibility-standard.md` D2, E1 and E3; `emil-design-eng` cohesive defaults.
  - Verify: pen.dev validation; inspect all required groups and the Markdown contrast table.
- [x] **S2a** `grok` — Add failing contract tests in `src/app/theme-contract.test.ts`,
  `test/eslint-config.test.ts` and `e2e/smoke.spec.ts` for token mapping, forbidden component literals
  and rendered Noto Sans SC (covers AC4–AC6; Task #95).
  - Rules: `testing` no network/no weakened tests; `ui-build` tokens-only and Chinese-text rules;
    `nextjs-app` shipped Next 16 APIs.
  - Verify: `npm test -- src/app/theme-contract.test.ts test/eslint-config.test.ts` fails because the
    token mappings/guard do not exist; the E2E assertion is added but runs after implementation.
- [x] **S2b** `grok` — Map the design tokens in `src/app/globals.css`, load Noto Sans SC in
  `src/app/layout.tsx`, add the stable Chinese sample in `src/app/page.tsx`, and implement the local
  ESLint rule in `eslint.config.mjs` until S2a is green (covers AC4–AC7; Task #95).
  - Rules: `ui-build` tokens only and Tailwind-major rules; `nextjs-app` Next 16 font/API rules;
    `testing` preserve assertions and fixtures.
  - Verify: `npm test -- src/app/theme-contract.test.ts test/eslint-config.test.ts`; `npm run lint`;
    `npm run typecheck`; `npm run build`; `npm run test:e2e`.
- [x] **S3** `none` — Inspect the complete Story diff, run all applicable verification, visually
  check the scaffold at desktop and phone width, and run `pr-review`.

## Test plan

Every acceptance criterion must name an automated test, or state why automation is not appropriate and name the manual evidence.

| AC | Test or manual evidence | Type / reason |
|---|---|---|
| AC1 | pen.dev validation + `src/app/theme-contract.test.ts › AC1` | design validation + contract |
| AC2 | contrast table in `design/tokens.md` + pen.dev review | design-only values; measured evidence |
| AC3 | pen.dev validation + `design/tokens.md` status usage | design review; non-colour cues specified |
| AC4 | `src/app/theme-contract.test.ts › AC4` | unit/contract |
| AC5 | `e2e/smoke.spec.ts › AC5` | E2E in desktop and phone projects |
| AC6 | `test/eslint-config.test.ts › AC6` | unit/integration of ESLint config |
| AC7 | `test/eslint-config.test.ts` + lint/build commands | integration/build |

## Verification

```
npm run lint
npm run typecheck
npm test
npm run build        # if app code changed
npm run test:e2e     # if a screen changed
```

## Risks & rollback

- **Font build/network risk:** `next/font/google` resolves font CSS during build. The existing app
  already uses this mechanism; Noto is configured without preload because Next exposes no Chinese
  subset option.
- **Mapping drift:** the contract test compares the readable source with CSS mappings.
- **Over-broad linting:** the guard is scoped to `src/components` and only catches hex literals and
  pixel font-size utilities/declarations.
- **Rollback:** revert the two Task commits; there is no data migration or external state.

## Outcome

- **Shipped:** A 58-variable light/dark semantic token system in pen.dev and Markdown; Tailwind v4
  and shadcn mappings; self-hosted Noto Sans SC in the app font stack; a component-literal ESLint
  guard; and contract/E2E coverage.
- **Changed files / areas:** `design/tokens.pen`, `design/tokens.md`, app theme/layout/scaffold,
  ESLint configuration, contract tests and the existing Playwright smoke suite.
- **Tests added or updated:** `src/app/theme-contract.test.ts` checks required groups and all 58
  mappings; `test/eslint-config.test.ts` proves hex/pixel violations and semantic-token success;
  `e2e/smoke.spec.ts` proves rendered Simplified Chinese uses Noto Sans SC in both projects.
- **Verification:**
  - pen.dev variables, layout-problem scan and screenshot → pass (58 variables; no remaining
    clipping or placeholder warnings).
  - failing-test gate → fail as expected: AC4 reported missing theme variables and AC6 reported the
    absent lint rule.
  - `npm run lint` → pass with one pre-existing warning in `supabase/migration-lint.ts`.
  - `npm run typecheck` → pass.
  - `npm test` → pass (13 files, 95 tests).
  - `npm run build` → pass; client-bundle check reported no leaks.
  - `npm run test:e2e` → pass (10 tests across desktop and phone).
  - IDE diagnostics on all edited app/test/config files → no errors.
  - Browser visual review → pass: 24 px tokenized heading, neutral surface, readable CJK text,
    Noto Sans SC in the computed stack and no overflow.
- **Deviations:** The ESLint test moved from repository root to `test/eslint-config.test.ts` because
  `vitest.config.ts` intentionally discovers `test/**/*.test.ts`, not root tests. Implementation
  was completed directly after two `cursor-agent` attempts stalled without a report. The branch was
  rebased onto `origin/main` after review found a concurrent #28 docs commit in its ancestry.
- **Fix rounds / escalations:** Two S2a attempts with the default executor stalled and were stopped;
  no model escalation was used. Direct implementation and one direct test-cleanup round followed.
- **Models used:**
  - Planning/orchestration, pen.dev design, direct test cleanup, implementation and review:
    GPT-5.6 Sol (runtime did not expose the exact model ID).
  - S2a attempt 1: `cursor-grok-4.6-high` — stalled; no retained code identified.
  - S2a attempt 2: `cursor-grok-4.6-high` — stalled; the retained Playwright AC5 addition was
    inspected and kept.
- **Claude direct fixes:** none; this runtime is GPT-5.6 Sol. It performed the direct fallback after
  the executor stalled twice.
- **Review findings:** All resolved. A root-level Vitest file would not run and was moved under
  `test/`; the branch included unrelated #28 ancestry and was rebased cleanly; the pen.dev shadow
  sample clipped at the board edge and was inset.
- **Follow-ups:** none.
