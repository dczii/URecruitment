# Implementation Plan: Sidebar account and build identity

**Date**: 2026-10-03 | **Spec**: [spec.md](spec.md)
**Branch**: unchanged | **Status**: Implemented; verification recorded in tasks.md (webpack fallback required in this environment)

## Summary
Move typed-name and logout controls from AppHeader into a shared SidebarAccount footer. Add a 240px expanded / 72px compact desktop sidebar. Keep the phone Sheet. Render version below main content using server-side release/build metadata.

## Technical Context
**Language/Version**: TypeScript strict, Next.js 16.3.5, React 19.2.8.
**Primary Dependencies**: Existing Tailwind 4, @base-ui/react 1.8, shadcn wrappers, lucide-react; no additions.
**Storage**: Existing recruiter-name localStorage only; sidebar state in client memory.
**Testing**: Vitest/Testing Library and Playwright desktop/phone with local mocked auth.
**Target Platform**: Desktop and mobile browsers.
**Project Type**: Next.js App Router web application.
**Performance Goals**: 200ms pointer transition, transform/opacity only, interruptible.
**Constraints**: Theme tokens, 44px targets, no remote service calls or git mutations.
**Scale/Scope**: Shared authenticated shell; five destinations; no login redesign.

## Constitution Check
- I–II: No candidate decisions or communications; reuse explicit logout; no email additions.
- III: No browser Supabase calls. Build metadata is resolved in a server-only module and passed as public display data.
- IV–VI: No AI, protected-attribute behavior or real candidate data; fictional test fixtures only.
- VII: No new dates; any later date display must use Singapore time.
- VIII: Keep existing typed-name key, validation and dialog; do not derive name from auth email.
- IX: Test changed logic first; screen evidence at 1440×900 and 390×844, keyboard, reduced motion and overflow.
- X: No registered product question is settled.
- Workflow: Planning complete; the user has authorized implementation. No Claude review or issue linkage is required. Preserve repository Git and remote-operation restrictions.

## Project Structure
Documentation: spec.md, plan.md, research.md, data-model.md, contracts/ui.md, quickstart.md, tasks.md, checklists/requirements.md and checklists/ux.md.
Source scope: src/components/patterns/AppNavigation.tsx, SidebarAccount.tsx, AppShell.tsx, src/components/ui/dropdown-menu.tsx, tooltip.tsx, src/app/globals.css, src/lib/build-info.ts and corresponding tests; e2e/shell.spec.ts, e2e/auth.spec.ts and e2e/sidebar-account.spec.ts.

## Implementation Decisions
1. Extract SidebarAccount with existing name subscription/dialog. Use an icon and truncated recording name as an account-menu trigger; menu exposes Add/Change name and explicit Sign out. Keep logout as the existing form/server action. Menu closes before name dialog opens. Add local shadcn-style Base UI Menu/Tooltip wrappers with existing dependencies. Use a generic user glyph rather than a fabricated profile photo.
2. Keep account footer separate from scrollable destinations; retain MVP/Fictional data notice. Short-height layouts must scroll instead of covering links. Compact notice may use a labelled information control with full notice available on focus.
3. Add collapse state in DesktopNavigation, a stable 44px toggle with aria-expanded/aria-controls, icon-only destinations with tooltips on hover/focus, and readable active-state indication. Full logo is shown expanded; compact state uses a generic labelled brand control, never a distorted logo or invented logo asset.
4. Layout widths change instantly. Use FLIP transforms on the sidebar surface boundary and the main wrapper to visually bridge the layout change over 200ms cubic-bezier(0.645,0.045,0.355,1). Do not scale text. Translate/fade label wrappers; use fixed-size icons. A small client frame/controller can live in AppNavigation.tsx and wrap AppShell's main column if coordination is needed. Measure before state change and after commit, cancel/retarget from the current visual position on rapid toggles, and clear inline transforms on finish/unmount. WAAPI controls transform-only movement without a library; skip measurement/animation entirely for keyboard or reduced motion. Do not animate width/grid/margins. Verify clipping and hit targets during motion; if the FLIP approach cannot meet these conditions, revise the plan before implementation rather than introducing a width animation.
5. Resolve package.json version and validated VERCEL_GIT_COMMIT_SHA in server-only src/lib/build-info.ts. Format v0.1.0 · build abc1234 when available, otherwise v0.1.0 · local build. Never fetch git/remote APIs or expose the environment object. Pass display value from server AppShell into a semantic footer after main. No package version bump for this UI work.
6. Reuse InteractionProvider's input modality policy and apply transition:none/animation:none to every new animated element under reduced-motion. Tooltips opened by keyboard are immediate. Existing mobile Sheet focus behavior remains; menu-to-dialog focus restoration gets explicit tests.

## Complexity Tracking
No new services, schema, dependencies or routes. FLIP coordination is the only additional motion complexity and needs visual verification.

## Implementation context
Proceed with the user-authorized implementation scope. No reviewer or issue linkage prerequisite applies. Do not run remote GitHub operations. Do not modify the active .specify/feature.json pointing at feature 045; pass this feature directory explicitly when resuming.
