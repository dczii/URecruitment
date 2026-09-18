# Task docs

Each task that goes through `/task` gets a folder named after its GitHub issue:

```
docs/tasks/<issue-number>-<slug>/
  plan.md   # contract + how: problem, PRD refs, scope, ACs, guardrails, approach, files, executor steps, outcome
```

- Folders are created by `.claude/skills/urec-orchestrator/scripts/new-task-docs.sh` from `templates/plan.md`.
- **Do not add `spec.md`.** Older folders may still have one; new work uses `plan.md` only.
- The plan is committed as the **first commit** on the task branch, before any code.
- **Outcome** is filled after execution: what shipped, changed areas, tests added (or why none were needed), verification, deviations, fix rounds, and every model used by role.
- Coding agents (Cursor Grok or GPT-5.6 via `cursor-agent`) read this file but never edit it.

Example: issue #42 "Cap match score when a must-have is missing" → `docs/tasks/42-must-have-score-cap/`.
