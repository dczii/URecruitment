# ADR-0001 — Application, data and AI boundaries

## Status

**Accepted** · 2026-09-17 · created by [#71](https://github.com/dczii/URecruitment/issues/71)
(story [#19](https://github.com/dczii/URecruitment/issues/19), epic
[#1](https://github.com/dczii/URecruitment/issues/1))

The PRD *suggests* this architecture. This record is the team committing to it, and marking which
parts a later task may still argue with. Read [README.md](README.md) for the status vocabulary.

Companions: [ADR-0002](adr-0002-data-model.md) (the data model this boundary protects) and
[ADR-0003](adr-0003-ai-provider.md) (the AI provider, still **open**).

## Context

URecruitment replaces Manatal for the 6–20 recruiters of a Singapore recruitment agency. The MVP is
due **mid-December 2026**, runs on **fictional data only**, and ends with a go/no-go on real data.

Four facts drive every boundary in this record:

1. **There is no sign-in.** The PRD accepts this for the MVP (decided) and leaves sign-in before real
   data as an **open** question. Anyone with the URL can open any screen and trigger any AI call.
2. **The repository is public**, so no secret, key or sample-data URL may ever be committed.
3. **The plans are free tiers** — Vercel Hobby and Supabase Free (decided). Hobby gives one region
   and **cron once a day**; Supabase Free gives 500 MB of database, 1 GB of storage, 50 MB per file,
   no backups, and pauses after a week idle.
4. **Data should stay in Singapore.** Hosting is in SG (decided), and the PDPA overseas-transfer rule
   applies to anything processed abroad once real CVs arrive.

With no sign-in, there is no per-user authorisation to enforce and nothing to enforce it against.
**The server process is the only gate.** Everything below follows from that.

## Decision

### D1 — The trust boundary: browser → Next.js server → Supabase / AI

```
   Browser (recruiter, no sign-in)
        │  HTTPS, only to the Next.js app
        ▼
   Next.js on Vercel, functions pinned to sin1        ← the only trusted component
        │  Supabase secret key            │  AI provider key
        ▼                                 ▼
   Supabase Postgres + Storage       AI provider (ADR-0003, open)
   (ap-southeast-1, RLS on,          structured JSON in, structured JSON out
    private bucket)
```

**The browser never reaches Supabase and never reaches the AI provider.** Three rules make that
true, and all three must hold together.

> **These three are not arguable.** The PRD states them under *"Security (suggested)"*, and
> `prd-context` therefore renders them **proposed** — but `CLAUDE.md` hard rule 3 makes server-only
> data access and RLS-with-no-public-policies binding, and [ADR-0002](adr-0002-data-model.md) D2
> repeats the lock-down as **not negotiable**. The PRD status below records how firmly the *PRD*
> worded each one; it does **not** license a later task to weaken it. Changing any of the three
> needs a record superseding this one.

1. **The secret key lives only in Vercel environment variables** and is read only by server code
   (PRD Security 1, proposed). It bypasses RLS, which is exactly why it must never leave the server.
   It is never prefixed `NEXT_PUBLIC_`, and neither is any AI key or `BLOB_READ_WRITE_TOKEN`.
2. **RLS is enabled on every table with no public policies**, and every table, view and function is
   revoked from `anon` and `authenticated` (PRD Security 2, proposed). So even if a publishable key
   did reach the browser, it reads nothing. This is the belt to D1.1's braces, and it is tested:
   [#113](https://github.com/dczii/URecruitment/issues/113) proves the publishable key reads nothing
   from every table.
3. **The CV and JD bucket is private** (PRD Security 3, proposed). Files open only through
   `createSignedUrl(path, ≤ 300 s)` generated on the server. Signed URLs are never persisted.

There is no Supabase client in the browser, no CORS opened on the API routes, and no database call
from middleware.

### D2 — Which code may touch Supabase, and where AI calls run

| Component | Runs on | May reach Supabase? | May reach the AI provider? |
|---|---|---|---|
| Client components (`"use client"`) | Browser | **No** | **No** |
| Server Components | Vercel `sin1` | Yes, via `src/server/db` | No — they read stored results |
| Server Actions | Vercel `sin1` | Yes, via `src/server/db` | Yes, via `src/server/ai` |
| Route handlers under `/api/ai/*` | Vercel `sin1` | Yes, via `src/server/db` | Yes, via `src/server/ai` |
| `after()` background work | Vercel `sin1` | Yes | Yes |
| Seed and eval scripts | Dev machine or CI | Yes, with the secret key from env | Yes, through the app's own services |
| Middleware | Vercel edge | **No** | **No** |

Concretely:

- **Only `src/server/**` may hold a Supabase client or a provider package.** Every file there starts
  with `import "server-only"`, so a stray client-side import fails the build rather than shipping.
- **Only `src/server/ai/provider.ts` imports a provider package.** Everything else asks it for a
  model by role (`parse`, `match`, `gap`, `search`, `jd`, `embed`). See
  [ADR-0003](adr-0003-ai-provider.md).
- **AI work runs behind `/api/ai/*` route handlers, or in services called from Server Actions**, so
  it can be rate-limited **by path** — a Vercel firewall rule if the plan offers one, otherwise an
  app-level limiter backed by Supabase. [#175](https://github.com/dczii/URecruitment/issues/175)
  picks one and records which in its spec. With no sign-in, an unbounded AI route is an open
  invitation to run up the agency's bill.
- **No AI call happens on page load** (PRD main flow 2, proposed). Pages read stored results. This
  keeps pages fast and the monthly cost predictable.
- **Business rules never live in components.** Pure logic goes in `src/lib` (unit-tested); use-case
  logic goes in `src/server/services`.
- **The AI only suggests, at every one of these call sites.** No route handler, service, Server
  Action or `after()` job may reject, advance, shortlist or contact a candidate, or send anything to
  a client, on the strength of a model result. Every AI value a recruiter sees is labelled a
  suggestion and shows the CV or job text it came from. This is `CLAUDE.md` hard rule 1 and the PRD's
  first guardrail; [ADR-0003](adr-0003-ai-provider.md) C7 restates it at the provider boundary.

- **Paths are the layout `nextjs-app` proposes**, which that skill marks provisional until the
  scaffold task [#83](https://github.com/dczii/URecruitment/issues/83) (E01-S01-T01) confirms it. The
  **rule** — server-only code sits behind one boundary the browser cannot import — is what this
  record fixes; if #83 renames a directory, it updates the paths here and in
  [ADR-0003](adr-0003-ai-provider.md) C1.

### D3 — The rule a reviewer can check in one line

> **No browser code may import from `src/server`, and no browser code may reach Supabase or an AI
> provider directly.** Client components receive serialisable props from Server Components — never a
> Supabase client, never a secret, and never a raw database row carrying fields they do not render.

Enforced three ways: `import "server-only"` in every `src/server/**` file (build-time), the RLS
lock-down (runtime), and the review checklist in `security-check`.

### D4 — Where each main flow runs

The PRD names five main flows (all **proposed**). Each stage below says where it executes.

#### Flow 1 — Seeding

`npm run seed`, dev machine or CI, once.

| Stage | Runs on | Note |
|---|---|---|
| `list()` the public Vercel Blob store | Script | `BLOB_READ_WRITE_TOKEN` from env; **`list()` only**, never `put`, `copy` or `del` |
| Check each listed URL against `SEED_BLOB_BASE_URL`, download | Script | Downloads use the public URL, no token. Files go to a temp directory and are never committed |
| Classify CV vs JD, convert legacy `.doc` | Script | Serverless cannot run the converter, so the seed does it first |
| Upload to the **private** Supabase bucket | Script → Supabase | The app afterwards reads files only from there. The public blob URL is never stored |
| Parse → embed → score against every job | Script → app services → AI | **Through the real parser**, never a separate code path (PRD, decided) |
| Back-date stage entries | Script → Supabase | So all three delay statuses show from day one |

Volume: about 200 parsing calls and 1,000 scoring calls (20 jobs × 50 candidates), once.

#### Flow 2 — Opening a job

Server Component, `sin1`. Reads stored `match_scores`, `gap_flags` and
pipeline rows from Postgres. **No AI call.** The ranked list is stored output, shown with its model
version and date.

#### Flow 3 — Saving a job

Server Action, `sin1`. In order: validate with Zod → write a new immutable
`job_versions` row → run the gap check (one AI call) → **respond to the recruiter** → then
`after(() => rescoreJob(versionId))` re-scores up to 50 candidates in the background. Progress is
persisted per candidate in a runs table, so a failed run is retryable from the UI or the seed
([#150](https://github.com/dczii/URecruitment/issues/150)). Queue state lives **in Supabase**, not in
an external job service, because several managed job services keep run data in the US and CV text
would leave Singapore.

#### Flow 4 — Searching

Route handler or service, `sin1`. One AI call turns plain language into filters
plus search text; then **one** Postgres query combines the PGroonga keyword score, the pgvector
distance and the hard filters ([#153](https://github.com/dczii/URecruitment/issues/153)). Target:
under 3 seconds. Model output that becomes a filter is validated against allowed fields and value
types — it never becomes SQL.

#### Flow 5 — Delay status

A Postgres view, no scheduled job. `pipeline_status` derives On track / Due
soon / Overdue from the stage entry time, the limit hierarchy (job → client → default, **decided**)
and `sg_public_holidays`, counting **Mon–Fri Singapore local days** (**decided**). Due soon is
`used / limit ≥ 0.8` (**proposed**); end states and Placed have no status (**proposed**). The view is
`security_invoker` and revoked from `anon, authenticated`. A TypeScript mirror in `src/lib` shares
its test cases.

> **Why a view and not a cron job:** Vercel Hobby runs cron **once a day**, so a scheduled job could
> not keep delay status fresh. Deriving it on read is the free-tier-compatible answer, and it is
> always correct — including when a limit changes while candidates are already in a stage.

**Everything a recruiter sees about a delay stays on the dashboard. No email is ever sent** (PRD,
decided) — no alerts, no reminders, no consent requests.

### D5 — Layer choices, and which may be revisited

Every layer in the PRD's technical-choices table, with the status that tells a later task how much
room it has. **decided** = build as written; **proposed** = build as written, may be argued with a
reason recorded in the spec.

| Layer | Choice | PRD status | Note for later tasks |
|---|---|---|---|
| Design | pen.dev, `.pen` files in the repo | **decided** | Designs are authored only through the pencil MCP; readable mirrors live in `design/` |
| Frontend | Next.js App Router, TypeScript strict | **decided** | Server Components by default |
| UI components | Tailwind + shadcn/ui, themed from pen.dev tokens | **proposed** | No hard-coded colours or fonts; tokens only |
| Backend | Supabase Postgres, Storage, Edge Functions if needed | **decided** | No Edge Function is planned for the MVP |
| Hosting | Vercel, functions pinned to `sin1` | **decided** | `vercel.json` sets `"regions": ["sin1"]` and no other region |
| DB region | Supabase `ap-southeast-1` | **decided** | Both the dev and prod projects |
| Plans | Vercel Hobby, Supabase Free | **decided** | See the risk below — Hobby is non-commercial |
| Backups | None; rebuild from the seed | **decided** | Migrations + seed **are** the recovery plan |
| Email | None | **decided** | No mail library, no SMTP, no Resend. Ever |
| Search | pgvector (meaning) + PGroonga (EN/ZH keyword) | **proposed** | One hybrid SQL function, not two round trips |
| AI access | Vercel AI SDK | **proposed** | The provider behind it is **open** — [ADR-0003](adr-0003-ai-provider.md) |
| Monitoring | Vercel runtime logs + Sentry | **proposed** | Scrub `beforeSend`: no CV text, contact details or prompts |
| Testing | Vitest, Playwright, AI quality script | **proposed** | Logic is test-first; screens are tested at desktop **and** phone width |

Two layer choices carry an explicit warning:

- **Vercel Hobby forbids commercial use.** The MVP is a prototype on fictional data, which is fine.
  **Move to Pro before recruiters use the portal for real work.** This is a PRD risk, not a solved
  problem, and paid plans are an **open** question.
- **Supabase Free has no backups and pauses after a week idle.** Re-seeding is the recovery plan for
  the MVP only. Backups are an **open** question and are required before real data.

## Consequences

**What this makes easy**

- A reviewer can answer "may this file touch the database?" from its path alone.
- The AI provider can change without touching anything but `src/server/ai/provider.ts` and env vars.
- Data stays in Singapore end to end: `sin1` functions, `ap-southeast-1` database and storage, queue
  state in Supabase.
- Delay status is always correct and costs one query, with no background infrastructure.

**What this makes hard, on purpose**

- No client-side data fetching from Supabase, so lists paginate on the server and interactive screens
  pass serialisable props down.
- Re-scoring is eventually consistent: after a job save, scores catch up in `after()`. The UI must
  show progress and never present a stale score as current (see [ADR-0002](adr-0002-data-model.md)
  invariant 1).

**What every later task now owes**

1. New file under `src/server/**` → `import "server-only"` on line 1.
2. New table, view or function → RLS enabled, `revoke all … from anon, authenticated`, views
   `security_invoker`, in the **same** migration ([ADR-0002](adr-0002-data-model.md)).
3. New AI call → behind `/api/ai/*` or a service, rate-limited, spend-capped, and through the
   contract in [ADR-0003](adr-0003-ai-provider.md).
4. New env var → added to the Zod-validated env module and to `.env.example` (names only, no values).
   `NEXT_PUBLIC_` only for values that are safe in a public repo and a public browser.
5. Anything user-visible about time → stored UTC, displayed `Asia/Singapore` through the one helper.

**Accepted risk (fictional data only).** With no sign-in, anyone with the URL sees every CV in the
MVP. That is acceptable because the data is fictional. **Loading real CVs without sign-in or network
restriction would breach the PDPA Protection Obligation.** What must be in place before real data —
sign-in, consent recording, the retention job, a legal review — is an **open** PRD question with no
named owner. Nothing in this record resolves it.

## Rejected alternatives

| Alternative | Why not |
|---|---|
| **Browser talks to Supabase directly with a publishable key and RLS policies** | The normal Supabase pattern, and the reason it fails here is that there is no sign-in. RLS policies need a user identity to filter on; with none, any policy permissive enough to be useful exposes every CV to anyone with the URL. So: no public policies, and the server holds the only key. |
| **A scheduled job writes delay status into a column** | Vercel Hobby runs cron once a day, so the column would be stale for up to 24 hours, and a limit changed mid-stage would not take effect until the next run. A view is always correct and costs nothing. |
| **A managed queue (QStash, Inngest, a third-party worker) for re-scoring** | Several keep run data in the US, so CV text would leave Singapore — against the PDPA overseas-transfer position. `after()` plus a runs table in Supabase keeps state in region and retryable. |
| **Edge runtime for the AI routes** | Pinning to `sin1` on the Node runtime keeps execution in Singapore and keeps PDF/DOCX extraction libraries available. Edge would spread execution and restrict the runtime for no gain here. |
| **Email or Teams/WhatsApp alerts for overdue candidates** | The PRD rules out email entirely (decided); Teams and WhatsApp are explicitly "later". Delays surface on the dashboard, filterable by job owner. |
| **A separate Express/Nest API in front of Supabase** | A second deployable to run, secure and keep in `sin1`, for no benefit: Server Actions and route handlers already are the server tier. |
| **Paid plans from the start (Vercel Pro, Supabase Pro)** | The PRD fixes free tiers for the MVP (decided) and makes the upgrade a named trigger — before recruiters do real work. Building on free tiers also forces the constraints (a view instead of cron, re-seed instead of backups) to be designed in rather than discovered later. |
