# Plan — #45 The portal tells recruiters what the client left out

| | |
|---|---|
| Issue | https://github.com/dczii/URecruitment/issues/45 |
| Parent | Story #45 → Epic #6 |
| Milestone | MVP |
| Branch | `feat/45-gap-check-missing-fields` (stacked on `feat/44-jd-upload-prefill`, PR #222 still open) |
| Created | 2026-09-18 |
| Status | In progress |

## Problem

Nothing today tells a recruiter what's missing from a client's job request. This task implements the seven approved missing-field rules deterministically in code — no model call needed, since "is this field present" is a fact, not a judgment.

## PRD references

| PRD section | Item | Status |
|---|---|---|
| Job request gap check → Missing (approved) | salary range, location/work arrangement, employment type, headcount, start date, must-have skills, interview steps | decided |
| Job request gap check → requirement 1 | each flag shows why it matters + a suggested client question | proposed |
| AI pipeline → Gap check | code checks missing fields | suggested |

No open PRD items. No design needed (code only, no UI in this task — the gap-flag checklist UI is #46/#47, out of scope here).

## Scope

**In scope**
- `src/server/gap-check/missing-fields.ts` — one rule per approved field, each returning a flag (stable type, why-it-matters, client question) when the field is absent/blank, silent when present
- Flags are computed values (a pure function over a job version's `fields`) in this task — **not yet persisted** to `gap_flags`; persistence/wiring into the save path is implicitly part of #46/#47's scope per the Story's own task list (only #140 exists under #45) — see Assumptions

**Out of scope**
- Model-based uncertain/conflicting/fair-employment flags (#46)
- Resolving or dismissing flags (#47)
- Blocking matching — flags never block it (nothing in this task could block anything; it's a pure read)
- Extending the job form to actually collect salary/location/employment type/headcount/start date/interview steps (#43 didn't build these fields — see Assumptions)

## Acceptance criteria

- [ ] **AC1** — A saved job with no salary range raises a missing-salary flag with a client question. _Proved by:_ `missing-fields.test.ts › AC1: missing salary range raises a flag with a question`
- [ ] **AC2** — Every PRD missing-field rule raises exactly one flag when its field is absent. _Proved by:_ `missing-fields.test.ts` — one case per field (7 rules × absent case)
- [ ] **AC3** — A present field raises no missing flag. _Proved by:_ `missing-fields.test.ts` — one case per field (7 rules × present case), plus a whitespace-only case counted as absent

## Guardrails that apply

- [x] Fictional data only — test fixtures are fictional job data
- [x] Nothing here decides anything for the recruiter — flags are informational, never auto-resolving

## Assumptions

- **The job form (#43) doesn't yet collect salary/location/employment type/headcount/start date/interview steps** — only `title` and free-text `requirements` exist in `job_versions.fields` today. This task's rules are written against a documented, extensible `fields` shape (e.g. `fields.salary_range`, `fields.location`, etc.) that the form will need to grow into later — a real, acknowledged gap, not something this task can or should fix (out of scope per #140's own task body, which is code-only). Every job saved through today's form will legitimately show all 7 missing-field flags until the form is extended; that's correct behavior given the current data, not a bug.
- Flag **computation** (this task) is separate from flag **persistence**. #140's own scope says "Flags written against the job version" in its Done-when list, so this task both computes AND persists (insert into `gap_flags`, keyed to a job version id) — re-reading the task body confirms this, updating the plan below accordingly (see Scope).
- "Must-have skills" absent means: the job version's `must_haves` array (from #43's `jobVersionInputSchema`) is empty — there is no requirement marked must-have at all.
- Re-running the check for the same job version is idempotent in this task's own scope (computing the missing-field list is a pure function); whether re-running against an *already-flagged* version creates duplicate `gap_flags` rows is a persistence-layer question left to whoever wires this into the save path in a later Story — flagged as an open implementation note, not a blocker, since #45/#140 has no save-path integration task of its own.

## Open questions

- none (the persistence/idempotency question above is an implementation note, not a PRD-level open item)

## Approach

`missing-fields.ts` exports `checkMissingFields(jobVersion)` — a pure function iterating over the seven rules, each a small `{ field, isMissing(fields), flagType, whyItMatters, clientQuestion }` descriptor, returning zero or one flag object per rule. A thin persistence function `persistMissingFieldFlags(jobVersionId, flags)` inserts them into `gap_flags` (matching the existing table from #109: `flag_type`, `reason`, `suggested_question`, `resolution_state: 'open'`). Kept as two functions (compute vs. persist) so the pure logic is trivially unit-testable without touching the DB.

## Skills in scope

- `prd-context` — Job request gap check §Missing fields
- `testing` — test-first for logic
- `supabase-db` — `gap_flags` insert, existing RLS from #109

## Files

| File | Change |
|---|---|
| `src/server/gap-check/missing-fields.ts` + `.test.ts` | new — seven rules + persistence |

## Dependencies

- #136 (this session's own predecessor work, `job_versions`/`saveJobVersion`, in the PR stack)
- #109 (closed) — `gap_flags` table

## Steps

- [ ] **T1a** `grok` — Failing tests first in `missing-fields.test.ts`: for each of the 7 approved fields, a case where it's absent (flag raised, correct type/reason/question) and a case where it's present (no flag); a whitespace-only value counts as absent (at least one field tested this way, e.g. salary range as `"   "`); exactly one flag per rule (no duplicate flags from one missing field).
  - Verify: `npm test -- missing-fields` → fails (module missing)
- [ ] **T1b** `grok` — Implement `missing-fields.ts` (`checkMissingFields`, `persistMissingFieldFlags`) until T1a passes.
  - Verify: `npm test -- missing-fields` → pass; `npm run typecheck`
- [ ] **S2** `none` — Full verification, close out docs. Do not run `pr-review`.

## Test plan

| AC | Test | Type |
|---|---|---|
| AC1 | `missing-fields.test.ts › AC1` | unit |
| AC2 | `missing-fields.test.ts` — 7 absent cases | unit |
| AC3 | `missing-fields.test.ts` — 7 present cases + whitespace case | unit |

## Verification

```
npm run lint
npm run typecheck
npm test -- missing-fields
```
(`npm run test:db` named in the issue's own verification block is not applicable — this task has no DB-integration test; the `gap_flags` insert is covered by mocked unit tests, matching every other `getDb()`-using module in this codebase so far.)

## UX / design

n/a — code only, no UI in this task.

## Data / API changes

None — reuses the existing `gap_flags` table from #109.

## Risks & rollback

Depends on unmerged PR chain (#213→#222). Net-new module; rollback is deleting the file.

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
