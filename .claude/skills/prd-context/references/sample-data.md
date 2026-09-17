# Sample data

The MVP runs only on **fictional** data. The PRD target is **200 CVs (~20 in Simplified Chinese) and 20 sample jobs**.

## Source: Google Drive (decided by the product owner, 17 Sep 2026)

- The sample files live in a Google Drive folder owned by the product owner. **The folder ID is not stored in this public repo.** The seed script reads it from the env var `SEED_DRIVE_FOLDER_ID`, set in `.env.local`, which is gitignored. Ask the owner for the value.
- **The seed script reads Drive directly at run time.** The files are **not committed** to the repo.
- **Google credentials** also come from env and are never committed. The auth method (service account, OAuth client or API key on a link-shared folder) is **not decided**. The seed task's spec must choose one and record why.
- **State on 17 Sep 2026:**
  - About 29 English PDF CVs, all fictional (`example.com` emails).
  - No job descriptions, no answer key, and no Chinese CVs yet.
  - **More files are coming** to reach the full set.
  - The seed must cope with a partial set, and must report the counts (CVs by language, jobs) so gaps are visible.
- **File names are inconsistent:** `12_ravi_selvaraj.pdf`, `Elaine Koh CV.pdf`, `30_nguyen_mai_anh_resubmission.pdf`. Don't parse meaning from file names. The parser reads the content.
- **Resubmissions exist.** Duplicate detection is a non-goal for the MVP, so each file becomes its own candidate. Log the likely duplicates for the later duplicate-rule decision.
- **CVs contain protected attributes.** One seen so far states "Vietnamese citizen"; others may include photos, ages or marital status. These are good test cases: the parser may store what's written, but **scoring must ignore it** unless the job marks nationality/language as required with a reason.

## Seed flow (see `supabase-db` for mechanics)

1. List the Drive folder, then download each file to a temp dir. Skip unsupported types with a logged reason.
2. Convert legacy `.doc` → `.docx`/PDF **in the seed script** (serverless can't do it).
3. Upload each file to the **private** Storage bucket.
4. Run it through the **real parser** (the same code path as the app), which writes `ai_runs`.
5. Create embeddings.
6. Load the 20 jobs (from Drive once they arrive) → gap check → score every CV against every job (top 50 per job).
7. Create pipeline entries with **back-dated** stage entry times, so On track / Due soon / Overdue all appear from day one.
8. Load the Singapore public holidays for the relevant years.
9. **Idempotent:** re-running the seed rebuilds the same state (this is the MVP's backup plan).

## Answer key (decided: Claude drafts, humans verify)

The **answer key** is the ground truth for `npm run eval` (see `ai-eval`).

- A task drafts it from the CVs and jobs.
- Recruiters **verify and correct** it before it counts. An unverified entry is excluded from the quality bar.
- It contains no secrets and only fictional people, so it **may be committed** (`eval/answer-key/`). Unlike the CV files, it's small and versioned with the prompts it grades.
