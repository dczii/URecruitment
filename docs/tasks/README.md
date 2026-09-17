# Task docs

Each task that goes through `/task` gets a folder named after its GitHub issue:

```
docs/tasks/<issue-number>-<slug>/
  spec.md   # WHAT and WHY: problem, PRD refs, scope, acceptance criteria, guardrails, assumptions
  plan.md   # HOW: approach, files, dependencies, executor steps, test plan, outcome
```

- The folders are created by `.claude/skills/urec-orchestrator/scripts/new-task-docs.sh` from the templates in `.claude/skills/urec-orchestrator/templates/`.
- The spec and plan are committed as the **first commit** on the task branch, before any code.
- `plan.md` → **Outcome** is filled in after execution: what shipped, changed areas, tests added (or why none were needed), verification, deviations, fix rounds, and every model used by role.
- Coding agents (Cursor Grok or GPT-5.6 via `cursor-agent`) read these files but never edit them.

Example: issue #42 "Cap match score when a must-have is missing" → `docs/tasks/42-must-have-score-cap/`.
