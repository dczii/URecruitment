---
name: urec-orchestrator
description: >
  URecruitment task orchestrator. In this repo, use it INSTEAD of the global `orchestrator` skill
  (it extends that skill with project rules). Use for every piece of development work: `/task <description | #issue>`, "create a task", "work on #42",
  "implement <feature>", "start the next task". Resolves or creates the GitHub issue, writes
  docs/tasks/<issue>-<slug>/spec.md and plan.md, delegates implementation to Cursor Grok 4.6 or
  GPT-5.6 via cursor-agent with the repo's skill rules inlined, verifies (lint, typecheck, tests, build, e2e,
  eval), runs a Claude review, then opens a PR and moves the Project 4 card to In Review.
  No approval gate. Never merges.
---

# urec-orchestrator — URecruitment

**Claude plans, verifies and reviews. Cursor Grok 4.6 or GPT-5.6 (via `cursor-agent`) writes the code.**

This skill **extends** the global `~/.claude/skills/orchestrator`.

- **Why the different name:** a personal skill named `orchestrator` shadows a project skill with the same name.
- **What the global skill still supplies:** the mechanics, meaning executor flags, model tiers and the "never trust executor output" rules.
- **Precedence:** where the two differ, **this file wins**. When you deviate from the global skill, say so out loud.
- **If the global skill was loaded first** (e.g. at session start), its Step 0 inventory finds this skill. Switch to this one for any task in this repo.

Precedence, highest first: `CLAUDE.md` → this skill → other project skills → the global `orchestrator`.

**Config:** `.claude/github-project.json` (repo, Project 4, status names, executor models).
**Templates:** `templates/spec.md`, `templates/plan.md`, `templates/executor-prompt.md`.
**Scripts:** `scripts/new-task-docs.sh`, `scripts/run-executor.sh`, plus the `github-workflow` scripts.

## Operating mode: no approval gate

Run straight through from intake to an open PR. **Don't** stop to ask "shall I proceed?". Stop and report **only** when you are truly blocked:

- The task would contradict a PRD item marked **decided** (see `prd-context`).
- The task needs a PRD **open** question answered and no reasonable reversible default exists.
- You need credentials, a paid plan, or a remote resource (Supabase project, Vercel env, Blob token) that isn't configured.
- The task needs real candidate data, sending email, or anything else listed as a non-goal.
- Verification still fails after the fix loop (Step 7) and the Claude fallback.

Record every other judgment call under **Assumptions** in `spec.md`, then keep going.

## Story workflow: one Task, one PR

A Story is a tracking container, never an implementation unit:

- When creating a Story, decompose its implementation into Task sub-issues before writing code. Each Task must be independently reviewable and must run through Steps 2–10 with its own spec, plan, branch, commits and PR containing `Closes #<task>`.
- When the input is a Story, process every open Task sub-issue in dependency order. Do not combine multiple Tasks into one branch or PR, and do not open an implementation PR that closes the Story itself.
- A Task is not considered delivered merely because its commits appear in another Task's diff. Every Task must have its own open PR.
- Task PRs may be **stacked** when waiting for an earlier Task to merge would block progress. Branch the dependent Task from its immediate predecessor and set that predecessor's branch as the PR base. State the stack order and dependency in every affected PR body.
- A stacked PR still closes only its own Task. After its predecessor merges, rebase or merge `main` into the branch as appropriate, retarget the PR to `main`, and verify that its diff contains only that Task.
- Never merge the stack. Human reviewers merge from the bottom of the stack upward. The Story is complete only after all Task PRs are merged and all Task sub-issues are closed.

## Step 0 — Preflight

```bash
cat .claude/github-project.json
gh auth status 2>&1 | grep -E "Token scopes"        # needs repo + project
git status --porcelain && git rev-parse --abbrev-ref HEAD
git fetch origin && git log --oneline -1 origin/main
cursor-agent status                                  # executor is authenticated
```

- A dirty working tree that isn't yours means **stop**. Never stash or discard someone else's changes.
- If the token lacks `project` scope, keep going without board updates, and list `gh auth refresh -s project` in the final report.
- If `.claude/github-project.fields.json` is missing, run `.claude/skills/github-workflow/scripts/project-fields.sh`.

## Step 1 — Intake: resolve the issue

| Input | Action |
|---|---|
| `#42` or an issue URL | `gh issue view 42 --json number,title,body,labels,milestone,state`. Read its parent story/epic too (see `github-workflow`). |
| A **Story** number | List all open Task sub-issues and their dependencies. If it has no tasks, decompose it first (`github-workflow` → create sub-issues). Run each Task through its own Steps 2–10 and open one PR per Task. Process in dependency order; use stacked PRs for dependent Tasks when useful. |
| An **Epic** number | List its open Stories, choose the first unblocked Story in roadmap order, then apply the Story workflow above. |
| Free text | Search for a duplicate (`gh issue list --search "<keywords>" --state all`). If none exists, create a **Task** issue using the task form fields, attach it to the best-matching Story (create the Story under the right Epic if none fits), add it to Project 4, set the milestone (default `MVP`), and record the choice under Assumptions. |

Before implementation, ensure the Task issue is open and has a milestone. Reopen a closed Task if work is resuming. Set a missing milestone to `MVP`; preserve an explicit `Real-data release` or `Later` milestone rather than silently overwriting it. Step 3 moves the issue to the configured in-development project status (`inProgress`).

**Slug:** kebab-case, at most 5 words, taken from the issue title (`cv-parser-schema`). **Type:** `feat | fix | chore | docs | test | refactor | design | ci`.

## Step 2 — Load context

Skill discovery is mandatory for every task; do not rely on the list remembered from an earlier task or session.

1. Inventory every repository-local skill under `.claude/skills/*/SKILL.md`, `.cursor/skills/*/SKILL.md` and `.agents/skills/*/SKILL.md` (where those directories exist). Read each skill's frontmatter `name` and `description`.
2. Match skills against the request, issue acceptance criteria, likely file paths and subsystems. The routing table below is the minimum set, not an exhaustive allowlist; newly added local skills apply when their description matches.
3. Read the complete `SKILL.md` for every match **before** writing the spec or plan. Record each selected skill and why it applies in `plan.md` under **Skills in scope**.
4. Load `prd-context` and `testing` for every task, plus `github-workflow` whenever issues, branches, commits or PRs are involved.
5. Read the existing code and tests in the area (`git ls-files | grep …`). Read any earlier `docs/tasks/*` that touched the same area.
6. If investigation or execution expands the files or subsystem in scope, pause before that work, repeat this discovery for the new scope, update `plan.md`, and propagate the newly applicable rules into subsequent executor prompts.

| Task touches… | Load |
|---|---|
| Routes, pages, Server Actions, API routes, `after()` | `nextjs-app` |
| Tables, migrations, RLS, views, Storage, seed | `supabase-db` |
| `.pen` files, tokens, screen layouts | `ui-design` |
| React components, screens, styling | `ui-build` (+ `ui-design` if a design exists) |
| Any model call, embeddings, `ai_runs`, re-scoring | `ai-pipeline` |
| Prompt text or AI output schemas | `ai-prompts` |
| Answer key, quality script | `ai-eval` |
| Search box, filters, hybrid query | `talent-search` (+ `supabase-db`) |
| Candidate data, scoring, gap flags, consent, retention | `compliance-review` |
| Secrets, keys, RLS, Storage access, rate limits, env | `security-check` |
| Workflows, CI, deploys, env setup | `ci-setup` / `release-deploy` |
| Every task | `prd-context`, `testing` |
| Issues, branches, commits or PRs | `github-workflow` |

## Step 3 — Branch and docs

Choose the branch base:

- Independent Task: `main`.
- Stacked Task: the immediate predecessor Task's branch. Its predecessor PR must already be open.

```bash
git switch <base-branch> && git pull --ff-only
git switch -c <type>/<issue>-<slug>
.claude/skills/urec-orchestrator/scripts/new-task-docs.sh <issue> <slug> "<issue title>"
```

Fill in `docs/tasks/<issue>-<slug>/spec.md` (**what** and **why**) and `plan.md` (**how**) from the templates. Rules:

- **Spec acceptance criteria** use Given/When/Then, are testable, and map 1:1 to tests named in the plan.
- **Every PRD reference** cites the section name and its status (decided, proposed or open).
- **Guardrail checklist:** tick only the items that apply, and explain each tick.
- **Plan steps** are small, and each is executable by one `cursor-agent` call: explicit file paths, the exact change, the tests, and a verification command.
- **Test applicability:** for every acceptance criterion, name the test to add or update. If no automated test is appropriate (for example, a docs-only change), record `none` with a concrete reason and the manual verification evidence. Never omit tests silently.
- **Test-first:** any step with logic is split into **(a) write failing tests** and **(b) implement until green**.
- **Executor tag:** every plan step carries one of:
  - `grok`, the default for code;
  - `gpt`, for code assigned to GPT-5.6 Sol; record why it is a better fit than the default;
  - `claude` for `.pen` design work via the pencil MCP (Cursor executors have no pen.dev access), and for anything where the selected executor failed twice;
  - `none` for pure verification.
- Say which skills' rules each step must obey. Step 4 inlines them.

Update the board and commit the docs as the first commit:

```bash
.claude/skills/github-workflow/scripts/set-status.sh <issue> inProgress
git add docs/tasks/<issue>-<slug>
git commit -m "docs(<area>): spec and plan for #<issue>"
```

## Step 4 — Build executor prompts

For each `grok` or `gpt` step, fill `templates/executor-prompt.md`:

- **Self-contained.** Include the task goal, the step text, exact file paths, the acceptance criteria this step covers, and the verification commands.
- **Required reading:** `AGENTS.md`, the task's `spec.md` and `plan.md`, and the named `.claude/skills/<skill>/SKILL.md` files.
- **Inline the 3–6 rules that bind these files**, quoted from the skills. Assume the executor skips the files. The inlined rules are what actually protect the change.
- **Out of scope:** list the files it must not touch.
- **Report format:** the one from `AGENTS.md`.

A prompt that omits the rules of a skill covering its files is malformed. Fix it before spending the call.

Before each executor call, compare its allowed files and change description with the current local-skill inventory. Confirm that every matching skill is listed as required reading and its binding rules are inlined. If a new match appears, read it and update the plan and prompt before execution.

## Step 5 — Execute

```bash
.claude/skills/urec-orchestrator/scripts/run-executor.sh <issue>-<slug> <step-id> <prompt-file> [grok|gpt|model]
```

The wrapper runs `cursor-agent -p --model <resolved-model> --sandbox enabled --trust --output-format text` in the current checkout (the task branch), and logs to `.orchestrator/<issue>-<slug>/<step-id>.log` (gitignored). `grok` resolves to `executor.model` (`cursor-grok-4.6-high`); `gpt` resolves to `executor.gptModel` (`gpt-5.6-sol-high`).

- **Order:** steps run **sequentially** on the task branch by default.
- **Parallel steps:** only when the plan marks them independent (disjoint files). Give each its own worktree with `cursor-agent -w <issue>-<step> --worktree-base <branch>`. Then bring the changes back with `git -C <worktree> diff | git apply` and review them.
- **Test-first steps:** after the "(a) failing tests" step, run the tests yourself. Confirm they fail for the stated reason and that they match the acceptance criteria. Only then run step (b).
- **`claude` steps** (design): do them yourself with the `ui-design` skill.

## Step 6 — Inspect every step

Never trust the executor's report. After each step:

```bash
git status --porcelain
git diff --stat
git diff
```

Check the diff against:
- the step scope (no stray files, and nothing under `docs/tasks`, `.claude` or `.github` unless planned);
- the inlined rules;
- the "Deviations" section of the executor's report.
- test adequacy: changed behaviour has focused regression coverage at the correct layer; tests exercise the acceptance criteria rather than only implementation details.

Revert out-of-scope edits with `git restore <file>`, not by hand. Deleted or `.skip`ped tests count as a failure.

## Step 7 — Verify and fix loop

Run the verification set for what changed:

```bash
npm run lint && npm run typecheck && npm test
npm run build                 # app code changed
npm run test:db               # migrations, SQL, views or DB services changed
npm run test:e2e              # a screen changed
npm run eval                  # parser, matcher, prompts or schemas changed
```

On failure, work through the fix loop (max rounds = `executor.maxFixRounds`, default 3):

1. Send the selected executor a fix prompt containing the failing output, the files involved and the same inlined rules.
2. Re-verify.
3. After round 2, switch to the matching escalation model: `executor.escalationModel` (`cursor-grok-4.6-xhigh`) or `executor.gptEscalationModel` (`gpt-5.6-sol-xhigh`).
4. If it's still red after the last round, **Claude fixes it directly**, and the plan's Outcome notes it.
5. If Claude can't fix it either, stop and report (see Operating mode).

## Step 8 — Claude review (hard gate)

Run the `pr-review` skill on `git diff origin/main...HEAD`. For `security-check` and `compliance-review` scope, run it on an **Opus or Fable** subagent. Every finding must quote the rule it applies.

- **Blocking findings:** fix them via a Cursor executor or directly, then re-run Step 7.
- **Non-blocking findings:** list them in the PR under "Follow-ups". Create issues only if they matter.

Run `security-check` and `compliance-review` too whenever their scope is touched (see the Step 2 table).

## Step 9 — Close out docs

- `plan.md`: tick the steps. Fill in **Outcome**: what shipped, files changed, tests added or updated (or why none were needed), verification, deviations, fix rounds, the complete model-usage ledger, and follow-ups.
- `spec.md`: tick the acceptance criteria that are proven. Name the test that proves each one.

Build the model-usage ledger from evidence, not memory:

- Read every `.orchestrator/<issue>-<slug>/*.log` header for the executor model used by each implementation and fix step.
- Record planning/orchestration, design, direct-fix and review models separately when the runtime or subagent result exposes their exact identity.
- Include escalations even if they produced no retained code.
- If an exact model identity is unavailable, write `unknown (runtime did not expose it)`; never guess.
- This ledger covers models used to perform the task. App model IDs exercised by AI evals belong in verification evidence, not in the agent model ledger.

## Step 10 — Commit, push, PR

```bash
git add -A && git status --porcelain      # check nothing unexpected is staged
git commit -m "<type>(<area>): <summary> (#<issue>)"
git push -u origin HEAD
# The Task must be open, have a milestone (default MVP), and already be in the
# configured in-development status (`inProgress`) before creating its PR.
gh issue view <issue> --json state,milestone
# If closed: gh issue reopen <issue>
# If milestone is missing: gh issue edit <issue> --milestone MVP
.claude/skills/github-workflow/scripts/set-status.sh <issue> inProgress
# Write the body: copy .github/pull_request_template.md to .orchestrator/<issue>-<slug>/pr-body.md
# and fill every section (Closes #<issue>, spec/plan links, verification output, review findings).
PR_URL=$(gh pr create --base <base-branch> --title "<type>(<area>): <summary> (#<issue>)" \
  --body-file .orchestrator/<issue>-<slug>/pr-body.md --assignee "@me")
gh project item-add 4 --owner dczii --url "$PR_URL"
# Confirm GitHub linked the PR in the issue's Development section. An empty
# result means the body lacks a valid `Closes #<issue>` reference; fix the body.
gh pr view "$PR_URL" --json closingIssuesReferences \
  --jq '.closingIssuesReferences[] | select(.number == <issue>) | .url'
.claude/skills/github-workflow/scripts/set-status.sh <issue> inReview
```

- **Commits:** Conventional Commits. Split the commits logically if the diff is large: tests, implementation, docs.
- **PR base:** use `main` for an independent Task or the immediate predecessor branch for a stacked Task. For a stack, add `Stacked on: <predecessor PR link>` and `Merge order: <ordered PR links>` to the PR body.
- **PR ownership and project:** assign every new PR to `@me` and add the PR itself to user-owned Project 4. If the token lacks `project` scope, skip only the project-item command and report the required scope refresh as described in Step 0.
- **Issue readiness and linkage:** immediately before PR creation, the Task issue must be open, have a milestone (`MVP` when none was set), and be in the configured in-development status. The PR body must contain `Closes #<issue>`, and `closingIssuesReferences` must confirm that GitHub shows the PR in the issue's Development section. Do not substitute a plain issue URL or rely only on `(#<issue>)` in the title.
- **Attribution:** end the commit message and PR body with the lines required by the session's attribution rules.
- **Then stop for a single-Task input.** For a Story or Epic input, continue with the next Task until every open Task has its own PR or a listed blocking condition is reached.
- Don't merge, enable auto-merge or close the issue. `Closes #N` closes each Task when a human merges.

## Final report (to the user)

The final response is mandatory after the PR is opened (or after reporting a blocker). Use these headings:

### Summary
- What was implemented and the user-visible or technical outcome.
- Issue and PR links, with the branch name.
- Important changed files or areas; note deviations from the plan.

### Tests and verification
- Tests added or updated, named by file and behaviour covered.
- If no tests were needed, say `No tests added` and give the concrete reason.
- Acceptance criteria, each marked ✅/❌ with its proving automated test or manual evidence.
- Every verification command with pass/fail status. Do not say tests passed without listing the command that was run.

### Models used
- A role-by-role ledger: planning/orchestration, each executor step and fix round, escalations, design work, direct fixes and review.
- Give exact model IDs when known. Use `unknown (runtime did not expose it)` rather than inferring a model.

### Notes
- Assumptions, PRD open items, follow-ups, and any setup the user must do (for example `gh auth refresh -s project`).

## Anti-patterns

- Planning without reading `prd-context` and the domain skills.
- Executor prompts that say "follow the skills" without inlining the rules.
- Letting an executor commit, push, add dependencies, or touch `docs/tasks`.
- Trusting "all tests pass" without running them.
- Treating a **proposed** PRD item as decided without saying so in the spec.
- Combining multiple Task issues in one PR, or leaving a Task without its own PR because its commits are present in a stacked diff.
- Opening an implementation PR for a Story instead of one PR per Task.
- Merging, or moving a card to Done.
