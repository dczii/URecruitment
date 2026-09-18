# Spec — #29 The portal has one visual language defined as tokens

| | |
|---|---|
| Issue | https://github.com/dczii/URecruitment/issues/29 |
| Tasks | #94 (E02-S01-T01), #95 (E02-S01-T02) |
| Parent | Story #29 → Epic #3 "Design system & screens" |
| Milestone | MVP |
| Branch | `design/29-visual-language-tokens` |
| Created | 2026-09-18 |
| Status | In progress <!-- Planned → In progress → In review --> |

## Problem

The scaffold still uses shadcn's generated neutral defaults and a Latin-only font setup. There is
no design source of truth, no readable token contract for later screen work, and no automated guard
against components bypassing the theme. This Story establishes one accessible visual language in
pen.dev and maps it into Tailwind so scores, statuses, dates, English text and Simplified Chinese
text can be rendered consistently throughout the portal.

## PRD references

| PRD section | Item | Status |
|---|---|---|
| UI design | Designs are maintained in pen.dev and `.pen` files live in the repository | **decided** |
| UI design → Design rules 2–3 | Delay status is not colour-only; the type stack includes a Simplified Chinese font | **proposed** |
| UI design → Design rule 5 | Colours, type and spacing are defined once as tokens and mapped to Tailwind | **proposed** |
| Technical architecture → UI | Tailwind and shadcn/ui are themed from the pen.dev tokens | **proposed** |
| Non-functional requirements → Devices | Desktop and mobile browsers | **decided** |

## Scope

**In scope**
- A neutral, accessible light-theme token source in `design/tokens.pen`.
- A complete readable mirror in `design/tokens.md`, including values, CSS variables, Tailwind
  names, usage and measured contrast.
- Colour, typography, spacing, radius and shadow tokens, including status and AI semantic roles.
- `src/app/globals.css` mappings for light and dark selectors using Tailwind v4's CSS-first theme.
- Geist plus Noto Sans SC font loading and a rendered Simplified Chinese sample.
- An ESLint guard against hexadecimal colours and raw pixel font-size utilities in
  `src/components`, with automated contract and browser coverage.

**Out of scope**
- Brand identity, logos, illustrations or screen designs.
- Shared pattern components and portal navigation, which belong to later Stories in Epic #3.
- Changing shadcn component structure or adding dependencies.
- Dark-mode design beyond a complete semantic mapping of the light tokens.

## Acceptance criteria

- [ ] **AC1** (#94) — Given a designer opens `design/tokens.pen`, when they inspect its variables
  and reference board, then colour, typography, spacing, radius and shadow groups are present and
  use the same semantic names documented in `design/tokens.md`. _Proved by:_ pen.dev validation and
  `src/app/theme-contract.test.ts › AC1`.
- [ ] **AC2** (#94) — Given any documented foreground/surface, status or focus pairing, when its
  contrast is measured, then normal text is at least 4.5:1 and large text, glyphs, borders and focus
  rings are at least 3:1. _Proved by:_ the contrast table in `design/tokens.md` and pen.dev design
  review.
- [ ] **AC3** (#94) — Given delay-status roles, when they are read in the token source, then On
  track, Due soon and Overdue each have distinct semantic colour roles and require a label plus
  icon rather than colour alone. _Proved by:_ pen.dev validation and `design/tokens.md` review.
- [ ] **AC4** (#95) — Given `design/tokens.md`, when the theme contract test compares it with
  `globals.css`, then every documented colour, type, spacing and radius token has a CSS variable
  and Tailwind v4 mapping with the same semantic name. _Proved by:_
  `src/app/theme-contract.test.ts › AC4`.
- [ ] **AC5** (#95) — Given the home page renders Simplified Chinese text, when it is inspected in
  Chromium, then the content is marked `lang="zh-Hans"` and its computed font stack includes
  `"Noto Sans SC"` without missing-glyph boxes. _Proved by:_
  `e2e/smoke.spec.ts › AC5`.
- [ ] **AC6** (#95) — Given a component contains a hexadecimal colour or a `text-[Npx]` font size,
  when ESLint runs, then the design-token guard reports an error. _Proved by:_
  `eslint.config.test.ts › AC6`.
- [ ] **AC7** — Given existing components and the home page, when lint and build run, then they use
  semantic theme utilities with no hexadecimal colour or raw pixel font size. _Proved by:_
  `npm run lint`, `npm run build`, and `eslint.config.test.ts`.

## Guardrails that apply

<!-- Tick only what applies and say why. Leave the rest unticked. -->

- [ ] AI only suggests: no auto reject/advance/shortlist/contact
- [ ] No email sent
- [ ] Server-only data access; secret key never reaches the browser
- [ ] RLS on new tables, no public policies; private Storage + signed URLs
- [ ] AI output schema-validated, logged to `ai_runs`, shows source text
- [ ] Protected attributes ignored; nationality/language only with a written reason
- [ ] UTC stored, SGT shown; SG working days
- [ ] Typed recruiter name recorded on stage/settings changes
- [x] Works at phone width; status not colour-only; Chinese text renders — the tokens define
  non-colour status cues and the CJK font; the existing phone smoke test remains green.
- [x] Fictional data only; no secrets or sample-data Blob URLs committed — only neutral example
  interface copy is rendered.
- [ ] Free-tier limits respected (no frequent cron, file ≤ 50 MB)

## UX / design

`design/tokens.pen` is the visual source of truth. It contains variable groups plus a reference
board for the palette, typography, spacing, radii and semantic status/AI roles. This Story does not
design a product screen or its states.

## Data / API changes

None.

## Assumptions

- **A1 — Neutral blue palette.** No brand exists, so the visual language uses restrained blue for
  actions, neutral slate surfaces and semantic green/amber/red statuses. All values remain tokens
  and are therefore reversible without component changes.
- **A2 — Light theme is authoritative.** Task #95 asks for both selectors, while `ui-design` says
  dark design is out of scope unless requested. The dark selector maps every role using accessible
  neutral equivalents but is not treated as a separately approved design.
- **A3 — Noto Sans SC is loaded through `next/font/google` with `preload: false`.** Next 16's
  generated type supports the face but does not expose a Chinese preload subset; disabling preload
  avoids claiming a Latin subset is sufficient while retaining Next's self-hosting.
- **A4 — A small Chinese sentence remains on the scaffold home page.** It gives Playwright a stable
  rendered target until candidate screens provide real fictional Chinese fixtures.
- **A5 — The component guard targets hexadecimal literals and arbitrary pixel font-size utilities,
  not all pixel values.** Pixel radii and target sizes can be legitimate; AC3 specifically forbids
  hard-coded colours and raw pixel font sizes.

## Open questions

<!-- Items the PRD marks open, or anything needing a product decision. "none" if none. -->

- none
