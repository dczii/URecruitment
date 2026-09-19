# Candidate search

Visual source: `design/shell.pen` (`Desktop / Candidate search / Default`, `HeMOy`) · Story: #32 ·
Design task: #103

Desktop only (1440 px) — no phone frame; the "collapse into a sheet at phone width" Done-when item
from #103 is **N/A**, superseded by the 2026-09-18 desktop-only decision. See the consolidation
note in `design/specs/job-form.md` — all screens live in `design/shell.pen`, one shared file.

## Purpose

Keyword and filter search over the internal talent database.

## Layout

- Page title "Find candidates".
- **Search box** (`mHyzQ`): a keyword input. Placeholder: "Skills, titles, employers".
- **Filters** (`C3AZ4B`): Skills, Years, Location, Language, CV date — recruiter-set fields that
  narrow the SQL query together with the keyword.
- **Results table** (`N44GW`): candidate name (one ZH name, 李娜 (Li Na), proves Noto Sans SC),
  role/experience/location summary, and a **last-updated date** per result.
- **Empty / loading / error states** (`gLrod`): "No candidates match these filters yet." / "Searching
  the talent database…" / "Search failed. Try again."

## Tokens

`background`, `card`, `border`, `foreground`, `muted-foreground`, `font-sans`, `font-heading`,
`text-title`, `text-label`, `text-caption`, `radius-md`, `radius-lg`.
