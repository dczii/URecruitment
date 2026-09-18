# Plan — #{{ISSUE}} {{TITLE}}

| | |
|---|---|
| Issue | https://github.com/{{REPO}}/issues/{{ISSUE}} |
| Parent | Story #… → Epic #… |
| Milestone | MVP |
| Branch | `{{BRANCH}}` |
| Created | {{DATE}} |
| Status | Planned <!-- Planned → In progress → In review --> |

## Problem

<!-- One paragraph: who is blocked or what is missing, in recruiter terms. -->

## PRD references

| PRD section | Item | Status |
|---|---|---|
| <!-- e.g. Job matching → Requirements #3 --> | <!-- Missing must-have caps the score --> | decided / proposed / open |

## Scope

**In scope**
- 

**Out of scope**
- 

## Acceptance criteria

<!-- Given/When/Then. Each one is testable and maps to a named test below. -->

- [ ] **AC1** — Given …, when …, then …. _Proved by:_ `…test.ts › …`
- [ ] **AC2** — 

## Guardrails that apply

<!-- Tick only what applies and say why. Leave the rest unticked. -->

- [ ] AI only suggests: no auto reject/advance/shortlist/contact
- [ ] No email sent
- [ ] Server-only data access; secret key never reaches the browser
- [ ] RLS on new tables, no public policies; private Storage + signed URLs
- [ ] AI output schema-validated, logged to `ai_runs`, shows source text
- [ ] Protected attributes ignored; nationality/language only with a written reason
- [ ] UTC stored, SGT shown; SG working days
- [ ] Typed recruiter name recorded on stage/settings changes
- [ ] Works at phone width; status not colour-only; Chinese text renders
- [ ] Fictional data only; no secrets or sample-data Blob URLs committed
- [ ] Free-tier limits respected (no frequent cron, file ≤ 50 MB)

## Assumptions

<!-- Every judgment call made without asking. Reversible defaults only. -->

- 

## Open questions

- none

## Approach

<!-- 3–6 sentences: the design, why this way, and alternatives rejected. -->

## Skills in scope

<!--
Match against the routing table + skill frontmatter. List every matching skill and why.
Re-run discovery only if file/subsystem scope expands. Do not paste whole skills here.
-->

- `prd-context` — required for every task; …
- `testing` — required for every task; …
- `…` — matches … files / subsystem / acceptance criterion

## Files

| File | Change |
|---|---|
| `…` | new / modify / delete — reason |

## Dependencies

- none

## Steps

<!--
One step = one executor call. Tag: grok (default) | gpt | grok-low (mechanical) | claude | none.
Prefer fewer, larger steps over many tiny ones unless files must stay sequential (tests then impl).
Logic is test-first: (a) failing tests, then (b) implementation.
Mark `parallel-safe` when files don't overlap.
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

## UX / design

<!-- Link design/*.pen or "n/a". -->

## Data / API changes

<!-- Tables, columns, views, migrations, server actions. "none" if none. -->

## Risks & rollback

## Outcome

<!-- Filled after execution. -->

- **Shipped:** 
- **Changed files / areas:**
- **Tests added or updated:**
- **Verification:**
- **Deviations:** 
- **Fix rounds / escalations:** 
- **Models used:**
- **Claude direct fixes:** 
- **Follow-ups:** 
