# Implementation Plan: Dropdown modernisation

**Date**: 2026-10-05 | **Spec**: [spec.md](spec.md)
**Status**: Implemented locally under the user’s explicit follow-up authorisation; evidence in quickstart.md.
**Branch**: Existing checkout retained; no branch created or switched.

## Summary

Replace the shared browser-native select at its five call sites with a locally composed shadcn-style Base UI Select, using the already installed dependency. Deliver a restrained floating surface, readable options, precise selected states and reliable keyboard/touch interaction. Keep frequent selection interactions instant, applying Emil's frequency-first guidance.

## Technical Context

**Language/Version**: TypeScript strict, React 19.2.8, Next.js 16.3.5.
**Primary Dependencies**: Existing @base-ui/react (^1.8.0), Tailwind 4, lucide-react and shadcn base-nova conventions. No package changes.
**Storage**: No changes. Current URL parameters and JobForm state remain authoritative.
**Testing**: Vitest/Testing Library and Playwright desktop 1440×900, phone 390×844.
**Target Platform**: Existing responsive browser application, light default and existing dark tokens.
**Performance Goals**: Instant selection feedback; no added network request, animation library or per-item animation.
**Constraints**: Existing recruiter guardrails, no remote commands, no Git mutations; locally fictional fixtures only.
**Scale/Scope**: Five selectors, two feature components, one shared UI component; stress fixture of 100 items.

## Constitution Check

| Principle | Design evidence |
| --- | --- |
| I Recruiters decide | Commit only an explicit selection; never advance or contact candidates. |
| II Login email only | No messaging or auth changes. |
| III Server-only access | Props and existing actions remain the boundary; no client database/storage imports. |
| IV No product AI | No models, scores, ranking or parsing. |
| V Fair employment | Filter dimensions and nationality/language written-reason requirements remain untouched. |
| VI Fictional data | Local test fixtures only; no secrets, seed runs or remote operations. |
| VII Singapore time | No dates, limits or timezone changes. |
| VIII Typed name | Preserve owner name and existing stage/settings audit flows. |
| IX Verification | Behaviour tests precede new adapter logic; Playwright at both required widths. |
| X Open decisions | No open recruitment decision resolved by this presentation proposal. |

Pre-research and post-design technical checks: compatible with all ten principles. Story linkage and Claude review remain pending external follow-ups. The user authorised local implementation after those gates were reported; review checkboxes remain untouched.

## Design review and specification

Source review, not a claim of a live browser visual audit:

| Before | After | Why |
| --- | --- | --- |
| field.tsx styles a native select; popup appearance is browser-owned | Shared Base UI popup using bg-popover, text-popover-foreground, border-input, rounded-lg, shadow-md | Consistent floating surface in both themes |
| Native arrow and option presentation | Fixed 16px chevron, readable value, separate trailing checkmark column | Stable alignment and immediately recognisable selection |
| Open-menu spacing and highlight are browser-controlled | p-1 popup; px-3, gap-2 items; min-height 44px phone/40px desktop; rounded-sm item corners | Clear rhythm and generous touch targets |
| Native focus/selection rendering varies by platform | ring-ring focus; bg-accent/text-accent-foreground highlight; checkmark plus aria-selected for committed value | Highlight and selection have distinct meanings |
| Long option presentation depends on OS popup | Trigger truncates within min-w-0; open rows wrap with overflow-wrap:anywhere | Full labels readable without widening the page |
| Current Select has no decorative animation | Retain instant open, close and selection; no animated chevron or press scaling | Filters are frequent tools; Emil prioritises immediate repeated interactions |

### Trigger

Keep h-11/lg:h-10, rounded-md, px-3 and existing text-body/lg:text-label typography. Use bg-card, border-input, text-foreground; placeholder uses text-muted-foreground. Reserve a shrink-0 icon slot; labels remain above the field. Focus uses a solid ring-ring indicator verified against adjacent colours. Invalid state retains border-destructive, textual error and aria-describedby; do not rely on a faint alpha ring alone. Disabled state remains semantically disabled; do not add colour-only meaning. No transform on press for these high-frequency controls.

### Popup and options

Portal above card clipping, with bottom/start positioning, 4px trigger gap and 8px viewport collision padding. Set alignItemWithTrigger=false so selection never moves the popup over the trigger. Prefer trigger width; permit a 16rem minimum only while clamped to viewport minus 16px. Height is min(20rem, available height); scroll inside the popup. Use installed Base UI positioning variables --anchor-width, --available-height and --available-width rather than guessed coordinates.

Item labels wrap to any number of lines; row height is a minimum, not fixed. Reserve the trailing 16px indicator slot on every row. Pointer/keyboard highlight uses accent; committed selection has a checkmark and semantic selected state. Icons are decorative to assistive technology. No favourite, create-new, avatar, section heading or inline search affordance.

### Semantics and state

Compose a client-only shared SelectField in src/components/ui/select.tsx using Base UI Select parts. Use an explicit options/value/onValueChange API rather than faking a native ChangeEvent. Keep labels, trigger IDs, name, disabled, aria-invalid and aria-describedby wired to the correct interactive element. See contracts/select.md for exact value rules.

Leave Input/Textarea/FieldLabel and the old native Select export in field.tsx unchanged for this scoped migration; no unrelated refactor. FilterBar and JobForm import SelectField directly. Rely on Base UI keyboard, typeahead and dismissal behaviour rather than writing a parallel focus manager.

### Integration and test migration

Dashboard maps string options to labels/values and keeps router push behaviour. An unavailable URL value gets a disabled display option so the value stays readable and All remains available. JobForm maps client ID/name; never infer identity from the label or auto-select the first client.

Tests currently call selectOption and count native option nodes. Update those interactions to accessible trigger/listbox/option operations without dropping assertions. e2e/seeded.ts must count only actual client choices and preserve its existing count contract (one placeholder plus real clients); disabled empty state returns one. Existing skip behaviour must not accidentally skip seeded cases after the migration. Do not add skips. New focused dropdown tests must run on deterministic fictional local fixtures.

## Project Structure

Documentation lives in specs/048-dropdown-modernisation/: spec.md, plan.md, research.md, data-model.md, contracts/select.md, quickstart.md, tasks.md and checklists/requirements.md, checklists/ux.md.

Implementation scope:
- src/components/ui/select.tsx and select.test.tsx (new)
- src/components/features/dashboard/FilterBar.tsx and FilterBar.test.tsx (new test)
- src/components/features/jobs/JobForm.tsx and JobForm.test.tsx
- e2e/seeded.ts, dashboard.spec.ts, ui-polish.spec.ts, job-form.spec.ts, jobs.spec.ts, search-from-job.spec.ts, gap-flags.spec.ts
- e2e/dropdowns.spec.ts (new); e2e/mock-supabase.mjs for fictional edge fixtures only

No global CSS, theme-token, field.tsx, dependency, route or server-code edit is planned. Read node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md before implementation, per AGENTS.md.

## Delivery and verification

Tasks proceed from regression proof → shared control → dashboard → job form → cross-browser/phone evidence. See tasks.md and quickstart.md. UI acceptance includes full text at 200%, light/dark contrast, disabled/invalid/open states and no clipping near viewport edges. Actual browser verification remains implementation work.

## Complexity Tracking

No architectural exception requested. Draft-only process deviation: no Story issue is supplied; no remote issue is created. The existing .specify/feature.json points to absent 048-sidebar-account-build; it is left untouched. Pass SPECIFY_FEATURE_DIRECTORY explicitly with SPECIFY_FEATURE_NO_PERSIST=1. The next existing folder number is 048; reconcile the stale pointer with Claude before implementation if that feature exists elsewhere.


## Implementation deviations (2026-10-06)

- Added test/stubs/select-dom.ts outside the original file list. It supplies PointerEvent defaults and avoids jsdom/nwsapi recursion in unsupported top-layer selectors; asynchronous cleanup flushes positioning before shared mocks restore. Production behaviour is unchanged. The 17 focused tests complete in roughly one second.
- The default Turbopack build cannot bind its worker port in this environment. The supported Webpack production build and client-bundle leak scan pass.
- Port 3000 was already in use, so E2E ran on port 3100 via ignored .orchestrator/dropdown.config.ts using the same local fictional provider. No application config or remote service changed.
- At 200% text, the existing phone header crowds its name control. Dropdown labels remain scrollable and page width stays bounded; header work is outside this feature.
