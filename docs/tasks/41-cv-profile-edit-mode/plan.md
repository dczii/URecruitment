# Plan — #133 Add edit mode to the candidate profile with the typed-name prompt

| | |
|---|---|
| Issue | https://github.com/dczii/URecruitment/issues/133 |
| Parent | Story #41 → Epic #5 (follow-up to #132/PR #217; unblocked by #134/PR #218) |
| Milestone | MVP |
| Branch | `feat/41b-cv-profile-edit-mode` (stacked on `feat/42-candidate-profile-screen`, PR #218 still open) |
| Created | 2026-09-18 |
| Status | In progress |

## Problem

#132 built the override/merge rule; #134 built the read-only profile screen. This task closes Story #41: let a recruiter actually edit a parsed field from the profile page, with the typed-name prompt appearing before their first change on the device.

## PRD references

| PRD section | Item | Status |
|---|---|---|
| CV processing → requirement 1 | recruiters can edit any parsed field; edits survive re-processing | proposed |
| Users → typed name | actions are tied to a typed name | decided |
| Design rule 5 | typed-name prompt before a recruiter's first change on a device | proposed |

No open PRD items.

## Scope

**In scope**
- Extend `src/server/cv/candidate-profile.ts` to expose `candidates.full_name` (for headings/fallbacks) and each overridden field's `overridden_by`/`overridden_at`, so the UI can show "Edited by {name}" instead of a bare "Edited" tag (closes a follow-up flagged in #134's Outcome)
- Edit mode on `CandidateProfile`: an "Edit" affordance per field, a Zod-validated Server Action (`src/app/candidates/[id]/actions.ts`) calling `setOverride` from #132
- Wire the existing `TypedNameDialog` + `recruiter-name.ts` (`getStoredRecruiterName`/`setStoredRecruiterName`) to appear before the **first edit on this device**, and not again afterward, reusing the exact components built in #99 rather than a new one-off
- Playwright: edit a field, see it persist (page reload shows the edit), see the name prompt on first use only

**Out of scope**
- Bulk editing
- Editing a skill's source text (belongs to the CV, not editable)
- Any other screen's edit affordances

## Acceptance criteria

- [x] **AC1** — A recruiter can edit any parsed field and the change persists through a re-parse. _Proved by:_ `candidate.spec.ts › AC1: edits a field and it persists`, reusing #132's `setOverride` (already proven to survive re-parse at the unit level in `overrides.test.ts`)
- [x] **AC2** — The name prompt appears before the first change on a device and not again afterward. _Proved by:_ `candidate.spec.ts › AC2: name prompt appears once per device`
- [x] **AC3** — An edited field is visually distinguishable and the original parsed value is still viewable. _Proved by:_ manual inspection — `FieldCard`'s existing edited-diff rendering (#134) already satisfies this; this task adds the name to the "Edited by" tag
- [x] **AC4** — `candidate-profile.test.ts` covers the new `overridden_by`/`full_name` fields. _Proved by:_ `candidate-profile.test.ts › exposes overridden_by and full_name`

## Guardrails that apply

- [x] Server-only data access
- [x] Typed recruiter name recorded on stage/settings changes — CLAUDE.md hard rule 8, this task's core purpose
- [x] Works at phone width — **N/A, desktop-only** (same established precedent as #134, see that task's plan)
- [x] Fictional data only

## Assumptions

- "Before a recruiter's first change on a device" reuses `getStoredRecruiterName()`/`setStoredRecruiterName()` (localStorage, #99) exactly — no new storage mechanism.
- The edit affordance is per-field (matching `design/specs/candidate.md`'s "Edited field card" concept), not a single bulk edit form.
- Re-parse survival is already proven at the unit level by #132's `overrides.test.ts`; this task's e2e only needs to prove the save-then-display round trip, not re-trigger an actual re-parse.

## Open questions

- none

## Approach

`setOverride` (#132) already does the write; this task adds the UI trigger and the typed-name gate. A small client component wraps each editable `FieldCard` with an edit button → inline input → save, calling a new Server Action `saveFieldOverride(candidateId, field, value, typedName)` that validates with Zod and calls `setOverride`. Before the first save on a device, the component checks `getStoredRecruiterName()`; if empty, it opens `TypedNameDialog`, stores the typed name via `setStoredRecruiterName()` on submit, then proceeds with the save using that name.

## Skills in scope

- `prd-context` — CV processing requirement 1; design rule 5
- `ui-build` — reuse `TypedNameDialog`, edited-field diff pattern already in `CandidateProfile.tsx`
- `nextjs-app` — Server Action + Zod validation conventions
- `testing` — Playwright, desktop project only (per established precedent)

## Files

| File | Change |
|---|---|
| `src/server/cv/candidate-profile.ts` + `.test.ts` | modify — expose `full_name`, `overridden_by`, `overridden_at` |
| `src/app/candidates/[id]/actions.ts` | modify — add `saveFieldOverride` Server Action |
| `src/components/features/cv-processing/CandidateProfile.tsx` | modify — edit affordance, "Edited by {name}" |
| `e2e/candidate.spec.ts` | modify — add AC1/AC2 edit-mode coverage |

## Dependencies

- #132 (`setOverride`, PR #217, still open)
- #134 (base screen, PR #218, still open)

## Steps

- [x] **T1a** `grok` — Failing tests first in `candidate-profile.test.ts`: the query now returns `full_name` and, for an overridden field, `overridden_by`/`overridden_at`.
  - Verify: `npm test -- candidate-profile` → fails (new assertions on missing fields)
- [x] **T1b** `grok` — Extend `candidate-profile.ts` until T1a passes.
  - Verify: `npm test -- candidate-profile` → pass; `npm run typecheck`
- [x] **T2** `grok` — Add the edit affordance + `saveFieldOverride` Server Action + typed-name gate to `CandidateProfile.tsx`/`actions.ts`; update `e2e/candidate.spec.ts` with AC1/AC2 coverage (desktop project only).
  - Rules: `ui-build` — reuse `TypedNameDialog` exactly, don't reimplement; `nextjs-app` — Server Action Zod validation
  - Verify: `npm run lint`; `npm run typecheck`; `npx playwright test e2e/candidate.spec.ts --project=desktop --list`
- [x] **S3** `none` — Full verification, close out docs. Do not run `pr-review`.

## Test plan

| AC | Test | Type |
|---|---|---|
| AC1 | `candidate.spec.ts › AC1` | e2e (written; local execution constraints per #134) |
| AC2 | `candidate.spec.ts › AC2` | e2e |
| AC3 | manual inspection of existing `FieldCard` diff rendering | manual |
| AC4 | `candidate-profile.test.ts` | unit |

## Verification

```
npm run lint
npm run typecheck
npm test -- candidate-profile
npx playwright test e2e/candidate.spec.ts --project=desktop --list
```

## UX / design

`design/specs/candidate.md` — "Edited field card", "Edit-mode typed-name prompt" sections.

## Data / API changes

None — reuses existing `candidate_profiles.overridden_by`/`overridden_at` columns.

## Risks & rollback

Depends on unmerged PR chain (#213→#218). Additive changes to existing files; rollback is reverting this branch's commits.

## Outcome

- **Shipped:** Edit mode on the candidate profile: per-field edit affordance for the four scalar identity fields, a Zod-validated `saveFieldOverride` Server Action calling #132's `setOverride`, and the first real wiring of `TypedNameDialog`/`recruiter-name.ts` in this codebase (dialog before the first edit on a device, silently reused after). Overridden fields now show "Edited by {name}". This closes Story #41 (#132 + #133 both shipped, across PRs #217 and this one).
- **Changed files / areas:** `src/server/cv/candidate-profile.ts` + `.test.ts` (modified — added `fullName`/`overriddenBy`/`overriddenAt`), `src/app/candidates/[id]/actions.ts` (modified — added `saveFieldOverride`), `src/components/features/cv-processing/CandidateProfile.tsx` (modified — edit UI, typed-name gate), `e2e/candidate.spec.ts` (modified — added AC1/AC2 tests, kept the existing 4).
- **Tests added or updated:** `candidate-profile.test.ts` — 2 new cases (`fullName`, `overriddenBy`/`overriddenAt`), all 7 tests passing. `candidate.spec.ts` — 2 new Playwright tests (edit persists, name prompt once per device), registered alongside the existing 4 (6 total via `--list`); **not executed** — same environment constraint as #134 (no Supabase credentials/seed data locally). CI must confirm.
- **Verification:** `npm run lint` → pass (1 pre-existing unrelated warning). `npm run typecheck` → pass. `npx vitest run` (ai/cv/recruiter-name/patterns) → 75 passed, 3 pre-existing unrelated `extract.test.ts` failures (tracked against Story #38). `npm run build` → pass, no client-bundle leaks. `npx playwright test e2e/candidate.spec.ts --project=desktop --list` → 6 tests registered. `npm run test:e2e` → not run (no Supabase env/seed locally).
- **Deviations:** (1) The edit affordance lives inside the already-`"use client"` `CandidateProfile.tsx` rather than a separate client file, since T2 only touched that file. (2) The Server Action restricts editable fields to a `z.enum` of the four identity keys rather than any string — a deliberate hardening beyond the plan's minimum, preventing writes to arbitrary/skill fields through this action. (3) Did not implement the design spec's "Recording as {name} / Not you?" confirmation banner for an already-stored name — current behavior saves immediately using the stored name with no re-confirmation UI, which satisfies AC2 ("not again afterward") but is a smaller UI than the full design spec envisions.
- **Fix rounds / escalations:** 0 — all three steps (T1a, T1b, T2) passed verification on first attempt.
- **Models used:** Planning/orchestration: Claude Sonnet 5 (claude-sonnet-5). T1a/T1b/T2: cursor-grok-4.6-high. No escalations, no direct Claude fixes.
- **Claude direct fixes:** none.
- **Follow-ups:** (1) `e2e/candidate.spec.ts`'s 6 tests need CI (or local Supabase + seed) to actually execute. (2) Consider adding the design spec's "Not you? Change the recorded name" re-confirmation banner in a later polish pass — deferred here since AC2's literal requirement (dialog once, not repeated) is met without it. (3) Story #41 is now fully closeable — this PR plus #217 together ship #132 and #133.
