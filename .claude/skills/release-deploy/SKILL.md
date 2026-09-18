---
name: release-deploy
description: >
  URecruitment environments and releases: local / preview / production mapping to the one Supabase
  project they share, Vercel (sin1) and Supabase (ap-southeast-1) configuration, env var inventory,
  migration promotion, rate-limit and spend-cap setup, re-seed as the recovery plan, free-tier
  limits (Hobby non-commercial, Supabase pause/no backups), rollback. Use for deployment, env var,
  environment, release or runbook work.
---

# Release & deploy

## Environments

| Env | App | Database | Data | Deploys when |
|---|---|---|---|---|
| Local | `npm run dev` | Local Supabase (`supabase start`) | Seeded fictional | Always |
| Preview | Vercel preview per PR | The **one** Supabase project, shared with Production | Seeded fictional, the same rows as Production | Every push to a PR |
| Production | Vercel production | The **one** Supabase project | Seeded fictional (MVP) | Merge to `main` |

**One project, not dev + prod** (the owner's decision, 2026-09-18, #193; the PRD's two projects are only proposed). A preview runs unmerged code against Production's data, and a migration or seed has nowhere to rehearse except the local stack. Treat every remote `db push` or seed as a production change. The real-data go/no-go revisits this (`docs/plans/infrastructure.md` → *One Supabase project for Preview and Production*).

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
| `SUPABASE_URL` | Vercel Preview + Production (**not** Development), local | Server use only |
| `SUPABASE_SECRET_KEY` | Vercel Preview + Production (**not** Development, so `vercel env pull` never copies it to a laptop), local, CI | **Server only.** Bypasses RLS |
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

- **Rate limiting** on `/api/ai/*`: **the Vercel firewall rule is the control in force** (checked by #93, 2026-09-18).
  - Hobby offers **one** rate-limit rule per project: fixed window, 10 s–10 min, keyed by IP or JA4, 1,000,000 allowed requests included.
  - The rule is committed as `infra/vercel/ai-rate-limit.rule.json`: 60 requests per 60 s per IP, default 429.
  - A person applies it with `vercel firewall rules add --json …` then `vercel firewall publish` (runbook: `docs/plans/infrastructure.md` → *Rate limit and spend cap (#93)*). Agents never publish it unasked.
  - #175 may add the app-level limiter as a second layer.
- **Spend cap:** set the provider's monthly limit in its console **and** `AI_MONTHLY_SPEND_CAP` in the app.
  - **Owner:** the dev lead (repository owner).
  - The person running each recruiter session checks month-to-date spend the day before.
- **Preview exposure:** Vercel Authentication protects previews (observed 2026-09-18; available on Hobby). Previews share the one Supabase project with Production, and it holds fictional data only.

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
