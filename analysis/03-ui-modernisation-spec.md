# 03 — UI Modernisation Spec

Status: **draft for Checkpoint 2**. No source file has been edited.

## Decision recap and delivery mechanism

At Checkpoint 1 the choice was to **run Phase 3 as scoped in the brief**: a new visual system, not sourced from `design/*.pen`, accepting that the two will diverge until someone reconciles them.

Two things in the repo fix *where* the new values can live. Neither is a design choice:

| Constraint | Evidence | Consequence |
|---|---|---|
| A unit test requires every colour token to be assigned in the `:root` and `.dark` blocks of `src/app/globals.css` and mapped in its `@theme inline` block. It checks names, not values. | [src/app/theme-contract.test.ts:211-266](../src/app/theme-contract.test.ts) | New token **values** go into `globals.css`, the existing shared stylesheet. If they moved to another file, `globals.css` would keep stale values that silently lose the cascade. No token is added or renamed, so the test (53 tokens) stays green without edits. |
| A custom ESLint rule fails the build on hex colours or pixel font sizes anywhere in `src/components/**` | [eslint.config.mjs:9-61](../eslint.config.mjs) | Components keep using token utilities (`bg-card`, `text-label`...). Every colour lives in the stylesheet, never on a page. |

So: **one shared stylesheet with CSS variables** (`globals.css`, new values) plus **shared partials**, meaning new presentation primitives in `src/components/ui/` (`Card`, `Badge`, `Input`, `Select`, `Textarea`, `Table`) and a restyled `Button`. Pages switch from hand-rolled class strings to those primitives. This is the brief's "style through shared files", and it closes finding #2 from [02](02-improvement-recommendations.md).

No new library. Tailwind v4, shadcn/ui, lucide icons and the existing Geist + Noto Sans SC fonts cover everything below.

## What the before screenshots show

18 shots in [screenshots/before/](screenshots/before/): 9 views × desktop 1440 px and mobile 390 px, captured from `https://u-recruitment.vercel.app` on 2026-09-19. The problems worth solving:

| # | Observation | Where it comes from |
|---|---|---|
| V1 | Every card, table row and section has a dark 1 px outline, so pages read as a grid of boxes. The same 3:1 `border` colour (meant for controls) is used for decorative separators. | `border-border` on cards and rows, e.g. [src/app/jobs/page.tsx:28,81](../src/app/jobs/page.tsx), [src/app/jobs/[id]/page.tsx:79,120](../src/app/jobs/[id]/page.tsx) |
| V2 | On phones, tables squeeze the Job column into 4–5-line cells (dashboard rows are ~120 px tall). Status/Flag columns sit off-screen with no scroll cue. | [src/components/features/dashboard/Dashboard.tsx:8](../src/components/features/dashboard/Dashboard.tsx), `dashboard-mobile.png`, `placements-mobile.png` |
| V3 | Side-by-side cards stretch to the taller one's height, leaving a large empty box (Requirements on job detail, Stage history on candidate). | [src/app/jobs/[id]/page.tsx:76](../src/app/jobs/[id]/page.tsx), [CandidateProfile.tsx:97](../src/components/features/cv-processing/CandidateProfile.tsx) |
| V4 | The switch "off" state is nearly invisible: a `bg-muted` track on the `background` canvas is about 1.04:1, failing WCAG 1.4.11 (3:1 for UI components). | [src/components/features/jobs/JobForm.tsx:434-438](../src/components/features/jobs/JobForm.tsx) |
| V5 | On phones the requirement text box shrinks to ~88 px beside the Must-have/Nice-to-have toggle. | [JobForm.tsx:314-328](../src/components/features/jobs/JobForm.tsx), `jobs-new-mobile.png` |
| V6 | Buttons are 32 px tall (`h-8`) with `text-sm`, below the 44 px touch target on phones, and bypass the type tokens (Resolve/Dismiss/Update/Edit). | [src/components/ui/button.tsx:22-23](../src/components/ui/button.tsx) |
| V7 | "Must-have" uses the solid `destructive` red, which reads as an error rather than a priority. | [src/app/jobs/[id]/page.tsx:124-126](../src/app/jobs/[id]/page.tsx) |
| V8 | Three different badge shapes/weights for status-like labels; the open-gap-flag banner is a flat tinted strip with no icon. | [02](02-improvement-recommendations.md) #2; [src/app/jobs/[id]/page.tsx:69](../src/app/jobs/[id]/page.tsx) |

## Design direction

**Feel:** calm, light, data-dense. Structure comes from white surfaces with soft elevation on a cool-grey canvas, not from outlines. The accent is indigo, which clearly differs from the current blue. Status colours keep their meaning (green / amber / rose / grey) and are always paired with the existing icon + word (PRD rule, [DelayStatusBadge.tsx:34-57](../src/components/patterns/DelayStatusBadge.tsx)).

### Colour

Every text/surface pair below was computed with the WCAG 2.x relative-luminance formula: **40 of 40 pairs pass AA** (4.5:1 text, 3:1 UI). The script is reproducible and will be rerun in Step 3.

| Token | Light | Dark | Key pair → ratio (light / dark) |
|---|---|---|---|
| `background` | `#F9FAFB` | `#0B0F19` | foreground on it → 16.98 / 17.40 |
| `foreground` | `#111827` | `#F3F4F6` | |
| `card`, `popover` | `#FFFFFF` | `#111827` | foreground on it → 17.74 / 16.12 |
| `card-foreground`, `popover-foreground` | `#111827` | `#F3F4F6` | |
| `primary` | `#4338CA` | `#818CF8` | primary-foreground on it → 7.90 / 5.36; as link text on card → 7.90 / 5.95 |
| `primary-foreground` | `#FFFFFF` | `#1E1B4B` | |
| `secondary` | `#E5E7EB` | `#1F2937` | secondary-foreground on it → 14.33 / 13.34 |
| `secondary-foreground` | `#111827` | `#F3F4F6` | |
| `muted` | `#F3F4F6` | `#1F2937` | muted-foreground on it → 6.87 / 5.73 |
| `muted-foreground` | `#4B5563` | `#A1A1AA` | on background → 7.23 / 7.47 |
| `accent` | `#E0E7FF` | `#312E81` | accent-foreground on it → 8.06 / 9.27 |
| `accent-foreground` | `#3730A3` | `#E0E7FF` | |
| `destructive` | `#BE123C` | `#FB7185` | destructive-foreground on it → 6.29 / 5.81 |
| `destructive-foreground` | `#FFFFFF` | `#4C0519` | |
| `border`, `input` | `#6B7280` | `#71717A` | against card → 4.83 / 3.67 (≥ 3:1, for control boundaries) |
| `ring` | `#4F46E5` | `#818CF8` | against card → 6.29 / 5.95 |
| `status-on-track` / `-foreground` | `#D1FAE5` / `#065F46` | `#022C22` / `#6EE7B7` | 6.78 / 9.94 |
| `status-due-soon` / `-foreground` | `#FEF3C7` / `#92400E` | `#451A03` / `#FDE68A` | 6.37 / 12.03 |
| `status-overdue` / `-foreground` | `#FFE4E6` / `#9F1239` | `#4C0519` / `#FDA4AF` | 6.68 / 8.27 |
| `status-ended` / `-foreground` | `#E5E7EB` / `#374151` | `#1F2937` / `#D1D5DB` | 8.33 / 9.96 |

**Dividers.** Decorative separators (card outlines, table row lines) use `border-border/20`, a tint of the same token, so no new token is needed. Inputs, selects, the segmented control and outline buttons keep the full-strength `border-input` (≥ 3:1), because WCAG 1.4.11 applies to controls, not to decorative lines.

Dark values are provided because the `.dark` block must exist (test above), but **nothing in the app switches dark mode on** (no `dark` class is ever applied in `src/`). Dark mode is therefore specified and contrast-checked, not screenshotted.

### Typography

Same families: Geist Sans, Noto Sans SC for CJK, Geist Mono. Same token names, new values:

| Token | Before | After | Used for |
|---|---|---|---|
| `text-display` | 36/40, 700 | 40/44, 700 | not used on current pages |
| `text-title` | 24/32, 650 | 28/36, 700, plus `tracking-tight` on page titles | page `h1` |
| `text-heading` | 18/28, 600 | 17/24, 600 | section `h2`, header page name |
| `text-body` | 16/24, 400 | 16/24, 400 (unchanged; readability floor) | paragraphs |
| `text-label` | 14/20, **600** | 14/20, **500** | table cells, form labels (labels keep explicit `font-semibold`) |
| `text-caption` | 12/16, 500 | 12/16, 500 + `tracking-wide` in table headers | table headers, helper text |

The biggest visual change is `text-label` dropping to weight 500. Tables are currently bold throughout, which is a large part of the heavy look.

### Spacing, radius, shadow

| Token | Before | After |
|---|---|---|
| Spacing scale `space-0…16` | 4 px base | **Unchanged.** It's sound. Usage changes: card padding `p-4` → `p-5 lg:p-6`, page gutter `lg:p-8` → `lg:px-10 lg:py-8`, section gap stays `gap-6` |
| `radius-sm` / `-md` / `-lg` | 6 / 8 / 12 px | 6 / 10 / 16 px. Badges become `rounded-full` pills |
| `shadow-sm` | `0 1px 2px rgb(15 23 42 / 8%)` | `0 1px 2px rgb(17 24 39 / 5%), 0 1px 3px rgb(17 24 39 / 6%)` for cards and tables |
| `shadow-md` | `0 8px 24px rgb(15 23 42 / 12%)` | `0 12px 32px -12px rgb(17 24 39 / 22%)` for dialog, sheet and sticky header |

### Component styles (shared, built once)

| Component | Style | File |
|---|---|---|
| **Button** | Heights `h-10` desktop / `h-11` below `lg` (44 px touch). Uses `text-label` instead of `text-sm`. `default` = indigo solid + `shadow-sm`, hover darkens 8% via `color-mix`; `outline` = card surface + `border-input`; `ghost`, `link`, `destructive` (tinted) keep their roles. Focus: `ring-2 ring-ring ring-offset-2`. Disabled: 50% opacity. Variant and size **names unchanged**, so no call site breaks. | `src/components/ui/button.tsx` |
| **Input / Select / Textarea** (new) | `h-10` (`h-11` below `lg`), `rounded-md`, `bg-card`, `border-input`, placeholder `muted-foreground`, focus = `border-ring` + 3 px `ring/40`, `aria-invalid` = destructive border. Plain pass-through wrappers: every prop (`id`, `name`, `value`, `onChange`, `aria-*`, `required`, `type`) is forwarded untouched. | `src/components/ui/input.tsx`, `select.tsx`, `textarea.tsx` |
| **Card** (new) | `rounded-lg bg-card shadow-sm border border-border/20`, padding `p-5 lg:p-6`, optional header row (title + action). Renders `<section>` or `<div>` as the caller passes; `aria-labelledby` forwarded. | `src/components/ui/card.tsx` |
| **Table** (new) | Keeps the native `<table>/<thead>/<tbody>/<tr>/<th scope>` structure and `<caption>`. Wrapper = Card look + `overflow-x-auto`. Header row `bg-muted/60`, `text-caption tracking-wide text-muted-foreground`. Row dividers `border-border/20`, row hover `bg-muted/50`. **Phone:** cells `whitespace-nowrap`, first column `sticky left-0 bg-card` so the name stays visible while the rest scrolls sideways, and a right-edge fade shows there's more. Rows stay one line tall instead of five. | `src/components/ui/table.tsx` |
| **Badge** (new) | `rounded-full px-2.5 py-0.5 text-caption font-semibold` with variants `neutral`, `accent`, `outline`, `on-track`, `due-soon`, `overdue`, `ended`. `DelayStatusBadge` is rebuilt on it and keeps its icon + word + `aria-label` exactly. | `src/components/ui/badge.tsx`, `src/components/patterns/DelayStatusBadge.tsx` |
| **Alert strip** | Tinted status background + `border-l-4` in the status foreground colour + leading lucide icon (`aria-hidden`). Text unchanged. | used in place on job detail, JobForm banner |
| **Switch** | Off: `bg-input` track (4.6:1 against canvas, fixes V4) with white knob. On: `bg-primary`. Same `role="switch"`, `aria-checked`, `id`. | in place, `JobForm.tsx` |
| **Segmented control** (Must-have / Nice-to-have) | `bg-muted p-0.5 rounded-md` track. The selected item is a raised `bg-card shadow-sm text-foreground font-semibold` chip, so the selected state is shown by elevation and weight, not just colour. Same `aria-pressed` buttons. | in place, `JobForm.tsx` |
| **Navigation** | Sidebar: `bg-card` with `border-r border-border/20`, items `h-10 rounded-md`. Active = `bg-accent text-accent-foreground` plus a 3 px indigo bar on the left edge. Hover `bg-muted`. Brand mark `rounded-lg` with a subtle gradient from `primary` to `ring`. Header: `sticky top-0`, `bg-card/85 backdrop-blur`, bottom divider `border-border/20`. Mobile sheet gets the same item styling. | `src/components/patterns/AppNavigation.tsx`, `AppShell.tsx` |
| **Page header** | `h1` `text-title tracking-tight`, supporting text below in `text-body text-muted-foreground`, primary action (e.g. "New job") on the right, restyled as a **button-looking link** (still an `<a href>`, same text). | per page, same markup |
| **Empty / error states** | Icon in a `size-12 rounded-full bg-muted` disc, text unchanged. | `src/components/patterns/states.tsx` |

## Implementation order (branch `ui-modernisation`, one commit each)

1. `style(ui): new colour, type, radius and shadow values in globals.css`
2. `style(ui): restyle Button; add Card, Badge, Input, Select, Textarea, Table primitives`
3. `style(shell): navigation, header and page gutter`
4. One `style(<page>): …` commit per page below, in inventory order.

## Per-page plan

Each page lists what changes and what must stay the same. Every "must stay" item is checked in Step 3 against [checklists/before.json](checklists/before.json), a structural snapshot of the deployed pages captured before any edit: every control's tag/type/`name`/`id`/label, every button and link with its accessible name, every heading, and a hash of the main text. Items also used as selectors by the Playwright suite are marked **(e2e)**.

`name`/`id` values produced by React's `useId()` (e.g. job title `name="_R_…_-title"`) are recorded as `<react-generated>`. The literal part (`-title`, `-owner`) and the label must match. Any other `name`/`id` must match byte for byte.

### Shell: navigation + header (every page)
- **Changes:** sidebar, active indicator, sticky blurred header, mobile sheet styling, page gutter.
- **Must stay:** skip link to `#main-content`; `main#main-content` with `tabIndex=-1` **(e2e)**; 5 nav links with the same text and hrefs (`/dashboard`, `/jobs`, `/search`, `/placements`, `/settings`) **(e2e)**; `aria-current="page"` logic; "Open navigation" / "Close navigation" buttons **(e2e)**; sheet opens/closes; "Recording as Maya Tan" visible **(e2e)**; "MVP prototype / Fictional data only" notice; no horizontal page scroll at 390 px **(e2e)**.

### `/` → redirect
- **Changes:** none (no UI).
- **Must stay:** redirects to `/dashboard`.

### `/dashboard`
- **Changes:** filter bar becomes a Card with shared `Select`s laid out as a 2-column grid on phones and 4 columns on desktop; the three sections become Table cards with section headings; phone tables get one-line rows + sticky candidate column (fixes V2); status pills via Badge.
- **Must stay:** `h1` "What needs attention today" **(e2e)**; `aria-label="Dashboard filters"` **(e2e)**; 4 selects labelled Client / Job / Stage / Owner **(e2e: Client, Stage)**, each with "All" first and the same `onChange` → URL param behaviour; 3 `h2`s with their exact text; column headers and order; `DelayStatusBadge` word + icon + `aria-label`; "Guarantee ended" / "Guarantee ending soon" labels; `tbody tr` rows **(e2e)**.

### `/jobs`
- **Changes:** page header with "New job" styled as a primary button-link; Table component; flag-count pill via Badge (`due-soon` when > 0, `neutral` at 0); title link styled `font-semibold` with hover underline.
- **Must stay:** `h1` "Browse jobs"; "New job" link → `/jobs/new`; sr-only `<caption>` text; 6 column headers in order; row `th scope="row"` link → `/jobs/{id}` with `lang="zh-Hans"` on CJK titles **(e2e)**; "N open flag(s)" and "N candidate(s) in pipeline" text and `aria-label`s **(e2e)**; "No jobs yet." empty text.

### `/jobs/new`
- **Changes:** three sections become Cards; shared `Input`/`Select`/`Textarea`; requirement row stacks the text box above the toggle on phones (fixes V5); segmented control and switch restyled (fixes V4); "Save job" as a full-width primary button on phones, right-aligned on desktop; banner as Alert strip.
- **Must stay:** labels Job title / Owner name / Client / Requirement N **(e2e)**; `select name="client_id"` and its "Select a client" option; requirement input `id="requirement-{rowId}"`, `aria-label="Requirement N"`; group `aria-label="Marking for requirement N"` with `aria-pressed` buttons "Must-have" / "Nice-to-have" **(e2e)**; "Add requirement" and "Remove requirement N" buttons **(e2e)**; both switches (`role="switch"`, `aria-checked`, label text) and the conditional reason textareas; "Save job" submit with `disabled`/`aria-busy` while pending **(e2e)**; validation banner text and `role`; the dynamic heading "Create job — {title}".

### `/jobs/[id]`
- **Changes:** header with "Search for more candidates" as an outline button-link; gap-flag count as an Alert strip with icon; Requirements and Open gap flags as Cards that no longer stretch (`items-start`, fixes V3); Must-have → `accent` solid Badge, Nice-to-have → `outline` Badge (fixes V7); flag items with more spacing, "Ask the client" line in a muted inset; Resolve (primary) / Dismiss (outline) at the new button size; Pipeline board placeholder as a dashed-border muted Card.
- **Must stay:** `h1` job title with `lang`; client name; "Showing the version saved on …" **(e2e)**; link → `/search?jobId={id}`; "N open gap flags need a recruiter answer." text; regions "Requirements" and "Open gap flags" (`aria-labelledby`) **(e2e)**; "Must-have" / "Nice-to-have" text **(e2e)**; group headings (Missing …); `Ask the client: "…"` text **(e2e)**; Resolve / Dismiss buttons and the resolution-note form (`textarea name="resolution-note"`, `aria-invalid`, error `id`, Save/Cancel) **(e2e: Resolve)**; `TypedNameDialog` flow **(e2e: "What's your name?", Continue)**; "Coming in a later phase." **(e2e)**.

### `/candidates/[id]`
- **Changes:** profile header (name, headline) with "View original CV" as an outline button; field boxes regrouped visually as Cards with the label as an overline and Edit as a ghost button; Stage history Card no longer stretches (V3); skills rendered in a denser layout of the same cards, not converted to chips, to keep the same text/order.
- **Must stay:** `h1` name with `lang`; all field labels and values in the same order; "Edit {label}" buttons, inline edit form (`name` values, Save **(e2e)**, Cancel) and the "Edited by {name}" note **(e2e)**; `TypedNameDialog`; "View original CV (signed link)" button behaviour (requests the signed URL on click); region "Stage history" **(e2e)** and "No stage moves yet." text; `ParseStatus` "not yet parsed" state.

### `/placements`
- **Changes:** Table component; start-date `Input` + "Update" outline button kept on one line; "Guarantee: N of 30 days used" in tabular mono muted; flag cell via Badge (`ended` / `due-soon`); phone sticky candidate column.
- **Must stay:** `h1` "Follow up after placement"; column headers and order; each row's sr-only date label + `input type="date"` `id`; "Update" button → `TypedNameDialog` → save; flag wording; empty state text.

### `/search` (no `jobId`)
- **Changes:** intro text as muted subtitle; filter form as a Card with Keyword full-width then a 3-column grid (1 column on phones); shared `Input`s; "Search" primary button; results list as a Table card; loading skeleton / empty / error states restyled.
- **Must stay:** `h1` "Find candidates" **(e2e)**; the intro sentence verbatim; `input name="query"` labelled "Keyword" with its placeholder **(e2e)**; Skills / Minimum years / Maximum years / Location / Language / CV updated after labels, `name`s and `id`s **(e2e)**; "Search" submit disabled while loading **(e2e)**; result links → `/candidates/{id}`; state texts.

### `/search?jobId=…` (job-scoped)
- **Changes:** same filter-card treatment; "Apply filters" primary; results as a list Card with each result as a row (name link bold, meta line muted), hover background.
- **Must stay:** `h1` "Find candidates"; "Filter the talent database for this job." + "Back to {job title}" link → `/jobs/{id}`; hidden `input name="jobId"`; the 6 filter `name`s (`skills`, `minYears`, `maxYears`, `locations`, `languages`, `cvUpdatedAfter`) and `id`s (`job-scoped-…`), labels **(e2e)**; GET form submit behaviour; "Ranked matches" text where shown **(e2e)**; result links and `h3`s.

### `/settings`
- **Changes:** heading uses the page-header pattern (`text-title`), placeholder text inside a dashed muted Card.
- **Must stay:** `h1` "Adjust portal rules" (level and text); placeholder sentence verbatim.

### `/sentry-test` (internal)
- **Changes:** replace the one-off `text-2xl font-semibold tracking-tight` with the `text-title` token; the button uses the shared Button.
- **Must stay:** returns 404 when `VERCEL_ENV=production`; heading and paragraph text; the throw button.
- **Screenshot:** not possible from the deployed site, where it 404s by design ([src/app/sentry-test/page.tsx:5-7](../src/app/sentry-test/page.tsx)). The before/after comparison for this page is a code review of the class change.

## Out of scope (spotted, not fixed: behaviour, text or data)

Listed again in the Phase 3 report:

1. The header shows **"Dashboard"** and no nav item is active on `/candidates/[id]`: the "Candidates" nav item points at `/search`, and `currentPage()` falls back to "Dashboard" ([AppNavigation.tsx:29-42](../src/components/patterns/AppNavigation.tsx)).
2. "Change" and "Change recruiter name" are styled as links but are non-interactive `<span>`s, and the header always says "Maya Tan" rather than the typed name stored on the device ([AppNavigation.tsx:168-171,195-199](../src/components/patterns/AppNavigation.tsx)). The restyle keeps their current look rather than guessing the intent.
3. Seed-data artefacts visible on screen: numeric prefixes and a "CV" suffix in candidate names ("49 Marco Reyes Cebu", "Elaine Koh CV"). This is data, likely from the seed classifier recently changed in `ac6ccfe`/`1259e06`.
4. Placements reads "Guarantee: 60 of 30 days used" once a guarantee has ended.
5. `/sentry-test` renders a second `<main>` inside the shell's `<main>` ([src/app/sentry-test/page.tsx:10](../src/app/sentry-test/page.tsx)).
6. `/settings` and the job-detail pipeline board are placeholders; they get restyled, not built.

No typos found in page copy so far.

## Verification plan (Step 3)

| Check | How |
|---|---|
| Tests before/after | `npm run lint`, `npm run typecheck`, `npm test` under Node 22. **Baseline already captured:** lint 0 errors / 2 warnings, typecheck clean, 310/310 unit tests. `npm run build` once (see decision 3). |
| Must-stay checklists | Re-run the structure snapshot against the new build and diff it with `checklists/before.json`, page by page. Any change to a control, button, link, heading or the text hash fails that page. Text-hash mismatches caused by live data changes (dashboard statuses move daily) get inspected, not waved through. |
| Keyboard focus | Playwright tabs through each page and asserts every focused element shows a visible ring (non-zero outline or box-shadow). |
| Contrast | Rerun the 40-pair script on the final `globals.css` values. |
| Layout | After shots at 1440 and 390 px, same file names as [screenshots/before/](screenshots/before/); page-level horizontal overflow must stay `false` (as the e2e shell test requires). |
| Forms, buttons, links | Links: every href is followed and must return 200. Buttons and forms: see decision 2. |

## Decisions needed at Checkpoint 2

1. **Approve the design direction and page plan above**, or name what to change.
2. **Where to run the "after" build.** The deployed site serves `main`, and this machine has no Supabase credentials or Docker. Options:
   - **(a) Push `ui-modernisation` and use its Vercel preview.** Visible on GitHub; previews are behind Vercel deployment protection, so you'd need to share access or the bypass token. The existing e2e suite can also run there.
   - **(b) Run it locally.** You add `SUPABASE_URL` and `SUPABASE_SECRET_KEY` to `.env.local` yourself; I never read or print them. This reads the one shared Supabase project.

   Either way, clicking Save / Resolve / Update writes rows to that shared database (fictional data, the same thing CI's e2e suite does). **Default unless you say otherwise:** check links by visiting them, and check form controls structurally (snapshot diff + unit tests) **without submitting anything**.
3. **`design/tokens.md`** still lists the old hex values after this change (the contract test checks names only, so it stays green). **Default:** leave `design/` untouched, as agreed at Checkpoint 1, and record the divergence in the report. The alternative is updating the hex columns in `tokens.md` so the code-facing contract matches, leaving `tokens.pen` as the only stale file.

Branch `ui-modernisation` follows the brief, not the repo's `<type>/<issue>-<slug>` convention, and there is no GitHub issue for it. I won't push or open a PR unless you choose option 2(a) or ask.
