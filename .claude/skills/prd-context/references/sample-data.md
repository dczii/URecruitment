# Sample data

The MVP runs only on **fictional** data. The PRD target is **200 CVs (~20 in Simplified Chinese) and 20 sample jobs**.

## Source: Vercel Blob (decided by the product owner, 17 Sep 2026)

The Blob store is the **seed source only**. At run time the app keeps original CV/JD files in the **private Supabase Storage bucket**, exactly as the PRD says. Blob is never the app's file store.

| Fact | Value |
|---|---|
| Store | Vercel Blob, connected to the Vercel project `u-recruitment` (scope `user-7407`) |
| Region | Singapore |
| Access | **Public**: any file is readable by anyone who knows its URL |
| Layout | **Flat**: all files at the root, with their original file names (no random suffix), e.g. `25_farah_ismail.pdf`, `Elaine Koh CV.pdf` |
| Base URL | `SEED_BLOB_BASE_URL` in `.env.local` / CI secrets. **Never committed.** File names are guessable, so the base URL is what keeps the files obscure |
| Listing | `BLOB_READ_WRITE_TOKEN`, used **only** for `list()`. Blob has no public listing endpoint |
| Download | Plain `fetch(blob.url)` on the public URL. **No token** on downloads |

**Rules**

- **Getting the token.** The token exists because the store is connected to `u-recruitment`. `vercel env pull` fetches it, but that **overwrites `.env.local`**. Add `SEED_BLOB_BASE_URL` to the project's *Development* environment so that pulling keeps it, or re-add it after pulling.
- **The token is read-write.** The seed and eval only call `list()`. They **never** `put`, `copy` or `del`, and app runtime code never imports `@vercel/blob`.
- **Guard against the wrong store.** The seed checks that every listed `blob.url` starts with `SEED_BLOB_BASE_URL`, and aborts otherwise (wrong token, wrong store).
- **The store is public, so it must only ever hold fictional files.** Never upload a real CV there, not even for testing.
- **Files are not committed** to the repo. The seed downloads them into the gitignored `.seed-cache/`.

**State on 17 Sep 2026**
- The store holds about 29 fictional English PDF CVs (all with `example.com` emails).
- There are no job descriptions, no answer key and no Chinese CVs yet. **More files are coming** to reach the full set.
- The seed must cope with a partial set, and report the counts (CVs by language, JDs, rejected files) so gaps are visible.

**Data quirks**
- **Flat layout means classifying by content.** CVs and JDs share the root, so the seed tells them apart **by content**, not by name or folder. The seed task's spec chooses the method: heuristics, a `classify-document` prompt through `runAi`, or both. A file that can't be classified with confidence is **reported and skipped**, never guessed.
- **File names are inconsistent:** `12_ravi_selvaraj.pdf`, `Elaine Koh CV.pdf`, `30_nguyen_mai_anh_resubmission.pdf`. Don't parse meaning from file names.
- **Resubmissions exist.** Duplicate detection is a non-goal for the MVP, so each file becomes its own candidate. Log the likely duplicates for the later duplicate-rule decision.
- **CVs contain protected attributes.** One seen so far states "Vietnamese citizen"; others may include photos, ages or marital status. The parser may store what's written, but **scoring must ignore it** unless the job marks nationality/language as required with a reason.

## Seed flow (see `supabase-db` for mechanics)

1. **List** the store with `list()` (token), paginating through the cursor. Keep `pathname`, `url`, `size` and `uploadedAt`.
2. **Download** each file from its public `url` into `.seed-cache/`, and compute its SHA-256. Skip unsupported types (anything but PDF/DOC/DOCX) with a logged reason.
3. **Convert** legacy `.doc` to `.docx`/PDF **in the seed script** (serverless can't do it).
4. **Classify** each file as CV or JD by content. Report the unclassifiable ones.
5. **Upload** each file to the **private Supabase Storage** bucket.
6. **Parse** CVs through the **real parser** (the same code path as the app), which writes `ai_runs`. Then create the embeddings.
7. **Load jobs** from the JD files (JD extraction → job versions) → gap check → score every CV against every job (top 50 per job).
8. **Create pipeline entries** with **back-dated** stage entry times, so On track / Due soon / Overdue all appear from day one.
9. **Load** the Singapore public holidays for the relevant years.
10. **Idempotent:**
    - The key is the blob `pathname` (`cv_files.source_ref`), with the SHA-256 in `cv_files.source_hash`.
    - An unchanged hash means skip. A changed hash means re-parse (recruiter overrides survive).
    - Re-running the seed rebuilds the same state. This is the MVP's backup plan.

## Answer key (decided: Claude drafts, humans verify)

The **answer key** is the ground truth for `npm run eval` (see `ai-eval`).

- A task drafts it from the CVs and jobs.
- Recruiters **verify and correct** it before it counts. An unverified entry is excluded from the quality bar.
- It contains no secrets and only fictional people, so it **may be committed** (`eval/answer-key/`). It's keyed by the file's SHA-256, never by blob URL.
