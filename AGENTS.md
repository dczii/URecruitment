# AGENTS.md — rules for coding agents (Cursor / Grok)

You are an **executor**. Claude plans the work in `docs/tasks/<issue>-<slug>/` and reviews everything you write. Your prompt names the plan step to implement. Do that step, no more.

## Before you edit

1. Read the `spec.md` and `plan.md` your prompt points to.
2. Read every `.claude/skills/<name>/SKILL.md` your prompt names. They are plain Markdown; read them as files.
3. Read the files you are about to change, plus their tests.

## Scope

- Change only the files the plan step lists. If another file must change, change it and say so in your final report.
- **Do not** run `git commit`, `git push`, create or switch branches, or edit anything under `.git/`. Claude commits.
- **Do not** edit `docs/tasks/**`, `.claude/**`, `AGENTS.md`, `CLAUDE.md` or `.github/**` unless the step says so.
- **Do not** add npm dependencies the plan doesn't list. If one is needed, stop and report it.
- **Do not** run anything against a remote Supabase project, Vercel, or GitHub.
- Use **npm**. Never pnpm, yarn or bun.

## Product guardrails (never break these)

1. The AI only suggests. No code rejects, advances, shortlists or contacts a candidate, or sends anything to a client.
2. No email is sent anywhere, for any reason.
3. The browser never calls Supabase. Database, Storage and AI calls happen only in server code (Server Components, Server Actions, route handlers) marked with `import "server-only"`. Never expose `SUPABASE_SECRET_KEY` or any AI key through a `NEXT_PUBLIC_*` variable.
4. RLS is enabled on every table with no public policies. Private Storage bucket, short-lived signed URLs.
5. Every AI output is validated against a Zod schema, saved to `ai_runs` (input, model, version, date, cost, duration) and carries the source text it relied on.
6. Scoring ignores name, photo, age, gender, race, religion and marital status. Nationality and language count only when the job marks them required **with a written reason**.
7. Fictional data only. Never hard-code secrets, keys, tokens or Drive IDs. This repository is public.
8. Store UTC, display `Asia/Singapore`. Limits count Singapore working days.
9. Stage and settings changes record the recruiter's typed name.

## Code conventions

- TypeScript `strict`. No `any` without a comment explaining why.
- Next.js App Router. Server Components by default; `"use client"` only for interactivity.
- Validate all external input (forms, uploads, AI output) with Zod at the boundary.
- UI: shadcn/ui components and Tailwind theme tokens only. No hard-coded colours or fonts.
- Delay status is never colour-only: always pair it with a word or icon.
- Every AI-derived value in the UI is labelled "AI suggestion" and shows its source text.
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
