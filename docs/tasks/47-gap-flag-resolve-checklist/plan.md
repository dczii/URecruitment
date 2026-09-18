# Plan — #47 Recruiters resolve or dismiss flags without blocking matching

| | |
|---|---|
| Issue | https://github.com/dczii/URecruitment/issues/47 |
| Parent | Story #47 → Epic #6 |
| Milestone | MVP |
| Branch | `feat/47-gap-flag-resolve-checklist` (stacked on `feat/46-gap-check-ai-flags`, PR #224 still open) |
| Created | 2026-09-19 |
| Status | In progress |

## Problem

Gap flags exist (#45, #46) but nothing lets a recruiter close one out, and nothing shows them on the job detail screen. This Story closes both gaps: a resolve/dismiss action with a required note and typed name, and the checklist + open-flag banner UI. This is the last Story in Epic 6.

## PRD references

| PRD section | Item | Status |
|---|---|---|
| Job request gap check → requirement 2 | recruiter marks resolved/dismissed with a short note | proposed |
| Job request gap check → requirement 3 | open flags don't block matching; banner shows open count | decided |
| Users → typed name | every change logged with the typed name | decided |

No open PRD items. Design is a change to the existing job-detail screen (`design/specs/job-detail.md`'s gap-flag checklist and open-flag banner sections, already described from closed task #101).

## Scope

**In scope**
- A migration adding `resolved_by text`, `resolved_at timestamptz` to `gap_flags` (needed for the typed-name/time audit trail #143 requires — neither column exists yet, per #109's migration)
- `src/server/gap-check/resolve.ts` — `resolveFlag`/`dismissFlag` Server Action(s) with Zod validation: required non-blank note, required typed name, writes `resolution_state`, `resolution_note`, `resolved_by`, `resolved_at`
- `src/components/features/gap-check/FlagChecklist.tsx` — checklist grouped by flag type, `AiSuggestion`/`SourceQuote` on model-derived flags (uncertain/conflicting/fair-employment), resolve/dismiss controls with the note field and typed-name prompt (reusing `TypedNameDialog` from #99/#133)
- Extend `src/app/jobs/[id]/page.tsx` — replace the "Open gap flags" placeholder (from #43) with the real banner (open count, "matching is not blocked") and the checklist
- `e2e/gap-flags.spec.ts` — desktop only (established precedent from every prior screen)

**Out of scope**
- Re-running the gap check
- Deleting flags
- Sending the client question anywhere — the portal never contacts clients
- Editing flag text
- Re-opening a resolved/dismissed flag — not built; resolution is terminal in this Story's scope (see Assumptions)

## Acceptance criteria

- [x] **AC1** — Resolving or dismissing a flag requires a short note and records the typed name. _Proved by:_ `resolve.test.ts › AC1: empty/whitespace note refused, missing name refused, successful resolve records note+name+time`
- [x] **AC2** — Job detail shows a banner counting open flags. _Proved by:_ `gap-flags.spec.ts › AC2: banner shows open flag count` (written; not executed — established local-environment constraint)
- [x] **AC3** — Matching runs normally with open flags (nothing in this Story could block it — there's no matching engine yet, Epic 7). _Proved by:_ code review — the resolve/dismiss action and the checklist UI have no code path that reads or gates any matching/scoring logic; flags are purely informational, matching (when built in Epic 7) will simply never check `gap_flags.resolution_state`

## Guardrails that apply

- [x] Typed recruiter name recorded on changes — CLAUDE.md hard rule 8, this Story's core purpose
- [x] Server-only data access
- [x] Works at phone width — **N/A, desktop-only**, same established precedent as every prior screen (flagged repeatedly since #218; not re-litigated here)
- [x] Fictional data only

## Assumptions

- `resolved_by`/`resolved_at` don't exist on `gap_flags` (#109 migration) — adding them is necessary for AC1's "typed name and time" requirement, additive and reversible.
- "A resolved flag cannot be silently re-opened without a new record" (#143's own scope) is satisfied by NOT building a re-open action at all in this Story — resolve/dismiss is a one-way terminal action here; the resolve/dismiss Server Action refuses (no-ops with a clear error) if called again on an already-closed flag, rather than allowing a silent flip back to open or a silent overwrite of the existing note/name.
- "The flag's earlier state remains readable after it is closed" means the original `reason`/`suggested_question`/`flag_type` columns are never touched by the resolve action — only the `resolution_*`/`resolved_*` columns change.
- The typed-name prompt reuses `TypedNameDialog`/`recruiter-name.ts` exactly as wired in #133 (candidate profile edit mode) — same "ask once per device, reuse silently after" pattern, not a new one-off.

## Open questions

- none

## Approach

`resolve.ts` exports `closeFlag(flagId, resolutionState, note, typedName)` (`resolutionState` is `"resolved" | "dismissed"`), Zod-validating a non-blank note and a valid typed name, refusing if the flag is already closed, and writing the four columns in one update. `FlagChecklist.tsx` groups flags by type (missing / uncertain / conflicting / fair-employment), shows model-derived flags (not `missing`) with `AiSuggestion`+`SourceQuote` on their evidence, and gives each open flag a note field + resolve/dismiss buttons wired to the typed-name gate exactly like #133's pattern. The job detail page's existing "Open gap flags" placeholder text (from #43/#137) is replaced with the real banner + checklist.

## Skills in scope

- `prd-context` — gap check requirements 2/3; typed-name rule
- `nextjs-app` — Server Action + Zod validation
- `supabase-db` — migration, existing RLS
- `ui-build` — reuse `AiSuggestion`/`SourceQuote`/`TypedNameDialog` exactly, desktop-only precedent
- `testing` — test-first for the resolve logic

## Files

| File | Change |
|---|---|
| `supabase/migrations/<timestamp>_gap_flags_resolution_audit.sql` | new — `resolved_by`, `resolved_at` |
| `src/server/gap-check/resolve.ts` + `.test.ts` | new — resolve/dismiss action |
| `src/components/features/gap-check/FlagChecklist.tsx` | new — checklist + resolve/dismiss UI |
| `src/app/jobs/[id]/page.tsx` | modify — real banner + checklist replacing the placeholder |
| `e2e/gap-flags.spec.ts` | new — desktop only |

## Dependencies

- #142 (this session's own predecessor, PR #224, still open)
- #137, #99 (closed)

## Steps

- [x] **M1** `claude` — Write the migration adding `resolved_by text`, `resolved_at timestamptz` to `gap_flags`.
  - Verify: `npm run lint` (migration lint — additive column on existing table, no new-table RLS rule applies)
- [x] **T1a** `grok` — Failing tests first in `resolve.test.ts`: empty note refused; whitespace-only note refused; missing/invalid typed name refused; a successful resolve writes `resolution_state: "resolved"`, the note, `resolved_by`, `resolved_at`; a successful dismiss writes `resolution_state: "dismissed"` with the same fields; calling close on an already-closed flag is refused with a clear error (no silent overwrite or reopen); the flag's `reason`/`suggested_question`/`flag_type` are never touched by the update.
  - Verify: `npm test -- gap-check/resolve` → fails (module missing)
- [x] **T1b** `grok` — Implement `resolve.ts` until T1a passes.
  - Verify: `npm test -- gap-check/resolve` → pass; `npm run typecheck`
- [x] **T2** `grok` — Build `FlagChecklist.tsx`, extend `src/app/jobs/[id]/page.tsx` with the real banner + checklist (replacing the #43 placeholder), reuse `TypedNameDialog` for the resolve/dismiss typed-name gate. Add `e2e/gap-flags.spec.ts` (desktop only).
  - Rules: `ui-build` — reuse patterns exactly; desktop-only, no phone work
  - Verify: `npm run lint`; `npm run typecheck`; `npm run build`; `npx playwright test e2e/gap-flags.spec.ts --project=desktop --list`
- [x] **S3** `none` — Full verification, close out docs. Do not run `pr-review`.

## Test plan

| AC | Test | Type |
|---|---|---|
| AC1 | `resolve.test.ts` | unit |
| AC2 | `gap-flags.spec.ts` | e2e (written; local execution constraints) |
| AC3 | code review — no matching/scoring code path reads `gap_flags` | manual |

## Verification

```
npm run lint
npm run typecheck
npm test -- gap-check
npm run build
npx playwright test e2e/gap-flags.spec.ts --project=desktop --list
```

## UX / design

`design/specs/job-detail.md` — gap-flag checklist and open-flag banner sections.

## Data / API changes

Migration adds `resolved_by`, `resolved_at` to `gap_flags`.

## Risks & rollback

Depends on unmerged PR chain (#213→#224). Additive migration + net-new modules + one modified page; rollback is reverting/dropping the columns.

## Outcome

- **Shipped:** All of Story #47 (#143 + #144), closing Epic 6 in full: `resolved_by`/`resolved_at` audit columns, `closeFlag` (resolve/dismiss with a required note and typed name, terminal once closed), the gap-flag checklist UI on job detail (grouped by type, model-derived flags labelled with `AiSuggestion`/`SourceQuote`, code-derived missing-field flags shown plainly), and the resolve/dismiss flow gated by the same once-per-device typed-name dialog pattern established in #133.
- **Changed files / areas:** `supabase/migrations/20260919000001_gap_flags_resolution_audit.sql` (new), `src/server/gap-check/resolve.ts` + `.test.ts` (new), `src/lib/database.types.ts` (modified — added the two new columns, hand-edited same as #40's precedent, avoiding a type-cast workaround), `src/server/jobs/list.ts` (modified — `getJobDetail` now also returns the open flag rows, not just the count), `src/app/jobs/[id]/page.tsx` (modified — real checklist replaces the placeholder), `src/app/jobs/[id]/gap-flag-actions.ts` (new — Server Action wrapper), `src/components/features/gap-check/FlagChecklist.tsx` (new), `e2e/gap-flags.spec.ts` (new).
- **Tests added or updated:** `resolve.test.ts` — 7 tests (empty/whitespace note refused, invalid name refused, successful resolve, successful dismiss, already-closed refused, original evidence columns untouched) — executed, all passing. `gap-flags.spec.ts` (3 tests: banner count, evidence/question display, note + first-use name dialog) — written, registered via `--list` alongside the existing job/gap specs, **not executed** — same no-Supabase-credentials constraint as every screen in Epic 5/6.
- **Verification:** `npm run lint` → pass (2 pre-existing warnings, neither from this Story). `npm run typecheck` → pass — notably, clean **without** a type-cast workaround, because `database.types.ts` was hand-updated for the new columns before the implementation step ran. `npx vitest run src/server` → 125 passed, 5 pre-existing unrelated failures across `db.test.ts` (2, local Node/WebSocket runtime quirk) and `extract.test.ts` (3, tracked against Story #38) — confirmed the same known set, nothing new. `npm run build` → pass, all routes registered, no client-bundle leaks.
- **Deviations:** (1) T1b's first pass cast the update payload to bypass a types/migration lag; **Claude fixed this directly** by hand-updating `database.types.ts` (same precedent as #40) rather than accepting the cast, then re-ran typecheck/tests to confirm the cleaner fix held. (2) `openFlagCount` on `getJobDetail` is now derived from the length of the loaded open-flags array rather than a separate `count` query — same field/copy on the banner, one fewer round-trip. (3) The Server Action wrapper lives in a page-scoped file (`src/app/jobs/[id]/gap-flag-actions.ts`) so the client component never imports from `src/server` directly.
- **Fix rounds / escalations:** 0 within the executor pipeline (M1, T1a, T1b, T2 all passed verification on first attempt). 1 direct Claude fix (the `database.types.ts` hand-update, done proactively rather than accepting T1b's cast workaround — not a failure, a quality improvement applied before committing).
- **Models used:** Planning/orchestration + M1 (migration) + the `database.types.ts` fix: Claude Sonnet 5 (claude-sonnet-5). T1a/T1b/T2: cursor-grok-4.6-high. No escalations.
- **Claude direct fixes:** `src/lib/database.types.ts` — added `resolved_by`/`resolved_at` to the `gap_flags` types, removing the need for a type cast in `resolve.ts`.
- **Follow-ups:** (1) `gap-flags.spec.ts` (and every other Epic 5/6 Playwright spec) needs CI or local Supabase + seed data to actually execute. (2) There's no "closed flags" history view — a resolved/dismissed flag simply disappears from the checklist; if recruiters need to see what was already resolved, that's a future task. (3) **Epic 6 is now fully complete** — all 5 Stories (#43-#47) shipped across PRs #221, #222, #223, #224, and this one.
