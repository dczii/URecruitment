---
description: Prepare the 15-minute hands-on technical demo from current-state analysis through specification, Copilot implementation and verification
agent: agent
---

# Prepare the repository for the 15-minute technical demo

## Purpose and scope

Focus preparation on the **15-minute hands-on technical demo**, led personally by the named Tech Lead. The surrounding introduction, slides, closing and 10-minute Q&A belong to the wider presentation and are not deliverables of this task. Demonstrate a complete chain: current behaviour → validated finding → requirement → specification → implementation → verification evidence. Give specification-driven development the most attention: the same authoritative specification must actively guide both implementation and verification.

Use this recruitment portal as a representative engineering example on fictional data. AI assists engineering; the product itself has no AI. The objective is credible engineering evidence, not a tour of every product feature, a new application, or a claim of production readiness.

Copilot in VS Code is the intended live tool. Confirm that choice against the presenter's submitted tooling disclosure before rehearsal; do not claim the prototype was originally built using Copilot. Record only tool usage and human decisions that actually happened.

This file is a preparation brief, not evidence that preparation has been completed. When invoked, start with the read-only readiness audit below. Follow the user's authorized phase; a request to revise this prompt does not authorize its implementation phases. Route subsequent feature planning and implementation through the repository's Spec Kit workflow.

## What the 15-minute demo must prove

| Capability | Visible demonstration | Evidence to retain |
| --- | --- | --- |
| Understand an existing system | Trace the placement page through server data, client save handling and the database flag view; reproduce one discrepancy | Source citations, actual inputs/outputs, dependency sketch, assumptions and limitations |
| Use specifications as an active input | Turn the finding and an actual owner decision into expected behaviour and acceptance scenarios; supply that spec to Copilot and to test design | Versioned spec, stable requirement/scenario references, decision record |
| Apply engineering judgement | Inspect a real generated diff, explain a risk, and accept or correct it with reasons | Actual prompt/context, output reference, human decision and resulting diff |
| Verify consistency | Compare original, expected and changed outputs for identical inputs; distinguish deliberate changes from regressions | Repeatable case matrix, tests, command results and discrepancies |
| Handle a changed requirement | Show the impact on the spec, expected cases, implementation and evidence without restarting unrelated analysis | Small spec revision and trace links; prepare this for Q&A if time is tight |
| Disclose tooling | Explain function, inputs, outputs, human judgement and validation for each tool actually used | Concise tooling table; distinguish AI suggestions from deterministic checks |
| Support continuation by another engineer | Open the runbook and follow a trace from a requirement to its result | Editable artifacts, exact commands, environment and known limitations |

A successful demonstration does not establish wider commercial qualification, customer track record, production security, or compliance with requirements outside this repository. Keep those claims separate and supported by the owner's actual records.

## Read first and preserve boundaries

Read `AGENTS.md`, `CLAUDE.md`, `.specify/memory/constitution.md`, the project-map skill, applicable area skills, and `docs/decisions/open-questions.md`. Read the existing placement plans in `specs/043-guarantee-flag/` and `specs/044-placements-screen/` as historical context. Before app changes, read the relevant installed Next.js guides under `node_modules/next/dist/docs/`. Read affected code and tests before editing.

- Preserve unrelated work. Record HEAD and dirty files before starting; do not reset the working tree to obtain a demo baseline.
- Do not commit, push, create or switch branches, tag commits, edit `.git/`, create PRs, change repository settings, or operate against remote GitHub, Supabase or Vercel. The user controls those operations under the current repository rules.
- Planning does not require issue linkage or a named reviewer. Human judgement during the demo is essential; mandatory PR approvals and branch protection are separate owner decisions. A CODEOWNERS file alone does not enforce review.
- Edit protected planning/configuration paths only when the requested task expressly includes them. List exact proposed files per phase before implementation. Do not treat this brief as blanket permission to rewrite `.github/`, `.claude/`, `.specify/`, `specs/`, or repository rules.
- Use npm and the repository's Node version. Do not add unplanned dependencies or install tools without the required authorization.
- Keep fictional data, server-only database/storage access, private storage, typed-name auditing, Singapore date rules and recruiter-controlled actions intact. Only requested login OTP emails to approved recruiters are allowed; the local rehearsal should not send mail.
- Do not manufacture approvals, review comments, logs, timestamps, baseline results, or customer outcomes. Mark prerecorded/prepared material clearly. Never present a mock provider as proof of SQL, RLS or external-service behaviour.
- Keep externally supplied briefing/source documents and their identities out of public-facing artifacts, AI demo context, screenshots and repository walkthroughs. Use generic engineering language in new public files. Do not reproduce briefing text or automatically publish existing source documents. Owner checks sharing suitability before presentation.

## Local findings to recheck

Inspected on 5 October 2026 at HEAD `3c39f2e`, with an already dirty working tree. These are source-inspection findings, not a browser rehearsal or a clean-commit certification. Recheck paths and behaviour before using them on stage.

| Area | Current evidence | Preparation implication |
| --- | --- | --- |
| Tool configuration | `.github/skills/` and `.agents/skills/orchestrator/` exist; `.github/agents/`, `.github/prompts/` and `.github/instructions/` were absent | Inventory existing skill locations and symlink targets; do not repeat the old wholesale migration or delete design skills merely for presentation |
| Governance | Current constitution and `CLAUDE.md` remove mandatory issue linkage and named review gates | Remove obsolete workflow assumptions; do not claim remote review enforcement without owner-supplied evidence |
| Product surfaces | Routes exist for login, dashboard, jobs, job detail, job creation, candidate detail, search and placements | Reuse existing screens; presence of a route does not prove its data or interactions work |
| Settings | `src/app/settings/page.tsx` explicitly states that rule editing is unavailable | Keep outside the main demo; do not build settings or an unresolved CV queue just to fill navigation |
| Placement initial load | `src/server/placements/list.ts` uses a Singapore calendar date, an uncapped elapsed count, and `calendarDaysBetween` passes months directly to `Date.UTC` | Reproduce the countdown discrepancy and test month boundaries: `Date.UTC` expects a zero-based month, so overflow can distort elapsed days |
| Placement save | `src/components/features/placements/Placements.tsx` recomputes elapsed days from `Date.now()`, UTC midnight and rounding, then caps to the guarantee period | Verify initial load, save response and reload agree, including the Singapore midnight boundary |
| Guarantee status | `src/server/placements/guarantee.ts` reads the same flag view used by dashboard; its pure helper has unit coverage | Separate calendar-day elapsed/countdown display from the five Singapore-working-day warning; preserve flags unless the owner changes that rule |
| Placement tests | `e2e/placements.spec.ts` checks heading/overflow and explicitly skips phone; `list.ts` has no adjacent test | Add populated interaction and date-boundary coverage during the authorized feature; resolve the phone skip against the constitution |
| Local browser harness | `playwright.config.ts`, `e2e/run-local.mjs`, `e2e/auth-fixture.ts` use a local fictional provider; preview mode targets access-boundary tests | The earlier claim that all e2e writes go to a shared preview database is obsolete; inspect current commands before running |
| Fixture completeness | `e2e/mock-supabase.mjs` has no explicit placements handler, returns generic pipeline rows and empty fallbacks for other REST paths | A loaded page is insufficient: add realistic linked placement data, filtering and persistent save/read behaviour before rehearsing this story |
| DB verification | `.github/workflows/db.yml` filters selected paths; `supabase/tests/working-days.db.test.ts` exists | Inspect coverage for changed TypeScript rule dependencies; do not imply mock e2e proves SQL equivalence |

Do not repeat historical PR counts, test counts, timing estimates, failure rates or remote ruleset claims as current facts. Measure the selected checkout and record unavailable evidence. Do not rename the project across the repository as presentation preparation; confirm the display name separately if needed.

## Recommended priorities and phases

### Phase 0 — Read-only readiness audit

Deliver a short readiness matrix with status `ready`, `needs work`, `blocked` or `not verified`, evidence paths, owner, priority and next action. Include code, spec, tests, local environment, Copilot readiness, fixtures, screens, evidence and rehearsal timing.

Inspect local diffs, available feature folders, test scripts, auth setup, mock behaviour and existing evidence. Distinguish the current working tree from committed behaviour. Identify the next available Spec Kit feature number without creating it yet.

Before changing Copilot configuration, verify the installed VS Code/Copilot behaviour against official documentation:

- https://docs.github.com/en/copilot/reference/customization-cheat-sheet
- https://code.visualstudio.com/docs/copilot/customization/custom-agents
- https://code.visualstudio.com/docs/copilot/customization/agent-skills
- https://code.visualstudio.com/docs/copilot/customization/prompt-files

Do not assume duplicate paths mean duplicate loading; inspect resolved paths and actual discovery. Reuse working configuration. If the required Spec Kit integration cannot be generated by its supported CLI, report that limitation rather than fabricating generated files.

Ask only the decisions needed to unblock dependent work. Continue independent audit and preparation work. Product decisions for the countdown are listed below.

### Phase 1 — Make the local demo reproducible (highest priority)

Prepare an authorized Spec Kit plan with exact files and acceptance conditions for a small, local-only demo environment. Reuse the existing harness where practical, but do not assume its current auth-oriented mocks support placement writes.

Required fixture states: start date unconfirmed; future start; active guarantee; warning boundary; end date today; ended guarantee. Include at least one month-end/leap-year case and one Singapore-midnight case in the test dataset. Use consistent fictional candidate/job/client IDs. Verify saves persist through reload and reset restores the original scenario.

Define a fixed scenario date and holiday fixture. Inject time at the appropriate test/demo boundary for both server and browser; a browser clock override alone cannot freeze server or SQL time. Keep mock/reset controls outside production routes. Reject remote targets for reset and demo writes. Never use the Blob-backed seed command as a rehearsal reset.

Provide one documented start command, one bounded reset command, fixture IDs, login procedure, expected screen states and shutdown instructions. These are deliverables to implement, not commands that already exist. Prebuild and warm the environment before the timed run. Prepare a local authenticated session through the existing test-only mechanism or rehearse local mock OTP; do not bypass production authorization.

### Phase 2 — Prepare one real specification-driven change

Use the placement countdown as the main scenario. Keep the scope to consistent date arithmetic, the owner-approved display rule and its integration into load/save/reload. Defer unrelated stage-limit parity work, broad CI reform, skill cleanup and product expansion unless essential to the chosen scenario.

Product decisions required before locking expected outputs:

1. After the guarantee ends, should the UI cap days used, show zero days remaining with an ended label, or use another wording?
2. What should appear for a future start date, and is the start date day zero or day one?
3. Does the guarantee remain active on its end date? Existing flag logic marks it ended only after that date; preserve this unless explicitly changed.

Treat suggested wording as a proposal. Record actual owner decisions in the authorized decision register/spec workflow; never convert a proposal into an approved requirement. Inspect the PRD and existing decisions before asking questions already answered there.

Follow specify → clarify → plan → checklist → tasks → analyze → implement. Use existing templates and requirement/scenario IDs, qualified by feature path where legacy IDs collide. Prepare the full workflow before presentation; only demonstrate the key spec refinement and bounded implementation live.

Build these artifacts with the owning feature, once their paths are authorized:

- Findings with source citations, reproducer, observed outputs, evidence/assumption split, and confidence limitations.
- Spec containing current behaviour, approved changed behaviour, preserved invariants, scope, acceptance scenarios and explicit date semantics.
- Failing tests for the approved rule before implementing it; retain the real failure result.
- A small implementation using one authoritative calculation where practical, with server and client responsibilities explicit.
- An actual AI interaction log: tool/version, sanitized prompt, supplied context, output/diff reference, human decision and reasons. Do not generate a fictional rejection merely to dramatize human control.

### Phase 3 — Produce verification and traceability evidence

Create a proportionate consistency mechanism for this feature, not a repository-wide framework. For identical fixed inputs, capture original actual output, approved expected output, changed actual output and classification: unchanged, approved difference, unexpected difference. An approved difference passes only when it exactly matches the spec's expected value; a linked criterion alone does not authorize any difference. Unexpected differences fail.

Cover missing/future starts, day zero/one, within-period, exact end date, after end, month/year transitions, leap day, Singapore midnight and save/reload parity. Preserve the separate warning rule with weekend/holiday cases. For SQL parity, use an isolated local Supabase stack and actual view/function results; if unavailable, report `not run` and keep mock results separately labeled.

Use one repeatable evidence command once implemented. Record HEAD plus dirty-state/diff identity, spec revision or content hash, fixture/clock identity, tool versions, actual commands, exit codes, test results, manual observations, discrepancies and unrun checks. Evidence must identify the exact code tested. Keep raw sanitized output alongside the summary.

Produce a readable Markdown/HTML trace table; no production route is required:

`Finding → requirement → spec scenario → implementation symbol → test case → result/evidence`

Use the existing template IDs; scope automated missing/orphan-reference checks to the demo feature. Do not claim that green tests prove all behaviour unchanged—state the covered cases and limitations. Verify the evidence generator itself fails on a deliberate unexpected result in a temporary test fixture, without modifying production behaviour.

Required gates: `npm run lint`, `npm run typecheck`, `npm test`; add `npm run build` for app changes and `npm run test:e2e` for screen changes. Run DB checks only against an isolated local stack when available and required. Report skips/failures honestly. Full builds and broad suites run before the session; live time is for measured focused tests and their results.

### Phase 4 — Prepare the necessary demo screens

The required live browser screen is populated `/placements`. Login is a preflight dependency. `/dashboard` is optional backup evidence and must not delay the core demo. The engineering surfaces below are equally necessary; a polished product page alone does not demonstrate the workflow.

| Surface | State that must be ready | Acceptance evidence / use |
| --- | --- | --- |
| `/login` | Local fictional login and expired/error state understood; valid session prepared before starting | No live inbox dependency or exposed credentials; disclose mock authentication |
| `/placements` — before | A reproducible affected placement with an explicit scenario date | Show observed original output; do not hard-code the old “60 of 30” example without reproducing it |
| `/placements` — after | Same placement and clock; agreed wording/count, warning/ended label, save then reload | Visible approved difference, with correct persistence and no unrelated data changes |
| Typed-name dialog | First save asks for a name; subsequent action uses the established behaviour | Demonstrate attribution using a fictional recruiter; distinguish typed name from authenticated identity |
| `/placements` — alternate states | Unconfirmed, future, active, ending soon, end-today, ended, empty and save failure | Tests/screenshots plus quick navigation; failures retain input and show useful feedback |
| `/dashboard` | Matching fictional placement warning/end status | Optional cross-screen consistency evidence; do not count an absent mock row as agreement |
| `/jobs`, `/jobs/[id]`, `/candidates/[id]`, `/search`, `/jobs/new` | Working linked fixtures and navigation if included | Supporting Q&A only; omit from the main story unless rehearsed and verified |
| `/settings` | Clearly identified placeholder | Exclude from functional claims; no new settings screen needed |
| IDE: analysis | Source, dependency path and reproducer side by side | Explain evidence versus inference |
| IDE: specification | Requirement, acceptance scenarios and a real revision/diff | Same spec feeds implementation and verification |
| IDE: Copilot and diff | Sanitized prompt/context, generated change, human review | Explain tool input/output and the accepted/corrected detail |
| Terminal/test report | Focused failing then passing tests and consistency matrix | Readable expected/actual values and exit status |
| Traceability/evidence document | Clickable links to the chosen criterion, code, test and result | Open at least one complete chain; distinguish automated and manual checks |

Verify desktop at 1440×900 and phone at 390×844. Fix or explicitly report the existing phone skip; do not claim phone coverage from desktop screenshots. Check keyboard operation, focus restoration, labels, error messages, readable text, status words/icons and horizontal overflow. Use existing theme tokens and components. Capture dated screenshots only from actual rendered states, with checkout/fixture references. Source inspection alone cannot mark a screen ready.

### Phase 5 — Rehearse the 15-minute technical sequence

Deliver a runnable technical runbook with exact local commands, prompts, file/symbol links, fixture IDs, expected outputs and fallback references. Do not produce a slide deck or expand this task into wider presentation planning. The clock starts with the application and IDE already open, authenticated, built and warmed.

| Demo clock | Step and presenter actions | Visible proof | Fallback at the step boundary |
| --- | --- | --- | --- |
| 0:00–3:00 | **Analyse:** show the affected placement; reproduce its actual output with fixed inputs; ask Copilot to trace the initial-load and post-save paths; inspect the cited code and distinguish observation from assumption | One concrete discrepancy, its dependency path, and one explicitly unresolved product question | Open the prepared reproducer output and cited finding; identify it as rehearsal evidence |
| 3:00–5:30 | **Specify:** open the feature spec; show the actual owner decision; refine one bounded acceptance scenario with inputs and expected output; identify behaviour that must remain unchanged | A visible spec revision and stable scenario reference that will drive both code and tests | Open the prepared spec diff and explain the approved decision; do not pretend the owner decided it live |
| 5:30–10:30 | **Implement with Copilot:** run the prepared spec-derived regression tests and explain the failure; supply the spec and exact task scope; inspect the generated diff; explain one real acceptance/correction decision; run the focused tests | Genuine failing-to-passing evidence and human inspection of the implementation against the same spec | Open the rehearsed implementation diff and its recorded test result; label both as prepared |
| 10:30–15:00 | **Verify and trace:** run the focused consistency check; compare original/expected/actual outputs; save and reload the same placement; open one complete spec → code → test → result chain; state remaining limitations | Approved difference, preserved cases, persistent UI result, traceability and honest coverage limits | Use the matching recorded browser interaction and evidence report, identifying what could not run live |

Within the final 4.5 minutes, budget approximately 90 seconds for focused tests and the consistency matrix, 90 seconds for browser save/reload, 60 seconds for the trace chain, and 30 seconds for limitations/recovery. Traceability is part of the technical demo, not postponed to a summary slide. Explain AI inputs, outputs and human controls while using the tool rather than adding a separate talk.

Prepare four short, versioned prompts, using supported configuration only when its paths are authorized:

1. **Analyse:** trace this placement's displayed count through load and save; cite evidence, identify discrepancies and label assumptions; do not edit application code.
2. **Specify:** refine the selected scenario using the recorded owner decision; preserve the stated invariants and existing IDs; do not invent decisions.
3. **Implement:** implement only the named task from the authoritative spec, starting from its failing tests; show the diff for human inspection.
4. **Verify:** execute the specified focused checks, compare fixed-input outputs with the approved expectations, and produce the trace/evidence summary; report failures and unrun checks.

Replace these descriptions with the exact rehearsed prompt text and actual commands in the runbook. Do not invent slash commands or evidence scripts that have not been implemented and tested.

#### Prepare beforehand versus demonstrate live

| Prepared before the clock starts | Performed visibly within 15 minutes |
| --- | --- |
| Full Spec Kit workflow, owner decisions, complete spec and task boundaries | Inspect/refine one acceptance scenario and explain the real decision behind it |
| Fictional fixtures, fixed clock, authenticated local session, build and reset | Reproduce one affected placement and later verify its save/reload result |
| Spec-derived tests, observed baseline outputs, rehearsed implementation available as fallback | Run the regression failure, use Copilot for the bounded implementation, inspect the diff and run focused verification |
| Broad lint/type/unit/build/e2e checks, phone checks and any available local DB evidence | Show current focused results; identify broad/prepared evidence by revision and timestamp |
| Readable evidence report structure and trace links | Open one complete chain and explain approved versus unexpected differences |

Use five ready-to-switch surfaces: the placement browser tab; source/reproducer in the IDE; spec in the IDE; Copilot plus diff; terminal plus evidence/trace document. No new production route is needed for analysis or evidence. Keep login, dashboard, other product pages and phone screenshots outside the live path unless a question requires them.

Rehearse the bounded edit on an owner-prepared baseline without changing this shared checkout's Git state. The user may prepare separate rehearsal copies/checkpoints; the agent does not create tags or switch branches. Reset fixture state before each run and identify prepared tests and artifacts honestly.

If a live action stalls, use at most 30 seconds of the step's allotted time to recover, explain the interruption, then open the matching prepared artifact. A fallback is not a live success. Move to the next step at 3:00, 5:30 and 10:30 so verification is never squeezed out by code generation.

Complete at least two timed rehearsals, including one with an AI/network failure. Target 14 minutes for normal execution, leaving one minute distributed across the steps for recovery. Record actual duration per step, failures, excessive transitions and changes needed. Freeze the scenario after the successful rehearsal; fix blockers without adding features.

## Technical backup notes (outside the timed demo)

Prepare concise answers with an evidence link, not scripted claims of expertise:

- Why is this established behaviour? What did code, tests and runtime each prove?
- What happens when documentation and implementation disagree?
- Why is the change this small, and which alternatives were rejected?
- What exact data/context entered the AI tool, and what did the engineer validate?
- How is the specification reviewed, versioned and changed? How does it inform both build and tests?
- Which outputs must stay equivalent, and which differences are approved? What remains untested?
- How would you establish a baseline without source code? Discuss controlled inputs/outputs, logs and confidence limitations without claiming this demo performed that work.
- What is mocked? Which SQL, RLS, storage and service behaviours require separate evidence?
- What happens if AI or network access is unavailable or the proposed tool is not approved? Show a manual specification/test/diff workflow and local prepared evidence.
- What would be needed for production or real candidate data? Refer to existing open decisions; do not claim that fictional-data demo readiness resolves them.

## Readiness exit criteria

- The named presenter completes the four-step technical demo within 15 minutes, including verification and one full trace chain; rehearsal targets 14 minutes.
- The same fixture and time inputs produce a reproducible before/after result.
- Countdown semantics are explicitly decided; no material assumption is disguised as a requirement.
- Load, save and reload agree; warning/end states remain correct; desktop and phone evidence is available or its gap is explicit.
- The spec, implementation and tests share traceable scenario references; an unexpected difference fails verification.
- Every reported check corresponds to an actual run and identifiable code state; mock, DB, manual and prepared evidence are distinguishable.
- Copilot works on the presentation laptop with accurate instructions and a verified, disclosed configuration.
- Necessary screens are populated and accessible; optional/placeholder features are not sold as implemented.
- The owner has checked tooling disclosure, shareable content and the local fallback environment. Wider slide preparation and GitHub governance work are outside this task.

End each authorized phase with the repository's required report: Changed files, Verification, Deviations from the plan, Open questions. State remaining readiness work and the next bounded action. Do not claim the repository is presentation-ready merely because this prompt or a planning artifact exists.

## Implementation continuation

The owning feature is now `specs/049-live-technical-demo/`. The owner approved capped days-used wording, zero before/on start, and ended only after the end date on 5 October 2026. Use that feature's tasks and verification record for current status. The runnable presenter script is `docs/engineering/live-demo/script.md`; captures carry provenance manifests. Do not repeat the earlier product clarification or treat historical readiness findings above as current without checking the implementation.
