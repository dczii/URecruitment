# Shared patterns

Story: #31 · Design task: #98 · Build task: #99

> **Note on the visual source.** `design/pattern.pen` (desktop + phone frames for every pattern
> below) could not be authored in this session because the pencil MCP tools require the target
> `.pen` file to already be open in the pen.dev desktop app, and no app session was available here.
> This spec was written directly from the PRD design rules and `design/tokens.md` instead. Creating
> `design/pattern.pen` from this spec — so the two stay in sync — is a follow-up once pen.dev is
> open (see the plan's Outcome/Follow-ups).

## Purpose

Shared delay-status, recruiter-identity, and empty/error/loading patterns. Product AI labels
(`AiSuggestion`, `SourceQuote`) were removed.

## Tokens used

All colour, type, spacing and radius values come from `design/tokens.md`. No hex values or raw pixel
sizes. Chinese text uses the `font-sans` stack, which already includes Noto Sans SC.

---

## 1. `DelayStatusBadge`

Shows a pipeline stage's delay status as an icon **and** a word, paired with colour — never colour
alone.

### Props

| Prop | Type | Required | Notes |
|---|---|---|---|
| `status` | `"on-track" \| "due-soon" \| "overdue" \| "none"` | yes | `"none"` = end state or Placed |
| `daysOverdue` | `number` | required when `status === "overdue"` | Whole SG working days |

### States / frames

| Status | Token | Icon | Label |
|---|---|---|---|
| `on-track` | `status-on-track` | `circle-check` | "On track" |
| `due-soon` | `status-due-soon` | `clock` | "Due soon" |
| `overdue` | `status-overdue` | `triangle-alert` | `"Overdue · {daysOverdue} days"` (singular "day" when 1) |
| `none` | — | — | Renders nothing (end states and Placed carry no status badge) |

- Badge is a `radius-sm` pill, `space-1`/`space-2` padding, icon (`14px`) + label in `text-label`,
  using the status's `-foreground` token on its background token.
- `aria-label` always states the status in full, independent of the visible label: e.g.
  `aria-label="Overdue by 3 working days"`, `aria-label="Due soon"`, `aria-label="On track"`.
- **Greyscale check:** because the badge always pairs an icon shape and a word with the colour, the
  status remains distinguishable with saturation at 0% — the icon shape and text differ per status.
- **Desktop / Phone** — identical; badge never wraps mid-label.

---

## 2. `TypedNameDialog`

Asks a recruiter to type their name before their first change on a device, and remembers it via
`src/lib/recruiter-name.ts` (a thin `localStorage` wrapper under a single versioned key,
`urec.recruiterName.v1`).

### Props

| Prop | Type | Required | Notes |
|---|---|---|---|
| `open` | `boolean` | yes | Controlled by the caller |
| `onOpenChange` | `(open: boolean) => void` | yes | |
| `initialName` | `string` | no | Pre-fills when changing an already-remembered name |
| `onSubmit` | `(name: string) => void` | yes | Called with the trimmed, validated name |

### States / frames

- **First use** — title `"What's your name?"`, body: `"We'll remember this on your device and use
  it to record who made each change."`, a labelled text input, and a `"Continue"` submit button
  disabled until the input has a non-blank, non-whitespace-only value.
- **Validation error** — blank or whitespace-only submission shows an inline error
  `"Enter your name to continue."` under the input and keeps focus there; the dialog never submits
  an empty/whitespace name.
- **Remembered** — the calling screen (not this dialog) shows `"Recording as {name} · Change"`; this
  dialog only reopens when that trigger is activated, pre-filled via `initialName`.
- **Changing the name** — same layout as first use, title `"Change your name"`, pre-filled input,
  submitting overwrites the stored name.
- **Desktop (1440)** — centered modal, `420px` max width.
- **Phone (390)** — full-width modal with `16px` side margins, `44px`-high input and buttons.

### Persistence contract (`src/lib/recruiter-name.ts`)

- `getStoredRecruiterName(): string | null` — reads and returns a trimmed name, or `null` if unset or
  the stored value is blank/whitespace-only.
- `setStoredRecruiterName(name: string): void` — trims and stores; throws (caller validates first) if
  given a blank/whitespace-only string.
- `isValidRecruiterName(name: string): boolean` — `false` for empty or whitespace-only input, `true`
  otherwise.
- Reads/writes are wrapped so a `localStorage`-unavailable environment (SSR, disabled storage) never
  throws — they degrade to "no remembered name" rather than crashing the page.

---

## 3. `EmptyState`, `ErrorState`, loading skeletons

Shared, screen-agnostic states so no screen invents its own.

### `EmptyState`

| Prop | Type | Required |
|---|---|---|
| `title` | `string` | yes |
| `description` | `string` | no |
| `action` | `ReactNode` | no |

Centered icon (Lucide `inbox`, `32px`, `muted-foreground`) + `text-heading` title + optional
`text-body muted-foreground` description + optional action slot. Same layout at both widths.

### `ErrorState`

| Prop | Type | Required |
|---|---|---|
| `title` | `string` | no — defaults to `"Something went wrong"` |
| `description` | `string` | no |
| `onRetry` | `() => void` | no — renders a "Try again" button when given |

Centered `triangle-alert` icon on `destructive`, same layout rules as `EmptyState`. Wrapped in
`role="alert"` so it is announced.

### Loading skeleton

A single `Skeleton` primitive (pulsing `muted` block, `radius-md`) plus two composed layouts:
`SkeletonRows` (stacked bars, for lists) and `SkeletonCard` (a card-shaped block, for tiles). No
copy; purely visual, `aria-hidden="true"` with an `aria-live="polite"` announcement owned by the
calling screen ("Loading …") rather than by the skeleton itself.

---

## Cross-cutting rules

- Every component here is presentational: no Supabase, no `fetch`, no server imports. They take only
  the data they render.
- Nothing in this file implies an automatic decision. No component here can advance, reject, or
  contact anyone.
