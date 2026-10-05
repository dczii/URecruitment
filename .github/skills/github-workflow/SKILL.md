---
name: github-workflow
description: >
  GitHub mechanics for HRManagement (dczii/HRManagement + Project 4) via the gh CLI: Epic →
  Story → Task issues with sub-issues, labels, milestones, Project 4 status, branch names,
  Conventional Commits, PRs, and the bridge from Spec Kit specs/tasks to issues. Use whenever an
  issue, sub-issue, label, project card, branch or pull request is created, read or updated.
---

# GitHub workflow

`gh` CLI only. Config: `.claude/github-project.json`, cached fields `.claude/github-project.fields.json` (gitignored). Repo `dczii/HRManagement` (**public**, default `main`), board [Project 4](https://github.com/users/dczii/projects/4). Needs `repo` and `project` scopes (`gh auth status`; if `project` is missing, ask the user to run `gh auth refresh -s project`). Issue forms: `.github/ISSUE_TEMPLATE/`; PR body: `.github/pull_request_template.md`. Backlog source: `docs/backlog/manifest.json` and `roadmap/E00–E13.json`.

## Scripts (`scripts/`)

`setup-labels.sh` (labels + milestones), `project-fields.sh` (cache Project 4 fields), `new-issue.sh <epic|story|task|bug> "<title>" <body-file> [parent#] [milestone] [labels]`, `add-sub-issue.sh <parent#> <child#>`, `set-status.sh <issue#> <planned|inProgress|inReview|done>`, `set-field.sh`, `tree.sh <issue#>`. Agents never set `done`; merging a PR with `Closes #N` does.

## Hierarchy

| Level | Label | Title | Body |
| --- | --- | --- | --- |
| Epic | `type:epic` | `[Epic] …` | Goal, PRD sections, stories, exit criteria |
| Story | `type:story` | `[Story] …` | "As a recruiter, I…", acceptance criteria, PRD refs, **link to `specs/<NNN-feature>/spec.md`** |
| Task | `type:task` | imperative | What to build, done-when, parent story, matching `tasks.md` id (e.g. `T012`) |
| Bug | `bug` | symptom | Steps, expected vs actual |

Sub-issues are the only parent link. Every issue has one `type:*`, at least one `area:*` (`foundation, design-system, data, cv-processing, jobs, gap-check, search, pipeline, dashboard, placements, settings, compliance, release`), and a milestone (`MVP`, `Real-data release`, `Later`). Extra labels: `needs-decision` (blocked on an open question), `prd:proposed`, `priority:p0|p1|p2`. Legacy `area:matching` and `area:ai-governance` issues are out of scope for the MVP.

## Spec Kit bridge

- Planning and implementation do not require GitHub issues or issue links. When explicitly requested, link supplied issues to specs/tasks or use `/speckit-taskstoissues`; absent links never block feature work.
- Specs live in `specs/`, never in the issue body; issues link to them by repo-relative path.

## Branches, commits, PRs

- Branch `<type>/<slug>` from an up-to-date `main` (`feat fix chore docs test refactor design ci`). Spec Kit's own branch numbering is not used.
- Conventional Commits: `<type>(<area>): <imperative summary>`, body ≤ 72 columns explaining why; issue suffixes are optional.
- **One PR per feature**, base `main`, body from the template, linking the spec path. Issue-closing keywords and issue labels are optional when issues exist. GitHub only links closing keywords on default-branch PRs, so stacked PRs show empty `closingIssuesReferences` (expected).
- Never merge, enable auto-merge, or force-push `main`. Don't push without the user asking.

## Gotchas

User-owned repos have no issue types, hence labels + sub-issues. `gh issue create --project` needs the project title; use `set-status.sh`. If board option names drift, re-run `project-fields.sh`. The repo is public: no credentials, Blob URLs or personal data in issues or PRs.
