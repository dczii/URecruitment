# Spec — #24 Infrastructure and delivery order are planned

| | |
|---|---|
| Issue | https://github.com/dczii/URecruitment/issues/24 (Story) |
| Tasks | #81 (E00-S06-T01), #82 (E00-S06-T02) |
| Parent | Story #24 → Epic #1 "Decisions, architecture & delivery plan" |
| Milestone | MVP |
| Branch | `docs/24-infrastructure-delivery-plan` (stacked on `docs/23-quality-test-eval-a11y`) |
| Created | 2026-09-17 |
| Status | In review <!-- Planned → In progress → In review --> |

## Problem

Three questions have no written answer yet:

- which Supabase project and Vercel environment each stage of the pipeline uses;
- which environment variables exist and which of them are secrets;
- what the team does about each free-tier limit.

Without those answers, the env schema (#84), the Vercel setup (#92) and the seed (#117) will each
invent their own list. The MVP could then pause between review sessions with nobody knowing whose
job it is to wake it. The phase order also lives only on the board: nothing says which work is on the
critical path to mid-December, where parallel tracks must wait for each other, or what "done" means
for a task.

## PRD references

| PRD section | Item | Status |
|---|---|---|
| Environments & delivery (suggested) | One repo; a preview per PR; `main` → production; Supabase Free allows 2 projects (dev+preview, prod); CI applies migrations; migrations + seed are the recovery plan | **proposed** |
| Free-tier limits and risks | Seven rows: Hobby non-commercial; Supabase pause; no backups; 500 MB / 1 GB / 50 MB; one region + daily cron; no uptime guarantee; US-hosted job services | limits are facts; responses **proposed** |
| Non-functional → Hosting, Backups, Uptime | `sin1` + `ap-southeast-1` on free tiers; no backups in the MVP; 99.5% best effort | **decided** / **decided** / **at risk** |
| Overview → MVP target | Live within 3 months, by mid-December 2026 | **decided** |
| Release plan | MVP → recruiter feedback sessions → go/no-go → real-data release | **decided** |
| Security (suggested) → 1, 5 | Secret key only in Vercel env; rate limit + spend cap | **proposed** (C1 is a `CLAUDE.md` hard rule) |
| AI governance → 6 | The dev team picks the provider | **decided** (choice **open**) |

## Scope

**In scope**

- `docs/plans/infrastructure.md` (#81):
  - the environment map (local / preview / production → Supabase project, Vercel target, migration source, who can reach it);
  - the env var inventory (names, environments, server/public, secret status, owning task) with **no values**;
  - the response to every PRD free-tier limit, including a concrete keep-alive approach (runbook by #178);
  - the recovery procedure, with the exact commands and a cost and time note;
  - rollback;
  - placeholders for #92 and #93.
- `.env.example` (#81): every locally set variable name, with a blank value.
- `docs/plans/delivery-plan.md` (#82):
  - phases P0–P12, each with its epics, what it delivers, and its entry and exit conditions;
  - the critical path, both as planned and as the task dependencies show it;
  - parallel tracks and synchronisation points;
  - the shared definition of done, quoting the issue template.

**Out of scope**

- Creating the Vercel project or setting any variable (#92).
- Writing the seed (E03-S04).
- Choosing paid plans (OQ-2).
- Re-planning the backlog.
- Estimates and assignments.
- Running anything against a remote project.
- Editing issue bodies. The missing dependencies the plan finds are listed as follow-ups.

## Acceptance criteria

- [x] **AC1** — Given three environments, when I read `docs/plans/infrastructure.md`, then each one names its Supabase project, its Vercel target and its env vars by name only. _Proved by:_ `V4`.
- [x] **AC2** — Given the free tiers, when I read the plan, then each limit from the PRD table appears with its effect and the response chosen. _Proved by:_ `V5`.
- [x] **AC3** — Given the phase structure, when I read `docs/plans/delivery-plan.md`, then the critical path, the parallel tracks and the definition of done are explicit. _Proved by:_ `V6`.
- [x] **AC4** (#81) — Every env var the MVP needs is listed by name with its environment and secret status, and no value appears anywhere. _Proved by:_ `V4`, `V7`.
- [x] **AC5** (#81) — The recovery procedure names the exact commands the re-seed will use once they exist. _Proved by:_ `V5`.
- [x] **AC6** (#82) — Every phase P0–P12 (every value of Project 4's *Phase* field) appears with its epics and exit condition. _Proved by:_ `V6`.
- [x] **AC7** (#82) — The shared definition of done matches the "Definition of done" section every task issue carries. _Proved by:_ `V6` (the quoted block is byte-identical to the issue template text).
- [x] **AC8** — Only `docs/**` and `.env.example` change, links and anchors resolve, every issue exists, and no secret or Blob URL appears. _Proved by:_ `V1`, `V2`, `V3`, `V7`, `V8`.

## Guardrails that apply

- [ ] AI only suggests — n/a.
- [ ] No email — n/a.
- [x] **Server-only data access; secret key never reaches the browser** — the inventory marks every secret as server-only; "Never `NEXT_PUBLIC_`" list; the publishable key is not used by the app.
- [x] **RLS / private Storage** — the publishable key appears only in the lock-down test.
- [ ] AI output — n/a.
- [ ] Protected attributes — n/a.
- [x] **UTC / SGT** — the spend-cap month; the dates in the runbook.
- [ ] Typed name — n/a.
- [ ] Phone width — n/a.
- [x] **Fictional data only; no secrets or Blob URLs committed** — `.env.example` holds names only; `SEED_BLOB_BASE_URL` is treated as secret; `V7` proves no value is committed.
- [x] **Free-tier limits respected** — every PRD limit has a response; the keep-alive runs as a daily cron job; delay status stays a view.

## UX / design

n/a.

## Data / API changes

None in this PR. The plan **proposes** a keep-alive route, a cron entry and `CRON_SECRET` (owner to be settled: #178 widened or a new task).

## Assumptions

- **A1 — One PR for the story (user instruction), stacked on #23.** There is one commit per task. #81 depends on #76 (in #186), and #82 depends on #81.
- **A2 — Claude writes it.** Both issues carry `Executor hint: claude (judgment-heavy)`.
- **A3 — `.env.example` is added now,** because #81 lists it as an affected file. #84 (typed env) may add names and must keep the file names-only.
- **A4 — The keep-alive approach is proposed here:** a daily Vercel cron on Production calling a secret-guarded route that makes one trivial read. #178 writes the runbook; building the route and cron entry needs #178 widened or a new task (review F5). Daily fits Hobby's limit and leaves margin under the one-week threshold. The dev project is restored on demand, because Vercel runs cron only on production. Whether the read counts as activity is to be confirmed by #178, not assumed.
- **A5 — The keep-alive uses a daily cron job** (Hobby runs each job at most once a day). Any other scheduled job needs this record changed first.
- **A6 — The inventory adds names the skills don't list.** They are `CRON_SECRET` (#178), `SENTRY_AUTH_TOKEN` (only if #86 enables source maps), `SUPABASE_PUBLISHABLE_KEY` (local lock-down test only) and `PLAYWRIGHT_BASE_URL` (#85/#90, which may rename it). Each is marked with its owning task.
- **A7 — No provider key name is reserved.** It is named when DT-1 is decided.
- **A8 — The critical path is recorded twice:** as the issue states it, and as the task dependencies show it. The dependency graph's longest chain, 19 tasks, runs through the seed, the answer key and the eval, and puts DT-1 and recruiter verification time on the critical path. Recording only the planned shape would hide the real long pole.
- **A9 — Missing dependencies are reported, not fixed.** #120's list omits #142. Fixing issue bodies and the roadmap JSON is a follow-up.
- **A10 — The rebuild time is an upper-bound estimate** (200 × 30 s), marked to be replaced by #177's measured figure.
- **A11 — The Vercel project and account identifiers are not repeated here.** They live in `release-deploy`.
- **A12 — No test runner** (as #19 A8).

## Open questions

- **OQ-2 / OQ-3 / RC-3** (paid plans, backups, Hobby): referenced, not settled.
- **DT-1** (provider): the delivery plan records it as on the critical path, which makes the case for deciding it early without deciding it.
