---
description: Review the current branch or a PR against its spec, the constitution and the project skills
argument-hint: "[PR# | branch] [--comment]"
---

Review this target (no target means the current branch against `origin/main`):

$ARGUMENTS

Steps:
1. Load `project-map`. Find the Story's `specs/<NNN-feature>/` (from the PR body, branch name or linked issue) and read `spec.md`, `plan.md`, `tasks.md` and `.specify/memory/constitution.md`.
2. Load every project skill that matches the changed paths: `nextjs-app`, `supabase-db`, `ui-build`, `talent-search`, `testing`, `release-ci`. Always add `security-compliance` for candidate data, storage, env, search, logging or migrations.
3. Check the diff against: each acceptance scenario and task; every constitution principle; the owning documents listed in `project-map`; test quality (test-first for logic, no weakened tests); migrations (RLS + revoke, types regenerated); UI at desktop and phone width; git conventions (`github-workflow`).
4. Run `npm run lint`, `typecheck` and `test`, plus `build` / `test:e2e` when app code or screens changed, and include the results. `test:db` runs in CI.
5. Print findings ranked by severity with file:line and the rule broken. Post to the PR with `gh pr comment` only if `--comment` is given. Never approve or merge.
