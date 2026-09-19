# URecruitment design tokens

`design/tokens.pen` is the visual source of truth. This file is its readable implementation
contract. Token values are deliberately neutral and semantic because URecruitment has no approved
brand identity yet.

> **Divergence, 2026-09-20.** The values below were reset by the `ui-modernisation` pass
> (`analysis/03-ui-modernisation-spec.md`) and now match `src/app/globals.css`, not
> `design/tokens.pen`. The pen document is the stale side until someone reconciles it. Token
> names, CSS variables and Tailwind mappings are unchanged.

## Conventions

- Components use the Tailwind utility name, never the raw value.
- CSS custom properties use the documented CSS name. Tailwind v4 maps each one in `@theme inline`.
- Normal text contrast is at least **4.5:1**. Large text, UI glyphs, input borders and focus rings
  are at least **3:1**, following `docs/plans/accessibility-standard.md`.
- Delay status always combines the token with the specified word and icon. Colour is never the
  only cue.
- Scores and working-day counts use tabular numerals.

## Colour

| Token | Light | Dark | CSS variable | Tailwind token | Intended use |
|---|---:|---:|---|---|---|
| `background` | `#F9FAFB` | `#0B0F19` | `--background` | `bg-background` | App canvas |
| `foreground` | `#111827` | `#F3F4F6` | `--foreground` | `text-foreground` | Primary text |
| `card` | `#FFFFFF` | `#111827` | `--card` | `bg-card` | Raised content surface |
| `card-foreground` | `#111827` | `#F3F4F6` | `--card-foreground` | `text-card-foreground` | Text on cards |
| `popover` | `#FFFFFF` | `#111827` | `--popover` | `bg-popover` | Floating surface |
| `popover-foreground` | `#111827` | `#F3F4F6` | `--popover-foreground` | `text-popover-foreground` | Text on floating surfaces |
| `primary` | `#4338CA` | `#818CF8` | `--primary` | `bg-primary` | Primary action and active navigation |
| `primary-foreground` | `#FFFFFF` | `#1E1B4B` | `--primary-foreground` | `text-primary-foreground` | Text on primary |
| `secondary` | `#E5E7EB` | `#1F2937` | `--secondary` | `bg-secondary` | Secondary controls |
| `secondary-foreground` | `#111827` | `#F3F4F6` | `--secondary-foreground` | `text-secondary-foreground` | Text on secondary |
| `muted` | `#F3F4F6` | `#1F2937` | `--muted` | `bg-muted` | Quiet sections and disabled surfaces |
| `muted-foreground` | `#4B5563` | `#A1A1AA` | `--muted-foreground` | `text-muted-foreground` | Supporting text |
| `accent` | `#E0E7FF` | `#312E81` | `--accent` | `bg-accent` | Selected and highlighted rows |
| `accent-foreground` | `#3730A3` | `#E0E7FF` | `--accent-foreground` | `text-accent-foreground` | Text on accent |
| `destructive` | `#BE123C` | `#FB7185` | `--destructive` | `bg-destructive` | Destructive action or error |
| `destructive-foreground` | `#FFFFFF` | `#4C0519` | `--destructive-foreground` | `text-destructive-foreground` | Text on destructive |
| `border` | `#6B7280` | `#71717A` | `--border` | `border-border` | Meaningful control and region boundaries |
| `input` | `#6B7280` | `#71717A` | `--input` | `border-input` | Input boundary |
| `ring` | `#4F46E5` | `#818CF8` | `--ring` | `ring-ring` | Visible keyboard focus |

## Delay status

| Token | Light | Dark | CSS variable | Tailwind token | Required non-colour cue |
|---|---:|---:|---|---|---|
| `status-on-track` | `#D1FAE5` | `#022C22` | `--status-on-track` | `bg-status-on-track` | Circle-check icon + “On track” |
| `status-on-track-foreground` | `#065F46` | `#6EE7B7` | `--status-on-track-foreground` | `text-status-on-track-foreground` | Status text and icon |
| `status-due-soon` | `#FEF3C7` | `#451A03` | `--status-due-soon` | `bg-status-due-soon` | Clock icon + “Due soon” |
| `status-due-soon-foreground` | `#92400E` | `#FDE68A` | `--status-due-soon-foreground` | `text-status-due-soon-foreground` | Status text and icon |
| `status-overdue` | `#FFE4E6` | `#4C0519` | `--status-overdue` | `bg-status-overdue` | Triangle-alert icon + “Overdue · N days” |
| `status-overdue-foreground` | `#9F1239` | `#FDA4AF` | `--status-overdue-foreground` | `text-status-overdue-foreground` | Status text and icon |
| `status-ended` | `#E5E7EB` | `#1F2937` | `--status-ended` | `bg-status-ended` | End-state word; no delay badge |
| `status-ended-foreground` | `#374151` | `#D1D5DB` | `--status-ended-foreground` | `text-status-ended-foreground` | End-state text |

## Typography

The body stack is **Geist, Noto Sans SC, system-ui, sans-serif**. `Noto Sans SC` is explicitly
loaded by Next.js and covers Simplified Chinese. The mono stack is **Geist Mono, ui-monospace,
monospace**.

| Token | Value | CSS variable | Tailwind token | Usage |
|---|---|---|---|---|
| `font-sans` | `Geist, "Noto Sans SC", system-ui, sans-serif` | `--font-sans` | `font-sans` | UI and prose |
| `font-heading` | `Geist, "Noto Sans SC", system-ui, sans-serif` | `--font-heading` | `font-heading` | Headings |
| `font-mono` | `"Geist Mono", ui-monospace, monospace` | `--font-mono` | `font-mono` | Technical identifiers |
| `text-display` | `2.5rem / 2.75rem / 700` | `--text-display` | `text-display` | Rare page-level display |
| `text-title` | `1.75rem / 2.25rem / 700` | `--text-title` | `text-title` | Page title |
| `text-heading` | `1.0625rem / 1.5rem / 600` | `--text-heading` | `text-heading` | Section heading |
| `text-body` | `1rem / 1.5rem / 400` | `--text-body` | `text-body` | Default body |
| `text-label` | `0.875rem / 1.25rem / 500` | `--text-label` | `text-label` | Labels and controls |
| `text-caption` | `0.75rem / 1rem / 500` | `--text-caption` | `text-caption` | Supporting metadata |
| `numeric-tabular` | `tabular-nums` | `--numeric-tabular` | `tabular-nums` | Scores and day counts |

## Spacing

The scale is based on 4 CSS pixels. The raw value is documented here only; components use the
Tailwind token.

| Token | Value | CSS variable | Tailwind token |
|---|---:|---|---|
| `space-0` | `0` | `--space-0` | `p-0`, `gap-0` |
| `space-1` | `0.25rem` | `--space-1` | `p-1`, `gap-1` |
| `space-2` | `0.5rem` | `--space-2` | `p-2`, `gap-2` |
| `space-3` | `0.75rem` | `--space-3` | `p-3`, `gap-3` |
| `space-4` | `1rem` | `--space-4` | `p-4`, `gap-4` |
| `space-5` | `1.25rem` | `--space-5` | `p-5`, `gap-5` |
| `space-6` | `1.5rem` | `--space-6` | `p-6`, `gap-6` |
| `space-8` | `2rem` | `--space-8` | `p-8`, `gap-8` |
| `space-10` | `2.5rem` | `--space-10` | `p-10`, `gap-10` |
| `space-12` | `3rem` | `--space-12` | `p-12`, `gap-12` |
| `space-16` | `4rem` | `--space-16` | `p-16`, `gap-16` |

## Radius and shadow

| Token | Value | CSS variable | Tailwind token | Usage |
|---|---:|---|---|---|
| `radius-sm` | `0.375rem` | `--radius-sm` | `rounded-sm` | Compact controls |
| `radius-md` | `0.625rem` | `--radius-md` | `rounded-md` | Inputs and buttons |
| `radius-lg` | `1rem` | `--radius-lg` | `rounded-lg` | Cards and dialogs |
| `shadow-sm` | `0 1px 2px rgb(17 24 39 / 0.05), 0 1px 3px rgb(17 24 39 / 0.06)` | `--shadow-sm` | `shadow-sm` | Subtle separation |
| `shadow-md` | `0 12px 32px -12px rgb(17 24 39 / 0.22)` | `--shadow-md` | `shadow-md` | Floating surfaces |

## Shared patterns (added for Story #32, `design/shell.pen`)

`design/tokens.md`'s `status-*` colours were documented
above but not yet registered as pen.dev variables until Story #32 (#100–#106) needed them; they are
now defined via `SetVariables` in the live document and used by three reusable components:

| Component | Node id | Used by |
|---|---|---|
| Delay status badge — On track | `RclSO` | Dashboard, Pipeline |
| Delay status badge — Due soon | `hrYVQ` | Dashboard, Pipeline, Jobs list |
| Delay status badge — Overdue | `Wc9Ra` | Dashboard, Pipeline |
| Delay status badge — Ended (no status) | `PCAPi` | Pipeline, Placements |

Each delay badge instance pairs an icon (`circle-check`/`clock`/`triangle-alert`/`circle-slash`)
with a status word and the matching `status-*` colour — colour is never the only cue, per design
rule 2.

**Environment note:** every screen frame for Story #32 lives inside `design/shell.pen` (see the
consolidation note in `design/specs/job-form.md`) rather than in separate `design/screens/*.pen`
files, because the pencil MCP session available for this Story resolved every `filePath` to the
one live document backing the open `shell.pen` editor tab. Splitting into per-screen files is a
follow-up for a human working directly in the pen.dev GUI.

## Verified contrast

Ratios use WCAG relative luminance. Text pairings exceed 4.5:1; boundaries and focus indicators
exceed 3:1.

| Foreground / indicator | Surface | Ratio | Requirement |
|---|---|---:|---:|
| `foreground` | `background` | 16.98:1 | 4.5:1 |
| `card-foreground` | `card` | 17.74:1 | 4.5:1 |
| `muted-foreground` | `muted` | 6.87:1 | 4.5:1 |
| `primary-foreground` | `primary` | 7.90:1 | 4.5:1 |
| `secondary-foreground` | `secondary` | 14.33:1 | 4.5:1 |
| `accent-foreground` | `accent` | 8.06:1 | 4.5:1 |
| `destructive-foreground` | `destructive` | 6.29:1 | 4.5:1 |
| `border` | `card` | 4.83:1 | 3:1 |
| `ring` | `background` | 6.02:1 | 3:1 |
| `status-on-track-foreground` | `status-on-track` | 6.78:1 | 4.5:1 |
| `status-due-soon-foreground` | `status-due-soon` | 6.37:1 | 4.5:1 |
| `status-overdue-foreground` | `status-overdue` | 6.68:1 | 4.5:1 |
| `status-ended-foreground` | `status-ended` | 8.33:1 | 4.5:1 |

Dark-theme pairings are also mapped and checked, although separate dark-mode screen design remains
out of scope:

| Foreground / indicator | Surface | Ratio | Requirement |
|---|---|---:|---:|
| `foreground` | `background` | 17.40:1 | 4.5:1 |
| `card-foreground` | `card` | 16.12:1 | 4.5:1 |
| `muted-foreground` | `muted` | 5.73:1 | 4.5:1 |
| `primary-foreground` | `primary` | 5.36:1 | 4.5:1 |
| `secondary-foreground` | `secondary` | 13.34:1 | 4.5:1 |
| `accent-foreground` | `accent` | 9.27:1 | 4.5:1 |
| `destructive-foreground` | `destructive` | 5.81:1 | 4.5:1 |
| `border` | `card` | 3.67:1 | 3:1 |
| `ring` | `background` | 6.42:1 | 3:1 |
| `status-on-track-foreground` | `status-on-track` | 9.94:1 | 4.5:1 |
| `status-due-soon-foreground` | `status-due-soon` | 12.03:1 | 4.5:1 |
| `status-overdue-foreground` | `status-overdue` | 8.27:1 | 4.5:1 |
| `status-ended-foreground` | `status-ended` | 9.96:1 | 4.5:1 |
