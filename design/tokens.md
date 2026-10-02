# HRManagement design tokens

`design/tokens.pen` is the visual source of truth. This file is its readable implementation
contract. The palette uses USER logo red (`#BE2026`), white surfaces and neutral-black text.
Light mode is the default; semantic token names retain their existing meaning.

> **Brand update, 2026-10-02.** Values match `src/app/globals.css` and `specs/046-brand-theme/`.
> Pencil MCP is unavailable: `.pen` documents remain stale and require supported-tool reconciliation.

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
| `background` | `#FFFFFF` | `#0A0A0A` | `--background` | `bg-background` | App canvas |
| `foreground` | `#111111` | `#F5F5F5` | `--foreground` | `text-foreground` | Primary text |
| `card` | `#FFFFFF` | `#171717` | `--card` | `bg-card` | Raised content surface |
| `card-foreground` | `#111111` | `#F5F5F5` | `--card-foreground` | `text-card-foreground` | Text on cards |
| `popover` | `#FFFFFF` | `#171717` | `--popover` | `bg-popover` | Floating surface |
| `popover-foreground` | `#111111` | `#F5F5F5` | `--popover-foreground` | `text-popover-foreground` | Text on floating surfaces |
| `primary` | `#BE2026` | `#FF6970` | `--primary` | `bg-primary` | Primary action and active navigation |
| `primary-foreground` | `#FFFFFF` | `#111111` | `--primary-foreground` | `text-primary-foreground` | Text on primary |
| `secondary` | `#F5F5F5` | `#242424` | `--secondary` | `bg-secondary` | Secondary controls |
| `secondary-foreground` | `#111111` | `#F5F5F5` | `--secondary-foreground` | `text-secondary-foreground` | Text on secondary |
| `muted` | `#F5F5F5` | `#242424` | `--muted` | `bg-muted` | Quiet sections and disabled surfaces |
| `muted-foreground` | `#595959` | `#B3B3B3` | `--muted-foreground` | `text-muted-foreground` | Supporting text |
| `accent` | `#FFF1F2` | `#321416` | `--accent` | `bg-accent` | Selected and highlighted rows |
| `accent-foreground` | `#BE2026` | `#FF6970` | `--accent-foreground` | `text-accent-foreground` | Text on accent |
| `destructive` | `#991B20` | `#FF9A9F` | `--destructive` | `bg-destructive` | Destructive action or error |
| `destructive-foreground` | `#FFFFFF` | `#111111` | `--destructive-foreground` | `text-destructive-foreground` | Text on destructive |
| `border` | `#737373` | `#8A8A8A` | `--border` | `border-border` | Meaningful control and region boundaries |
| `input` | `#737373` | `#8A8A8A` | `--input` | `border-input` | Input boundary |
| `ring` | `#BE2026` | `#FF6970` | `--ring` | `ring-ring` | Visible keyboard focus |

## Delay status

| Token | Light | Dark | CSS variable | Tailwind token | Required non-colour cue |
|---|---:|---:|---|---|---|
| `status-on-track` | `#F5F5F5` | `#242424` | `--status-on-track` | `bg-status-on-track` | Circle-check icon + “On track” |
| `status-on-track-foreground` | `#111111` | `#F5F5F5` | `--status-on-track-foreground` | `text-status-on-track-foreground` | Status text and icon |
| `status-due-soon` | `#FFFFFF` | `#171717` | `--status-due-soon` | `bg-status-due-soon` | Clock icon + “Due soon” |
| `status-due-soon-foreground` | `#111111` | `#F5F5F5` | `--status-due-soon-foreground` | `text-status-due-soon-foreground` | Status text and icon |
| `status-overdue` | `#FFF1F2` | `#321416` | `--status-overdue` | `bg-status-overdue` | Triangle-alert icon + “Overdue · N days” |
| `status-overdue-foreground` | `#991B20` | `#FF9A9F` | `--status-overdue-foreground` | `text-status-overdue-foreground` | Status text and icon |
| `status-ended` | `#F5F5F5` | `#242424` | `--status-ended` | `bg-status-ended` | End-state word; no delay badge |
| `status-ended-foreground` | `#595959` | `#B3B3B3` | `--status-ended-foreground` | `text-status-ended-foreground` | End-state text |

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
| `shadow-sm` | `0 1px 2px rgb(0 0 0 / 0.05), 0 1px 3px rgb(0 0 0 / 0.06)` | `--shadow-sm` | `shadow-sm` | Subtle separation |
| `shadow-md` | `0 12px 32px -12px rgb(0 0 0 / 0.22)` | `--shadow-md` | `shadow-md` | Floating surfaces |

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
| `foreground` | `#111111` | `#F5F5F5` | 4.5:1 |
| `card-foreground` | `#111111` | `#F5F5F5` | 4.5:1 |
| `muted-foreground` | `#595959` | `#B3B3B3` | 4.5:1 |
| `primary-foreground` | `#FFFFFF` | `#111111` | 4.5:1 |
| `secondary-foreground` | `#111111` | `#F5F5F5` | 4.5:1 |
| `accent-foreground` | `#BE2026` | `#FF6970` | 4.5:1 |
| `destructive-foreground` | `#FFFFFF` | `#111111` | 4.5:1 |
| `border` | `#737373` | `#8A8A8A` | 3:1 |
| `ring` | `#BE2026` | `#FF6970` | 3:1 |
| `status-on-track-foreground` | `#111111` | `#F5F5F5` | 4.5:1 |
| `status-due-soon-foreground` | `#111111` | `#F5F5F5` | 4.5:1 |
| `status-overdue-foreground` | `#991B20` | `#FF9A9F` | 4.5:1 |
| `status-ended-foreground` | `#595959` | `#B3B3B3` | 4.5:1 |

Dark-theme pairings are also mapped and checked, although separate dark-mode screen design remains
out of scope:

| Foreground / indicator | Surface | Ratio | Requirement |
|---|---|---:|---:|
| `foreground` | `#111111` | `#F5F5F5` | 4.5:1 |
| `card-foreground` | `#111111` | `#F5F5F5` | 4.5:1 |
| `muted-foreground` | `#595959` | `#B3B3B3` | 4.5:1 |
| `primary-foreground` | `#FFFFFF` | `#111111` | 4.5:1 |
| `secondary-foreground` | `#111111` | `#F5F5F5` | 4.5:1 |
| `accent-foreground` | `#BE2026` | `#FF6970` | 4.5:1 |
| `destructive-foreground` | `#FFFFFF` | `#111111` | 4.5:1 |
| `border` | `#737373` | `#8A8A8A` | 3:1 |
| `ring` | `#BE2026` | `#FF6970` | 3:1 |
| `status-on-track-foreground` | `#111111` | `#F5F5F5` | 4.5:1 |
| `status-due-soon-foreground` | `#111111` | `#F5F5F5` | 4.5:1 |
| `status-overdue-foreground` | `#991B20` | `#FF9A9F` | 4.5:1 |
| `status-ended-foreground` | `#595959` | `#B3B3B3` | 4.5:1 |

## Brand application

White surfaces and restrained logo-red primary actions apply to every screen. Active navigation and selected rows use accent. Secondary actions and completion use neutral gray/black. Due-soon badges have a visible input-color outline; statuses retain words/icons. Inline content links are underlined. The logo uses semantic `brand-surface` (`#FFFFFF` in both themes) for readable black lettering.

Chart series use independent `chart-1` through `chart-5` variables: light `#BE2026`, `#111111`, `#595959`, `#991B20`, `#737373`; dark `#FF6970`, `#F5F5F5`, `#B3B3B3`, `#FF9A9F`, `#8A8A8A`. Future charts must distinguish series with labels/patterns, not color alone. Shadows use neutral-black RGB with unchanged geometry.

Measured solid pairs: white on logo red 6.13:1; light muted text 6.42:1; dark primary text 6.75:1; dark accent text 6.02:1. Rendered hover, alpha and focus states require browser verification.
