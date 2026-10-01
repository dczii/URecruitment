---
name: speckit-workflow
description: >
  How Spec Kit runs in HRManagement: the constitution, the specs/ folder, the order of /speckit-*
  commands, which project skills and documents to load at each step, and how specs, tasks and
  GitHub issues (Epic → Story → Task on Project 4) stay linked. Use for any new feature, story or
  task, and whenever someone asks which command to run next.
---

# Spec Kit workflow

Spec Kit (v1.0.x, installed with `specify init --here --integration claude`) provides the `/speckit-*` skills, templates in `.specify/templates/`, scripts in `.specify/scripts/bash/`, and the constitution at `.specify/memory/constitution.md`. Don't hand-edit files under `.specify/scripts` or the `speckit-*` skills; upgrade with the CLI.

## Where things live

| Artifact | Path |
| --- | --- |
| Constitution (hard rules, ported from CLAUDE.md) | `.specify/memory/constitution.md` |
| Feature spec / plan / tasks / checklists | `specs/<NNN-feature>/{spec,plan,research,data-model,tasks}.md`, `contracts/`, `checklists/` |
| Decisions that outlive one feature | `docs/decisions/` (ADRs) and `open-questions.md` |
| Legacy task plans | `docs/tasks/**` (history; no new folders) |

One feature = one Story = one branch `<NNN>-<slug>` is Spec Kit's default; this repo overrides it to `<type>/<issue>-<slug>` (see `github-workflow`). Pass the issue number in the spec header (`Story: #123`).

## Flow

1. **Load context.** `project-map`, `prd-context`, the ADRs and any document `project-map` lists for the area.
2. `/speckit-specify <story>`: what and why only. Cite the PRD section, ADR and `docs/ux` flow. Mark PRD **proposed** items, and list **open** ones under Open Questions (never answer them).
3. `/speckit-clarify` when anything is ambiguous. Questions that need the owner go to `open-questions.md`, not into the spec as assumptions.
4. `/speckit-plan`: fill Technical Context from `project-map` (Next.js 16, React 19, TS strict, Tailwind 4 + shadcn, Supabase, Vitest, Playwright). The **Constitution Check** gate must cite each rule that applies. Load the area skills: `nextjs-app`, `supabase-db`, `ui-build`, `talent-search`, `security-compliance`.
5. `/speckit-checklist` for security/compliance/UX when the feature touches candidate data, search, storage or a new screen.
6. `/speckit-tasks`: tasks are test-first for logic (Vitest tests before implementation), grouped per user story, each naming exact file paths.
7. `/speckit-analyze`: must be clean before implementing. Treat a constitution conflict as CRITICAL.
8. `/speckit-taskstoissues`: only after the Story issue exists. Create each Task as a sub-issue of the Story with `new-issue.sh` conventions (labels, milestone, Project 4) rather than loose issues. Skip for work with no issue tree.
9. `/speckit-implement`, then the verification gate: `npm run lint && npm run typecheck && npm test`, plus `build` (app code), `test:e2e` (screens, desktop + phone), `test:db` (migrations; CI only on this machine).
10. `/speckit-converge` if anything is left, then open one PR per Story (`Closes #task…`, `Closes #story`). Never merge.

## Rules

- A spec never contains an answer to an open question. Stop and ask.
- No product AI in specs, plans or tasks (constitution). A story whose PRD text is AI-based is re-scoped to recruiter entry and flagged.
- Tasks that change schema include the same-migration RLS + revoke statements and a type regeneration (`npm run db:types`).
- Executors that cannot load skills get the relevant rules inlined in their prompt, plus `AGENTS.md`.
- Update `project-map` when a feature adds a route, table, workflow or document.
