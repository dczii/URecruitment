# Infrastructure plan, env var inventory and free-tier runbook

## Status

**Accepted** · 2026-09-17 · created by [#81](https://github.com/dczii/URecruitment/issues/81)
(story [#24](https://github.com/dczii/URecruitment/issues/24), epic
[#1](https://github.com/dczii/URecruitment/issues/1))

This record maps each environment to its Supabase project and Vercel target, lists **every
environment variable by name** (never by value), and sets out the response to every free-tier limit
the PRD lists. It also covers the recovery plan that stands in for backups.

Later tasks fill in the sections marked **→ filled by**. [#92](https://github.com/dczii/URecruitment/issues/92)
records which variables are actually set where, and
[#93](https://github.com/dczii/URecruitment/issues/93) records the rate limit and the spend-cap
procedure. Add a variable to the inventory **in the same PR that introduces it** (`release-deploy`).

**Agents never act on remote infrastructure.** No deploy, no settings change, no key rotation, and no
migration or seed against a remote project unless the user asks in that session (`release-deploy`).
This plan describes what a person does. The Vercel project and CLI account are identified in
`release-deploy`, and are not repeated here.

**PRD basis:** *Environments & delivery (suggested)* (**proposed** in this repo's vocabulary) and
*Free-tier limits and risks* (the limits are facts, and the responses are **proposed**). Hosting and
plans are **decided**: *"Vercel (functions in sin1) and Supabase (ap-southeast-1), both in Singapore,
on free tiers for the MVP"*.

## Environments

The PRD's shape: *"Every pull request gets a Vercel preview deployment. The main branch deploys to
production."* *"Supabase Free allows 2 active projects: one for development and previews, one for
production."*

| | **Local** | **Preview** | **Production** |
|---|---|---|---|
| **App** | `npm run dev` on a developer machine | Vercel **Preview** deployment, one per PR push | Vercel **Production** deployment |
| **Functions region** | n/a | **`sin1`** | **`sin1`** |
| **Supabase** | **Local stack** (`supabase start`, Docker). Never a remote project for day-to-day work | Supabase **dev** project, `ap-southeast-1` | Supabase **prod** project, `ap-southeast-1` |
| **Vercel environment** | *Development* (only as the source for `vercel env pull`) | *Preview* | *Production* |
| **Deploys when** | Always | Every push to a PR branch | Merge to `main` |
| **Schema comes from** | `supabase/migrations/`, applied by `supabase db reset` | `supabase/migrations/` **as merged to `main`**, pushed to dev by the migrate workflow | `supabase/migrations/`, pushed to prod by the migrate workflow **after manual approval** |
| **Data** | Fictional, from `npm run seed` | Fictional, seeded into dev | Fictional, seeded into prod (MVP) |
| **Who can reach it** | The developer | **Anyone with the URL**, unless the plan offers deployment protection ([#92](https://github.com/dczii/URecruitment/issues/92) checks) | **Anyone with the URL** (no sign-in, accepted for fictional data only) |

**Known limitation: previews and schema changes.** A PR that adds a migration is validated on an
**ephemeral** local Supabase in CI ([#91](https://github.com/dczii/URecruitment/issues/91)). Its Vercel
preview, however, still talks to the **dev** project, whose schema matches `main`. That preview may
break on the new columns until the PR merges and the migration is pushed. This is accepted, because
applying unmerged migrations to the shared dev project would be worse. The PR's e2e run should be
read with that in mind.

**Migration promotion** (`ci-setup`, `release-deploy`; built by the migrate workflow in the release
phase): merge to `main` → `supabase db push` to **dev** → a GitHub environment with **required manual
approval** → `supabase db push` to **prod**. **Never edit a merged migration**, and fix forward.

## Env var inventory

**Names only. No value appears in this file, in `.env.example`, in an issue or in a log.**
`.env.example` at the repo root lists, with blank values, every name a developer sets locally (the
rows marked ✓ under *Local*). The platform-only and CI-only names (`CRON_SECRET`, `SENTRY_AUTH_TOKEN`,
the migrate-workflow secrets) are not in it. [#84](https://github.com/dczii/URecruitment/issues/84)'s
typed env schema is written against this inventory.

**Columns:**

- **Local:** `.env.local`, which is gitignored.
- **Dev, Prev, Prod:** the Vercel *Development*, *Preview* and *Production* environments.
- **CI:** GitHub Actions secrets.
- **Scope:** *server* means read only in server code and never `NEXT_PUBLIC_`; *public* means it is
  bundled into client code.
- **Secret:** whether exposing the value is a security incident.

### Application runtime

| Name | Purpose | Local | Dev | Prev | Prod | CI | Scope | Secret | Introduced by |
|---|---|---|---|---|---|---|---|---|---|
| `SUPABASE_URL` | API URL of the environment's Supabase project (local stack, dev or prod) | ✓ | ✓ (dev) | ✓ (dev) | ✓ (prod) | — | server | no, but not published | [#84](https://github.com/dczii/URecruitment/issues/84), [#88](https://github.com/dczii/URecruitment/issues/88) |
| `SUPABASE_SECRET_KEY` | Server-only key. **It bypasses RLS**, so it never leaves the server | ✓ | ✓ (dev) | ✓ (dev) | ✓ (prod) | ✓ (eval only; `ci-setup` lets only the migrate and eval workflows reach a remote project) | **server** | **yes** | [#84](https://github.com/dczii/URecruitment/issues/84), [#88](https://github.com/dczii/URecruitment/issues/88) |
| `AI_MODEL_PARSE`, `AI_MODEL_MATCH`, `AI_MODEL_GAP`, `AI_MODEL_SEARCH`, `AI_MODEL_JD` | Model id per AI role ([ADR-0003](../decisions/adr-0003-ai-provider.md) C2) | ✓ | ✓ | ✓ | ✓ | ✓ (eval) | server | no | [#84](https://github.com/dczii/URecruitment/issues/84) (names), [#169](https://github.com/dczii/URecruitment/issues/169) (use) |
| `AI_EMBED_MODEL` | Embedding model id (C2, C9) | ✓ | ✓ | ✓ | ✓ | ✓ (eval) | server | no | as above |
| *Provider API key(s)* | **Named after the chosen provider(s), once [DT-1](../decisions/open-questions.md#dt-1--the-ai-provider) is decided.** No name is reserved now | ✓ | ✓ | ✓ | ✓ | ✓ (eval) | **server** | **yes** | the ADR-0004 follow-up |
| `AI_MONTHLY_SPEND_CAP` | App-side monthly AI budget in USD, summed from `ai_runs.cost` | ✓ | ✓ | ✓ | ✓ | ✓ (eval) | server | no | [#175](https://github.com/dczii/URecruitment/issues/175) |
| `MUST_HAVE_CAP` | The score cap for a missing must-have (default 50, **proposed**) | ✓ | ✓ | ✓ | ✓ | ✓ (eval) | server | no | [#148](https://github.com/dczii/URecruitment/issues/148) |
| `SENTRY_DSN` | Server-side Sentry DSN | optional | ✓ | ✓ | ✓ | — | server | no (a DSN is not a secret) | [#86](https://github.com/dczii/URecruitment/issues/86) |
| `NEXT_PUBLIC_SENTRY_DSN` | Client-side Sentry DSN | optional | ✓ | ✓ | ✓ | — | **public** | no | [#86](https://github.com/dczii/URecruitment/issues/86) |
| `SENTRY_AUTH_TOKEN` | Source-map upload at build time, **only if #86 enables it** | — | — | ✓ | ✓ | — | build only | **yes** | [#86](https://github.com/dczii/URecruitment/issues/86) (if used) |
| `CRON_SECRET` | Authorises the daily keep-alive request. Vercel sends it on cron invocations ([keep-alive](#supabase-free-pauses-after-a-week-idle)) | — | — | — | ✓ | — | server | **yes** | [#178](https://github.com/dczii/URecruitment/issues/178) |

**Never `NEXT_PUBLIC_`:** `SUPABASE_SECRET_KEY`, any provider key, `BLOB_READ_WRITE_TOKEN`,
`SEED_BLOB_BASE_URL`, `CRON_SECRET` and `SENTRY_AUTH_TOKEN`. #84's guard enforces this.

**Not used by the app:** the Supabase **publishable** key. With no sign-in, the browser never talks to
Supabase ([ADR-0001](../decisions/adr-0001-architecture.md)). It appears only in the DB test below,
to prove it reads nothing.

### Seed and eval (sample-data store)

| Name | Purpose | Local | Dev | Prev | Prod | CI | Scope | Secret | Introduced by |
|---|---|---|---|---|---|---|---|---|---|
| `BLOB_READ_WRITE_TOKEN` | **Only** for `list()` on the public sample-data store. Never `put`, `copy` or `del`. App runtime never reads it | ✓ (via `vercel env pull`) | auto-added by Vercel | auto-added | auto-added | ✓ (seed/eval) | seed/eval scripts only | **yes** (the token can write) | [#117](https://github.com/dczii/URecruitment/issues/117) |
| `SEED_BLOB_BASE_URL` | The store's public base URL. The seed checks every listed URL against it. **Never committed** | ✓ | optional (so `vercel env pull` keeps it) | — | — | ✓ (seed/eval) | seed/eval scripts only | **treat as secret** (it is what keeps the files obscure) | [#117](https://github.com/dczii/URecruitment/issues/117) |

**`vercel env pull` overwrites `.env.local`.** Back up local-only values first, or keep
`SEED_BLOB_BASE_URL` in the project's *Development* environment so a pull keeps it
(`prd-context` → `references/sample-data.md`). Because Vercel adds `BLOB_READ_WRITE_TOKEN` to every
Vercel environment automatically, [#117](https://github.com/dczii/URecruitment/issues/117)'s check
that `src/` never imports the Blob SDK is what keeps the running app from using it.

### Tests and CI only

| Name | Purpose | Where | Secret | Introduced by |
|---|---|---|---|---|
| `SUPABASE_PUBLISHABLE_KEY` | The **local** stack's publishable key, used by the RLS lock-down test to prove it reads nothing | Local and the CI DB job (read from `supabase status`, not stored) | no (local stack only) | [#113](https://github.com/dczii/URecruitment/issues/113) |
| `PLAYWRIGHT_BASE_URL` | Base URL for e2e runs: the local dev server by default, the preview URL in CI | Local (optional), the CI e2e job | no | [#85](https://github.com/dczii/URecruitment/issues/85), [#90](https://github.com/dczii/URecruitment/issues/90) (may rename) |
| `SUPABASE_ACCESS_TOKEN` | Supabase CLI auth for pushing migrations | CI (migrate workflow) only | **yes** | release phase (`ci-setup`) |
| `SUPABASE_DEV_PROJECT_REF`, `SUPABASE_PROD_PROJECT_REF` | Which remote project the migrate workflow targets | CI (migrate workflow) only | treat as secret | release phase (`ci-setup`) |
| `SUPABASE_DEV_DB_PASSWORD`, `SUPABASE_PROD_DB_PASSWORD` | Database password for `supabase db push` | CI (migrate workflow) only | **yes** | release phase (`ci-setup`) |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | Lets the e2e job reach a protected preview. **Only if** preview protection is turned on | CI (e2e) only | **yes** | [#90](https://github.com/dczii/URecruitment/issues/90) (conditional) |

**Rules for CI secrets** (`ci-setup`): a job that needs a secret checks for it first. If the secret is
missing (a fork, first setup), the job writes a `::notice::` and exits 0. It never echoes a secret.
Only the migrate and eval workflows reach remote Supabase projects. The e2e job reaches the preview
URL.

### Set by the platform (not ours)

`VERCEL_ENV`, `VERCEL_URL` and `VERCEL_REGION` are provided by Vercel. The app may read `VERCEL_ENV` to
tell Preview from Production, and must not rely on anything else about them.

### → filled by #92: what is set where

*[#92](https://github.com/dczii/URecruitment/issues/92) records here, by name, which variables it set
in each Vercel environment, whether preview deployment protection is available on the plan, and the
date.*

### → filled by #93: rate limit and spend cap

*[#93](https://github.com/dczii/URecruitment/issues/93) records here:*

- *the `/api/ai/*` prefix;*
- *whether a firewall rate-limit rule exists on the plan, and its setting;*
- *how the provider-side monthly spend cap is set, and **who** checks it;*
- *what a rate-limited recruiter sees.*

*[#175](https://github.com/dczii/URecruitment/issues/175) adds which rate-limit control is in force
and the value of `AI_MONTHLY_SPEND_CAP`'s default.*

## Free-tier limits and our responses

One row per limit in the PRD's *Free-tier limits and risks* table. The **limit** and its **effect**
are the PRD's. The **response** is the one this project has chosen. Risks are in the
[risk register](../compliance/risk-register.md).

| Limit (PRD) | Effect (PRD) | PRD response | **Our response** | Owner | Risk |
|---|---|---|---|---|---|
| Vercel Hobby is non-commercial, personal use only | Agency work breaks Vercel's terms | Move to Pro before recruiters use the portal for real work | Stay on Hobby for the build, as the PRD decided. Whether recruiter sessions on fictional data already count as "real work" is **open** ([RC-3](../decisions/open-questions.md#rc-3--vercel-hobby-and-commercial-use)); the plan to move to is [OQ-2](../decisions/open-questions.md#oq-2--which-paid-plans-to-move-to). The release-readiness check restates the position before recruiters are invited | [#92](https://github.com/dczii/URecruitment/issues/92), [#179](https://github.com/dczii/URecruitment/issues/179) | R-03 |
| Supabase Free pauses a project after a week idle | The MVP can go offline between review sessions | Use it at least weekly, or restore it from the dashboard | **Production:** an automated keep-alive, below. **Dev:** restored from the dashboard when needed (previews and CI activity usually keep it awake). The restore steps are in the runbook | [#178](https://github.com/dczii/URecruitment/issues/178) | R-05 |
| Supabase Free has no backups | Data loss is possible; acceptable only for fictional data | Re-seed from the repo; add backups before real data | **Recovery = migrations + seed** (below). Backups are [OQ-3](../decisions/open-questions.md#oq-3--how-backups-work-and-how-long-they-are-kept), required before real data | [#177](https://github.com/dczii/URecruitment/issues/177) | R-04 |
| Supabase Free: 500 MB database, 1 GB storage, 50 MB per file | Enough for 200 sample CVs, not for real volume | Upgrade before real data | **File cap enforced in code:** uploads over 50 MB are refused ([#114](https://github.com/dczii/URecruitment/issues/114)). **Usage checked after every seed**: the seed report prints file counts and bytes ([#123](https://github.com/dczii/URecruitment/issues/123)), and the person running it compares database and storage usage in the Supabase dashboard against the caps | [#123](https://github.com/dczii/URecruitment/issues/123), [#177](https://github.com/dczii/URecruitment/issues/177) | — |
| Vercel Hobby: functions in one region, cron once a day | Fine for one Singapore region; no frequent background jobs | Keep delay status in a database view | **Delay status is a view** ([#158](https://github.com/dczii/URecruitment/issues/158)). **Background work uses `after()`** with a retryable runs table ([#150](https://github.com/dczii/URecruitment/issues/150)). **The one daily cron slot is taken by the keep-alive.** Any other scheduled work needs this record changed first | [#158](https://github.com/dczii/URecruitment/issues/158), [#150](https://github.com/dczii/URecruitment/issues/150), [#178](https://github.com/dczii/URecruitment/issues/178) | — |
| Free tiers carry no uptime guarantee | 99.5% can't be assured | Treat it as best effort for the MVP | **Best effort.** Errors surface through Vercel runtime logs and Sentry ([#86](https://github.com/dczii/URecruitment/issues/86)); an outage before a session is handled with the restore and re-seed runbooks. No uptime monitoring service in the MVP | [#86](https://github.com/dczii/URecruitment/issues/86), [#178](https://github.com/dczii/URecruitment/issues/178) | R-06 |
| Some managed job services store run data in the US by default | CV text could leave Singapore | Keep job state and queues in Supabase | **No third-party queue or workflow service.** Job state lives in Supabase tables (`ai_runs`, the re-score runs table), and background work runs in `after()` in `sin1` | [#150](https://github.com/dczii/URecruitment/issues/150), [#169](https://github.com/dczii/URecruitment/issues/169) | R-11 (related) |

### Supabase Free pauses after a week idle

**The approach (proposed here; [#178](https://github.com/dczii/URecruitment/issues/178) builds it and
writes `docs/runbooks/keep-alive.md`):**

- **What runs:** one **Vercel cron job on Production, once a day**, which fits Hobby's limit. It calls
  a small server route that makes one trivial read against the production Supabase project, for
  example one row of `sg_public_holidays`. The route refuses any request without the `CRON_SECRET`
  authorisation header, returns no data, and logs only success or failure.
- **Why daily when a week is the threshold:** a single missed run then still leaves six days of
  margin. It also stays within the free tiers.
- **Dev project:** no cron (Vercel runs cron only on production). The dev project is restored from the
  dashboard if a quiet week pauses it. That affects previews only.
- **Who checks it:** the person running each recruiter session opens the production app the day
  before. #178 names that role, and whoever holds it also looks at the cron's last result in the
  Vercel dashboard.
- **Confirm it works:** after the first quiet week, #178 checks that the project did not pause. Do
  not assume from documentation alone that the read counts as activity.
- **It disappears on a paid plan** ([OQ-2](../decisions/open-questions.md#oq-2--which-paid-plans-to-move-to)).
- **Restore, if it pauses anyway:** restore the project from the Supabase dashboard, wait until it
  reports healthy, then open the production app and run the smoke check. #178 records how long this
  takes.

## Recovery: migrations plus seed

With no backups, **the repository is the backup**. The migrations rebuild the schema, and the seed
rebuilds the fictional data through the real parser (PRD: *"With no backups, the migrations and seed
files are the recovery plan: rebuild the database and re-seed."*). Rebuilding produces the same state
every time, because the seed is idempotent ([#122](https://github.com/dczii/URecruitment/issues/122)).

### The commands

These are the exact commands, as the owning tasks will create them. A command that does not exist
yet is marked with the task that adds it. **Remote steps are run by a person, or by the migrate
workflow, never by an agent unasked.**

**Local**

```bash
supabase start                 # local stack (Docker); from #87
supabase db reset              # drop and re-apply every migration in supabase/migrations/
npm run seed                   # rebuild fictional data through the real parser; script from #117–#123
npm run seed -- --reset        # truncate the seeded tables in dependency order first; flag from #122
```

**Remote (dev or prod)**

```bash
# Schema: the migrate workflow runs this on merge to main (dev), then after manual approval (prod).
supabase link --project-ref "$SUPABASE_PROD_PROJECT_REF"   # a person, once per machine
supabase db push                                           # applies pending migrations

# Data: a person runs the seed with that environment's variables loaded (never committed).
npm run seed -- --reset
```

**Full rebuild of production:**

1. Restore the project if it is paused.
2. `supabase db push`, or reset the database from the Supabase dashboard and push again.
3. `npm run seed -- --reset` with the production environment's variables.
4. Run the smoke check from #177: the dashboard, a job, a candidate and a search all load.
5. Record the elapsed time and AI cost in `docs/runbooks/re-seed.md`.

### What a rebuild costs

- **AI calls,** from the PRD's MVP volume:
  - about **200 CV parsing calls**;
  - about **1,000 scoring calls** (20 jobs × up to 50 candidates);
  - one JD extraction and one gap-check call per sample job;
  - embeddings for every CV and every job version.
- **Money:** the same order of magnitude as one full eval run
  ([ai-eval-plan.md](ai-eval-plan.md#when-it-runs-and-what-it-costs)). It counts against
  `AI_MONTHLY_SPEND_CAP`, so a rebuild near the end of a month can be refused by the cap. That is by
  design. The runbook says to check remaining budget first.
- **Time:** parsing is bounded by the PRD's *"under 30 seconds"* per CV, so a sequential parse of 200
  CVs could take up to about 100 minutes, less with the seed's concurrency.
  [#177](https://github.com/dczii/URecruitment/issues/177) records the **measured** figure after a real
  rebuild. This estimate is replaced, not relied on.
- **Rebuilding does not preserve changes made in the app** (recruiter edits, stage moves, settings).
  That is acceptable for fictional data, and it is one more reason backups are required before real
  data.

### Rollback

- **App:** Vercel instant rollback to the previous production deployment.
- **Database:** fix forward with a new migration. If data is broken, reset and re-seed, since
  everything is fictional.
- Record every incident in the task's `plan.md` Outcome, or in a `bug` issue (`release-deploy`).

## Out of scope

- Creating the Vercel project or setting any variable ([#92](https://github.com/dczii/URecruitment/issues/92)).
- Writing the seed (E03-S04).
- Choosing paid plans ([OQ-2](../decisions/open-questions.md#oq-2--which-paid-plans-to-move-to)).
