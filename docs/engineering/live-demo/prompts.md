# Live prompts

Paste these into VS Code Copilot agent mode. These are versioned preparation prompts, not logs of a Copilot run. Supply only the fictional app files, the feature spec and the isolated exercise. Keep external briefing documents out of context. The temporary directory is printed by `npm run demo:rehearse`.

## 1 Analyse — read only

```text
Read specs/049-live-technical-demo/research.md, scripts/demo/baseline.ts,
scripts/demo/cases.ts and the retained before screenshot/manifest.
Trace how the original initial-load calculation and original post-save
calculation differ. Cite exact file/symbol evidence. Reproduce January 31
→ February 1 and the 60-elapsed-days/30-day-period case using the preserved
formulas. Distinguish observations, inferred causes and evidence limits.
Do not edit files or run remote commands. The current application is already
fixed; this analysis concerns the explicitly preserved historical baseline.
```

**Engineer checks:** actual formula, one-based versus zero-based month, UTC versus Singapore date, independently specified expected output, and what the local provider cannot prove.

## 2 Specify — bounded refinement

```text
Read the copied spec.md in the isolated exercise and its cases.ts.
The owner approved capped “X of Y days used,” zero before/on start,
and ended only after the guarantee end date. Explain how FR-001 and
FR-002 guide the implementation and verification. Refine the wording
of the month-boundary acceptance scenario for clarity without changing
its expected output, requirement IDs or approved scope. Show the diff.
Do not invent another owner decision or modify the repository's product spec.
```

**Engineer checks:** start is day zero, calendar days versus working-day warning, expected outputs stay authoritative, refinement does not change an approved requirement. If no clarification is needed, explain why and avoid an artificial edit.

## 3 Implement — isolated exercise

```text
In the isolated exercise directory printed by demo:rehearse, read spec.md,
cases.ts, countdown.test.ts and placement-countdown.ts. Run the supplied
Vitest command and inspect the failures. Implement only placementDaysUsed
in placement-countdown.ts from FR-001 and FR-002: use the Singapore
calendar date of the explicit now argument, correct month/year/leap
boundaries, day zero on start, and clamp elapsed days to [0, period].
Preserve the historical originalLoad/originalSave functions as evidence.
Do not modify expected values or weaken tests. Show the diff and explain
why the browser's clock must not recompute the saved app count.
Do not edit the working app, install dependencies, perform Git mutations
or contact remote services. Run the tests again and report actual results.
```

**Engineer checks:** tests failed before the edit, generated implementation matches the spec, no working-day logic is introduced, no period is hard-coded, untouched cases stay correct. Inspect a real issue if one arises; do not manufacture an AI mistake.

## 4 Verify — application and evidence

```text
In the repository, run npm run demo:verify. Read the resulting
verification report and identify an approved difference and an unchanged
case. Trace FR-001 from spec to placement-countdown.ts to its boundary
test and actual result. Inspect list.ts, create.ts and Placements.tsx
to confirm load and save use the shared calculation and the UI consumes
the server's daysUsed. State what the automated comparison proves and
what requires browser, database or human evidence. Do not claim Copilot
ran earlier preparation work. Do not modify files to make results pass.
```

**Engineer checks:** exact expected/actual values, source hashes, result exit code, save/reload behaviour, and honest treatment of unrun checks. The terminal and browser supply the evidence; AI summarizes it.
