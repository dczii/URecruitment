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

Creating or editing a job: must-have/nice-to-have requirements, JD upload with a pre-fill
confirmation step, and the nationality/language reason-field gating the PRD's fairness rule
requires.

## Layout

- Page title "Create job — Senior Backend Engineer".
- **JD upload pre-fill card** (`CfSuj`, `ai-suggestion-bg`/`border` surface): states which file was
  read, carries the shared **AI suggestion tag** (`D3Bjz`), and gives two explicit recruiter
  actions — "Confirm pre-filled values" or "Edit before saving". Nothing pre-fills silently.
- **Requirement rows** (`T427iy`): each row is a field plus a two-option toggle,
  Must-have / Nice-to-have, with the selected option visually distinct (`accent` fill).
- **Nationality and language section** (`U2eAO`): a switch to mark nationality/language as a real
  requirement, and a **reason field** (`tPel3`) styled with a `destructive`-toned required marker,
  placeholder guidance, and an explicit note: "Nationality will not count toward the score until
  this reason is filled in." — the PRD's protected-attribute rule made unmissable in the UI, not
  just enforced silently server-side.
- **Validation/error state** (`KXC14`): a destructive banner naming exactly what's incomplete
  ("2 requirement rows are missing a must-have/nice-to-have choice, and the nationality reason is
  empty.").

## Patterns reused (AC2, AC6)

- `AiSuggestion` tag on the JD pre-fill card.
- The reason-field gating pattern is specific to this screen (no shared component existed for it);
  it reuses the `destructive` token consistently with the validation-error pattern so both read as
  "needs a recruiter's attention" the same way.

## Tokens

`background`, `card`, `border`, `input`, `foreground`, `muted-foreground`, `accent(-foreground)`,
`destructive(-foreground)`, `ai-suggestion-*`, `primary(-foreground)`, `font-sans`, `font-heading`,
`text-title`, `text-heading`, `text-label`, `text-caption`, `radius-md`, `radius-lg`.
