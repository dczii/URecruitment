# UI contract

- Desktop collapse toggle: button named Collapse sidebar or Expand sidebar, aria-expanded and aria-controls, minimum 44px target, focus retained.
- Destination links: original hrefs and aria-current=page survive compact mode; each has a full accessible name and focus/hover tooltip.
- Account trigger: button with full recording name or Add name; menu supports keyboard, Escape and focus restoration. Sign out is an explicit submit to existing logout action.
- Mobile: account footer in Navigation dialog; scrollable at short heights; menu/dialog does not leave focus on a hidden sheet.
- Footer: one semantic footer after main in authenticated shell. Text v<release> · build <7-char commit> or v<release> · local build; no floating overlay.
- Motion: pointer only, 200ms custom ease-in-out, transform/opacity only; rapid reversal stays continuous; reduced motion and keyboard are instant.
