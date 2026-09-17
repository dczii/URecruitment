---
description: Build or refresh the Epic → Story → Task backlog on Project 4 from the PRD
argument-hint: "[--dry-run] [--only E04,E06] [--milestone MVP|Real-data release|Later]"
---

Run the project `backlog-builder` skill (`.claude/skills/backlog-builder/SKILL.md`) with these options:

$ARGUMENTS

Requirements:
- Use `.claude/skills/backlog-builder/references/backlog-map.md` as the source, and `docs/backlog/manifest.json` for idempotency.
- Run the preflight first (scopes, labels, project fields). If the token lacks the `project` scope, stop and tell me to run `gh auth refresh -s project`.
- Always write `docs/backlog/preview.md`. With `--dry-run`, stop after the preview.
- Never close or delete issues. Report orphaned manifest keys instead.
- Finish with counts (created / adopted / skipped), epic links, and a PR for the manifest.
