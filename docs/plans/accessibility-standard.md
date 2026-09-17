# Accessibility and responsive standard

## Status

**Accepted** · 2026-09-17 · created by [#80](https://github.com/dczii/URecruitment/issues/80)
(story [#23](https://github.com/dczii/URecruitment/issues/23), epic
[#1](https://github.com/dczii/URecruitment/issues/1))

These rules apply to every screen and shared component. **Each rule names how it is checked**: a
Playwright assertion, a unit test, an axe scan, or a design review. That way the rules are designed in
from the first frame, not retrofitted.

**What the PRD requires (the source of every rule here):**

| PRD item | Text | Status |
|---|---|---|
| Devices | *"Desktop and mobile browsers"* | **decided** |
| UI design | *"The portal must work in desktop and mobile browsers."* | **decided** |
| Languages | *"English and Simplified Chinese CVs and job descriptions"* | **decided** |
| Design rule 2 | *"Delay status uses a word or icon as well as colour, so it doesn't rely on colour alone."* | **proposed** |
| Design rule 3 | *"The type stack includes a font with Simplified Chinese characters, such as Noto Sans SC."* | **proposed** |
| Design rule 4 | *"The dashboard and pipeline board are fully usable at phone width."* | **proposed** |
| Design rule 1 | *"Every AI result is labelled as a suggestion and shows the text it came from."* | **proposed** |

**Reference level.** The PRD names no conformance level. This standard adopts **WCAG 2.2 level AA** as
the reference for anything not spelled out below. That is a reversible choice made here, and the
rules below are the part that is enforced.

**How the checks are wired:**

- The design tasks ([#94](https://github.com/dczii/URecruitment/issues/94)–[#106](https://github.com/dczii/URecruitment/issues/106)) show each rule in their frames.
- The shared patterns ([#99](https://github.com/dczii/URecruitment/issues/99)) carry the rules in code.
- The shared Playwright helpers ([#107](https://github.com/dczii/URecruitment/issues/107)) assert
  them on every screen.
- The axe scan ([#108](https://github.com/dczii/URecruitment/issues/108)) catches the rest.

The [test strategy](test-strategy.md) says which layer runs each check.

## Verification methods

| Code | Method | Where it lives |
|---|---|---|
| **PW** | Playwright assertion, run in **both** the `desktop` (1440×900) and `phone` (390×844, `isMobile`) projects | `e2e/*.spec.ts`; shared helpers in `e2e/helpers/a11y.ts` |
| **AXE** | Automated axe scan inside Playwright | `expectNoA11yViolations(page)` ([#108](https://github.com/dczii/URecruitment/issues/108)) |
| **UT** | Unit test with Vitest and Testing Library | Next to the component |
| **DR** | Design review of the pen.dev frames and `design/specs/*.md` | Each design task's PR; Claude's review checks it |
| **CR** | Code review | `pr-review`, with the `ui-build` rules |

## The rules

### A. Structure and semantics

| # | Rule | Checked by |
|---|---|---|
| A1 | Use semantic HTML: one `<main>` per page, a `<nav>` for the primary navigation, a `<header>`, and headings in order (one `<h1>` per page, no skipped levels) | AXE (landmark and heading rules) · CR |
| A2 | Buttons are `<button>`, links are `<a href>`. A clickable `<div>` or `<span>` is never used | AXE · CR |
| A3 | Tables that stay tables (desktop) use `<th scope>`, and they become **cards** at phone width (C3) | AXE · PW |
| A4 | The page `<html>` has `lang="en"`. Chinese content carries its own `lang` (D1) | AXE (`html-has-lang`) · UT |
| A5 | Every page has a unique, descriptive `<title>` | PW |

### B. Forms, keyboard and focus

| # | Rule | Checked by |
|---|---|---|
| B1 | **Every input has a visible label** tied to it (`<label for>` or `aria-labelledby`). A placeholder is never the only label | AXE (`label`) · PW (`getByLabel` works) |
| B2 | Errors are shown in text next to the field and linked by `aria-describedby`. The first invalid field receives focus on submit. Colour is never the only error cue | UT · PW |
| B3 | **Everything works by keyboard**, including **stage moves**. Drag on the pipeline board is optional; a menu or button path must exist and must work with Tab, Enter, Space and the arrow keys | PW (a keyboard-only move in `e2e/pipeline.spec.ts`, [#160](https://github.com/dczii/URecruitment/issues/160)) |
| B4 | **Focus is always visible:** a `:focus-visible` ring from the `ring` token, never removed without a replacement. Its contrast against the adjacent colour is ≥ **3:1** | AXE · DR · PW (a shell test tabs through the navigation, [#97](https://github.com/dczii/URecruitment/issues/97)) |
| B5 | Focus order follows reading order. No positive `tabindex` | AXE · CR |
| B6 | **Dialogs and sheets** (the typed-name prompt, the filter sheet, the navigation sheet) move focus inside when they open, trap it while open, close on Escape, and **return focus** to the control that opened them | UT (`TypedNameDialog`) · PW |
| B7 | A "Skip to content" link is the first focusable element | PW |
| B8 | **Target size:** interactive targets are at least **24×24 CSS px** (WCAG 2.2 AA). At phone width, primary actions (Move, Save, Retry, Resolve, filter toggles) are at least **44×44 CSS px** | DR · PW (measured on the phone project for the primary actions of the dashboard and board) |

### C. Phone width (390 px)

| # | Rule | Checked by |
|---|---|---|
| C1 | **No horizontal page scroll** at phone width. **The assertable condition:** after the page settles, `document.documentElement.scrollWidth <= window.innerWidth` in the `phone` project. The only allowed exception is a scroll container **inside** the pipeline board, if `design/specs/pipeline.md` chooses scrolling columns. That container must not widen the page, so the condition above still holds | PW: `expectNoHorizontalOverflow(page)` on **every** key screen ([#107](https://github.com/dczii/URecruitment/issues/107)). A deliberately overflowing element must make it fail |
| C2 | The **dashboard** and the **pipeline board** are **fully usable** at 390 px: every action a desktop user has (filter, open, move, confirm name) is reachable and works (PRD design rule 4) | PW: each action exercised in the `phone` project ([#160](https://github.com/dczii/URecruitment/issues/160), [#161](https://github.com/dczii/URecruitment/issues/161)) · DR (phone frame designed first for the board, [#104](https://github.com/dczii/URecruitment/issues/104)) |
| C3 | **Tables collapse to cards** at phone width. A card shows the same fields in the same order, and nothing is dropped silently | PW · DR |
| C4 | **Filters move into a sheet** at phone width, and an active filter stays visible as a removable chip | PW · DR |
| C5 | Primary navigation opens in a **sheet** at phone width ([screen inventory](../ux/screen-inventory.md#primary-navigation)) | PW ([#97](https://github.com/dczii/URecruitment/issues/97)) |
| C6 | **Text reflows** at 320 CSS px and at 200% zoom without loss of content or function | DR · PW (spot check of the shell at 320 px) |
| C7 | The on-screen keyboard does not hide the focused field or its submit button in the name prompt | PW (phone project) · DR |

### D. Chinese text

| # | Rule | Checked by |
|---|---|---|
| D1 | Content in Simplified Chinese (names, employers, quotes, job text) is wrapped in an element with **`lang="zh-Hans"`**. When a value's language is unknown, the component takes it from the CV's or job's recorded language | UT (`SourceQuote` sets `lang` for a ZH quote, [#99](https://github.com/dczii/URecruitment/issues/99)) · PW (a ZH candidate on the profile, [#134](https://github.com/dczii/URecruitment/issues/134)) |
| D2 | The font stack includes **Noto Sans SC** (PRD design rule 3), defined once in the tokens, and Chinese text renders in it | DR ([#94](https://github.com/dczii/URecruitment/issues/94)) · CR (the token mapping, [#95](https://github.com/dczii/URecruitment/issues/95)) |
| D3 | **Truncation is CSS only** (`line-clamp` or `text-overflow: ellipsis`). A string is **never sliced** in code, which could split a character or a surrogate pair. The full value is available (a tooltip or an expanded view) | CR (grep for `slice`/`substring` on display strings) · UT |
| D4 | **Long-content cases** are designed and tested: a long Chinese name, a long English employer name, 20+ skills, and a long work history | DR (every screen's long-content state) · PW (a seeded long-name candidate stays within width) |
| D5 | Line height and wrapping suit CJK text: no fixed-height boxes that clip a second line of Chinese | DR |

### E. Status, colour and contrast

| # | Rule | Checked by |
|---|---|---|
| E1 | **A delay status is never colour-only.** Every badge shows an **icon and a word** as well as colour: *On track*, *Due soon*, *Overdue · N days* (PRD design rule 2) | PW: `expectStatusNotColourOnly(page)` ([#107](https://github.com/dczii/URecruitment/issues/107)). A colour-only badge must make it fail · DR (legible in greyscale, [#98](https://github.com/dczii/URecruitment/issues/98)) |
| E2 | **The badge's accessible name** follows one pattern, in working days: `aria-label="On track: 1 of 3 working days used"` · `aria-label="Due soon: 4 of 5 working days used"` · `aria-label="Overdue by 3 working days"`. End states and Placed show **no badge** and no status label | UT (`DelayStatusBadge`, [#99](https://github.com/dczii/URecruitment/issues/99)) · PW (the helper checks that a label is present) |
| E3 | **Contrast:** body text ≥ **4.5:1**; large text (≥ 24 px, or ≥ 18.66 px bold) and UI glyphs, icons, borders of inputs and focus rings ≥ **3:1**. The values come from the tokens, so contrast is checked once per token pair | DR (token contrast table in `design/tokens.md`, [#94](https://github.com/dczii/URecruitment/issues/94)) · AXE (`color-contrast`) |
| E4 | Any other status (gap flag open or resolved, the guarantee countdown, the start date confirmed or not) also uses words, never colour alone | PW · DR |
| E5 | Links are distinguishable from text by more than colour (an underline or an icon) | AXE · DR |

### F. AI results

| # | Rule | Checked by |
|---|---|---|
| F1 | Every AI-derived value shows a **visible text label**, "AI suggestion". An icon alone is not enough, and the label is in the accessible name of the value's group. Scores also show the **model version and date** (PRD design rule 1) | UT (`AiSuggestion`, [#99](https://github.com/dczii/URecruitment/issues/99)) · PW (on job detail and the profile) |
| F2 | The **source quote** is reachable by keyboard: a disclosure button with `aria-expanded` and `aria-controls` | UT (`SourceQuote`) · AXE |
| F3 | Nothing looks like an automatic decision. No "Rejected by AI" or similar state or wording | DR · CR |

### G. Dynamic content and motion

| # | Rule | Checked by |
|---|---|---|
| G1 | **Async results are announced** through `aria-live="polite"`: search results arriving, a stage move completing, a re-score finishing, a save succeeding or failing | UT · PW (the live region's text after an action) |
| G2 | Loading states are skeletons or spinners with an accessible name ("Loading matches"). An empty result says so in words | UT · PW |
| G3 | **Motion respects `prefers-reduced-motion`.** Non-essential animation stops, and no content depends on animation to be understood | CR · PW (a run with `reducedMotion: 'reduce'` on the board) |
| G4 | No content flashes more than three times a second | DR |
| G5 | Times are shown in **Singapore time**. A relative age ("CV updated 8 months ago") has the absolute date available to assistive technology and on hover or focus | UT (the shared SGT formatter) · PW |

## The automated scan (specified for #108)

This standard **authorises** [#108](https://github.com/dczii/URecruitment/issues/108) to add the axe
Playwright integration (`@axe-core/playwright`) as a **dev dependency**. The scan:

- runs with the rule tags **`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`**;
- is applied to the shell and a patterns gallery first, and each screen task adds its page with one
  call to `expectNoA11yViolations(page)`;
- runs in **both** Playwright projects;
- **fails on any violation**. An exception is allowed only per rule and per page, written next to the
  helper with its reason and an issue link. A blanket disable is never allowed.

Axe cannot check everything. The **PW** and **DR** checks above cover what it misses: keyboard
paths, overflow, status words and target sizes.

## Checklist for a screen task

A screen PR is not ready until:

- [ ] its Playwright spec runs in **both** projects and calls `expectNoHorizontalOverflow`,
  `expectStatusNotColourOnly` (where statuses appear) and `expectNoA11yViolations`;
- [ ] its primary action works **by keyboard** in a test;
- [ ] any Chinese content it renders carries `lang="zh-Hans"`, with a ZH fixture in the test data;
- [ ] any dialog or sheet it opens returns focus when it closes;
- [ ] its long-content state from the design spec is covered;
- [ ] Claude's review opened it at 1440 and 390 px in the browser and compared it with the design
  spec (`ui-build`, visual check).

## Out of scope

- Token values or component code (E02).
- Adding the axe dependency itself, which [#108](https://github.com/dczii/URecruitment/issues/108) does
  under this standard's authority.
