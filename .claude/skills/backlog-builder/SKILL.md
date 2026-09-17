---
name: backlog-builder
description: >
  Builds or refreshes the URecruitment GitHub backlog from the PRD: Epic → Story → Task issues
  with sub-issue links, labels, milestones and Project 4 status. Idempotent via
  docs/backlog/manifest.json. Use for `/backlog`, "create the issues from the PRD", "set up the
  board", "add stories for <capability>", or when the PRD changes and the backlog must follow.
---

# Backlog builder

The backlog map lives in [references/backlog-map.md](references/backlog-map.md). It lists the epics, stories and first-cut tasks, each with a stable key. Load `prd-context` and `github-workflow` first.

## Inputs

`/backlog [--dry-run] [--only E04,E06] [--milestone MVP|Real-data release|Later]`

- **`--dry-run`:** writes the preview only; creates nothing.
- **`--only`:** limits the run to the listed epic keys.
- **Default:** all `MVP` epics, plus the `Real-data release` epic **stubs** (epics only, labelled `needs-decision`).

## Procedure

1. **Preflight**
   - `gh auth status` must show the `repo` and `project` scopes.
   - Run `setup-labels.sh`, then `project-fields.sh`. Stop if a Status option named in `.statusFlow` is missing.
2. **Load state**
   - Read `docs/backlog/manifest.json`, which maps each key to its issue number (create the file as `{}` if absent).
   - For every manifest entry, confirm the issue still exists (`gh issue view N --json state`).
3. **Diff**
   - Compare the backlog map (filtered by the inputs) against the manifest.
   - For keys missing from the manifest, search by exact title before creating (`gh issue list --state all --search "in:title \"<title>\""`), so issues made by hand aren't duplicated. If one matches, adopt it into the manifest.
4. **Preview**
   - Write `docs/backlog/preview.md`: a table of what will be created or adopted, with counts per level.
   - If `--dry-run`, stop here and show the preview.
5. **Create top-down**, one level at a time: all epics, then all stories, then all tasks.
   - Write each body to a temp file using the matching issue form's headings (`.github/ISSUE_TEMPLATE/*.yml`).
   - Run `new-issue.sh <kind> "<title>" <body> <parent#> <milestone> <labels>`.
   - Write the new number into the manifest **immediately after each create**, so a crash doesn't cause duplicates on the next run.
   - Stories list their tasks, in order, in a "Tasks" section, **after** the tasks exist. Edit the story body at the end with `gh issue edit`.
6. **Report**
   - Counts created / adopted / skipped, and links to the epics and the board.
   - Commit `docs/backlog/manifest.json` and `preview.md` on a `chore/backlog-sync` branch and open a PR (the `github-workflow` conventions apply).

## Writing the issues

- **Epic body:**
  - Goal
  - PRD sections, with their status
  - Stories (a checklist, filled at the end)
  - Exit criteria
  - Out of scope (from the PRD non-goals)
- **Story body:**
  - "As a recruiter, I want … so that …"
  - Acceptance criteria (Given/When/Then)
  - PRD references with status
  - Tasks (an ordered list)
  - Design needed? (yes/no, with the screen)
- **Task body:**
  - What to build
  - Done when (1–4 bullets)
  - Skills in scope (e.g. `supabase-db`, `testing`)
  - Executor hint: `grok` or `claude` (design)
  - Depends on (task keys → issue numbers)

**Sizing and labels:**
- A task is **one PR**, roughly ≤ 400 changed lines. Split it if it's bigger.
- Logic tasks mention "test-first".
- Items marked *proposed* in the PRD get `prd:proposed`. Items that depend on an *open* question get `needs-decision`.
- Priority: `priority:p0` for everything the MVP scope needs; `p1`/`p2` only where the map says so.
- **Never** include credentials, Drive IDs or real personal data. The repo is public.

## Keeping it in sync

When the PRD or the map changes:
1. Update `references/backlog-map.md` first, in a PR.
2. Re-run `/backlog`. It only creates what is missing.
3. **Never** delete or close issues automatically. List orphaned manifest keys in the report and let a human decide.
