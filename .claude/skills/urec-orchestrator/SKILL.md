---
name: urec-orchestrator
description: >
  URecruitment task orchestrator. In this repo, use it INSTEAD of the global `orchestrator` skill
  (it extends that skill with project rules). Use for every piece of development work: `/task <description | #issue>`, "create a task", "work on #42",
  "implement <feature>", "start the next task". Resolves or creates the GitHub issue, writes
  docs/tasks/<issue>-<slug>/spec.md and plan.md, delegates implementation to Grok 4.6 via
  cursor-agent with the repo's skill rules inlined, verifies (lint, typecheck, tests, build, e2e,
  eval), runs a Claude review, then opens a PR and moves the Project 4 card to In Review.
  No approval gate. Never merges.
---

# urec-orchestrator — URecruitment

**Claude plans, verifies and reviews. Grok 4.6 (via `cursor-agent`) writes the code.**

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
- You need credentials, a paid plan, or a remote resource (Supabase project, Vercel env, Drive access) that isn't configured.
- The task needs real candidate data, sending email, or anything else listed as a non-goal.
- Verification still fails after the fix loop (Step 7) and the Claude fallback.

Record every other judgment call under **Assumptions** in `spec.md`, then keep going.

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
| A **Story** or **Epic** number | List its open Task sub-issues. Pick the first unblocked one, in the order given in the story body. If the story has no tasks, decompose it into Task issues first (`github-workflow` → create sub-issues), then take the first. |
| Free text | Search for a duplicate (`gh issue list --search "<keywords>" --state all`). If none exists, create a **Task** issue using the task form fields, attach it to the best-matching Story (create the Story under the right Epic if none fits), add it to Project 4, set the milestone (default `MVP`), and record the choice under Assumptions. |

**Slug:** kebab-case, at most 5 words, taken from the issue title (`cv-parser-schema`). **Type:** `feat | fix | chore | docs | test | refactor | design | ci`.

## Step 2 — Load context

1. `prd-context`, always. Find the PRD section(s) the task implements and note each item's status (decided, proposed or open).
2. Route to the domain skills using the table below. Read each matching `SKILL.md` **before** planning.
3. Read the existing code and tests in the area (`git ls-files | grep …`). Read any earlier `docs/tasks/*` that touched the same area.

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
| Always | `testing`, `github-workflow` |

## Step 3 — Branch and docs

```bash
git switch main && git pull --ff-only
git switch -c <type>/<issue>-<slug>
.claude/skills/urec-orchestrator/scripts/new-task-docs.sh <issue> <slug> "<issue title>"
```

Fill in `docs/tasks/<issue>-<slug>/spec.md` (**what** and **why**) and `plan.md` (**how**) from the templates. Rules:

- **Spec acceptance criteria** use Given/When/Then, are testable, and map 1:1 to tests named in the plan.
- **Every PRD reference** cites the section name and its status (decided, proposed or open).
- **Guardrail checklist:** tick only the items that apply, and explain each tick.
- **Plan steps** are small, and each is executable by one `cursor-agent` call: explicit file paths, the exact change, the tests, and a verification command.
- **Test-first:** any step with logic is split into **(a) write failing tests** and **(b) implement until green**.
- **Executor tag:** every plan step carries one of:
  - `grok`, the default for code;
  - `claude` for `.pen` design work via the pencil MCP (Grok has no pen.dev access), and for anything where Grok failed twice;
  - `none` for pure verification.
- Say which skills' rules each step must obey. Step 4 inlines them.

Update the board and commit the docs as the first commit:

```bash
.claude/skills/github-workflow/scripts/set-status.sh <issue> inProgress
git add docs/tasks/<issue>-<slug>
git commit -m "docs(<area>): spec and plan for #<issue>"
```

## Step 4 — Build executor prompts

For each `grok` step, fill `templates/executor-prompt.md`:

- **Self-contained.** Include the task goal, the step text, exact file paths, the acceptance criteria this step covers, and the verification commands.
- **Required reading:** `AGENTS.md`, the task's `spec.md` and `plan.md`, and the named `.claude/skills/<skill>/SKILL.md` files.
- **Inline the 3–6 rules that bind these files**, quoted from the skills. Assume Grok skips the files. The inlined rules are what actually protect the change.
- **Out of scope:** list the files it must not touch.
- **Report format:** the one from `AGENTS.md`.

A prompt that omits the rules of a skill covering its files is malformed. Fix it before spending the call.

## Step 5 — Execute

```bash
.claude/skills/urec-orchestrator/scripts/run-executor.sh <issue>-<slug> <step-id> <prompt-file> [model]
```

The wrapper runs `cursor-agent -p --model cursor-grok-4.6-high --sandbox enabled --trust --output-format text` in the current checkout (the task branch), and logs to `.orchestrator/<issue>-<slug>/<step-id>.log` (gitignored).

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
- the "Deviations" section of Grok's report.

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

1. Send Grok a fix prompt containing the failing output, the files involved and the same inlined rules.
2. Re-verify.
3. After round 2, switch to `executor.escalationModel` (`cursor-grok-4.6-xhigh`).
4. If it's still red after the last round, **Claude fixes it directly**, and the plan's Outcome notes it.
5. If Claude can't fix it either, stop and report (see Operating mode).

## Step 8 — Claude review (hard gate)

Run the `pr-review` skill on `git diff origin/main...HEAD`. For `security-check` and `compliance-review` scope, run it on an **Opus or Fable** subagent. Every finding must quote the rule it applies.

- **Blocking findings:** fix them via Grok or directly, then re-run Step 7.
- **Non-blocking findings:** list them in the PR under "Follow-ups". Create issues only if they matter.

Run `security-check` and `compliance-review` too whenever their scope is touched (see the Step 2 table).

## Step 9 — Close out docs

- `plan.md`: tick the steps. Fill in **Outcome**: what shipped, deviations, fix rounds, the executor model used, and follow-ups.
- `spec.md`: tick the acceptance criteria that are proven. Name the test that proves each one.

## Step 10 — Commit, push, PR

```bash
git add -A && git status --porcelain      # check nothing unexpected is staged
git commit -m "<type>(<area>): <summary> (#<issue>)"
git push -u origin HEAD
# Write the body: copy .github/pull_request_template.md to .orchestrator/<issue>-<slug>/pr-body.md
# and fill every section (Closes #<issue>, spec/plan links, verification output, review findings).
gh pr create --base main --title "<type>(<area>): <summary> (#<issue>)" \
  --body-file .orchestrator/<issue>-<slug>/pr-body.md
.claude/skills/github-workflow/scripts/set-status.sh <issue> inReview
```

- **Commits:** Conventional Commits. Split the commits logically if the diff is large: tests, implementation, docs.
- **Attribution:** end the commit message and PR body with the lines required by the session's attribution rules.
- **Then stop.** Don't merge, don't enable auto-merge, don't close the issue. `Closes #N` closes it when a human merges.

## Final report (to the user)

- Issue and PR links, with the branch name.
- Acceptance criteria, each marked ✅/❌ with the proving test.
- Verification results: each command, pass or fail.
- Executor usage: steps, fix rounds, escalations, anything Claude fixed directly.
- Assumptions made, and PRD open items touched.
- Follow-ups, and any setup the user must do (for example `gh auth refresh -s project`).

## Anti-patterns

- Planning without reading `prd-context` and the domain skills.
- Executor prompts that say "follow the skills" without inlining the rules.
- Letting Grok commit, push, add dependencies, or touch `docs/tasks`.
- Trusting "all tests pass" without running them.
- Treating a **proposed** PRD item as decided without saying so in the spec.
- Merging, or moving a card to Done.
