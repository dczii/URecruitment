# White, red and black brand theme plan

## Goal and branch

Apply a white-first USER brand theme across HRManagement: red for primary actions and selected navigation, black for text, and neutral grays for supporting surfaces. This plan now has a local implementation; see `specs/046-brand-theme/` for feature artifacts and validation.

- Branch: `design/white-red-black-theme`, created from the existing `work` branch.
- Original starting commit: `38e86121f951aa9ce9ded4b20e11e14b24e7c80d`.
- Current base after rebase: `origin/main` at `e01f31e58c18937b82492bb54d0ca0a062c166ff`; feature number is now 046.
- This branch does not establish that PR #247 has merged into main.

## Research and confidence

Requested source: https://user.com.sg (also attempted https://www.user.com.sg).
On 2026-10-02, the environment's egress proxy rejected both hosts with HTTP 403 before the site could be inspected. Domain additions were saved in the environment draft. Live website CSS, button states, and exact brand colors are therefore **not verified**.

Useful existing evidence: `public/user-logo.png`, already rendered by `src/components/patterns/AppNavigation.tsx`. Inspection of opaque pixels found `#BE2026` as the dominant red (18,661 pixels), and `#000000` as the main lettering color (4,813 pixels). Other shades are primarily antialiasing. These are measurements of the repository asset, not a claim about current website CSS.

The user has selected the existing logo as the color source. Adopt `#BE2026` as the brand red and black/white as the foundation. Website verification is optional reference research and no longer blocks design or implementation. Do not describe these choices as measurements of the live website.

## Implementation palette

| Role / existing tokens | Proposed light value | Usage |
|---|---|---|
| `background`, `card`, `popover` | `#FFFFFF` | White canvas, sidebar, header, cards and overlays |
| `foreground`, `card-foreground`, `popover-foreground`, `secondary-foreground` | `#111111` | Readable near-black text; existing logo retains true black |
| `primary`, `ring` | `#BE2026` | Main CTA, active indicator, links and visible focus |
| `primary-foreground` | `#FFFFFF` | Text/icons on red buttons |
| Primary hover reference | `#991B20` | Darker red direction; verify existing color-mix hover rather than adding a literal to components |
| `accent` | `#FFF1F2` | Active navigation and selected rows |
| `accent-foreground` | `#BE2026` | Active text/icons on pale red |
| `secondary`, `muted` | `#F5F5F5` | Quiet sections, secondary controls and disabled surfaces |
| `muted-foreground` | `#595959` | Supporting copy |
| `border`, `input` | `#737373` | Meaningful boundaries; check actual backgrounds and opacity |
| `destructive` | `#991B20` | Errors and destructive controls; retain explicit labels/icons and confirmation patterns |
| `destructive-foreground` | `#FFFFFF` | Filled error/destructive surfaces where used |

WCAG contrast calculations using sRGB relative luminance: white on `#BE2026` is approximately 6.13:1; near-black `#111111` on white is 18.88:1; gray `#595959` on white is 7.00:1. Verify final values and rendered states before implementation. Normal text must reach 4.5:1; large text, meaningful boundaries and focus indicators must reach 3:1. Contrast must be evaluated after opacity and color-mix are applied.

Keep the visual weight mostly white, with black text and restrained red accents. Avoid large red panels or using red for every secondary action.

## Status and dark-theme treatment

The requested overall palette includes status badges. Replace green/amber/rose status palettes with neutral and red treatments while retaining independent semantic token names:

- On track: neutral-gray surface, near-black text, circle-check icon and explicit label.
- Due soon: white/neutral surface, near-black text, clock icon, explicit label and visible outline.
- Overdue: pale-red surface, dark-red text, triangle-alert icon and days-overdue label.
- Ended: muted-gray surface and supporting-gray text with explicit end-state word.

Primary red and error red can coexist only with clear context, text and icon cues. Verify errors, overdue badges and primary actions remain distinguishable without color.

Light mode is the priority. Existing `.dark` variables must also lose indigo/blue undertones so there is no inconsistent fallback. Use a lighter red derived from the logo family for readable dark-mode controls. Preserve the logo on a white backing with enough padding in both themes; never recolor the image or allow its black lettering to disappear into a dark sidebar. Do not introduce a theme toggle.

### Complete semantic token values

These values specify all 27 existing color variables; existing chart/sidebar aliases inherit them.

| CSS variable | Light | Dark |
|---|---|---|
| `--background` | `#FFFFFF` | `#0A0A0A` |
| `--foreground` | `#111111` | `#F5F5F5` |
| `--card` | `#FFFFFF` | `#171717` |
| `--card-foreground` | `#111111` | `#F5F5F5` |
| `--popover` | `#FFFFFF` | `#171717` |
| `--popover-foreground` | `#111111` | `#F5F5F5` |
| `--primary` | `#BE2026` | `#FF6970` |
| `--primary-foreground` | `#FFFFFF` | `#111111` |
| `--secondary` | `#F5F5F5` | `#242424` |
| `--secondary-foreground` | `#111111` | `#F5F5F5` |
| `--muted` | `#F5F5F5` | `#242424` |
| `--muted-foreground` | `#595959` | `#B3B3B3` |
| `--accent` | `#FFF1F2` | `#321416` |
| `--accent-foreground` | `#BE2026` | `#FF6970` |
| `--destructive` | `#991B20` | `#FF9A9F` |
| `--destructive-foreground` | `#FFFFFF` | `#111111` |
| `--border` | `#737373` | `#8A8A8A` |
| `--input` | `#737373` | `#8A8A8A` |
| `--ring` | `#BE2026` | `#FF6970` |
| `--status-on-track` | `#F5F5F5` | `#242424` |
| `--status-on-track-foreground` | `#111111` | `#F5F5F5` |
| `--status-due-soon` | `#FFFFFF` | `#171717` |
| `--status-due-soon-foreground` | `#111111` | `#F5F5F5` |
| `--status-overdue` | `#FFF1F2` | `#321416` |
| `--status-overdue-foreground` | `#991B20` | `#FF9A9F` |
| `--status-ended` | `#F5F5F5` | `#242424` |
| `--status-ended-foreground` | `#595959` | `#B3B3B3` |

Additional measured pairs: light muted text on muted surface 6.42:1; dark primary text on primary fill 6.75:1; dark accent text on accent fill 6.02:1; dark overdue text on overdue fill 8.32:1. Input boundaries reach 4.35:1 against the light muted surface and 4.50:1 against dark secondary surfaces. These are solid-color calculations, not final rendered-state verification.

### Interaction and supporting-color rules

- Primary buttons: logo red with white text; darker red on hover/press. In dark mode use near-black text on the lighter-red fill. Evaluate the existing OKLCH color-mix hover in both themes.
- Secondary/outline buttons: white or neutral-gray surfaces with black text; neutral-gray hover. Ghost buttons remain neutral until selected.
- Links: brand red, underline on hover/focus; inline prose links receive a persistent underline so color is not their only distinguishing cue.
- Selected navigation, filter chips, tabs and rows: pale-red/deep-red accent surface, accent text and an explicit selected indicator. Checkboxes and switches use primary/primary-foreground.
- Focus: opaque red ring with contrasting offset; check every adjacent surface. Existing destructive-button translucent focus styling must be revised if it misses 3:1.
- Validation: dark-red text, visible border and error icon/message. Success/completion feedback uses neutral surfaces, check icon and explicit text; loading remains neutral. Do not use red for successful completion.
- Disabled controls: neutral-gray treatment; inspect inherited opacity so labels remain readable even where disabled controls are exempt from contrast requirements.
- Dividers: faint neutral gray is acceptable only for decorative separators. Keep input borders and meaningful boundaries opaque enough to meet 3:1. Review current `border-border/20` usage before retaining it.
- Shadows: replace blue-tinted RGB with `rgb(0 0 0 / ...)`, preserving existing size/opacity. Dialog scrims and skeletons remain neutral black/gray; tooltips use contrasting neutral surfaces.
- Charts: current aliases for chart 3/4 would become nearly identical neutral grays. Specify `chart-1` through `chart-5` independently as red, near-black, mid-gray, dark-red and light-gray, with labels plus patterns/strokes where needed. Do not reuse status semantics as chart series identities; verify adjacent series distinction and label contrast.

### Whole-app review matrix

| Area | Required color review |
|---|---|
| Desktop sidebar, mobile header/menu | Logo backing, active item, focus, hover, recruiter-name control |
| Dashboard | Filter selection, count cards, selection bar, delay badges, empty/loading/error states |
| Jobs list/new/detail and pipeline | Primary save/add/move actions, field errors, stage tabs/cards, selected rows, due-soon/overdue cues |
| Candidate profile and CV controls | Links, document actions, field flags, name dialogs, missing/empty states |
| Search and job-scoped results | Inputs, active filters, result selection, pagination, no-results state |
| Placements | Guarantee/overdue indicators, tables/cards, links and empty states |
| Settings and shared overlays | Save/reset/destructive actions, switch/checkbox states, dialog/sheet scrims, keyboard focus |
| Technical/error routes | Not-found and monitoring test screens, framework-independent error/loading feedback |

Review all areas at desktop and phone sizes, with light mode first and existing dark CSS states exercised explicitly.

## Implementation sequence

1. **Lock the logo-based palette.** Use the complete table above, calculate any new combinations and verify opaque/alpha states. Website access is not a prerequisite. Audit current color literals, semantic aliases and overlays before editing.
2. **Reconcile design documentation.** Update `design/tokens.md` and affected `design/specs/*.md` with light/dark colors and status treatments. The token document already notes divergence from `design/tokens.pen`; reconcile `.pen` variables and relevant screen frames through Pencil MCP only. Pencil tools are unavailable in this session, so do not directly read or edit `.pen` files or claim they are synchronized.
3. **Implement shared tokens.** Change `:root` and `.dark` in `src/app/globals.css`. Retain existing semantic token names and Tailwind mappings. Convert blue-tinted shadow RGB values to neutral black. Keep sidebar aliases; give chart series independent semantic variables if used so neutral statuses do not collapse them. Keep typography, spacing and responsive behavior stable.
4. **Audit components and screens.** Review `src/components/ui/button.tsx`, `badge.tsx`, input/field styling, `AppNavigation.tsx`, `DelayStatusBadge.tsx`, selection/filter controls and error states. Most already use semantic tokens and should update automatically. Correct only necessary overrides; never scatter literal colors through components. Review dashboard, jobs/new/detail/pipeline, candidate profile, search, placements, settings and shared dialogs at 1440px and 390px.
5. **Validate and record outcomes.** Check final computed colors in default, hover, pressed, selected, disabled, focus and error states. Validate contrast, grayscale comprehension and keyboard focus. Update meaningful existing contrast/status tests where needed; retain assertions. Run the checks below and capture representative desktop/phone screenshots before creating a reviewable implementation PR.

## Files expected in the implementation

- `src/app/globals.css` — semantic light/dark colors and neutral shadows.
- `design/tokens.md` — accurate color values, usage and contrast guidance.
- Relevant `design/specs/*.md` — navigation, forms, selection, status and error treatments.
- `design/tokens.pen` and relevant screen documents — only through supported Pencil tools.
- Shared component files above — only if token changes alone do not achieve a state or contrast requirement.
- Existing theme/contrast/status/browser tests — only where requirements need a meaningful assertion.

No database, dependencies, product logic, candidate workflow or remote deployment changes are required.

## Acceptance and verification

- No indigo/purple brand colors or blue-tinted neutral colors remain in either theme.
- White surfaces, black text and USER red consistently cover navigation, primary actions, links, focus, selection and feedback.
- Status meaning and destructive intent remain clear through words/icons, including without color.
- Existing USER logo remains readable; English and Simplified Chinese typography remains intact.
- Keyboard navigation, reduced motion, phone layout and overflow behavior continue to work.
- `design/tokens.md` and CSS agree on values; supported design documents are reconciled or explicitly marked pending.
- Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and `npm run test:e2e -- --workers=2` for implementation.
- Existing `src/app/theme-contract.test.ts` verifies token declarations/mappings, not full value equality or contrast; supplement with appropriate existing contrast checks and rendered-state review.
- Application browser validation currently requires a local Supabase stack. Its Postgres image extraction previously exceeded disk capacity. Report any blocked or fixture-skipped browser cases separately; a build or browser launch alone does not validate screens.

## Current outcome

Implemented locally on `design/white-red-black-theme`. Shared light/dark theme, white default, logo backing, outlined due-soon badges, independent chart colors and accessible link/focus treatments are in place. Readable design specs are synchronized. User subsequently authorized commit, push and PR creation; publication follows validation. Live-site research is optional and not claimed. See `specs/046-brand-theme/tasks.md` for validation and outstanding database/Pencil checks.
