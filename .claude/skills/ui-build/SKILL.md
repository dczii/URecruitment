---
name: ui-build
description: >
  Building HRManagement screens and components with shadcn/ui (on @base-ui/react) and Tailwind 4:
  tokens from design/tokens.md and src/app/globals.css, per-screen specs in design/specs,
  shared patterns (DelayStatusBadge, TypedNameDialog, states), accessibility standard, phone
  width, Chinese text, Singapore time, and pen.dev design work via the pencil MCP tools.
  Use for any component, page UI, styling, visual fix or design change.
---

# UI build

## Read first

- `design/tokens.md` (the readable token contract; it follows `src/app/globals.css` since the UI modernisation) and `design/specs/<screen>.md` (+ `design/specs/patterns.md`, `shell.md`). Specs are desktop-only at 1440 px; phone behaviour comes from `docs/plans/accessibility-standard.md`.
- `docs/ux/screen-inventory.md`, `docs/ux/flows.md`, and `analysis/03-ui-modernisation-spec.md` / `04-ui-modernisation-report.md` for the current visual direction.
- Existing code to extend: `src/components/patterns/*`, `src/components/features/<area>/*`, `src/components/ui/*`.
- `.pen` files (`design/*.pen`) are encrypted. Use only the pencil MCP tools (`mcp__pencil__*`); never Read or Grep them. If a spec and the `.pen` file disagree, the spec mirror in `design/` wins; fix the mirror in the same change.

## Rules

1. **Tokens only.** Colours, fonts and radii come from theme variables in `globals.css` and Tailwind 4 theme tokens. No hex, raw px font sizes or ad-hoc fonts in components. `src/app/theme-contract.test.ts` guards this.
2. **shadcn first.** Add primitives with `npx shadcn@latest add <name>` into `src/components/ui`; compose screens from `patterns/` and `features/<area>/`. Components use `@base-ui/react` primitives and `cva`. Don't hand-edit generated primitives beyond theming.
3. **Shared patterns:** `DelayStatusBadge` (icon + word + colour; `aria-label="Overdue by 3 working days"`), `TypedNameDialog` (asks before a first change, remembers on the device), `AppShell`/`AppNavigation`, empty/error/loading states. Reuse; don't fork.
4. **No automatic-decision UI.** Stage-changing controls are recruiter actions that need the typed name. Nothing pre-selected from a score; no AI-suggestion UI.
5. **Accessibility (WCAG 2.2 AA).** Semantic HTML, labelled inputs, visible focus, keyboard-operable stage moves (drag is optional), `aria-live="polite"` for async results, delay status never colour-only.
6. **Phone width (390 px).** Dashboard and pipeline fully usable; tables become cards; filters in a sheet; no horizontal page scroll.
7. **Chinese text.** Wrap in `lang="zh-Hans"`, font stack includes Noto Sans SC, truncate with CSS (`line-clamp`), test long names.
8. **Dates.** Only through the shared Singapore formatter; relative age plus absolute date in a tooltip.
9. **Data boundaries.** Components receive just the fields they render. Client components never import `src/server`. Signed file URLs are fetched on demand.
10. **Copy.** Plain recruiter language; gap flags read "Missing: salary range · Ask the client: …".

## Tests

Unit (Vitest + Testing Library) for patterns with logic. Playwright for each key screen at `desktop` (1440×900) and `phone` (390×844): renders seeded data, primary action works, badges contain words, `document.documentElement.scrollWidth <= innerWidth`. See `testing`.

## Visual check

Run the dev server (or open the Vercel preview) in the browser pane, screenshot desktop and phone, compare with `design/specs` and `design/exports`. List mismatches as findings.
