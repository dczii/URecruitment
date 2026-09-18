# Placements

Visual source: `design/shell.pen` (`Desktop / Placements / Default`, `meTSa`) · Story: #32 ·
Design task: #105

Desktop only (1440 px) — no phone frame; superseded by the 2026-09-18 desktop-only decision. See
the consolidation note in `design/specs/job-form.md`.

## Purpose

Following up after a placement: whether the start date is confirmed, the 30-day guarantee
countdown, and the 5-working-day-before-end flag.

## Layout

- Page title "Follow up after placement".
- One table (`gL0UV`), one row per placement:
  - Candidate name, job + client, **start date** (confirmed date, or "Start date not confirmed" —
    the guarantee clock and the 5-working-day flag both depend on that date existing).
  - **Guarantee countdown** in tabular numerals ("Guarantee: 26 of 30 days used" or "—" when the
    start date isn't confirmed yet).
  - **5-working-day flag** (`status-due-soon` chip, bell icon): "4 working days to guarantee end" —
    appears only once a placement enters that window; rows without a confirmed start date show
    "Waiting on start-date confirmation" instead.

## Tokens

`background`, `card`, `border`, `foreground`, `muted-foreground`, `status-due-soon(-foreground)`,
`font-sans`, `font-mono`, `text-title`, `text-label`, `text-caption`, `radius-md`, `radius-sm`.
