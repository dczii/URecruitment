# Spec — #25 Developers can run the app locally and it deploys to Vercel sin1

| | |
|---|---|
| Issue | https://github.com/dczii/URecruitment/issues/25 (Story) |
| Tasks | #83 (E01-S01-T01), #85 (E01-S01-T03), #84 (E01-S01-T02), #86 (E01-S01-T04), in dependency order |
| Parent | Story #25 → Epic #2 "Foundation & delivery" |
| Milestone | MVP |
| Branch | `feat/25-app-scaffold-foundation`, stacked on `docs/23-quality-test-eval-a11y` ([PR #190](https://github.com/dczii/URecruitment/pull/190)) |
| Created | 2026-09-17 |
| Status | In review <!-- Planned → In progress → In review --> |

## Problem

The repository has records and no application. Every later task needs the same baseline before it
can start:

- a Next.js App Router app in strict TypeScript, with Tailwind and shadcn/ui;
- functions pinned to Singapore;
- one typed, server-only environment module;
- Vitest and Playwright wired the way the test strategy says;
- error reporting that cannot leak a CV.

Without that baseline, each task would re-decide the basics, differently each time.

## PRD references

| PRD section | Item | Status |
|---|---|---|
| Technical architecture → Frontend | Next.js (App Router) in TypeScript | **decided** |
| → Hosting | Vercel, functions pinned to `sin1` | **decided** |
| → UI components | Tailwind CSS and shadcn/ui, themed from the pen.dev tokens | **proposed** |
| → Monitoring | Vercel runtime logs plus Sentry for errors | **proposed** |
| → Testing | Vitest for logic, Playwright for key screens, AI quality script | **proposed** |
| Non-functional → Devices | Desktop and mobile browsers | **decided** |
| Security (suggested) → 1 | The Supabase secret key lives only in Vercel env vars and never reaches the browser or the repo | **proposed** (`CLAUDE.md` hard rule 3) |

## Scope

**In scope**

- **#83:**
  - `create-next-app` output (App Router, TypeScript strict, ESLint, Tailwind, `src/`, `@/*` alias, npm) and `shadcn init`;
  - the `nextjs-app` folder layout, with `src/server/index.ts` marked `import "server-only"`;
  - the scripts `dev`, `lint`, `typecheck`, `build`;
  - `vercel.json` pinning `sin1`, and `.nvmrc`;
  - a placeholder home page;
  - **security headers**: CSP with a per-request nonce, `frame-ancestors 'none'`, `Referrer-Policy`, `X-Content-Type-Options`, `Permissions-Policy`. This is assigned by the security baseline and checked with `curl -sI`.
- **#85:**
  - Vitest config and setup (unexpected `fetch` fails the test; fake timers available; `test/fixtures/`);
  - a Playwright config with `desktop` (1440×900) and `phone` (390×844, `isMobile`) projects and a dev-server `webServer`;
  - one unit smoke test and one e2e smoke test per project. The phone test asserts `scrollWidth <= innerWidth`, and the e2e smoke also asserts the security headers (assigned by the security baseline);
  - the scripts `test`, `test:e2e` and a `test:db` stub.
- **#84:**
  - `src/lib/env.ts` (public) and `src/server/env.ts` (server-only), both Zod, test-first;
  - `.env.example` kept in sync;
  - a guard that no `NEXT_PUBLIC_*` name is a secret;
  - importing the server module from client code fails the build.
- **#86:**
  - Sentry for server, edge and client, with the DSN read through the env modules;
  - a test-first `beforeSend` scrubber;
  - no tracing and no replay;
  - a tunnel route, so the CSP keeps `connect-src 'self'`;
  - a documented way to send a test error from each runtime, disabled in production.

**Out of scope**

- Any product screen, component, token or route beyond the placeholder (E02+).
- Supabase and AI clients (E01-S02, E11).
- CI YAML (E01-S03).
- Setting any real env value, or creating a Sentry project.
- The axe scan (#108).

## Acceptance criteria

Story ACs (#25):

- [x] **AC1** — Given a clean clone and `npm install`, when I run `npm run dev`, then the app serves a page locally with no runtime error. _Proved by:_ `e2e/smoke.spec.ts › "home page renders"` (desktop + phone, run against `next dev` by Playwright's `webServer`).
- [x] **AC2** — Given a missing or malformed env var, when the app starts, then it fails with a message naming the variable, and no secret value is printed. _Proved by:_ `src/server/env.test.ts` (missing variable; malformed URL; no secret in the message) and `src/lib/env.test.ts`.
- [x] **AC3** — Given `npm run lint`, `typecheck`, `test` and `build`, when each is run, then all four pass on the scaffold. _Proved by:_ the four commands (verification log).
- [x] **AC4** — Given an unhandled server or browser error, when it is thrown, then Sentry receives it and the event contains no candidate name, email, phone or CV text. _Proved by:_ `src/lib/sentry-scrub.test.ts` (the scrubber removes a name, an email, a phone, CV text and a key-shaped string) plus the wiring review. **Receipt in Sentry needs a DSN in a preview deployment (a human step, see Assumption A8).**

Task done-when:

- [x] **AC5** (#83) — `tsconfig.json` has `strict: true`; no `any` outside commented exceptions; `vercel.json` pins `sin1`; `src/server/index.ts` starts with `import "server-only"`. _Proved by:_ `src/server/scaffold.test.ts` (reads the files and asserts each).
- [x] **AC6** (#83, security baseline) — Every page response carries CSP (script-src with a nonce and no `unsafe-inline` in production), `frame-ancestors 'none'`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff` and `Permissions-Policy`. _Proved by:_ `curl -sI` against `next start` (verification log) and `e2e/smoke.spec.ts › "security headers are present"`.
- [x] **AC7** (#85) — `npm test` makes no network call, and an accidental `fetch` in a unit test fails that test. _Proved by:_ `test/setup.test.ts › "an unexpected fetch fails the test"`.
- [x] **AC8** (#85) — `npm run test:e2e` passes for `desktop` and `phone`, and the phone smoke asserts `document.documentElement.scrollWidth <= window.innerWidth`. _Proved by:_ `e2e/smoke.spec.ts`.
- [x] **AC9** (#84) — Importing the server env module from a client component fails the build, and no `NEXT_PUBLIC_*` name is a secret. _Proved by:_ **a live build probe** — a temporary client component importing `@/server/env` made `npm run build` exit 1 with *"'server-only' cannot be imported from a Client Component module"* (Claude, 2026-09-18; probe reverted). The automated tests pin the preconditions rather than the failure itself: `src/server/scaffold.test.ts › "every module under src/server starts with import \"server-only\""` walks the whole directory, and `src/lib/env.test.ts › "isSecretShapedName recognises secrets and allows DSNs"` covers the naming guard. **There is no CI guard that re-runs the probe** — #89 owns grepping the built client bundle for server-schema names.
- [x] **AC10** (#84) — `.env.example` holds every name in the infrastructure inventory's *Local* column, with no values. _Proved by:_ `src/lib/env.test.ts › ".env.example lists names only"`.
- [x] **AC11** (#86) — No DSN or token is committed, and the DSN comes from the env modules. _Proved by:_ `src/lib/sentry-scrub.test.ts` (config reads the env module), plus the V3 secret scan.

## Guardrails that apply

- [ ] AI only suggests — no AI code.
- [x] **No email sent** — no mail library is added. Sentry alerting rules are out of scope.
- [x] **Server-only data access; secret key never reaches the browser** — `src/server/**` is `server-only`; the env split; the secret-name guard.
- [ ] RLS — no schema.
- [ ] AI output — no AI.
- [ ] Protected attributes — n/a.
- [x] **UTC / SGT** — no dates yet. Nothing here stores local time.
- [ ] Typed name — n/a.
- [x] **Phone width** — the phone project and the overflow assertion exist from day one.
- [x] **Fictional data only; no secrets committed** — only names in `.env.example`; the scrubber strips personal data from events.
- [x] **Free-tier limits** — `sin1` only. No cron and no extra services.

## UX / design

A placeholder page only. It has no product UI and no tokens (E02).

## Data / API changes

- Route: a Sentry **tunnel route** (the `/monitoring` path, created by the Sentry build plugin).
- Test-error triggers: `src/app/api/sentry-test/route.ts` and `src/app/sentry-test/page.tsx`. Both return **404 when `VERCEL_ENV === "production"`**.
- Request **proxy** (Next 16's name for middleware) that sets the CSP nonce. It makes no Supabase call.

## Assumptions

- **A1 — One PR for the story (user instruction, reconfirmed 2026-09-18).** The `urec-orchestrator` skill's "Story workflow: one Task, one PR" section asks for one PR per Task; the user chose one stacked PR for the whole story instead, so that is what ships. It carries one commit per task in dependency order (#83 → #85 → #84 → #86) and closes all four Tasks plus the Story. #84 is test-first, so it needs #85's Vitest first.
- **A13 — The base is `docs/23-quality-test-eval-a11y`, not `main`.** PRs #185–#188 were merged bottom-up into each other's branches, and the bottom one targeted `docs/20-open-questions-register` rather than `main`, so the Phase-0 plans never reached `main`. This story needs two of them: `docs/plans/infrastructure.md` (the env inventory #84 is written against) and `docs/plans/test-strategy.md` (#85). [PR #190](https://github.com/dczii/URecruitment/pull/190) lands that branch on `main`; **merge it first**, then this PR, which is retargeted to `main` afterwards.
- **A2 — Versions (checked on the registry today):** `next`/`create-next-app` 16.3.5, `tailwindcss` 4, `shadcn` 4, `zod` 4, `vitest` 5, `@playwright/test` 1.63, `@sentry/nextjs` 10. Executors read the installed packages' docs (`node_modules/next/dist/docs/` for Next 16), not memory.
- **A3 — Node 22 is pinned** in `.nvmrc`, with `engines.node >=22`. Node 20 is past end-of-life on this date, and Next 16 needs ≥ 20.9.
- **A4 — Generators run as a `claude` step.** `create-next-app` and `shadcn init` are deterministic CLIs that need network access, and `create-next-app` refuses a non-empty directory. Claude runs them in a temporary directory and copies the output in. All hand-written configuration and code goes to Grok.
- **A5 — The CSP uses a per-request nonce set in `proxy.ts`,** following Next's CSP guide. `security-check` forbids inline scripts unless nonce'd, and the App Router injects inline bootstrap scripts. The cost is that pages render dynamically, which the portal does anyway, since it reads per-request data. Development mode adds `'unsafe-eval'` for React's dev tooling only.
- **A6 — Sentry's `tunnelRoute` is used** so the browser sends events to our own origin. The CSP stays at `connect-src 'self'`, and events route through `sin1`. Tracing and replay are off (out of scope).
- **A7 — The test-error triggers are disabled in production.** The MVP has no sign-in, so a public "throw an error" endpoint in production would let anyone spam the Sentry quota.
- **A8 — Seeing the event in Sentry is a human step.** It needs a Sentry project and a DSN set in the Vercel Preview environment, and neither exists (release-deploy: agents never change Vercel settings unasked). The code, scrubber tests and trigger routes ship here. The receipt check is listed for the user.
- **A9 — `test:db` is a stub in this story.** #87 wires it to the local Supabase stack. This machine has no Docker, so the DB layer is exercised in CI (#91).
- **A12 — The e2e suite is run by Claude, not the executor.** Playwright's Chromium segfaults
  (`SIGSEGV`) inside the `cursor-agent --sandbox enabled` runtime, so every browser test there fails
  with `browserType.launch: Target page, context or browser has been closed`. The same suite passes in
  about 10 seconds from a normal shell. Executors therefore run lint, typecheck, unit tests and build;
  Claude runs `npm run test:e2e` and records the result.
- **A11 — `AGENTS.md` gains Next 16's managed agent-rules block.** `next dev` writes it into `AGENTS.md` whenever it detects an AI agent (`node_modules/next/dist/server/lib/generate-agent-files.js`). Committing it avoids churn, and it points Cursor executors at the bundled docs. The generator's own `AGENTS.md`/`CLAUDE.md` are **not** copied.
- **A10 — `@/*` resolves in Vitest** through `vite-tsconfig-paths`, the one test-only helper added besides Vitest and Playwright.

- **A14 — The Sentry tunnel route `/monitoring` is an accepted, rate-limitable risk.** A6 chose
  `tunnelRoute` so the CSP can stay at `connect-src 'self'`. The Sentry build plugin implements it as
  a rewrite whose destination is built from caller-supplied query parameters —
  `https://o:orgid.ingest[.:region].sentry.io/api/:projectid/envelope/`, with `o`, `p` and `r` taken
  from the request (verified in `.next/routes-manifest.json`). The host is constrained to
  `sentry.io`, so this is a constrained relay and **not** general SSRF, but anyone can POST envelopes
  through the agency's `sin1` function to **someone else's** Sentry project, spending Vercel Hobby
  invocations and bandwidth. The route ships even with no DSN set. **Accepted for the MVP** (fictional
  data, no DSN yet) and handed to **[#93](https://github.com/dczii/URecruitment/issues/93) /
  [#175](https://github.com/dczii/URecruitment/issues/175)**, which must cover `/monitoring` alongside
  `/api/ai/*`. The alternative — dropping `tunnelRoute` and allowing the Sentry ingest host in
  `connect-src` — reverses A6 and is not decided here.
- **A15 — The test-error triggers are open on Preview, which is public.** A7 disables them when
  `VERCEL_ENV === "production"`, but Vercel sets `preview` on preview deployments, and A8 plus
  `docs/runbooks/sentry-test-error.md` deliberately put the **DSN in Preview** — so the kill switch
  guards the one environment that has no DSN and leaves open the one that does. A7's own reason
  ("a public 'throw an error' endpoint … would let anyone spam the Sentry quota") therefore applies
  to Preview too. Behaviour is **left as written**, because the runbook depends on it and no DSN
  exists yet, but the inconsistency is recorded rather than settled silently:
  `/api/sentry-test` and `/sentry-test` go into **[#93](https://github.com/dczii/URecruitment/issues/93)**'s
  rate-limit scope, and the user may prefer to gate them behind a shared header instead.

## Open questions

- none (DT-1 is untouched: no AI package is added).
