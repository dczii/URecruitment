# Plan — #43 Recruiters create and edit client jobs

| | |
|---|---|
| Issue | https://github.com/dczii/URecruitment/issues/43 |
| Parent | Story #43 → Epic #6 |
| Milestone | MVP |
| Branch | `feat/43-job-form-versions-screens` (stacked on `feat/41b-cv-profile-edit-mode`, PR #219 still open) |
| Created | 2026-09-18 |
| Status | In progress |

## Problem

There's no way to create or edit a job yet. This Story builds the job form (with the must-have/nice-to-have marking and the nationality/language reason rule), job versioning on every save, and the jobs list + job detail screens (requirements + version only; ranked matches, gap checklist and pipeline board are later Stories/Epics).

## PRD references

| PRD section | Item | Status |
|---|---|---|
| Job matching → Job input | form or JD upload, read into the same form | decided |
| Job matching → requirement 1 | nationality/language count only with a written reason | decided |
| Job matching → requirement 3 | must-have/nice-to-have marking | proposed |
| Data model → jobs, job_versions | suggested |
| UI design → Jobs, Job form screens | decided |

No open PRD items. Design already exists (`design/specs/job-form.md`, `jobs.md`, `job-detail.md`, from closed tasks #101/#102) — desktop-only, same established precedent as Epic 5's screens (see #42's plan for the full reasoning; not re-litigated here).

## Scope

**In scope**
- `src/server/jobs/schema.ts` — Zod schema shared by form + Server Action: requirements each must-have/nice-to-have, nationality/language reason rule (mirrors the DB check constraints in `job_versions`, #109, so the form fails fast before hitting the DB)
- `src/server/jobs/versions.ts` — save path: insert an immutable `job_versions` row, move `jobs.current_version_id`, never mutate an old version; a read helper resolving the current version
- `src/app/jobs/new/page.tsx`, `src/components/features/jobs/JobForm.tsx`, `src/app/jobs/actions.ts` — the form + Server Action
- `src/app/jobs/page.tsx` — jobs list (status, owner, open gap-flag count, candidates-in-pipeline count)
- `src/app/jobs/[id]/page.tsx` — job detail (requirements + which version is shown; placeholders only for ranked matches/gap checklist/pipeline board, explicitly out of scope per #137)
- A minimal `listClients()` query for the form's client picker (nothing exists yet)

**Out of scope**
- JD upload pre-fill (#44 / E05-S02)
- The gap check itself (#45, #46, #47 / E05-S03–S05)
- Ranked matches (Epic 7), pipeline board (Epic 9)
- Re-scoring on save (Epic 7)
- A version-history UI, reverting to an older version

## Acceptance criteria

- [x] **AC1** — Every requirement row must be marked must-have or nice-to-have. _Proved by:_ `schema.test.ts › rejects a requirement with no must-have/nice-to-have marking`
- [x] **AC2** — Nationality/language required without a written reason is refused, in both form and Server Action. _Proved by:_ `schema.test.ts` — 4 cases (nationality no reason, language no reason, whitespace-only reason, both accepted with a reason)
- [x] **AC3** — Each save stores a new version; the previous version is still readable. _Proved by:_ `versions.test.ts › two saves produce two versions, pointer follows latest, old version unchanged`
- [x] **AC4** — The jobs list shows status, owner, open gap-flag count, candidates per stage (pipeline count). _Proved by:_ `jobs.spec.ts › AC4: jobs list shows status, owner, flag count, candidate count`

## Guardrails that apply

- [x] Fair scoring — nationality/language never count without a recruiter-written reason; enforced in both the Zod schema and the existing DB check constraints (#109)
- [x] Server-only data access
- [x] RLS — reuses existing `jobs`/`job_versions`/`clients`/`gap_flags` tables (#109), already locked down, no new table
- [x] Works at phone width — **N/A, desktop-only**, same established precedent flagged in #42's plan (not re-litigated; see that task for the full CLAUDE.md-vs-practice note)
- [x] Fictional data only

## Assumptions

- The DB already enforces the nationality/language reason rule via `job_versions_nationality_reason_check`/`job_versions_language_reason_check` (#109 migration) — the Zod schema mirrors this exactly so the form/action fail fast with a friendly message rather than surfacing a raw DB constraint error.
- "Candidates per stage" on the jobs list (AC4) is represented as a single "N candidates in pipeline" count, per `design/specs/jobs.md`'s own note that the full per-stage breakdown lives on the job detail's embedded pipeline board (Epic 9, out of scope here) — the list's own count is the PRD's AC4 requirement at list-level.
- `listClients()` (no client picker existed anywhere yet) is minimal scope: id + name, for a `<select>`. Client creation/editing is not part of this Story (no task mentions it) — treated as out of scope, likely a settings-area gap to flag as a follow-up if no other Epic covers it.
- Desktop-only for this Story's screens, consistent with #42 and every prior screen Story.

## Open questions

- none

## Approach

`schema.ts` is the single Zod schema shared by the client `JobForm` component and the server-side action, so validation logic is never duplicated or allowed to drift between client and server. `versions.ts` is a small, focused module: `saveJobVersion(jobId, fields)` inserts a version and updates the job's pointer in one transaction-like sequence (two writes; a version row is written before the pointer moves, so a failed pointer update never leaves an orphaned invisible version — the version row simply isn't yet current). A read helper `getCurrentJobVersion(jobId)` is the only way any other code resolves "the" version of a job, so gap flags/match scores (later Stories) have one place to attach to.

## Skills in scope

- `prd-context` — Job matching → Job input, requirement 1/3; UI design → Jobs/Job form
- `ui-build` — desktop-only precedent, shared patterns
- `nextjs-app` — Server Component + Server Action conventions
- `supabase-db` — versioning pattern, existing RLS'd tables
- `testing` — test-first for logic (schema, versions), Playwright for the screens
- `compliance-review` — the nationality/language reason rule is a fairness guardrail, test-first per the issue's own flag

## Files

| File | Change |
|---|---|
| `src/server/jobs/schema.ts` + `.test.ts` | new — shared Zod schema, reason-rule tests |
| `src/server/jobs/versions.ts` + `.test.ts` | new — versioning save path + read helper |
| `src/server/jobs/clients.ts` | new — minimal `listClients()` |
| `src/app/jobs/actions.ts` | new — Server Action using `schema.ts` + `versions.ts` |
| `src/app/jobs/new/page.tsx` | new — create-job page |
| `src/components/features/jobs/JobForm.tsx` | new — the form |
| `src/app/jobs/page.tsx` | modify — replace stub with real jobs list |
| `src/app/jobs/[id]/page.tsx` | new — job detail (requirements + version, placeholders for later phases) |
| `e2e/job-form.spec.ts` | new — refused save, accepted save, desktop only |
| `e2e/jobs.spec.ts` | new — list + detail, desktop only |

## Dependencies

- #109 (closed) — `clients`/`jobs`/`job_versions`/`gap_flags` migration
- #102, #101 (closed) — designs already exist

## Steps

- [x] **T1a** `grok` — Failing tests first in `schema.test.ts`: nationality required + no reason rejected; language required + no reason rejected; whitespace-only reason rejected; both accepted with a real reason; a requirement with no must-have/nice-to-have marking rejected.
  - Verify: `npm test -- jobs/schema` → fails (module missing)
- [x] **T1b** `grok` — Implement `schema.ts` until T1a passes.
  - Verify: `npm test -- jobs/schema` → pass; `npm run typecheck`
- [x] **T2a** `grok` — Failing tests first in `versions.test.ts`: two saves produce two version rows; `jobs.current_version_id` follows the latest; an old version's `fields`/`must_haves`/etc. are unchanged after a later save; a read helper always resolves the current version.
  - Verify: `npm test -- jobs/versions` → fails (module missing)
- [x] **T2b** `grok` — Implement `versions.ts` until T2a passes.
  - Verify: `npm test -- jobs/versions` → pass; `npm run typecheck`
- [x] **T3** `grok` — Build `JobForm.tsx`, `src/app/jobs/new/page.tsx`, `src/app/jobs/actions.ts` (Server Action using `schema.ts`+`versions.ts`), `clients.ts`. Match `design/specs/job-form.md` (desktop only). Add `e2e/job-form.spec.ts` (desktop project, refused-save and accepted-save cases).
  - Rules: `ui-build` — shared patterns, destructive-toned reason-required marker; `nextjs-app` — Server Action + Zod
  - Verify: `npm run lint`; `npm run typecheck`; `npx playwright test e2e/job-form.spec.ts --project=desktop --list`
- [x] **T4** `grok` — Build `src/app/jobs/page.tsx` (list) and `src/app/jobs/[id]/page.tsx` (detail: requirements + version shown; explicit placeholder text for ranked matches/gap checklist/pipeline board — do not build those). Match `design/specs/jobs.md`/`job-detail.md`. Add `e2e/jobs.spec.ts`.
  - Rules: `ui-build` — table-per-row pattern; `nextjs-app` — Server Component reads
  - Verify: `npm run lint`; `npm run typecheck`; `npx playwright test e2e/jobs.spec.ts --project=desktop --list`
- [x] **S5** `none` — Full verification, close out docs. Do not run `pr-review`.

## Test plan

| AC | Test | Type |
|---|---|---|
| AC1 | `schema.test.ts` | unit |
| AC2 | `schema.test.ts` — 4 cases | unit |
| AC3 | `versions.test.ts` | unit |
| AC4 | `jobs.spec.ts` | e2e (written; local execution constraints — no Supabase env, same as Epic 5's screens) |

## Verification

```
npm run lint
npm run typecheck
npm test -- jobs
npx playwright test e2e/job-form.spec.ts e2e/jobs.spec.ts --project=desktop --list
```

## UX / design

`design/specs/job-form.md`, `design/specs/jobs.md`, `design/specs/job-detail.md` (desktop, 1440px).

## Data / API changes

None — reuses `clients`/`jobs`/`job_versions`/`gap_flags` from #109.

## Risks & rollback

Depends on unmerged PR chain (#213→#219). Net-new modules/pages + one modified stub page; rollback is deleting/reverting.

## Outcome

- **Shipped:** All three tasks (#135, #136, #137): a shared job-version Zod schema mirroring the DB's fairness check constraints; immutable job versioning (`saveJobVersion`/`getCurrentJobVersion`); the job creation form with must-have/nice-to-have marking and the reason-gated nationality/language section; the jobs list (status, owner, open-flag count, pipeline count) and job detail (requirements + version shown, explicit later-phase placeholders for matches/gap checklist/pipeline board). Story #43 fully closes.
- **Changed files / areas:** `src/server/jobs/{schema,versions,clients,list}.ts` + `.test.ts` (new), `src/app/jobs/actions.ts` (new), `src/app/jobs/new/page.tsx` (new), `src/components/features/jobs/JobForm.tsx` (new), `src/app/jobs/page.tsx` (replaced stub), `src/app/jobs/[id]/page.tsx` (new), `e2e/job-form.spec.ts` + `e2e/jobs.spec.ts` (new).
- **Tests added or updated:** `schema.test.ts` (6 tests: must-have marking, nationality/language reason rule incl. whitespace-only) and `versions.test.ts` (4 tests: two saves → two versions, pointer follows latest, no update ever hits `job_versions`, current-version read helper) — both executed, all 10 passing. `job-form.spec.ts` (2 tests) and `jobs.spec.ts` (2 tests) — written, registered via `--list`, **not executed**: no Supabase credentials/seeded `clients` data in this environment (same constraint as every Epic 5 screen). CI must confirm.
- **Verification:** `npm run lint` → pass (1 pre-existing unrelated warning). `npm run typecheck` → pass. `npx vitest run src/server/jobs` → 10/10 passing. `npm run build` → pass, `/jobs`, `/jobs/[id]`, `/jobs/new` all registered dynamic, no client-bundle leaks. Full `npm test` shows pre-existing failures in `src/server/db.test.ts` (2 — `Node.js detected but native WebSocket not found`, a local Node/Supabase-realtime-js environment quirk, confirmed present on this branch's parent commit via `git stash`) and `src/server/cv/extract.test.ts` (3, tracked against Story #38) — neither caused by this Story.
- **Deviations:** (1) Job title became a required field (feeds `fields.title` and the page heading) — implied by the design and by `job_versions.fields` needing a title, not explicitly named in #135's task body. (2) Owner name + client picker sit in a "Job details" card not explicitly drawn in `design/specs/job-form.md`'s mock, but required by the task's own scope. (3) `getJobDetail()` lives in `list.ts` alongside `listJobs()` rather than a separate file, keeping the detail page a thin Server Component. (4) Jobs list includes a "New job" link per the screen inventory even though it's not in the `jobs.md` mock. (5) The job-detail "open flags" banner only renders when the count is > 0 (currently always 0, since gap-check isn't built yet) — correct behavior, not a bug.
- **Fix rounds / escalations:** 0 — all six executor steps (T1a, T1b, T2a, T2b, T3, T4) passed verification on first attempt.
- **Models used:** Planning/orchestration: Claude Sonnet 5 (claude-sonnet-5). T1a/T1b/T2a/T2b/T3/T4: cursor-grok-4.6-high. No escalations, no direct Claude fixes.
- **Claude direct fixes:** none.
- **Follow-ups:** (1) `e2e/job-form.spec.ts` and `e2e/jobs.spec.ts` (4 tests total) need CI or local Supabase + seed data to actually execute. (2) No client creation/editing UI exists anywhere yet — `listClients()` assumes rows already exist; flag this gap if no other Epic/Story is found to cover it. (3) The `src/server/db.test.ts` WebSocket failure is a local-environment quirk (missing native WebSocket in this Node runtime) worth a maintainer look, though it doesn't block CI (which likely runs a different Node setup) — not caused by this Story, noted for visibility. (4) The `CLAUDE.md`/desktop-only-practice inconsistency (flagged first in #42's plan) continues to apply here and to every remaining Epic 6-8 screen — still unresolved, still worth an explicit owner decision.
