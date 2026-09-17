# AI evaluation plan and answer-key format

## Status

**Accepted** · 2026-09-17 · created by [#79](https://github.com/dczii/URecruitment/issues/79)
(story [#23](https://github.com/dczii/URecruitment/issues/23), epic
[#1](https://github.com/dczii/URecruitment/issues/1))

> **What this record confirms.** The `ai-eval` skill marks its scoring method **proposed**
> (*"confirm in the eval task's spec before relying on it"*). This record **confirms** that method
> for the backlog, with the refinements marked ⊕ below. Each refinement makes a rule unambiguous
> where the proposal left room for two readings. [#173](https://github.com/dczii/URecruitment/issues/173)
> builds exactly this, and a change to any rule needs a PR to this file first.

**The bar itself is not proposed. It is decided.** The PRD says: *"MVP quality bar (decided): at
least 90% of parsed CV fields are correct, and recruiters agree with at least 80% of top-5 match
rankings. The same bar applies to English and Chinese CVs."* And under AI governance 4: *"Recruiters
grade the AI on the sample set against the quality bar under Goals, with English and Chinese CVs
graded separately (decided)."*

This plan fixes **how that bar is measured**, before any prompt exists, so that the December
go/no-go rests on evidence planned for in advance. It does not choose a model or a provider
([DT-1](../decisions/open-questions.md#dt-1--the-ai-provider)).

## The bar

| Measure | Pass when | Graded |
|---|---|---|
| **Field accuracy** | **≥ 90%** of expected field units correct | English and Chinese **separately** |
| **Top-5 agreement** | **≥ 80%** mean agreement across verified jobs | English and Chinese **separately** |

- **Both languages must pass both measures.** Four numbers, four passes. **Never average EN and ZH
  together**, and never let a strong English result carry a weak Chinese one.
- **Same bar for both languages.** Chinese is not held to a lower bar, and it is not assumed to
  follow English.
- **Only verified answer-key entries count.** See [Verification](#verification-and-coverage).
- A measure with too few verified entries is **not evaluable**. At the release gate, "not
  evaluable" is **not a pass**.

## The answer key

### Layout

```
eval/
  answer-key/
    cvs/<cvKey>.json      # expected parsed fields for one sample CV
    jobs/<jobKey>.json    # expected top-5 for one sample job
  score.ts                # the rules below, unit-tested first (score.test.ts; T12 in the test strategy)
  verify.ts               # the verified-flag workflow and coverage (#172; verify.test.ts)
  report.ts               # JSON + Markdown report (#173)
  run.ts                  # npm run eval
  reports/                # gitignored; CI uploads it as an artifact
```

### Keys

| Key | Rule |
|---|---|
| `cvKey` | The **first 16 hex characters of the SHA-256** of the CV file's bytes (`ai-eval`) |
| `jobKey` | ⊕ The **same rule applied to the job description file's bytes**. `ai-eval`'s example uses a readable slug; a hash ties the entry to exactly one seeded file, as it does for CVs. The readable name goes in `label` |
| `sha256` | ⊕ The **full** 64-character hash, stored inside each entry, so a 16-character collision would be detected rather than silently merged |

The eval matches entries by hashing the files the seed downloads. A changed file gets a new key, and
its old entry stops matching. The report lists it as orphaned rather than grading it against the
wrong file.

### What the committed key must never contain

The key contains only fictional people and no secrets, so it **may be committed**. Even so:

- **No sample-data store URL or base URL**, in any field (`CLAUDE.md` hard rule 6).
- ⊕ **No file name either.** `ai-eval`'s example includes `fileName`, but the drafting task
  [#170](https://github.com/dczii/URecruitment/issues/170) excludes *"any file name or URL from the
  sample-data store"*, and the stricter rule wins. The store's names include personal-looking names
  (fictional, but indistinguishable from real ones to a reader), and the hash already identifies the
  file. The eval report, which is gitignored, shows file names locally so verifiers can find each CV.
- **No real personal data**, ever.

### `cvs/<cvKey>.json`

```json
{
  "cvKey": "3f9a0c1d2e4b5a67",
  "sha256": "3f9a0c1d2e4b5a67…(64 hex characters)",
  "language": "en",
  "draftedBy": "claude",
  "verified": false,
  "verifiedBy": null,
  "verifiedAt": null,
  "fields": {
    "name": "…",
    "email": "…",
    "phone": "…",
    "location": "…",
    "workHistory": [
      { "employer": "…", "title": "…", "start": "2021-04", "end": "2026-01", "current": false }
    ],
    "education": [{ "institution": "…", "qualification": "…", "end": "2017" }],
    "certifications": ["…"],
    "skills": ["…"],
    "languages": ["…"],
    "totalYearsExperience": 8.6
  },
  "totalYearsAsOf": "2026-09-17",
  "aliases": {
    "fields.location": ["…"],
    "fields.skills[]": { "…": ["…"] }
  },
  "ambiguities": [],
  "notes": ""
}
```

- `language` is `"en"` or `"zh"`: the language **the CV is written in**. A bilingual CV takes the
  language of most of its body text, and the choice is noted in `ambiguities`.
- ⊕ `aliases` holds **structured**, approved alternative answers (`ai-eval` keeps them in free-text
  `notes`, which a script cannot read reliably). The key is the field path; list items map each
  expected value to its accepted variants.
- ⊕ `ambiguities` lists anything the drafter could not decide ([#170](https://github.com/dczii/URecruitment/issues/170):
  *"A note of any CV whose correct answer is genuinely ambiguous, so a recruiter decides rather than
  the draft"*). **An entry with an unresolved ambiguity cannot be marked verified.**
- `verifiedBy` is the recruiter's typed name, and `verifiedAt` is a Singapore date (`YYYY-MM-DD`).
- ⊕ `totalYearsAsOf` is the date that "present" roles run up to when total years is computed (see
  *Total years*). It is a structured field because the scorer needs to read it.

### `jobs/<jobKey>.json`

```json
{
  "jobKey": "9c2e71b04d5f3a18",
  "sha256": "9c2e71b04d5f3a18…(64 hex characters)",
  "label": "QA automation lead",
  "language": "en",
  "draftedBy": "claude",
  "verified": false,
  "verifiedBy": null,
  "verifiedAt": null,
  "expectedTop5": ["<cvKey>", "<cvKey>", "<cvKey>", "<cvKey>", "<cvKey>"],
  "reasons": { "<cvKey>": "one line: why this candidate belongs in the top 5" },
  "acceptableAlternates": ["<cvKey>"],
  "flags": [],
  "ambiguities": []
}
```

- `language` is the language **the job description is written in**.
- `expectedTop5` has **one to five** distinct `cvKey`s. Order is informative only (see the top-5
  rule). Each has a **one-line reason** in `reasons`, as
  [#171](https://github.com/dczii/URecruitment/issues/171) requires.
- ⊕ **Fewer than five plausible candidates are flagged, never padded** (#171). Such a job lists
  fewer keys and carries `"flags": ["fewer-than-five"]`. It can still be verified, and it is graded on
  its own size K (see the top-5 rule).
- `acceptableAlternates` holds candidates a recruiter would also accept in a top 5. It may be empty.
  It must not overlap `expectedTop5`.
- The candidate pool for a job is **every sample CV**, in either language, as the matcher sees it.

### Drafting (Claude)

- Claude reads each **source file directly** from the seed's download cache or the store, and fills
  every field by reading it. **It never runs the app's parser or matcher**, which would make the check
  circular (`ai-eval`).
- Every entry starts with `verified: false`.
- Job rankings come from reading the job and the CVs, with a one-line reason per candidate in `reasons`. Protected
  attributes play no part in the ranking unless the job requires nationality or language **with a
  written reason**, exactly as the product rule says.
- Drafting tasks: [#170](https://github.com/dczii/URecruitment/issues/170) (CVs) and
  [#171](https://github.com/dczii/URecruitment/issues/171) (jobs).
- ⊕ **A known correlation risk.** If the chosen provider is from the same model family that drafted
  the key, their errors may agree and inflate the score. Mandatory human verification is the
  mitigation. The go/no-go pack notes which family drafted the key and which one ran the eval.

## Field accuracy: the rule

**Field accuracy for a language** = *correct field units* ÷ *counted field units*, summed over every
**verified** CV entry in that language.

### Field units

| Field | Units per CV | A unit is correct when |
|---|---|---|
| `name`, `location` | 1 each | The normalised values are equal, or the output matches an approved alias |
| `email` | 1 | Equal after lowercasing and trimming |
| `phone` | 1 | ⊕ The **digit strings** are equal after removing everything but digits. The key records the number **as the CV writes it**, with a country code only if the CV shows one. The scorer adds no country code of its own, and [#126](https://github.com/dczii/URecruitment/issues/126)'s schema returns the number as written, with no country code added |
| `totalYearsExperience` | 1 | Within **±0.5 years** |
| `workHistory[]` | 4 per **expected** entry (`employer`, `title`, `start`, `end`) | `employer`, `title`: normalised equal or alias. Dates: see *Dates* |
| `education[]` | 3 per **expected** entry (`institution`, `qualification`, `end`) | as for `workHistory` |
| `certifications[]`, `skills[]`, `languages[]` | 1 per **expected** item | The item appears in the output list after normalisation (or as an approved alias) |

### Three rules that remove ambiguity ⊕

1. **An expected null still counts.** When the CV states no phone (for example), the key says
   `null`, and the unit is correct only if the output is also null or absent. **Inventing a value is
   an error.** The five scalar units (`name`, `email`, `phone`, `location`,
   `totalYearsExperience`) are therefore always counted.
2. **Extras count against accuracy.** Every **extra** list item (a skill the CV does not support) and
   every sub-field of an **extra** work-history or education entry adds **one incorrect unit** to the
   denominator. So accuracy = correct ÷ (expected units + extra units). A **missing** entry's
   sub-fields are simply incorrect expected units.
3. **Entries are aligned before they are compared.** A pair is formed **only** between an output
   entry and an expected entry that share **at least one** matching sub-field. Pairs are chosen
   greedily, highest match count first. Ties go to the earlier expected entry, then to the earlier
   output entry. Unpaired output entries are extras, and unpaired expected entries are missing.

### Normalisation

Applied to both sides of **text fields and list items**. It does **not** apply to `email` or
`phone`, which have their own rules above, or to dates. The steps run in this order:

1. Unicode **NFKC** (folds full-width and half-width forms, which matters for Chinese text);
2. lowercase (Latin);
3. replace each punctuation character in `.,;:()[]'"-/`, and each full-width form of them, with a
   **space**;
4. trim, and collapse internal whitespace to single spaces;
5. **no transliteration and no translation.** Chinese is compared as Simplified Chinese characters.
   A CV written in Chinese expects Chinese values unless the CV itself gives an English form.

**Near-misses are not scored as partly right.** There is no fuzzy matching in the scorer. "React.js"
against "React" is wrong **unless** a verifier approves the alias. The verifier decides what counts
as the same thing, the scorer does not guess, and the result is reproducible.

### Dates

- Values are `YYYY-MM`, or `YYYY` when the CV gives only a year.
- **Year-only in the key:** correct when the output's year matches (the month is ignored).
- **Year-month in the key:** correct only when both match.
- **Current role:** the key has `"end": null, "current": true`. The output is correct only if it also
  marks the role current. A made-up end date is wrong.

### Total years

`totalYearsExperience` in the key is **computed from the expected work history**, with overlapping
periods counted once and present roles running up to `totalYearsAsOf`. That field holds the CV's own
date if it gives one, and otherwise the drafting date. ⊕ **The eval computes the output's total years
as of the same `totalYearsAsOf`**, so the result does not drift as calendar time passes.
It is **not** taken from the CV's own claim (PRD: *"Total years of experience, calculated from work
history"*). The output passes within ±0.5 years.

## Top-5 agreement: the rule

**Per job:**

> agreement(job) = |modelTopK ∩ (expectedTop5 ∪ acceptableAlternates)| ÷ K
>
> where **K = the number of keys in `expectedTop5`** (5, or fewer for a job flagged
> `fewer-than-five`), and **modelTopK** is the model's K highest-scored candidates.

**Per language:** the **mean** of agreement(job) over every **verified** job whose job description is
in that language.

- **What is compared.** The model's top 5 is compared as a **set** against the recruiter-verified
  acceptable set. The order within the top 5 is **not** scored. The PRD measures whether recruiters
  *"agree with"* the top-5 rankings, which is a question of who is in them.
- **modelTopK** is the K highest stored scores for that job's **current version** and the
  **active model version**. Stale scores are never used, which matches the product invariant.
- ⊕ **Ties.** Candidates are ordered by score descending, then by `cvKey` ascending. This is
  deterministic, and it gives neither side an advantage. The report **flags every job where a tie
  straddles the K-th place**, so a verifier can see when the result hinged on it.
- ⊕ **Fewer than K scored candidates.** The denominator stays **K**. Missing slots count as
  disagreement, because a thin shortlist is a real failure.
- **Which language a job counts under.** A job counts under **the language of its job description**
  (`ai-eval`, confirmed). The PRD's *Languages* requirement (*"English and Simplified Chinese CVs and
  job descriptions"*, decided) means the sample set is expected to include Chinese job descriptions.
  The coverage minimum below keeps a partial set from passing silently.
- **A dependency, raised rather than settled.** Release mode needs at least 3 verified **Chinese job
  descriptions** and at least 10 verified **Chinese CVs** (see *Coverage minimums*). On 17 Sep 2026
  the sample store held neither (`prd-context` → `references/sample-data.md`). This is recorded as
  [RC-4](../decisions/open-questions.md#rc-4--chinese-coverage-of-the-sample-set) in the
  open-questions register, for the product owner, who supplies the sample files. **Grading rankings by
  CV language was considered and not adopted,** because a job's top 5 mixes languages, which would
  split a single ranking across two grades.

## Verification and coverage

- **Only `verified: true` entries count toward the bar.** Unverified entries are excluded from the
  numbers and **listed in the report** with a count (`ai-eval`; [#172](https://github.com/dczii/URecruitment/issues/172)).
- **Recruiters verify** by correcting the JSON (directly, or through [#172](https://github.com/dczii/URecruitment/issues/172)'s
  workflow) and setting `verified: true` with their typed name and a Singapore date. An entry with
  open `ambiguities` cannot be verified.
- **A correction is a PR** with a short note per change, so the key's history is reviewable.
- ⊕ **Coverage minimums** before a measure is **evaluable** for a language:
  - field accuracy: at least **10 verified CVs** in that language (the PRD target is about 20 Chinese CVs);
  - top-5 agreement: at least **3 verified jobs** in that language.

  These two numbers are set here as **proposed** starting values. A PR to this file can change
  them. Below the minimum, the report says **"not evaluable"** with the counts. It never says "pass".
- The report always shows **verified / total per language** for both measures.

## Outputs

`npm run eval` writes `eval/reports/<timestamp>.json` and `.md` (gitignored). The Markdown summary
goes to the CI job summary, and the JSON is uploaded as an artifact.

Each report contains:

- **per language:** field accuracy (with correct and counted units), top-5 agreement (with the job
  count), coverage, and pass / fail / not evaluable;
- the **worst fields** by error count, per language;
- **per-CV diffs** (expected vs output, unit by unit). File names appear **only in local runs**.
  ⊕ In CI, the report shows `cvKey` only, because the job summary and artifact belong to a public
  repository;
- **per-job** agreement, with tie flags;
- **orphaned entries** (a key whose file no longer exists) and **unkeyed files** (a sample file with
  no entry);
- the **prompt versions, model ids and model versions** used, and the run date;
- **the total AI cost** and the call count, from `ai_runs`.

**Exit codes:**

| Mode | Exits non-zero when |
|---|---|
| Default (PR) | Any **evaluable** measure is below the bar |
| ⊕ `--release` | Any measure is below the bar **or not evaluable** |

**Options** (`ai-eval`):

- `--only parse|match`
- `--lang en|zh`
- `--sample N`: a cheap smoke run. **It never counts for the release gate**, and the report says so.
- `--reuse-runs`: grade stored `ai_runs` for the same prompt and model versions instead of calling the model again.
- `--release`: the ⊕ addition above.

## When it runs and what it costs

| Trigger | What runs | Blocks |
|---|---|---|
| A PR touching `src/server/ai/**`, `eval/**`, or the parser, matcher or prompt schemas | The **affected half only** (`--only parse` or `--only match`), full set, default mode | Reported on the PR. The job can go red, but ⊕ **`eval.yml` is never made a required check**, so a below-bar result is a finding for the Claude review rather than an automatic merge block. Prompt work is iterative |
| `workflow_dispatch` | Anything, with options | Nothing |
| **Before each MVP release** and before the go/no-go | Full set, both halves, `--release` | **Yes.** A failing or non-evaluable result is recorded as such by the release-readiness check ([#179](https://github.com/dczii/URecruitment/issues/179), which runs this mode) and raised as an issue. Proceeding anyway is the product owner's decision, recorded in [#181](https://github.com/dczii/URecruitment/issues/181). This plan does not pre-authorise it |
| A fork, or missing secrets | Skipped with a visible notice | Nothing. It never fails silently |

**Cost** (the provider is not chosen, so this is an order of magnitude, not a price):

- **A full run** is roughly the PRD's MVP volume: about **200 parsing calls** and up to **1,000
  scoring calls** (20 jobs × 50 candidates).
- **Rough token volume**, assuming a few pages per CV and a redacted profile plus a job per scoring
  call: about **3–4 million input tokens** and **under 1 million output tokens** per full run.
- **At illustrative per-million-token prices** for a mid-range and a premium model, that is on the
  order of **tens of US dollars per full run for the mid-range model, and up to about a hundred for the
  premium one**. The figure is recomputed once [DT-1](../decisions/open-questions.md#dt-1--the-ai-provider)
  is decided, and the report always shows the real cost from `ai_runs`.
- **Keeping it low:**
  - PRs run only the affected half.
  - `--reuse-runs` re-grades without new calls after an answer-key correction.
  - `--sample` is for smoke checks.
  - Every call counts against the monthly spend cap (`AI_MONTHLY_SPEND_CAP`), so an eval can
    never exceed it.

## Grading sessions (MVP exit)

- Recruiters grade **English and Chinese in separate sessions**, against the same bar (PRD, decided).
  The session guide is [#180](https://github.com/dczii/URecruitment/issues/180).
- Disagreements found in a session update the answer key **by PR**, with a note per change. The eval
  is then re-run with `--reuse-runs`.
- The go/no-go pack ([#181](https://github.com/dczii/URecruitment/issues/181)) quotes the release-mode
  report: all four numbers, their coverage, and anything not evaluable, **stated as such**.

## Out of scope

- Drafting the answer key ([#170](https://github.com/dczii/URecruitment/issues/170), [#171](https://github.com/dczii/URecruitment/issues/171)).
- Writing `npm run eval` ([#173](https://github.com/dczii/URecruitment/issues/173)).
- Choosing the model or provider ([DT-1](../decisions/open-questions.md#dt-1--the-ai-provider)).
