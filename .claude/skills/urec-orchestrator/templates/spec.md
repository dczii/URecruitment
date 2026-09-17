# Spec — #{{ISSUE}} {{TITLE}}

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

<!-- Given/When/Then. Each one is testable and maps to a named test in plan.md. -->

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
- [ ] Fictional data only; no secrets or Drive IDs committed
- [ ] Free-tier limits respected (no frequent cron, file ≤ 50 MB)

## UX / design

<!-- Link the design/*.pen frame or "n/a". List states: empty, loading, error, overdue, etc. -->

## Data / API changes

<!-- Tables, columns, views, migrations, server actions, route handlers. "none" if none. -->

## Assumptions

<!-- Every judgment call made without asking. Reversible defaults only. -->

- 

## Open questions

<!-- Items the PRD marks open, or anything needing a product decision. "none" if none. -->

- none
