# Spec — #28 Previews and production deploy safely and cannot run up costs

| | |
|---|---|
| Issue | https://github.com/dczii/URecruitment/issues/28 (Story) |
| Tasks | #92 (E01-S04-T01), then #93 (E01-S04-T02), in dependency order |
| Parent | Story #28 → Epic #2 "Foundation & delivery" |
| Milestone | MVP |
| Branch | `feat/28-previews-rate-limit-spend-cap` (from `main`; no open predecessor PR) |
| Created | 2026-09-18 |
| Status | In review <!-- Planned → In progress → In review --> |

## Problem

The portal has no sign-in, so the server is the only gate. Anyone with the link can reach whatever
the AI routes expose. A few scripted requests a second could spend the agency's AI budget within
hours. Nothing in the repository yet says where the AI routes live, what limits them, or who watches
the provider bill.

The Vercel side is half-recorded. Previews and production deploy today, but nobody has written down
which variables each environment needs. The infrastructure plan leaves two sections blank for this
story: *what is set where* (#92) and *rate limit and spend cap* (#93). Separately, Vercel Hobby
forbids commercial use. That decision has to stay visibly **open**, with an owner, instead of being
assumed away.

## PRD references

| PRD section | Item | Status |
|---|---|---|
| Environments & delivery (suggested) | Every pull request gets a Vercel preview deployment; `main` deploys to production | **suggested** (→ **proposed** in this repo's vocabulary; built as written) |
| Technical architecture → Hosting | Vercel functions in `sin1`; Supabase `ap-southeast-1` | **decided** |
| Security (suggested) 5 | *"A Vercel firewall rule rate-limits the AI routes, and the AI provider has a monthly spend cap."* | **suggested** (→ **proposed**; built as written) |
| Free-tier limits and risks | Vercel Hobby is non-commercial, personal use only | **decided** (the limit is a fact) |
| Open questions 2 / repo RC-3 | Which paid plan, and whether MVP feedback sessions already count as commercial use | **open**: recorded, never settled here |
| AI governance | The dev team picks the AI provider | **decided**; *which* provider is open (DT-1) |

## Scope

**In scope**

- **#92 (configure the Vercel project, regions and per-environment variables):**
  - Record the observed Vercel state (2026-09-18) in `docs/plans/infrastructure.md` → *what is set
    where*:
    - Git integration builds a preview per PR push and production from `main`;
    - functions run in `sin1`;
    - previews are protected by Vercel Authentication.
  - Add the required variable matrix (every `.env.example` name × Development/Preview/Production),
    plus the exact read-only commands a person runs to confirm it.
  - A unit test keeps that matrix complete against `.env.example` and pins `vercel.json` to
    `regions: ["sin1"]`.
  - `docs/decisions/open-questions.md` → RC-3: stays **Open**, gets a named owner, and #92's record
    is linked from it.
- **#93 (rate-limit the AI routes and document the monthly spend cap):**
  - One AI route prefix, `/api/ai/`, is exported from `src/lib/ai-routes.ts` and documented in
    `src/app/api/ai/README.md`.
  - The committed firewall rule lives in `infra/vercel/ai-rate-limit.rule.json` (Vercel WAF rate
    limit: path starts with `/api/ai/`, fixed window, keyed by IP, default 429 action). A test ties
    it to the prefix and to Hobby's limits.
  - A guard test: any route handler that imports AI code must live under `src/app/api/ai/`.
  - A pure helper, `aiFailureMessage(status)`, turns a 429 (and any other failure) into a clear
    recruiter-facing message, so no AI failure is silent.
  - `docs/plans/infrastructure.md` → *rate limit and spend cap*: the prefix, the rule and its
    values, how a person applies and checks it, the provider-side spend-cap procedure with an owner,
    and what a rate-limited recruiter sees.
  - Consistency edits:
    - `docs/security/baseline.md` C5 (Hobby does offer the rule);
    - `release-deploy` (records which control is in force, as that skill asks);
    - `nextjs-app` rule 4 (closes the "or services called from actions" gap in the prefix rule).

**Out of scope**

- **Changing any Vercel setting, setting any variable, or publishing the firewall rule.**
  `release-deploy`: *"Never deploy to production, change Vercel or Supabase settings … unless the
  user explicitly asks in this session."* The session's instruction was to implement the story
  without asking, which isn't an explicit instruction to change remote settings. The Vercel CLI on
  this machine is also logged into an account (`dzabala`) that can't see the project. A person
  applies the rule and confirms the variables with the committed commands (see Assumptions A1).
- Choosing or buying a paid plan (RC-3 / OQ-2 stay open).
- The in-app spend-cap check and the app-level limiter (#175, E11-S04-T01).
- Choosing the AI provider (DT-1) or a real budget figure.
- Any AI route itself. None exists yet; the first arrives with E05/E07.
- Authentication of any kind.

## Acceptance criteria

Story ACs (from #28) are **S-AC1…3**. Task ACs follow, mapped 1:1 to each Task's "Done when".

### #92

- [x] **AC1** (#92 done-when 1, S-AC1). Given a pull request, when Vercel builds it, then a preview
  deployment exists and functions are pinned to `sin1`. _Proved by:_
  `test/infra/vercel-config.test.ts › AC1: vercel.json pins functions to sin1` (config), plus
  manual evidence in the infra plan: GitHub deployments by `vercel[bot]` for this PR's commits
  (Preview) and for `main` (Production), and production answering `x-vercel-id: sin1::sin1::…`.
- [x] **AC2** (#92 done-when 2). Given `.env.example`, when the infrastructure plan's *what is set
  where* matrix is read, then every name in `.env.example` has a row saying which Vercel
  environments must hold it, and no value appears in the repository. _Proved by:_
  `test/infra/vercel-config.test.ts › AC2: every .env.example name has a row in the set-where
  matrix` and `› AC2: .env.example holds names only`. **Confirming the dashboard matches is a person's
  step** (A1); the PR lists it under follow-ups.
- [x] **AC3** (#92 done-when 3, S-AC3). Given Vercel Hobby forbids commercial use, when the
  open-questions register is read, then RC-3 is still **Open**, names an owner, and links #92's record
  in the infrastructure plan. _Proved by:_ none automated (docs-only). Manual evidence: the RC-3 row
  and the infra plan link, checked in review.

### #93

- [x] **AC4** (#93 done-when 1). Given the AI routes, when the committed firewall rule is compared
  with the code, then the rule matches exactly the one prefix `AI_ROUTE_PREFIX` (`/api/ai/`). It is a
  fixed-window rate limit keyed by IP with the default 429 action, and it fits Hobby's limits
  (10–600 s window). _Proved by:_ `test/infra/ai-rate-limit-rule.test.ts › AC4: …`.
- [x] **AC5** (#93 done-when 1, S-AC2 in code). Given a route handler that imports AI code, when it
  lives outside `src/app/api/ai/`, then the guard test fails. A route file placed directly at
  `src/app/api/ai/route.ts` (which the trailing-slash prefix would not match) also fails. _Proved by:_
  `test/infra/ai-route-prefix.test.ts › AC5: …` (fixture cases plus the real `src/app` tree).
- [x] **AC6** (#93 done-when 2). Given an AI request answered with HTTP 429, when the UI asks
  `aiFailureMessage(429)`, then it gets a plain-language message saying requests from this network
  were limited and to wait a minute and try again. Given any other failure status, the UI gets a
  different, generic message. Given a success, the result is `null`. No AI failure maps to an empty
  message. _Proved by:_ `src/lib/ai-routes.test.ts › AC6: …`.
- [x] **AC7** (#93 done-when 2–3, S-AC2 operationally). Given the infrastructure plan, when a person
  reads *rate limit and spend cap*, then it states the prefix, the rule's values, and the exact
  commands to apply and check it. It also documents the 429 response and the recruiter-facing message,
  and the provider-side spend-cap procedure with a named owner and check cadence. _Proved by:_
  `test/infra/ai-rate-limit-rule.test.ts › AC7: the infrastructure plan states the committed rule's
  values` (keeps the doc in sync with the JSON). The procedure text itself is checked in review.

**S-AC2 (the firewall actually rejects the excess)** is proven once a person publishes the rule,
tracked in [#199](https://github.com/dczii/URecruitment/issues/199). The
plan gives a burst-probe command: over-limit requests to `/api/ai/…` return `429`. Until then it is
a follow-up, not a claim.

## Guardrails that apply

- [ ] AI only suggests: n/a (no AI call is added).
- [x] No email sent. The owner and check procedures are dashboard or console checks by a person,
  with no email alert set up by the app. Provider billing emails are the provider's own, outside the
  app.
- [x] Server-only data access; secret key never reaches the browser. The matrix keeps
  `SUPABASE_SECRET_KEY` out of Vercel *Development* and never `NEXT_PUBLIC_`. `src/lib/ai-routes.ts`
  is shared (browser-safe) and holds no secret or env read.
- [ ] RLS / Storage: n/a.
- [ ] AI output / `ai_runs`: n/a.
- [ ] Protected attributes: n/a.
- [ ] UTC/SGT: only the record dates, which are SGT calendar dates (register rule 6).
- [ ] Typed name: n/a.
- [ ] UI: n/a (no screen). The message text is written for recruiters and is plain English.
- [x] Fictional data only; no secrets or sample-data Blob URLs committed. Names only, no values. No
  deployment URL that bypasses protection, and no bypass secret.
- [x] Free-tier limits respected. Hobby allows **one** rate-limit rule per project (fixed window,
  10 s–10 min, IP/JA4 keys, 1,000,000 allowed requests included). The rule uses exactly one. No cron
  is added.

## UX / design

n/a (no screen). The recruiter-facing copy for a rate-limited AI request (AC6) is:

> **Too many AI requests from your network just now.** Wait a minute, then try again. Your work
> hasn't been lost.

The generic copy for any other AI failure is:

> **The AI suggestion couldn't be produced.** Try again in a moment. If it keeps failing, carry on
> without it.

Both follow the PRD rule that the AI only suggests. A failure never blocks the recruiter's own work.

## Data / API changes

- New shared module `src/lib/ai-routes.ts`: `AI_ROUTE_PREFIX`, `isAiRoutePath()`,
  `aiFailureMessage()`.
- New committed config `infra/vercel/ai-rate-limit.rule.json`, not read at runtime.
- No table, migration, route handler, env var or dependency.

## Assumptions

- **A1 — No remote changes by the agent.**
  - The session said *"do not ask anything and make intelligent decision"*. That removes approval
    gates. It is not the explicit instruction `release-deploy` needs before an agent changes Vercel
    settings or sets variables.
  - The local Vercel CLI is also on the wrong account (`dzabala`), so it could not read the project
    anyway.
  - The agent therefore commits the rule and the matrix, and records what it **observed** without
    credentials: deployments, region headers, preview protection.
  - Publishing the rule and confirming the variables are listed follow-ups for a person, with exact
    commands.
- **A2 — Rule values: 60 requests per 60 s per IP, fixed window, default 429, no persistent block.**
  - The whole office may share one public IP (NAT). The limit is therefore per *network*, not per
    recruiter.
  - 60 a minute gives each of up to 20 recruiters about 3 AI calls a minute, which is above normal
    use (a search submit, a JD save).
  - It still caps one scripted client at about 3,600 calls an hour. The spend cap (#175 + provider
    console) bounds the *total*; the rule bounds the *speed*.
  - No persistent block, so a legitimate office is never locked out for longer than the window.
  - Tuning is a one-line JSON change plus re-applying the rule. The first recruiter session's
    firewall traffic is the evidence for tuning.
- **A3 — Prefix with a trailing slash (`/api/ai/`).**
  - Without the slash, `pre /api/ai` would also match unrelated paths such as `/api/aid`.
  - With it, the bare path `/api/ai` would escape the rule. The guard test (AC5) forbids a route file
    at exactly `src/app/api/ai/route.ts`.
- **A4 — Server Actions.**
  - A Server Action posts to its page's path, not `/api/ai/`, so the firewall cannot see it.
  - Rule: no Server Action or page calls a model in response to a browser request. Browser-triggered
    AI work is a route handler under `/api/ai/`.
  - The one exception is `after()` background work that a non-AI save schedules (re-scoring after a
    job save, `nextjs-app` rule 5). It is bounded by the spend cap in `runAi()` (#175), not by the
    firewall.
  - `nextjs-app` rule 4 is reworded to say this. The guard test covers route handlers, and review
    covers actions.
- **A5 — Spend-cap owner.** The PRD says the dev team picks and runs the AI provider (**decided**), so
  the provider-console cap belongs to the **dev lead (repository owner)**. The person running each
  recruiter session checks month-to-date spend the day before. That is the same role #178 names for
  the keep-alive check. Naming an owner is not a PRD open item.
- **A6 — RC-3 owner.** The owner slot is filled with the **agency director** (the persona of this
  story), because it is a spend-and-terms decision. The row stays **Open**. Naming who decides is not
  deciding.
- **A7 — The 429 body is Vercel's, not ours.** A request the firewall rejects never reaches the
  function, so the body is not our JSON. Clients must branch on `response.status` **before** parsing
  a body; `aiFailureMessage(status)` takes only the status for that reason.

## Open questions

- **RC-3 / OQ-2** (Vercel Hobby and commercial use; which paid plan): recorded as **open** with an
  owner. Not settled here. `needs-decision` stays on #92.
- **DT-1** (AI provider): the provider-side cap procedure is written provider-agnostically, and is
  completed in the ADR-0004 follow-up when the provider is chosen.
