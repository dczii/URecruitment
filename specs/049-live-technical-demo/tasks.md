# Tasks: Fifteen-minute technical demo

## Setup
- [x] T001 Create spec, plan, research, data-model, contracts and requirements checklist in specs/049-live-technical-demo/; record actual user decision.

## US1 — Consistent countdown
- [x] T002 [US1] Write and run failing tests in src/server/placements/list.test.ts and src/server/placements/create.test.ts; retain actual failures in docs/engineering/live-demo/evidence/.
- [x] T003 [US1] Test and implement src/lib/placement-countdown.ts and src/lib/placement-countdown.test.ts; integrate src/server/placements/list.ts, src/server/placements/create.ts, src/app/placements/actions.ts and src/components/features/placements/Placements.tsx.

## US2 — Reproducible environment
- [x] T004 [US2] Add e2e/placement-fixtures.mjs and integrate e2e/mock-supabase.mjs; implement scripts/demo/start.mjs, scripts/demo/reset.mjs and scripts/demo/clock.mjs plus package.json commands; add local port support in playwright.config.ts and e2e/run-local.mjs.
- [x] T005 [US2] Capture real baseline with scripts/demo/capture.mjs before T003; save docs/engineering/live-demo/screenshots/before-desktop.png and provenance.
- [x] T006 [US2] Expand e2e/placements.spec.ts for populated, save/reload, typed-name, invalid/failed save and empty cases at both widths.

## US3 — Script and evidence
- [x] T007 [US3] Add scripts/demo/cases.ts, scripts/demo/baseline.ts, scripts/demo/verify.ts and scripts/demo/comparison.ts, scripts/demo/comparison.test.ts and scripts/demo/fixtures.test.ts; generate comparison report. Add scripts/demo/rehearse.mjs and scripts/demo/pages.mjs for the isolated exercise and actual-file viewers.
- [x] T008 [US3] Capture actual corrected browser states using scripts/demo/capture.mjs into docs/engineering/live-demo/screenshots/; inspect every image.
- [x] T009 [US3] Write docs/engineering/live-demo/script.md, prompts.md and README.md with exact commands, 15-minute cues, real images, trace links and limitations.

## Verification and documentation
- [x] T010 Run required checks and record actual output in specs/049-live-technical-demo/verification.md. Append actual decision to docs/decisions/open-questions.md and feature index to .github/skills/project-map/SKILL.md; link implemented artifacts from docs/prepare-live-walkthrough.prompt.md.

Dependencies: T001 → T002/T004 → T005 → T003 → T006/T007 → T008 → T009 → T010. No parallel agents required. Tests precede logic edits; baseline capture precedes application fix. No Git mutations.
