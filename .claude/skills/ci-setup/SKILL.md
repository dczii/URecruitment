---
name: ci-setup
description: >
  GitHub Actions for URecruitment: PR checks (lint, typecheck, unit, build), migration validation
  on ephemeral local Supabase, DB integration tests, Playwright against Vercel previews at desktop
  and phone width, path-filtered AI eval with secret gating, and migration promotion to dev/prod
  with manual approval. Covers least-privilege permissions, caching, concurrency and job
  summaries. Use when creating or changing anything under .github/workflows or CI scripts.
---

# CI setup

## Workflows (proposed; confirm in E01-S03)

| File | Trigger | Jobs |
|---|---|---|
| `ci.yml` | `pull_request`, `push: main` | `checks`: `npm ci` → lint → typecheck → `npm test` → build |
| `db.yml` | PRs touching `supabase/**`, `src/server/db/**` | `supabase start` → `supabase db reset` → `npm run test:db` → check that generated types are up to date |
| `e2e.yml` | `deployment_status` (Vercel preview/production success) | Playwright `desktop` + `phone` against `deployment_status.target_url` |
| `eval.yml` | PRs touching `src/server/ai/**`, `eval/**`, parser/matcher services; `workflow_dispatch` | `npm run eval` (skipped with a notice when secrets are missing) |
| `migrate.yml` | `push: main` touching `supabase/migrations/**` | `supabase db push` to dev → (environment `production`, manual approval) → prod |

## Rules

- **Permissions:**
  - Top-level `permissions: contents: read`.
  - Grant more per job only when needed (e.g. `pull-requests: write` to post the eval summary as a comment, and only if asked).
- **Concurrency:** `concurrency: { group: ${{ github.workflow }}-${{ github.ref }}, cancel-in-progress: true }` on PR workflows.
- **Node:** use the version pinned by the scaffold (`.nvmrc` or `engines`). `actions/setup-node` with `cache: npm`. Always `npm ci`.
- **Actions:** pin third-party actions to a full commit SHA (with a version comment). First-party `actions/*` may use major tags.
- **Secrets:**
  - Reference them by name only.
  - Jobs needing secrets check for them first. If a secret is missing (forks, first setup), write a `::notice::` and exit 0. **Never** fail silently, and never echo secrets.
  - Remote Supabase projects are reached only by `migrate.yml` and `eval.yml`.
- **Artifacts:** upload the Playwright report on failure, and always upload the eval JSON report. Write a short Markdown summary to `$GITHUB_STEP_SUMMARY`.
- **Required checks:** once `ci.yml` is green on `main`, recommend that the user enable branch protection with `checks` (+ `db` and `e2e` when stable). **Agents don't change repo settings.**
- **Speed:** keep `ci.yml` under ~5 minutes. Split jobs when that helps. Avoid Docker in `ci.yml`, since it lives in `db.yml`.

## Secrets inventory (GitHub Actions)

| Secret | Used by |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | `migrate.yml` |
| `SUPABASE_DEV_PROJECT_REF`, `SUPABASE_PROD_PROJECT_REF` | `migrate.yml` |
| `SUPABASE_DEV_DB_PASSWORD`, `SUPABASE_PROD_DB_PASSWORD` | `migrate.yml` |
| AI provider key(s), `AI_*` model vars | `eval.yml` |
| `BLOB_READ_WRITE_TOKEN` (listing the sample-data store only), `SEED_BLOB_BASE_URL` | `eval.yml` (and any seed job) |
| `VERCEL_AUTOMATION_BYPASS_SECRET` (only if preview protection is on) | `e2e.yml` |

Keep this table in sync with the workflows.

## Verifying a workflow change

- **Lint the YAML** with `actionlint`, if it's installed. Otherwise review it carefully and note that in the PR.
- **Test locally** with `act` where practical. Otherwise open the PR and read the run: `gh run list --branch <branch>`, `gh run view <id> --log-failed`.
- **Paste the run link** into the PR's verification section.
