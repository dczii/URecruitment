# Job detail

Visual source: `design/screens/jobs.pen` (`Desktop / Job detail / Default`, `R9RfUp`) · Story: #32 ·
Design task: #101

Desktop only (1440 px) — no phone frame; superseded by the 2026-09-18 desktop-only decision.

## Purpose

Working one job: its requirements, its open gap flags, ranked candidate matches, and the pipeline
for that job, without the recruiter feeling that anything decides for them.

## Layout

- Page title: job title + client.
- **Open-flag banner** (`YayUF`, `status-due-soon` surface): states the open gap-flag count and
  explicitly says matching is not blocked while flags are open — "3 open gap flags need a
  recruiter answer — matching is not blocked while they're open."
- Two columns:
  - **Requirements** (`h5tjsM`): each row tagged Must-have (destructive-toned label, since a
    missing must-have caps the score) or Nice-to-have.
  - **Gap-flag checklist** (`FXnTn`): one row per flag kind (Missing / Uncertain /
    Fair-employment), each with the **client-facing question** a recruiter would ask, never an
    auto-resolution. The fair-employment example ("native English speaker" → ask for the
    underlying skill) shows the pattern for protected-attribute-adjacent requests.
  - **Ranked matches** (`E6aRq`): one card per candidate — name, numeric score (`font-mono`,
    tabular), the shared **AI suggestion tag** (`design/tokens.pen` `D3Bjz`, sparkles icon +
    "AI suggestion"), the **model version and date** ("Scored by matcher v1.3 on 15 Sep 2026,
    09:12 SGT" — SGT display per hard rule 7), and the shared **Source quote** component
    (`design/tokens.pen` `b6W3X`) showing the exact CV text the score relied on.
- **Embedded pipeline board** (`hQM7k`) at the bottom: one compact column per stage
  (Sourced → Placed), reusing the same stage set as the full Pipeline board (#104) so the two never
  drift apart.

## Patterns reused (AC2, AC5)

- `AiSuggestion` tag + `SourceQuote` — every AI-derived number on this screen (the match score)
  carries both, satisfying design rule 1.
- Nothing on this screen reads as an automatic decision: the banner, the gap checklist and the
  match cards all phrase the AI's role as advisory language a recruiter acts on.

## Tokens

`background`, `card`, `border`, `foreground`, `muted-foreground`, `muted`, `destructive`,
`status-due-soon(-foreground)`, `primary`, `ai-suggestion-*`, `source-quote-*`, `font-sans`,
`font-heading`, `font-mono`, `text-title`, `text-heading`, `text-label`, `text-caption`,
`radius-md`, `radius-lg`, `radius-sm`.
