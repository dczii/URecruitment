# Job detail

Visual source: `design/screens/jobs.pen` (`Desktop / Job detail / Default`, `R9RfUp`) · Story: #32 ·
Design task: #101

Desktop only (1440 px) — no phone frame; superseded by the 2026-09-18 desktop-only decision.

## Purpose

Working one job: its requirements, its open missing-field flags, and the pipeline for that job,
without the recruiter feeling that anything decides for them.

## Layout

- Page title: job title + client.
- **Open-flag banner** (`YayUF`, `status-due-soon` surface): states the open gap-flag count —
  "3 open gap flags need a recruiter answer."
- Two columns:
  - **Requirements** (`h5tjsM`): each row tagged Must-have (destructive-toned label) or Nice-to-have.
  - **Gap-flag checklist** (`FXnTn`): one row per missing-field flag, each with the
    **client-facing question** a recruiter would ask, never an auto-resolution.
  - Recruiters use **Search for more candidates** to browse the talent database with filters for
    this job. There is no ranked match-score list.
- **Embedded pipeline board** (`hQM7k`) at the bottom: one compact column per stage
  (Sourced → Placed), reusing the same stage set as the full Pipeline board (#104) so the two never
  drift apart.

## Patterns reused (AC2, AC5)

- Nothing on this screen reads as an automatic decision: the banner and the gap checklist ask
  a recruiter to act.

## Tokens

`background`, `card`, `border`, `foreground`, `muted-foreground`, `muted`, `destructive`,
`status-due-soon(-foreground)`, `primary`, `font-sans`,
`font-heading`, `font-mono`, `text-title`, `text-heading`, `text-label`, `text-caption`,
`radius-md`, `radius-lg`, `radius-sm`.
