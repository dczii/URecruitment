# Jobs list

Visual source: `design/screens/jobs.pen` (`Desktop / Jobs list / Default`, `qIBfT`) · Story: #32 ·
Design task: #101

Desktop only (1440 px) — no phone frame; superseded by the 2026-09-18 desktop-only decision (see
`specs/014-mvp-screen-designs/spec.md`).

## Purpose

Recruiters browse every job: its status, owner, open gap-flag count and how many candidates sit in
each pipeline stage.

## Layout

- Page title "Browse jobs".
- One table, one row per job: title (a ZH title, "产品经理 (Product Manager)", proves Noto Sans SC
  rendering), client, status ("Open"/"On hold"), an **open gap-flag count chip** (amber
  `status-due-soon` when > 0, quiet `muted` when 0 — flags never block browsing), and a
  "N candidates in pipeline" summary standing in for the "candidates per stage" requirement (the
  per-stage breakdown itself lives on Job detail's embedded pipeline board).
- Owner column: out of the current mock rows but required by #101's scope — add an "Owner" column
  next to Status before build (recorded here since the mock only has 4 illustrative rows; ui-build
  adds it as a fifth column using the same row pattern).

## Tokens

`background`, `card`, `border`, `foreground`, `muted-foreground`, `muted`, `status-due-soon(-foreground)`,
`font-sans`, `font-heading`, `text-title`, `text-label`, `text-caption`, `radius-md`, `radius-sm`.

## USER brand theme (2026-10-02)

Use the shared logo-red, white and neutral-black palette in [tokens.md](../tokens.md), with light mode as default. Primary actions/focus use primary/ring; selected controls use accent; supporting content uses neutral muted/secondary. Status badges retain words/icons: on-track and ended are neutral, due-soon is outlined, overdue is red. No screen-specific literal colors. Existing layout, typography and domain behavior stay intact. `.pen` color reconciliation awaits supported Pencil tooling.
