# Plan — #{{ISSUE}} {{TITLE}}

Spec: [spec.md](./spec.md) · Branch: `{{BRANCH}}` · Created: {{DATE}}

## Approach

<!-- 3–6 sentences: the design, why this way, and alternatives rejected. -->

## Skills in scope

<!--
Inventory all repository-local skill descriptions before planning. List every matching skill
and why it applies. Re-run discovery and update this list if the file or subsystem scope expands.
Each step below says which selected skills it must obey.
-->

- `prd-context` — required for every task; …
- `testing` — required for every task; …
- `…` — matches … files / subsystem / acceptance criterion

## Files

| File | Change |
|---|---|
| `…` | new / modify / delete — reason |

## Dependencies

<!-- New npm packages (name@range, why), env vars, migrations. "none" if none. -->

- none

## Steps

<!--
One step = one executor call. Executor tag: grok (default) | gpt (GPT-5.6 Sol; state why) | claude (pen.dev design, or the selected executor failed twice) | none (verification only).
Logic is test-first: (a) failing tests, then (b) implementation.
Mark `parallel-safe` only when files don't overlap with any other step.
-->

- [ ] **S1a** `grok` — Write failing tests for … in `…test.ts` (covers AC1, AC2).
  - Rules: `testing` §…, `prd-context` §…
  - Verify: `npm test -- …` → fails because …
- [ ] **S1b** `grok` — Implement … in `…` until S1a passes.
  - Rules: …
  - Verify: `npm test -- …` → pass; `npm run typecheck`
- [ ] **S2** `gpt` — Implement … where GPT-5.6 is the better fit because ….
- [ ] **S3** `claude` — Design … in `design/….pen` (if needed).
- [ ] **S4** `none` — Full verification until green, then close out docs. Do not run `pr-review`.

## Test plan

Every acceptance criterion must name an automated test, or state why automation is not appropriate and name the manual evidence.

| AC | Test or manual evidence | Type / reason |
|---|---|---|
| AC1 | `…test.ts › …` | unit / integration / e2e / eval |
| AC2 | none — inspect rendered docs links | docs-only; manual verification |

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
- **Changed files / areas:**
- **Tests added or updated:** <!-- Name files and covered behaviours, or "none — <concrete reason>". -->
- **Verification:** <!-- Each command and pass/fail. -->
- **Deviations:** 
- **Fix rounds / escalations:** 
- **Models used:** <!-- Role + step/round + exact model ID. Use "unknown (runtime did not expose it)" when necessary; never guess. -->
- **Claude direct fixes:** 
- **Follow-ups:** 
