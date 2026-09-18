---
name: github-workflow
description: >
  GitHub mechanics for URecruitment (dczii/URecruitment + Project 4) via the gh CLI: creating
  Epic/Story/Task/Bug issues, linking sub-issues, labels, milestones, moving Project 4 cards
  (Todo → In Progress → In Review), branch names, Conventional Commits and PRs. Use whenever an
  issue, sub-issue, label, milestone, project card, branch or pull request is created, read or
  updated.
---

# GitHub workflow

Everything goes through the `gh` CLI. The GitHub MCP server is not relied on. Config lives in `.claude/github-project.json`.

- **Repo:** `dczii/URecruitment` (**public**, default branch `main`)
- **Board:** [Project 4](https://github.com/users/dczii/projects/4), owned by user `dczii`
- **Token scopes needed:** `repo`, `project`. Check with `gh auth status`. If `project` is missing, tell the user to run `gh auth refresh -s project`. You can't do it for them, because it needs a browser.

## Scripts (`.claude/skills/github-workflow/scripts/`)

| Script | Does |
|---|---|
| `setup-labels.sh` | Idempotently creates the label set and milestones below. Run once, or again after edits. |
| `project-fields.sh` | Caches Project 4's id, fields and options to `.claude/github-project.fields.json` (gitignored), and checks that the `statusFlow` names exist. |
| `new-issue.sh <epic\|story\|task\|bug> "<title>" <body-file> [parent#] [milestone] [extra,labels]` | Creates the issue, links it under its parent, adds it to Project 4 with status Todo, and prints the number. |
| `add-sub-issue.sh <parent#> <child#>` | Links an existing issue as a sub-issue (GraphQL `addSubIssue`). |
| `set-status.sh <issue#> <planned\|inProgress\|inReview\|done>` | Adds the issue to Project 4 if needed and sets Status. |
| `tree.sh <issue#>` | Prints an issue's parent and its sub-issues, with state. |

Agents never use `done`: merging a PR with `Closes #N` closes the issue, and the board's built-in workflow moves the card.

## Hierarchy: Epic → Story → Task

| Level | Label | Title pattern | Body |
|---|---|---|---|
| Epic | `type:epic` | `[Epic] CV processing` | Goal, PRD sections, the stories it contains, exit criteria |
| Story | `type:story` | `[Story] Recruiter corrects a parsed CV field` | Recruiter story ("As a recruiter, I…"), acceptance criteria, PRD refs, ordered task list |
| Task | `type:task` | `Add candidate_profiles override columns` | What to build, done-when, parent story |
| Bug | `bug` | `Overdue badge ignores SG public holidays` | Steps, expected vs actual, affected AC |

- The issue bodies follow the forms in `.github/ISSUE_TEMPLATE/`. Keep the same headings when creating issues from the CLI.
- **Sub-issues are the only parent link.** Don't also write "Parent: #N" in prose.
- **Every issue** gets exactly one `type:*` label (bugs use `bug`), one or more `area:*` labels, and a milestone.
- **Milestones:** `MVP` (the default), `Real-data release`, `Later`. They follow the PRD release plan.

### Labels

| Label | Meaning |
|---|---|
| `type:epic`, `type:story`, `type:task` | Hierarchy level |
| `area:foundation` | Scaffold, env, tooling |
| `area:design-system` | pen.dev tokens, shadcn theme, shared components |
| `area:data` | Schema, migrations, RLS, seed |
| `area:cv-processing` | Extraction, parser, review queue, profile edits |
| `area:jobs` | Job form, JD upload, versions |
| `area:gap-check` | Job request flags |
| `area:matching` | Embeddings, scoring, ranked list |
| `area:search` | Talent search |
| `area:pipeline` | Stages, board, delay status |
| `area:dashboard` | Overdue/due-soon lists, filters |
| `area:placements` | Start date, 30-day guarantee |
| `area:settings` | Limits, holidays, change log |
| `area:ai-governance` | `ai_runs`, eval, quality bar, rate limits |
| `area:compliance` | PDPA, fair employment |
| `area:release` | CI, deploy, environments |
| `needs-decision` | Blocked on a PRD open question or product call |
| `prd:proposed` | Implements a PRD item that is still *proposed* |
| `priority:p0`, `priority:p1`, `priority:p2` | Must for MVP / should / nice |

## Reading issues

```bash
gh issue view 42 --json number,title,body,labels,milestone,state,url
.claude/skills/github-workflow/scripts/tree.sh 42
gh issue list --label type:story --milestone MVP --state open --limit 100
gh issue list --search "in:title parser" --state all
```

## Branches, commits and PRs

- **Branch:** `<type>/<issue>-<slug>`, cut from an up-to-date `main`. Types: `feat fix chore docs test refactor design ci`.
- **Commits:** Conventional Commits, `<type>(<area>): <imperative summary> (#<issue>)`. The area is the `area:*` label without its prefix. Put the body lines at 72 characters or fewer, and explain the *why*.
- **PR:**
  - Title matches the main commit.
  - Base is `main`.
  - Body follows `.github/pull_request_template.md` and contains `Closes #<issue>`. A Story PR has one `Closes #<task>` line per Task, then `Closes #<story>`.
  - Label the PR with the issue's `area:*` labels.
  - Link the spec and plan as repo-relative paths.
- **Hands off:** Claude never merges, never enables auto-merge, and never force-pushes to `main`. Force-pushing your own task branch is fine only before review starts.

```bash
gh pr create --base main --title "feat(matching): cap score on missing must-have (#42)" \
  --body-file .orchestrator/42-must-have-cap/pr-body.md --label area:matching
.claude/skills/github-workflow/scripts/set-status.sh 42 inReview
gh pr view --json number,url,statusCheckRollup
```

## Gotchas

- `gh issue create --project` needs the project **title** and the `project` scope. Use `set-status.sh`, which adds by URL.
- User-owned repos don't support GitHub *issue types*, so the hierarchy uses labels plus sub-issues.
- The fields cache holds node IDs. If a field or option was renamed on the board, delete the cache and re-run `project-fields.sh`.
- If Project 4's Status options don't include the names in `.statusFlow`, `project-fields.sh` reports them. Fix the config (or the board), and don't guess.
- The repo is public, so issue bodies are too. Never paste credentials, sample-data Blob URLs or real personal data into them.
