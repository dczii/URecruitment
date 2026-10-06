---
name: project-map
description: >
  Atlas of the HRManagement repo: what lives where in src/, supabase/, test/, e2e/, scripts/,
  .github/ and every document under docs/, design/ and analysis/, which code each document
  governs, which document wins when two disagree, and known drift between docs and code. Load
  first, before any spec, plan, review or code change, and whenever you need to find the document
  that owns a decision.
---

# Project map

HRManagement is a recruitment portal for 6–20 recruiters at a Singapore agency (replaces Manatal). MVP on fictional data. Rules are in `CLAUDE.md` and `.specify/memory/constitution.md`. Read those two before anything else.

## Document precedence (highest wins)

1. `.specify/memory/constitution.md` and `CLAUDE.md`: hard rules. Product AI is out of scope even where older docs say otherwise.
2. `docs/decisions/*` (ADRs) and `docs/decisions/open-questions.md`: accepted technical decisions, and the register of undecided items.
3. `docs/URecruitment-PRD.pdf` (17 Sep 2026), condensed in the `prd-context` skill.
4. `docs/plans/*`, `docs/compliance/*`, `docs/security/*`, `docs/ux/*`: standards each area must meet.
5. `specs/<NNN-feature>/` (Spec Kit): the spec, plan and tasks for the feature in hand.
6. `design/tokens.md`, `design/specs/*`: visual contract. `analysis/*`: dated findings, not rules.

If two disagree, follow the higher one and note the conflict in the spec's open questions. Never settle an item that `open-questions.md` lists as open.

## Documents and what they govern

| Path                                         | Holds                                                                       | Governs                                          |
| -------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------ |
| `docs/decisions/adr-0001-architecture.md`    | App, data and (future) AI boundaries                                        | `src/server/**`, RLS, route layout               |
| `docs/decisions/adr-0002-data-model.md`      | 17 tables and their invariants                                              | `supabase/migrations/**`, `src/lib/database.types.ts` |
| `docs/decisions/adr-0003-ai-provider.md`     | **Open.** Provider-agnostic contract; AI not built                          | Nothing in the MVP                               |
| `docs/decisions/open-questions.md`           | Undecided items (OQ-*, RC-*, DT-*) and the decision log                     | Any task marked `needs-decision`                 |
| `docs/plans/delivery-plan.md`                | Phases, critical path, definition of done                                   | Ordering of stories                              |
| `docs/plans/test-strategy.md`                | Test layers contract                                                        | `test/`, `e2e/`, `vitest*.config.ts`, `playwright.config.ts` |
| `docs/plans/infrastructure.md`               | Env mapping, env var inventory, free-tier runbook                           | `vercel.json`, `.github/workflows/**`, `.env.example` |
| `docs/plans/accessibility-standard.md`       | A11y and responsive rules per screen                                        | `src/components/**`, `e2e/**`                    |
| `docs/plans/ai-eval-plan.md`                 | Eval and answer-key format. No `eval/` dir exists                           | Nothing in the MVP                               |
| `docs/compliance/baseline.md`, `risk-register.md` | PDPA, fair employment, engineering record, living risks                | Candidate data, search filters, retention        |
| `docs/security/baseline.md`                  | Approved recruiter access threat model; RLS, signed URLs, headers                | `src/proxy.ts`, `src/lib/security-headers.ts`, storage |
| `docs/ux/flows.md`, `screen-inventory.md`    | Three core recruiter journeys; IA and navigation                            | `src/app/**` routes, `AppNavigation`             |
| `docs/runbooks/sentry-test-error.md`         | How to trigger a test error                                                 | `/sentry-test`, `/api/sentry-test`, Sentry configs |
| `docs/manatal-baseline-harness.md`           | Manatal baseline measurement                                                | Success metrics (post-MVP)                       |
| `docs/backlog/{manifest.json,roadmap/E00–E13.json,preview.md}` | Epic → Story → Task source for GitHub issues             | Issue tree on Project 4                          |
| `specs/001-*` through `specs/044-*`       | Legacy per-issue plans (19–54, 63, 120, 156–164). History, not instructions | Read for context on why code looks as it does    |
| `design/tokens.md`, `design/specs/*.md`      | Token contract and per-screen specs (desktop 1440 px)                       | `src/app/globals.css`, `src/components/features/**` |
| `design/*.pen`                               | Pen.dev files. **Only via the pencil MCP tools; never Read or Grep them**   | Design work only                                 |
| `analysis/00–04*`, `checklists/`, `screenshots/` | Health table, improvement findings, UI modernisation spec and report    | Context for the `ui-modernisation` work          |

## Planning and implementation workflow

Planning and implementation require no Claude review or GitHub issue linkage. Follow user-authorized Spec Kit scope and verification gates. Historical issue references remain context; issue creation is optional and explicitly requested.

## Recruiter authentication

`specs/047-recruiter-email-otp/` owns `/login`, server-only auth/session/approval guards, private `recruiter_access` and `auth_rate_limits` tables and Resend SMTP setup. `docs/decisions/adr-0004-recruiter-auth.md` supersedes historical no-sign-in/no-email assumptions only for recruiter login. Existing typed-name audit and fictional-candidate-data rules remain.

## Current brand feature

`specs/046-brand-theme/` owns the USER logo-based white/red/black palette, light default, readable logo backing and accessible shared interaction states. `analysis/05-white-red-black-theme-plan.md` records palette evidence and screenshots under `analysis/screenshots/brand-theme-*`. Read `design/tokens.md` and the feature spec for current values; earlier neutral/indigo and forced-dark preservation notes are superseded only for colors/default theme.

## Code layout

- `src/app/`: routes `/`, `/dashboard`, `/jobs`, `/jobs/new`, `/jobs/[id]`, `/candidates/[id]`, `/search`, `/placements`, `/settings` (stub), `/sentry-test`, `/api/sentry-test`. Each route keeps its Server Actions in a sibling `actions.ts`.
- `src/server/`: the only place that touches Supabase or Storage. Every file starts `import "server-only"`. Folders: `cv/`, `dashboard/`, `gap-check/`, `jobs/`, `pipeline/`, `placements/`, `search/`, plus `db.ts`, `env.ts`, `storage.ts`, `index.ts` barrel.
- `src/lib/`: pure shared logic (`working-days`, `stage-limits`, `stage-advance`, `stages`, `recruiter-name`, `env`, `security-headers`, `sentry-*`) and generated `database.types.ts`. Logic here is unit-tested next to the file.
- `src/components/`: `ui/` (shadcn on @base-ui/react), `patterns/` (AppShell, AppNavigation, DelayStatusBadge, TypedNameDialog, states), `features/<area>/`.
- `src/proxy.ts`: per-request CSP nonce (Next 16 proxy, not middleware).
- `supabase/migrations/`: 18 migrations from `20260918000001_clients_jobs` to `…180000_search_candidates_keyword`. `supabase/tests/*.db.test.ts` for RLS, search, storage, working days. `migrations.test.ts` enforces RLS + revoke on every created table.
- `scripts/seed/`: the only code that imports `@vercel/blob` (enforced by `no-blob-in-src.test.ts`). `scripts/db-types.sh`, `check-client-bundle.mjs`.
- `test/`: setup, stubs, fixtures (fictional EN/ZH snippets). `e2e/`: Playwright specs, `desktop` + `phone` projects.
- `.github/workflows/`: `pr-checks`, `db`, `e2e`, `migrate`, `seed`. `infra/vercel/ai-rate-limit.rule.json`: rule for `/api/ai/*`, a route that does not exist.

## Commands

`npm run dev | lint | typecheck | test | test:db | test:e2e | build | seed | db:types | db:types:check`. There is no `eval` script. `build` also runs `scripts/check-client-bundle.mjs`. Docker is not available on this machine: run `test:db` in CI.

## Known drift (verify, don't trust)

- Residual AI schema: migrations still create `vector`, `embeddings`, `match_scores`, `ai_runs`, `rescore_runs`. Do not wire code to them. Dropping them is an open ADR-0002 question.
- `docs/decisions/README.md` links `docs/HRManagement-PRD.pdf`; the file is `docs/URecruitment-PRD.pdf`.
- `design/specs/*` are desktop-only and cite `design/screens/*.pen`, which do not exist. `design/tokens.md` says tokens now follow `src/app/globals.css`, not the `.pen` file. Phone width is still required by the constitution.
- `README.md` opens with "AI-assisted"; the product has no AI.
- `/settings` is a placeholder. Settings log writes exist in the schema only.
- Legacy plans in `specs/` and `docs/backlog/*` describe AI stories (46–51, 63). They are history.

## Old skill names in documents

Many documents under `docs/` cite skills that were replaced on 2026-10-01. Read the citation as the new skill:

| Cited | Read as |
| --- | --- |
| `release-deploy`, `ci-setup` | `release-ci` |
| `security-check`, `compliance-review` | `security-compliance` (AI-specific parts of `compliance-review` no longer apply) |
| `ui-design` | `ui-build` (pen.dev section) |
| `urec-orchestrator`, `/task`, `/backlog`, `backlog-builder` | Spec Kit flow in `speckit-workflow`; backlog source stays in `docs/backlog/` |
| `pr-review` | `/review` command |
| `ai-pipeline`, `ai-eval`, `ai-prompts` | Removed. AI is out of scope; those sections are history |

## How to use this skill

1. Find the owning document in the table, read it fully, then read the code it governs.
2. Cite documents by path in specs and PRs. Don't paraphrase a rule from memory.
3. When you find new drift, add it here in the same change.

## Local technical demo

`specs/049-live-technical-demo/` owns the capped Singapore-calendar placement countdown and local-only 15-minute demo. `docs/engineering/live-demo/script.md` is the presenter script; screenshots and provenance are under its `screenshots/` directory. `scripts/demo/` starts the fictional provider/app, resets fixtures, captures actual browser screenshots and generates consistency evidence. These tools do not prove SQL/RLS or remote service behaviour and are not production routes.
