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

| File | Change |
|---|---|
| `design/screens/dashboard.pen` | new — #100 desktop frame(s) |
| `design/specs/dashboard.md` | new — #100 mirror |
| `design/screens/jobs.pen` | new — #101 desktop frame(s) (list + detail) |
| `design/specs/jobs.md`, `design/specs/job-detail.md` | new — #101 mirrors |
| `design/screens/job-form.pen` | new — #102 desktop frame(s) |
| `design/specs/job-form.md` | new — #102 mirror |
| `design/screens/search.pen`, `design/screens/candidate.pen` | new — #103 desktop frame(s) |
| `design/specs/search.md`, `design/specs/candidate.md` | new — #103 mirrors |
| `design/screens/pipeline.pen` | new — #104 desktop frame(s) |
| `design/specs/pipeline.md` | new — #104 mirror |
| `design/screens/placements.pen`, `design/screens/settings.pen` | new — #105 desktop frame(s) |
| `design/specs/placements.md`, `design/specs/settings.md` | new — #105 mirrors |
| `design/screens/review-queue.pen` | new — #106 desktop frame(s) |
| `design/specs/review-queue.md` | new — #106 mirror |
| `docs/decisions/open-questions.md` | modify — #106: cross-reference this Story from RC-2, no status change |

## Dependencies

- none (design-only; no npm packages, env vars, or migrations)

## Steps

- [ ] **S1** `claude` — Design `design/screens/dashboard.pen` (desktop, 1440 px): overdue list
  ordered by days over with delay badge + "waiting on" column, due-soon section, guarantee-ending
  section, filters (client/job/stage/owner), empty/loading/error states. Write
  `design/specs/dashboard.md`. Covers AC4.
  - Rules: `ui-design` (desktop-only frame, delay status word+icon, AI-suggestion labelling n/a
    here since dashboard has no AI output directly), `prd-context` pipeline-rules (delay
    thresholds, 30-day guarantee).
  - Verify: `get_app_state()` shows the new top-level frame(s) with no errors; spec mirror states
    sort order + empty behaviour (#100 AC1).
- [ ] **S2** `claude` — Design `design/screens/jobs.pen` (list + detail, desktop only): list with
  status/owner/gap-flag count/candidates-per-stage; detail with requirements, gap-flag checklist,
  ranked matches (score + reasons + source quote + model version/date), open-flag banner, embedded
  pipeline board. Write `design/specs/jobs.md` and `design/specs/job-detail.md`. Covers AC5.
  - Rules: `ui-design` (AI-suggestion + source-quote patterns, model version/date visible),
    `prd-context` (gap-check flags, matching).
  - Verify: `get_app_state()`; spec mirrors show score/reasons/source-text pattern and open-flag
    banner copy stating matching isn't blocked.
- [ ] **S3** `claude` — Design `design/screens/job-form.pen` (desktop only): requirement rows with
  must-have/nice-to-have choice, JD upload + pre-fill confirmation state, nationality/language
  reason field gating, validation/error states. Write `design/specs/job-form.md`. Covers AC6.
  - Rules: `ui-design`, `compliance-review` (reason-field fairness gating must be visually
    unmistakable), `prd-context` (protected-attribute rule).
  - Verify: `get_app_state()`; spec mirror confirms reason field blocks nationality/language
    until filled.
- [ ] **S4** `claude` — Design `design/screens/search.pen` and `design/screens/candidate.pen`
  (desktop only): search box + 5 filters (skills, years, location, language, CV date) + results
  with last-updated date; candidate profile with parsed fields + source quotes, edit mode showing
  edited-vs-parsed distinction and the typed-name prompt, stage history. Write
  `design/specs/search.md` and `design/specs/candidate.md`. Covers AC7.
  - Rules: `talent-search` (all 5 filters, hybrid ranking framing), `ui-design`
    (source-quote pattern, typed-name prompt), `prd-context`.
  - Verify: `get_app_state()`; spec mirrors list all 5 filters and show the edited/parsed visual
    distinction.
- [ ] **S5** `claude` — Design `design/screens/pipeline.pen` (desktop only, no phone-first framing):
  7 stages + 3 end states (Placed + 2 others show no delay status), non-drag keyboard-reachable
  move action, typed-name prompt on move. Write `design/specs/pipeline.md`. Covers AC8.
  - Rules: `ui-design` (delay status word+icon, typed-name prompt, "AI never advances a
    candidate"), `prd-context` pipeline-rules (7 stages, 3 end states, no status on end states).
  - Verify: `get_app_state()`; spec mirror lists all 10 columns and confirms end states carry no
    delay badge.
- [ ] **S6** `claude` — Design `design/screens/placements.pen` and `design/screens/settings.pen`
  (desktop only): start-date + 30-day guarantee countdown + 5-working-day flag; stage limits at
  default/client/job level with visible hierarchy, public holidays, change log with typed name +
  date. Write `design/specs/placements.md` and `design/specs/settings.md`. Covers AC9.
  - Rules: `prd-context` pipeline-rules (guarantee period, limit hierarchy job > client >
    default), `ui-design` (typed-name change log entries).
  - Verify: `get_app_state()`; spec mirrors show the hierarchy legibly and the change-log
    name+date pattern.
- [ ] **S7** `claude` — Design `design/screens/review-queue.pen` (desktop only): per-file name,
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
- [ ] **S8** `none` — Close-out verification: re-open `get_app_state()` for the whole document,
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
none — design-only Story (see spec.md Assumption 4): no source, migration, prompt or route
file changes. Verification is pen.dev's own validation (get_app_state showing frames with no
errors) plus manual review of the spec mirrors above.
```

## Risks & rollback

Design-only: revert is `git revert` of the Story's commits, or delete the added `.pen`/`.md`
files. No migration, no running app, so no runtime rollback risk.

## Outcome

- **Shipped:** desktop-only pen.dev designs and spec mirrors for Dashboard, Jobs/Job detail, Job
  form, Candidate search/profile, Pipeline board, Placements/Settings, and CV review queue
  (#100–#106), closing Story #32. Phone frames dropped everywhere per the 2026-09-18 desktop-only
  decision.
- **Changed files / areas:** see Files table above; `docs/decisions/open-questions.md` RC-2 cross-
  referenced, not resolved.
- **Tests added or updated:** none — design-only change; see Test plan.
- **Verification:** `get_app_state()` run after each step and at close-out; see plan.md Steps.
- **Deviations:** all phone/phone-width scope dropped (instructed); #104's phone-first ordering
  dropped; RC-2 kept "Awaiting owner" rather than "Answered" (no reachable product owner).
- **Fix rounds / escalations:** none — no executor code steps.
- **Models used:** planning + all design steps — this session (Claude Sonnet 5, `claude` executor
  tag, direct via pencil MCP; no `cursor-agent` calls were made for this Story).
- **Claude direct fixes:** n/a.
- **Follow-ups:** RC-2 remains open pending a real product-owner decision on the CV review queue
  before it ships in the real-data release; ui-build Tasks (E08-S04-T01, E05-S01-T03, etc.) consume
  these spec mirrors next.
