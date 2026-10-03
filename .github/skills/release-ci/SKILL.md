---
name: release-ci
description: >
  HRManagement environments, CI and releases: local/preview/production mapping onto the one
  Supabase project, Vercel (sin1) and Supabase (ap-southeast-1) config, env var inventory,
  GitHub Actions workflows (pr-checks, db, e2e, migrate, seed), free-tier limits, rollback and
  re-seed recovery. Use for deployment, env var, workflow, environment or release work.
---

# Release & CI

Read `docs/plans/infrastructure.md` (env mapping, env inventory, free-tier runbook), `docs/plans/delivery-plan.md`, `docs/runbooks/`, `vercel.json`, and the workflows in `.github/workflows/`.

## Environments

| Env | App | Database | Data |
| --- | --- | --- | --- |
| Local | `npm run dev` | Local Supabase (Docker; not available here) | Seeded fictional |
| Preview | Vercel preview per PR | The **one** Supabase project, shared with Production | Same rows as Production |
| Production | Vercel `u-recruitment` (functions `sin1`) | Same project, `ap-southeast-1` | Fictional (MVP) |

One Supabase project, by the owner's decision (2026-09-18). A preview runs unmerged code against Production data, so every remote `db push` or seed is a production change.

## Hard rules for agents

- Never deploy, change Vercel/Supabase settings, rotate keys, or run migrations/seeds against a remote project unless the user explicitly asks in this session. Prepare commands and a runbook instead.
- Never print secret values. Keep region pins (`sin1`, `ap-southeast-1`).
- `vercel env pull` overwrites `.env.local`; back up first. Only run `vercel link` when asked.

## Env vars (names only; keep `.env.example` in sync, add new ones in the PR that introduces them)

`SUPABASE_URL`, `SUPABASE_SECRET_KEY` (server only, Preview + Production + CI, not Development), `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `BLOB_READ_WRITE_TOKEN` and `SEED_BLOB_BASE_URL` (seed only; Blob list token never used by app runtime). `AI_*` variables in older docs are not used.

## CI (`.github/workflows/`)

| Workflow | Runs |
| --- | --- |
| `pr-checks.yml` | `npm ci`, lint, typecheck, unit tests, build |
| `db.yml` | `supabase start`/`db reset`, `db:types:check`, `npm run test:db` |
| `e2e.yml` | Playwright (chromium), desktop + phone |
| `migrate.yml` | On push to `main` and manual dispatch: `supabase link`, `db push --linked` |
| `seed.yml` | Manual dispatch: `npm run seed` |

Rules for editing workflows: least-privilege `permissions`, `concurrency` groups, cached npm, secrets only from GitHub secrets and skipped gracefully when absent, job summaries, no secrets echoed. Required checks before merge: lint, typecheck, unit, build, db, e2e. `test:db` can only be verified here through CI.

## Free tiers

Vercel Hobby: one region, cron once a day, **non-commercial**. Move to Pro before real work. Supabase Free: 500 MB DB, 1 GB storage, 50 MB/file, pauses after a week idle, **no backups**. Recovery plan = re-seed from the repo. `infra/vercel/ai-rate-limit.rule.json` targets `/api/ai/*`, which does not exist; leave it unless an AI route returns.

## Release checklist

1. PR green on all required checks; migrations validated by `db.yml`.
2. Merge to `main` runs `migrate.yml`; Vercel deploys production.
3. If the seed or schema changed, re-run `seed.yml` (user-approved).
4. Update `docs/plans/infrastructure.md` and `project-map` for any new env var, workflow or service.
