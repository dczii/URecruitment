# Feature Specification: USER brand theme

Status: implemented locally; database-route and Pencil review remain outstanding.

Created: 2026-10-02. Branch: `design/white-red-black-theme`, originally created from `work`, now rebased onto latest `origin/main` (`e01f31e`). User authorized local implementation. No issue identifier was supplied; none is invented.

## User stories and acceptance

1. P1: A recruiter recognizes USER throughout the app. White is the default surface, text is neutral black, and primary actions/selection use logo red #BE2026. Every existing page inherits shared tokens; no purple/blue brand palette remains.
2. P1: A recruiter can read and operate the workspace. Text pairs meet 4.5:1, meaningful control/focus boundaries meet 3:1, links have an underline, and status meaning remains explicit through labels/icons. Due-soon uses an outline; overdue uses red.
3. P2: Existing dark styling remains coherent. Neutral-black surfaces, lighter-red actions, near-black text on primary fill, and a white logo backing preserve contrast. No new theme toggle.

## Requirements

- FR1: Use the supplied logo as the color source; website research is optional and unverified.
- FR2: Apply the semantic palette from the implementation plan to shared surfaces, buttons, navigation, forms, badges, dialogs, selection, errors and chart/sidebar aliases.
- FR3: Switch the forced dark default to light. Preserve typography, EN/ZH coverage, responsive layout, reduced motion, keyboard behavior and existing recruiter safeguards.
- FR4: Keep success/on-track feedback neutral and identifiable by words/icons; distinguish error/destructive actions by context and labels.
- FR5: Synchronize CSS and readable token/screen specs. Record stale Pencil documents honestly.
- FR6: No dependencies, database changes, product logic changes, real candidate data, remote deployment or communications.

## Edge cases

Logo black lettering on dark surfaces; hover color-mix in dark mode; faint decorative separators versus meaningful borders; phone navigation and dialog overflow; selected/error states without color; no database available during app validation.

## Success criteria

Default settings/shell render HTTP 200 at desktop and phone widths; logo backing remains white in both themes; primary text contrast remains at least 4.5:1 through hover; keyboard skip link remains usable; unit contrast and mapping checks, lint, typecheck and build pass. Database-dependent routes must be reported as unverified if local Supabase is unavailable.

## Scope provenance

This supersedes only the palette/dark-default preservation assumptions in `045-ui-experience-polish`; its functional and interaction requirements remain intact. After rebasing onto main, the feature follows the installed Spec Kit structure and `.specify/memory/constitution.md`. The migrated predecessor is `specs/045-ui-experience-polish/`. No retroactive generated workflow is claimed.
