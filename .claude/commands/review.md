---
description: Review the current branch or a PR against its spec, the PRD guardrails and the project skills
argument-hint: "[PR# | branch] [--comment]"
---

Run the project `pr-review` skill (`.claude/skills/pr-review/SKILL.md`) on:

$ARGUMENTS

Requirements:
- No target means review the current branch against `origin/main`.
- Load the task's `spec.md` and `plan.md`, `prd-context`, and every skill in the plan's scope. Add `security-check` and `compliance-review` when their scope is touched.
- Run the verification commands yourself and include the results.
- Use an Opus or Fable subagent for security, data, AI-scoring or migration changes.
- Print the review in the skill's output format. Post it to the PR with `gh pr comment` **only** if `--comment` is given. Never approve or merge.
