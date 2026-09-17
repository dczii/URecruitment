# ADR-0003 — AI provider decision brief and provider-agnostic contract

## Status

**Open** · 2026-09-17 · created by [#73](https://github.com/dczii/URecruitment/issues/73)
(story [#19](https://github.com/dczii/URecruitment/issues/19), epic
[#1](https://github.com/dczii/URecruitment/issues/1))

> **The AI provider has not been chosen, and this record does not choose it.**
> It records the criteria, the contract every AI call must satisfy so that no code depends on a
> provider, who owns the choice and what unblocks it. A task that needs the answer is blocked (D5);
> a task that only needs the *shape* can build against the contract (D2) today.
>
> When the choice is made it is recorded in a **new** record that supersedes this one. Nothing
> settles it in a PR, a prompt or an env var alone.

Builds on [ADR-0001](adr-0001-architecture.md) (where AI calls run) and
[ADR-0002](adr-0002-data-model.md) (`ai_runs`, `embeddings`, `match_scores`).
Read [README.md](README.md) for the status vocabulary.

## Context

The PRD is explicit on both halves of this:

> **AI governance 6 (decided):** *"The dev team picks the provider, weighing Simplified Chinese
> quality, cost and **where data is processed**. If real CVs are processed outside Singapore, PDPA
> overseas-transfer rules apply."*
>
> **Integrations → AI model provider (MVP):** provider *"still to decide"*.

So the *right to choose* is decided and sits with the dev team; the *choice* is **open**. Meanwhile
five capabilities — CV parsing, job-description extraction, match scoring, gap check and search-query
parsing — plus embeddings all depend on a model, and they are most of the MVP.

Waiting for the decision would stall the build. Guessing would scatter provider assumptions through
the codebase, and the first cost, quality or PDPA finding would then be a rewrite rather than an env
change. The way out is a contract: pin down everything the application may assume, so the provider
becomes a configuration detail.

One more reason not to guess: the decision is not purely technical. **Where the provider processes
data** is a PDPA question that only bites once real CVs arrive, which is after the MVP's go/no-go.
Choosing on MVP convenience could commit the agency to a provider it cannot lawfully use later.

## Decision

### D1 — The decision is open, and stays open

No provider is selected, recommended or implied by this record. No provider package is added to
`package.json` and no provider key is required until the choice is recorded.

### D2 — The provider-agnostic contract

Every AI call in URecruitment satisfies all of these. They are what application code may assume;
nothing else about a provider may be assumed anywhere.

**C1 — One import site.** Access goes through the **Vercel AI SDK** (PRD technical choices → AI
access, **proposed**). **Only `src/server/ai/provider.ts` imports a provider package.** Every other
file asks that module for a model. A reviewer can confirm provider independence by grepping the
import list of one file.

**C2 — Models are requested by role, never by name.** The roles are `parse`, `match`, `gap`,
`search`, `jd` and `embed`. Model ids come from environment variables — `AI_MODEL_PARSE`,
`AI_MODEL_MATCH`, `AI_MODEL_GAP`, `AI_MODEL_SEARCH`, `AI_MODEL_JD`, `AI_EMBED_MODEL` — plus the
provider key(s). `provider.ts` also returns a **`modelVersion` string**, which is stored on every
run and on every score. No model id is hard-coded in a prompt, a service or a test.

**C3 — Structured output, validated twice.** Every step declares a fixed schema and receives JSON
against it. The SDK validates, and then the application **validates again with the same Zod schema**,
because the contract must hold regardless of what a given SDK version enforces. On a schema failure:
retry **once** with the validation error appended, then fail. Calls use low temperature and an
explicit timeout.

**C4 — One wrapper, one audit row.** Every call goes through `runAi()`
([#169](https://github.com/dczii/URecruitment/issues/169)), which writes an `ai_runs` row **before**
the call (`status='running'`, step, prompt id and version, provider, model id, model version, input
reference and SHA-256 of the input) and updates it after (output, token counts, cost, duration,
`status='succeeded'|'failed'`, an error message **carrying no CV text**). It returns the typed result
together with the `ai_run_id`, so every stored result links back to its run
([ADR-0002](adr-0002-data-model.md) invariant 3).

**C5 — Fairness is enforced in code, before the provider boundary.** `buildScoringProfile()` removes,
from anything sent for matching or scoring:

- **name, photo, age, gender, race, religion and marital status** — the seven the PRD names (PRD,
  Job matching → Requirements 2, **decided**);
- **plus date of birth, ethnicity and contact details** — stricter by design, from the `ai-pipeline`
  skill rather than the PRD, because each is a close proxy for one of the seven.

**Nationality and language are
included only when the job version marks that requirement as required *and* carries a non-empty
written reason** (PRD, **decided**). This is a property of the input, not of the prompt, so it cannot
be lost by changing provider or wording, and unit tests prove each attribute is absent from the model
input. *Known gap, recorded not fixed:* the Workplace Fairness Act (end-2027) also covers pregnancy,
caregiving, disability and mental health, which the PRD does not yet exclude explicitly. **Do not add
them as scoring inputs.**

**C6 — Evidence is verbatim and verified in code.** Every claim — a parsed field, a skill, a matched
or missing or uncertain item, a gap flag — carries `source_text` that the application checks against
the input after whitespace normalisation, handling full-width and half-width characters for Chinese.
Unverifiable evidence keeps its value with `evidence_verified = false` and is shown as "source not
found". **A quote is never invented.**

**C7 — Model output is data, never an action.** CV and job text is passed as clearly delimited data;
model output is never executed. **No tool calls, no URL fetching, no SQL built from model text.**
Output that becomes a search filter is validated against allowed fields and value types before it
reaches the query. And the product rule above all of these: **the AI only suggests** — no model
output rejects, advances, shortlists or contacts a candidate, or sends anything to a client.

**C8 — Cost and abuse are bounded before the call.** `runAi()` checks the **monthly spend cap**
(`AI_MONTHLY_SPEND_CAP`, summed from `ai_runs.cost`) and fails fast without calling the model. AI
routes live under `/api/ai/*` and are **rate-limited by path** — a Vercel firewall rule if the plan
offers one, otherwise an app-level limiter backed by Supabase;
[#175](https://github.com/dczii/URecruitment/issues/175) picks one and records which. Necessary
because the MVP has no sign-in, so anyone with the URL could otherwise run up the agency's bill. Retries are for transient
errors only (rate limit, 5xx), with backoff, at most 3 attempts.

**C9 — Embeddings may come from a different provider than text.** The interface takes text and
returns a vector; nothing assumes it is the same vendor, the same key or the same SDK call. The
**vector dimension is a consequence of the chosen embedding model**, and the model id is stored
beside every vector so a model change is detectable rather than silently wrong.

**C10 — Data minimisation.** Each step sends only the text it needs. CV and JD text is never logged
to Sentry or the console, and `ai_runs.error` holds messages, not payloads.

**What the contract deliberately does not promise:** streaming, tool use, a context-window size, a
specific token price, prompt caching, or that one vendor covers both text and embeddings. Code that
needs any of those needs a new record first.

### D3 — Decision criteria

**From the PRD (decided).** These three are the stated basis for the choice:

| # | Criterion | What to evidence |
|---|---|---|
| 1 | **Simplified Chinese quality** | Parsing and scoring graded on the ~20 Chinese sample CVs **separately from English**, against the same bar. The PRD is explicit that ZH is not assumed to follow EN |
| 2 | **Cost** | Priced against the real MVP volume (D4) and the ongoing per-save re-score, against `AI_MONTHLY_SPEND_CAP` |
| 3 | **Where data is processed** | The processing region(s) in writing. Hosting stays in Singapore; a provider processing abroad must protect data to a comparable standard once real CVs arrive (PDPA overseas transfer, **decided**) |

**Operational, derived from the contract above** (not PRD text — recorded here so the comparison is
complete): ability to meet C3 (reliable schema-conformant JSON), the MVP capabilities in D4, latency
against the PRD's targets, and terms of use that permit this application.

### D4 — What the MVP needs from a provider

| # | Requirement | Where it comes from |
|---|---|---|
| R1 | **Structured JSON against a fixed schema** for all five steps: CV parsing, JD extraction, match scoring, gap check, search-query parsing | Contract C3 |
| R2 | **English and Simplified Chinese at comparable quality**, since EN and ZH are graded separately against the same bar: **≥ 90%** of parsed fields correct, recruiters agreeing with **≥ 80%** of top-5 rankings | PRD quality bar (**decided**) |
| R3 | **Direct PDF file input.** Some Chinese PDFs extract poorly; the fallback sends **the PDF itself** to a model that reads PDFs ([#128](https://github.com/dczii/URecruitment/issues/128)). Which path was used is recorded in `ai_runs` | PRD AI pipeline → Chinese PDFs |
| R4 | **Multilingual embeddings** covering EN and Simplified Chinese — from the same provider or a second one (C9) | PRD AI pipeline → Embeddings |
| R5 | **Volume:** seeding is roughly **200 parsing calls** and **1,000 scoring calls** (20 jobs × 50 candidates), once; afterwards each job save re-scores up to 50 candidates | PRD, MVP volume |
| R6 | **Latency:** a CV parsed in **under 30 s**; search results in **under 3 s** (the search model call plus one Postgres query) | PRD speed targets (**decided**) |
| R7 | **A written data-processing location** and terms permitting this use | Criterion 3 |

There is **no OCR requirement**: scanned or image-only CVs are out of scope and are rejected with a
clear message (**decided**).

> **Illustrative only — not a decision, not a shortlist, and not a recommendation.** The PRD itself
> observes, as a note rather than a choice, that one candidate model family reads PDFs directly and
> returns schema-checked JSON (which would satisfy R1 and R3), while its vendor offers no embedding
> model — so picking it would mean a second provider for R4. It is repeated here only to show that
> **C9 is a real constraint, not a hypothetical one.** Any evaluation starts from D3 and D4 with no
> candidate pre-favoured.

> **On the shortlist.** [#73](https://github.com/dczii/URecruitment/issues/73) asks for "the
> criteria, the shortlist and — most importantly — the contract". This record gives the criteria
> (D3), the requirements a candidate must meet (D4) and the contract (D2), but **deliberately names
> no shortlist**: the same issue's "Done when" requires that the record "never names a chosen
> provider", and a list of brands inside a record the backlog cites would harden into one. The
> shortlist is drawn up by the owner named in D6, as part of unblocking step 2, and appears in the
> successor record with its evidence.

### D5 — What this blocks, and what it does not

**Blocked on the choice itself — these cannot be completed:**

| Task | Why |
|---|---|
| [#111](https://github.com/dczii/URecruitment/issues/111) E03-S01-T03 — `embeddings` migration with pgvector | The **vector dimension** is fixed by the embedding model (C9). The rest of that migration (`match_scores`) is not blocked |
| [#145](https://github.com/dczii/URecruitment/issues/145) E06-S01-T01 — embedding service | Needs the embedding model and its dimension |
| [#128](https://github.com/dczii/URecruitment/issues/128) E04-S02-T03 — Chinese PDF fallback | Needs a model that accepts PDF file input (R3) |

**Buildable against the contract now, but not verifiable until the choice is made** — write them,
test them against a fake model, and leave the model id in env:

| Task | Note |
|---|---|
| [#169](https://github.com/dczii/URecruitment/issues/169) E11-S01-T01 — `runAi()` wrapper | The contract *is* its specification (C3, C4, C8, C10) |
| [#126](https://github.com/dczii/URecruitment/issues/126) E04-S02-T01 — CV parsing prompt and schema | Schema and prompt are provider-neutral |
| [#138](https://github.com/dczii/URecruitment/issues/138) E05-S02-T01 — JD extraction prompt and schema | " |
| [#141](https://github.com/dczii/URecruitment/issues/141) E05-S04-T01 — gap-check prompt and schema | " |
| [#146](https://github.com/dczii/URecruitment/issues/146) E06-S02-T01 — match-scoring prompt and schema | " |
| [#152](https://github.com/dczii/URecruitment/issues/152) E07-S01-T01 — search-query prompt and filter schema | Filter validation is C7, not provider-specific |
| [#173](https://github.com/dczii/URecruitment/issues/173) E11-S03-T01 — `npm run eval` | The harness and answer key are provider-neutral; **the grades are not** — the quality bar cannot be signed off until a real model runs |
| [#175](https://github.com/dczii/URecruitment/issues/175) E11-S04-T01 — rate limit and spend cap | Rate limiting is per route; the cap is a sum over `ai_runs.cost` |
| [#84](https://github.com/dczii/URecruitment/issues/84) E01-S01-T02 — typed env schema | The `AI_MODEL_*` and `AI_EMBED_MODEL` names are fixed by C2. The **provider key name** is added when the choice is made |

**Not blocked at all:** everything with no model call — the scaffold, the schema besides
`embeddings`, RLS, Storage, working days, the delay view, the pipeline board, the dashboard, the
design work, and every screen that reads stored results.

### D6 — Owner, and what unblocks the decision

**Decision owner: the dev team (PRD, decided). No individual is named yet — naming one is step 0.**
The PRD lists the AI provider among the setup details the dev team owns, alongside the intake
mailbox, the OneDrive folders and `.doc` conversion.

The decision is ready to make when all five of these exist:

1. **A named owner** on this record, not just "the dev team".
2. **A Chinese and English quality trial** on a sample of the fictional CVs, graded separately, showing
   each shortlisted provider against the bar (≥ 90% fields, ≥ 80% top-5). This needs the answer key
   ([#170](https://github.com/dczii/URecruitment/issues/170),
   [#171](https://github.com/dczii/URecruitment/issues/171)) or a throwaway harness — not the full
   eval script.
3. **A cost estimate** against the D4 volumes, for the seed and for steady-state re-scoring, set
   against `AI_MONTHLY_SPEND_CAP`.
4. **The processing location and terms in writing**, assessed against PDPA overseas transfer — the
   criterion that matters after go/no-go rather than during the MVP.
5. **The embedding model decided** — same provider or a second one — which fixes the vector dimension
   and unblocks [#111](https://github.com/dczii/URecruitment/issues/111).

**How it gets recorded:** a new record, `adr-0004-ai-provider-selection.md`, states the choice and the
evidence for each criterion, sets this record to `Superseded by ADR-0004`, and is followed by the env
vars and the unblocking of #111. **A provider chosen only in an env var or a PR description does not
count as decided.**

## Consequences

**What this makes easy**

- Prompt, schema, service and eval work all proceed now; only the model id is missing.
- Switching provider later — on cost, on quality, or because a PDPA assessment rules one out — is an
  env change plus one file, not a rewrite.
- Every run already records provider, model id and model version, so a switch is visible in the data
  and old scores stay interpretable ([ADR-0002](adr-0002-data-model.md) invariant 1).

**What this makes hard, on purpose**

- The quality bar cannot be signed off until a real model runs, so the eval gate stays red until the
  choice is made. That is the honest state, not a defect.
- Provider-specific features are unavailable by default. Wanting one means superseding this record.
- Unit tests run against a **fake model** with no network, which means prompt quality is proven by
  `npm run eval`, never by unit tests.

**What every later task now owes**

1. No provider package import outside `src/server/ai/provider.ts` (C1).
2. No hard-coded model id anywhere (C2).
3. Every call through `runAi()` — no direct SDK call from a service (C4).
4. Redaction and the nationality/language reason rule applied **in code** before the call (C5).
5. A task blocked by D5 says so in its spec and labels its issue `needs-decision`.
6. **Check the installed `ai` package version before writing code.** Structured-output and file-input
   APIs differ between majors; follow that version's docs rather than memory.

## Rejected alternatives

| Alternative | Why not |
|---|---|
| **Pick a provider now and move on** | The PRD leaves it open and names *where data is processed* as a criterion — a PDPA question that only bites once real CVs arrive, after go/no-go. Choosing on MVP convenience risks committing the agency to a provider it cannot lawfully use later. |
| **Call provider HTTP APIs directly, no SDK** | The PRD names the Vercel AI SDK (proposed), and a shared SDK is what makes C2's role indirection a config change instead of a rewrite per provider. |
| **Abstract behind a hand-rolled interface over several providers at once** | Multi-provider abstraction is real work and real bugs to serve a choice that will be made once. One import site (C1) plus roles (C2) gives the same freedom for far less. |
| **Let each capability pick its own model freely in code** | Model ids would spread across prompts and services, and `ai_runs` could not reliably record the model version a score was keyed to. Env-driven roles keep it in one place. |
| **Defer all AI work until the provider is chosen** | Would stall most of the MVP against a deadline of mid-December 2026. The contract lets everything except the three D5-blocked tasks proceed. |
| **Enforce fairness by instructing the model in the prompt** | A prompt is not a control: it varies by provider, by wording and by run, and it cannot be unit-tested. Redaction in code (C5) holds whoever is chosen. |
| **Record the choice in env vars or the PR that adds the package** | The criteria include a compliance judgment that outlives any PR. It needs a record that can be cited, challenged and superseded. |
