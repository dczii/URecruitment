# Research: Dropdown modernisation

**Date**: 2026-10-05. Evidence is current local source and installed package declarations; no live UI assessment performed.

## Shared primitive

**Decision**: Compose a shadcn-style Base UI Select with current semantic tokens.
**Rationale**: components.json specifies base-nova; @base-ui/react is already installed. SelectRoot.d.ts confirms controlled value, items, onValueChange, disabled and name support; SelectPositioner.d.ts confirms alignItemWithTrigger. Positioner CSS variable declarations expose anchor width and available space.
**Alternatives**: Styling the native trigger cannot consistently modernise the popup. Hand-written listbox duplicates focus/typeahead work. Radix or a new library adds unnecessary dependencies. Combobox search is a separate capability with no current requirement.

## Motion

**Decision**: No dropdown animation.
**Rationale**: Emil's frequency-first rule puts repeated filtering above decorative motion. Existing globals.css disables transitions for keyboard and reduced motion; retain that policy. No global modality changes are needed.
**Alternatives**: A 150–180ms origin-aware transition is reasonable for occasional popovers, but these five selections are frequent controls. Springs and stagger add no useful feedback here.

## State and compatibility

**Decision**: A typed adapter accepting options and a value callback; consumer values remain strings, internal absence maps to null only for the job placeholder.
**Rationale**: Native ChangeEvent and child option DOM are not compatible with Base UI. Explicit migration is smaller and safer than emulating HTMLSelectElement.
**Alternatives**: Maintaining native event compatibility hides a changed accessibility/DOM contract. Bulk rewrites of all field controls expand scope.

## Existing tests

Native assumptions occur in JobForm.test.tsx and e2e/dashboard.spec.ts, ui-polish.spec.ts, job-form.spec.ts, jobs.spec.ts, search-from-job.spec.ts, gap-flags.spec.ts and seeded.ts. Preserve all current business assertions. Count helper semantics must survive portal rendering and must not turn all scenarios into skips.

## Planning prerequisites

045 is locally implemented UI polish; 046 owns the current brand. No existing dropdown feature folder was found. This draft uses next existing sequence 048 and explicitly records the unrelated stale feature.json pointer. No .specify/extensions.yml was present, so no hooks were dispatched. The repo-local prd-context and ui-build skills referenced in older documents are absent; current source, design/tokens.md and accessibility/UX documents supply the relevant constraints directly.
