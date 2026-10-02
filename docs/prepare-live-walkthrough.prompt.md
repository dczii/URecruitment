---
description: Prepare this repository for a live walkthrough of our spec-driven, AI-assisted engineering workflow, using GitHub Copilot
agent: agent
---

# Prepare the repository for a live engineering walkthrough with GitHub Copilot

## The situation

I'm the tech lead on this repository. In the third week of October 2026 I will give a 20-minute live technical walkthrough to external evaluators, followed by 10 minutes of questions put to me personally. They are assessing how we engineer, not the product: how we get from understanding an existing system, to a specification, to an implementation, to verified behaviour, and how a human engineer stays in control of the AI tooling at each step. They put the most weight on specification-driven development.

Fifteen of the twenty minutes are hands-on in this repository:

| Minutes | What I do live | What the evaluators need to see |
|---|---|---|
| 3 | Current-state analysis | I examine code and behaviour with AI help, identify a business rule and its dependencies, and separate evidence from assumption |
| 2.5 | Specification | The findings become a version-controlled spec with expected behaviour and acceptance criteria |
| 5 | Implementation with Copilot | The spec is the input. I inspect, challenge and refine what Copilot generates before accepting it |
| 4.5 | Verification and consistency | Tests run; expected versus actual; existing versus changed behaviour; the evidence, and how discrepancies are handled |

One slide afterwards shows the whole chain: finding → requirement → spec → code → test → evidence.

For any AI tool I show, they will ask what it does, what goes in and what comes out, which steps still depend on human judgement, and what controls check its output. They may also ask how specs are versioned and updated, how the same spec drives both the build and the verification, and what happens when a requirement changes.

Your job is to get the repository ready for that. Set it up for GitHub Copilot, close the gaps below, and stage one rehearsed change that I can perform live. The repository will be on screen and open to inspection, so everything in it has to be true and has to hold up when someone clicks into it.

## What is true today

These were verified on 2 Oct 2026 at `main` commit `c1358c5`. Re-check anything you rely on, because the code may have moved.

Start by reading `CLAUDE.md`, `AGENTS.md`, `analysis/00-summary.md` and `specs/README.md`.

- The app is a Next.js 16, TypeScript and Supabase recruitment portal running on fictional data. `npm test` passes 324 tests in 46 files in about 13 seconds on Node 22. Lint has 0 errors and typecheck is clean.
- It was built in four days in September, almost entirely with Claude Code and Cursor. Agent configuration lives in `.claude/` (27 skills, 3 commands), `.agents/skills/` (9 third-party animation and design skills, symlinked into `.claude/skills/`), `CLAUDE.md` and `AGENTS.md`. Nothing is configured for Copilot.

The gaps:

1. **No human review on record.** All 55 pull requests were opened and merged by one account with no reviews. `CLAUDE.md` and the `urec-orchestrator` skill say "There is no approval gate", and the PR template says review is skipped. #234 and #236 were merged one minute after the DB check failed. There is no branch ruleset.
2. **Three spec conventions.** Legacy folders in `specs/` with `spec.md` plus `plan.md` (19 tasks), `plan.md` only (25 tasks), and `analysis/03-ui-modernisation-spec.md`. The unmerged branch `chore/spec-kit-skills` installs GitHub Spec Kit for Claude only, now includes the migrated plans and UI polish feature under `specs/`, renames the project to "HRManagement" in 14 files while 83 still say URecruitment, and has a failing e2e run.
3. **Prompts and AI outputs are not version-controlled.** `.orchestrator/` (prompts, logs, PR bodies) is gitignored. The prompt that produced `analysis/` exists only in commit `ae9b15e` on that branch, as `.claude/commands/modernisation-analysis.md`.
4. **Consistency checking is thin.** `supabase/tests/working-days.db.test.ts` proves the SQL and TypeScript working-day functions agree. Three other rules are implemented in both SQL and TypeScript with nothing comparing them: `resolve_stage_limit` and `src/lib/stage-limits.ts`; the `pipeline_status` view and `src/server/pipeline/status.ts`; the `placements_guarantee_flag` view and `resolveGuaranteeFlag` in `src/server/placements/guarantee.ts`. DB tests need Docker and a local Supabase stack, and CI runs them only on pull requests that touch `supabase/**`.
5. **The e2e suite is unreliable.** Of the last 38 runs that executed, 28 failed. It runs against Vercel previews on `deployment_status`.
6. **No traceability view.** The raw material exists: 50 of 63 test files carry acceptance-criteria IDs in test names, and task docs map each criterion to a test.
7. **Stale documents.** `CLAUDE.md` and the PR template still describe product AI and an `npm run eval` script that does not exist. The `ai-eval`, `ai-pipeline` and `ai-prompts` skills remain although product AI is out of scope. `docs/security/baseline.md` describes AI controls that were never built. `analysis/01` says 310 tests. `analysis/04` says no pull request was opened and lists every page's visual check as pending. The README covers database setup only.

## Decisions already made

- **Copilot is the tool for the walkthrough.** I will run it in VS Code agent mode.
- **Spec Kit stays, installed for Copilot.** Reuse the constitution from `chore/spec-kit-skills` (`.specify/memory/constitution.md`). Do not carry over the "HRManagement" rename; the project is URecruitment. If the Copilot integration will not install cleanly through the `specify` CLI, stop and tell me instead of hand-writing its files.
- **`.github/` is the home for agent configuration.** VS Code Copilot also discovers skills in `.claude/skills/` and `.agents/skills/`, so a skill left in two places loads twice. Each skill must live in exactly one place.
- **The rehearsed change is the placement guarantee countdown** (details under Phase 4).
- **The rehearsed change is not merged.** Its pull request stays open so that `main` remains the starting point I perform from.

## Ground rules, and why

- **Nothing in the repository may be invented.** Do not write review comments, approvals, AI logs or spec revisions on anyone's behalf, and do not backfill history. Evaluators will open pull requests and commit logs; one manufactured record discredits the real ones. Where a step needs my judgement, stop and ask, then record what I actually said.
- **Leave the past alone.** Do not rewrite history, force-push, or edit the 55 merged pull requests. If asked about them I will say the prototype was built solo with automated checks as the gate, and that review is enforced from now on.
- **This repository is public.** Never name the evaluators, their organisation or any procurement in a committed file, commit message, issue or pull request. Describe the workflow on its own terms. The existing rules on secrets and fictional data in `CLAUDE.md` still apply.
- **Never push to `main` and never merge.** Work on branches cut from `main`, named and committed per the repo's conventions, and start each piece of work from a GitHub issue as `CLAUDE.md` requires. I review and merge every pull request myself, which is also how this repository starts to accumulate a real review history.
- **Do not touch remote data.** No commands against the remote Supabase project or Vercel. Pushing a branch creates a preview and triggers the e2e workflow, which submits forms against the shared database; say so in the pull request.
- **Do not weaken a check to make it pass.** If a test is wrong, fix it and explain. If it must be quarantined, say why in the test and in the pull request.
- **No new npm dependency without asking me first.**
- **Before opening any pull request,** run `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` under Node 22, and report the actual results, including anything you could not run.

## The work

Do the phases in order. Each phase is one pull request. After opening it, stop and wait for me.

### Phase 0: confirm the plan

Read the repository and this prompt, check the facts above, and check the current Copilot conventions against the official documentation, since they change:

- https://docs.github.com/en/copilot/reference/customization-cheat-sheet
- https://code.visualstudio.com/docs/copilot/customization/custom-agents
- https://code.visualstudio.com/docs/copilot/customization/agent-skills
- https://code.visualstudio.com/docs/copilot/customization/prompt-files

Then tell me, briefly: what you found that differs from this prompt, the file layout you propose under `.github/`, and anything you think I have got wrong. Make no changes yet.

### Phase 1: Copilot setup

As of early October 2026 the conventions are:

| File | Purpose |
|---|---|
| `.github/copilot-instructions.md` | Always-on repository instructions |
| `.github/instructions/*.instructions.md` | Rules scoped to paths with `applyTo` |
| `.github/skills/<name>/SKILL.md` | Skills loaded on demand. Frontmatter `name` must equal the folder name |
| `.github/agents/<name>.agent.md` | Custom agents with their own instructions, `tools` list and `handoffs` |
| `.github/prompts/<name>.prompt.md` | Slash commands. Frontmatter `agent` binds a prompt to an agent; `${input:name}` takes arguments |

What I want from this phase:

- **One source for the project rules.** Today `CLAUDE.md` and `AGENTS.md` both carry them, and `AGENTS.md` addresses "Cursor / Grok". Copilot reads `AGENTS.md` as well as its own instructions file, so decide where the rules live, make the other files short pointers, and keep the auto-generated Next.js block in `AGENTS.md`. Remove every statement that there is no approval gate or that review is skipped.
- **Skills moved to `.github/skills/` and brought up to date.** Keep the ones that describe the product and the stack: `prd-context`, `nextjs-app`, `supabase-db`, `ui-build`, `ui-design`, `talent-search`, `testing`, `security-check`, `compliance-review`, `github-workflow`, `release-deploy`, `ci-setup`, `pr-review`, `backlog-builder`. Rewrite references to Claude, Cursor executors and product AI so they are true for Copilot. Retire `ai-eval`, `ai-pipeline`, `ai-prompts`, `urec-orchestrator` and the nine animation and design skills under `.agents/skills/`, as the Spec Kit branch already did.
- **Spec Kit for Copilot**, with its generated agents and prompts under `.github/`, and one short skill explaining how Spec Kit is used here (adapt `speckit-workflow` from the branch).
- **Custom agents for the steps Spec Kit does not cover**, each limited to the tools its role needs:
  - a current-state analyst that reads code, tests, migrations and runtime evidence, cannot edit application code, and writes findings with file-and-line citations, marking each statement as evidence or assumption;
  - a verifier that runs the checks, compares existing and changed behaviour, and writes the evidence report;
  - a reviewer that reads a diff against its spec and the constitution and cannot edit.

  Use `handoffs` so the sequence analyse → specify → implement → verify → trace is visible as buttons in the chat. Tool names vary between VS Code versions and an unknown name is ignored silently, so list the names you used so I can confirm them in the tool picker.
- **Prompt files for each live step**, so that I type one short command per step and the prompt itself is under version control. Restore the analysis prompt from `ae9b15e` as one of them, rewritten for single-rule analysis.
- **Review enforced in the repository files:** `CODEOWNERS`, and a PR template with product-AI rows removed and three sections added: the spec it implements, what AI generated, and what the reviewer changed. Leave that last section blank for the reviewer.
- A `.vscode/extensions.json` recommending the Copilot extensions.

### Phase 2: verification, consistency and traceability

- **SQL-versus-TypeScript cross-checks** for the three rules in gap 4, following the pattern in `supabase/tests/working-days.db.test.ts`.
- **A consistency check for behaviour changes.** It captures the existing outputs of a rule for a table of inputs as a baseline, runs the same inputs after a change, and reports each case as unchanged, changed as approved by a named acceptance criterion, or changed unexpectedly. Only the last fails. This is what lets me show that a change altered what the spec said and nothing else.
- **One command that produces an evidence report:** commit, spec and version, each acceptance criterion with its tests and result, the consistency result, and which checks were automated and which were manual. Publish it in the CI job summary as well.
- **A generated traceability view** linking finding, requirement, spec, code, test and evidence by stable IDs. Use the ID scheme of the Spec Kit spec template and the criterion IDs already in test names; do not invent a parallel one. CI should fail when a criterion has no test or a test cites a criterion that does not exist.
- **The e2e suite made trustworthy.** Find the causes of the recent failures from the workflow logs and fix them.
- **DB tests on every pull request that could affect them,** and clear instructions for running them locally.

### Phase 3: documents that match the code

- **README:** what the system is, the architecture diagram from `analysis/01`, how to run it, how to run every check, and where specs and evidence live.
- **`docs/engineering/workflow.md`:** the five steps; what AI does at each; what a person decides at each; how a spec is created, reviewed, versioned and updated; and how a changed requirement is traced to the specs, tests and code it affects.
- **`docs/engineering/ai-tooling.md`:** one table per tool covering function, inputs, outputs, the steps that depend on human judgement, and the controls on its output. Be accurate about history: the git log shows Claude Code and Cursor built the prototype, and Copilot is the tool from here on.
- **A convention for the AI log** kept with each spec: the prompt used, the context supplied, a reference to the raw output, the reviewer's decision, and what was changed and why.
- **Stale items corrected** (gap 7). Treat `analysis/` as a dated snapshot: add a status note with what has happened since instead of rewriting its findings, and close or explicitly carry forward each item it left unverified, including the missing after screenshots.

### Phase 4: the rehearsed change

Run the new workflow for real on one rule, with me reviewing each step.

What I already know:

- The Placements screen reads "Guarantee: 60 of 30 days used" once a guarantee has ended.
- Days-used is computed in two places that disagree. `src/server/placements/list.ts` (about lines 165–168) uses the Singapore date and has no upper limit, and the file has no tests. `src/components/features/placements/Placements.tsx` (about lines 100–109) recomputes after a save from `Date.now()` in UTC and caps the value at the guarantee period.
- `docs/URecruitment-PRD.pdf` says "30-day guarantee countdown" and does not say what is shown after the guarantee ends. That is an open product question. Ask me; do not settle it in the spec.

Work on one branch and stop after each step for my review. Record my decisions in the AI log in my words.

1. **Analyse.** Use the analyst agent to produce the findings, with IDs, citations, and the evidence and assumption split.
2. **Specify.** Use Spec Kit to write the spec from the findings, with the open question recorded and then resolved by my answer in a later commit.
3. **Implement.** Tests first, failing for the right reason, then the implementation from the spec.
4. **Verify.** Run the checks, the consistency check and the evidence report, then generate the traceability view.

Tag the commit at the end of each step, so that if a live step stalls I can move to the next tag and carry on. Open the pull request with the template fully completed, and leave it open.

Then write `docs/engineering/walkthrough.md`: the exact commands and prompts for the 15 minutes, what each should show, a time budget per step, and the fallback tag for each. Spec Kit's full command chain is too long to run live, so say which commands I run on stage and which outputs are prepared in advance.

## What only I can do

List these in your final report with exact steps, and do not attempt them:

- create the branch ruleset on `main` (pull request required, one approval, required checks);
- bring in a second reviewer, since GitHub does not let an author approve their own pull request;
- review and merge each pull request;
- install Docker and the Supabase CLI on the walkthrough laptop;
- confirm Copilot matches the tooling we have already declared to the evaluators;
- decide whether this repository should become private before the walkthrough.

## Done means

- A new contributor using Copilot gets correct, current rules from `.github/` with no contradictory copy elsewhere.
- I can perform analyse → specify → implement → verify → trace from `main` with one short command per step.
- One command proves a change did what its spec said and nothing else, and writes evidence I can show.
- Every criterion in the rehearsed spec traces to a test and a result.
- No document in the repository claims something the code does not do.
- Every pull request from this work states what was verified and what was not.
