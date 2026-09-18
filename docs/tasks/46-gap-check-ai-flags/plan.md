# Plan — #46 Uncertain, conflicting and unfair requirements are flagged

| | |
|---|---|
| Issue | https://github.com/dczii/URecruitment/issues/46 |
| Parent | Story #46 → Epic #6 |
| Milestone | MVP |
| Branch | `feat/46-gap-check-ai-flags` (stacked on `feat/45-gap-check-missing-fields`, PR #223 still open) |
| Created | 2026-09-19 |
| Status | In progress |

## Problem

The missing-field rules (#45) catch absent fields, but not vague wording ("competitive salary"), contradictions between an uploaded JD and the form, or requirements that breach Singapore's fair-employment guidelines. This Story adds the one model call that finds those three flag types, verifies every quote is verbatim, and wires the whole gap check (code rules + model flags) into the job save path.

## PRD references

| PRD section | Item | Status |
|---|---|---|
| Job request gap check → Uncertain/Conflicting/Fair employment | proposed |
| Job request gap check → requirement 1 | why it matters + client question | proposed |
| AI pipeline → Gap check | one model call for uncertain/conflicting/fair-employment | suggested |
| Fair employment | TAFEP guidelines (age, gender, race, religion); Workplace Fairness Act (end-2027, adds pregnancy/caregiving/disability/mental health) | noted |

No open PRD items. No design work needed — despite the Story issue saying "Design needed: Yes," neither task (#141, #142) touches UI; the gap-flag checklist screen is explicitly Story #47's own scope (per #137's out-of-scope note), not this Story's.

## Scope

**In scope**
- `src/server/ai/prompts/gap-check/{v1,index}.ts` — schema (3 flag types: uncertain, conflicting, fair-employment) + prompt + EN/ZH fictional examples, mirroring `parse-cv`/`extract-jd`'s structure
- `src/server/gap-check/run.ts` — the actual save-path gap check: runs the missing-field code rules (#45) + the model call, verifies every AI-flagged quote is verbatim in its source, persists all flags against the job version, logs the model run to `ai_runs`, and is called from `createJob`'s save path (closing the follow-up flagged in #45's plan)
- Wiring into `src/app/jobs/actions.ts`'s existing `createJob` action

**Out of scope**
- The gap-flag checklist UI (#47 / E05-S05-T02)
- Resolving or dismissing flags (#47 / E05-S05-T01)
- Blocking matching — flags never block anything
- Adding Workplace Fairness Act attributes (pregnancy, caregiving, disability, mental health) as flagged signals — explicitly noted as a future extension in #141's own scope, not added here

## Acceptance criteria

- [ ] **AC1** — "Competitive salary" raises an uncertain flag quoting that text with a client question. _Proved by:_ `run.test.ts › AC1: vague salary wording raises an uncertain flag with the quote and a question`
- [ ] **AC2** — A JD/form contradiction on salary or location raises a conflicting flag quoting both sources. _Proved by:_ `run.test.ts › AC2: JD/form contradiction raises a conflicting flag quoting both sources`
- [ ] **AC3** — A requirement preferring age/gender/race/religion raises a fair-employment flag explaining why it's a problem in Singapore. _Proved by:_ `run.test.ts › AC3: an age/gender/race/religion preference raises a fair-employment flag`
- [ ] **AC4** — Every flag quotes its source text and is labelled a suggestion. _Proved by:_ AC1-3's own assertions (each checks the quote field is present and verbatim) — this is a property of every flag, not a separate rule

## Guardrails that apply

- [x] AI only suggests — gap flags never auto-resolve, never block matching, nothing recommends rejecting a candidate or contacting a client (prompt rule)
- [x] AI output schema-validated, logged to `ai_runs`, shows source text — this Story's core purpose
- [x] Protected attributes ignored in scoring — this Story's whole purpose is *flagging* protected-attribute preferences in job requests, which is the opposite of using them; the prompt never proposes adding a protected attribute as a scoring signal
- [x] Server-only data access
- [x] Fictional data only — prompt examples are fictional

## Assumptions

- The gap-check model call needs both the job form's fields AND the uploaded JD's raw text (for the conflicting-flag case) — `run.ts` accepts both, with JD text optional (a job created without an uploaded JD simply can't produce conflicting flags, which is correct: nothing to conflict with).
- "A flag whose quote is not in the source is dropped and reported" (per #142's own scope) means: an individual unverifiable flag is filtered out of the persisted set, not that the whole gap check fails — this matches `parse-cv`'s evidence-verification pattern but applied per-flag rather than to the whole response, since gap-check naturally returns a list of independent flags.
- "The same job saved twice does not duplicate flags" (per #142's own scope) is implemented by clearing/superseding the previous *open* gap-check-sourced flags for that job version before inserting the new set on each save — resolved/dismissed flags (a later Story's concern) are left untouched since they don't exist yet in this codebase.
- The job save must succeed even if the gap check fails entirely (model error, etc.) — per #142's Done-when list ("The job save still succeeds when the gap check fails, with the failure recorded"). `run.ts`'s caller in `actions.ts` never lets a gap-check failure block or roll back the job/version write.

## Open questions

- none

## Approach

`gap-check/v1.ts` (written directly, executor tag `claude`) is structurally parallel to `parse-cv`/`extract-jd`: shared rules, EN + Simplified Chinese fictional examples, verbatim-evidence requirement, and an explicit instruction never to propose rejecting a candidate or contacting a client. `run.ts` orchestrates: call `checkMissingFields` (#45, already built) for the deterministic flags, call `runAi` once with the gap-check prompt for the model-based flags, filter out any flag whose quote isn't verbatim in its source, clear previous open AI-sourced flags for the job version, and persist the combined set. It's called from `createJob`'s existing save path, wrapped so a gap-check failure never blocks the save itself — only degrades to "gap check didn't run this time," recorded via the normal `ai_runs` failure-logging path.

## Skills in scope

- `prd-context` — Job request gap check; Fair employment
- `ai-prompts` — schema/prompt structure, shared rules, versioning
- `ai-pipeline` — `runAi` usage, evidence verification, `ai_runs` logging
- `compliance-review` — TAFEP attributes, Workplace Fairness Act noted-not-added, AI-only-suggests
- `supabase-db` — `gap_flags` persistence, existing RLS from #109
- `nextjs-app` — wiring into the existing `createJob` Server Action
- `testing` — test-first with a fake model

## Files

| File | Change |
|---|---|
| `src/server/ai/prompts/gap-check/{v1,index}.ts` | new — schema, prompt, EN+ZH examples |
| `src/server/gap-check/run.ts` + `.test.ts` | new — orchestrates code rules + model call, evidence verification, persistence, `ai_runs` logging |
| `src/app/jobs/actions.ts` | modify — call `runGapCheck` after a successful job/version save, non-blocking |

## Dependencies

- #140 (#45, this session's own predecessor, PR #223 still open) — `checkMissingFields`
- #169 (`runAi`, PR #213, still open)

## Steps

- [ ] **T1** `claude` — Write `src/server/ai/prompts/gap-check/v1.ts` + `index.ts`: schema with 3 flag types (`uncertain`, `conflicting`, `fair-employment`), each requiring verbatim `source_text` (conflicting requires two: `form_source_text` + `jd_source_text`), prompt with shared rules + the "never proposes rejecting/contacting" rule + the TAFEP-grounded fair-employment guidance + an explicit note that Workplace Fairness Act attributes are out of scope until compliance review decides otherwise, EN + Simplified Chinese fictional examples.
  - Rules: `ai-prompts`; `compliance-review` — TAFEP attributes only, WFA noted not added
  - Verify: `npm run typecheck`
- [ ] **T2a** `grok` — Failing tests first in `run.test.ts` (fake model + in-memory writer/db mocks): AC1 (vague salary → uncertain flag), AC2 (JD/form contradiction → conflicting flag with both quotes), AC3 (protected-attribute preference → fair-employment flag), an invented/unverifiable quote is dropped (not the whole response), a schema-invalid model response raises zero AI-sourced flags (missing-field flags from #45 still run independently), saving the same job twice doesn't duplicate AI-sourced flags, a gap-check model failure doesn't prevent the test's simulated "job save" from completing, every run writes one `ai_runs` row with cost/duration.
  - Verify: `npm test -- gap-check/run` → fails (module missing)
- [ ] **T2b** `grok` — Implement `run.ts` until T2a passes; wire into `src/app/jobs/actions.ts`'s `createJob`.
  - Verify: `npm test -- gap-check/run` → pass; `npm run typecheck`
- [ ] **S3** `none` — Full verification, close out docs. Do not run `pr-review`.

## Test plan

| AC | Test | Type |
|---|---|---|
| AC1 | `run.test.ts › AC1` | unit, fake model |
| AC2 | `run.test.ts › AC2` | unit, fake model |
| AC3 | `run.test.ts › AC3` | unit, fake model |
| AC4 | covered by AC1-3's own assertions | unit |

## Verification

```
npm run lint
npm run typecheck
npm test -- gap-check
```

## UX / design

n/a — no UI in this task (see Problem/Scope note on the Story issue's "Design needed: Yes").

## Data / API changes

None — reuses `gap_flags` (#109) and `ai_runs`.

## Risks & rollback

Depends on unmerged PR chain (#213→#223). Net-new modules + one modified action; rollback is reverting.

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
