# Plan — #{{ISSUE}} {{TITLE}}

Spec: [spec.md](./spec.md) · Branch: `{{BRANCH}}` · Created: {{DATE}}

## Approach

<!-- 3–6 sentences: the design, why this way, and alternatives rejected. -->

## Skills in scope

<!-- The skills whose rules bind this task. Each step below says which of them it must obey. -->

- `prd-context`
- `testing`

## Files

| File | Change |
|---|---|
| `…` | new / modify / delete — reason |

## Dependencies

<!-- New npm packages (name@range, why), env vars, migrations. "none" if none. -->

- none

## Steps

<!--
One step = one executor call. Executor tag: grok (default) | claude (pen.dev design, or Grok failed twice) | none (verification only).
Logic is test-first: (a) failing tests, then (b) implementation.
Mark `parallel-safe` only when files don't overlap with any other step.
-->

- [ ] **S1a** `grok` — Write failing tests for … in `…test.ts` (covers AC1, AC2).
  - Rules: `testing` §…, `prd-context` §…
  - Verify: `npm test -- …` → fails because …
- [ ] **S1b** `grok` — Implement … in `…` until S1a passes.
  - Rules: …
  - Verify: `npm test -- …` → pass; `npm run typecheck`
- [ ] **S2** `claude` — Design … in `design/….pen` (if needed).
- [ ] **S3** `none` — Full verification.

## Test plan

| AC | Test | Type |
|---|---|---|
| AC1 | `…test.ts › …` | unit / integration / e2e / eval |

## Verification

```
npm run lint
npm run typecheck
npm test
npm run build        # if app code changed
npm run test:e2e     # if a screen changed
npm run eval         # if AI parsing/matching changed
```

## Risks & rollback

<!-- What could break, and how to undo it (revert commit, down migration, re-seed). -->

## Outcome

<!-- Filled after execution. -->

- **Shipped:** 
- **Deviations:** 
- **Fix rounds / escalations:** 
- **Executor model(s):** 
- **Claude direct fixes:** 
- **Review findings:** 
- **Follow-ups:** 
