---
name: ui-build
description: >
  Building URecruitment screens and components with shadcn/ui + Tailwind from the pen.dev design
  mirrors (design/tokens.md, design/specs/*.md): token mapping, shared patterns (AiSuggestion,
  SourceQuote, DelayStatusBadge, TypedNameDialog), accessibility, phone-width behaviour, Chinese
  text, Singapore time display, and Playwright coverage. Use for any React component, page UI,
  styling or visual fix.
---

# UI build

## Inputs

- `design/tokens.md` and `design/specs/<screen>.md` (plus `design/exports/*.png` if present). **Build from these, not from memory.**
- If no spec exists for the screen, stop and report it. The design task comes first, unless the task says it's a throwaway prototype.

## Rules

1. **Tokens only.**
   - Map every token to CSS variables and the Tailwind theme once (the shadcn variable names match the colour tokens).
   - No hex values, raw pixel font sizes or ad-hoc fonts in components.
   - Follow the installed **Tailwind major's** theming approach. Check `package.json` first.
2. **shadcn/ui first.**
   - Add primitives with `npx shadcn@latest add <name>` into `src/components/ui`. Don't hand-edit generated primitives beyond theming.
   - Compose screens from `src/components/patterns` and `src/components/features/<area>`.
3. **Shared patterns** (build these once and reuse them everywhere):
   - `AiSuggestion`: a visible "AI suggestion" label, plus the model version and date when the value is a score.
   - `SourceQuote`: the exact CV/JD text a value came from, expandable, marked `lang` for Chinese.
   - `DelayStatusBadge`: icon + word + colour. Carries `aria-label="Overdue by 3 working days"`.
   - `TypedNameDialog`: asks for the name before the first change and remembers it on the device.
   - `EmptyState`, `ErrorState`, and loading skeletons.
4. **No automatic-decision UI.**
   - Buttons that change a stage are always recruiter actions, and they need the typed name.
   - Never pre-select candidates from AI output.
5. **Accessibility.**
   - Semantic HTML, labelled inputs, and visible focus.
   - Everything works by keyboard, including stage moves. Drag on the board is optional; a menu or button must also work.
   - Use `aria-live="polite"` for async results.
   - Colour contrast follows the tokens.
6. **Phone width (390 px).**
   - The dashboard and pipeline board are **fully usable**.
   - Tables collapse into cards.
   - Filters move into a sheet.
   - No horizontal page scroll, except inside the board columns if the spec says so.
7. **Chinese text.**
   - Wrap ZH content in `lang="zh-Hans"`, and make sure the font stack includes Noto Sans SC.
   - Truncate with CSS (`line-clamp`), never by slicing strings.
   - Test with long names.
8. **Dates.** Display every date through the shared SGT formatter. Show relative ages ("CV updated 8 months ago") with the absolute date in a tooltip.
9. **Data boundaries.**
   - Components receive only the fields they render.
   - Client components never import `src/server`.
   - Signed file URLs are fetched on demand, not embedded in page HTML for long.
10. **Copy.** Plain recruiter language.
    - Scores: "Match 72 · AI suggestion".
    - Gap flags: "Missing: salary range · Ask the client: 'What is the salary range for this role?'".

## Tests

- **Unit (Vitest + Testing Library)** for patterns with logic: badge text and aria, name-dialog persistence.
- **Playwright** for each key screen at the `desktop` and `phone` projects:
  - renders with seeded data;
  - the primary action works;
  - status badges show words;
  - no horizontal overflow at 390 px (assert `document.documentElement.scrollWidth <= innerWidth`).

## Visual check (Claude, during review)

Open the preview (the dev server or the Vercel preview) in the built-in browser. Screenshot desktop and phone, and compare them with `design/exports` / `specs`. List visible mismatches as review findings.
