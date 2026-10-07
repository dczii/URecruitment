# Fifteen-minute technical demo script

> **Current rehearsal state (owner request, 6 October):** the running demo now uses the original broken arithmetic in src/server/placements/list.ts and src/components/features/placements/Placements.tsx. Avery should show 60 of 30 on load. The corrected helper, server save response, validation and regression tests remain available. The remaining script describes the corrected target and isolated exercise; it is not a claim that this live before-state passes. After fixing those two integrations, stop/restart demo:start to rebuild before verification. demo:reset only restores data. Do not run corrected demo:capture until the fix is restored.

Demonstrate one business rule from evidence to specification, a bounded implementation, and verified behaviour. The countdown now consistently counts Singapore calendar dates and displays capped days used. The owner chose the display rule; the engineer reviewed the arithmetic, service boundary and tests.

This script covers the **15 minutes of hands-on technical work**. Start the clock with the local app authenticated and the IDE, terminal, specification and evidence ready. It contains actual browser screenshots captured during preparation. Prepared images and reports are labeled; they are not a record of a live Copilot session.

## Prepare before starting the clock

1. Use Node 22 and run `npm run demo:start` in terminal A. Keep it running. It builds before the timed demo and uses **127.0.0.1:3100**, using isolated build output in .next-demo and leaving the existing port-3000 app alone.
2. Open http://127.0.0.1:3100/login. Use fictional `recruiter@example.test`, then mock code `001234`. No mail is sent. Open `/placements`.
3. In terminal B, run `npm run demo:reset`, `npm run demo:verify`, `npm run demo:capture` and `npm run demo:check`. Reload the page. The fixed scenario is **5 October 2026, 12:00 Singapore**.
4. Run `npm run demo:rehearse`. It prints a temporary exercise directory and an exact Vitest command. Open its spec, historical helper and tests in VS Code. Run the command once before rehearsal to confirm the expected failure. Create a fresh exercise for the actual timed run.
5. Have these tabs ready: [before screenshot](screenshots/before-desktop.png), [specification](../../../specs/049-live-technical-demo/spec.md), [live prompts](prompts.md), the exercise's `placement-countdown.ts`, and [verification report](evidence/verification.md).
6. Use a fresh private browser for the timed app save so “Add name” appears in the current sidebar. The mock code is local only; do not use the development database for rehearsed writes.
7. Full lint, typecheck, unit, build and both-width browser checks are preflight checks. Do not spend the timed demo building/installing or running the entire suite.

The app is already corrected. The coding portion uses an isolated exercise derived from the actual historical formula and the same spec cases. Say this explicitly. After the edit, show the real integrated app and service wiring. Do not revert the shared working tree or present a completed app as a new live integration.

## Screen order at a glance

| Time | Screen ready before the clock | Proof shown |
| --- | --- | --- |
| 0:00 | Historical before capture + terminal | Baseline violates explicit cases |
| 3:00 | Exercise spec.md + cases.ts in VS Code | Same specification governs code and tests |
| 5:30 | Exercise helper + terminal | Actual failing → passing test run and reviewed diff |
| 10:30 | Repository terminal + consistency report | Exact expected/actual values |
| 12:00 | Local demo placements, unconfirmed Frankie row | Typed-name save and real reload |
| 13:30 | Trace table; validation capture ready for questions | Finding → requirement → code → test → evidence |

The current sidebar account menu and modernised dashboard/job dropdowns are part of the merged application. Do not spend this technical demo touring them. The placement rule remains the narrow engineering example. October 6 development-app captures are preserved in [local observations](local-observation-2026-10-06/README.md); the main sequence uses one fixed fixture.

## 0:00–3:00 Analyse current-state evidence

**Show:** the retained before screenshot, then the original formulas and comparison inputs. The screenshot is a real pre-fix render of the same fictional records, not an edited mockup.

![Original placement page before the correction](screenshots/before-desktop.png)

**Say:** “This is the original application captured before the change. Avery has 60 elapsed days for a 30-day guarantee. The page says 60 of 30. The saved calculation capped that value, so loading and saving could produce different results. I will trace the rule and distinguish that evidence from what the product should do.”

Run in terminal B:

```sh
npm run demo:baseline
```

**Expected:** the preserved historical formulas are compared with explicit expected values; the command exits **1 intentionally** because some original outputs violate the approved specification. It does not revert or modify the current app. Jan 31 → Feb 1 has original load 0 and expected 1; ended guarantee has original load 60 and expected 30. The before-Singapore-midnight case also exposes the original rounded UTC save calculation.

Paste [Analyse prompt](prompts.md#1-analyse--read-only). Inspect its citations against `scripts/demo/baseline.ts`, not against memory.

**Say:** “The old helper passed an ISO month directly to Date.UTC, whose month is zero-based. Separately, the client rounded a UTC interval. Those are implementation findings. Capping after expiry is a product choice, which I asked the owner to decide.”

**Boundary at 3:00:** move to the specification even if AI analysis is slow. Fallback: the actual [research findings](../../../specs/049-live-technical-demo/research.md), [pre-fix failing test output](evidence/red-tests.txt), and baseline matrix.

## 3:00–5:30 Specify expected and preserved behaviour

**Show:** feature 049's spec and the copied spec in the exercise. Open FR-001, FR-002 and the recorded clarification.

![Actual specification file rendered in a prepared evidence viewer](screenshots/specification-desktop.png)

**Say:** “The owner approved days-used wording capped at the client's period. The start is day zero; a future start also shows zero. The existing flag becomes ended only after the end date. These expected outputs guide both the implementation and the tests.”

Point to the explicit cases:

| Input | Required output | Why |
| --- | --- | --- |
| Jan 31 → Feb 1, 30-day period | 1 | Correct calendar boundary |
| 60 elapsed days, 30-day period | 30 | Approved cap |
| Future start | 0 | Approved lower bound |
| Just before Singapore midnight | 0 | No rounding of partial UTC days |
| At Singapore midnight | 1 | Singapore date crossed |
| Non-default 60-day period, 65 elapsed | 60 | Client period remains authoritative |

Paste [Specify prompt](prompts.md#2-specify--bounded-refinement). Review any actual wording refinement in the exercise's spec. If the scenario is already clear, explain it without manufacturing a revision.

**Say:** “The five-working-day warning is a separate rule. It stays unchanged. The scope is the calendar count, its approved display and load/save agreement.”

**Boundary at 5:30:** acceptance cases must be visible. Fallback: open the prepared spec directly. The owner decision was made during preparation, not invented on stage.

## 5:30–10:30 Implement from the spec with Copilot

**Show:** the isolated exercise created by `demo:rehearse`. It contains the preserved formula, explicit cases and spec-derived tests. Use the exact command printed by the setup, for example:

```sh
npm exec -- vitest run --config /path/printed/by/demo-rehearse/vitest.config.mts
```

**Say:** “This isolated exercise starts from the historical initial-load formula. It uses the same approved examples as the working application. The regression fails before implementation. Copilot is supplied with the spec, cases, test and this one file.”

Paste [Implement prompt](prompts.md#3-implement--isolated-exercise). Inspect the actual generated diff before accepting it. Check Singapore date conversion, month/leap handling, zero/cap bounds and the client period. Explain one real review decision; do not invent a defect or rejection for the demonstration.

Run the exercise tests again. **Expected:** all 11 cases pass. Inspect the generated diff using the command in the exercise README.

Then briefly open the real integration:

- `src/server/placements/list.ts` calls `placementDaysUsed` on load.
- `src/server/placements/create.ts` adds authoritative `daysUsed` to the save response.
- `src/components/features/placements/Placements.tsx` displays that server value after saving.

![Actual shared helper source rendered in a prepared evidence viewer](screenshots/implementation-desktop.png)

**Say:** “A shared function alone would still allow two clocks to disagree. The server calculates the result on load and save; the browser consumes that result. Input validation also rejects impossible calendar dates before a write.”

**Boundary at 10:30:** move to verification. If the AI/edit stalls, open the actual prepared helper and passing test result. State that it is preparation evidence and that the live exercise has not completed.

## 10:30–15:00 Verify behaviour and trace the evidence

### 10:30–12:00 Run consistency and focused checks

Run:

```sh
npm run demo:verify
```

**Expected:** exit 0; all 11 outputs match the independently specified expected values; focused service/logic tests pass. Open [the generated report](evidence/verification.md).

![Actual comparison evidence rendered in the prepared viewer](screenshots/consistency-desktop.png)

**Say:** “A changed output passes only if it matches the spec exactly. A criterion ID does not make any difference acceptable. January's boundary and the expired cap are approved differences; a normal four-day count stays unchanged. This covers the enumerated cases, not every possible system behaviour.”

### 12:00–13:30 Save and reload in the actual app

Open `/placements`. Avery now shows **30 of 30**; Casey is **30 of 30** with “Guarantee ending soon” because the end date is today. Devon shows **10 of 30**; Emery shows **0 of 30** because the start is future.

![Corrected placement page with the same fixture](screenshots/after-desktop.png)

For Frankie Teo (fictional), enter **2026-09-25** and click **Confirm**. On first use, type **Demo Recruiter** in the name dialog and choose **Continue**. If the name is already remembered, the save continues using the established behaviour. Use a fresh private browser session during preflight if you need to demonstrate first use; do not modify auth guards.

![Real typed-name confirmation dialog](screenshots/typed-name-desktop.png)

**Expected:** Frankie displays **10 of 30 days used**. Reload the page: the start date and count persist.

![Actual saved placement after a browser reload](screenshots/saved-reloaded-desktop.png)

**Say:** “This invokes the real Server Action against the local fictional provider. Typed-name attribution is retained. The save response and subsequent load agree.”

### 13:30–14:30 Follow one complete trace

| Finding | Requirement/scenario | Implementation | Verification | Result |
| --- | --- | --- | --- | --- |
| F-001: wrong month conversion | [FR-001 / US1 scenario 1](../../../specs/049-live-technical-demo/spec.md) | [placementDaysUsed](../../../src/lib/placement-countdown.ts) and [list integration](../../../src/server/placements/list.ts) | [month-end test](../../../src/lib/placement-countdown.test.ts), [load regression](../../../src/server/placements/list.test.ts) | [before/expected/actual evidence](evidence/verification.md) |
| F-002: load/save count disagreement | [FR-002 and FR-003](../../../specs/049-live-technical-demo/spec.md) | [save response](../../../src/server/placements/create.ts), [client consumption](../../../src/components/features/placements/Placements.tsx) | [service tests](../../../src/server/placements/create.test.ts), [save/reload browser test](../../../e2e/placements.spec.ts) | [focused output](evidence/focused-tests.txt), saved/reloaded screenshot |
| F-003: missing populated interaction checks | [FR-005 and FR-006](../../../specs/049-live-technical-demo/spec.md) | [local fixtures](../../../e2e/placement-fixtures.mjs) | [placement browser tests](../../../e2e/placements.spec.ts) | [feature verification](../../../specs/049-live-technical-demo/verification.md), save/reload capture above |

### 14:30–15:00 State the result and limits

**Say:** “The approved date cases pass and load/save/reload agree. We used a real application with fictional local data. SQL/RLS, private storage and production services require separate verification. AI proposed changes; the engineer checked the spec, diff and actual results.”

Finish at **15:00**. Keep invalid-save and empty-state images for technical questions, rather than using the final minute for another product tour.

## Real screenshot backup for questions

All images below are direct browser captures. The backend is the local fictional provider; the application UI and Server Actions are real. Capture manifests identify viewport, scenario time, file hashes and source state.

### Rejected save preserves input

![Real rejection of a start date before placement](screenshots/validation-desktop.png)

The tests also inject a local provider failure and confirm feedback/input preservation; the provider control is absent from application routes.

### Empty state

![Actual empty placement page](screenshots/empty-desktop.png)


## Recovery and rehearsal

Use at most 30 seconds to recover within a step, then switch to its prepared artifact and identify it as prepared. Respect the 3:00, 5:30 and 10:30 transitions so verification stays inside the demo. Aim for 14 minutes in rehearsal with one minute spread across steps for recovery.

The automated run proves commands, cases and UI flows; it does not prove human speaking duration or Copilot availability. Rehearse twice on the actual laptop, including an AI/network failure. Record actual durations and real AI review decisions. See [prompts.md](prompts.md) for the material inputs, outputs and human checks at every stage.

## Rehearsal reference: account, commands and manual reset

### Demo account

- URL: http://127.0.0.1:3100/login
- Email: `recruiter@example.test`
- Mock login code: `001234`
- Typed audit name: `Demo Recruiter`

This account works only with the fictional local provider. No real email is sent. Use a fresh private browser session to show the first-use name dialog; data reset does not clear a name remembered in browser storage.

### Start the before-state demo

From the repository root, use Node 22:

```sh
nvm use 22
npm run demo:start
```

Keep that terminal running. If a demo already occupies port 3100, stop its terminal with Ctrl-C first. Startup rebuilds the app into `.next-demo`. Open `/placements` and sign in: Avery should show **60 of 30** in the current before-state.

In a second terminal:

```sh
npm run demo:reset
npm run demo:baseline
npm test -- src/server/placements/list.test.ts
```

The baseline command and the two list regression tests intentionally fail in the before-state. Expected failures include month-end **0 instead of 1** and expired count **60 instead of 30**. Do not edit expected values or delete tests. `demo:reset` restores fictional data only; it cannot undo code edits.

### Files to inspect and change during the live fix

| File | Current before-state / intended fix |
| --- | --- |
| `src/server/placements/list.ts` | Original month arithmetic and uncapped load. Replace with the existing shared `placementDaysUsed` calculation. |
| `src/components/features/placements/Placements.tsx` | Original rounded browser UTC calculation after save. Consume `result.placement.daysUsed` instead. |
| `src/lib/placement-countdown.ts` | Corrected helper already exists; inspect it. Edit only if the live change requires it. |
| `src/server/placements/create.ts` | Already returns authoritative `daysUsed`; inspect it. No edit is required for this two-file fix. |
| `src/server/placements/list.test.ts` and `src/lib/placement-countdown.test.ts` | Acceptance evidence; keep assertions unchanged. |

If using the original isolated exercise instead, run `npm run demo:rehearse`. Each invocation prints a new directory; edit only its `placement-countdown.ts`. It does not change the running app. Choose the live app integration or the isolated exercise before the timer and state which you are demonstrating.

### Verify after the live fix

Run from the repository root:

```sh
npm run demo:verify
```

Stop terminal A with Ctrl-C, then run `npm run demo:start` again. A browser reload alone does not rebuild a production demo. In terminal B:

```sh
npm run demo:reset
npm run demo:capture
npm run demo:check
```

Reload `/placements`. Avery should now show **30 of 30**. Confirm Frankie's start as **2026-09-25**, type `Demo Recruiter`, and reload: the saved value should remain **10 of 30**. Corrected screenshot capture and readiness checks belong after the fix; they intentionally fail or become stale in the before-state.

### Manually return to the before-state for another run

Stop the demo first. These commands overwrite only the two named files with their original historical versions; preserve any edits you want to keep before running them:

```sh
git restore --source=3c39f2e -- src/server/placements/list.ts src/components/features/placements/Placements.tsx
npm run demo:start
```

Then run `npm run demo:reset` in terminal B and reload `/placements`. Avery should be **60 of 30** again. This intentionally reinstates a known bug for local presentation; do not publish it as a completed product fix.

If you edited other files, inspect `git diff --name-only` and restore only those you intend to discard. The known corrected versions of the two integration files are available with:

```sh
git restore --source=c8ab858 -- src/server/placements/list.ts src/components/features/placements/Placements.tsx
```

Restart `demo:start` after either restoration. Avoid repository-wide resets: they would discard the script, demo tooling and other work. Capture/verify commands also update `docs/engineering/live-demo/screenshots/` and `evidence/`; those artifacts do not control the application calculation.
