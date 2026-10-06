# HRManagement

Recruitment portal for the recruiters (6–20 people) of a Singapore recruitment agency. It replaces Manatal. The MVP is a working prototype on **fictional data**, live by mid-December 2026, and ends with a go/no-go decision on real data.

Product AI (CV/JD model parsing, match scores, embeddings, NL search, AI gap flags) is **out of scope**. Recruiters enter job and candidate fields. Keyword + filter search and deterministic missing-field flags remain.

The product source of truth is the PRD dated 17 Sep 2026, condensed in the `prd-context` skill (`docs/URecruitment-PRD.pdf`), except where this file says AI is not built. Each remaining PRD item is **decided**, **proposed** or **open**. Never settle an open item silently.

## Stack

| Layer           | Choice                                                                                    |
| --------------- | ----------------------------------------------------------------------------------------- |
| App             | Next.js (App Router) + TypeScript, on Vercel with functions pinned to `sin1`              |
| Data            | Supabase Postgres + private Storage bucket in `ap-southeast-1`; PGroonga (EN/ZH keywords) |
| UI              | Tailwind CSS + shadcn/ui, themed from pen.dev tokens; designs in `design/*.pen`           |
| Tests           | Vitest (logic), Playwright (key screens, desktop + phone)                                 |
| Ops             | Vercel runtime logs + Sentry. GitHub Actions CI. Supabase CLI migrations                  |
| Package manager | **npm**                                                                                   |

## Hard rules

1. **No autonomous decisions.** No code path rejects, advances, shortlists or contacts a candidate, or sends anything to a client.
2. **Recruiter login email only** — user-requested OTP codes through Supabase Auth/Resend are allowed. No candidate/client emails, alerts, reminders or consent requests.
3. **Server-only data access.** The browser talks only to Next.js. The Supabase secret key lives only in Vercel env vars. RLS is on for every table with **no public policies**. CV files open through short-lived signed URLs.
4. **No product AI.** Do not add model calls, match scores, embeddings, NL query parse, or AI-generated gap flags.
5. Nationality and language count only when the recruiter marks them as a real requirement and writes why.
6. **Fictional data only in the MVP.** Never load real candidate data. Never commit secrets, credentials, `.env*` files or the sample-data Blob store URL. **This repo is public.**
7. **Time.** Store UTC, display Singapore time. Stage limits count Singapore working days (Mon–Fri minus SG public holidays).
8. **Audit by typed name.** Stage and settings changes record the name the recruiter types (remembered on the device). Approved recruiters sign in with email OTP; typed-name auditing remains required.
9. **Free tiers.** Vercel Hobby (cron once a day, one region) and Supabase Free (500 MB DB, 1 GB storage, 50 MB/file). Derive delay status in a DB view, not a scheduled job.

## Commands

```
npm run dev          # local app
npm run lint
npm run typecheck
npm test             # Vitest (unit, no network)
npm run test:db      # Vitest DB integration on local Supabase (needs Docker)
npm run test:e2e     # Playwright (desktop + phone projects)
npm run build
npm run seed         # rebuild sample data (lists the public Vercel Blob store via env)
```

`npm run db:types` regenerates `src/lib/database.types.ts`; `db:types:check` is the CI drift check. There is no `eval` script (AI is out of scope). Docker is not available locally: run `test:db` in CI.

## Workflow (Spec Kit)

The constitution at `.specify/memory/constitution.md` restates the hard rules for Spec Kit. Keep it and this file in step.

- Planning and implementation start from the user’s request. Claude review and GitHub issue linkage are not prerequisites. Issue tracking in `dczii/HRManagement` / Project 4 is optional and used only when requested; config lives in `.claude/github-project.json`.
- **Each feature gets a Spec Kit folder** `specs/<NNN-feature>/` (`spec.md`, `plan.md`, `tasks.md`). Run `/speckit-specify` → `/speckit-clarify` → `/speckit-plan` → `/speckit-checklist` → `/speckit-tasks` → `/speckit-analyze` → `/speckit-implement`. Tasks live in `tasks.md`; conversion to GitHub issues is optional and requires an explicit request. Open questions go to `docs/decisions/open-questions.md`, never into a spec as an assumption.
- **Document precedence:** constitution + this file, then ADRs, then the PRD, then `docs/plans|compliance|security|ux`, then `specs/`, then `design/`. `project-map` lists every document and what it governs. Legacy plans now live in `specs/001-*` through `specs/044-*` (see `specs/README.md`); `docs/backlog/**` remains the backlog source.
- **`/review [PR#]`** optionally reviews a diff against its spec, the constitution and the skills in scope when requested; no named model or reviewer is required for planning or implementation.
- **Git:** when separately authorized, use `<type>/<slug>` branches from `main` and Conventional Commits. Issue references and closing keywords are optional when an issue exists. A feature ships as one PR. Never merge.
- **Tests first for logic.** Working days, delay status, gap rules, stage advance and similar logic get failing Vitest tests before the implementation.
- **Executors can't load Claude skills.** Any prompt to `cursor-agent` inlines the rules that apply. `AGENTS.md` carries the baseline rules.

## Skills (`.claude/skills/`)

Load `project-map` first on any task.

| Skill                | Load when                                                                                          |
| -------------------- | -------------------------------------------------------------------------------------------------- |
| `project-map`        | Always first. Repo atlas, every document and what it governs, precedence, known drift              |
| `speckit-workflow`   | Starting a feature or story; which `/speckit-*` step is next; linking specs to issues              |
| `prd-context`        | Any product question: decisions, non-goals, pipeline rules, data model, screens, sample data       |
| `nextjs-app`         | Routes, Server Components/Actions, env, proxy, app structure                                       |
| `supabase-db`        | Migrations, RLS, Storage, PGroonga, views, working-day SQL, seed                                   |
| `ui-build`           | Screens and components (shadcn + Tailwind), tokens, pen.dev designs, phone width, a11y             |
| `talent-search`      | Keyword + filter search                                                                            |
| `testing`            | Vitest, DB tests, Playwright, fixtures, what to prove per area                                     |
| `security-compliance`| Secrets, RLS, Storage, uploads, logging, PDPA, fair employment, protected attributes               |
| `github-workflow`    | Issues, sub-issues, labels, Project 4, branches, commits, PRs                                      |
| `release-ci`         | Vercel/Supabase environments, env vars, GitHub Actions, free-tier limits                           |

The `speckit-*` skills (analyze, checklist, clarify, constitution, converge, implement, plan, specify, tasks, taskstoissues) are installed by Spec Kit. Do not edit them; upgrade through the `specify` CLI.
