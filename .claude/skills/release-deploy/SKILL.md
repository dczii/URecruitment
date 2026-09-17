---
name: release-deploy
description: >
  URecruitment environments and releases: local / preview / production mapping to Supabase dev
  and prod projects, Vercel (sin1) and Supabase (ap-southeast-1) configuration, env var inventory,
  migration promotion, rate-limit and spend-cap setup, re-seed as the recovery plan, free-tier
  limits (Hobby non-commercial, Supabase pause/no backups), rollback. Use for deployment, env var,
  environment, release or runbook work.
---

# Release & deploy

## Environments

| Env | App | Database | Data | Deploys when |
|---|---|---|---|---|
| Local | `npm run dev` | Local Supabase (`supabase start`) | Seeded fictional | Always |
| Preview | Vercel preview per PR | Supabase **dev** project | Seeded fictional | Every push to a PR |
| Production | Vercel production | Supabase **prod** project | Seeded fictional (MVP) | Merge to `main` |

Supabase Free allows **2 active projects**, which is exactly dev and prod.

**Vercel project:** `u-recruitment`, under scope `user-7407`. It also holds the **sample-data Blob store** (public, Singapore), which is the seed source only; see `prd-context` → `references/sample-data.md`.

- **CLI account:** the Vercel CLI on the dev machine must be logged into the account that owns `user-7407`. On 17 Sep 2026 it was logged into a different account (`dzabala`), which can't see the project.
- **Linking:** `vercel link --scope user-7407 --project u-recruitment` creates `.vercel/` (gitignored). Only run it when the user asks.
- **Pulling env:** `vercel env pull` **overwrites `.env.local`**. Back up any local-only values first, or keep them in the project's Development environment.
- **CLI version:** Blob CLI commands (`vercel blob …`) need a newer CLI than 37.x. The seed uses the `@vercel/blob` SDK, so it doesn't depend on the CLI.

## Hard rules for agents

- **Never** deploy to production, change Vercel or Supabase settings, rotate keys, or run migrations or seeds against a remote project **unless the user explicitly asks in this session.** Prepare the commands and the runbook instead.
- **Never** print secret values. Refer to them by name.
- **Keep the region pinned:** Vercel functions in **`sin1`**, Supabase in **`ap-southeast-1`**.

## Env var inventory (names only; keep `.env.example` in sync)

| Name | Where | Notes |
|---|---|---|
| `SUPABASE_URL` | Vercel (all), local | Server use only |
| `SUPABASE_SECRET_KEY` | Vercel (all), local, CI | **Server only.** Bypasses RLS |
| `AI_MODEL_PARSE`, `AI_MODEL_MATCH`, `AI_MODEL_GAP`, `AI_MODEL_SEARCH`, `AI_MODEL_JD`, `AI_EMBED_MODEL` | Vercel, local, CI (eval) | Provider not chosen yet |
| Provider API key(s) | Vercel, local, CI (eval) | Named after the chosen provider(s) |
| `AI_MONTHLY_SPEND_CAP` | Vercel, local | App-side cap (USD). The provider-side cap is also set in the provider console |
| `MUST_HAVE_CAP` | Vercel, local | Default 50 (proposed) |
| `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` | Vercel | The DSN is not a secret |
| `BLOB_READ_WRITE_TOKEN` | Vercel (auto-added when the sample-data Blob store is connected), local via `vercel env pull`, CI (seed/eval) | **Seed/eval only, and only for `list()`.** App runtime code must never use it |
| `SEED_BLOB_BASE_URL` | Local, CI (seed/eval); optionally Vercel *Development* so `vercel env pull` keeps it | Public base URL of the sample-data store. **Never committed.** The seed checks that listed URLs start with it |

Add new variables to this table in the same PR that introduces them.

## Release flow (proposed; `ci-setup` implements it)

1. **PR:** CI runs lint, typecheck, unit, build and migration validation on an ephemeral local Supabase. Vercel builds a preview, and Playwright runs against it.
2. **Merge to `main`:** migrations are pushed to **dev**, then to **prod** through a GitHub environment with **required manual approval**. Vercel deploys production.
3. **Before an MVP release:** `npm run eval` passes for EN and ZH on verified entries. Re-seed prod if the seed or the parser changed.

## Protection and cost controls

- **Rate limiting** on `/api/ai/*`: a Vercel firewall rule, if the current plan offers it. Otherwise use the app-level limiter (see `security-check`), and record which one is in use in this file.
- **Spend cap:** set the provider's monthly limit in its console **and** `AI_MONTHLY_SPEND_CAP` in the app.
- **Preview exposure:** check whether deployment protection is available on the plan. If it isn't, previews stay on the dev project with fictional data.

## Free-tier limits and runbook

| Limit | What to do |
|---|---|
| Vercel Hobby is non-commercial only | Move to Pro **before recruiters use the portal for real work**. This is an open decision; raise it, don't do it |
| Supabase Free pauses after 1 week idle | Use it weekly, or restore it from the Supabase dashboard before a session. Document who does this |
| No backups on Supabase Free | Recovery = `supabase db reset`/push migrations + `npm run seed`. Backups are required before real data (open) |
| 500 MB DB / 1 GB storage / 50 MB per file | Fine for the sample set. Watch the usage after each seed |
| Hobby: cron once a day, one region | Delay status is a DB view; background work uses `after()` |
| No uptime guarantee | 99.5% is best effort in the MVP |

## Rollback

- **App:** Vercel instant rollback to the previous production deployment.
- **Database:** forward-fix with a new migration. Never edit merged migrations. If the data is broken, reset and re-seed; everything is fictional.
- Record every incident in the task's `plan.md` Outcome, or in a `bug` issue.
