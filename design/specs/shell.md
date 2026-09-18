# App shell and navigation

Visual source: `design/shell.pen` · Story: #30 · Design task: #96

## Purpose

The shell gives every recruiter a stable way to reach the five top-level MVP destinations and
provides one bounded region where each owning screen renders. It does not design those screens or
invent global links for routes that require a selected job or candidate.

## Information architecture

Primary links, in order:

1. Dashboard — `/dashboard`; `/` redirects here.
2. Jobs — `/jobs`.
3. Candidates — `/search`.
4. Placements — `/placements`.
5. Settings — `/settings`, separated by order only; do not add a decorative divider.

Job detail, Job form, Candidate profile and Pipeline remain contextual destinations reached from
the five screens above. The unconfirmed CV review queue (RC-2) is not present.

## Desktop · 1440 × 900

- At `1024 px` and wider, show a persistent `248 px` sidebar and flexible main region.
- Sidebar: card surface, `1 px` right border, `24 px` vertical / `16 px` horizontal padding.
- Product row: `48 px` high; a `36 px` primary mark with the Lucide `briefcase-business` icon and
  the `URecruitment` wordmark.
- Navigation items: `216 × 44 px`, `12 px` horizontal padding, `12 px` icon/label gap, `8 px`
  radius. Use the label and a `20 px` Lucide icon:
  - Dashboard — `layout-dashboard`
  - Jobs — `briefcase-business`
  - Candidates — `search`
  - Placements — `badge-check`
  - Settings — `settings`
- Active item: `accent` surface with `accent-foreground` icon and label; set
  `aria-current="page"`. Inactive items use `foreground` labels and `muted-foreground` icons.
- Page header: `72 px` high, card surface, bottom border, `32 px` horizontal padding. The page title
  is left aligned. The recruiter-name affordance is right aligned and reads
  `Recording as Maya Tan · Change` in the design fixture.
- Main content: `32 px` padding, `24 px` section gap, no shell-owned horizontal scroll. The page
  contributes its own single `h1` inside `<main id="main-content">`; the pathname-aware header
  label is supporting navigation context and must not create a second `h1`.
- Keep the quiet `MVP prototype · Fictional data only` notice at the sidebar foot.

## Phone · 390 × 844

- Below `1024 px`, replace the sidebar with a top bar and navigation sheet.
- Top bar: minimum `64 px` high, card surface, bottom border, `12 px` horizontal padding.
- Menu trigger: `44 × 44 px`, accessible name `Open navigation`, Lucide `menu` icon.
- Current-page label fills the remaining width. It may wrap to two lines; the top bar grows rather
  than clipping it.
- Recruiter-name affordance: a `44 px`-high compact control with `user-round` icon and the current
  name. The stress state uses `Add name`. The implementation in #97 shows the affordance but does
  not implement the dialog or persistence owned by #99.
- Content uses one column with `24 px` top/bottom and `16 px` side padding. The document must satisfy
  `document.documentElement.scrollWidth <= window.innerWidth` at 390 px and 320 px.

### Navigation sheet

- Use the generated shadcn sheet primitive. It opens from the left and is at most `344 px` wide,
  while retaining at least `16 px` of the viewport at 320 px.
- The rest of the viewport is covered by a dark translucent scrim.
- Sheet padding is `16 px`. The `44 × 44 px` close button sits opposite the product mark.
- First content after the heading is the full recruiter-name affordance:
  `Recording as Maya Tan` with the underlined action `Change recruiter name`.
- The five navigation targets use the same order, labels, icons, `44 px` height and active treatment
  as desktop.
- The prototype/fictional-data notice stays at the bottom.
- On open, move focus to the close button or first focusable control inside the sheet. Trap focus,
  close on Escape, and restore focus to the menu trigger. Selecting a link closes the sheet and
  navigates.

## Keyboard and focus

- A `Skip to content` link is the first focusable element. It is visually hidden until focused,
  then appears at the top-left above shell chrome and targets `#main-content`.
- DOM/focus order follows the visible order. Never use positive `tabindex`.
- Every link and button uses a `2 px` `ring` token focus indicator with a `2 px` separation from the
  adjacent surface. Do not remove the browser outline without this replacement.
- Links remain identifiable by icon plus text; the recruiter `Change` text is underlined.
- All interactive targets are at least `44 px` high at phone width.

## States represented in `shell.pen`

- `Desktop / Dashboard / Default` (`sPJYs`) — Dashboard active; Jobs demonstrates keyboard focus.
- `Phone / Dashboard / Default` (`b0wZlt`) — closed menu and compact named-recruiter affordance.
- `Phone / Navigation sheet open` (`ua8fh`) — focus is inside the sheet on Close.
- `Phone / Long title / Name unset` (`E1ARPY`) — long Simplified Chinese title wraps and `Add name`
  remains visible without clipping.

Screen-specific default, loading, empty, error and long-data states belong to each screen design.
The shell remains unchanged around them.

## Tokens and component mapping

- Use only the semantic values documented in `design/tokens.md`.
- Structure: `background`, `card`, `border`.
- Text: `foreground`, `muted-foreground`, `font-sans`, `font-heading`, `text-title`,
  `text-heading`, `text-label`, `text-caption`.
- Navigation: `primary`, `primary-foreground`, `accent`, `accent-foreground`.
- Focus: `ring`.
- Radius: `radius-md` for controls and navigation; `radius-lg` only for screen-owned content
  placeholders shown in the design.
- No hex colours, raw pixel font-size utilities, gradients or new shadow roles in components.

## Static placeholder pages

Task #97 may add static placeholders only to prove routing:

- Dashboard — `What needs attention today`
- Jobs — `Browse jobs`
- Candidates — `Find candidates`
- Placements — `Follow up after placement`
- Settings — `Adjust portal rules`

Each page has one `h1`, one plain sentence noting that its owning Story supplies the content, and no
fake data, action, status, AI result or data fetching.
