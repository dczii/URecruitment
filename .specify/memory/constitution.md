# HRManagement Constitution

HRManagement is a recruitment portal for the 6–20 recruiters of a Singapore recruitment agency. It replaces Manatal. The MVP is a working prototype on fictional data, live by mid-December 2026, and ends in a go/no-go on real data. The product source of truth is the PRD dated 17 Sep 2026 (`docs/URecruitment-PRD.pdf`), except where this constitution removes scope.

## Core Principles

### I. Recruiters Decide (NON-NEGOTIABLE)
No code path rejects, advances, shortlists or contacts a candidate, or sends anything to a client. Every stage change is a recruiter action. Nothing is pre-selected by a score or rule.

### II. No Email, Ever
The system sends no email: no alerts, reminders or consent requests. Everything surfaces on the dashboard.

### III. Server-Only Data Access
The browser talks only to Next.js. Supabase and Storage are called only from server code that begins `import "server-only"`. The Supabase secret key lives only in Vercel environment variables. RLS is enabled on every table with no public policies and `revoke all` from `anon, authenticated`. CV files open through short-lived signed URLs from a private bucket.

### IV. No Product AI
No model calls, match scores, embeddings, natural-language query parsing or AI-generated gap flags. Recruiters enter job and candidate fields. Keyword plus filter search and deterministic missing-field flags remain. Dormant AI tables in the schema are not wired to code.

### V. Fair Employment
Name, photo, age, gender, race, religion and marital status never rank or filter candidates. Nationality and language count only when the recruiter marks them as a real requirement and writes why. No logic on pregnancy, caregiving, disability or mental health.

### VI. Fictional Data Only (NON-NEGOTIABLE)
Never load real candidate data. Never commit secrets, credentials, `.env*` files or the sample-data Blob store URL. The repository is public. The Blob store is the seed source only: app code under `src/` never imports `@vercel/blob`.

### VII. Singapore Time
Store UTC, display `Asia/Singapore`. Stage limits count Singapore working days (Mon–Fri minus SG public holidays). Delay status is derived in a database view, not a scheduled job.

### VIII. Audit by Typed Name
Stage and settings changes record the name the recruiter types, remembered on the device. There is no sign-in in the MVP.

### IX. Test-First for Logic, Verified at Both Widths
Working days, limits, delay status, gap rules, stage advance and similar logic get failing Vitest tests before implementation. Key screens get Playwright coverage at desktop (1440×900) and phone (390×844). Tests are never deleted, skipped or loosened to pass. Delay status is never colour-only.

### X. Decided, Proposed, Open
Each PRD item is decided, proposed or open. Proposed items are built and labelled `prd:proposed`. Open items (`docs/decisions/open-questions.md`) are never settled silently inside a spec, plan, migration, seed value or PR; the work stops and asks.

## Constraints

- **Stack:** Next.js App Router + TypeScript strict, Tailwind CSS + shadcn/ui, Supabase Postgres (PGroonga for EN/ZH keywords) in `ap-southeast-1`, Vercel functions pinned to `sin1`, Vitest, Playwright, Sentry, GitHub Actions, Supabase CLI migrations. Package manager is npm.
- **Free tiers:** Vercel Hobby (one cron a day, one region) and Supabase Free (500 MB DB, 1 GB storage, 50 MB per file, no backups).
- **Validation:** all external input is validated with Zod at the boundary. UI uses theme tokens only.
- **Migrations:** one concern each, never edit a merged one, RLS and revoke in the migration that creates the table, regenerate types.

## Workflow

- Every change starts from a GitHub issue in `dczii/HRManagement` (Epic → Story → Task sub-issues on Project 4). A Story has one Spec Kit folder `specs/<NNN-feature>/` and ships as one PR with at least one commit per Task.
- Spec Kit order: specify → clarify → plan → checklist → tasks → analyze → implement. The plan's Constitution Check cites every principle that applies.
- Branches `<type>/<issue>-<slug>` from `main`; Conventional Commits; PR body `Closes #<task>…` then `Closes #<story>`. Agents never merge.
- Verification gate: `npm run lint`, `typecheck`, `test`; plus `build` for app code, `test:e2e` for screens, `test:db` in CI for migrations.
- Project skills in `.claude/skills/` carry area rules; `project-map` indexes every document and says which wins.

## Governance

This constitution and `CLAUDE.md` outrank the PRD where they remove scope and outrank every other document. Amend by editing this file in a PR that also updates `CLAUDE.md`, `AGENTS.md` and affected skills; bump the version, and record any removed scope in `docs/decisions/`. `/speckit-analyze` treats a conflict with a principle as CRITICAL.

**Version**: 1.0.0 | **Ratified**: 2026-10-01 | **Last Amended**: 2026-10-01
