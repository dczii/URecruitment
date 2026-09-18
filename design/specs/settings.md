# Settings

Visual source: `design/shell.pen` (`Desktop / Settings / Default`, `y6upov`) · Story: #32 ·
Design task: #105

Desktop only (1440 px) — no phone frame; superseded by the 2026-09-18 desktop-only decision. See
the consolidation note in `design/specs/job-form.md`.

## Purpose

Adjusting portal rules: stage limits at three levels, the SG public-holiday list working days are
counted against, and a change log that always names who changed what.

## Layout

- Page title "Adjust portal rules".
- **Stage limit hierarchy** (`t15dcc`): three rows — Default (5 working days), Client: Acme Ltd (4),
  Job: Senior Backend Engineer (3, highlighted `accent`) — with an explicit note, "applies to this
  job (most specific wins)", making the job > client > default precedence legible rather than
  implied.
- **Public holidays** (`e2YI6`): the SG public-holiday dates working-day counts exclude, in
  tabular-numeral monospace.
- **Change log** (`Ntfcm`): each entry names the setting changed, the **typed recruiter name**, and
  the SGT date/time — matching hard rule 8 (audit by typed name).

## Tokens

`background`, `card`, `border`, `accent(-foreground)`, `foreground`, `muted-foreground`,
`font-sans`, `font-heading`, `font-mono`, `text-title`, `text-heading`, `text-label`,
`text-caption`, `radius-md`, `radius-lg`, `radius-sm`.
