# Compliance baseline — PDPA, fair employment and AI governance

## Status

**Accepted** · 2026-09-17 · created by [#77](https://github.com/dczii/URecruitment/issues/77)
(story [#22](https://github.com/dczii/URecruitment/issues/22), epic
[#1](https://github.com/dczii/URecruitment/issues/1))

> **This is an engineering record, not legal advice.** It records what the PRD requires, what the MVP
> already does about it, and what the real-data release must add. Whether a **legal review** is needed
> before real CVs are loaded is itself an open question
> ([OQ-1](../decisions/open-questions.md#oq-1--what-must-be-in-place-before-real-cvs-are-loaded)).
> Anything that needs a lawyer becomes a `needs-decision` issue, never a line in this file.

The accepted and open risks are in [risk-register.md](risk-register.md). The security controls this
record relies on are in [../security/baseline.md](../security/baseline.md). The `compliance-review`
skill reviews changes against both.

**Why an MVP on fictional data needs this.** The PRD is direct: *"The MVP holds only fictional
candidates, so PDPA risk is low until real CVs are loaded. The rules below apply from the real-data
release."* Two things still bind the MVP today:

1. **No real data may enter** (`CLAUDE.md` hard rule 6).
2. **The design must not block the real-data obligations.** A control that needs a schema change
   against live candidate data, at the moment of highest risk, is the failure this record exists to
   prevent. That is why [ADR-0002](../decisions/adr-0002-data-model.md) D3 creates the consent and
   retention columns from the first migration.

## PDPA

One row per area in the PRD's *Data, privacy & compliance* table. Requirements and statuses are the
PRD's own.

### Protection

| | |
|---|---|
| PRD requirement | *"Keep CVs from being seen by anyone outside the agency. No sign-in is accepted for the MVP; whether it is needed before real data is open"* |
| PRD status | **At risk** (whether sign-in is needed: **open**) |
| MVP position | **No sign-in, accepted for fictional data only.** The controls that exist anyway: server-only data access, RLS locked down on every table, a private bucket with signed links of ≤ 300 s, rate-limited AI routes and a spend cap ([security baseline](../security/baseline.md) C1–C5) |
| MVP must be designed for | Access protection being **added** without reworking data access: every read already goes through `src/server/**`, so adding an identity check is a server change, not a client rewrite ([ADR-0001](../decisions/adr-0001-architecture.md)) |
| Real-data requirement | Sign-in or office-network-only access **before** any real CV is loaded. Which one, and what else is required, is [OQ-1](../decisions/open-questions.md#oq-1--what-must-be-in-place-before-real-cvs-are-loaded) |
| Owning work | [#16](https://github.com/dczii/URecruitment/issues/16) E15 *Access protection before real data* |
| Risk | [R-01](risk-register.md#r-01--no-sign-in) |

### Consent

| | |
|---|---|
| PRD requirement | *"Recruiters get consent by phone or their own email and record the date and method. The dashboard reminds the recruiter after 7 days, and the CV is deleted after 14 days without consent (reminder timing carried over from the email plan). Candidates without consent are hidden from search and matching"* |
| PRD status | **Decided** |
| MVP position | Not built, and must not be: consent is real-data scope, and the MVP holds fictional people who cannot consent to anything. Search and matching include every sample candidate |
| MVP must be designed for | `candidates.consent_status`, `consent_date` and `consent_method` exist from the first migration and stay unwritten ([#110](https://github.com/dczii/URecruitment/issues/110); ADR-0002 D3). Search keeps a hook for a consent filter ([`talent-search`](../../.claude/skills/talent-search/SKILL.md)). The dashboard can gain a reminder section without a redesign, because it is already the only place alerts appear |
| Real-data requirement | Record consent with date and method; a **dashboard** reminder after **7 days**; **delete** the CV after **14 days** without consent; hide non-consented candidates from search and matching |
| Never | The portal **sends no email**, including consent requests (`CLAUDE.md` hard rule 2). "Their own email" means the recruiter's own mailbox, outside the portal |
| Owning work | [#15](https://github.com/dczii/URecruitment/issues/15) E14 |

### Retention

| | |
|---|---|
| PRD requirement | *"Delete or anonymise a candidate 12 months after their last activity, with a warning 30 days before (warning proposed)"* |
| PRD status | **Decided** (the 30-day warning: **proposed**) |
| MVP position | Not enforced. Fictional data is rebuilt from the seed |
| MVP must be designed for | `candidates.last_activity_at` exists from the first migration ([#110](https://github.com/dczii/URecruitment/issues/110)). ADR-0002 D3 leaves it **unwritten until the real-data release**. The `compliance-review` checklist's MVP line says "`last_activity_at` maintained". The two disagree, and the accepted ADR governs until a follow-up aligns them (see *Known inconsistencies* below). Search keeps a hook for a retention filter. Any job that deletes data must fit Vercel Hobby's once-a-day cron, or run as a database job |
| Real-data requirement | Delete or anonymise **12 months** after last activity; warn **30 days** before, on the dashboard; hide candidates past retention from search |
| Owning work | [#15](https://github.com/dczii/URecruitment/issues/15) E14 |

### Overseas transfer

| | |
|---|---|
| PRD requirement | *"Hosting stays in Singapore. If the AI provider processes data abroad, it must protect it to a comparable standard"* |
| PRD status | **Decided** |
| MVP position | Hosting pinned: Vercel functions in **`sin1`**, Supabase in **`ap-southeast-1`**. Job state and queues stay in Supabase. The PRD's free-tier table warns that *"Some managed job services store run data in the US by default"*, with the response *"Keep job state and queues in Supabase"*. **The AI provider is not chosen** ([DT-1](../decisions/open-questions.md#dt-1--the-ai-provider)), so where CV text is processed is unknown. That is acceptable only because the text is fictional |
| MVP must be designed for | The provider being swappable after a PDPA assessment: [ADR-0003](../decisions/adr-0003-ai-provider.md) keeps one import site and env-driven models, and records "where data is processed" as a decision criterion |
| Real-data requirement | The provider's processing location in writing, assessed for comparable protection **before** real CVs are sent to it |
| Owning work | ADR-0003 → its successor ADR-0004; the go/no-go pack ([#181](https://github.com/dczii/URecruitment/issues/181)) |

### Access & correction

| | |
|---|---|
| PRD requirement | *"Let recruiters export or correct a candidate's data on request"* |
| PRD status | **Proposed** |
| MVP position | **Correction exists:** recruiters can edit any parsed field, and edits survive re-parsing ([#132](https://github.com/dczii/URecruitment/issues/132), [#133](https://github.com/dczii/URecruitment/issues/133)). **Export does not.** |
| MVP must be designed for | One merge function that produces the effective profile ([#132](https://github.com/dczii/URecruitment/issues/132)), so an export can reuse it and never has to re-derive the data |
| Real-data requirement | Export on request, plus correction as in the MVP |
| Owning work | [#15](https://github.com/dczii/URecruitment/issues/15) E14 |

### Breach notification

| | |
|---|---|
| PRD requirement | *"Log access and changes so a breach's scope can be assessed quickly"*. Also: *"A breach affecting 500 or more people must be reported to PDPC within 3 calendar days of confirming it is notifiable"* |
| PRD status | **Proposed** (logging); the 500-person, 3-day rule is recorded from PDPC guidance |
| MVP position | **Changes are logged:** `stage_events`, `settings_log`, `ai_runs`, and profile overrides with the typed name. **Access is not logged.** The typed name is not a verified identity, so the log shows *what* changed, not reliably *who* changed it |
| MVP must be designed for | Append-only audit tables; no CV text in logs or Sentry, so a log leak is not itself a breach of CV content ([#86](https://github.com/dczii/URecruitment/issues/86)) |
| Real-data requirement | Access logging (tied to a signed-in identity if OQ-1 chooses sign-in), and a procedure that reports a breach to PDPC **within 3 calendar days** once it is confirmed notifiable (500 or more people affected). The PRD notes that *"At up to 1,000 CVs a month, the database passes 500 people quickly"* |
| Owning work | [#15](https://github.com/dczii/URecruitment/issues/15) E14 and [#16](https://github.com/dczii/URecruitment/issues/16) E15 |
| Risk | [R-12](risk-register.md#r-12--a-breach-becomes-notifiable-quickly) |

### Data minimisation (from `compliance-review`)

Not a PRD row, but it is how the rows above stay true:

| MVP | Real-data release |
|---|---|
| AI calls send only the text a step needs ([ADR-0003](../decisions/adr-0003-ai-provider.md) C10). No CV text, contact details, prompts or outputs in logs or Sentry. `ai_runs.error` holds messages, not payloads | Same |

## Fair employment

### What scoring ignores (decided)

The PRD decides this in *Job matching → Requirements*, and this record restates it **exactly**:

| PRD rule (verbatim) | Status | Where it is enforced | Proof |
|---|---|---|---|
| *"Scoring ignores name, photo, age, gender, race, religion and marital status."* | **Decided** | **In code**, before the provider call: `buildScoringProfile()` / redaction ([#148](https://github.com/dczii/URecruitment/issues/148); [ADR-0003](../decisions/adr-0003-ai-provider.md) C5). A prompt instruction alone does not count | `src/server/matching/redact.test.ts`, with one test per attribute proving it is absent from the model payload |
| *"Nationality and language (decided). They count only when the recruiter marks them as a real job requirement and writes why. Otherwise scoring ignores them."* | **Decided** | In code (redaction reads the job version's requirement and reason) **and** in the job form and its Server Action, which refuse a required nationality or language with no written reason ([#135](https://github.com/dczii/URecruitment/issues/135)) | `src/server/jobs/schema.test.ts` (the four reason cases); `redact.test.ts` (included only with a reason) |

ADR-0003 C5 also strips **date of birth, ethnicity and contact details**, which are proxies for the
seven. That is stricter than the PRD by design, and it is recorded as such, not as a PRD rule.

The parser **may store** what a CV states, including a nationality, a photo reference or an age: the
approved profile fields come from the CV. **Storing is not scoring.** What matters is what reaches the
scoring model.

### What the gap check flags (proposed)

| PRD flag type | PRD text | Status | Owning work |
|---|---|---|---|
| Fair employment | *"Preferences on age, gender, race or religion, which Singapore's fair employment guidelines disallow"* | **Proposed** | [#141](https://github.com/dczii/URecruitment/issues/141), [#142](https://github.com/dczii/URecruitment/issues/142) |
| Missing reason | A nationality or language requirement **marked as a requirement** without a written reason is refused at save ([#135](https://github.com/dczii/URecruitment/issues/135), decided). A preference stated only in the job text is outside the PRD's flag list, although `compliance-review` §B asks the gap check to flag it. See K3 | **Decided** (the reason rule) / see K3 | [#135](https://github.com/dczii/URecruitment/issues/135); K3 for [#141](https://github.com/dczii/URecruitment/issues/141), [#176](https://github.com/dczii/URecruitment/issues/176) |

A flag is a **suggestion to the recruiter**, with a question for the client. It never blocks the job:
*"Open flags don't block matching"* (**decided**).

### Search

Protected terms in a plain-language query ("under 30", "Chinese only", "male") are **never turned
into filters**. The search parser reports them as ignored terms
([#152](https://github.com/dczii/URecruitment/issues/152); `talent-search`).

### The Workplace Fairness Act: an open revisit

The PRD records the law and the gap in its own words:

> *"The Workplace Fairness Act is due to take effect at end-2027. It bars hiring decisions based on
> age, nationality, sex, marital status, pregnancy, caregiving, race, religion, language ability,
> disability or mental health (TAFEP)."*
>
> *"Scoring does not explicitly ignore pregnancy, caregiving duties, disability or mental health,
> which the Act also protects. Revisit this before the Act takes effect."*

| Act attribute | Covered today? |
|---|---|
| Age, marital status, race, religion | Yes: ignored by scoring (decided) |
| Sex | Yes, via "gender" in the PRD rule |
| Nationality, language ability | Yes, conditionally: only with a written reason (decided) |
| **Pregnancy** | **No. Not explicitly ignored** |
| **Caregiving** | **No. Not explicitly ignored** |
| **Disability** | **No. Not explicitly ignored** |
| **Mental health** | **No. Not explicitly ignored** |

**Status: open revisit, due before end-2027.** It is recorded as
[RV-1](../decisions/open-questions.md#rv-1--workplace-fairness-act-attributes) in the open-questions
register. Until it is decided:

- **Do not add any of the four as a scoring input, filter or gap-flag signal.**
- **Do not quietly add them to the redaction list either.** That would settle the revisit inside an
  implementation PR, which the register forbids. The fairness review
  ([#176](https://github.com/dczii/URecruitment/issues/176)) records them as a future decision.
- A task that touches scoring notes this known gap in its spec (`compliance-review` §B).

### Copy

Nothing in the UI implies an automated rejection or decision. There is no "Rejected by AI" state
([screen inventory](../ux/screen-inventory.md) R1).

## Model AI Governance Framework (voluntary)

The PRD says: *"The approach follows Singapore's voluntary Model AI Governance Framework"*
(**proposed**). These are the practices the MVP already follows by design, and what proves each one.

| Practice | What URecruitment does | PRD basis | Where it is built · proved |
|---|---|---|---|
| **Human involvement** | *"The AI only suggests. It never rejects, advances or contacts a candidate, and never sends anything to a client."* Every stage move, flag resolution and job save is a recruiter action with a typed name. Nothing is pre-selected from AI output | AI governance (**decided** as the product rule; `CLAUDE.md` hard rule 1) | [#156](https://github.com/dczii/URecruitment/issues/156) (no move without a recruiter action) · [#151](https://github.com/dczii/URecruitment/issues/151) (nothing pre-selected) |
| **Explainability** | Every score, flag and parsed field shows the CV or job text it relied on, and the quote is **verified** against the input, never invented | AI governance 1 (**proposed**) | [#127](https://github.com/dczii/URecruitment/issues/127), [#142](https://github.com/dczii/URecruitment/issues/142), [#148](https://github.com/dczii/URecruitment/issues/148) (evidence checks) · `SourceQuote` ([#99](https://github.com/dczii/URecruitment/issues/99)) |
| **Transparency** | Every AI result is labelled **"AI suggestion"**; scores show the **model version and date** | Design rule 1; Job matching 4 (**proposed**) | `AiSuggestion` ([#99](https://github.com/dczii/URecruitment/issues/99)) · [#149](https://github.com/dczii/URecruitment/issues/149) |
| **Traceability** | Each AI output is stored with its input, model version, prompt version, date, cost and duration in `ai_runs`. Scores are keyed to the job version and model version, so an old score is never shown against a changed job | AI governance 2 (**proposed**); data model invariant | [#169](https://github.com/dczii/URecruitment/issues/169) · [#149](https://github.com/dczii/URecruitment/issues/149) · [ADR-0002](../decisions/adr-0002-data-model.md) invariants 1 and 3 |
| **Quality monitoring** | An eval gate before each release: **≥ 90%** of parsed fields correct and **≥ 80%** top-5 agreement, **English and Chinese graded separately** | Goals (**decided**); AI governance 4 (**decided**) | [#173](https://github.com/dczii/URecruitment/issues/173), [#174](https://github.com/dczii/URecruitment/issues/174) · `docs/plans/ai-eval-plan.md` (created by [#79](https://github.com/dczii/URecruitment/issues/79)) |
| **Fairness** | Protected attributes removed in code; the nationality and language reason rule; fair-employment gap flags | Job matching 1–2 (**decided**) | See *Fair employment* above · the review in [#176](https://github.com/dczii/URecruitment/issues/176) |
| **Data governance** | Fictional data only in the MVP; hosting in Singapore; minimal text sent to the model; no personal data in logs | MVP data (**decided**); overseas transfer (**decided**) | This record · the [security baseline](../security/baseline.md) |
| **Accountability** | Each decision has an owner slot in the open-questions register; the go/no-go decision is the product owner's | Open questions | [open-questions.md](../decisions/open-questions.md) · [#181](https://github.com/dczii/URecruitment/issues/181) |

## What the real-data release must add (summary)

The go/no-go pack ([#181](https://github.com/dczii/URecruitment/issues/181)) lists these, with the
PDPA protection problem first.

1. **Access protection** (sign-in or network restriction). This is OQ-1, the hardest prerequisite.
2. **Consent** recording, the 7-day dashboard reminder, 14-day deletion, and hiding non-consented
   candidates.
3. **Retention:** 12 months after last activity, with the 30-day warning.
4. **Export on request.**
5. **Access logging** and a breach procedure that meets the 3-calendar-day rule.
6. **A provider processing-location assessment** under the overseas-transfer rule.
7. **Backups** and a paid plan (OQ-2, OQ-3).
8. **The Workplace Fairness Act revisit** (RV-1), if the release runs close to end-2027.
9. **A decision on whether a legal review is required** (part of OQ-1).

## Known inconsistencies

| # | Where | What | Resolution |
|---|---|---|---|
| K1 | ADR-0002 D3 vs `compliance-review` §C | ADR-0002 says `last_activity_at` stays unwritten until the real-data release. The skill's MVP check says "`last_activity_at` maintained" | The accepted ADR governs. A follow-up either updates the skill's MVP line to "column exists" or writes a superseding ADR that maintains the column from the MVP. Which one is not decided here |
| K2 | `ai-pipeline` §Fairness vs RV-1 | The skill allows redacting pregnancy, caregiving, disability and mental health *"if you do"* say so in the spec. RV-1 says they are not added to redaction until the revisit is decided | **RV-1 governs**, because adding them would settle an open item inside an implementation PR. A follow-up aligns the skill line so [#148](https://github.com/dczii/URecruitment/issues/148)'s executor does not receive the opposite rule |
| K3 | PRD gap-check flag list vs `compliance-review` §B | The PRD's fair-employment flags cover *"age, gender, race or religion"*. The skill also asks the gap check to flag nationality or language requirements without a reason, and a preference written only in the job text escapes the save-time rule | [#141](https://github.com/dczii/URecruitment/issues/141) decides in its spec (as **proposed**, labelled) whether the prompt flags such text; [#176](https://github.com/dczii/URecruitment/issues/176) checks the outcome |

## Out of scope

- Implementing consent, retention or deletion (real-data release, E14).
- Legal advice or sign-off.
- Changing any scoring rule.
