# UI contract

## Layout and hierarchy

Desktop (≥1024px): labelled sidebar approximately 224px wide, logo at its top; one compact header showing route context and actual name control. Content uses existing spacing scale (page inset 8/10, section gap 6, card padding 4/5). Phone: compact logo row only if needed, menu plus route/name controls remain within width; main inset 4. Exactly one screen h1. Use existing type roles; avoid all-caps labels and decorative gradients.

Existing semantic palette stays. Use background for canvas, card for grouped content, muted for secondary grouping; distinguish panels with spacing and restrained borders. Delay tokens always pair with words/icons. The supplied raster logo is unchanged; retain alt text and aspect ratio, use a size that supports recognition and avoid cropping or recoloring.

## Lists and dashboard

Dashboard attention tables: Selection (accessible header), Candidate, Job/client, Stage, Status, Waiting on OR Working days used. Use multiline job/client cells where needed; six headers for six cells. At 1440px with sidebar, these essential fields must fit the remaining content width. Do not widen the whole page or hide delay data to make the table fit.

At <1024px, display labelled cards for the scoped list screens; retain headings, row identity and all essential values. Only one representation is exposed to assistive technology at each breakpoint. Selection checkboxes need candidate-specific labels and a 44px target wrapper. Do not make an entire card a button containing other buttons. Existing candidate/job links remain normal links.

No selection: full-width attention content. Selection: conditional reachable preview preserves counts, blocked explanations and existing explicit move/name behavior. No stage changes while selecting/filtering. Sticky controls need reserved space and must pass occlusion, focus and virtual-keyboard checks; otherwise keep them in normal flow.

## Forms and states

Persistent visible labels; field hints precede errors; first invalid field focused after submit, errors connected with aria-describedby and aria-invalid. Pending text names the actual operation; aria-busy and appropriate live-region announcements; no duplicate requests. Inputs survive server failure. Empty no-data and filtered-no-match states differ and offer only existing valid actions. A server failure must not render as an empty success state.

## Motion

| Interaction | Pointer behavior | Keyboard/reduced motion |
| --- | --- | --- |
| Button press | scale 0.97; 120ms custom ease-out | No transform or delayed feedback |
| Sheet | 220ms entry / 160ms exit, drawer curve | Keyboard instant; reduced motion no translation |
| Dialog | opacity + scale from 0.97; 180ms entry / 140ms exit; centered origin | Keyboard instant; reduced motion opacity ≤100ms |
| Repeated navigation/filtering | No spatial animation | Instant |

Transitions name transform/opacity explicitly; no transition-all. Hover feedback is limited to fine pointers; no touch hover animation. No animation library, bounce, blur, route stagger or animated numerical counters. Base UI focus handling and lifecycle/unmount semantics must remain intact. Position/scale transitions are presentation-only and cannot gate a result or audit action.

## Accessibility

WCAG reference and exact criteria come from `docs/plans/accessibility-standard.md`: normal text 4.5:1, meaningful boundary/focus 3:1; visible focus; phone targets 44×44px; EN/ZH support; 200% zoom and no horizontal page overflow. Tooltips cannot be the sole source of navigation names. Phone cards use label/value semantics, not invented table roles. Preserve correct calendar dates and Asia/Singapore display.
