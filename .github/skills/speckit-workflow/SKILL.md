---
name: speckit-workflow
description: >
  How Spec Kit runs in HRManagement: the constitution, the specs/ folder, the order of /speckit-*
  commands, which project skills and documents to load at each step, and optional GitHub
  issue tracking when explicitly requested. Use for any new feature, story or
  task, including natural-language requests to plan a feature or integration, and whenever
  someone asks which command to run next.
---

# Spec Kit workflow

Spec Kit (v1.0.x, installed with `specify init --here --integration claude`) provides the `/speckit-*` skills, templates in `.specify/templates/`, scripts in `.specify/scripts/bash/`, and the constitution at `.specify/memory/constitution.md`. Don't hand-edit files under `.specify/scripts` or the `speckit-*` skills; upgrade with the CLI.

## Where things live

| Artifact | Path |
| --- | --- |
| Constitution (hard rules, ported from CLAUDE.md) | `.specify/memory/constitution.md` |
| Feature spec / plan / tasks / checklists | `specs/<NNN-feature>/{spec,plan,research,data-model,tasks}.md`, `contracts/`, `checklists/` |
| Decisions that outlive one feature | `docs/decisions/` (ADRs) and `open-questions.md` |
| Legacy task plans | `specs/001-*` through `specs/044-*` (history; mapping in `specs/README.md`) |

One feature gets one Spec Kit folder. Planning and implementation require neither Claude review nor GitHub issue linkage. Branch creation remains separately authorized; use `<type>/<slug>` when requested. Issue references are optional.

### Feature plans, including drafts

When asked to plan a feature or integration, use `specs/<NNN-feature>/plan.md`, even for preliminary planning outside a `/speckit-*` command. Reuse the existing owning feature folder; otherwise inspect `specs/` and choose the next unused consecutive three-digit number and a descriptive slug. Do not place feature plans in `analysis/` or `docs/plans/`: `analysis/` holds findings and assessments, and `docs/plans/` holds cross-project standards.

Use the installed `.specify/templates/` for formal Spec Kit artifacts. Keep requirements in `spec.md`, implementation decisions in `plan.md`, and executable work in `tasks.md`; add supporting research, data models, contracts and checklists when needed. Mark preliminary plans as drafts and state missing prerequisites rather than presenting them as complete Spec Kit packages. A planning request does not authorize implementation, branch creation, GitHub changes or remote configuration.

## Flow

1. **Load context.** `project-map`, `prd-context`, the ADRs and any document `project-map` lists for the area.
2. `/speckit-specify <story>`: what and why only. Cite the PRD section, ADR and `docs/ux` flow. Mark PRD **proposed** items, and list **open** ones under Open Questions (never answer them).
3. `/speckit-clarify` when anything is ambiguous. Questions that need the owner go to `open-questions.md`, not into the spec as assumptions.
4. `/speckit-plan`: fill Technical Context from `project-map` (Next.js 16, React 19, TS strict, Tailwind 4 + shadcn, Supabase, Vitest, Playwright). The **Constitution Check** gate must cite each rule that applies. Load the area skills: `nextjs-app`, `supabase-db`, `ui-build`, `talent-search`, `security-compliance`.
5. `/speckit-checklist` for security/compliance/UX when the feature touches candidate data, search, storage or a new screen.
6. `/speckit-tasks`: tasks are test-first for logic (Vitest tests before implementation), grouped per user story, each naming exact file paths.
7. `/speckit-analyze`: must be clean before implementing. Treat a constitution conflict as CRITICAL.
8. `/speckit-taskstoissues`: optional, only when the user explicitly requests issue creation. Skip for ordinary planning and implementation; absent issue links never block either stage.
9. `/speckit-implement`, then the verification gate: `npm run lint && npm run typecheck && npm test`, plus `build` (app code), `test:e2e` (screens, desktop + phone), `test:db` (migrations; CI only on this machine).
10. `/speckit-converge` if anything is left in the authorized scope. Open a PR only when requested; issue-closing references are optional. Never merge.

## Rules

- A spec never contains an answer to an open question. Stop and ask.
- No product AI in specs, plans or tasks (constitution). A story whose PRD text is AI-based is re-scoped to recruiter entry and flagged.
- Tasks that change schema include the same-migration RLS + revoke statements and a type regeneration (`npm run db:types`).
- Executors that cannot load skills get the relevant rules inlined in their prompt, plus `AGENTS.md`.
- Update `project-map` when a feature adds a route, table, workflow or document.
