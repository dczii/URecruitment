# Job form

Visual source: `design/shell.pen` (`Desktop / Job form / Default`, `RywlM`) · Story: #32 ·
Design task: #102

Desktop only (1440 px) — no phone frame; superseded by the 2026-09-18 desktop-only decision.

**Consolidation note (deviation from `ui-design`'s proposed one-file-per-screen layout):** in this
session every `mcp__pencil__execute filePath` resolved to the single live document backing the
open `design/shell.pen` editor tab — there was no way to create or persist a genuinely separate
`design/screens/job-form.pen` file. All 7 Task screens for this Story live as top-level frames
inside `design/shell.pen`. This is recorded as an Assumption in
`docs/tasks/32-mvp-screen-designs/spec.md`; splitting into per-screen files is a follow-up for a
human working in the pen.dev GUI, not a loss of design content.

## Purpose

Creating or editing a job: must-have/nice-to-have requirements and the nationality/language
reason-field gating the fairness rule.

## Layout

- Page title "Create job — Senior Backend Engineer".
- **Requirement rows** (`T427iy`): each row is a field plus a two-option toggle,
  Must-have / Nice-to-have, with the selected option visually distinct (`accent` fill).
- **Nationality and language section** (`U2eAO`): a switch to mark nationality/language as a real
  requirement, and a **reason field** (`tPel3`) styled with a `destructive`-toned required marker,
  placeholder guidance, and an explicit note: "Nationality will not be treated as a requirement until
  this reason is filled in."
- **Validation/error state** (`KXC14`): a destructive banner naming exactly what's incomplete
  ("2 requirement rows are missing a must-have/nice-to-have choice, and the nationality reason is
  empty.").

## Patterns reused (AC2, AC6)

- Recruiters type the job title, requirements, and nationality/language reasons themselves. There
  is no JD upload pre-fill.
- The reason-field gating pattern is specific to this screen (no shared component existed for it);
  it reuses the `destructive` token consistently with the validation-error pattern so both read as
  "needs a recruiter's attention" the same way.

## Tokens

`background`, `card`, `border`, `input`, `foreground`, `muted-foreground`, `accent(-foreground)`,
`destructive(-foreground)`, `primary(-foreground)`, `font-sans`, `font-heading`,
`text-title`, `text-heading`, `text-label`, `text-caption`, `radius-md`, `radius-lg`.
