# Data model, flows and AI pipeline (suggested in the PRD)

**Seventeen core tables** cover the MVP and the real-data release. Times are stored in **UTC** and shown in **Singapore time**.

| Table | Holds |
|---|---|
| `clients` | Client companies, with their own stage limits and guarantee period |
| `jobs` | Job requests: owner name, status, current version |
| `job_versions` | Each saved version of a job's fields, must-haves and nice-to-haves, and reasons for nationality or language requirements |
| `gap_flags` | Missing, uncertain, conflicting and fair-employment flags, with resolution notes |
| `candidates` | One row per person: contact details, consent status and date, last activity |
| `cv_files` | Files in Storage, with parse status and errors |
| `candidate_profiles` | Parsed fields, **with recruiter edits stored separately** so re-parsing never overwrites them |
| `candidate_skills` | Each skill with the CV text it came from |
| `embeddings` | pgvector vectors for CVs and job versions |
| `match_scores` | Score, reasons and evidence per **candidate × job version × model version** |
| `pipeline_entries` | A candidate on a job: current stage, when it was entered, owner |
| `stage_events` | Every stage change, with the typed recruiter name (the audit trail) |
| `stage_limits` | Working-day limits at default, client and job level |
| `sg_public_holidays` | Singapore public holidays, for working-day counts |
| `placements` | Start date check and 30-day guarantee end date |
| `ai_runs` | Each AI call: what it read, model and version, output, cost and duration |
| `settings_log` | Every settings change, with the typed recruiter name |

**Key invariant:** match scores are keyed to **job version + model version**, so an old score is never shown against a changed job.

## Components

| Component | Runs on | Does |
|---|---|---|
| Web app | Vercel `sin1` | All screens. Server Components and Server Actions read and write data |
| API routes | Vercel `sin1` | CV parsing, matching, gap check, search |
| Database | Supabase Postgres, SG | Candidates, jobs, pipeline, AI results, change logs |
| File storage | Supabase Storage, **private bucket**, SG | Original CV and JD files |
| AI provider | External, picked by the dev team | Reads CVs and jobs, returns structured JSON |
| Seed script | Dev machine or CI | Lists the public Vercel Blob store (seed source), downloads the fictional CVs and JDs, and loads them **through the real parser** |

The browser talks **only** to the Next.js app. All database, file and AI calls happen on the server in Singapore.

## Main flows

1. **Seeding (MVP):** list and download the sample files from the Vercel Blob store → classify CV vs JD → upload to private Supabase Storage → parse → create embeddings → score against every job → back-date stage entries so delays show from day one.
2. **Opening a job:** read the stored scores and flags. **No AI call on page load**, which keeps pages fast and costs predictable.
3. **Saving a job:**
   1. Store a new `job_versions` row.
   2. Run the gap check.
   3. Re-score the candidates **after the response is sent** (Next.js `after()`).
   4. Track progress in a runs table so failed runs can be retried.
4. **Searching:** the AI turns the query into filters plus search text. Postgres combines keyword, vector and filter results **in one query**.
5. **Delay status:** a **database view** built from the stage entry time, the limit rules and the holiday table. There's no scheduled job.

## AI pipeline

Every AI step returns **JSON checked against a fixed schema**, and every result is saved **with the text it relied on**.

| Step | Approach |
|---|---|
| Text extraction | PDF and `.docx` text is extracted on the server. Legacy `.doc` needs a converter serverless can't run easily, so for the MVP **the seed script converts `.doc` first** |
| Chinese PDFs | Some extract poorly. When that happens, **send the PDF itself** to a model that reads PDFs directly |
| Parsing | **One model call per CV** fills the approved profile fields, each with its source text |
| Embeddings | A **multilingual** embedding model (EN + Simplified Chinese), stored with pgvector |
| Matching | **Filters first**, then the **top 50** candidates by vector similarity per job, then a model call scores each one with reasons |
| Gap check | Code checks the missing fields; **one model call** finds the uncertain, conflicting and fair-employment issues |
| Search | A model turns plain language into filters + search text; Postgres runs keyword + vector + filter together |
| Quality | A script scores the parser and matcher against the sample answer key **before each release**: ≥ 90% fields, ≥ 80% top-5 |

**MVP volume:** seeding takes about **200 parsing calls** and **1,000 scoring calls** (20 jobs × 50 candidates), once. Each job save re-scores up to 50 candidates.

**Provider notes (from the PRD, not a decision):** if Claude is picked, `claude-opus-5` reads PDFs directly and returns schema-checked JSON. Anthropic has no embedding model, so embeddings need a second provider. Where each provider processes data matters once real CVs are loaded.
