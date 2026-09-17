# Delivery plan: phases, critical path and definition of done

## Status

**Accepted** · 2026-09-17 · created by [#82](https://github.com/dczii/URecruitment/issues/82)
(story [#24](https://github.com/dczii/URecruitment/issues/24), epic
[#1](https://github.com/dczii/URecruitment/issues/1))

This record describes the phase structure the backlog on
[Project 4](https://github.com/users/dczii/projects/4) is already built on: what each phase delivers,
which work is on the **critical path** to the MVP deadline, which tracks can run **in parallel**, where
those tracks must **synchronise**, and the **definition of done** every task shares.

It **records** the plan and does not re-plan the backlog. The phases and their epics come from the
board's *Phase* field and `docs/backlog/roadmap/*.json`. The dependencies come from each task's
*Depends on* list. It sets no dates and assigns no people.

**The deadline** (PRD, **decided**): *"Live within 3 months, by mid-December 2026"*. The MVP then
*"Ends with recruiter feedback sessions and a go/no-go decision"*.

## Phases

The board's *Phase* field has thirteen values, **P0–P12**, and every one of them appears below.

| Phase | Epic(s) | Delivers | Entry condition | Exit condition (from the epic) |
|---|---|---|---|---|
| **P0 Decisions & plan** | [#1](https://github.com/dczii/URecruitment/issues/1) E00 | The written records the build follows: ADRs, the open-questions register, UX structure, security and compliance baselines, the test, eval and accessibility standards, and the infrastructure and delivery plans | none | Every record in `docs/decisions/` and `docs/plans/` is merged and linked from the epic; each PRD open question has a `needs-decision` issue or a written deferral; no record settles an open question; P1 can start with no undocumented assumption |
| **P1 Foundation & CI** | [#2](https://github.com/dczii/URecruitment/issues/2) E01 | The scaffold, typed env, Vitest and Playwright, Sentry, Supabase CLI and a server-only client, PR checks, DB and e2e CI, Vercel config, and AI route rate limits | ADR-0001 (#71) merged; for the env schema, the infrastructure plan (#81); for the test tooling, the test strategy (#78) | `npm run dev`, `lint`, `typecheck`, `test` and `build` work from a clean clone; CI runs checks on every PR and Playwright against the preview; a PR produces a `sin1` preview; Sentry receives server and client test errors with no candidate data |
| **P2 Design system** | [#3](https://github.com/dczii/URecruitment/issues/3) E02 | Tokens, the Tailwind and shadcn theme, the app shell, shared patterns, every screen design, and the accessibility assertions | The screen inventory (#75) and accessibility standard (#80); for the build steps, the scaffold (#83) | Tokens and their mirror drive the theme; every MVP screen has desktop and phone frames plus a spec; the shared patterns are built and unit-tested; the accessibility standard passes on the shell and patterns |
| **P3 Data & seed** | [#4](https://github.com/dczii/URecruitment/issues/4) E03 | **Early:** the schema with RLS locked down, private storage, SG working days. **Late:** the seed | **Early:** ADR-0002 (#72) and the Supabase init (#87). **Late:** the parser, JD extraction, scoring and the delay view (see *Two halves* below) | RLS is on for every table (proven); CV files open only through signed URLs; SQL and TypeScript agree on working days; `npm run seed` rebuilds from scratch and is safe to re-run |
| **P4 CV processing** | [#5](https://github.com/dczii/URecruitment/issues/5) E04 | Text extraction, the parser with evidence, the Chinese PDF fallback, the review queue, recruiter overrides, the profile screen | Storage (#114); `runAi()` (#169); ADR-0003 (#73) | EN and ZH parse to the schema with source text; scanned files are rejected clearly; total years is computed; overrides survive re-parse; parse time is recorded and under 30 s |
| **P5 Jobs & gap check** | [#6](https://github.com/dczii/URecruitment/issues/6) E05 | The job form with versions, JD upload and pre-fill, missing-field rules, AI gap flags, resolve and dismiss, the banner | The job tables (#109); the job-form design (#102) and shared patterns (#99); `runAi()` (#169) | Jobs are created, edited and versioned, with the reason rule; a JD pre-fills the form for confirmation; every missing-field rule raises a flag with a question; the banner counts open flags and matching still runs |
| **P6 Matching** | [#7](https://github.com/dczii/URecruitment/issues/7) E06 | Embeddings, retrieval, fair scoring with the cap, version-keyed scores, `after()` re-scoring, the ranked list | The embeddings table (#111, **blocked on DT-1**); job versions (#136); `runAi()` (#169); the stage model (#156) for add-to-pipeline | Redaction is proven; the cap is proven at its boundary; scores carry job and model versions and stale ones are hidden; recruiters sort, filter and add to the pipeline themselves |
| **P7 Talent search** | [#8](https://github.com/dczii/URecruitment/issues/8) E07 | The search-query prompt, hybrid SQL, the search screen, job-scoped search | Embeddings (#145); match scores (#149) for job-scoped search | A plain-language query returns ranked results in under 3 s; all five filters work, including a ZH keyword; job-scoped search ranks by score; protected terms never become criteria |
| **P8 Pipeline & placements** | [#9](https://github.com/dczii/URecruitment/issues/9) E08, [#10](https://github.com/dczii/URecruitment/issues/10) E09 | The stage model with audit, limit resolution, the delay view, the board, the dashboard, placements and the guarantee | The pipeline tables (#112); working days (#116); the board, dashboard and placements designs | Every move is audited with a typed name; delay status matches hand-worked examples; the dashboard orders by days over with four filters; the board and dashboard work at 390 px; placements have a start date, a guarantee end and a flag five working days before the end |
| **P9 Settings & audit** | [#11](https://github.com/dczii/URecruitment/issues/11) E10 | Limits at three levels, holidays, the change log, typed-name capture | Limit resolution (#157); the settings design (#105); the shared patterns (#99) | Limits at all levels affect running clocks; holidays change counts immediately; every change is logged with a name and SGT time; nothing saves without a name |
| **P10 AI governance** | [#12](https://github.com/dczii/URecruitment/issues/12) E11 | **Early:** `runAi()`. **Late:** the answer key, verification, `npm run eval` and its CI, the spend cap, the fairness review | **Early:** the pipeline and `ai_runs` tables (#112) and ADR-0003. **Late:** the seeded sample files (#120) and the scoring service (#148) | Every AI service writes `ai_runs`; the answer key is recruiter-verified; the eval reports EN and ZH separately and fails below the bar; the spend cap and rate limits are in place; the fairness review is recorded |
| **P11 Launch & go/no-go** | [#13](https://github.com/dczii/URecruitment/issues/13) E12 | The production deploy and re-seed runbook, keep-alive, release readiness, grading sessions, the go/no-go pack | The idempotent seed (#122); the dashboard (#161); the eval (#173); the fairness review (#176); the accessibility scan (#108) | Production is deployed, seeded and rebuilt once by the runbook; the eval passes for EN and ZH, or the shortfall is documented; grading sessions are held and feedback captured; the go/no-go decision is recorded with its date |
| **P12 Real-data release** | [#14](https://github.com/dczii/URecruitment/issues/14)–[#18](https://github.com/dczii/URecruitment/issues/18) E13–E17 | Intake, consent and retention, access protection, duplicates, paid plans and backups | **A "go" decision** (#181), plus answers to [OQ-1](../decisions/open-questions.md#oq-1--what-must-be-in-place-before-real-cvs-are-loaded)–[OQ-5](../decisions/open-questions.md#oq-5--the-real-data-release-date) as each epic needs | These are stubs, planned only after go/no-go. Access protection (#16) comes first |

### Two phases have two halves

The phase numbers suggest a straight line, but two phases do not finish in order:

- **P3 Data & seed.** The **schema** (#109–#116) is among the earliest code work. The **seed** steps
  that parse, score and back-date (#120–#123) are among the **latest**, because they run the real
  parser, JD extraction, gap check and scorer (#127, #139, #142, #148) and the delay view (#158).
  #120's *Depends on* list omits #142, although the step runs the gap check. That is a missing
  dependency to add to the issue and the roadmap.
  Treat "P3 done" as two milestones: **schema ready** and **seed ready**.
- **P10 AI governance.** **`runAi()`** (#169) is needed by every prompt task in P4–P7, so it is
  built **early**, right after the schema. The **answer key and eval** (#170–#174) come **last**,
  because the key is drafted from the seeded files.

## Critical path

**The shape the backlog was planned around** (#82):
*foundation → data → CV processing → matching → pipeline → launch*, with the **design-system** and
**AI-governance** tracks running in parallel.

**What the task dependencies actually say.** The longest chain of *Depends on* links in the backlog,
19 tasks, runs through the seed and the eval rather than through the pipeline:

```
P0  #71  ADR-0001
P1  #83  scaffold ─ #87  Supabase CLI
P3  #109 → #110 → #111 → #112 → #113  schema + RLS proof      (#111 blocked on DT-1)
P3  #114 private storage
P4  #124 extraction → #125 rejection reasons → #127 CV parser
P3  #120 seed: upload, parse, embed, jobs, gap check, score  (also needs #139, #148; and #142, not yet listed)
P10 #170 CV answer key → #171 job top-5 key → #172 verification → #173 npm run eval
P11 #179 release readiness → #181 go/no-go
```

So the planned shape is right about the order of the **build**, but the **long pole to the go/no-go**
is the evidence chain: **seed → answer key → human verification → eval**. Three things follow.

1. **The AI provider decision is on the critical path.** #111 (the `embeddings` table) needs the vector
   dimension, which only the chosen embedding model fixes ([ADR-0003](../decisions/adr-0003-ai-provider.md)
   D5; [DT-1](../decisions/open-questions.md#dt-1--the-ai-provider)). #145 (embeddings) and
   everything in matching and search wait on it too. **Unblocking DT-1 early is the single biggest
   schedule lever.** Until then, #111 can land its `match_scores` half, and the rest of the schema can
   proceed.
2. **Recruiter verification time is on the critical path.** #172 needs recruiters to check the key
   before the bar means anything. Book their time before the eval is ready.
3. **The seed is a convergence point.** #120 waits on the parser (P4), JD extraction and gap check (P5)
   and scoring (P6). A slip in any of them delays the seed and everything after it.

**On the planned path but not the longest chain:** pipeline and delays (P8) feed the dashboard (#161),
which launch needs (#177), and the back-dated seed (#121), which needs the delay view (#158) and the
default limits ([RC-1](../decisions/open-questions.md#rc-1--default-stage-limits)).

## Parallel tracks

Once the scaffold (#83) and the schema (#109–#112) exist, the backlog splits into tracks that touch
different files and can run at the same time.

| Track | Phases | Starts when | Runs alongside |
|---|---|---|---|
| **A. Platform** | P1 | P0 records merged | Design work (C) |
| **B. Data** | P3 (schema, storage, working days) | #87 | Design (C); `runAi()` (E) |
| **C. Design system** | P2 designs (#94–#106, Claude with pen.dev) then builds (#95, #97, #99, #107, #108) | Screen inventory (#75) and accessibility standard (#80); the builds need #83 | Everything. **Designs are the input to every screen build** |
| **D. Product services** | P4 parsing, P5 jobs and gap, P6 matching, P7 search | Schema + `runAi()`; for P6 and P7, DT-1 | Each other, in part: P5 does not need P4; P7 needs P6's embeddings |
| **E. AI governance** | P10 (`runAi()` early; spend cap; eval late) | #112 | D (it is D's dependency) |
| **F. Pipeline and settings** | P8, P9 | #112 and #116 | D. It needs no AI work except the ranked list's add-to-pipeline (#151 needs #156) |
| **G. Launch** | P11 | The convergence in the next section | — |

## Synchronisation points

These are the places where parallel tracks must meet. **A task at a sync point does not start until
its inputs have merged.**

| # | Sync point | Needs | Before |
|---|---|---|---|
| S1 | **Design before build** | The screen's design and spec (`design/specs/<screen>.md`) merged. `ui-build`: *"If no spec exists for the screen, stop and report it"* | Every screen build: #97 ← #96; #99 ← #98; #161 ← #100; #137 ← #101; #135 ← #102; #134 and #154 ← #103; #160 ← #104; #164 and #165 ← #105; #131 ← #106 |
| S2 | **Tokens before any styled build** | #94 (tokens in pen.dev) → #95 (theme) | Every UI build (S1's list) |
| S3 | **Schema before services** | #109–#112 (#111's embeddings half waits on DT-1) | P4–P9 services |
| S4 | **`runAi()` before any AI call** | #169 | Every prompt-backed service (#127, #139, #142, #145, #148, #153) |
| S5 | **Provider decision** | DT-1 recorded as ADR-0004 | #111 (embeddings half), #145, #128; and a meaningful eval |
| S6 | **Product-owner confirmations** | [RC-1](../decisions/open-questions.md#rc-1--default-stage-limits) (stage limits), [RC-2](../decisions/open-questions.md#rc-2--screens-implied-by-the-requirements) (review queue) | #159 and #121; #106 and #131 |
| S7 | **Seed convergence** | #127, #139, #148, and #142 (missing from #120's list); #158 for back-dating | #120 → #121 → #122 → #123 |
| S8 | **Evidence before release** | The seeded files → answer key → verification → eval (#170–#173) | #179, #181 |
| S9 | **Release readiness** | The idempotent seed (#122), the dashboard (#161), the eval (#173), the fairness review (#176), the axe scan (#108) | Recruiter sessions and go/no-go |

## Definition of done

**For every task.** A task is done when **all** of the following hold. The last item is the
*Definition of done* section every task issue carries, quoted exactly.

1. **Acceptance criteria proven by named tests.** Each AC in the spec maps to a named automated test
   that passes. Where automation is not appropriate (a documentation-only task, for example), the plan
   says `none`, gives the reason, and names the manual evidence. See
   [test-strategy.md](test-strategy.md).
2. **Test-first where required.** Behaviours on the test-first list had failing tests, for the stated
   reason, before the implementation.
3. **Verification commands green.** `npm run lint`, `npm run typecheck` and `npm test` always.
   `npm run build` when app code changed, `npm run test:db` for database work, `npm run test:e2e` for a
   screen, `npm run eval` for parser, matcher, prompt or schema changes. The PR pastes the results.
4. **Review passed.** Claude's `pr-review` has no open blocker or major finding. `security-check` and
   `compliance-review` have run where their scope is touched. Minor findings are listed as follow-ups.
5. **Guardrails hold.** The spec's guardrail checklist is ticked with reasons, and nothing breaks a
   `CLAUDE.md` hard rule or settles an open question
   ([open-questions.md](../decisions/open-questions.md)).
6. **Conventions.**
   - The branch is named `<type>/<issue>-<slug>`.
   - Commits follow Conventional Commits.
   - The PR contains `Closes #<issue>` and links the spec and plan.
   - The Project 4 card is **In Review**.
   - A human merges, never Claude.
7. **Completion summary recorded.** This is the issue template's own wording:

   > **Completion summary required.** The `/task` final report and the **Outcome** section of
   > `docs/tasks/<issue>-<slug>/plan.md` record: what was implemented; files changed; each acceptance
   > criterion with the test that proves it; verification results; deviations and assumptions;
   > executor model and fix rounds; remaining follow-ups or blockers.

**For a story.** All its task PRs are merged, all its task issues are closed, and the story's own
acceptance criteria are each proven by a task.

**For a phase.** Every epic in it meets its exit condition in the table above. The epic's checkboxes
are ticked with links to the proving PRs.

**For the MVP.** P11's exit condition holds, and the go/no-go decision is recorded with its date.

## How the plan changes

- A task that finds a dependency the backlog does not list adds it to the task's *Depends on* list
  and to `docs/backlog/roadmap/*.json` in its PR, and updates this record if it changes the critical
  path.
- A new phase, a moved epic or a changed critical path is a PR to this file. The `backlog-builder`
  skill keeps the issues in step.
- Nothing here is a date. Estimates, if the team wants them, belong on the board, not in this record.

## Out of scope

- Re-planning the backlog itself.
- Estimating in days or assigning people.
