---
name: compliance-review
description: >
  Compliance and fairness review for URecruitment: Singapore PDPA obligations (protection, consent,
  retention, access/correction, breach notification, overseas transfer), fair employment (TAFEP
  guidelines, Workplace Fairness Act from end-2027), Model AI Governance Framework, and the PRD's
  AI guardrails. Use when a change touches candidate data, scoring, gap flags, search filters, AI
  prompts, data retention/consent, logging, or anything headed for the real-data release; and as
  part of pr-review for those areas.
---

# Compliance review

This is an engineering checklist, **not legal advice**. A legal review before real data is an **open question** in the PRD. Record anything that needs a lawyer as a `needs-decision` issue.

## When the MVP is exposed

The MVP holds **fictional data only**, so the PDPA risk is low. The review still checks that:
- no real data can enter;
- the design doesn't block the real-data obligations.

## Checklist

### A. AI guardrails (PRD)
- [ ] The AI only suggests. No code path rejects, advances, shortlists or contacts anyone, or sends anything to clients.
- [ ] Every AI result in the UI is labelled as a suggestion and shows its source text.
- [ ] Every AI output is stored with its input reference, model, version, prompt version and date (`ai_runs`).
- [ ] Scores show the model version and date. Stale scores (old job version or model) are never shown.

### B. Fair employment
- [ ] **Scoring excludes** name, photo, age, gender, race, religion and marital status, **enforced in code** (redaction), not only in the prompt.
- [ ] **Nationality and language** count only with a recruiter-written reason on the job version. The UI requires the reason.
- [ ] **The gap check flags** job requests with preferences on age, gender, race or religion (TAFEP guidelines), and nationality/language requirements without a reason.
- [ ] **Search** never turns protected terms into filters (`ignored_terms`).
- [ ] **Workplace Fairness Act (end-2027)** also covers pregnancy, caregiving, disability and mental health. Confirm the change doesn't *add* them as signals. Note the known gap (they aren't explicitly excluded yet) if the change touches scoring.
- [ ] Copy and UI never imply automated rejection.

### C. PDPA (MVP: design-ready; real-data release: enforced)

| Area | MVP check | Real-data requirement |
|---|---|---|
| Protection | Server-only access, RLS lock-down, private bucket, signed URLs. No sign-in is **accepted risk for fictional data only** | Sign-in or network restriction is open; never load real CVs without it |
| Consent | `candidates` has consent status/date/method columns | Recruiter records consent (phone/own email); dashboard reminder after 7 days; delete after 14 days without consent; hidden from search/matching until consented |
| Retention | `last_activity_at` maintained | Delete/anonymise 12 months after last activity; warn 30 days before |
| Access & correction | Recruiter can correct any parsed field | Export/correct on request |
| Breach readiness | Changes logged (`stage_events`, `settings_log`, `ai_runs`) | Access logging; ≥ 500 affected → notify PDPC within 3 calendar days of confirming it is notifiable |
| Overseas transfer | Hosting in SG (`sin1`, `ap-southeast-1`); job state and queues in Supabase | AI provider processing location assessed; comparable protection |
| Minimisation | AI calls send only needed text; no CV text in logs/Sentry | Same |

### D. Model AI Governance Framework (voluntary)
- [ ] **Human in the loop:** recruiters decide, and every AI output can be overridden.
- [ ] **Explainability:** reasons and evidence are shown.
- [ ] **Traceability and reproducibility:** `ai_runs`, prompt versions, eval reports.
- [ ] **Quality monitoring:** the eval gate (≥ 90% fields, ≥ 80% top-5, EN and ZH separately).

### E. Data in the public repo
- [ ] No real personal data, sample-data Blob URLs, credentials or `.env` files are committed.
- [ ] Fixtures and answer-key entries are fictional.

## Output format

```
## Compliance review — <PR/issue>
Verdict: pass | pass with follow-ups | blocked
| # | Severity | Rule (quoted) | Where (file:line) | Finding | Fix |
|---|---|---|---|---|---|
```

- **Severity `blocker`:** breaks a *decided* PRD rule, or would let real data or an automated decision through.
- **Severity `major`:** breaks a proposed rule, or blocks real-data readiness.
- **Severity `minor`:** clarity or copy.
