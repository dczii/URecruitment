# Core recruiter flows

## Status

**Accepted** · 2026-09-17 · created by [#75](https://github.com/dczii/URecruitment/issues/75)
(story [#21](https://github.com/dczii/URecruitment/issues/21), epic
[#1](https://github.com/dczii/URecruitment/issues/1))

These are the three journeys a recruiter repeats every day, mapped end to end across the screens in
[screen-inventory.md](screen-inventory.md) (S1–S11). Each step names the **screen** it happens on,
the recruiter's **action**, and every **state change** it causes in the data model
([ADR-0002](../decisions/adr-0002-data-model.md)).

A design task uses these flows to check that its screen connects to the ones before and after it. A
Playwright task uses them as the outline of its end-to-end journeys.

**Conventions**

- **Who acts:** *R* is the recruiter; *S* is the server; *DB* is a database view or query. **The AI
  never acts on a candidate.** Where a step involves the AI, it produces a stored suggestion and
  nothing else (`CLAUDE.md` hard rule 1).
- **Name prompt:** "→ S11" marks a change that opens the typed-name prompt if this device has no name
  yet (PRD design rule 5). After the first time, a stage move still shows the remembered name with
  "not you?".
- **No email** is sent at any step (`CLAUDE.md` hard rule 2). Anything that needs attention appears on
  the Dashboard.
- **Times** are stored in UTC and shown in Singapore time. Limits count Singapore working days.

---

## Flow 1 — Find candidates for a job and shortlist them

*A client sends a job request. The recruiter turns it into a job, fixes the gaps with the client,
reviews the AI's suggested matches, and shortlists people **by their own decision**.*

| # | Screen | Who | Action | State change |
|---|---|---|---|---|
| 1.1 | S2 Jobs | R | Chooses **New job** | none |
| 1.2 | S4 Job form | R | *(Optional)* uploads the client's JD (PDF or Word) | S: the file is validated (type by content, size ≤ 50 MB) and stored in the **private** bucket. A scanned or image-only file is **rejected with a clear message**. S: one AI call extracts the fields → `ai_runs` row |
| 1.3 | S4 Job form | R | Reviews the **pre-filled** values, each labelled *AI suggestion* with its JD text, and confirms or corrects them; enters owner name, client and requirements, marking each **must-have** or **nice-to-have** | none until saved |
| 1.4 | S4 Job form | R | Marks nationality or language as required **only with a written reason**. The form refuses to save otherwise, and so does the server | none (validation) |
| 1.5 | S4 Job form | R | **Save** → S11 on first change | S: `jobs` row (new job) and a new immutable **`job_versions`** row; `jobs.current_version_id` → it. S: **gap check**: code rules for missing fields plus one AI call for uncertain, conflicting and fair-employment flags → `gap_flags` rows, `ai_runs` row |
| 1.6 | — | S | *After the response is sent* (`after()`): re-score candidates for the new version | S: embeddings for the version; retrieval (filters, then top 50 by similarity); one scoring call per candidate → **`match_scores`** keyed to *candidate × job version × model version*, `ai_runs` rows; progress in a runs table so a failed run can be retried |
| 1.7 | S3 Job detail | R | Lands on the job. Sees the **open-flag banner** ("3 open questions for the client · matching still runs") and the gap-flag checklist, each flag with why it matters and a **question to ask the client** | none (reads stored flags; **no AI call on page load**) |
| 1.8 | S3 Job detail | R | Asks the client outside the portal, then marks each flag **Resolved** or **Dismissed** with a short note → S11 | `gap_flags` status, note and typed name. The banner count drops. Open flags **never** block matching |
| 1.9 | S3 Job detail | R | *(If the answers change the job)* **Edit** → S4 → Save | Back to 1.5: a **new** version, and the old scores are no longer shown against it |
| 1.10 | S3 Job detail | R | Reviews **ranked matches**: score 0–100 with model version and date, matched / missing / uncertain skills each with CV text, all labelled *AI suggestion*; sorts and filters | none (stored scores for the **current** version and active model only; a stale score is never shown) |
| 1.11 | S5 Candidate search | R | *(Optional)* **Search from this job** with a plain-language query and filters | S: one AI call turns the query into filters and search text (protected terms are ignored) → `ai_runs`; DB: one hybrid query. Results are ranked by this job's **stored** scores. No re-scoring |
| 1.12 | S6 Candidate profile | R | Opens a candidate; checks parsed fields against their source quotes; opens the original CV | S: a **signed URL** (≤ 300 s), created on demand and never stored |
| 1.13 | S3 Job detail | R | **Add to pipeline** for the candidates they choose. **Nothing is pre-selected** → S11 | `pipeline_entries` row in **Sourced** with `entered_at` = now; **`stage_events`** row with the typed name |
| 1.14 | S7 Pipeline board | R | Moves the candidate **Sourced → Screening** after reviewing or calling them (see Flow 2) | `pipeline_entries` stage and `entered_at` reset; `stage_events` row |
| 1.15 | S7 Pipeline board | R | Moves the candidate **Screening → Shortlisted**, the recruiter's decision (see Flow 2) | as 1.14 |

**Screens crossed:** S2 → S4 → S3 → (S5) → S6 → S3 → S7, with S11 at 1.5, 1.8, 1.13, 1.14 and 1.15.
**Tables written:** `cv_files` (the JD file) · `ai_runs` · `jobs` · `job_versions` · `gap_flags` ·
`embeddings` · `match_scores` · `pipeline_entries` · `stage_events`.

**What the AI does in this flow:** it extracts JD fields, flags gaps, scores and explains matches, and
interprets the search. **What it never does:** save the job, resolve a flag, add anyone to the
pipeline, shortlist, reject or contact anyone.

---

## Flow 2 — Move a candidate and record my name

*The recruiter records that a candidate has moved on, on a phone between calls if need be. The move
is audited with the name the recruiter typed.*

| # | Screen | Who | Action | State change |
|---|---|---|---|---|
| 2.1 | S1 Dashboard **or** S3 Job detail | R | Opens the job's **Pipeline board**, from a dashboard row or from the job | none |
| 2.2 | S7 Pipeline board | R | Finds the candidate's card. The card shows its **delay badge** (icon + word + colour: "Due soon") | DB: the delay-status view computes status from `entered_at`, the resolved limit (job, then client, then default) and the Singapore holiday table |
| 2.3 | S7 Pipeline board | R | Opens the card's **Move** control, a menu or button that works **by keyboard**, with drag optional, and picks the next stage, a stage further back, or an end state (*Rejected by agency*, *Rejected by client*, *Withdrawn*) | none yet |
| 2.4a | S11 Typed-name prompt | R | **First change on this device:** types their name. It must not be blank or whitespace only, and must not be over-long | Device: the name is remembered locally. Nothing is stored on the server yet |
| 2.4b | S11 (inline confirmation) | R | **Name already remembered:** sees "Recording as *name* · not you?" and confirms, or chooses *not you?* to change the name | Device: the name is updated if changed |
| 2.5 | — | S | The move Server Action validates the input (Zod) **and** the name (the shared validator). A move without a name is refused | — |
| 2.6 | — | S | Applies the move | `pipeline_entries.stage` updated; **`entered_at` reset** to now (also on a move backwards); one **`stage_events`** row: from, to, typed name, time (UTC). A candidate is never in two stages |
| 2.7 | S7 Pipeline board | R | Sees the card in its new column, **On track** (the clock restarted); an `aria-live` message announces the move | DB: status recomputed on read; no scheduled job |
| 2.8 | S7 Pipeline board | R | *(If the move was to an **end state**)* the card shows **no** delay status and the candidate leaves the dashboard lists | Same writes as 2.6. End states carry no limit |
| 2.9 | S7 → S8 Placements | R | *(If the move was to **Placed**)* confirms the candidate's **start date**, on Placements ([#164](https://github.com/dczii/URecruitment/issues/164)) → S11 | `placements` row with the start date and the **guarantee end date** (the client's period, default 30 days); Placed shows no delay status |
| 2.10 | S6 Candidate profile | R | *(Later, anyone)* opens the candidate's **stage history** | none (reads `stage_events`: each move with the typed name and Singapore time) |

**Screens crossed:** S1 or S3 → S7 → S11 → S7 → (S8) → (S6).
**Tables written:** `pipeline_entries` · `stage_events` · `placements` (only on a move to Placed).

**What makes this auditable:** the name is **typed, not verified** (PRD *Users → 3*). The audit trail
is `stage_events`, which is append-only. The PRD accepts this for the MVP because there is no sign-in
and the data is fictional.

---

## Flow 3 — Clear today's overdue list

*The recruiter starts the day on the Dashboard and works through what is overdue, what is about to be,
and which guarantees are ending, until everything left is genuinely waiting on someone else.*

"Clearing" does **not** mean hiding. A candidate leaves the overdue list only when something real
changes: they move stage, they leave the pipeline, or the limit that applies to them changes. **The
PRD has no snooze or acknowledge**, and this flow does not invent one.

| # | Screen | Who | Action | State change |
|---|---|---|---|---|
| 3.1 | S1 Dashboard | R | Opens the portal. Sees **Overdue** (ordered by **days over**, each row with a delay badge such as "Overdue · 3 days" and who it is **waiting on**), **Due soon** (≥ 80% of the limit used) and **Guarantees ending** (flagged 5 working days before the end) | none (DB: the delay-status view plus placements. Nothing was emailed overnight; this list is the alert) |
| 3.2 | S1 Dashboard | R | Filters by **owner** (their own jobs), and optionally by client, job or stage. On a phone the filters are in a sheet | none |
| 3.3 | S1 → S7 Pipeline board | R | For an overdue candidate **waiting on the recruiter** who has in fact progressed: opens the board and **moves** them (Flow 2) → S11 | `pipeline_entries` + `stage_events`. The candidate leaves Overdue |
| 3.4 | S1 → S7 Pipeline board | R | For a candidate who has **dropped out** or been turned down: moves them to an **end state** (Flow 2) → S11 | as 3.3. End states have no status |
| 3.5 | S1 → S3 Job detail | R | For a candidate **waiting on the client** (Submitted to client, Client interview): opens the job and chases the client **outside the portal**. The row stays overdue until the client acts and the recruiter records the move | none. The "waiting on" column keeps client-side delays visibly apart |
| 3.6 | S1 → S9 Settings | R | *(Only if the limit itself is wrong for this job or client)* changes the **job-level** or **client-level** limit → S11 | `stage_limits` row at job or client level; one **`settings_log`** row with the old and new value and the typed name. The new limit applies to the running clock, so the status is recomputed |
| 3.7 | S1 Dashboard | R | Works the **Due soon** section the same way, before those candidates become overdue | as 3.3–3.6 |
| 3.8 | S1 → S8 Placements | R | For a **guarantee ending**: opens the placement, checks the start date and follows up with the client and the candidate outside the portal. Confirms or corrects the start date if needed → S11 | `placements` start date (if changed). The guarantee end date follows from it |
| 3.9 | S1 Dashboard | R | Returns to the dashboard. What remains is either waiting on the client or candidate, or not yet actionable. Empty sections read as good news ("Nothing overdue") | none |

**Screens crossed:** S1 → S7 / S3 / S9 / S8 → S1, with S11 at 3.3, 3.4, 3.6 and 3.8.
**Tables written:** `pipeline_entries` · `stage_events` · `stage_limits` · `settings_log` · `placements`.

**Why there is no scheduled job:** status is computed by a database view at read time, so the
dashboard is always current without a cron (PRD main flow 5; Vercel Hobby runs cron only once a day).

---

## Cross-flow checks for design and test tasks

| Check | Flow steps |
|---|---|
| Every change passes through S11 on first use | 1.5, 1.8, 1.13, 1.14–1.15, 2.4, 2.9, 3.3, 3.4, 3.6, 3.8 |
| No AI call happens on page load | 1.7, 1.10, 2.2, 3.1 |
| AI output is labelled *AI suggestion* and shows its source | 1.3, 1.7, 1.10, 1.11 |
| Nothing is pre-selected or moved by the AI | 1.10, 1.13, 2.3 |
| Delay status is never colour-only; end states and Placed show none | 2.2, 2.7, 2.8, 2.9, 3.1 |
| Works at 390 px with no horizontal page scroll | Flow 2 end to end; 3.1–3.4, 3.7, 3.9 |
| A stale score is never shown against a changed job | 1.9, 1.10 |
| Nothing is emailed | Flow 3 (the dashboard is the alert) |
