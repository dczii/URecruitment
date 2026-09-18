---
name: urec-orchestrator
description: >
  URecruitment task orchestrator. In this repo, use it INSTEAD of the global `orchestrator` skill
  (it extends that skill with project rules). Use for every piece of development work: `/task <description | #issue>`, "create a task", "work on #42",
  "implement <feature>", "start the next task". Resolves or creates the GitHub issue, writes
  docs/tasks/<issue>-<slug>/plan.md only (no spec.md), delegates implementation to Cursor Grok 4.6 or
  GPT-5.6 via cursor-agent with the repo's skill rules inlined. After coding, skip review: verify
  until lint, typecheck, tests and (when applicable) build, e2e, db and eval are green, then close
  out docs, open a PR and move the Project 4 card to In Review. No approval gate. Never merges.
---

# urec-orchestrator — URecruitment

**Claude plans and verifies. Cursor Grok 4.6 or GPT-5.6 (via `cursor-agent`) writes the code.** After implementation, **do not run `pr-review`**. Green verification is the gate; then close out docs.

This skill **extends** the global `~/.claude/skills/orchestrator`.

- **Why the different name:** a personal skill named `orchestrator` shadows a project skill with the same name.
- **What the global skill still supplies:** the mechanics, meaning executor flags, model tiers and the "never trust executor output" rules.
- **Precedence:** where the two differ, **this file wins**. When you deviate from the global skill, say so out loud.
- **If the global skill was loaded first** (e.g. at session start), its Step 0 inventory finds this skill. Switch to this one for any task in this repo.

Precedence, highest first: `CLAUDE.md` → this skill → other project skills → the global `orchestrator`.

**Config:** `.claude/github-project.json` (repo, Project 4, status names, executor models).
**Templates:** `templates/plan.md`, `templates/executor-prompt.md`.
**Scripts:** `scripts/new-task-docs.sh`, `scripts/run-executor.sh`, plus the `github-workflow` scripts.

**One task doc:** `docs/tasks/<issue>-<slug>/plan.md` holds both the contract (problem, PRD, scope, ACs, guardrails, assumptions) and the execution plan. **Do not create `spec.md`.** Existing folders that already have a `spec.md` may keep it; new work never adds one. If an old folder is the current task, copy any still-needed AC/guardrail text into `plan.md` and stop linking `spec.md`.

## Speed (do these; they are rules, not optional tips)

Planning and handoffs are the usual bottleneck, not the compiler. Default to the cheaper path:

1. **One plan file, written once.** Fill `plan.md` in a single pass. Do not draft a spec, then a plan, then rewrite both.
2. **Skill discovery is routing, not a reading marathon.** List skill *frontmatter* (`name` + `description`) from `.claude/skills/*/SKILL.md`. **Read the full `SKILL.md` only for matches.** Always match `prd-context` and `testing`; add others from the table. Do not re-inventory mid-task unless the file/subsystem scope actually expanded.
3. **Fewer executor calls.** Merge sequential edits to the same files into one step. Keep the test-first split **only** for logic (working days, score caps, delay, gaps). Mechanical UI/docs/wiring can be one `grok` (or `grok-low`) step.
4. **Targeted tests during the loop; full suite once.** After each coding step, run only the command named in that step. Run the full Step 7 set **once** before the PR, and again only after a fix that could have broken it.
5. **Inspect with `git diff --stat` first.** Open the full diff only when the stat shows surprise files or a large unexplained hunk. Revert stray files with `git restore`; don't re-read the whole tree.
6. **Parallel only for disjoint files.** Mark `parallel-safe` and use worktrees. Never parallelise overlapping files "to go faster".
7. **Cheap model for mechanical steps.** Use `executor.cheapModel` (`cursor-grok-4.6-low`) when the step is copy-shape-from-neighbour, rename, or boilerplate. Default `grok` / `gpt` for logic, schema, scoring, RLS, AI.
8. **Short prompts.** Goal, this step, allowed files, 3–6 inlined rules, verify command. Do not paste whole skills or the whole plan.
9. **Skip work that is already done.** If `plan.md` exists for the issue, do not regenerate it. If the branch exists, don't recreate it. If origin/main was fetched in this session, don't fetch again.
10. **No review in `/task`.** Verification is the gate. Do not spawn review subagents.

## Operating mode: no approval gate

Run straight through from intake to an open PR. **Don't** stop to ask "shall I proceed?". Stop and report **only** when you are truly blocked:

- The task would contradict a PRD item marked **decided** (see `prd-context`).
- The task needs a PRD **open** question answered and no reasonable reversible default exists.
- You need credentials, a paid plan, or a remote resource (Supabase project, Vercel env, Blob token) that isn't configured.
- The task needs real candidate data, sending email, or anything else listed as a non-goal.
- Verification still fails after the fix loop (Step 7) and the Claude fallback.

Record every other judgment call under **Assumptions** in `plan.md`, then keep going.

## Story workflow: one Story, one PR

A Story is the unit of delivery. Its Tasks are the units of work inside it:

- When creating a Story, decompose it into Task sub-issues before writing code, so every Task keeps its own "Done when" items and board card.
- When the input is a Story, run the **whole Story on one branch with one PR**: one `docs/tasks/<story>-<slug>/plan.md`, every open Task sub-issue processed in dependency order through Steps 4–7, and **at least one commit per Task** whose subject ends in `(#<task>)`. Never mix two Tasks' changes in one commit.
- The plan maps each Task's "Done when" items to acceptance criteria, so a reviewer can check the Story Task by Task.
- The PR closes every Task and the Story: one `Closes #<task>` line per Task, then `Closes #<story>`.
- Stories may be **stacked** when the next Story depends on one whose PR is still open. Branch from the predecessor Story's branch and set it as the PR base. State `Stacked on:` and `Merge order:` in every affected PR body.
- After the predecessor merges, rebase onto `main`, retarget the PR to `main`, and check that its diff contains only this Story.
- A single-Task input (`#42`) still gets its own PR. Split a Story into several PRs only when the user asks for it.
- Never merge the stack. Humans merge from the bottom up. The Story is complete once its PR merges and every Task sub-issue is closed.

## Step 0 — Preflight

```bash
cat .claude/github-project.json
gh auth status 2>&1 | grep -E "Token scopes"        # needs repo + project
git status --porcelain && git rev-parse --abbrev-ref HEAD
git fetch origin && git log --oneline -1 origin/main
cursor-agent status                                  # executor is authenticated
```

Skip `git fetch` if origin/main was already updated in this session.

- A dirty working tree that isn't yours means **stop**. Never stash or discard someone else's changes.
- If the token lacks `project` scope, keep going without board updates, and list `gh auth refresh -s project` in the final report.
- If `.claude/github-project.fields.json` is missing, run `.claude/skills/github-workflow/scripts/project-fields.sh`.

## Step 1 — Intake: resolve the issue

| Input | Action |
|---|---|
| `#42` or an issue URL | `gh issue view 42 --json number,title,body,labels,milestone,state`. Read its parent story/epic too (see `github-workflow`). |
| A **Story** number | List all open Task sub-issues and their dependencies. If it has no tasks, decompose it first (`github-workflow` → create sub-issues). Run the Story once through Steps 2–9 on one branch: one plan, Tasks in dependency order, one or more commits per Task, and one PR that closes every Task and the Story. Stack it on the predecessor Story's branch when that PR is still open. |
| An **Epic** number | List its open Stories, choose the first unblocked Story in roadmap order, then apply the Story workflow above. |
| Free text | Search for a duplicate (`gh issue list --search "<keywords>" --state all`). If none exists, create a **Task** issue using the task form fields, attach it to the best-matching Story (create the Story under the right Epic if none fits), add it to Project 4, set the milestone (default `MVP`), and record the choice under Assumptions. |

Before implementation, ensure the Task issue is open and has a milestone. For a Story, check the Story and every Task sub-issue. Reopen a closed Task if work is resuming. Set a missing milestone to `MVP`; preserve an explicit `Real-data release` or `Later` milestone rather than silently overwriting it. Step 3 moves the issue to the configured in-development project status (`inProgress`).

**Slug:** kebab-case, at most 5 words, taken from the issue title (`cv-parser-schema`). **Type:** `feat | fix | chore | docs | test | refactor | design | ci`.

## Step 2 — Load context

Skill discovery is mandatory for every task, but **frontmatter-only unless matched**.

1. Inventory names/descriptions under `.claude/skills/*/SKILL.md` (and `.cursor/skills`, `.agents/skills` if those dirs exist). Do not read every full skill.
2. Match against the request, issue acceptance criteria, likely file paths and subsystems. The routing table is the minimum set.
3. Read the complete `SKILL.md` for every **match** before writing the plan. Record each selected skill and why in `plan.md` under **Skills in scope**.
4. Load `prd-context` and `testing` for every task, plus `github-workflow` whenever issues, branches, commits or PRs are involved. For `prd-context`, read only the sections the issue cites, not the entire PRD dump unless the task is cross-cutting.
5. Read the existing code and tests in the area (`git ls-files | grep …`). Read any earlier `docs/tasks/*/plan.md` that touched the same area **only if you need prior decisions**; don't open every historical folder.
6. If investigation or execution expands the files or subsystem in scope, pause, match skills for the new scope, update `plan.md`, and inline the new binding rules in later prompts.

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

- Independent Story or Task: `main`.
- Stacked Story: the immediate predecessor Story's branch. Its PR must already be open.

```bash
git switch <base-branch> && git pull --ff-only
git switch -c <type>/<issue>-<slug>
.claude/skills/urec-orchestrator/scripts/new-task-docs.sh <issue> <slug> "<issue title>"
```

Fill **only** `docs/tasks/<issue>-<slug>/plan.md` from the template. Rules:

- **Acceptance criteria** use Given/When/Then, are testable, and map 1:1 to tests named in the same file.
- **Every PRD reference** cites the section name and its status (decided, proposed or open).
- **Guardrail checklist:** tick only the items that apply, and explain each tick.
- **Plan steps** are small enough to be one `cursor-agent` call, but **not** artificially split: explicit file paths, the exact change, the tests, and a verification command.
- **Test applicability:** for every acceptance criterion, name the test to add or update. If no automated test is appropriate, record `none` with a concrete reason and the manual verification evidence.
- **Test-first:** any step with **logic** is split into **(a) write failing tests** and **(b) implement until green**. Other steps are not.
- **Executor tag:** every plan step carries one of:
  - `grok`, the default for code;
  - `grok-low`, mechanical / boilerplate (`executor.cheapModel`);
  - `gpt`, for code assigned to GPT-5.6 Sol; record why it is a better fit than the default;
  - `claude` for `.pen` design work via the pencil MCP (Cursor executors have no pen.dev access), and for anything where the selected executor failed twice;
  - `none` for pure verification.
- Say which skills' rules each step must obey. Step 4 inlines them.

Update the board and commit the plan as the first commit:

```bash
.claude/skills/github-workflow/scripts/set-status.sh <issue> inProgress
git add docs/tasks/<issue>-<slug>
git commit -m "docs(<area>): plan for #<issue>"
```

## Step 4 — Build executor prompts

For each `grok`, `grok-low` or `gpt` step, fill `templates/executor-prompt.md`:

- **Self-contained.** Task goal, this step, exact file paths, the ACs this step covers, verification commands.
- **Required reading:** `AGENTS.md`, the task's `plan.md` (the named step), and the named `.claude/skills/<skill>/SKILL.md` files.
- **Inline the 3–6 rules that bind these files**, quoted from the skills. Assume the executor skips the files.
- **Out of scope:** files it must not touch.
- **Report format:** the one from `AGENTS.md`.

A prompt that omits the rules of a skill covering its files is malformed. Fix it before spending the call.

Before each executor call, confirm matching skills are listed and inlined. If a new match appears, read it and update the plan and prompt before execution.

## Step 5 — Execute

```bash
.claude/skills/urec-orchestrator/scripts/run-executor.sh <issue>-<slug> <step-id> <prompt-file> [grok|gpt|model]
```

For `grok-low`, pass `cursor-grok-4.6-low` as the model argument (same as `executor.cheapModel`).

The wrapper runs `cursor-agent -p --model <resolved-model> --sandbox enabled --trust --output-format text` in the current checkout (the task branch), and logs to `.orchestrator/<issue>-<slug>/<step-id>.log` (gitignored). `grok` resolves to `executor.model` (`cursor-grok-4.6-high`); `gpt` resolves to `executor.gptModel` (`gpt-5.6-sol-high`).

- **Order:** steps run **sequentially** on the task branch by default.
- **Parallel steps:** only when the plan marks them independent (disjoint files). Give each its own worktree with `cursor-agent -w <issue>-<step> --worktree-base <branch>`. Then bring the changes back with `git -C <worktree> diff | git apply` and review them.
- **Test-first steps:** after the "(a) failing tests" step, run the tests yourself. Confirm they fail for the stated reason. Only then run step (b).
- **`claude` steps** (design): do them yourself with the `ui-design` skill.

## Step 6 — Inspect every step

Never trust the executor's report. After each step:

```bash
git status --porcelain
git diff --stat
```

Open `git diff` only if the stat is unexpected. Check:
- the step scope (no stray files, and nothing under `docs/tasks`, `.claude` or `.github` unless planned);
- the inlined rules;
- the "Deviations" section of the executor's report;
- test adequacy for behaviour this step claimed to cover.

Revert out-of-scope edits with `git restore <file>`, not by hand. Deleted or `.skip`ped tests count as a failure.

## Step 7 — Verify until green, then fix loop

Run the verification set **once** after the last coding step (and after any later fix):

```bash
npm run lint && npm run typecheck && npm test
npm run build                 # app code changed
npm run test:db               # migrations, SQL, views or DB services changed
npm run test:e2e              # a screen changed
npm run eval                  # parser, matcher, prompts or schemas changed
```

On failure, work through the fix loop (max rounds = `executor.maxFixRounds`, default 3):

1. Send the selected executor a fix prompt containing the failing output, the files involved and the same inlined rules.
2. Re-verify **only the failing command**, then the full applicable set if the fix could have broken other checks.
3. After round 2, switch to the matching escalation model: `executor.escalationModel` (`cursor-grok-4.6-xhigh`) or `executor.gptEscalationModel` (`gpt-5.6-sol-xhigh`).
4. If it's still red after the last round, **Claude fixes it directly**, and the plan's Outcome notes it.
5. If Claude can't fix it either, stop and report (see Operating mode).

Verification is the hard gate. **Do not** run `pr-review`, a review subagent, or a separate
`security-check` / `compliance-review` pass as part of `/task`. Those skills stay available for an
explicit `/review` request. Do not close out docs, commit the wrap-up, or open a PR while any
applicable command is red.

## Step 8 — Close out docs

In `plan.md`: tick the steps and the acceptance criteria that are proven (name the proving test). Fill **Outcome**: what shipped, files changed, tests added or updated (or why none were needed), verification, deviations, fix rounds, the complete model-usage ledger, and follow-ups.

Build the model-usage ledger from evidence, not memory:

- Read every `.orchestrator/<issue>-<slug>/*.log` header for the executor model used by each implementation and fix step.
- Record planning/orchestration, design and direct-fix models separately when the runtime or subagent result exposes their exact identity.
- Include escalations even if they produced no retained code.
- If an exact model identity is unavailable, write `unknown (runtime did not expose it)`; never guess.
- This ledger covers models used to perform the task. App model IDs exercised by AI evals belong in verification evidence, not in the agent model ledger.

## Step 9 — Commit, push, PR

```bash
git add -A && git status --porcelain      # check nothing unexpected is staged
git commit -m "<type>(<area>): <summary> (#<issue>)"
git push -u origin HEAD
# The Task must be open, have a milestone (default MVP), and already be in the
# configured in-development status (`inProgress`) before creating its PR.
# For a Story PR, repeat this for the Story and every Task sub-issue.
gh issue view <issue> --json state,milestone
# If closed: gh issue reopen <issue>
# If milestone is missing: gh issue edit <issue> --milestone MVP
.claude/skills/github-workflow/scripts/set-status.sh <issue> inProgress
# Write the body: copy .github/pull_request_template.md to .orchestrator/<issue>-<slug>/pr-body.md
# and fill every section (Closes #<issue>, plan link, verification output).
# Review section: write "Skipped — verification is the close-out gate."
PR_URL=$(gh pr create --base <base-branch> --title "<type>(<area>): <summary> (#<issue>)" \
  --body-file .orchestrator/<issue>-<slug>/pr-body.md --assignee "@me")
PR_NUM=$(gh pr view "$PR_URL" --json number --jq .number)
# Milestone and labels on the PR itself, mirrored from the Task/Story issue(s)
# it closes (never guessed — read them off the issue).
gh pr edit "$PR_NUM" --milestone MVP   # or the issue's actual milestone if not MVP
gh pr edit "$PR_NUM" --add-label <area:*-labels-from-the-issues>
gh project item-add 4 --owner dczii --url "$PR_URL"
.claude/skills/github-workflow/scripts/set-status.sh "$PR_NUM" inReview   # sets the PR's own card, not just the issue's
# Confirm GitHub linked the PR in the issue's Development section. An empty
# result means the body lacks a valid `Closes #<issue>` reference; fix the body.
# GitHub links closing keywords only on PRs based on `main`: for a stacked PR
# the result is always empty, so check the lines instead with
#   gh pr view "$PR_URL" --json body --jq .body | grep -nE '^Closes #'
gh pr view "$PR_URL" --json closingIssuesReferences \
  --jq '.closingIssuesReferences[] | select(.number == <issue>) | .url'
# For every `Closes #<N>` line the query above does NOT return (always true for
# a stacked base, sometimes true even on `main`), leave an explicit fallback
# link so the connection is discoverable without relying on auto-close:
#   gh pr comment "$PR_NUM" --body "Also implements #<N> — not auto-linked
#   because this PR is stacked on <predecessor PR> (base \`<base-branch>\`,
#   not \`main\`); tracking here until the rebase/retarget follow-up."
# Then move every issue the PR closes — Task(s) and Story alike, not just the
# one issue used in the loop variable — to inReview:
.claude/skills/github-workflow/scripts/set-status.sh <issue> inReview
```

- **Commits:** Conventional Commits. For a Story, at least one commit per Task, each ending in `(#<task>)`. Split further if a Task's diff is large: tests, implementation, docs.
- **PR base:** use `main` for an independent Story or Task, or the immediate predecessor Story's branch for a stacked one. For a stack, add `Stacked on: <predecessor PR link>` and `Merge order: <ordered PR links>` to the PR body.
- **PR ownership and project:** assign every new PR to `@me` and add the PR itself to user-owned Project 4, with its own Status set to the in-review status (`set-status.sh` accepts a PR number the same way it accepts an issue number). If the token lacks `project` scope, skip only the project-item command and report the required scope refresh as described in Step 0.
- **PR milestone and labels:** every PR gets the same milestone as the issue(s) it closes (`MVP` unless the issue carries `Real-data release` or `Later`) and is labelled with each closed issue's `area:*` label(s). Read these off the issues — never guess or leave the PR's milestone/labels empty.
- **Issue readiness and linkage:** immediately before PR creation, the Task issue must be open, have a milestone (`MVP` when none was set), and be in the configured in-development status. The PR body must contain `Closes #<issue>` (for a Story PR, one line per Task plus the Story), and, for a PR based on `main`, `closingIssuesReferences` must confirm that GitHub shows the PR in the issue's Development section. Do not substitute a plain issue URL or rely only on `(#<issue>)` in the title. After PR creation, every issue named in a `Closes #<N>` line — not only the loop variable's issue — must end up at the in-review status, and any `Closes #<N>` GitHub did not resolve into `closingIssuesReferences` (always the case for a stacked-branch base) must get an explicit PR comment naming the issue and why the auto-link didn't fire, so the connection survives without relying on GitHub's keyword resolution.
- **Attribution:** end the commit message and PR body with the lines required by the session's attribution rules.
- **Then stop** for a Task or Story input. For an Epic input, continue with the next unblocked Story until every open Story has its own PR or a listed blocking condition is reached.
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
- A role-by-role ledger: planning/orchestration, each executor step and fix round, escalations, design work and direct fixes.
- Give exact model IDs when known. Use `unknown (runtime did not expose it)` rather than inferring a model.

### Notes
- Assumptions, PRD open items, follow-ups, and any setup the user must do (for example `gh auth refresh -s project`).

## Anti-patterns

- Writing `spec.md` for a new task.
- Planning without reading `prd-context` and the domain skills that match.
- Reading every skill file in the repo "just in case".
- Splitting one file's work across many executor calls.
- Re-running the full test suite after every tiny step.
- Executor prompts that say "follow the skills" without inlining the rules, or that paste entire skills.
- Letting an executor commit, push, add dependencies, or touch `docs/tasks`.
- Trusting "all tests pass" without running them.
- Running `pr-review` (or any review subagent) as part of `/task`. Review is only for `/review`.
- Treating a **proposed** PRD item as decided without saying so in the plan.
- Splitting a Story into one PR per Task when the user didn't ask for it.
- A Story PR that is missing a `Closes #<task>` line, or that mixes two Tasks' changes in one commit.
- Merging, or moving a card to Done.
