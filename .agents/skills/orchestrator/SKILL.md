---
name: orchestrator
description: Route planning, implementation, and continuation through this repository's Spec Kit skills, using other repository skills only when needed for the current task.
---

# Orchestrator

Follow Spec Kit's process. Keep the requested scope and stopping point; do not add another planning framework.

## Context and skill discovery

- Read applicable repository instructions, `.specify/memory/constitution.md`, `CLAUDE.md`, and `.github/skills/project-map/SKILL.md`. Inspect the owning feature artifacts and existing changes.
- Inventory skill names and descriptions under `.github/skills/` and `.agents/skills/`; deduplicate symlinked copies. Use only skills whose resolved instruction paths are inside the repository.
- Know what skills are available without loading every skill's body. Read a skill and its relevant supporting resources only when needed for the current stage or task. Respect explicit-only invocation and read-only boundaries.
- For stale references to removed skills, read the relevant source documents directly; do not restore them or substitute personal, global, plugin, or external skills.

## Route the request

| Request | Action |
| --- | --- |
| Plan a feature | Follow the repository Spec Kit sequence: specify → clarify → plan → checklist → tasks → analyze. Stop after planning. |
| Implement a feature, phase, or task IDs | Use `speckit-implement` with that scope and its prerequisite checks. |
| Continue a feature | Inspect existing artifacts, checklists, and task status; resume the next unfinished authorized stage. |

Read `.github/skills/speckit-workflow/SKILL.md` and each applicable `.github/skills/speckit-<stage>/SKILL.md`. Let those skills define templates, artifacts, sequencing, hooks, and gates. Apply conditional stages as they prescribe. When direct invocation is unavailable, execute the skill's instructions without claiming an unavailable command ran.

Use other repository skills only when their capability helps the current task. Keep implementation in dependency order and within the authorized file scope. For large implementations, work in a bounded task batch or phase and resume from `tasks.md`; use `speckit-converge` only for remaining authorized work.

## Finish

Follow repository test-first rules and verification commands. Confirm acceptance evidence before marking tasks complete, and edit `tasks.md` only when allowed. Report completed scope, check results, and blockers in the repository's required format.

Repository role and permission restrictions still apply to Spec Kit scripts and hooks. Preserve unrelated work, inspect scripts for prohibited side effects, and ask only for blocking decisions or required authorization. If planning belongs to another agent, prepare a handoff. Delegate only when authorized.
