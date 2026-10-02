# Plan — #32 Every MVP screen has an approved design

Spec: [spec.md](./spec.md) · Branch: `design/32-mvp-screen-designs` · Created: 2026-09-18

## Approach

Design all 7 remaining Task screens (#100–#106) as desktop-only (1440 px) pen.dev frames built on
the `#98` shared patterns already in `design/tokens.pen`/`shell.pen`, one `.pen` file group per
Task, each with a matching `design/specs/<screen>.md` mirror so ui-build (Grok, no pen.dev access)
can implement faithfully later. Phone frames are dropped everywhere per the 2026-09-18
desktop-only decision (see spec.md). Work happens directly in the open pen.dev session
(`design/shell.pen` is the active editor); design steps are `claude`-only per `ui-design`. There is
no code to write, so no `grok`/`gpt` steps and no code verification commands — the gate is pen.dev
validation (`get_app_state` shows the new frames as top-level nodes with no errors) plus manual
review of each spec mirror against its Task's Done-when items.

## Skills in scope

- `prd-context` — required for every task; screens table, design rules 1–5, protected-attribute
  and stage-limit rules feed every screen's content.
- `testing` — required for every task; confirms no test obligations apply to a design-only change
  (desktop-only Playwright projects note also cross-checks the desktop-only decision).
- `ui-design` — governs every `.pen`/spec change: pencil MCP only, tokens, frames, PRD design
  rules, screen list.
- `github-workflow` — issue/branch/commit/PR mechanics for the Story.
- `talent-search` — matches #103 Search screen: filters (skills, years, location, language, CV
  date) and hybrid keyword+vector framing.
- `compliance-review` — matches #102 Job form: nationality/language reason-field gating is a
  fairness guardrail, not just a UI nicety.

## Files

**Deviation from the original plan:** the pencil MCP session available for this Story resolved
every `filePath` (`design/screens/dashboard.pen`, `.../jobs.pen`, etc.) to the same single live
document backing the already-open `design/shell.pen` editor tab — there was no way to create or
persist genuinely separate per-screen `.pen` files. All 9 desktop frames plus the new shared
pattern components (delay status badge, AI suggestion tag, source quote) live as top-level nodes
inside `design/shell.pen`. This is recorded as Assumption 6 in `spec.md` and in every affected spec
mirror. Splitting into per-screen files is a follow-up for a human working in the pen.dev GUI.

| File | Change |
|---|---|
| `design/shell.pen` | modified — all 9 new desktop frames (#100–#106) + 3 new shared pattern components (delay status badge ×4 variants, AI suggestion tag, source quote) + their tokens, added as top-level nodes |
| `design/tokens.md` | modified — documents the newly-registered `status-*`/`ai-suggestion-*`/`source-quote-*` pen.dev variables and the 3 pattern components, and records the file-consolidation deviation |
| `design/specs/dashboard.md` | new — #100 mirror |
| `design/specs/jobs.md`, `design/specs/job-detail.md` | new — #101 mirrors |
| `design/specs/job-form.md` | new — #102 mirror |
| `design/specs/search.md`, `design/specs/candidate.md` | new — #103 mirrors |
| `design/specs/pipeline.md` | new — #104 mirror |
| `design/specs/placements.md`, `design/specs/settings.md` | new — #105 mirrors |
| `design/specs/review-queue.md` | new — #106 mirror |
| `docs/decisions/open-questions.md` | modify — #106: cross-reference this Story from RC-2, no status change |

## Dependencies

- none (design-only; no npm packages, env vars, or migrations)

## Steps

- [x] **S1** `claude` — Design `design/screens/dashboard.pen` (desktop, 1440 px): overdue list
  ordered by days over with delay badge + "waiting on" column, due-soon section, guarantee-ending
  section, filters (client/job/stage/owner), empty/loading/error states. Write
  `design/specs/dashboard.md`. Covers AC4.
  - Rules: `ui-design` (desktop-only frame, delay status word+icon, AI-suggestion labelling n/a
    here since dashboard has no AI output directly), `prd-context` pipeline-rules (delay
    thresholds, 30-day guarantee).
  - Verify: `get_app_state()` shows the new top-level frame(s) with no errors; spec mirror states
    sort order + empty behaviour (#100 AC1).
- [x] **S2** `claude` — Design `design/screens/jobs.pen` (list + detail, desktop only): list with
  status/owner/gap-flag count/candidates-per-stage; detail with requirements, gap-flag checklist,
  ranked matches (score + reasons + source quote + model version/date), open-flag banner, embedded
  pipeline board. Write `design/specs/jobs.md` and `design/specs/job-detail.md`. Covers AC5.
  - Rules: `ui-design` (AI-suggestion + source-quote patterns, model version/date visible),
    `prd-context` (gap-check flags, matching).
  - Verify: `get_app_state()`; spec mirrors show score/reasons/source-text pattern and open-flag
    banner copy stating matching isn't blocked.
- [x] **S3** `claude` — Design `design/screens/job-form.pen` (desktop only): requirement rows with
  must-have/nice-to-have choice, JD upload + pre-fill confirmation state, nationality/language
  reason field gating, validation/error states. Write `design/specs/job-form.md`. Covers AC6.
  - Rules: `ui-design`, `compliance-review` (reason-field fairness gating must be visually
    unmistakable), `prd-context` (protected-attribute rule).
  - Verify: `get_app_state()`; spec mirror confirms reason field blocks nationality/language
    until filled.
- [x] **S4** `claude` — Design `design/screens/search.pen` and `design/screens/candidate.pen`
  (desktop only): search box + 5 filters (skills, years, location, language, CV date) + results
  with last-updated date; candidate profile with parsed fields + source quotes, edit mode showing
  edited-vs-parsed distinction and the typed-name prompt, stage history. Write
  `design/specs/search.md` and `design/specs/candidate.md`. Covers AC7.
  - Rules: `talent-search` (all 5 filters, hybrid ranking framing), `ui-design`
    (source-quote pattern, typed-name prompt), `prd-context`.
  - Verify: `get_app_state()`; spec mirrors list all 5 filters and show the edited/parsed visual
    distinction.
- [x] **S5** `claude` — Design `design/screens/pipeline.pen` (desktop only, no phone-first framing):
  7 stages + 3 end states (Placed + 2 others show no delay status), non-drag keyboard-reachable
  move action, typed-name prompt on move. Write `design/specs/pipeline.md`. Covers AC8.
  - Rules: `ui-design` (delay status word+icon, typed-name prompt, "AI never advances a
    candidate"), `prd-context` pipeline-rules (7 stages, 3 end states, no status on end states).
  - Verify: `get_app_state()`; spec mirror lists all 10 columns and confirms end states carry no
    delay badge.
- [x] **S6** `claude` — Design `design/screens/placements.pen` and `design/screens/settings.pen`
  (desktop only): start-date + 30-day guarantee countdown + 5-working-day flag; stage limits at
  default/client/job level with visible hierarchy, public holidays, change log with typed name +
  date. Write `design/specs/placements.md` and `design/specs/settings.md`. Covers AC9.
  - Rules: `prd-context` pipeline-rules (guarantee period, limit hierarchy job > client >
    default), `ui-design` (typed-name change log entries).
  - Verify: `get_app_state()`; spec mirrors show the hierarchy legibly and the change-log
    name+date pattern.
- [x] **S7** `claude` — Design `design/screens/review-queue.pen` (desktop only): per-file name,
  reason (incl. scanned-file rejection message), retry drawn as a recruiter action. Write
  `design/specs/review-queue.md`. Cross-reference this Story from the existing **RC-2** row in
  `docs/decisions/open-questions.md` (status stays "Awaiting owner" — this task proposes the
  design, it does not answer the question). Covers AC10.
  - Rules: `ui-design` ("nothing looks like an automatic decision" — retry must read as
    recruiter-triggered), `prd-context` (CV processing requirement 2 is proposed; scanned-file
    rejection message wording; no OCR).
  - Verify: `get_app_state()`; `docs/decisions/open-questions.md` RC-2 row still says "Awaiting
    owner" and now names this Story's PR; spec mirror shows the rejection message in recruiter
    language and retry as a button, not automatic.
- [x] **S8** `none` — Close-out verification: re-open `get_app_state()` for the whole document,
  confirm all 9 new top-level frames exist with no errors, all `design/specs/*.md` files exist,
  and `docs/decisions/open-questions.md` diff is additive-only (no status change to any row).
  Close out `spec.md`/`plan.md`. Do not run `pr-review`.

## Test plan

Design-only Story: no Vitest/Playwright/eval applies. Each AC's test is pen.dev validation plus
manual mirror inspection (see table).

| AC | Test or manual evidence | Type / reason |
|---|---|---|
| AC1 | `get_app_state()` after S1–S7 lists 9 top-level screen frames; 9 `design/specs/*.md` files exist | manual/tooling — design-only, no automated test framework covers `.pen` content |
| AC2 | Manual read of each spec mirror confirming reuse of `AiSuggestion`/`SourceQuote`/delay-badge patterns named in `design/specs/shell.md` and `design/tokens.md` | manual — same reason |
| AC4–AC10 | Manual read of each spec mirror against its Task's Done-when list (quoted in spec.md) | manual — same reason |
| RC-2 cross-reference (AC10) | `git diff docs/decisions/open-questions.md` shows only an additive cross-reference, no status/word change | manual — docs-only |

## Verification

```
npm run lint       → pass (0 errors; 1 pre-existing warning in supabase/migration-lint.ts,
                      unrelated to this Story's design/docs-only changes)
npm run typecheck  → pass ("Types generated successfully")
```
Run even though no `.ts`/`.tsx` files were touched, to confirm the design/docs-only changes did not
break anything. `npm test`/`build`/`test:e2e`/`test:db`/`eval` are **not applicable** — no app code,
migration, prompt, schema, or route changed (spec.md Assumption 4). The design-specific gate is
pen.dev's own state: `get_app_state()`/`Get(document, ...)` confirmed all 9 required desktop frames
plus the 3 shared pattern components exist as top-level nodes in `design/shell.pen` with correct
structure (verified via `Get` bounds inspection); `TakeScreenshot` rendered correctly for Dashboard,
Jobs list, Job detail and Job form, and returned blank for Candidate search, Candidate profile,
Pipeline board and CV review queue despite `Get`-verified correct node structure and bounds — this
looked like a tool-side rendering/caching artifact specific to this session (the same "stale"
pattern self-corrected on Dashboard and Job form after a retry) rather than a structural defect;
each affected spec mirror notes it and recommends a quick visual pass once a human opens
`design/shell.pen` in the pen.dev GUI.

## Risks & rollback

Design-only: revert is `git revert` of the Story's commits, or delete the added `.pen`/`.md`
files. No migration, no running app, so no runtime rollback risk.

## Outcome

- **Shipped:** desktop-only pen.dev designs (all inside `design/shell.pen`) and spec mirrors for
  Dashboard, Jobs list + Job detail, Job form, Candidate search + Candidate profile, Pipeline
  board, Placements + Settings, and CV review queue (#100–#106), plus 3 new shared pattern
  components (delay status badge, AI suggestion tag, source quote) and their tokens, closing
  Story #32. Phone frames dropped everywhere per the 2026-09-18 desktop-only decision.
- **Changed files / areas:** `design/shell.pen`, `design/tokens.md`, 9 new `design/specs/*.md`
  mirrors, `docs/decisions/open-questions.md` (RC-2 cross-referenced, not resolved). See Files
  table above for the full breakdown, including the file-consolidation deviation.
- **Tests added or updated:** none — design-only change; see Test plan.
- **Verification:** `npm run lint` (pass, 1 pre-existing unrelated warning), `npm run typecheck`
  (pass); `get_app_state()`/`Get(document, ...)` confirmed all 9 desktop frames + 3 pattern
  components persisted correctly to `design/shell.pen` (mtime advanced from `15:00:56` to
  `16:25:09` SGT-equivalent local time, file grew 46 KB → 208 KB); see Verification section above for the screenshot caveat
  on 4 of the 9 frames.
- **Deviations:**
  1. All phone/phone-width scope dropped (instructed) — see spec.md's phone-AC-supersession table.
  2. #104's phone-first ordering dropped — desktop designed directly.
  3. RC-2 kept "Awaiting owner" rather than "Answered" (no reachable product owner) — see
     `docs/decisions/open-questions.md`.
  4. **File consolidation:** every screen lives in `design/shell.pen` as one shared document,
     not in separate `design/screens/*.pen` files, because the pencil MCP session resolved every
     `filePath` to the same live document backing the already-open `shell.pen` editor tab. No
     design content was lost; a human can split the file into per-screen `.pen` files in the
     pen.dev GUI as a follow-up.
  5. Disk persistence for this session's pen.dev work required an explicit save in the pen.dev
     desktop app partway through the task (confirmed via `design/shell.pen`'s mtime); before that
     save, no `.pen` content was committable. This did not affect the final result but is worth
     knowing for future design tasks in this repo.
  6. `TakeScreenshot` returned blank for the Candidate search, Candidate profile, Pipeline board
     and CV review queue frames despite `Get`-confirmed correct structure/bounds; treated as a
     tool-side rendering artifact (see Verification), not a design defect. Flagged for a quick
     human visual pass.
- **Fix rounds / escalations:** none — no executor code steps (every step used the `claude`
  executor tag directly via the pencil MCP, per `ui-design`; no `cursor-agent` calls were made for
  this Story).
- **Models used:** planning + all design steps — this session (Claude Sonnet 5, `claude` executor
  tag, direct via `mcp__pencil__execute`/`get_app_state`).
- **Claude direct fixes:** minor layout-overflow patches applied directly during design (explicit
  frame heights instead of relying on `fit_content` recomputation) on the Candidate profile and CV
  review queue frames, where the tool's `fit_content` sizing did not recompute after later
  insertions; documented in the affected spec mirrors.
- **Follow-ups:**
  1. RC-2 remains open pending a real product-owner decision on the CV review queue before it
     ships in the real-data release.
  2. Split `design/shell.pen`'s screen frames into separate `design/screens/*.pen` files in the
     pen.dev GUI, per `ui-design`'s proposed (not yet enforced) file layout.
  3. Visually confirm the Candidate search, Candidate profile, Pipeline board and CV review queue
     frames render as expected in the pen.dev GUI (screenshot caveat above).
  4. ui-build Tasks (E08-S04-T01, E05-S01-T03, etc.) consume these spec mirrors next.
