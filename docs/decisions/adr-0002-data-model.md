# ADR-0002 — The seventeen-table data model and its invariants

## Status

**Accepted** · 2026-09-17 · created by [#72](https://github.com/dczii/URecruitment/issues/72)
(story [#19](https://github.com/dczii/URecruitment/issues/19), epic
[#1](https://github.com/dczii/URecruitment/issues/1))

Builds on [ADR-0001](adr-0001-architecture.md), which sets the boundary this model sits behind.
Read [README.md](README.md) for the status vocabulary.

**This record is the *what*.** The *how* — migration commands, naming conventions, RLS statements,
index choices, generated types, the seed — stays in the `supabase-db` skill, which is the mechanics
reference and defers the table list and invariants to `prd-context` →
`references/data-model.md`. That reference condenses the PRD; **this record expands it** into
per-table ownership and the invariants below, and is the one to cite from an issue or a spec. When
the two disagree, the PRD wins and both get fixed.

## Context

The PRD *suggests* seventeen core tables covering the MVP and the real-data release. Four epics
(E03 migrations, E04 parsing, E05 jobs and gap check, E06 matching) all write to them, and each is
implemented by a different task, potentially by a different agent, over the weeks before the
mid-December 2026 deadline.

Two things therefore have to be written down before the first migration
([#109](https://github.com/dczii/URecruitment/issues/109)) runs:

1. **Which table owns which fact**, and **which migration creates it** — so two tasks do not each
   invent a place to put the same data.
2. **The invariants** — the handful of rules that are cheap to hold from the start and expensive to
   retrofit. Each one exists because breaking it would show a recruiter something wrong: a stale
   score, an overwritten edit, an AI claim with no provenance, or a date an hour off.

## Decision

### D1 — Seventeen tables, their owners and their MVP standing

Times are `timestamptz`, stored **UTC**. `MVP` means the MVP writes rows to it.

| # | Table | Purpose | MVP standing | Owning migration task |
|---|---|---|---|---|
| 1 | `clients` | Client companies, each with its own stage limits and guarantee period (default 30 days) | MVP | [#109](https://github.com/dczii/URecruitment/issues/109) E03-S01-T01 |
| 2 | `jobs` | Job requests: owner name, status, pointer to the current version | MVP | [#109](https://github.com/dczii/URecruitment/issues/109) E03-S01-T01 |
| 3 | `job_versions` | One immutable row per save: fields, must-haves, nice-to-haves, and the written reason for any nationality or language requirement | MVP | [#109](https://github.com/dczii/URecruitment/issues/109) E03-S01-T01 |
| 4 | `gap_flags` | Missing, uncertain, conflicting and fair-employment flags on a job request, with resolution or dismissal notes | MVP | [#109](https://github.com/dczii/URecruitment/issues/109) E03-S01-T01 |
| 5 | `candidates` | One row per person: contact details, consent status/date/method, last activity | MVP — **consent and retention columns stay unwritten until the real-data release** (see D3) | [#110](https://github.com/dczii/URecruitment/issues/110) E03-S01-T02 |
| 6 | `cv_files` | Files in Storage: source, source ref + hash, private storage path, `cv`/`jd` kind, parse status and error, language | MVP | [#110](https://github.com/dczii/URecruitment/issues/110) E03-S01-T02 |
| 7 | `candidate_profiles` | Parsed fields **and recruiter edits, stored separately**, so re-parsing never overwrites an edit | MVP | [#110](https://github.com/dczii/URecruitment/issues/110) E03-S01-T02 |
| 8 | `candidate_skills` | Each skill with the CV text it came from | MVP | [#110](https://github.com/dczii/URecruitment/issues/110) E03-S01-T02 |
| 9 | `embeddings` | pgvector vectors for candidate profiles and job versions, with the embedding model stored beside each vector | MVP — **dimension blocked on [ADR-0003](adr-0003-ai-provider.md)** | [#111](https://github.com/dczii/URecruitment/issues/111) E03-S01-T03 |
| 10 | `match_scores` | Score 0–100, reasons and evidence per **candidate × job version × model version** | MVP | [#111](https://github.com/dczii/URecruitment/issues/111) E03-S01-T03 |
| 11 | `pipeline_entries` | A candidate on a job: exactly one current stage, when it was entered, the owner | MVP — seeded with **back-dated** entries so delays show from day one | [#112](https://github.com/dczii/URecruitment/issues/112) E03-S01-T04 |
| 12 | `stage_events` | Append-only: every stage change with the **typed recruiter name**. This is the audit trail | MVP | [#112](https://github.com/dczii/URecruitment/issues/112) E03-S01-T04 |
| 13 | `stage_limits` | Working-day limits at `default`, `client` and `job` scope | MVP | [#112](https://github.com/dczii/URecruitment/issues/112) E03-S01-T04 |
| 14 | `placements` | Start-date confirmation and the 30-day replacement guarantee end date | MVP feature (decided). Whether the seed carries a sample candidate as far as Placed is settled by [#121](https://github.com/dczii/URecruitment/issues/121) | [#112](https://github.com/dczii/URecruitment/issues/112) E03-S01-T04 |
| 15 | `settings_log` | Append-only: every settings change with the typed recruiter name | MVP | [#112](https://github.com/dczii/URecruitment/issues/112) E03-S01-T04 |
| 16 | `ai_runs` | Every AI call: input reference + hash, step, provider, model id, model version, prompt version, output, status, error, tokens, cost, duration | MVP | [#112](https://github.com/dczii/URecruitment/issues/112) E03-S01-T04 |
| 17 | `sg_public_holidays` | Singapore public holidays, for working-day counts | MVP | [#115](https://github.com/dczii/URecruitment/issues/115) E03-S03-T01 |

Plus the RLS lock-down proof for **all seventeen**:
[#113](https://github.com/dczii/URecruitment/issues/113) (E03-S01-T05).

**Every table is an MVP table.** The PRD names no table that only the real-data release creates —
what is deferred is at **column** level, not table level (D3). Later tasks must not read
"real-data release" as "do not create it yet".

### D2 — Every table is created locked down, in the same migration

Not negotiable, and it belongs here because it is a property of the model, not of a migration style.
(The two statements below are the lock-down, **not policy text** — the point is that no policy is
ever written. Policy-level work stays with
[#113](https://github.com/dczii/URecruitment/issues/113).)

```sql
alter table public.<t> enable row level security;
-- no policies for anon / authenticated
revoke all on table public.<t> from anon, authenticated;
```

Views get `with (security_invoker = true)` and the same revoke. Functions are `security definer`
only with a pinned `search_path` and a comment saying why, and `execute` is revoked from
`anon, authenticated`. See [ADR-0001](adr-0001-architecture.md) D1: with no sign-in, RLS is the
backstop that makes a leaked publishable key worthless.

### D3 — What the MVP does not populate

| Table | Column(s) | Created | Written |
|---|---|---|---|
| `candidates` | `consent_status`, `consent_date`, `consent_method` | First migration, [#110](https://github.com/dczii/URecruitment/issues/110) | Real-data release. Recruiters record consent by phone or their own email; a dashboard reminder after **7 days**; the CV is **deleted after 14 days** without consent; candidates without consent are hidden from search and matching |
| `candidates` | `last_activity_at` | First migration, [#110](https://github.com/dczii/URecruitment/issues/110) | Real-data release. Retention: delete or anonymise **12 months after last activity**, warning 30 days before |

They exist from the start so that the real-data release is a behaviour change, not a migration of
live candidate data. **In the MVP they are inert**: nothing writes them, no query filters on them,
and no screen shows them. The first task that *does* filter on them is part of the real-data release
and needs the **open** PDPA questions answered first (see
[ADR-0001](adr-0001-architecture.md) → accepted risk).

Two more MVP gaps worth naming, so no task treats them as oversights:

- **Duplicate candidate detection is out of the MVP** (decided). The sample set contains
  resubmissions; **treat them as separate candidates.** The rule is an **open** question to be
  decided before real data.
- **Stage limit day counts are not fixed here.** The hierarchy is decided (D4 invariant note); the
  PRD's per-stage day table is partly garbled around Screening and Shortlisted. The task that seeds
  `stage_limits` confirms the numbers with the product owner and labels its issue `needs-decision`
  if it cannot.

### D4 — The four invariants

Each is stated as a rule, with the PRD line it comes from and its PRD status.

---

**Invariant 1 — A score is keyed to candidate × job version × model version.**

> PRD, Data model (suggested): *"Key invariant: match scores are keyed to job version + model
> version, so an old score is never shown against a changed job."*
> PRD, Job matching → Requirements 4 (**proposed**): *"The score shows the model version and date.
> Changing the job recalculates all scores."*

- The unique key on `match_scores` is `(candidate_id, job_version_id, model_version)`.
- **Queries always filter by the job's current version and the active model version.** A score
  computed against an older `job_versions` row is history, never something a recruiter sees as
  current.
- Every score shown carries its **model version and date**.
- A job save writes a new `job_versions` row and re-scores in `after()`
  ([#150](https://github.com/dczii/URecruitment/issues/150)); until that finishes, the UI shows
  progress rather than the previous version's score.
- The raw score is stored alongside the capped score, because the must-have cap is applied in code
  (**proposed**, default 50) and a later task may tune it without losing what the model said.

*Why it matters:* a recruiter who widens a requirement and sees yesterday's ranking would make a
shortlist decision on a job that no longer exists.

---

**Invariant 2 — Recruiter edits live apart from parsed fields, and win.**

> PRD, Data model (suggested): *`candidate_profiles` — "Parsed fields, **with recruiter edits stored
> separately** so re-parsing never overwrites them."*
> PRD, CV processing → Requirements 1 (**proposed**): *"Recruiters can edit any parsed field. Their
> edits survive re-processing."*

- `candidate_profiles` keeps `parsed jsonb` (AI output) and `overrides jsonb` (recruiter edits) in
  **separate columns**.
- The effective profile is `parsed` merged with `overrides`, **overrides winning**.
- **Re-parsing writes only `parsed`.** No code path writes `overrides` from a model result.
- Edits are made through the typed-name flow, like any other recruiter change.

*Why it matters:* a recruiter who fixes a mangled Chinese employer name and loses it on the next
re-parse stops trusting the tool. It also underwrites the PDPA access-and-correction obligation.

---

**Invariant 3 — Every AI-derived row points back to an `ai_runs` row, and carries its source text.**

> PRD, AI governance 2 (**proposed**): *"Each AI output is stored with its input, model version and
> date."*
> PRD, AI governance 1 (**proposed**): *"Every score, flag and parsed field shows the CV or job text
> it was based on."*
> PRD, Data model (suggested): *`ai_runs` — "Each AI call: what it read, model and version, output,
> cost and duration."*

- Every row produced by a model — `candidate_profiles.parsed`, `candidate_skills`, `match_scores`,
  `gap_flags`, `embeddings` — carries the `ai_run_id` that produced it.
- Every AI claim carries verbatim `source_text` from the input. Where the quote cannot be found in
  the input after whitespace normalisation, the value is kept with `evidence_verified = false` and
  shown as "source not found". **A quote is never invented and never silently dropped.**
- `ai_runs` holds **no secrets and no CV text in `error`** — messages only. CV text never reaches
  Sentry or the console either.
- This is what makes the AI auditable under Singapore's Model AI Governance Framework, and what lets
  a recruiter challenge any suggestion. See [ADR-0003](adr-0003-ai-provider.md) C4 and C6.

*Why it matters:* an AI suggestion nobody can trace is one nobody can overrule with confidence — and
the PRD's first guardrail is that **the AI only suggests**.

---

**Invariant 4 — Store UTC, display Singapore, count Singapore working days.**

> PRD, Data model (suggested): *"Times are stored in **UTC** and shown in **Singapore time**."*
> PRD, Pipeline tracking → Time limits (**decided**): *"working days, Monday to Friday, skipping
> Singapore public holidays."*

- Every timestamp column is `timestamptz` and every value written is UTC.
- Display goes through one helper using `Intl.DateTimeFormat("en-SG", { timeZone: "Asia/Singapore" })`.
  No component formats a date by hand.
- Working-day arithmetic uses **Asia/Singapore local dates**, so the day boundary is Singapore
  midnight, not UTC midnight, and it skips weekends and `sg_public_holidays`.
- The SQL function and its TypeScript mirror in `src/lib` **share their test cases** and must agree
  on every edge case ([#116](https://github.com/dczii/URecruitment/issues/116)).
- The limit hierarchy is **job → client → default** (decided), resolved from `stage_limits.scope`.

*Why it matters:* a job entered at 9am Singapore time on a Friday is a day old on Monday, not three.
Getting the timezone wrong makes every overdue count wrong, and the overdue dashboard is the feature.

## Consequences

**What this makes easy**

- A schema task starts by reading one table row here, not by re-reading the PDF.
- Re-parsing, re-scoring and re-embedding are all safe to run again: overrides survive, scores upsert
  on their key, and every result is traceable.
- The real-data release is a behaviour change on columns that already exist.

**What this makes hard, on purpose**

- Every read of `match_scores` must filter by current job version **and** active model version.
  Forgetting is how a stale score reaches a recruiter, so it belongs in the query helper, not in each
  caller.
- Profile reads go through the merge of `parsed` and `overrides`. No screen reads `parsed` directly.
- Model version changes invalidate scores wholesale: they are a new key, so they trigger a re-score
  rather than an in-place update.

**What every later task now owes**

1. A new table, view or function ships with RLS enabled and revoked in the **same** migration (D2),
   and is added to the lock-down test ([#113](https://github.com/dczii/URecruitment/issues/113)).
2. A new AI-derived column or table carries `ai_run_id` and its `source_text`.
3. A new timestamp is `timestamptz`, written UTC, displayed through the helper.
4. **Never edit a merged migration.** Add a new one; `supabase db reset` must still succeed from
   scratch.
5. Regenerate `src/server/db/types.ts` after every schema change.
6. Adding a table beyond these seventeen needs a record superseding this one, not just a migration.

**Open dependency.** `embeddings` cannot be created until the vector dimension is known, and the
dimension comes from the embedding model, which is **open** — see
[ADR-0003](adr-0003-ai-provider.md). [#111](https://github.com/dczii/URecruitment/issues/111) is
blocked on it.

## Rejected alternatives

| Alternative | Why not |
|---|---|
| **One `profiles` table with parsed fields edited in place** | Breaks invariant 2 the first time a CV is re-parsed. Separate `parsed`/`overrides` columns are the cheapest way to make re-processing always safe. |
| **`match_scores` keyed by candidate × job** (no version, no model version) | Breaks invariant 1. Editing a job would silently change what old scores mean, and there would be no way to show the model version and date the PRD requires. |
| **Storing the delay status in a column on `pipeline_entries`** | Would need a job to refresh it, and Vercel Hobby runs cron once a day. [ADR-0001](adr-0001-architecture.md) D4 keeps it a view. |
| **A single `ai_outputs` table holding every AI result as JSON** | Loses the foreign keys, the per-skill source text and the query shapes matching and search need. `ai_runs` records the *call*; the domain tables hold the *result* and point back to it. |
| **Adding consent and retention columns only at the real-data release** | A migration against live candidate data, at the point of highest risk, to enable the control that reduces that risk. Creating them inert from the start costs nothing. |
| **A `duplicates` table or a merge key in the MVP** | Duplicate detection is explicitly out of the MVP and its rule is an **open** question. The sample set's resubmissions are separate candidates. |
| **Storing the public sample-data Blob URL on `cv_files`** | The repository is public and the store is public. `cv_files` stores the blob `pathname` as `source_ref` plus a SHA-256 `source_hash` (enough for idempotent seeding) and the **private** Supabase Storage path the app actually reads. |
