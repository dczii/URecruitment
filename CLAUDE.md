# URecruitment

AI-assisted recruitment portal for the recruiters (6–20 people) of a Singapore recruitment agency. It replaces Manatal. The MVP is a working prototype on **fictional data**, live by mid-December 2026, and ends with a go/no-go decision on real data.

The product source of truth is the PRD dated 17 Sep 2026, condensed in the `prd-context` skill. Each PRD item is **decided**, **proposed** or **open**. Build decided items as written. Build proposed items as written unless the issue says otherwise, and say so in the spec. Never settle an open item silently.

## Stack

| Layer | Choice |
|---|---|
| App | Next.js (App Router) + TypeScript, on Vercel with functions pinned to `sin1` |
| Data | Supabase Postgres + private Storage bucket in `ap-southeast-1`; pgvector (meaning) + PGroonga (EN/ZH keywords) |
| UI | Tailwind CSS + shadcn/ui, themed from pen.dev tokens; designs in `design/*.pen` |
| AI | Vercel AI SDK. **Provider not chosen yet** — keep code provider-agnostic |
| Tests | Vitest (logic), Playwright (key screens, desktop + phone), AI eval script (quality bar) |
| Ops | Vercel runtime logs + Sentry. GitHub Actions CI. Supabase CLI migrations |
| Package manager | **npm** |

## Hard rules

1. **AI only suggests.** No code path rejects, advances, shortlists or contacts a candidate, or sends anything to a client. Every AI result is labelled as a suggestion.
2. **No email, ever** — no alerts, reminders or consent requests. Everything surfaces on the dashboard.
3. **Server-only data access.** The browser talks only to Next.js. The Supabase secret key lives only in Vercel env vars. RLS is on for every table with **no public policies**. CV files open through short-lived signed URLs.
4. **Traceable AI.** Every AI output is schema-validated, stored in `ai_runs` with its input, model id/version, date, cost and duration, and shows the source text it relied on. Match scores are keyed to job version + model version.
5. **Fair scoring.** Scoring ignores name, photo, age, gender, race, religion and marital status. Nationality and language count only when the recruiter marks them as a real requirement and writes why.
6. **Fictional data only in the MVP.** Never load real candidate data. Never commit secrets, credentials, `.env*` files or the sample-data Blob store URL. **This repo is public.**
7. **Time.** Store UTC, display Singapore time. Stage limits count Singapore working days (Mon–Fri minus SG public holidays).
8. **Audit by typed name.** Stage and settings changes record the name the recruiter types (remembered on the device). There is no sign-in in the MVP.
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
npm run eval         # AI quality script against the answer key
npm run seed         # rebuild sample data (lists the public Vercel Blob store via env)
```

Until the app is scaffolded, these scripts don't exist. The task that first needs a script adds it with exactly this name.

## Workflow

- **Every change starts from a GitHub issue** in `dczii/URecruitment`, tracked on [Project 4](https://github.com/users/dczii/projects/4). The hierarchy is Epic → Story → Task, using sub-issues. Config lives in `.claude/github-project.json`.
- **`/task <description | #issue>`** runs the `urec-orchestrator` skill. Use it instead of the global `orchestrator` skill in this repo. It writes `docs/tasks/<issue>-<slug>/plan.md` (no `spec.md`), has Cursor Grok 4.6 or GPT-5.6 (`cursor-agent`) implement, verifies until lint/typecheck/tests (and build/e2e/db/eval when they apply) are green, closes out docs, then opens a PR and moves the card to In Review. It does **not** run `pr-review`. There is no approval gate. **Claude never merges.**
- **`/backlog`** builds or refreshes the issue tree from the PRD. **`/review [PR#]`** runs `pr-review`.
- **Git:** branches are named `<type>/<issue>-<slug>` and cut from `main`. Commits use Conventional Commits (`feat(matching): cap score on missing must-have (#42)`). The PR body contains `Closes #<issue>`. A Story ships as **one PR** with at least one commit per Task, closing every Task and the Story. A human squash-merges.
- **Tests first for logic.** Working days, score caps, delay status, gap rules and similar logic get failing Vitest tests before the implementation.
- **Executors can't load Claude skills.** Every `cursor-agent` prompt inlines the rules that apply (see `urec-orchestrator`). `AGENTS.md` carries the baseline rules for Cursor.

## Skills (`.claude/skills/`)

| Skill | Load when |
|---|---|
| `urec-orchestrator` | Starting any task (`/task`). Plans, delegates to Grok, verifies, opens the PR. Takes precedence over the global `orchestrator` |
| `github-workflow` | Creating/updating issues, sub-issues, labels, Project 4 fields, branches, PRs |
| `backlog-builder` | Turning the PRD into Epic → Story → Task issues (`/backlog`) |
| `prd-context` | Any product question: decisions, non-goals, pipeline rules, data model, screens, sample data |
| `nextjs-app` | Routes, Server Components/Actions, `after()`, API routes, env, app structure |
| `supabase-db` | Migrations, RLS, Storage, pgvector/PGroonga, views, seed |
| `ui-design` | Designing screens and tokens in pen.dev (`design/*.pen`) |
| `ui-build` | Building screens/components with shadcn/ui + Tailwind from designs |
| `ai-pipeline` | Any AI call: parsing, embeddings, matching, gap check, `ai_runs`, re-scoring |
| `ai-prompts` | Writing or changing the app's own prompts and output schemas |
| `ai-eval` | The answer key, the quality script, grading EN/ZH separately |
| `talent-search` | Plain-language search, filters, hybrid keyword + vector query |
| `testing` | Writing tests: Vitest, Playwright, fixtures, what to test per layer |
| `compliance-review` | Anything touching candidate data, scoring, gap flags, retention/consent |
| `security-check` | Secrets, RLS, Storage, rate limits, spend caps, public-repo hygiene |
| `pr-review` | Reviewing a diff against spec, PRD guardrails and tests (`/review`) |
| `release-deploy` | Vercel/Supabase environments, env vars, deploying, free-tier limits |
| `ci-setup` | GitHub Actions: lint, typecheck, tests, e2e, eval, migrations |
