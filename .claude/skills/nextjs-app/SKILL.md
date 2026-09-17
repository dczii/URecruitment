---
name: nextjs-app
description: >
  Next.js App Router conventions for URecruitment: folder layout, Server Components vs client
  components, Server Actions with Zod, route handlers for AI endpoints, `after()` background work,
  sin1 region, server-only data access, env handling, Singapore time formatting, typed recruiter
  name. Use when adding or changing pages, layouts, server actions, route handlers, middleware,
  env config or app structure.
---

# Next.js app

**Check the installed version first.** Read `node_modules/next/package.json` and follow that version's docs. Don't rely on memory for APIs that change between majors (caching defaults, `after`, `params` being async, and so on).

## Layout (proposed; confirm or adjust in the scaffold task, then update this file)

```
src/
  app/
    (portal)/                 # all recruiter screens share the shell
      page.tsx                # Dashboard
      jobs/ jobs/[jobId]/ jobs/new/ jobs/[jobId]/edit/
      candidates/ candidates/[candidateId]/
      pipeline/ placements/ settings/ review-queue/
    api/ai/                   # AI route handlers only (rate-limited by path)
  server/                     # import "server-only" in every file
    db/                       # Supabase server client, typed queries
    ai/                       # provider-agnostic AI services (see ai-pipeline)
    services/                 # use-case logic: parsing, matching, gap check, pipeline
    storage/                  # signed URLs, uploads
  lib/                        # pure, isomorphic logic (working days, score caps, formatters) + tests
  components/
    ui/                       # shadcn/ui primitives (generated)
    patterns/                 # AiSuggestion, SourceQuote, DelayStatusBadge, TypedNameDialog…
    features/<area>/          # screen-specific components
e2e/                          # Playwright
supabase/                     # migrations, seed, config
design/                       # .pen files + readable token/spec mirrors
eval/                         # answer key + eval script
```

## Rules

1. **Server-only data.**
   - Everything in `src/server/**` starts with `import "server-only"`.
   - Client components never import from `src/server`, and never receive secrets or raw DB rows with fields they don't render.
   - The browser never talks to Supabase.
2. **Server Components by default.** Add `"use client"` only for interactivity (drag on the pipeline board, dialogs, filters). Keep client components thin, and pass them serialisable props.
3. **Mutations are Server Actions.** Each one:
   1. Parses its input with a Zod schema.
   2. Requires the **typed recruiter name** where the action changes a stage or a setting.
   3. Calls one `src/server/services/*` function.
   4. Revalidates the affected paths.
   5. Returns a typed result (`{ ok: true, … } | { ok: false, error }`). It never throws raw errors to the client.
4. **AI work goes through route handlers under `/api/ai/*`** (or services called from actions), so the Vercel firewall can rate-limit them by path. **No AI call on page load:** pages read stored results.
5. **Background work uses `after()`.** Re-scoring after a job save runs in `after()`, and its progress is persisted in the runs table so failures can be retried. Don't rely on cron: Hobby runs cron once a day.
6. **Region is Singapore.** Pin functions to `sin1` (`vercel.json` `"regions": ["sin1"]`) and don't set other regions.
7. **Env.**
   - A single Zod-validated env module splits server and public vars.
   - Only non-sensitive values may use `NEXT_PUBLIC_*`. Never `NEXT_PUBLIC_` the Supabase secret key, AI keys or `BLOB_READ_WRITE_TOKEN`.
   - Keep `.env.example` in sync (names only, no values).
   - `BLOB_READ_WRITE_TOKEN` is present in Vercel envs because the sample-data store is connected to the project. **The app never reads it and never imports `@vercel/blob`.** File storage is Supabase Storage.
8. **Time.**
   - Store and pass UTC ISO strings.
   - Format for display with `Intl.DateTimeFormat("en-SG", { timeZone: "Asia/Singapore" })` through one helper in `src/lib`.
   - Working-day math lives in `src/lib` (mirrors the SQL functions) and is unit-tested.
9. **Typed name.**
   - The name is kept on the device (`localStorage` via a small client hook) and asked for before the first change.
   - Server Actions receive it as an argument and validate it (trimmed, 1–80 chars).
   - It is **not** authentication. Don't treat it as identity.
10. **No email.** No mail libraries, no SMTP/Resend/etc. Notifications are dashboard queries.
11. **Errors.** Use `error.tsx` and `not-found.tsx` per segment. Log server errors to Sentry **without CV text or contact details**.
12. **Performance.**
    - Search responds in < 3 s. Parsing runs in < 30 s per CV.
    - Stream slow sections with `Suspense`.
    - Paginate lists: 200 candidates × 20 jobs is small, but real data won't be.

## Testing hooks

- Pure logic in `src/lib` gets Vitest tests, **test-first**.
- Services get tests with the DB/AI boundaries faked (see `testing`).
- Every screen route gets at least one Playwright smoke test at desktop and phone width.

## Don't

- Don't call Supabase from middleware or client components.
- Don't put business rules in components. Put them in `src/lib` or `src/server/services`.
- Don't add sign-in. Sign-in is an open question for the real-data release.
