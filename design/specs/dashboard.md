# Dashboard

Visual source: `design/screens/dashboard.pen` · Story: #32 · Design task: #100

Desktop only (1440 px) — no phone frame. Superseded by the 2026-09-18 desktop-only decision; see
`docs/tasks/32-mvp-screen-designs/spec.md` Assumption 1.

## Purpose

The screen recruiters open first: overdue candidates ordered by days over, due-soon candidates,
guarantee end dates, and filters for client, job, stage and owner.

## Layout — `Desktop / Dashboard / Default` (`dQYR2`)

- Page title "What needs attention today", `text-title`/`font-heading`.
- Filter row: four chips — Client, Job, Stage, Owner — each a label + `chevron-down` icon
  (`card` surface, `border` stroke, `radius-md`). Selecting a value narrows every section below.
- **Overdue section** — heading "Overdue · ordered by days over". Table sorted by days over
  descending (6, 4, 3 in the mock). Each row: candidate name, job + client, current stage, the
  shared **Delay status badge** component (`design/tokens.pen` node `Wc9Ra`,
  "Overdue · N days" — triangle-alert icon + `status-overdue` colour, never colour alone), and a
  **Waiting on** column naming who owns the next action ("Recruiter — schedule interview" /
  "Client — awaiting feedback").
- **Due soon section** — heading "Due soon · 80% of the stage limit used" (the PRD's 80%
  threshold). Rows use the Due-soon badge (`hrYVQ`, clock icon) and show working-days-used copy
  instead of a waiting-on column.
- **Guarantee section** — heading "Guarantee ending". Rows use the Ended/no-status badge (`PCAPi`)
  relabelled "Guarantee" per row and a countdown in SG working days.
- No charts or metrics tiles — those are real-data-release success metrics, out of scope here.

## Sort order and empty behaviour (spec requirement)

- Overdue is always sorted by **days over, descending** — the most-overdue candidate first.
- Due soon and Guarantee sections are sorted by **soonest first** (fewest working days
  remaining/used).
- Each section renders independently: a client filter that empties Overdue does not hide Due soon
  or Guarantee, and vice versa.

## States — `Desktop / Dashboard / States (empty, loading, error)` (`gQi47`)

Three compact panels represent what each section shows when it has nothing to show, is loading, or
failed to load:
- **Empty** — circle-check icon, "No one is overdue, due soon or ending guarantee right now."
- **Loading** — loader icon, "Checking today's stage limits…"
- **Error** — triangle-alert icon, "Couldn't load the dashboard. Try again." (no auto-retry; a
  recruiter action, consistent with "nothing looks automatic").

## Patterns reused (AC2)

- Delay status badge (word/icon + colour, never colour alone) — `design/tokens.pen` `RclSO` /
  `hrYVQ` / `Wc9Ra` / `PCAPi`.
- Delay status is derived, not suggested. There is no product-AI chrome on this screen.

## Tokens

`background`, `card`, `border`, `foreground`, `muted-foreground`, `font-sans`, `font-heading`,
`text-title`, `text-heading`, `text-label`, `text-caption`, `status-*` (on-track/due-soon/overdue/
ended + foregrounds), `radius-sm`, `radius-md`.

## Desktop-only note

#100's original scope required a phone frame and 390 px reachability. Per the 2026-09-18
desktop-only decision this is **N/A**, not implemented — see spec.md for the full reasoning.
