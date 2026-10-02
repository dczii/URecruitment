# Implementation Plan: Recruitment UI and experience polish

**Date**: 2026-10-02 | **Spec**: [spec.md](spec.md)
**Working branch**: `codex/ui-experience-polish`, isolated from `origin/main`. Spec Kit feature identifier is `001-ui-experience-polish`.
**Status**: User subsequently authorized implementation and a PR. Local implementation is complete; The user explicitly confirmed PR creation on 2026-10-02 after the authorization question. Publication is in progress. Story linkage and Claude review remain outstanding workflow gates.

## Summary

Fix dashboard semantics/readability first, establish coherent shell and shared interaction states, then apply responsive cards and form feedback across existing screens. Use installed components and CSS; preserve all server actions and recruitment rules. See [research.md](research.md) for evidence and [contracts/ui.md](contracts/ui.md) for visual/interaction contracts.

## Technical Context

**Language/Version**: TypeScript strict, React 19.2.8, Next.js 16.3.5 App Router.
**Primary Dependencies**: Existing Tailwind 4, shadcn, Base UI 1.8, lucide-react, Zod 4; no additions.
**Storage**: Existing Supabase/server-only contracts unchanged; device recruiter-name localStorage reused.
**Testing**: Vitest + Testing Library and Playwright desktop/phone; no additional test dependency.
**Target Platform**: Desktop/mobile browsers, keyboard, pointer, touch, reduced motion.
**Project Type**: Existing recruitment web app.
**Performance Goals**: No artificial result/focus delay, UI pointer motion ≤250ms, existing search target <3s on equivalent fixtures/environment; no decorative perpetual motion.
**Constraints**: Fictional data; no network in unit tests; no remote Supabase operations, migrations or deployment. Git writes for the task-owned draft PR are explicitly authorized.
**Scale/Scope**: Existing eight recruiter screen types plus shared shell; 6–20 recruiters. Settings receives presentation only.

## Constitution Check

Pre-research and post-design: scope complies with principles I–X; implementation workflow remains gated on Story linkage/review.

| Principle | Design commitment | Verification |
| --- | --- | --- |
| I Recruiters decide | Existing actions and explicit name-confirmed mutation paths only | Existing stage regression suites; no mutation during visual audit |
| II No email | No notification/integration work | Review changed imports/actions |
| III Server-only | Existing server data contract and private signed CV links | Build client-bundle gate |
| IV No product AI | Keyword/filter search and manual forms retained | Scope/source review |
| V Fair employment | Keep reason-gated nationality/language requirements | Existing job/search tests |
| VI Fictional data | EN/ZH fixtures; no secrets or real records in artifacts | Review screenshots/logs and fixture setup |
| VII Singapore time | Existing formatter patterns; date-only calendar dates preserved | Date fixtures at SGT boundary |
| VIII Typed name | Reuse validation/storage/dialog; no fabricated identity | Header/name tests; stage tests |
| IX Test-first/responsive | Failing tests before selection, identity or focus behavior changes; desktop+phone gates | tasks.md and quickstart.md |
| X Decided/proposed/open | Existing proposed delay behavior stays labelled; all register-open features excluded | Scope review |

Workflow exception: planning artifacts exist before a Story issue because the user requested a local plan/spec and repository rules prohibit GitHub operations. The user subsequently explicitly requested implementation; this authorizes local app/spec edits. Story linkage/Claude review are recorded as outstanding, and Git operations for this draft PR are now explicitly authorized. Existing dirty files are preserved.

## Project Structure

Planning artifacts: spec.md, plan.md, research.md, data-model.md, quickstart.md, tasks.md, contracts/ui.md, checklists/ux.md.

Implementation surfaces: `src/components/patterns/`, `src/components/ui/`, `src/components/features/`, existing `src/app/**/page.tsx`, `src/app/globals.css`, `src/lib/recruiter-name.ts` (reuse), and `e2e/`. No `src/server` behavior or schema changes.

## Phases and delivery

1. Baseline and Story linkage: map dirty-file ownership, capture measured desktop/phone screen states, extend acceptance tests.
2. Foundation: document token/motion/layout contracts in existing design mirrors and create small shared responsive/state patterns only where used by multiple screens. Read installed Next.js docs for relevant metadata and client/server conventions before coding.
3. US1: named desktop sidebar, logo placement and compact phone header; actionable typed-name display; route titles. Preserve focus order.
4. US2: fix six-column dashboard tables, full-width list, conditional existing selection preview, filtered-selection reconciliation, visible filter scope and phone cards. Preserve server ordering and mutation semantics.
5. US3: responsive jobs/search/placements, readable detail sections, consistent validation/loading/empty/error/success copy. Correct visible affordances; settings remains a stub.
6. US4: shared purposeful motion and modality/reduced-motion behavior after layouts stabilize. No animated route entrances or delayed keyboard work.
7. Delivery gates: meaningful existing regressions, visual captures at both widths, zoom/EN/ZH/focus/contrast checks, build client-bundle check, Claude review.

Each phase is independently reviewable. Ship US1/US2 as the first useful increment; later phases reuse the same contracts. Exact files and test ordering are in tasks.md. If an unlisted file is necessary, report it; do not silently expand product scope.

## Complexity Tracking

No architectural exceptions or new infrastructure. New patterns are presentation composition, not duplicate domain abstractions. Updating design mirrors is explicitly included in future implementation tasks; this planning pass does not alter them.

Publication checkout: branch starts from origin/main, excludes unrelated source workflow commits, and uses Node 22.23.2 for verification. Spec Kit infrastructure is separate; only this feature’s documents are included.
