# Implementation Plan: Fifteen-minute technical demo

**Branch**: none | **Date**: 2026-10-05 | **Spec**: [spec.md](spec.md)

## Summary
Fix calendar arithmetic and eliminate browser recomputation. Extend the existing loopback fictional provider with an opt-in placement dataset, persistent writes and reset. Capture the existing application before changing it, then capture and verify the corrected application. Deliver a Markdown presenter script, prompts and machine-generated consistency evidence.

## Technical Context
TypeScript strict, Next.js 16.3.5 App Router, React 19, existing shadcn/Tailwind tokens, Vitest and Playwright. No dependencies or migrations. Real Supabase access stays server-only. Local fixture provider is an explicitly simulated REST/auth backend; SQL/RLS is not exercised.

## Constitution Check
I: recruiter initiates saves, no candidate decisions. II: mock OTP only. III: unchanged server access guard; client receives numeric countdown. IV: no product AI. V: no ranking/filter changes. VI: fictional records and loopback URLs only. VII: UTC instants, Singapore calendar arithmetic, unchanged working-day flags. VIII: typed name retained. IX: failing logic tests first, desktop+phone e2e. X: actual user clarification recorded in spec and decision register. No violations.

## Project Structure and exact scope
- `src/lib/placement-countdown.ts`, adjacent tests: shared Singapore date/count calculation and valid calendar date predicate.
- `src/server/placements/list.ts`, adjacent new tests: use authoritative calculation and capture genuine regression before fix.
- `src/server/placements/create.ts`, existing tests: add daysUsed to save response and validate calendar dates.
- `src/components/features/placements/Placements.tsx`: consume daysUsed from server, preserve interaction and status wording.
- `src/app/placements/actions.ts`: boundary calendar-date validation.
- `e2e/placement-fixtures.mjs`, `e2e/mock-supabase.mjs`: opt-in dataset with filtering, inserts, updates, flags, reset/error controls.
- `e2e/placements.spec.ts`: replace obsolete phone skip with populated save/reload, invalid input and empty-state assertions.
- `scripts/demo/{start,reset,clock,capture,rehearse,pages}.mjs`: isolated local lifecycle, fixed date, actual browser capture, coding exercise and actual-file evidence viewers; loopback only.
- `scripts/demo/{cases,baseline,verify,comparison}.ts`, `scripts/demo/{comparison,fixtures}.test.ts`: preserved baseline formulas, explicit expected cases and evidence, unexpected-change detection and fixture checks.
- `playwright.config.ts`, `e2e/run-local.mjs`: optional validated local port preserves the existing port-3000 app.
- `package.json`: demo commands only, no dependency changes.
- `docs/engineering/live-demo/{script,prompts,README}.md`, `screenshots/*.png`, `evidence/*`: user-requested script and real captured evidence.
- `specs/049-live-technical-demo/**`: owning feature artifacts/checklists/evidence summary.
- `docs/decisions/open-questions.md`: append actual owner decision.
- `.github/skills/project-map/SKILL.md`: append feature/document index only; preserve existing edits.
- `docs/prepare-live-walkthrough.prompt.md`: point to implemented artifacts and resolved decision.

## Design decisions
One pure helper receives start date, period and explicit current instant. Server load and save both call it; no client clock math for saved count. Add strict valid-calendar-date boundary validation because Date normalizes impossible dates. Preserve unchanged calculation of guarantee end and flag view.

Fixtures opt in via local provider control; default existing tests remain unchanged. The demo launcher preloads a fixed Date only in its Next.js child; mock and browser use matching scenario time. Ordinary e2e uses actual date with relative fixtures. No demo clock or controls ship in app code. Loopback server exposes no CORS grant and refuses browser-origin writes to its control API.

## Verification
Capture failing list/create assertions before app edits. Helper boundaries and comparison classifier get unit tests. Browser tests exercise populated load, real Server Action save, reload, name prompt, validation, empty list and both widths. Required lint/typecheck/unit/build/e2e gates. Capture PNGs using Playwright Chromium, inspect images. Record mock limitations and no live Copilot execution. No remote calls or DB claims.

## Complexity Tracking
No exceptions. Supported Spec Kit scripts run with `SPECIFY_FEATURE_DIRECTORY` and `SPECIFY_FEATURE_NO_PERSIST=1` to preserve the other in-progress feature pointer. No extension hooks file exists. Missing retired area skill paths are replaced with their owning repository documents, not external skills.
