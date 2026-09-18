# Candidate search

Visual source: `design/shell.pen` (`Desktop / Candidate search / Default`, `HeMOy`) · Story: #32 ·
Design task: #103

Desktop only (1440 px) — no phone frame; the "collapse into a sheet at phone width" Done-when item
from #103 is **N/A**, superseded by the 2026-09-18 desktop-only decision. See the consolidation
note in `design/specs/job-form.md` — all screens live in `design/shell.pen`, one shared file.

## Purpose

Plain-language search over the internal talent database, narrowed by the PRD's five filters.

## Layout

- Page title "Find candidates".
- **Search box** (`mHyzQ`): a single plain-language input with placeholder text demonstrating the
  intended query style, mixing a filter-like phrase with a natural request — "ZH-speaking QA
  engineers in Singapore, 3+ years, CV updated this year" — showing the hybrid keyword + semantic
  framing from `talent-search` without exposing separate keyword/semantic boxes to the recruiter.
- **All five PRD filters** (`C3AZ4B`): Skills, Years, Location, Language, CV date — each a
  dropdown-style chip. Nothing about the layout precludes adding a source on/off switch later (the
  PRD's future external-source requirement).
- **Results table** (`N44GW`): candidate name (one ZH name, 李娜 (Li Na), proves Noto Sans SC),
  role/experience/location summary, and a **last-updated date** per result.
- **Empty / loading / error states** (`gLrod`): "No candidates match these filters yet." / "Searching
  the talent database…" / "Search failed. Try again."

## Tokens

`background`, `card`, `border`, `foreground`, `muted-foreground`, `font-sans`, `font-heading`,
`text-title`, `text-label`, `text-caption`, `radius-md`, `radius-lg`.
