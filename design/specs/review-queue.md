# CV review queue (proposed — RC-2 open)

Visual source: `design/shell.pen` (`Desktop / CV review queue / Default (proposed, RC-2 open)`,
`xxWgs`) · Story: #32 · Design task: #106

Desktop only (1440 px) — no phone frame; superseded by the 2026-09-18 desktop-only decision. See
the consolidation note in `design/specs/job-form.md`.

## Status: proposed and open, not decided

This screen is **not** in the PRD's screen list. It exists because CV processing requirement 2
(proposed) calls for a review queue for files that fail to parse. #106 asked for a product-owner
confirmation before finalizing the design. **No product owner is reachable in this MVP-prototype
context.** Per `docs/decisions/open-questions.md`, this is exactly **RC-2** ("Implied screens: CV
review queue, name prompt"), already recorded as **Awaiting owner**, naming #106. This design task
does **not** answer RC-2 — it designs the screen as a reasonable proposal per the PRD's proposed
requirement, while RC-2's status stays "Awaiting owner," not "Answered." A visible in-frame note
(`tAYO7`) says so directly, so nobody mistakes the mock for a decided screen.

## Purpose

Showing which sample CVs failed to parse, why, and letting a recruiter retry — never OCR, never an
automatic decision.

## Layout

- Page title "Files that need a look".
- **Open-question note banner** (`tAYO7`, `muted` surface): states plainly that this is a proposed
  screen pending a product-owner decision.
- **Failed files table** (`nTPhi`): one row per file —
  - file name (monospace),
  - the **rejection reason in recruiter language**, including the scanned-file rejection message
    ("This looks like a scanned or photographed page — there's no text to read. Please supply a
    text-based PDF or Word file.") and the legacy-format message,
  - a **Retry button** explicitly labelled "Retry (recruiter action)" — never automatic, matching
    "nothing looks like an automatic decision."
- No upload control on this screen — the MVP loads samples through the seed, not recruiter upload
  (a non-goal here).

## Tokens

`background`, `card`, `border`, `muted`, `foreground`, `muted-foreground`, `font-sans`,
`font-heading`, `font-mono`, `text-title`, `text-label`, `text-caption`, `radius-md`.
