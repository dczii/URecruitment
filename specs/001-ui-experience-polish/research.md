# Research and current UI audit

Reviewed 2026-10-02: live localhost dashboard DOM and screenshot, AppNavigation, Dashboard, FilterBar, SelectionBar, Table, Button, Dialog, Sheet, theme contract and route/form source. Other screen findings below are code-based; phone screenshots and all-screen visual verification remain implementation tasks. No external research, production queries, mutation tests or new dependency research was performed.

| Before | After | Why |
| --- | --- | --- |
| Dashboard header has five columns while selectable rows have six (`Dashboard.tsx`) | Explicit selection header and six aligned columns | Labels must describe the data beneath them |
| A 320px selection pane is reserved even with Nothing selected | Full-width attention lists; conditional action preview | Prioritize delay and waiting-party information |
| Shared Table uses nowrap and sideways scrolling on phones | Feature-labelled responsive cards in a shared table container | Recruiters should not reconstruct a row across a scroll area |
| Desktop rail uses only icons; header contains hard-coded Maya Tan and noninteractive Change text | Named navigation and actual device identity controls | Remove guessing and misleading affordances |
| Supplied logo tagline is difficult to read at current rendered size | Larger constrained logo in desktop navigation; compact phone treatment | Respect the supplied asset without redrawing it |
| Button uses `transition-all`; sheets use broad transition and stock easing | Explicit property transitions with custom easing and input-modality rules | Avoid unintended animation and keyboard delay |
| Dialog/sheet lack explicit reduced-motion policy in shared code | Shared motion policy plus regression checks | Accessibility should be built into primitives |
| Dashboard filters have no visible reset/scope summary | Clear scope and reset action preserving unrelated query parameters | Make recovery obvious |

## Decisions

1. **Direction**: calm dark recruiter workspace, labelled desktop navigation, strong page title, quiet surfaces, clear borders and readable content. Rationale: retain existing tokens/brand while reducing cognitive effort. Alternative: full palette rebrand or theme switch; deferred because it is unnecessary to fix current UX.
2. **Tables/cards**: preserve one semantic table and apply shared container-responsive styling; features supply each cell’s data-label. The container switches to cards when available space or text zoom makes columns cramped. This preserves state and avoids duplicate accessibility trees.
3. **Dashboard selection**: conditional action area beneath the active list; use sticky positioning only if verified not to occlude controls, with reserved space and phone safe-area/keyboard checks. No persistent empty side column. Mutation implementation stays unchanged. Clear selection to the intersection of currently displayed IDs after filter changes; test this behavior first.
4. **Motion**: CSS/Base UI lifecycle transitions, custom ease-out `(0.23,1,0.32,1)` and drawer `(0.32,0.72,0,1)`. Pointer press 120ms, overlays enter 180–220ms / exit 140–160ms. No page/list staggering, spring dependency, blur morphing or count animation. Keyboard transitions 0ms; reduced motion removes transform and allows at most 100ms opacity feedback. Track pointerdown/keydown at the shared overlay boundary so programmatic/Escape closes follow the initiating modality; do not delay focus.
5. **Scope**: existing recruiter journeys only; schema, search ranking, stage rules and communication unchanged. No unresolved product-register decision is answered.
6. **Validation**: seeded fictional data and deterministic route fixtures; run remote-free mocked tests where possible. Importing env files is not permission to run tests/mutations against remote Supabase.

## Limitations

Live screenshot used the browser's current viewport, not a measured 1440×900 baseline. Exact desktop/phone captures and measured contrast are delivery gates, not results claimed by this plan. The original .pen files were not read or altered; future design-tool work must use Pencil MCP.

Implementation inspection: default dashboard was reviewed at 1440×900 and 390×844. Container-responsive rows also cover enlarged text while keeping feature-owned labels. Contrast-wide and virtual-keyboard audits remain unverified.
