# Spec — #19 The team builds from one written architecture and data-model record

| | |
|---|---|
| Issue | https://github.com/dczii/URecruitment/issues/19 (Story) |
| Tasks | #71 (E00-S01-T01), #72 (E00-S01-T02), #73 (E00-S01-T03) |
| Parent | Story #19 → Epic #1 "Decisions, architecture & delivery plan" |
| Milestone | MVP |
| Branch | `docs/19-architecture-decision-records` |
| Created | 2026-09-17 |
| Status | In progress <!-- Planned → In progress → In review --> |

## Problem

The PRD (17 Sep 2026) *suggests* a technical shape — Next.js on Vercel `sin1`, Supabase in
`ap-southeast-1`, server-only data access, seventeen tables, an AI provider the dev team still has
to pick. Nothing in the repository records which of those suggestions the team has adopted, which
are still open to revision, or which rules a later task may not quietly break. Every downstream
epic (scaffold, migrations, parsing, matching, search) would otherwise re-derive the same
boundaries from a PDF, and each would be free to re-derive them differently. With the MVP due
mid-December 2026, rework caused by unrecorded assumptions is the delivery risk this story removes.

Three decision records fix that, and the rest of the backlog cites them instead of the PDF.

## PRD references

| PRD section | Item | Status |
|---|---|---|
| Technical choices → Frontend / Backend / Hosting / DB region / Plans / Backups / Email / Design | Next.js App Router + TS; Supabase Postgres, Storage, Edge Functions; Vercel `sin1`; Supabase `ap-southeast-1`; Vercel Hobby + Supabase Free; no backups; no email; pen.dev | **decided** |
| Technical choices → UI components / Search / AI access / Monitoring / Testing | Tailwind + shadcn/ui; pgvector + PGroonga; Vercel AI SDK; Vercel logs + Sentry; Vitest + Playwright + AI quality script | **proposed** |
| Security (suggested) → 1–6 | Secret key server-only; RLS everywhere, no public policies; private bucket + short-lived signed links; typed name; rate limit + spend cap | **proposed** |
| Data model (suggested) | Seventeen core tables; scores keyed to **candidate × job version × model version**; recruiter edits stored separately; every AI call recorded in `ai_runs`; UTC stored, Singapore shown | **proposed** |
| Main flows | Seeding; opening a job (no AI call on page load); saving a job (new version → gap check → `after()` re-score); searching (one hybrid query); delay status from a **database view**, no scheduled job | **proposed** |
| Pipeline tracking → Time limits | Limits count working days Mon–Fri minus Singapore public holidays; job limit > client limit > default | **decided** |
| AI governance → 6 | The dev team picks the provider, weighing Simplified Chinese quality, cost and **where data is processed** | **decided** |
| Integrations → AI model provider | Provider still to decide | **open** |
| Data, privacy & compliance → Overseas transfer | Hosting stays in SG; a provider processing abroad must protect data to a comparable standard | **decided** |
| Free-tier limits | Hobby is non-commercial, one region, cron once a day; Supabase Free pauses after 1 week idle, 500 MB DB / 1 GB storage / 50 MB per file, no backups | **decided** |
| Open questions → 1, 2, 3 | Sign-in before real data; paid plans; backups | **open** |

## Scope

**In scope**

- `docs/decisions/README.md` — what an ADR is here, the status vocabulary, the index, and how to supersede one.
- `docs/decisions/adr-0001-architecture.md` — the trust boundary (browser → Next.js server → Supabase/AI), where each of the five PRD main flows runs, every layer of the PRD technical-choices table with its decided/proposed status, and the rule that no browser code may import `src/server` or reach Supabase directly. Context / decision / consequences / rejected alternatives.
- `docs/decisions/adr-0002-data-model.md` — the seventeen tables, each with its purpose, MVP-or-later standing and owning migration task; the four invariants, each quoted to its PRD line; where the mechanics reference lives.
- `docs/decisions/adr-0003-ai-provider.md` — the decision recorded as **open**, its criteria, the provider-agnostic contract every AI call must satisfy, what the MVP needs from a provider, the decision-owner slot, what unblocks it, and the tasks it blocks.

**Out of scope**

- Folder-level code layout — that is the scaffold task #83 (E01-S01-T01).
- Any SQL, migration, RLS policy text, index or extension choice beyond naming pgvector and PGroonga — that is E03 (#109–#123).
- Choosing an AI provider. ADR-0003 must **not** settle it.
- Writing `runAi()` (#169) or any prompt (#126, #138, #141, #146, #152).
- Contracting, billing or key provisioning.
- Any application code, `package.json` or test runner. The repository is deliberately unscaffolded until #83.

## Acceptance criteria

- [ ] **AC1** — Given a new contributor, when they read `docs/decisions/adr-0001-architecture.md`, then they can name which code may touch Supabase (`src/server/**` only, with the secret key), where AI calls run (server-side, `sin1`, under `/api/ai/*` or services called from Server Actions) and why the browser never reaches the database (no sign-in exists, so RLS locks every table and the server is the only gate). _Proved by:_ manual — `V4` heading check, plus the three answers being present verbatim.
- [ ] **AC2** — Given the seventeen-table data model, when a schema task starts, then `docs/decisions/adr-0002-data-model.md` already states each table's purpose, its owning migration task and the score key (candidate × job version × model version). _Proved by:_ `V5` — all seventeen PRD table names appear, each with an owning task key.
- [ ] **AC3** — Given the AI provider is not chosen, when any AI code is planned, then `docs/decisions/adr-0003-ai-provider.md` states the provider-agnostic contract every AI call must satisfy and records the decision as **open**. _Proved by:_ `V6` and `V7` — status line reads `open`, and no provider brand appears as a decision.
- [ ] **AC4** — Given ADR-0001, when a reader looks for the runtime shape, then all five PRD main flows (seeding, opening a job, saving a job, searching, delay status) are described with where each stage runs. _Proved by:_ `V4`.
- [ ] **AC5** — Given ADR-0001, when a later task wants to revisit a layer choice, then every layer in the PRD technical-choices table appears with its **decided** or **proposed** status. _Proved by:_ `V4` — thirteen layer rows present with a status column.
- [ ] **AC6** — Given ADR-0001, when a reviewer checks the boundary rule, then the record states that no browser code may import `src/server` or reach Supabase directly. _Proved by:_ `V4`.
- [ ] **AC7** — Given ADR-0002, when a schema task starts, then each of the seventeen tables is marked MVP or real-data-release, and any table the MVP does not populate is marked as such. _Proved by:_ `V5`.
- [ ] **AC8** — Given ADR-0002, when a later task changes scoring or parsing, then the four invariants (score key; overrides separate from parsed fields; every AI output row joins to `ai_runs`; UTC stored, Singapore shown) are stated as rules, each with the PRD line it comes from. _Proved by:_ `V5`.
- [ ] **AC9** — Given ADR-0003, when a task is blocked on the provider decision, then the record links those tasks and names the decision-owner slot and what unblocks it. _Proved by:_ `V6`.
- [ ] **AC10** — Given the whole change, when CI or a reviewer inspects it, then only files under `docs/` changed and every relative Markdown link resolves to a file that exists. _Proved by:_ `V1`, `V2`, `V3`.

## Guardrails that apply

- [x] **AI only suggests: no auto reject/advance/shortlist/contact** — ADR-0001 and ADR-0003 both restate it; ADR-0003's contract forbids tool calls and any action taken from model output.
- [x] **No email sent** — ADR-0001 records "Email: none" as a decided layer and notes that delay alerts are dashboard queries.
- [x] **Server-only data access; secret key never reaches the browser** — the central subject of ADR-0001's trust boundary section.
- [x] **RLS on new tables, no public policies; private Storage + signed URLs** — stated in ADR-0001 as the boundary's enforcement and carried into ADR-0002 as a per-table obligation on the owning migration.
- [x] **AI output schema-validated, logged to `ai_runs`, shows source text** — ADR-0003's contract clauses C2, C4 and C6; ADR-0002 invariant 3.
- [x] **Protected attributes ignored; nationality/language only with a written reason** — ADR-0003 contract clause C5 (redaction in code, before the provider boundary) and ADR-0002's `job_versions` row.
- [x] **UTC stored, SGT shown; SG working days** — ADR-0002 invariant 4 and the `sg_public_holidays` row; ADR-0001's delay-status flow.
- [ ] Typed recruiter name recorded on stage/settings changes — *recorded* in ADR-0002 (`stage_events`, `settings_log`) but no code here enforces it.
- [ ] Works at phone width; status not colour-only; Chinese text renders — no UI in this change.
- [x] **Fictional data only; no secrets or sample-data Blob URLs committed** — the records name `SEED_BLOB_BASE_URL` and `BLOB_READ_WRITE_TOKEN` by variable name only, never a value or a `*.public.blob.vercel-storage.com` URL.
- [x] **Free-tier limits respected (no frequent cron, file ≤ 50 MB)** — ADR-0001 records the Hobby one-region/one-cron-a-day constraint as the *reason* delay status is a database view, and the 50 MB Supabase file cap.

## UX / design

n/a — documentation only. No `.pen` frame, no screen.

## Data / API changes

None. No migration, no table, no view, no Server Action, no route handler. ADR-0002 *describes* tables that E03 (#109–#123) will create.

## Assumptions

- **A1 — The story ships as one change, not three.** The skill's intake rule takes the first unblocked task from a story; the user asked for the story. #72 and #73 both depend only on #71, all three are documentation, and the story's three acceptance criteria map 1:1 to them, so splitting would produce three PRs that only make sense read together. One branch, one PR, all three ADRs. Reversible: the three files are independent.
- **A2 — Claude writes all steps, not `cursor-agent`.** Every one of the three task issues carries `Executor hint: claude (judgment-heavy)`. These records restate the PRD, and their value is that every claim is traceable to a PRD line; an executor that cannot load `prd-context` would have to be fed the whole PRD and could not be checked cheaply for invented claims.
- **A3 — All seventeen tables are MVP tables.** Nothing in the PRD names a table that only the real-data release creates. What is deferred is *column-level*: `candidates.consent_status/consent_date/consent_method/last_activity_at` exist from the first migration and stay unwritten until the real-data release. ADR-0002 says this explicitly rather than leaving AC7 to look unmet.
- **A4 — `placements` counts as an MVP table.** Start-date confirmation and the 30-day guarantee are decided MVP scope. Whether the seed back-dates any sample candidate as far as Placed is settled by #121 (E03-S04-T05), not here; ADR-0002 records the table as MVP and points at that task.
- **A5 — Owning migrations are taken from the existing E03 backlog**, which already partitions the tables across #109–#112, plus #115 for `sg_public_holidays`. ADR-0002 cites those task keys rather than inventing a new partition.
- **A6 — Stage limit values are not restated as settled.** `pipeline-rules.md` flags the PRD table as partly garbled around Screening and Shortlisted. ADR-0002 names `stage_limits` and the hierarchy rule (decided) but does not fix the day counts; that stays with the task that seeds them.
- **A7 — "No AI call on page load" is recorded as a decided consequence of the PRD's cost and speed goals**, though the PRD lists it under a suggested flow. It is marked proposed in ADR-0001, matching the PRD.
- **A8 — No test runner is added.** Verification is a set of shell checks (V1–V7) run by Claude and pasted into the Outcome. Adding `package.json` and Vitest to test three Markdown files would pre-empt the scaffold task #83 and contradict this task's "docs only, no app code" verification line.

## Open questions

These are PRD **open** items the records touch. All three are recorded as open and none is settled here.

- **The AI provider.** ADR-0003 exists to hold it open with a contract, criteria and an owner slot. No brand is chosen. (PRD: Integrations → AI model provider.)
- **What must be in place before real CVs load** — sign-in, consent recording, the retention job, a legal review. ADR-0001 records the no-sign-in risk as accepted *for fictional data only*, and points at the open question rather than resolving it. (PRD: Open questions → 1.)
- **Which paid plans, and how backups work.** ADR-0001 records Hobby's non-commercial limit as a risk with a named trigger (before recruiters do real work), not as a solved problem. (PRD: Open questions → 2, 3.)
