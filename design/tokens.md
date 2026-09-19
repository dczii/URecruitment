# URecruitment design tokens

`design/tokens.pen` is the visual source of truth. This file is its readable implementation
contract. Token values are deliberately neutral and semantic because URecruitment has no approved
brand identity yet.

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
| `background` | `#F8FAFC` | `#0F172A` | `--background` | `bg-background` | App canvas |
| `foreground` | `#0F172A` | `#F8FAFC` | `--foreground` | `text-foreground` | Primary text |
| `card` | `#FFFFFF` | `#111827` | `--card` | `bg-card` | Raised content surface |
| `card-foreground` | `#0F172A` | `#F8FAFC` | `--card-foreground` | `text-card-foreground` | Text on cards |
| `popover` | `#FFFFFF` | `#111827` | `--popover` | `bg-popover` | Floating surface |
| `popover-foreground` | `#0F172A` | `#F8FAFC` | `--popover-foreground` | `text-popover-foreground` | Text on floating surfaces |
| `primary` | `#1D4ED8` | `#60A5FA` | `--primary` | `bg-primary` | Primary action and active navigation |
| `primary-foreground` | `#FFFFFF` | `#0F172A` | `--primary-foreground` | `text-primary-foreground` | Text on primary |
| `secondary` | `#E2E8F0` | `#1E293B` | `--secondary` | `bg-secondary` | Secondary controls |
| `secondary-foreground` | `#0F172A` | `#F8FAFC` | `--secondary-foreground` | `text-secondary-foreground` | Text on secondary |
| `muted` | `#F1F5F9` | `#1E293B` | `--muted` | `bg-muted` | Quiet sections and disabled surfaces |
| `muted-foreground` | `#475569` | `#CBD5E1` | `--muted-foreground` | `text-muted-foreground` | Supporting text |
| `accent` | `#DBEAFE` | `#1E3A5F` | `--accent` | `bg-accent` | Selected and highlighted rows |
| `accent-foreground` | `#1E3A8A` | `#DBEAFE` | `--accent-foreground` | `text-accent-foreground` | Text on accent |
| `destructive` | `#B91C1C` | `#F87171` | `--destructive` | `bg-destructive` | Destructive action or error |
| `destructive-foreground` | `#FFFFFF` | `#450A0A` | `--destructive-foreground` | `text-destructive-foreground` | Text on destructive |
| `border` | `#64748B` | `#94A3B8` | `--border` | `border-border` | Meaningful control and region boundaries |
| `input` | `#64748B` | `#94A3B8` | `--input` | `border-input` | Input boundary |
| `ring` | `#2563EB` | `#60A5FA` | `--ring` | `ring-ring` | Visible keyboard focus |

## Delay status

| Token | Light | Dark | CSS variable | Tailwind token | Required non-colour cue |
|---|---:|---:|---|---|---|
| `status-on-track` | `#DCFCE7` | `#052E16` | `--status-on-track` | `bg-status-on-track` | Circle-check icon + “On track” |
| `status-on-track-foreground` | `#166534` | `#86EFAC` | `--status-on-track-foreground` | `text-status-on-track-foreground` | Status text and icon |
| `status-due-soon` | `#FEF3C7` | `#451A03` | `--status-due-soon` | `bg-status-due-soon` | Clock icon + “Due soon” |
| `status-due-soon-foreground` | `#92400E` | `#FDE68A` | `--status-due-soon-foreground` | `text-status-due-soon-foreground` | Status text and icon |
| `status-overdue` | `#FEE2E2` | `#450A0A` | `--status-overdue` | `bg-status-overdue` | Triangle-alert icon + “Overdue · N days” |
| `status-overdue-foreground` | `#991B1B` | `#FCA5A5` | `--status-overdue-foreground` | `text-status-overdue-foreground` | Status text and icon |
| `status-ended` | `#E2E8F0` | `#1E293B` | `--status-ended` | `bg-status-ended` | End-state word; no delay badge |
| `status-ended-foreground` | `#334155` | `#CBD5E1` | `--status-ended-foreground` | `text-status-ended-foreground` | End-state text |

## Typography

The body stack is **Geist, Noto Sans SC, system-ui, sans-serif**. `Noto Sans SC` is explicitly
loaded by Next.js and covers Simplified Chinese. The mono stack is **Geist Mono, ui-monospace,
monospace**.

| Token | Value | CSS variable | Tailwind token | Usage |
|---|---|---|---|---|
| `font-sans` | `Geist, "Noto Sans SC", system-ui, sans-serif` | `--font-sans` | `font-sans` | UI and prose |
| `font-heading` | `Geist, "Noto Sans SC", system-ui, sans-serif` | `--font-heading` | `font-heading` | Headings |
| `font-mono` | `"Geist Mono", ui-monospace, monospace` | `--font-mono` | `font-mono` | Technical identifiers |
| `text-display` | `2.25rem / 2.5rem / 700` | `--text-display` | `text-display` | Rare page-level display |
| `text-title` | `1.5rem / 2rem / 650` | `--text-title` | `text-title` | Page title |
| `text-heading` | `1.125rem / 1.75rem / 600` | `--text-heading` | `text-heading` | Section heading |
| `text-body` | `1rem / 1.5rem / 400` | `--text-body` | `text-body` | Default body |
| `text-label` | `0.875rem / 1.25rem / 600` | `--text-label` | `text-label` | Labels and controls |
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
| `radius-md` | `0.5rem` | `--radius-md` | `rounded-md` | Inputs and buttons |
| `radius-lg` | `0.75rem` | `--radius-lg` | `rounded-lg` | Cards and dialogs |
| `shadow-sm` | `0 1px 2px rgb(15 23 42 / 0.08)` | `--shadow-sm` | `shadow-sm` | Subtle separation |
| `shadow-md` | `0 8px 24px rgb(15 23 42 / 0.12)` | `--shadow-md` | `shadow-md` | Floating surfaces |

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
| `foreground` | `background` | 17.06:1 | 4.5:1 |
| `card-foreground` | `card` | 17.85:1 | 4.5:1 |
| `muted-foreground` | `muted` | 6.92:1 | 4.5:1 |
| `primary-foreground` | `primary` | 6.70:1 | 4.5:1 |
| `secondary-foreground` | `secondary` | 14.48:1 | 4.5:1 |
| `accent-foreground` | `accent` | 8.49:1 | 4.5:1 |
| `destructive-foreground` | `destructive` | 6.47:1 | 4.5:1 |
| `border` | `card` | 4.76:1 | 3:1 |
| `ring` | `background` | 4.94:1 | 3:1 |
| `status-on-track-foreground` | `status-on-track` | 6.49:1 | 4.5:1 |
| `status-due-soon-foreground` | `status-due-soon` | 6.37:1 | 4.5:1 |
| `status-overdue-foreground` | `status-overdue` | 6.80:1 | 4.5:1 |
| `status-ended-foreground` | `status-ended` | 8.40:1 | 4.5:1 |

Dark-theme pairings are also mapped and checked, although separate dark-mode screen design remains
out of scope:

| Foreground / indicator | Surface | Ratio | Requirement |
|---|---|---:|---:|
| `foreground` | `background` | 17.06:1 | 4.5:1 |
| `card-foreground` | `card` | 16.96:1 | 4.5:1 |
| `muted-foreground` | `muted` | 9.85:1 | 4.5:1 |
| `primary-foreground` | `primary` | 7.02:1 | 4.5:1 |
| `secondary-foreground` | `secondary` | 13.98:1 | 4.5:1 |
| `accent-foreground` | `accent` | 9.43:1 | 4.5:1 |
| `destructive-foreground` | `destructive` | 5.84:1 | 4.5:1 |
| `border` | `card` | 6.92:1 | 3:1 |
| `ring` | `background` | 7.02:1 | 3:1 |
| `status-on-track-foreground` | `status-on-track` | 10.62:1 | 4.5:1 |
| `status-due-soon-foreground` | `status-due-soon` | 12.03:1 | 4.5:1 |
| `status-overdue-foreground` | `status-overdue` | 8.51:1 | 4.5:1 |
| `status-ended-foreground` | `status-ended` | 9.85:1 | 4.5:1 |
