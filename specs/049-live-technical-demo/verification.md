# Verification: fifteen-minute technical demo

Verified 2026-10-05 on Node 22.23.2. No remote operations, Git mutations or dependencies added. Existing unrelated changes preserved.

## Actual checks

Evidence lives in [the evidence directory](../../docs/engineering/live-demo/evidence/).

| Command | Result | Output file |
| --- | --- | --- |
| npm run lint | Pass: zero errors, ten existing warnings including nested worktree files | full-lint.txt |
| npm run typecheck | Pass | full-typecheck.txt |
| npm test | Pass: 440 tests in 70 files | full-unit.txt |
| npm run build | Environment failure: Turbopack worker cannot bind a port | default-build-failure.txt |
| npm exec -- next build --webpack; node scripts/check-client-bundle.mjs | Pass: production build and existing secret check, no leaks | webpack-build.txt |
| PLAYWRIGHT_LOCAL_PORT=3101 npm run test:e2e | Pass: 75 passed, 37 existing skips; all eight placement tests passed without skips | full-e2e.txt |
| npm run demo:verify | Pass: 11 explicit outputs, 33 focused tests | verification.md, focused-tests.txt |
| npm run demo:baseline | Expected exit 1: historical formulas violate approved cases | baseline-replay.txt |
| npm run demo:rehearse and printed test command | Historical exercise: 5 failed, 6 passed; corrected exercise: 11 passed | rehearsal-red.txt, rehearsal-green.txt |
| git diff --check | Pass | No whitespace errors |

The genuine application regression run failed four assertions before the fix; red-tests.txt retains its output. That initial run used host Node 20; final checks, builds, captures and rehearsal used required Node 22. The temporary exercise was checked using Codex and the prepared implementation; its logs do not claim a Copilot session.

The default build ends with `binding to a port` / `Operation not permitted (os error 1)`. Installed Next.js documentation supports the production `--webpack` option. Demo and local browser harness use it; the default build command remains unchanged. The failed gate is retained and reported.

## Acceptance trace

- FR-001–002: month, leap, year, Singapore midnight, zero and cap cases, with independently enumerated expectations and both historical load/save paths.
- FR-003: service tests and actual browser typed-name save/reload at both widths; client consumes server result.
- FR-004: impossible date rejected before database access; early-date and failed-write browser checks preserve input/focus.
- FR-005: fictional fixtures, reset/persistence tests and successful local launch/login/capture. Demo uses 3100/54329; tests use 3101 to preserve the existing port-3000 app.
- FR-006: eight placement scenarios pass at desktop and phone widths with textual flags and no horizontal overflow.
- FR-007: all 11 values equal explicit expectations; classifier tests reject unexpected differences even with a requirement reference.
- FR-008: 14 direct Chromium PNGs, one actual pre-fix app capture and 13 corrected app/evidence captures. [Before provenance](../../docs/engineering/live-demo/screenshots/before-manifest.json) and [after provenance](../../docs/engineering/live-demo/screenshots/after-manifest.json) retain source/image hashes, viewport and scenario. Every image was inspected; phone modal captures wait for transitions.
- FR-009: [script](../../docs/engineering/live-demo/script.md), [prompts](../../docs/engineering/live-demo/prompts.md) and [run instructions](../../docs/engineering/live-demo/README.md) provide 3 + 2.5 + 5 + 4.5 minute cues, fallback evidence and finding→spec→implementation→test traces.

## Limits and presenter preparation

Real Next.js UI, access boundary and Server Actions run against fictional in-memory auth/REST. SQL, RLS, Storage, mail and remote deployment are not verified. Existing unrelated screen skips remain unchanged.

The app is already corrected. Live coding uses an explicitly labeled isolated exercise without reverting the repository. The presenter must rehearse twice on the actual laptop, verify Copilot availability and complete the timed delivery including fallback. No human timing or live Copilot execution is claimed. Implementation tasks are complete; no product clarification remains.
