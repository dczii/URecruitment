# AGENTS.md — rules for coding agents (Cursor / Grok)

You are an **executor** (Cursor Grok or GPT-5.6). Claude plans the work in `docs/tasks/<issue>-<slug>/` and reviews everything you write. Your prompt names the plan step to implement. Do that step, no more.

## Before you edit

1. Read the `plan.md` your prompt points to (problem, ACs, and the named step).
2. Read every `.claude/skills/<name>/SKILL.md` your prompt names. They are plain Markdown; read them as files.
3. Read the files you are about to change, plus their tests.

## Scope

- Change only the files the plan step lists. If another file must change, change it and say so in your final report.
- **Do not** run `git commit`, `git push`, create or switch branches, or edit anything under `.git/`. Claude commits.
- **Never push directly to `main` or merge a pull request.** Changes reach `main` only through a PR that the user merges manually.
- **Do not** edit `docs/tasks/**`, `.claude/**`, `AGENTS.md`, `CLAUDE.md` or `.github/**` unless the step says so.
- **Do not** add npm dependencies the plan doesn't list. If one is needed, stop and report it.
- **Do not** run anything against a remote Supabase project, Vercel, or GitHub.
- Use **npm**. Never pnpm, yarn or bun.

## Product guardrails (never break these)

1. No code path rejects, advances, shortlists or contacts a candidate, or sends anything to a client.
2. No email is sent anywhere, for any reason.
3. The browser never calls Supabase. Database and Storage calls happen only in server code (Server Components, Server Actions, route handlers) marked with `import "server-only"`. Never expose `SUPABASE_SECRET_KEY` through a `NEXT_PUBLIC_*` variable.
4. RLS is enabled on every table with no public policies. Private Storage bucket, short-lived signed URLs.
5. Do not add product AI (model calls, match scores, embeddings, NL query parse, AI gap flags). Recruiters enter profile and job fields themselves.
6. Nationality and language count only when the job marks them required **with a written reason**.
7. Fictional data only. Never hard-code secrets, keys, tokens or sample-data Blob URLs. This repository is public.
   - The public Vercel Blob store is the **seed source only**.
   - App code under `src/` never imports `@vercel/blob`.
   - The seed only `list()` it and download its files. They never write to it.
   - Uploaded and stored files live in the private Supabase Storage bucket.
8. Store UTC, display `Asia/Singapore`. Limits count Singapore working days.
9. Stage and settings changes record the recruiter's typed name.

## Code conventions

- TypeScript `strict`. No `any` without a comment explaining why.
- Next.js App Router. Server Components by default; `"use client"` only for interactivity.
- Validate all external input (forms, uploads) with Zod at the boundary.
- UI: shadcn/ui components and Tailwind theme tokens only. No hard-coded colours or fonts.
- Delay status is never colour-only: always pair it with a word or icon.
- Keep functions small and pure where possible, so they can be unit-tested.

## Tests

- Logic is **test-first**. When the step says "write failing tests", write only the tests, run them, and confirm they fail for the right reason.
- Vitest for logic (`*.test.ts` next to the code). Playwright for screens (`e2e/`), at desktop and phone width.
- Never delete or weaken a test to make it pass. Never mark a test `.skip` without saying so in your report.

## Verification (run before you report)

```
npm run lint
npm run typecheck
npm test
npm run build            # when the step touches app code
npm run test:e2e         # when the step touches a screen
```

Skip any script that doesn't exist yet, and say so.

## Final report format

End with exactly these sections:

```
## Changed files
- path — one-line reason
## Verification
- command → pass/fail (paste the failing output if any)
## Deviations from the plan
- none | what and why
## Open questions
- none | question
```

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
