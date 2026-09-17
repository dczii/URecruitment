# Plan — #25 Developers can run the app locally and it deploys to Vercel sin1

Spec: [spec.md](./spec.md) · Branch: `feat/25-app-scaffold-foundation` · Created: 2026-09-17

## Approach

Build the baseline in the tasks' dependency order, with one commit or more per task:

1. **#83 Scaffold.**
   - Claude runs the two generators (`create-next-app`, `shadcn init`) in a temporary directory and
     copies the result in. The repository root is not empty, and `create-next-app` refuses a
     non-empty directory.
   - Grok then shapes the app: the `nextjs-app` layout, the `server-only` marker, the scripts, `sin1`,
     a placeholder page, and the security headers the security baseline assigns here.
   - Static headers go in `next.config.ts`. The CSP uses a per-request nonce set in `src/proxy.ts`
     (Next 16's name for middleware), following Next's bundled CSP guide.
2. **#85 Test tooling.**
   - Vitest runs in a node environment with a setup file that makes any unexpected `fetch` throw.
     `@/*` is resolved through `vite-tsconfig-paths`, and the unit layer includes
     `src/**`, `scripts/**` and `eval/**`, as the test strategy says.
   - Playwright has `desktop` and `phone` projects and a `webServer` that starts `next dev`.
   - The smoke tests prove the page renders, that there is no overflow at 390 px, and that the
     security headers are present.
3. **#84 Env, test-first.**
   - `src/server/env.ts` (`server-only`) parses the server variables with Zod.
   - `src/lib/env.ts` parses the `NEXT_PUBLIC_*` variables.
   - Errors name the variable and never print a value.
   - A unit test forbids secret-shaped public names and checks `.env.example`.
4. **#86 Sentry, test-first.**
   - A pure scrubber in `src/lib/sentry-scrub.ts` is used as `beforeSend` in all three runtimes.
   - The DSN comes from the env modules.
   - The tunnel route keeps the CSP at `connect-src 'self'`.
   - Tracing and replay are off.
   - Test-error triggers return 404 in production.

**Rejected:**

- *Letting Grok run `create-next-app`.* It needs network and a scratch directory outside the repo,
  and the Cursor sandbox may block both. The output is deterministic anyway.
- *A static CSP with `'unsafe-inline'`.* `security-check` forbids it.
- *Sentry's wizard.* It is interactive and writes files we don't want, such as an example page and
  tracing config.

## Skills in scope

- `prd-context`: required. Technical choices, devices and monitoring.
- `testing`: required. The layers, the no-network rule, the Playwright projects, the overflow assertion, and "fake timers available".
- `github-workflow`: required. Branch, commits, PR and board.
- `nextjs-app`: the layout, `server-only`, Server Components by default, the env split, `sin1`, and "check the installed version first".
- `ui-build`: shadcn init into `src/components/ui`, and tokens only. The placeholder page uses no hex values.
- `security-check`: secrets and `NEXT_PUBLIC_`, headers (CSP, `frame-ancestors`, Referrer-Policy, nosniff, Permissions-Policy), no Blob import, logging without personal data, and `npm audit`.
- `release-deploy`: the env inventory (names only), `sin1`, and agents never touching remote settings.
- `compliance-review`: Sentry events carry no CV text or contact details.

## Files

| File | Change |
|---|---|
| `package.json`, `package-lock.json` | new — generators plus the listed dependencies; scripts `dev`, `lint`, `typecheck`, `build`, `start`, `test`, `test:e2e`, `test:db` |
| `.nvmrc` | new — `22` |
| `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `next-env.d.ts` (gitignored), `components.json` | new (generators), then edited (#83, #86) |
| `vercel.json` | new — `regions: ["sin1"]` |
| `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/app/favicon.ico` | new (generator), then edited (placeholder, `lang="en"`) |
| `src/proxy.ts` | new — per-request CSP nonce |
| `src/lib/security-headers.ts`, `src/lib/security-headers.test.ts` | new — header values in one place (used by `next.config.ts` and `proxy.ts`) |
| `src/server/index.ts` | new — `import "server-only"` |
| `src/server/scaffold.test.ts` | new — AC5 |
| `src/lib/utils.ts`, `src/components/ui/.gitkeep`, `src/components/patterns/.gitkeep`, `src/components/features/.gitkeep` | new |
| `.gitignore` | modify — merge the generator's entries (keep the existing rules) |
| `AGENTS.md` | modify — add Next 16's managed agent-rules block (pointing executors at `node_modules/next/dist/docs/`). `next dev` re-inserts it whenever it detects an AI agent, so committing it keeps the tree clean |
| `vitest.config.ts`, `test/setup.ts`, `test/setup.test.ts`, `test/fixtures/README.md` | new (#85) |
| `playwright.config.ts`, `e2e/smoke.spec.ts` | new (#85) |
| `src/server/env.ts`, `src/server/env.test.ts`, `src/lib/env.ts`, `src/lib/env.test.ts` | new (#84) |
| `.env.example` | modify only if the env schema needs a name the inventory lacks (then the inventory is updated too) |
| `instrumentation.ts`, `instrumentation-client.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` | new (#86). Sentry 10 uses `instrumentation-client.ts` for the browser; the issue's `sentry.client.config.ts` is the older name |
| `src/lib/sentry-scrub.ts`, `src/lib/sentry-scrub.test.ts` | new (#86) |
| `src/app/api/sentry-test/route.ts`, `src/app/sentry-test/page.tsx`, `src/app/sentry-test/throw-button.tsx` | new (#86) — 404 in production |
| `docs/runbooks/sentry-test-error.md` | new (#86) — how to send a test error from each runtime |
| `docs/plans/infrastructure.md` | modify only if a new variable is introduced |

## Dependencies

Checked on the npm registry today; exact versions are fixed by `package-lock.json`.

- **From the generators:**
  - `next@16.3.5`, `react`, `react-dom`;
  - `typescript`, `@types/node`, `@types/react`, `@types/react-dom`;
  - `eslint`, `eslint-config-next`;
  - `tailwindcss@4`, `@tailwindcss/postcss`;
  - shadcn's `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `tw-animate-css`.
- **`server-only`:** the `import "server-only"` marker (`nextjs-app` rule 1).
- **`zod@4`:** env validation (`nextjs-app` rule 7).
- **`vitest@5`, `vite-tsconfig-paths`:** the unit layer.
- **`@playwright/test@1.63`:** the e2e layer. Its Chromium build is installed by Claude with `npx playwright install chromium`.
- **`@sentry/nextjs@10`:** monitoring (PRD, proposed).
- **Env vars:** none new. The names are already in the inventory: `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `AI_*`, `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `PLAYWRIGHT_BASE_URL`.
- **Migrations:** none.

## Steps

- [ ] **S1** `claude` — Run the generators (spec A4).
  - Run `npx create-next-app@16.3.5 <tmp> --ts --eslint --tailwind --app --src-dir --import-alias "@/*" --use-npm --yes`, then `npx shadcn@4 init` (defaults, neutral) inside `<tmp>`.
  - Copy everything except `.git`, `node_modules`, `README.md` and `.gitignore` into the repo. Merge `.gitignore` by hand.
  - Install `server-only` and `zod`, add `.nvmrc`, and run `npm install`.
  - Verify: `npm run lint && npx tsc --noEmit && npm run build`.
- [ ] **S2** `grok` — #83 shaping (AC5, AC6).
  - Rules: `nextjs-app` 1, 2, 6 and 7, plus "check the installed version"; `security-check` §Transport and headers; `ui-build` 1 and 2.
  - Verify: `npm run lint`, `npm run typecheck`, `npm run build`, then `npm start` and `curl -sI localhost:3000 | grep -iE 'content-security-policy|x-frame|referrer-policy|x-content-type|permissions-policy'`.
- [ ] **S3** `grok` — #85 test tooling (AC1, AC7, AC8).
  - Rules: `testing` §Layers and §Rules (no network, `desktop`/`phone` projects, overflow assertion, no `waitForTimeout`, role locators).
  - Verify: `npm test`, `npm run test:e2e`.
- [ ] **S4a** `grok` — #84 failing tests (AC2, AC9, AC10). Write `src/server/env.test.ts` and `src/lib/env.test.ts` only.
  - Verify: `npm test` → the new tests fail on missing modules or assertions (checked by Claude).
- [ ] **S4b** `grok` — #84 implementation, until S4a is green.
  - Rules: `nextjs-app` 7; `security-check` §Secrets; `release-deploy` env inventory; `testing` (env parsing is test-first).
  - Verify: `npm test`, `npm run typecheck`, `npm run build`.
- [ ] **S5a** `grok` — #86 failing scrubber tests (AC4, AC11). Write `src/lib/sentry-scrub.test.ts` only.
  - Verify: `npm test` → fails.
- [ ] **S5b** `grok` — #86 Sentry wiring, scrubber, triggers and runbook, until green.
  - Rules: `security-check` §Logging and monitoring; `compliance-review` minimisation; `nextjs-app` 11; the CSP from S2 (use `tunnelRoute`; no `unsafe-inline`).
  - Verify: `npm run lint`, `typecheck`, `test`, `build`, `test:e2e`, and the `curl` header check again.
- [ ] **S6** `none` — Full verification plus `npm audit --omit=dev`, then Claude review (`pr-review` + `security-check` + `compliance-review`) on an Opus subagent.

## Test plan

| AC | Test or manual evidence | Type |
|---|---|---|
| AC1 | `e2e/smoke.spec.ts › home page renders` (desktop + phone, against `next dev`) | e2e |
| AC2 | `src/server/env.test.ts` (missing, malformed, no secret in the message); `src/lib/env.test.ts` | unit |
| AC3 | `npm run lint`, `typecheck`, `test`, `build` (log) | commands |
| AC4 | `src/lib/sentry-scrub.test.ts` (name, email, phone, CV text, key-shaped string, request body) | unit. **Receipt in Sentry is a human step (spec A8)** |
| AC5 | `src/server/scaffold.test.ts` | unit |
| AC6 | `src/lib/security-headers.test.ts`; `e2e/smoke.spec.ts › security headers are present`; `curl -sI` (log) | unit + e2e |
| AC7 | `test/setup.test.ts › an unexpected fetch fails the test` | unit |
| AC8 | `e2e/smoke.spec.ts › no horizontal overflow` (phone) | e2e |
| AC9 | `src/server/env.test.ts › server env module is server-only`; `src/lib/env.test.ts › no public variable is secret-shaped` | unit |
| AC10 | `src/lib/env.test.ts › .env.example lists names only` | unit |
| AC11 | `src/lib/sentry-scrub.test.ts` (config reads the env module) + V3 secret scan | unit + scan |

## Verification

```
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e          # desktop + phone against next dev
npm run test:db           # stub: exits 0 with an explanation until #87
npm audit --omit=dev      # no high/critical, or justified
curl -sI http://localhost:3000 (after npm start)   # the five security headers
V3 secret scan on the diff; git ls-files | grep -E '(^|/)\.env' | grep -v '\.env\.example$'   # empty
```

## Risks & rollback

- **Risk: the nonce CSP breaks a Next or Sentry script.** The e2e smoke loads the page with the
  browser console checked for CSP violations. If it fails, fix the CSP. Never fall back to
  `unsafe-inline` in production.
- **Risk: generator output drifts** (the generators' versions are pinned in S1).
- **Rollback:** revert the branch. Nothing remote was touched.

## Outcome

<!-- Filled after execution. -->
