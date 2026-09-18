# Plan — #41 Recruiters correct parsed fields and their edits survive re-processing (merge rule only)

| | |
|---|---|
| Issue | https://github.com/dczii/URecruitment/issues/41 |
| Parent | Story #41 → Epic #5 |
| Milestone | MVP |
| Branch | `feat/41-cv-override-merge` (stacked on `feat/40-cv-review-queue-backend`, PR #216 still open) |
| Created | 2026-09-18 |
| Status | In progress |

## Problem

A recruiter's correction to a parsed field must survive the next re-parse. Task #132 builds the merge rule (recruiter value always wins) and override storage. **Task #133 (the edit UI) cannot be built yet** — it depends on #134 (Story #42's own task, the base candidate-profile screen), which doesn't exist. This is not a PRD open item — it's a plain cross-story build-order dependency the PRD/backlog's Story numbering didn't anticipate.

## PRD references

| PRD section | Item | Status |
|---|---|---|
| CV processing → requirement 1 | recruiters can edit any parsed field; edits kept after re-parse | proposed |
| Data model → candidate_profiles | recruiter edits stored separately so re-parsing never overwrites them | suggested |
| Users → typed name | actions are tied to a typed name | decided |

No open PRD items. No design work in this task (that's #133, deferred).

## Scope

**In scope**
- `src/server/cv/overrides.ts` — override storage (field, value, typed name, timestamp) and the single merge function (recruiter value always wins)
- A migration if `candidate_profiles.overrides`/`overridden_by`/`overridden_at` (already present per #110's migration) needs any adjustment — check first; the columns already exist (`overrides jsonb`, `overridden_by`, `overridden_at`), so likely **no migration needed**

**Out of scope**
- #133 — edit UI (blocked on #134, Story #42's base profile screen)
- Deleting a candidate
- Any automatic conflict resolution that discards a recruiter value

## Acceptance criteria

Story #41's own AC1–3 require the edit UI (#133, blocked). This task proves #132's own Done-when list:

- [x] **T132-AC1** — An override survives a re-parse. _Proved by:_ `overrides.test.ts › override survives a re-parse`
- [x] **T132-AC2** — A re-parse updates an un-overridden field. _Proved by:_ `overrides.test.ts › re-parse updates an un-overridden field`
- [x] **T132-AC3** — Clearing an override falls back to the parsed value. _Proved by:_ `overrides.test.ts › clearing an override falls back to the parsed value`
- [x] **T132-AC4** — The merge never loses the original parsed value (it's still readable even when overridden). _Proved by:_ `overrides.test.ts › merge retains the original parsed value alongside an override`
- [x] **T132-AC5** — Every override records the typed recruiter name and the time. _Proved by:_ `overrides.test.ts › records typed name and timestamp on an override`

## Guardrails that apply

- [x] Server-only data access
- [x] RLS unaffected — `candidate_profiles` already RLS'd (#110), no new table
- [x] Typed recruiter name recorded on changes — CLAUDE.md hard rule 8, this is exactly what `overridden_by` does
- [x] Fictional data only

## Assumptions

- `candidate_profiles.overrides`/`overridden_by`/`overridden_at` already exist (#110 migration) — no new migration expected; confirm during T1b and only add one if genuinely missing a field the merge needs.
- #133 stays unbuilt in this Story's PR. When Story #42 ships #134 (the base profile screen), #133 becomes buildable — tracked as a follow-up, not solved here.
- "The recruiter's value wins, always" (per #132's own scope) is implemented as a per-field override: any field present in `overrides` wins over the same field in `parsed`; fields absent from `overrides` always reflect the latest `parsed`.

## Open questions

- none (the #133/#134 ordering is a dependency note, not a PRD-open item)

## Approach

`overrides.ts` exports `mergeProfile(parsed, overrides)` — the single, pure merge function every read path must use — and `setOverride(candidateProfileId, field, value, typedName)` / `clearOverride(candidateProfileId, field)`, which read-modify-write the `overrides` jsonb column plus `overridden_by`/`overridden_at`. A re-parse (#39's `parseCv`) only ever writes `parsed`, never touches `overrides`, so the merge rule holds automatically without `parseCv` needing to know overrides exist.

## Skills in scope

- `prd-context` — CV processing requirement 1; data model `candidate_profiles`
- `supabase-db` — existing `overrides`/`overridden_by`/`overridden_at` columns, RLS unaffected
- `testing` — test-first, DB integration if a migration turns out to be needed
- `compliance-review` — typed-name audit trail on every override

## Files

| File | Change |
|---|---|
| `src/server/cv/overrides.ts` + `.test.ts` | new — merge function + override read/write |

## Dependencies

- #110 (closed) — `candidate_profiles.overrides`/`overridden_by`/`overridden_at` columns already exist
- #127 (this Story's earlier PR #214, still open) — branch stacks through #216 → #214 → #213

## Steps

- [x] **T1a** `grok` — Failing tests first in `overrides.test.ts`: override survives re-parse; re-parse updates an un-overridden field; clearing an override falls back to parsed; merge retains the original parsed value; override records typed name + timestamp.
  - Rules: `testing` — test-first, mock `../db`; `compliance-review` — typed name required on every override
  - Verify: `npm test -- overrides` → fails (module missing)
- [x] **T1b** `grok` — Implement `overrides.ts` (`mergeProfile`, `setOverride`, `clearOverride`) until T1a passes.
  - Rules: `supabase-db` — server-only, existing columns, no new migration unless proven necessary
  - Verify: `npm test -- overrides` → pass; `npm run typecheck`
- [x] **S2** `none` — Full verification, close out docs. Do not run `pr-review`.

## Test plan

| AC | Test | Type |
|---|---|---|
| T132-AC1–5 | `overrides.test.ts` | unit, mocked db |

## Verification

```
npm run lint
npm run typecheck
npm test -- overrides
```

## UX / design

n/a for this task (#133 is the UI, blocked on #134)

## Data / API changes

None expected — reuses existing `candidate_profiles` columns from #110.

## Risks & rollback

Depends on unmerged PR chain (#213/#214/#216). Net-new module; rollback is deleting the file.

## Outcome

- **Shipped:** #132 only — `mergeProfile` (recruiter override always wins, original parsed value stays visible), `setOverride`/`clearOverride` with typed-name + timestamp audit. **#133 (edit UI) was not built** — it stays blocked on #134 (Story #42's base profile screen, not yet built). Story #41's issue and #133 stay open.
- **Changed files / areas:** `src/server/cv/overrides.ts` + `.test.ts` (new). No migration needed — existing `candidate_profiles.overrides`/`overridden_by`/`overridden_at` columns (#110) were sufficient.
- **Tests added or updated:** `overrides.test.ts` — override survives a re-parse, re-parse updates an un-overridden field, clearing an override falls back to parsed, the merge retains the original parsed value, and an override records typed name + timestamp.
- **Verification:** `npm run lint` → pass (1 pre-existing unrelated warning). `npm run typecheck` → pass. `npx vitest run src/server/ai src/server/cv` → 43 passed, 3 pre-existing unrelated `extract.test.ts` failures (already tracked against Story #38).
- **Deviations:** none.
- **Fix rounds / escalations:** 0 — both steps passed on first attempt.
- **Models used:** Planning/orchestration: Claude Sonnet 5 (claude-sonnet-5). T1a/T1b: cursor-grok-4.6-high. No escalations, no direct Claude fixes.
- **Claude direct fixes:** none.
- **Follow-ups:** (1) **#133 remains blocked** — build it once Story #42 ships #134 (base candidate-profile screen). (2) Story #41's GitHub issue stays open; this PR closes #132 only.
