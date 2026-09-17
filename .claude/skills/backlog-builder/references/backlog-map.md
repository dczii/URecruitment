# Backlog map

Keys are stable and never renumbered. Add new items with the next free number.

**Line format:**
- **Epic:** `KEY — Title · labels · milestone`
- **Story:** `KEY — Title · labels`
- **Task:** `KEY — Title [executor] (flags)`, where flags use `P` = prd:proposed, `D?` = needs-decision, `TF` = test-first.

Stories inherit the milestone and `area:*` labels of their epic unless they say otherwise. Tasks inherit from their story.

---

## Milestone: MVP

### E01 — Foundation & delivery · area:foundation, area:release · MVP

- **E01-S01 — Developers can run the app locally and it deploys to Vercel sin1**
  - T01 Scaffold Next.js App Router + TypeScript strict + Tailwind + shadcn/ui init, npm scripts per CLAUDE.md [grok]
  - T02 Env schema (Zod) with server-only/public split, `.env.example`, `server-only` data layer folder [grok] (TF)
  - T03 Vitest + Playwright setup with desktop and phone projects, one smoke test each [grok]
  - T04 Sentry for server and client errors, no PII in events [grok]
- **E01-S02 — Supabase dev and prod projects are wired to the app**
  - T01 Supabase CLI init, migrations folder, local stack, generated DB types [grok]
  - T02 Server-side Supabase client using the secret key only on the server [grok] (TF)
- **E01-S03 — Every PR runs CI checks** · area:release
  - T01 GitHub Actions: lint, typecheck, unit tests, build [grok]
  - T02 Playwright job against the Vercel preview URL [grok]
  - T03 Migrations applied by the Supabase CLI in CI (dev project) [grok]
- **E01-S04 — Previews and production deploy safely** · area:release
  - T01 Vercel project: region sin1, env vars per environment, preview per PR [claude] (D? Hobby non-commercial)
  - T02 Vercel firewall rate limit on AI routes; document the provider spend cap [grok]

### E02 — Design system & screens · area:design-system · MVP

- **E02-S01 — The portal has one visual language defined as tokens**
  - T01 Define colour, type (incl. Noto Sans SC), spacing and radius tokens in `design/tokens.pen` [claude]
  - T02 Map tokens to the Tailwind theme + shadcn CSS variables, light and dark [grok]
- **E02-S02 — Recruiters can navigate on desktop and phone**
  - T01 Design the app shell + navigation, desktop and phone [claude]
  - T02 Build the app shell layout and navigation [grok]
- **E02-S03 — Shared patterns make AI results and delays unambiguous**
  - T01 Design the patterns: AI-suggestion label + source text, delay status badge (word/icon + colour), typed-name prompt, empty/loading/error states [claude]
  - T02 Build `AiSuggestion`, `SourceQuote`, `DelayStatusBadge`, `TypedNameDialog`, state components with unit tests [grok] (TF)
- **E02-S04 — Every MVP screen has an approved design**
  - T01 Design Dashboard [claude]
  - T02 Design Jobs list + Job detail [claude]
  - T03 Design Job form (incl. JD upload, must-have/nice-to-have, nationality/language reason) [claude]
  - T04 Design Candidate search + Candidate profile [claude]
  - T05 Design Pipeline board (phone-first) [claude]
  - T06 Design Placements + Settings [claude]
  - T07 Design the CV review queue (implied by the PRD) [claude] (D?)

### E03 — Data foundation & seed · area:data · MVP

- **E03-S01 — The core schema exists with RLS locked down**
  - T01 Migration: clients, jobs, job_versions, gap_flags [grok]
  - T02 Migration: candidates, cv_files, candidate_profiles (recruiter overrides separate), candidate_skills [grok]
  - T03 Migration: embeddings (pgvector), match_scores keyed by job version + model version [grok]
  - T04 Migration: pipeline_entries, stage_events, stage_limits, placements, settings_log, ai_runs [grok]
  - T05 RLS on every table with no public policies + a test proving the publishable key reads nothing [grok] (TF)
- **E03-S02 — CV files are stored privately**
  - T01 Private bucket + server helper for short-lived signed URLs [grok] (TF)
- **E03-S03 — Working days follow the Singapore calendar**
  - T01 `sg_public_holidays` table + seed for the relevant years [grok]
  - T02 Working-day functions (SQL + TS mirror) with edge-case tests [grok] (TF)
- **E03-S04 — Developers can rebuild all sample data from Drive**
  - T01 Choose and document the Drive auth method; env vars only [claude] (D?)
  - T02 Seed step: list/download the Drive folder, count by language/type, convert `.doc` [grok]
  - T03 Seed step: upload to Storage → parse → embed → load jobs → gap check → score [grok]
  - T04 Seed step: back-dated pipeline entries that cover on track / due soon / overdue [grok] (P)
  - T05 Idempotent re-run + reset command [grok] (TF)

### E04 — CV processing · area:cv-processing · MVP

- **E04-S01 — Text-based CVs are read; scanned ones are rejected clearly**
  - T01 PDF + DOCX text extraction on the server, with an image-only detector [grok] (TF)
  - T02 Rejection reasons + messages stored on cv_files [grok]
- **E04-S02 — The AI fills the approved profile fields with their source text**
  - T01 Parse schema (Zod) + prompt v1 for EN and ZH [claude] (see ai-prompts)
  - T02 Parse service: one call per CV, schema validation, ai_runs logging, total years computed from work history [grok] (TF)
  - T03 Chinese PDF fallback: send the PDF itself when extraction quality is poor [grok]
  - T04 Meet < 30 s per CV; timing captured in ai_runs [grok]
- **E04-S03 — Failed parses land in a review queue** · prd:proposed
  - T01 Review queue data + retry action [grok] (P)
  - T02 Review queue screen [grok] (P, D?)
- **E04-S04 — Recruiters correct parsed fields and keep their edits** · prd:proposed
  - T01 Override storage + merge logic (edits win over re-parse) [grok] (TF, P)
  - T02 Edit mode on the profile, with typed name [grok] (P)
- **E04-S05 — Recruiters check one candidate on a profile page**
  - T01 Candidate profile screen: fields with source text, original file link, stage history [grok]

### E05 — Jobs & gap check · area:jobs, area:gap-check · MVP

- **E05-S01 — Recruiters create and edit client jobs** · area:jobs
  - T01 Job form + server action: owner name, client, must-have/nice-to-have, nationality/language only with reason [grok] (TF)
  - T02 Job versioning: every save creates job_versions [grok] (TF)
  - T03 Jobs list + Job detail screens [grok]
- **E05-S02 — An uploaded JD pre-fills the job form** · area:jobs
  - T01 JD extraction prompt + schema [claude]
  - T02 Upload → extract → pre-filled form for the recruiter to confirm [grok]
- **E05-S03 — Missing information is flagged with a question for the client** · area:gap-check
  - T01 Code rules for missing fields (salary range, location/work arrangement, employment type, headcount, start date, must-have skills, interview steps) [grok] (TF)
- **E05-S04 — Uncertain, conflicting and unfair requirements are flagged** · area:gap-check, prd:proposed
  - T01 Gap-check prompt + schema (uncertain, conflicting, fair-employment) with why-it-matters and a client question [claude] (P)
  - T02 Gap-check service: one call per save, ai_runs logging, evidence quotes [grok] (P)
- **E05-S05 — Recruiters resolve or dismiss flags without blocking matching** · area:gap-check
  - T01 Resolve/dismiss with note + typed name [grok] (P)
  - T02 Open-flag banner on the job; matching never blocked [grok]

### E06 — Job matching · area:matching · MVP

- **E06-S01 — CVs and jobs have multilingual embeddings**
  - T01 Embedding service behind a provider-agnostic interface; model id stored [grok] (TF)
- **E06-S02 — Each shortlisted-by-similarity candidate gets a fair, explained score**
  - T01 Match prompt + schema: score 0–100, matched/missing/uncertain skills with CV quotes [claude]
  - T02 Retrieval: filters → top 50 by vector similarity [grok] (TF)
  - T03 Scoring service with the protected-attribute exclusion + must-have cap [grok] (TF, P)
  - T04 Scores keyed to job version + model version; stale scores never shown [grok] (TF)
- **E06-S03 — Saving a job re-scores in the background** · prd:proposed
  - T01 `after()` re-score with a retryable runs table [grok] (P)
- **E06-S04 — Recruiters review ranked matches**
  - T01 Ranked list on Job detail: sort/filter, reasons, model version + date, suggestion label, add-to-pipeline [grok]

### E07 — Talent search · area:search · MVP · prd:proposed

- **E07-S01 — Recruiters search in plain language**
  - T01 Query → filters + search-text prompt + schema [claude] (P)
  - T02 Hybrid SQL (PGroonga + pgvector + filters) in one query, < 3 s [grok] (TF, P)
- **E07-S02 — Recruiters filter and see CV freshness**
  - T01 Search screen: filters (skills, years, location, language, CV date), last-updated date [grok] (P)
- **E07-S03 — Searching from a job ranks by match score**
  - T01 Job-scoped search reuses match scores and reasons [grok] (P)

### E08 — Pipeline & delays · area:pipeline, area:dashboard · MVP

- **E08-S01 — Recruiters move candidates through stages with an audit trail** · area:pipeline
  - T01 Stage model: 7 stages + 3 end states; move action writes stage_events with typed name [grok] (TF)
- **E08-S02 — Delay status is computed from Singapore working days** · area:pipeline
  - T01 Limit resolution: job > client > default [grok] (TF)
  - T02 Status view: on track / due soon (≥ 80%) / overdue, days over, waiting on [grok] (TF, P)
  - T03 Confirm the default limit table with the owner (Screening 3 / Shortlisted 2) [claude] (D?)
- **E08-S03 — Recruiters work the pipeline board, even on a phone** · area:pipeline
  - T01 Pipeline board: columns per stage, status word/icon + colour, typed-name prompt on move [grok]
- **E08-S04 — The dashboard shows what needs attention** · area:dashboard
  - T01 Dashboard: overdue by days over, due soon, guarantee end dates; filters for client, job, stage, owner [grok] (P)

### E09 — Placements · area:placements · MVP

- **E09-S01 — Recruiters confirm start dates and track the guarantee**
  - T01 Placement record: start date check, guarantee end from the client's period (default 30 days) [grok] (TF)
  - T02 Dashboard flag 5 working days before the guarantee ends [grok] (TF, P)
  - T03 Placements screen with countdown [grok]

### E10 — Settings & audit · area:settings · MVP

- **E10-S01 — Recruiters adjust stage limits at every level**
  - T01 Settings screen: default/client/job limits, settings_log with typed name [grok]
- **E10-S02 — Recruiters maintain public holidays**
  - T01 Holidays list + add/remove with log [grok]
- **E10-S03 — Every change is tied to a typed name**
  - T01 Name prompt before the first change on a device; name remembered locally [grok] (TF)
  - T02 Change log view [grok]

### E11 — AI governance & quality · area:ai-governance, area:compliance · MVP

- **E11-S01 — Every AI call is traceable** · area:ai-governance
  - T01 `ai_runs` writer used by every AI service: input ref, model, version, output, cost, duration [grok] (TF)
- **E11-S02 — The answer key is ready and human-verified** · area:ai-governance
  - T01 Draft the answer key for parsed fields (per CV) [claude]
  - T02 Draft the expected top-5 per job [claude]
  - T03 Recruiter verification workflow + `verified` flag [grok]
- **E11-S03 — Releases are gated by the quality bar** · area:ai-governance
  - T01 `npm run eval`: field accuracy ≥ 90%, top-5 agreement ≥ 80%, EN and ZH separately, JSON + Markdown report [grok] (TF)
  - T02 Run the eval in CI on changes to prompts/parser/matcher [grok]
- **E11-S04 — AI costs can't run away** · area:ai-governance
  - T01 Per-route rate limit + monthly spend cap check [grok]
- **E11-S05 — Scoring and flags pass a fairness review** · area:compliance
  - T01 Compliance review against the PRD + Model AI Governance Framework; findings as issues [claude]

### E12 — MVP launch & feedback · area:release · MVP

- **E12-S01 — The MVP is live for recruiter sessions**
  - T01 Production deploy + re-seed runbook [claude]
  - T02 Keep-alive guidance for the Supabase Free pause [claude]
- **E12-S02 — Recruiters grade the AI and give feedback**
  - T01 Grading session guide + feedback capture template [claude]
- **E12-S03 — The team makes a go/no-go decision**
  - T01 Go/no-go pack: quality results (EN/ZH), feedback, open questions, real-data prerequisites [claude]

---

## Milestone: Real-data release (epic stubs only, all `needs-decision`)

- **E13 — Real CV intake** · area:cv-processing — recruiter upload, intake mailbox, one-time OneDrive/SharePoint import (last 12 months)
- **E14 — Consent & retention** · area:compliance — recorded consent, 7-day reminder, 14-day deletion, 12-month retention with 30-day warning, hide non-consented candidates
- **E15 — Access protection** · area:compliance — sign-in (e.g. Microsoft 365 via Supabase Auth) or network restriction; access logging
- **E16 — Duplicate candidates** · area:cv-processing — rule to be decided after go/no-go
- **E17 — Paid plans & backups** · area:release — Vercel Pro, Supabase paid tier, backup policy

## Milestone: Later (create only when asked)

- **E18** — Approved external talent sources with on/off switches
- **E19** — Shortlist sharing and client access
- **E20** — Candidate access
- **E21** — Teams / WhatsApp alerts
- **E22** — Scanned CVs (OCR)
- **E23** — More languages
