# Implementation Plan: USER brand theme

Branch: `design/white-red-black-theme`. Technical stack: existing Next 16.3.5, React, strict TypeScript, Tailwind 4, shadcn/Base UI, Vitest and Playwright. No dependency or data-model changes.

1. Measure logo red and define complete light/dark palette in [research.md](research.md) and [../../analysis/05-white-red-black-theme-plan.md](../../analysis/05-white-red-black-theme-plan.md).
2. Add meaningful contrast/regression checks; confirm the existing palette fails the red/neutral requirement before implementation.
3. Update CSS root/dark variables, black shadows, independent chart aliases, light root-layout default, white logo backing, due-soon outline, destructive focus and persistent content-link underlining.
4. Synchronize `design/tokens.md` and `design/specs/*.md`; do not edit encrypted `.pen` files without Pencil tools.
5. Run unit tests, lint, typecheck, build, and desktop/phone browser checks of the shell and typed-name dialog on /settings. This route needs no database; do not mock a working dashboard.
6. Record current results and service-dependent limitations in tasks and quickstart.

## Safeguards

All changes are presentation-only; recruitment mutations and server-only access remain untouched. User authorization covers this local implementation and its specs. User explicitly authorized commit, push and PR creation after implementation/rebase validation. The branch was created directly from the existing checkout, preserving unrelated work.

## Constitution Check after rebase

| Principles | Compliance and evidence |
| --- | --- |
| I, II, IV: recruiter control, no email, no AI | Presentation-only source diff; no decision/communication/model code changes |
| III: server-only data | Server contracts untouched; production client-bundle leak check required |
| V, VI: fairness and fictional data | No filtering changes; browser name uses fictional text; screenshots contain no candidate data |
| VII, VIII: time and typed-name audit | Formatters, mutations and dialog/storage behavior unchanged |
| IX: test-first and responsive | Contrast checks failed before styling; desktop/phone keyboard, touch and contrast E2E retained |
| X: decided/proposed/open | User chose logo-based colors; existing proposed status logic unchanged; no open product question settled |

## Rebase adjustment

Rebased onto `origin/main` at `e01f31e58c18937b82492bb54d0ca0a062c166ff`. Main migrated specs through 045; rename this feature from 002-brand-theme to 046-brand-theme. Retain the user-created branch name `design/white-red-black-theme`; use local Spec Kit feature context rather than inventing an issue number. Preserve upstream HRManagement naming and layout formatting. Spec Kit and project-map instructions are now available; earlier availability observations describe the original implementation environment only. No committed theme changes existed, so Git advanced the branch base and the preserved work was reapplied without creating a commit.
