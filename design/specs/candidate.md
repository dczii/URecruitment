# Candidate profile

Visual source: `design/shell.pen` (`Desktop / Candidate profile / Default`, `r1oMvl`) · Story: #32 ·
Design task: #103

Desktop only (1440 px) — no phone frame; superseded by the 2026-09-18 desktop-only decision. See
the consolidation note in `design/specs/job-form.md`.

## Purpose

Checking one candidate: recruiter-entered fields, later edits, the original file, and the stage
history.

## Layout

- Page title: candidate name (李娜 / Li Na — proves Noto Sans SC) + role.
- Two columns:
  - **Field card** (`NPgvP`): a stored value (e.g. "4 years" total experience) on a card. Recruiters
    type and edit these fields; there is no AI suggestion tag or source-quote chrome.
  - **Edited field card** (`wgWE8`): shows a recruiter override as a visible diff — the parsed
    value struck through, an arrow, the edited value, and an "Edited by Maya Tan" tag (`accent`
    surface) — so an edited field is never confused with an untouched parsed one.
  - **Edit-mode typed-name prompt** (`XRJyu`): "Recording as Maya Tan" + "Not you? Change the
    recorded name before saving this edit." appears in edit mode, per design rule 5.
  - **Stage history** (`m9pWG6`): a dated list of stage moves, each naming the recruiter and the
    SGT timestamp (hard rule 7).
  - **Original file link** (`aUlKf`): "View original CV (signed link)" — reflects that the CV opens
    through a short-lived signed URL, never a raw file path.

## Patterns reused (AC2, AC7)

- Typed-name prompt (shared with `shell.pen`'s recruiter-name affordance and the Pipeline move
  prompt) appears specifically in edit mode, not just once per device.

## Known layout note

The tool's own layout-overflow diagnostic (`ctx.problems` in `mcp__pencil__execute`) intermittently
flagged small (~18 px) overflows on this frame across several `Get` calls that did not reproduce in
node-bounds inspection after adjusting the frame height; this looked like a caching artifact of the
design tool rather than a real visual defect (the same pattern self-resolved on the Dashboard and
Job form frames earlier in the same session). Recommend a quick visual pass once a human opens
`design/shell.pen` in the pen.dev GUI before build.

## Tokens

`background`, `card`, `border`, `foreground`, `muted-foreground`, `accent(-foreground)`,
`font-sans`, `font-heading`, `font-mono`, `text-title`,
`text-heading`, `text-label`, `text-caption`, `radius-md`, `radius-lg`, `radius-sm`.
