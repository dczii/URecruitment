---
name: ai-eval
description: >
  The URecruitment AI quality gate: the answer key (Claude drafts, recruiters verify), its file
  format, how parsed-field accuracy and top-5 agreement are scored, EN and ZH graded separately
  against the PRD bar (≥90% fields, ≥80% top-5), `npm run eval`, reports, CI triggers and cost
  control. Use when drafting/verifying the answer key, building or running the eval, or changing
  any prompt, parser or matcher.
---

# AI eval

## The bar (decided)

- **Parsed CV fields:** ≥ **90%** correct.
- **Match rankings:** recruiters agree with ≥ **80%** of top-5 rankings.
- **Same bar for English and Chinese**, graded **separately**. Both must pass. Don't average them together.
- Runs **before each release** and on every PR that changes prompts, parser, matcher or schemas.

## Answer key (decided: Claude drafts, humans verify)

```
eval/
  answer-key/
    cvs/<cvKey>.json
    jobs/<jobKey>.json
  scoring.ts          # comparison rules (unit-tested)
  run.ts              # npm run eval
  reports/            # gitignored; CI uploads as an artifact
```

**Keys**
- `cvKey` is the first 16 hex characters of the SHA-256 of the file bytes.
- **Don't commit Drive file IDs**, because the repo is public.
- The eval matches keys by hashing the files the seed downloads.

**`cvs/<cvKey>.json`**
```json
{
  "cvKey": "3f9a…",
  "fileName": "30_nguyen_mai_anh_resubmission.pdf",
  "language": "en",
  "verified": false,
  "verifiedBy": null,
  "verifiedAt": null,
  "draftedBy": "claude",
  "fields": {
    "name": "…", "email": "…", "phone": "…", "location": "…",
    "workHistory": [{ "employer": "…", "title": "…", "start": "2021-04", "end": "2026-01" }],
    "education": [{ "institution": "…", "qualification": "…", "end": "2017" }],
    "certifications": ["…"],
    "skills": ["…"],
    "languages": ["…"],
    "totalYearsExperience": 8.6
  },
  "notes": ""
}
```

**`jobs/<jobKey>.json`**
```json
{
  "jobKey": "qa-automation-lead",
  "language": "en",
  "verified": false,
  "expectedTop5": ["<cvKey>", "…"],
  "acceptableAlternates": ["<cvKey>"],
  "rationale": "…"
}
```

**Drafting (Claude):**
- Read each CV **directly**: the source file, via the Drive connector or a local download. **Don't** run the app's parser, which would make the check circular.
- Fill every field, and set `verified: false`.
- For jobs, rank the candidates by reading the job and the CVs. Explain the choice in `rationale`.

**Verifying (recruiters):**
- They correct the JSON, directly or through the verification workflow (E11-S02-T03), then set `verified: true` with their name and date.
- **Only verified entries count** toward the bar. The report always shows coverage (verified / total, per language).

## Scoring (proposed — confirm in the eval task's spec before relying on it)

| Field | Correct when |
|---|---|
| email, phone | Exact match after normalisation (lowercase; digits only with country code) |
| name, location, employer, title, institution | Normalised match (case, whitespace, punctuation, full/half-width) or an approved alias in `notes` |
| dates | Same year-month; the `end` null/current flags match |
| totalYearsExperience | Within ±0.5 years |
| list fields (skills, languages, certifications) | Each expected item found counts as one field; each extra item counts as one error |
| workHistory / education | Per entry, each sub-field is counted individually |

- **Field accuracy** = correct field units / total expected field units, per language.
- **Top-5 agreement (proposed):** per job, `|modelTop5 ∩ (expectedTop5 ∪ acceptableAlternates)| / 5`, averaged across verified jobs, per language. A job's language is the language of its JD.

The comparison rules in `scoring.ts` are **unit-tested first**.

## `npm run eval`

- **Inputs:** the Drive files (via the seed downloader and env credentials), the active prompt versions, and the active models.
- **Options:**
  - `--only parse|match`
  - `--lang en|zh`
  - `--sample N` (a cheap smoke run, not valid for the release gate)
  - `--reuse-runs` (score existing `ai_runs` for the same prompt + model versions, instead of calling the model again)
- **Output:**
  - `eval/reports/<timestamp>.json` and `.md`, containing per-language accuracy, top-5 agreement, coverage, the worst fields, per-CV diffs, prompt/model versions and total cost.
  - Exit code **non-zero** if any verified language is below the bar.
  - When coverage is 0 for a language, the report says so instead of claiming a pass.

## CI

- Run on PRs touching `src/server/ai/**`, `eval/**`, or parser/matcher services, and on release.
- Needs secrets (AI keys, Drive credentials). **Skip the job, with a visible notice, on forks or when the secrets are absent.** Never fail silently.
- Post the Markdown summary as a job summary. Upload the JSON as an artifact.

## Grading sessions (MVP exit)

- Recruiters grade EN and ZH in separate sessions, using the same bar.
- Their disagreements update the answer key through a PR, with a note explaining each change.
