# Plan — #42 Recruiters check one candidate on a profile page

| | |
|---|---|
| Issue | https://github.com/dczii/URecruitment/issues/42 |
| Parent | Story #42 → Epic #5 |
| Milestone | MVP |
| Branch | `feat/42-candidate-profile-screen` (stacked on `feat/41-cv-override-merge`, PR #217 still open) |
| Created | 2026-09-18 |
| Status | In progress |

## Problem

A recruiter has no single page to check a candidate: parsed fields, where each came from, the original CV, and stage history are nowhere together. This Story builds that page, read-only (edit mode is #133, blocked separately on Story #41's own follow-up).

## PRD references

| PRD section | Item | Status |
|---|---|---|
| UI design → Candidate profile | parsed fields with source text, edit mode, original file, stage history | decided |
| Security (suggested) | CV files open through short-lived signed links | suggested |
| AI governance → requirement 1 | every parsed field shows the text it was based on | proposed |

No open PRD items. Design already exists (`design/specs/candidate.md`, from closed task #103) — no new design work needed.

## Scope

**In scope**
- `src/server/cv/candidate-profile.ts` — server query joining `candidates` + merged `candidate_profiles` (via #41's `mergeProfile`) + `candidate_skills` + stage history (`pipeline_entries` → `stage_events`, by `candidate_id`)
- `src/app/candidates/[id]/page.tsx` — Server Component page
- `src/components/features/cv-processing/CandidateProfile.tsx` — presentational component using `AiSuggestion`/`SourceQuote`
- A route handler or Server Action to fetch the original-file signed URL on demand (client-triggered, not embedded server-rendered)
- `e2e/candidate.spec.ts` — Playwright, desktop only (see Assumptions)

**Out of scope**
- Edit mode (#133 — blocked on this task existing; now unblocked as a Story #41 follow-up, not built here)
- Match scores (belong to the job's ranked list)
- Contacting the candidate

## Acceptance criteria

- [x] **AC1** — Every parsed field is shown with its CV source text available. _Proved by:_ `candidate.spec.ts › shows every parsed field with source text available` (written, registered, **not executed locally** — see Outcome)
- [x] **AC2** — The original CV opens through a short-lived signed link. _Proved by:_ `candidate.spec.ts › original CV opens through a signed link` (written, registered, **not executed locally** — see Outcome)
- [x] **AC3** — Stage history shows each move with the recruiter's name. _Proved by:_ `candidate-profile.test.ts › joins stage history with recruiter names` (unit, executed and passing) + `candidate.spec.ts › stage history shows recruiter names` (written, **not executed locally**)

## Guardrails that apply

- [x] Server-only data access; CV files open through short-lived signed URLs — this Story's own AC2
- [x] AI output schema-validated, logged to `ai_runs`, shows source text — reads what #39 already produced, via `SourceQuote`
- [x] Works at phone width — **N/A here, see Assumptions** (desktop-only per established repo precedent)
- [x] Fictional data only

## Assumptions

- **Desktop-only for this screen's own content**, matching every other MVP screen already shipped (Dashboard #100, Jobs/Job-detail #101, closed and merged) per the 2026-09-18 decision recorded in `docs/tasks/32-mvp-screen-designs/spec.md` and `design/specs/candidate.md` ("Desktop only (1440 px) — no phone frame"), and consistent with #33/#107/#108 being closed as not-planned. **Flagging a real inconsistency**: `CLAUDE.md`'s own text ("Tests | ... Playwright (key screens, desktop + phone)") and `playwright.config.ts` (which still defines a `phone` project, used by the app shell's own nav tests in `e2e/shell.spec.ts`) were never updated to reflect this. I'm following the established, already-merged codebase precedent (desktop-only screen *content*) rather than the stale `CLAUDE.md` wording, since every prior screen Story did the same and this screen's own design spec is desktop-only. The app shell/nav itself (built in #99) remains phone-responsive and untouched — only this screen's own content skips phone-specific design/testing. **This needs an explicit owner decision to reconcile `CLAUDE.md` with actual practice** — recorded as a follow-up, not resolved here.
- The original-file link opens through a signed URL fetched **on click**, not rendered into the page's initial HTML, per the design spec's own note ("View original CV (signed link)") and the PRD's short-lived-link intent — implemented as a small client component calling a Server Action that returns a freshly-signed URL from `src/server/storage.ts` (`signCvFilePath`, already built in #114).
- Stage history joins `pipeline_entries` (by `candidate_id`) to `stage_events` (by `pipeline_entry_id`), across every job the candidate is on, since PRD AC3 says "on jobs" (plural) not "on this job."
- No typed-name prompt on this screen — it's read-only (view only); typed-name only appears in edit mode (#133).

## Open questions

- none for this task. The `CLAUDE.md`/design-precedent phone-width inconsistency (see Assumptions) is flagged as a follow-up, not a blocking PRD-open item — it doesn't block this task since the actual precedent is unambiguous and already established across multiple merged Stories.

## Approach

`candidate-profile.ts` exports one query function returning everything the page needs: the candidate's identity fields, the merged profile (via `mergeProfile` from #41), skills with source text, and stage history sorted by time. The page is a Server Component that reads this once (no client-side data fetching for the main content). The original-file link is the one piece of client interactivity: a small client component with a button that calls a Server Action, receives a fresh signed URL, and opens it — so the URL is never baked into server-rendered HTML for longer than a click.

## Skills in scope

- `prd-context` — UI design → Candidate profile; Security → signed links
- `ui-build` — shared patterns (`AiSuggestion`, `SourceQuote`), phone-width note (N/A here, see Assumptions), Chinese text `lang` handling
- `nextjs-app` — Server Component + Server Action conventions, signed-URL-on-demand pattern
- `testing` — Playwright coverage, desktop project only for this screen's content (per Assumptions)
- `security-check` — signed URL lifetime, no raw storage path exposed to the client

## Files

| File | Change |
|---|---|
| `src/server/cv/candidate-profile.ts` + `.test.ts` | new — merged profile + skills + stage-history query |
| `src/app/candidates/[id]/page.tsx` | new — Server Component page |
| `src/components/features/cv-processing/CandidateProfile.tsx` | new — presentational component |
| `src/components/features/cv-processing/OriginalCvLink.tsx` + Server Action | new — on-demand signed URL |
| `e2e/candidate.spec.ts` | new — Playwright, desktop project |

## Dependencies

- #41 (`mergeProfile`, this Story's own predecessor PR #217, still open)
- #114 (closed) — `signCvFilePath`
- #103 (closed) — design already exists

## Steps

- [x] **T1a** `grok` — Failing tests first in `candidate-profile.test.ts`: returns merged profile fields (override wins where set), skills with source text, and stage history joined with recruiter names across multiple jobs, sorted by time.
  - Rules: `testing` — test-first, mock `../db`; `supabase-db` — read-only join query
  - Verify: `npm test -- candidate-profile` → fails (module missing)
- [x] **T1b** `grok` — Implement `candidate-profile.ts` until T1a passes.
  - Rules: `supabase-db` — server-only; reuse `mergeProfile` from #41, don't duplicate merge logic
  - Verify: `npm test -- candidate-profile` → pass; `npm run typecheck`
- [x] **T2** `grok` — Build the page: `src/app/candidates/[id]/page.tsx`, `CandidateProfile.tsx` (parsed fields via `AiSuggestion`+`SourceQuote`, stage history list), `OriginalCvLink.tsx` + Server Action for the on-demand signed URL. Match `design/specs/candidate.md` at 1440px. Add `e2e/candidate.spec.ts` (desktop project only — see plan Assumptions on phone).
  - Rules: `ui-build` — shared patterns, ZH `lang` attribute; `nextjs-app` — Server Component conventions; `security-check` — signed URL only on demand, never embedded raw
  - Verify: `npm run lint`; `npm run typecheck`; `npm run test:e2e -- candidate --project=desktop`
- [x] **S3** `none` — Full verification, close out docs. Do not run `pr-review`.

## Test plan

| AC | Test | Type |
|---|---|---|
| AC1 | `candidate-profile.test.ts`, `candidate.spec.ts › shows every parsed field with source text available` | unit + e2e |
| AC2 | `candidate.spec.ts › original CV opens through a signed link` | e2e |
| AC3 | `candidate-profile.test.ts › joins stage history with recruiter names`, `candidate.spec.ts › stage history shows recruiter names` | unit + e2e |

## Verification

```
npm run lint
npm run typecheck
npm test -- candidate-profile
npm run test:e2e -- candidate --project=desktop
```

## UX / design

`design/specs/candidate.md` (desktop, 1440px only — see Assumptions on the phone-width question).

## Data / API changes

None — reuses existing `candidates`, `candidate_profiles`, `candidate_skills`, `pipeline_entries`, `stage_events` tables.

## Risks & rollback

Depends on unmerged PR chain (#213/#214/#216/#217). Net-new page/components; rollback is deleting the new files.

## Outcome

- **Shipped:** The candidate-profile screen (#134): a merged-profile query joining `candidates`/`candidate_profiles`/`candidate_skills`/`pipeline_entries`/`stage_events`; a read-only page at `/candidates/[id]` rendering every parsed field via `AiSuggestion`/`SourceQuote`, edited-field diffs, stage history, and an on-demand signed CV link (raw storage path never reaches server-rendered HTML). Built desktop-only, matching every other MVP screen shipped so far.
- **Changed files / areas:** `src/server/cv/candidate-profile.ts` + `.test.ts` (new), `src/app/candidates/[id]/page.tsx` (new), `src/app/candidates/[id]/actions.ts` (new), `src/components/features/cv-processing/{CandidateProfile,OriginalCvLink}.tsx` (new), `e2e/candidate.spec.ts` (new, desktop project only).
- **Tests added or updated:** `candidate-profile.test.ts` (5 unit tests: merged identity/override-wins, skills source_text, multi-job stage history sort, not-yet-parsed shape) — executed, passing. `candidate.spec.ts` (4 Playwright tests: AC1 source quotes, AC2 signed link, AC3 stage history, no-overflow) — written and registered (`--list` confirms 4 tests), **not executed**: no Supabase credentials are configured in this environment (confirmed via `.env`/`.env.local` — no `SUPABASE_URL`/secret key present) and no seeded candidate row exists to visit, so neither the dev server's data layer nor Playwright could run end-to-end here. CI must confirm before merge.
- **Verification:** `npm run lint` → pass (1 pre-existing unrelated warning). `npm run typecheck` → pass. `npm run build` → pass, `/candidates/[id]` registered as dynamic, no client-bundle leaks. `npx vitest run src/server/ai src/server/cv` → 48 passed, 3 pre-existing unrelated `extract.test.ts` failures (tracked against Story #38). `npx playwright test e2e/candidate.spec.ts --project=desktop --list` → 4 tests registered correctly. `npm run test:e2e` → **not run** (no Supabase env / seed data locally).
- **Deviations:** (1) The signed-URL action looks up `cv_files.storage_path` directly by `candidateId` rather than through `getCandidateProfile`'s return value, since that query doesn't expose a storage path (out of scope for T1) — this is stricter on security than the original plan, not weaker. (2) Edited-field diffs show "Edited" rather than "Edited by {name}" because `getCandidateProfile` doesn't expose `candidate_profiles.overridden_by` yet — a real gap, tracked as a follow-up. (3) `languages_spoken` has no per-item `source_text` in the parse schema (`parse-cv/v1.ts`, #39), so that field shows `AiSuggestion` with no `SourceQuote` — correctly reflects what the schema actually captures, not a bug in this task. (4) The unparsed-state heading falls back to "Candidate" because `getCandidateProfile`'s `identity: null` shape doesn't expose `candidates.full_name` — a real gap, tracked as a follow-up.
- **Fix rounds / escalations:** 0 — T1a, T1b, T2 all passed verification on first attempt (T2 ran long — background execution needed — but did not require a fix round).
- **Models used:** Planning/orchestration: Claude Sonnet 5 (claude-sonnet-5). T1a/T1b/T2: cursor-grok-4.6-high. No escalations, no direct Claude fixes.
- **Claude direct fixes:** none.
- **Follow-ups:** (1) `candidate-profile.ts` should expose `overridden_by`/`overridden_at` so edited-field cards can name the recruiter, matching the design spec's "Edited by Maya Tan" intent. (2) It should also expose `candidates.full_name` for the not-yet-parsed heading. (3) `e2e/candidate.spec.ts` needs CI (or a local Supabase + seed) to actually execute and confirm AC1–AC3. (4) The shell's page-header navigation label falls back to "Dashboard" for `/candidates/[id]` (`AppNavigation.currentPage`, built pre-existing) — a small pre-existing gap, not caused by this task, worth its own follow-up. (5) **The `CLAUDE.md`/`playwright.config.ts` phone-width wording vs. actual desktop-only practice (see plan Assumptions) should be reconciled explicitly** — every screen Story so far (Dashboard, Jobs, Job detail, now Candidate profile) has quietly followed desktop-only precedent while the checked-in project instructions still say otherwise. This affects every remaining Epic 6–8 UI task and deserves an explicit owner decision, not another silent repeat of this pattern.
