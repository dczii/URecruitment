# Security baseline — a public, sign-in-less MVP

## Status

**Accepted** · 2026-09-17 · created by [#76](https://github.com/dczii/URecruitment/issues/76)
(story [#22](https://github.com/dczii/URecruitment/issues/22), epic
[#1](https://github.com/dczii/URecruitment/issues/1))

This is the security position the whole backlog inherits, and the checklist the `security-check`
skill reviews against. It says **what** must hold, **which task builds it** and **which test proves
it**. Implementation belongs to those tasks. When one of them lands, its PR ticks its row here.

The architecture it protects is [ADR-0001](../decisions/adr-0001-architecture.md), and the tables are
[ADR-0002](../decisions/adr-0002-data-model.md). The compliance side (PDPA, fair employment, accepted
risks) is in [../compliance/baseline.md](../compliance/baseline.md) and
[../compliance/risk-register.md](../compliance/risk-register.md).

## The exposure model

Three facts shape everything below.

1. **There is no sign-in.** The PRD decided it for the MVP: *"The MVP has no sign-in, confirmed on 17
   Sep 2026."* Anyone who has the URL can use every screen, read every CV and trigger every AI call.
   The PRD states the consequence itself: *"With no sign-in, the server is the only gate, so the
   database must be unreachable from the browser."*
2. **The repository is public** (`CLAUDE.md` hard rule 6). Anything committed, and anything written
   in an issue, a PR or a log that CI prints, is published.
3. **The data is fictional, but the controls are real.** They carry over unchanged to the real-data
   release. That release adds access protection on top of them
   ([E15, #16](https://github.com/dczii/URecruitment/issues/16)); it does not replace them.

What that means in practice:

| Surface | Treat it as | Consequence |
|---|---|---|
| **The production URL** | Public | Every page, Server Action and route handler is reachable by anyone. Nothing may rely on "nobody knows the URL" |
| **Preview deployments** | Exactly as public as production | Previews use the Supabase **dev** project with fictional data only, unless the plan offers deployment protection ([#92](https://github.com/dczii/URecruitment/issues/92) checks) |
| **Uploads** (a JD in the MVP) | Untrusted input from an anonymous caller | Type checked **by content**, size capped, stored privately under a UUID path, never served directly |
| **AI routes** | A way for a stranger to spend the agency's money | Every call is rate-limited and counted against a monthly cap **before** it reaches the provider |
| **Server Actions** | Public POST endpoints | Every action validates its input with Zod and requires the typed name where it writes an audited change |
| **Logs and error reports** | Readable by more people than the data | No CV text, contact details, prompts, model output or secrets in any log, Sentry event or `ai_runs.error` |
| **The typed name** | A label, not an identity | It records *who said they did it* (PRD *Users → 3*: *"Actions are tied to a typed name, not a verified person."*). It is never used to grant anything |

## The six PRD controls

The PRD lists six controls under *Security (suggested)*, which is **proposed** in this repo's
vocabulary ([../decisions/README.md](../decisions/README.md)). Controls 1–4 are also `CLAUDE.md` hard
rules 3 and 8, which makes them **binding** whatever their PRD status. Control 5 is the only thing
standing between an open URL and the AI bill. Control 6 is the real-data release.

| # | PRD control (verbatim) | Implementing task(s) | Proving test(s) |
|---|---|---|---|
| **C1** | *"The Supabase secret key lives only in Vercel environment variables. It bypasses Row Level Security, so it never reaches the browser or the repo."* | [#84](https://github.com/dczii/URecruitment/issues/84) E01-S01-T02 (server-only / public env split; guard against a `NEXT_PUBLIC_` secret) · [#88](https://github.com/dczii/URecruitment/issues/88) E01-S02-T02 (server-only client; bundle check) · [#92](https://github.com/dczii/URecruitment/issues/92) E01-S04-T01 (values set in Vercel, never committed) | `src/server/env.test.ts` (no secret in an error; server env not importable from client code) · `src/server/db.test.ts` (a client import fails) · `scripts/check-client-bundle.mjs` in `npm run build` or CI (no secret-key name in the client bundle) |
| **C2** | *"Row Level Security is on for every table, with no public policies. The publishable key can read nothing."* | [#109](https://github.com/dczii/URecruitment/issues/109)–[#112](https://github.com/dczii/URecruitment/issues/112) E03-S01-T01…T04 (RLS + revoke in the migration that creates each table) · [#115](https://github.com/dczii/URecruitment/issues/115) (holidays table) · [#113](https://github.com/dczii/URecruitment/issues/113) E03-S01-T05 (the proof) | `supabase/tests/rls.db.test.ts`: tables are **discovered from the catalogue**, and each must have RLS on, zero policies, and zero rows readable with the publishable key. A new table without RLS fails it automatically. Runs in `npm run test:db` and the CI DB job ([#91](https://github.com/dczii/URecruitment/issues/91)) |
| **C3** | *"CV files sit in a private bucket and open through short-lived signed links."* | [#114](https://github.com/dczii/URecruitment/issues/114) E03-S02-T01 (private bucket; server-side signing) · [#134](https://github.com/dczii/URecruitment/issues/134) E04-S05-T01 (profile requests the link on demand) | `supabase/tests/storage.db.test.ts` (the bucket is private, no public policy) · `src/server/storage.test.ts` (a URL expires; a path outside the bucket is refused; not importable from client code) · `e2e/candidate.spec.ts` (the original file opens through a link requested on demand) |
| **C4** | *"Stage and settings changes record the name the recruiter types. The name is remembered on the device."* | [#167](https://github.com/dczii/URecruitment/issues/167) E10-S03-T01 (the one validator; device persistence) · [#156](https://github.com/dczii/URecruitment/issues/156) E08-S01-T01 (stage moves) · [#165](https://github.com/dczii/URecruitment/issues/165), [#166](https://github.com/dczii/URecruitment/issues/166) (settings) · [#143](https://github.com/dczii/URecruitment/issues/143) (flag resolve) · [#132](https://github.com/dczii/URecruitment/issues/132) (profile overrides) | `src/lib/recruiter-name.test.ts` (blank, whitespace, over-long refused; persistence; change of name) · `src/server/audit/name.test.ts` (an audited write without a name fails; a new write path that skips the validator fails) · `src/server/pipeline/move.test.ts` (a move writes one `stage_events` row with the name) |
| **C5** | *"A Vercel firewall rule rate-limits the AI routes, and the AI provider has a monthly spend cap. Without sign-in, anyone with the link could otherwise run up AI costs."* | [#93](https://github.com/dczii/URecruitment/issues/93) E01-S04-T02 (one `/api/ai/*` prefix; the firewall rule or committed config; the provider-side cap procedure with an owner) · [#175](https://github.com/dczii/URecruitment/issues/175) E11-S04-T01 (app-side cap in `runAi()`; per-route app limit) | `src/server/ai/spend-cap.test.ts` (under cap proceeds; at cap refused and recorded; Singapore month boundary; non-AI pages still work) · the rate-limit test that #175's spec names · #93's recorded evidence of the rule (manual: config or dashboard screenshot, no secret) |
| **C6** | *"When sign-in is added, Supabase Auth with Microsoft sign-in fits the agency's Microsoft 365 setup. On Vercel Pro, password protection costs $20 a month per project and needs no code."* | **Not in the MVP.** Real-data release: [#16](https://github.com/dczii/URecruitment/issues/16) E15 *Access protection before real data* | Defined when E15 is planned. The deciding question is [OQ-1](../decisions/open-questions.md#oq-1--what-must-be-in-place-before-real-cvs-are-loaded) |

**About C5's firewall rule.** The PRD names a Vercel firewall rule. Whether the Hobby plan offers a
rate-limit rule for these paths is **checked by [#93](https://github.com/dczii/URecruitment/issues/93)**,
not assumed here. If it does not, [#175](https://github.com/dczii/URecruitment/issues/175)'s app-level
limiter backed by Supabase is the control, and #93 records which one is in force. **The app-side spend
cap is required either way**, because a rate limit bounds the speed of spending, not the total.

## The baseline controls every task inherits

These come from `security-check`, `supabase-db`, `nextjs-app` and `ai-pipeline`. They are not a
separate PRD list. Each row names where it is built and how it is proven. **"Gap"** marks a control
the backlog did not name a task for. This record assigns it, and the named task's spec must include it.

### Secrets and the public repository

| Control | Built in | Proven by |
|---|---|---|
| `.env*` is gitignored except `.env.example`, which holds **names only** | Repo root (already in `.gitignore`) · [#84](https://github.com/dczii/URecruitment/issues/84) (`.env.example`) · [#81](https://github.com/dczii/URecruitment/issues/81) (the inventory) | `git ls-files \| grep -E '(^\|/)\.env' \| grep -v '\.env\.example$'` returns nothing (`security-check` command) |
| No `NEXT_PUBLIC_` prefix on the Supabase secret key, any AI key or `BLOB_READ_WRITE_TOKEN` | [#84](https://github.com/dczii/URecruitment/issues/84) | #84's lint or build guard |
| No key, token, password or sample-data Blob URL in the diff, fixtures, docs, issues or logs | Every task | The `security-check` diff grep, run in every PR review |
| CI secrets exist only as GitHub Actions secrets. A job that needs one skips with a visible notice when it is absent (forks) | [#89](https://github.com/dczii/URecruitment/issues/89)–[#91](https://github.com/dczii/URecruitment/issues/91), [#174](https://github.com/dczii/URecruitment/issues/174) | Workflow review (`ci-setup` rules) |

### The sample-data Blob store (public, seed source only)

The store is **public**: any file in it is readable by anyone who knows its URL. The file names are
guessable, so **the base URL is the only thing keeping the files obscure**. That makes it
secret-like, even though it is not a credential.

| Control | Built in | Proven by |
|---|---|---|
| The store is the **seed source only**. The app keeps originals in the private Supabase bucket (C3) | [#120](https://github.com/dczii/URecruitment/issues/120) (re-upload to Storage) | `cv_files` stores the Storage path and `source_ref` (the pathname), **never** the blob URL ([ADR-0002](../decisions/adr-0002-data-model.md)) |
| `SEED_BLOB_BASE_URL` and `BLOB_READ_WRITE_TOKEN` are read **by name** from the environment and are **never committed**: not in `.env.example` values, docs, fixtures, issues or logs | [#117](https://github.com/dczii/URecruitment/issues/117) | `scripts/seed/env.test.ts` (a missing variable aborts with its **name** and no value) |
| Every listed blob URL must start with `SEED_BLOB_BASE_URL`, or the seed aborts (wrong token, wrong store) | [#117](https://github.com/dczii/URecruitment/issues/117) | `scripts/seed/env.test.ts` (a wrong-store abort) |
| The seed and the eval only `list()` and download. They **never** `put`, `copy` or `del` | [#117](https://github.com/dczii/URecruitment/issues/117), [#118](https://github.com/dczii/URecruitment/issues/118), [#173](https://github.com/dczii/URecruitment/issues/173) | A hard rule in code and comment; PR review |
| App runtime code under `src/` never imports `@vercel/blob` | [#117](https://github.com/dczii/URecruitment/issues/117) | #117's lint or test check fails on such an import |
| **Nothing real is ever uploaded to the store**, not even for testing | Everyone | Process rule; the store's contents are listed by the seed report ([#123](https://github.com/dczii/URecruitment/issues/123)) |
| Downloaded files live only in the gitignored `.seed-cache/` | [#118](https://github.com/dczii/URecruitment/issues/118) | `.gitignore` (already present); #118's done-when |

### Data access

| Control | Built in | Proven by |
|---|---|---|
| Supabase is called **only** from `src/server/**`, and each file there starts with `import "server-only"` | [#83](https://github.com/dczii/URecruitment/issues/83) (layout) · [#88](https://github.com/dczii/URecruitment/issues/88) (client) | #88's client-import test; the `security-check` grep for client files importing server code |
| New tables, views and functions: RLS on, `revoke all … from anon, authenticated`, views `security_invoker`, `security definer` only with a pinned `search_path` | Every E03+ migration | C2's dynamic test; migration review (`supabase-db`) |
| Signed URLs are created on the server, last **≤ 300 s**, and are never persisted or embedded in page HTML for long | [#114](https://github.com/dczii/URecruitment/issues/114), [#134](https://github.com/dczii/URecruitment/issues/134) | C3's tests |
| Components receive only the fields they render. Client components never import `src/server` | Every UI task | `ui-build` rule 9; PR review |

### Input handling

| Control | Built in | Proven by |
|---|---|---|
| Every Server Action and route handler validates input with **Zod** and returns typed errors with **no stack traces** | Every task that adds one (`nextjs-app`) | That task's unit tests; PR review |
| Uploads: PDF/DOCX only, checked by **magic bytes** (not only the extension); ≤ **50 MB** (Supabase Free cap); filename sanitised; storage path uses a UUID | [#114](https://github.com/dczii/URecruitment/issues/114) (helper) · [#139](https://github.com/dczii/URecruitment/issues/139) (JD upload) | `src/server/storage.test.ts` (type and size refusals); `src/server/jobs/extract.test.ts` (an unsupported file is rejected with a reason) |
| No `dangerouslySetInnerHTML` with CV, JD or AI text | Every UI task | PR review grep |

### AI calls

| Control | Built in | Proven by |
|---|---|---|
| Every call goes through `runAi()`, which validates output against the schema and writes `ai_runs` | [#169](https://github.com/dczii/URecruitment/issues/169) | `src/server/ai/run.test.ts`, including the test that fails on an AI call made outside the wrapper |
| CV and JD text is passed as **delimited data**. Model output is **never executed**: no tool calls, no URL fetching, no SQL built from model text except through parameterised filters | [#169](https://github.com/dczii/URecruitment/issues/169) and every prompt task ([#126](https://github.com/dczii/URecruitment/issues/126), [#138](https://github.com/dczii/URecruitment/issues/138), [#141](https://github.com/dczii/URecruitment/issues/141), [#146](https://github.com/dczii/URecruitment/issues/146), [#152](https://github.com/dczii/URecruitment/issues/152)) | Prompt-injection fixtures in those tasks' tests ([ADR-0003](../decisions/adr-0003-ai-provider.md) C7) |
| Model output that becomes a search filter is validated against allowed fields and value types | [#152](https://github.com/dczii/URecruitment/issues/152), [#153](https://github.com/dczii/URecruitment/issues/153) | Their filter-schema tests |
| AI routes live under **one** prefix, `/api/ai/*`, and are rate-limited (C5) | [#93](https://github.com/dczii/URecruitment/issues/93) | #93's done-when |

### Transport and headers

| Control | Built in | Proven by |
|---|---|---|
| Security headers in `next.config`: **CSP** (no inline scripts unless nonce'd), `frame-ancestors 'none'`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`, `Permissions-Policy` | **Gap, assigned to [#83](https://github.com/dczii/URecruitment/issues/83)** (the scaffold creates `next.config.ts`). Sentry ([#86](https://github.com/dczii/URecruitment/issues/86)) must extend the CSP for its ingest host rather than loosen it | A test or e2e assertion that a page response carries each header (named in #83's spec) |
| No CORS opened on API routes | Every route task | PR review |
| HTTPS only | Vercel (platform default) | n/a |

### Logging and monitoring

| Control | Built in | Proven by |
|---|---|---|
| Sentry and console logs contain no CV text, contact details, AI prompts or outputs, or secret-shaped values. `beforeSend` scrubs them | [#86](https://github.com/dczii/URecruitment/issues/86) | `src/lib/sentry-scrub.test.ts` (a name, an email, CV text and a key-shaped string are removed) |
| `ai_runs.error` holds messages, not payloads | [#169](https://github.com/dczii/URecruitment/issues/169) | `src/server/ai/run.test.ts` (failure rows) |
| Changes are traceable: `stage_events`, `settings_log` and `ai_runs` are append-only records | [#112](https://github.com/dczii/URecruitment/issues/112), [#169](https://github.com/dczii/URecruitment/issues/169) | Their DB and unit tests. **Read** access is not logged in the MVP; see the compliance baseline |

### Dependencies

| Control | Built in | Proven by |
|---|---|---|
| `package-lock.json` is committed; installs use `npm ci` | [#83](https://github.com/dczii/URecruitment/issues/83), [#89](https://github.com/dczii/URecruitment/issues/89) | CI |
| `npm audit --omit=dev` shows no high or critical finding, or each exception is written down | **Gap, assigned to [#89](https://github.com/dczii/URecruitment/issues/89)** (the PR checks workflow) | The CI step's output |
| A new dependency is listed in its task's plan, maintained, and licence-compatible | Every task | PR review (`pr-review` scope check) |

### Deployment exposure and cost

| Control | Built in | Proven by |
|---|---|---|
| Functions pinned to **`sin1`**; Supabase in **`ap-southeast-1`** | [#83](https://github.com/dczii/URecruitment/issues/83) (`vercel.json`), [#92](https://github.com/dczii/URecruitment/issues/92) | Committed config; the preview reports `sin1` |
| Previews use the **dev** Supabase project and fictional data only | [#92](https://github.com/dczii/URecruitment/issues/92), [#81](https://github.com/dczii/URecruitment/issues/81) | The env var inventory and Vercel settings note |
| Agents never deploy to production, change platform settings, rotate keys, or run migrations or seeds against a remote project unless the user asks in that session | Everyone (`release-deploy`) | Process rule |
| Vercel Hobby is non-commercial only: flag it, do not fix it | [#92](https://github.com/dczii/URecruitment/issues/92), [#179](https://github.com/dczii/URecruitment/issues/179) | [RC-3](../decisions/open-questions.md#rc-3--vercel-hobby-and-commercial-use) in the open-questions register |

## What must change before real CVs are loaded

Everything above stays in place. The real-data release must **add** at least the following. Which
items are required, and in what form, is the open question
[OQ-1](../decisions/open-questions.md#oq-1--what-must-be-in-place-before-real-cvs-are-loaded). It is
**not** settled here.

1. **Access protection.** Sign-in (Supabase Auth with Microsoft sign-in is the PRD's suggested fit)
   or office-network-only access, so the URL alone no longer opens every CV. This is the **hardest
   prerequisite**: [E15, #16](https://github.com/dczii/URecruitment/issues/16) says nothing in the
   real-data release starts before it is decided. *A note for E15, not a decision:* once identities
   exist, audit rows would naturally record the signed-in user rather than a typed name (C4).
2. **Access logging,** so a breach's scope can be assessed. The PRD proposes it under breach
   notification, and [E14, #15](https://github.com/dczii/URecruitment/issues/15) covers it.
3. **Preview protection or separation,** so previews cannot expose real data. Previews must never
   point at a project holding real CVs.
4. **Backups** and a paid plan that permits commercial use
   ([OQ-2](../decisions/open-questions.md#oq-2--which-paid-plans-to-move-to),
   [OQ-3](../decisions/open-questions.md#oq-3--how-backups-work-and-how-long-they-are-kept);
   [E17, #18](https://github.com/dczii/URecruitment/issues/18)).
5. **A provider data-processing assessment,** because PDPA overseas-transfer rules apply if real CVs
   are processed outside Singapore ([ADR-0003](../decisions/adr-0003-ai-provider.md) D3 criterion 3).
6. **A review of the rate limit and spend cap** against real usage (6–20 recruiters, under 1,000 CVs a
   month).
7. **Real intake channels** (upload, email, OneDrive) are new untrusted inputs. Each gets the upload
   controls above before it is switched on ([E13, #14](https://github.com/dczii/URecruitment/issues/14)).

## Out of scope

- Implementing any control; the tasks named above do that.
- Designing sign-in (E15).
- Penetration testing.
