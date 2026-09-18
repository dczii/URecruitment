# Pipeline board

Visual source: `design/shell.pen` (`Desktop / Pipeline board / Default`, `yUxPG`) · Story: #32 ·
Design task: #104

Desktop only (1440 px) — no phone frame. #104's body asked for "phone frame first, then desktop";
per the 2026-09-18 desktop-only decision this ordering is dropped entirely and only the desktop
frame is designed. See the consolidation note in `design/specs/job-form.md`.

## Purpose

Moving a candidate through a job's pipeline, with delay status always visible as more than colour,
and every move both keyboard-reachable and attributed to a typed name.

## Layout

- Page title: job name.
- **Nine stage columns** (`auA59`): Sourced, Screening, Client review, Interview, Offer, Placed,
  Not shortlisted, Withdrawn, Not selected — the PRD's 7 working stages + 3 end states (Placed
  counted among the "end state" set here since it also carries no delay status).
- Each active-stage card shows the shared **Delay status badge** (word/icon + colour — on-track,
  due-soon, or overdue depending on stage).
- **End-state columns (Placed, Not shortlisted, Withdrawn, Not selected)** show the shared badge in
  its "Ended (no status)" variant — labelled "No delay status" rather than a coloured status word.
  This is a deliberate choice: an *explicit* "no delay status" label is more accessible than
  silently omitting the badge, since a missing element could otherwise read as a loading/error
  state rather than an intentional design outcome. ui-build may render this as no badge at all if
  that's confirmed preferable; either reading satisfies "end states show no delay status."
- **Non-drag move action** (`Move Button` in each card): a plain button, "Move… (Enter)", reachable
  by keyboard and Tab order — never a drag handle. Selecting it is where the typed-name prompt
  (same pattern as Candidate profile's edit mode) appears before the move commits.
- No AI-initiated move exists anywhere on this screen — every action is a labelled recruiter
  button.

## Patterns reused (AC2, AC8)

- Delay status badge (`RclSO`/`hrYVQ`/`Wc9Ra`/`PCAPi`), reused unchanged from Dashboard and Job
  detail.
- Typed-name prompt pattern (conceptually shared with `shell.pen`'s recruiter-name affordance and
  Candidate profile's edit mode) fires on every stage move.

## Tokens

`background`, `card`, `border`, `muted`, `foreground`, `status-*` (all four), `font-sans`,
`text-title`, `text-label`, `text-caption`, `radius-md`, `radius-sm`.
