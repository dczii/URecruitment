---
description: Plan and build one task end to end (issue → spec + plan → Grok implements → verify → review → PR)
argument-hint: <task description | #issue | issue URL>
---

Run the project `urec-orchestrator` skill (`.claude/skills/urec-orchestrator/SKILL.md`) on this input. Don't use the global `orchestrator` skill:

$ARGUMENTS

Requirements:
- Follow the skill's steps 0–10 in order. There is **no approval gate**: stop only for the blocking conditions the skill lists.
- If the input is empty, list the open `type:task` issues in milestone `MVP` on Project 4 whose dependencies are closed, pick the first, and say which one you picked.
- Write `docs/tasks/<issue>-<slug>/spec.md` and `plan.md` before any code changes.
- Code is written by `cursor-agent` (Grok 4.6) with the binding skill rules inlined. `.pen` design steps are done by Claude.
- Finish with an open PR (`Closes #<issue>`) and the card in In Review. Do not merge.
- End with the final report format from the skill.
