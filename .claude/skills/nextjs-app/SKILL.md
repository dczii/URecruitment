---
name: nextjs-app
description: >
  Next.js App Router conventions for HRManagement (Next 16, React 19): route layout under src/app,
  Server Components vs client components, Server Actions with Zod, server-only data access in
  src/server, env handling, the CSP proxy, Sentry, Singapore time and the typed recruiter name.
  Use when adding or changing pages, layouts, actions, route handlers, env config or app structure.
---

# Next.js app

Read `project-map` (layout) and `docs/decisions/adr-0001-architecture.md` first. Also `docs/ux/screen-inventory.md` and `docs/ux/flows.md` for routes and journeys.

## Structure

- Routes in `src/app/<route>/page.tsx` (Server Component). Mutations live in a sibling `actions.ts` marked `"use server"`. Existing routes: `/dashboard`, `/jobs`, `/jobs/new`, `/jobs/[id]`, `/candidates/[id]`, `/search`, `/placements`, `/settings` (stub).
- Data access only in `src/server/<area>/` with `import "server-only"`, exported through `src/server/index.ts`. Pages and actions call these functions; they never create a Supabase client themselves.
- Pure logic (working days, stage limits, stage advance, typed name) in `src/lib` with a colocated `*.test.ts`. Keep it free of server imports so client code and tests can use it.
- UI: `src/components/features/<area>` composes `patterns/` and `ui/`. A client component receives plain props only and never imports `src/server`.
- `src/proxy.ts` sets the per-request CSP nonce (Next 16 renamed middleware to proxy). Headers come from `src/lib/security-headers.ts`. Don't add inline scripts without the nonce.
- The only route handler is `/api/sentry-test` (404 in production). There is no `/api/ai/*`, and product AI is out of scope.

## Rules

1. **Server Components by default.** `"use client"` only for interaction, and as low in the tree as possible.
2. **Every action validates input with Zod** (v4) at the boundary and returns a typed result (`{ ok: true, … } | { ok: false, error }`), never a stack trace. Use `revalidatePath` for the routes affected.
3. **Typed recruiter name** on every stage or settings change: validate with `src/lib/recruiter-name.ts`, pass it to the server function, which writes it to `stage_events` / `settings_log`. The UI asks through `TypedNameDialog`. No sign-in exists; don't add one.
4. **Env:** read through `src/server/env.ts` / `src/lib/env.ts` (Zod-parsed, fails with `env-error.ts`). Add the name to `.env.example` (names only). Only `NEXT_PUBLIC_SENTRY_DSN` may be public.
5. **Time:** store UTC; format with `Asia/Singapore` through one shared formatter; compute limits with `src/lib/working-days.ts` and the SQL functions. Never `new Date().toLocaleString()` in a component.
6. **No decisions by code:** no action may move, reject, shortlist or contact a candidate unless a recruiter triggered it with a typed name. No email, no scheduled jobs (Hobby allows one daily cron and the delay view makes it unnecessary).
7. **Pipeline semantics** come from `src/lib/stages.ts` (7 stages + 3 end states). Don't hard-code stage strings elsewhere.
8. **Sentry:** `instrumentation*.ts` and `sentry-scrub.ts` strip PII. Don't log CV text, names or file contents.
9. `npm run build` also runs `scripts/check-client-bundle.mjs`; a secret or `src/server` code in the client bundle fails it.
10. Region is pinned in `vercel.json` (`sin1`). Don't add a second region or edge runtime.

## Done when

`npm run lint`, `npm run typecheck`, `npm test` and `npm run build` pass; screens also pass `npm run test:e2e` (see `testing`).
