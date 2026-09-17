# Risk register

## Status

**Living register** · created 2026-09-17 by [#77](https://github.com/dczii/URecruitment/issues/77)
(story [#22](https://github.com/dczii/URecruitment/issues/22), epic
[#1](https://github.com/dczii/URecruitment/issues/1))

These are the risks URecruitment runs knowingly: what each one is, why it is acceptable now (or why
it is not), and **what it becomes at the real-data release**. The register is edited in place as risks
change. A risk's history belongs in the PR that changes it.

It complements the [compliance baseline](baseline.md) and the
[security baseline](../security/baseline.md). **Questions** (things someone must decide) live in the
[open-questions register](../decisions/open-questions.md). A risk that waits on a decision links to
its question.

> **"Accepted" here always means accepted for fictional data only**, unless the row says otherwise.
> The MVP holds no real person's data (`CLAUDE.md` hard rule 6). Every accepted risk is re-assessed
> at the go/no-go decision ([#181](https://github.com/dczii/URecruitment/issues/181)).

### Status words

| Status | Meaning |
|---|---|
| **Accepted** | Known, not mitigated further, and tolerable for the MVP's fictional data. The PRD or the product owner accepted it |
| **Mitigated** | Controls reduce it to an acceptable level. The controls are named |
| **Resolved** | The PRD removed it by a decision. Kept so nobody re-raises it |
| **Open** | Not yet acceptable, or its treatment is still to be decided |

Impact and likelihood are rough (**H / M / L**), and they are judged **for the MVP**, with fictional
data.

## Summary

| ID | Risk | Status | MVP impact / likelihood | At the real-data release |
|---|---|---|---|---|
| [R-01](#r-01--no-sign-in) | No sign-in: anyone with the URL sees every CV | **Accepted** (fictional only) | L / H | **Blocking**: OQ-1, E15 |
| [R-02](#r-02--importing-old-cvs) | Importing old CVs | **Resolved** | — | Enforced by E13 and E14 |
| [R-03](#r-03--vercel-hobby-is-non-commercial) | Vercel Hobby forbids commercial use | **Open** | M / M | Move to a paid plan (OQ-2) |
| [R-04](#r-04--no-backups) | No backups | **Accepted** (fictional only) | L / L | **Blocking**: OQ-3 |
| [R-05](#r-05--supabase-free-pauses-after-a-week-idle) | Supabase Free pauses after a week idle | **Accepted**, with a runbook | M / M | Paid plan (OQ-2) |
| [R-06](#r-06--no-uptime-guarantee) | 99.5% uptime cannot be assured | **Accepted** (best effort) | L / M | Paid plan (OQ-2) |
| [R-07](#r-07--ai-costs-run-away) | A stranger runs up the AI bill | **Mitigated** | M / M | Re-check limits against real use |
| [R-08](#r-08--workplace-fairness-act-attributes-not-explicitly-ignored) | Four Workplace Fairness Act attributes not explicitly ignored | **Open** (revisit before end-2027) | L / L | Decide before the Act applies (RV-1) |
| [R-09](#r-09--the-sample-data-store-is-public) | The sample-data Blob store is public | **Mitigated** | L / L | The store is never used for real files |
| [R-10](#r-10--real-data-enters-the-mvp-by-accident) | Real data enters the MVP by accident | **Open**, mitigation proposed | H / L | Superseded by real-data controls |
| [R-11](#r-11--ai-provider-processing-location-unknown) | AI provider's processing location unknown | **Accepted** (fictional only) | L / H | **Blocking**: assess before real CVs (DT-1) |
| [R-12](#r-12--a-breach-becomes-notifiable-quickly) | A breach becomes notifiable quickly | **Accepted** (fictional only) | L / L | Access logging and a breach procedure |
| [R-13](#r-13--the-typed-name-is-unverified) | The audit trail uses an unverified typed name | **Accepted** | L / M | Replace with a real identity once one exists |

---

### R-01 — No sign-in

| | |
|---|---|
| Source | PRD *Data, privacy & compliance*, **Risk 1 (accepted for the MVP)** |
| The risk | *"Anyone who finds the portal's address could see every CV. The MVP holds only fictional data, so nothing real is exposed yet. Loading real CVs without sign-in would break PDPA's Protection Obligation. PDPC can fine up to S$1 million or 10% of Singapore turnover (for firms above S$10 million), whichever is higher (PDPC)."* |
| Status | **Accepted, for fictional data only.** The PRD accepts it for the MVP (*"The MVP has no sign-in, confirmed on 17 Sep 2026"*). The acceptance **does not extend** to any real CV, for any length of time, for any purpose |
| MVP treatment | The server is the only gate: server-only data access, RLS locked down, a private bucket, short-lived signed links, rate limits and a spend cap ([security baseline](../security/baseline.md) C1–C5). None of these stops a person with the URL from reading every sample CV. That is the accepted part |
| **The two cheapest fixes** (PRD) | 1. **Microsoft 365 sign-in**, *"since the agency already uses OneDrive"* (the PRD's security section suggests Supabase Auth with Microsoft sign-in). 2. **Office-network-only access.** The PRD also notes that *"On Vercel Pro, password protection costs $20 a month per project and needs no code"* |
| At the real-data release | **Blocking.** No real CV is loaded until access protection is in place. Which fix, and what else is required, is [OQ-1](../decisions/open-questions.md#oq-1--what-must-be-in-place-before-real-cvs-are-loaded); the work is [#16](https://github.com/dczii/URecruitment/issues/16) E15 |
| Owner slot | — *(unassigned; OQ-1 has no owner yet)* |

### R-02 — Importing old CVs

| | |
|---|---|
| Source | PRD *Data, privacy & compliance*, **Risk 2 (resolved)** |
| The risk | Bringing in years of CVs from OneDrive that nobody has consent or reason to keep |
| Status | **Resolved** by decision: *"Only files changed in the last 12 months are imported, and a recruiter must record consent for each imported candidate."* |
| MVP treatment | Not applicable. There is no import in the MVP |
| At the real-data release | Enforced by the import ([#14](https://github.com/dczii/URecruitment/issues/14) E13) and the consent rules ([#15](https://github.com/dczii/URecruitment/issues/15) E14) |

### R-03 — Vercel Hobby is non-commercial

| | |
|---|---|
| Source | PRD *Free-tier limits and risks*: *"Vercel Hobby is for non-commercial, personal use only"*, with the effect *"Using it for agency work breaks Vercel's terms"* |
| Status | **Open.** Where the line falls for recruiter sessions on fictional data is [RC-3](../decisions/open-questions.md#rc-3--vercel-hobby-and-commercial-use); the plan to move to is [OQ-2](../decisions/open-questions.md#oq-2--which-paid-plans-to-move-to) |
| MVP treatment | Hobby, as the PRD decided for the MVP. The release-readiness check ([#179](https://github.com/dczii/URecruitment/issues/179)) restates the position before recruiters are invited |
| At the real-data release | PRD response: *"Move to Vercel Pro before recruiters use the portal for real work"* ([#18](https://github.com/dczii/URecruitment/issues/18) E17) |

### R-04 — No backups

| | |
|---|---|
| Source | PRD *Free-tier limits and risks*: *"Supabase Free has no backups"*, effect *"Data loss is possible. Acceptable only for fictional data"* |
| Status | **Accepted, for fictional data only.** The PRD's non-functional table says backups are *"None in the MVP; fictional data is re-seeded from the repo. Needed before real data"* (decided) |
| MVP treatment | Recovery means applying the migrations and re-running the seed. The infrastructure plan records the steps, the time and the AI cost |
| At the real-data release | **Blocking.** PRD response: *"Re-seed from the repo. Add backups before real data"*. How backups work is [OQ-3](../decisions/open-questions.md#oq-3--how-backups-work-and-how-long-they-are-kept) |

### R-05 — Supabase Free pauses after a week idle

| | |
|---|---|
| Source | PRD *Free-tier limits and risks*: *"Supabase Free pauses a project after 1 week of inactivity"*, effect *"The MVP can go offline between review sessions"* |
| Status | **Accepted**, with a runbook |
| MVP treatment | PRD response: *"Use it at least weekly, or restore it from the dashboard"*. A weekly keep-alive and restore procedure is written in the infrastructure plan ([#81](https://github.com/dczii/URecruitment/issues/81)) and the launch runbook ([#178](https://github.com/dczii/URecruitment/issues/178)). The keep-alive cannot be a Vercel cron more often than daily (Hobby), and must not become a hidden dependency |
| At the real-data release | A paid plan ([OQ-2](../decisions/open-questions.md#oq-2--which-paid-plans-to-move-to)) |

### R-06 — No uptime guarantee

| | |
|---|---|
| Source | PRD *Non-functional requirements*: *"Uptime 99.5% on working days. Best effort only on free tiers"* (**at risk**); *Free-tier limits*: *"Free tiers carry no uptime guarantee"* |
| Status | **Accepted.** PRD response: *"Treat it as best effort for the MVP"* |
| MVP treatment | No uptime monitoring beyond Vercel runtime logs and Sentry. A session that finds the app down follows the restore runbook |
| At the real-data release | Paid plans ([OQ-2](../decisions/open-questions.md#oq-2--which-paid-plans-to-move-to)) |

### R-07 — AI costs run away

| | |
|---|---|
| Source | PRD *Security (suggested)* 5: *"Without sign-in, anyone with the link could otherwise run up AI costs."* |
| Status | **Mitigated** |
| MVP treatment | AI routes under one prefix and rate-limited ([#93](https://github.com/dczii/URecruitment/issues/93)); an app-side monthly cap checked before every call, plus the provider-side cap ([#175](https://github.com/dczii/URecruitment/issues/175)); no AI call on page load (PRD main flow 2) |
| Residual | Up to the cap can still be spent by a stranger in a month. When the cap is reached, AI features stop for everyone until the month ends, **by design**, and recruiters see a clear message |
| At the real-data release | Re-check the rate limit and the cap against real use (6–20 recruiters, under 1,000 CVs a month). Access protection (R-01) removes most of the exposure |

### R-08 — Workplace Fairness Act attributes not explicitly ignored

| | |
|---|---|
| Source | PRD *Fair employment*: *"Scoring does not explicitly ignore pregnancy, caregiving duties, disability or mental health, which the Act also protects. Revisit this before the Act takes effect."* |
| Status | **Open.** A revisit with a deadline: the Act *"is due to take effect at end-2027"*. Tracked as [RV-1](../decisions/open-questions.md#rv-1--workplace-fairness-act-attributes) |
| MVP treatment | **None of the four is added as a scoring input, filter or gap-flag signal.** They are not quietly added to redaction either, because that is the decision the revisit makes. Scoring works only on job-relevant fields, which lowers the chance any of them matters. The fairness review ([#176](https://github.com/dczii/URecruitment/issues/176)) records them as a future decision |
| At the real-data release | Decide before real candidates are scored if the release is close to end-2027, and in any case before the Act takes effect |

### R-09 — The sample-data store is public

| | |
|---|---|
| Source | `prd-context` → `references/sample-data.md`: the store is **public**, flat, and file names are guessable |
| Status | **Mitigated** |
| MVP treatment | It holds **fictional files only**; its base URL is never committed and appears only in env and `.seed-cache/`; the listing token is used only for `list()`; app code never imports the Blob SDK ([security baseline](../security/baseline.md), *The sample-data Blob store*) |
| Residual | Anyone who learns the base URL can read every sample CV. They are fictional, so the impact is low |
| At the real-data release | The store is **never** used for real files. Real intake goes straight to private Supabase Storage |

### R-10 — Real data enters the MVP by accident

| | |
|---|---|
| Source | `CLAUDE.md` hard rule 6; the MVP job form includes **JD upload** (PRD Job input, **decided**) |
| The risk | During feedback sessions, a recruiter uploads a **real** client JD, or types a real candidate's details into a profile edit, into a portal that has no sign-in. Separately, someone drops a real CV into the public sample-data store "just to test" |
| Status | **Open.** Mitigation is proposed here, and no product feature is invented for it |
| MVP treatment (proposed) | The grading-session guide ([#180](https://github.com/dczii/URecruitment/issues/180)) tells recruiters to use sample jobs only and never to enter real people; the release-readiness check ([#179](https://github.com/dczii/URecruitment/issues/179)) confirms the guide says so; the seed report ([#123](https://github.com/dczii/URecruitment/issues/123)) lists what the store holds, so an unexpected file is visible |
| If it happens | Treat it as an incident: remove the data, re-seed, and record it in a `bug` issue **without** repeating the data |
| At the real-data release | Superseded by access protection and the consent rules |

### R-11 — AI provider processing location unknown

| | |
|---|---|
| Source | PRD *AI governance*: *"If real CVs are processed outside Singapore, PDPA's overseas-transfer rules apply."* |
| Status | **Accepted, for fictional data only.** The provider is not chosen ([DT-1](../decisions/open-questions.md#dt-1--the-ai-provider)) |
| MVP treatment | Hosting stays in Singapore. [ADR-0003](../decisions/adr-0003-ai-provider.md) lists processing location as a decision criterion and keeps the provider swappable |
| At the real-data release | **Blocking.** The processing location is known in writing and assessed for comparable protection before any real CV is sent |

### R-12 — A breach becomes notifiable quickly

| | |
|---|---|
| Source | PRD: *"A breach affecting 500 or more people must be reported to PDPC within 3 calendar days of confirming it is notifiable (PDPC guide). At up to 1,000 CVs a month, the database passes 500 people quickly."* |
| Status | **Accepted, for fictional data only.** No real person is affected in the MVP |
| MVP treatment | Changes are logged; no CV text in logs; append-only audit tables |
| At the real-data release | Access logging and a breach procedure that can meet the 3-calendar-day rule ([#15](https://github.com/dczii/URecruitment/issues/15), [#16](https://github.com/dczii/URecruitment/issues/16)) |

### R-13 — The typed name is unverified

| | |
|---|---|
| Source | PRD *Users*: *"Audit trail. Actions are tied to a typed name, not a verified person."* |
| The risk | Anyone can type any name, so the audit trail records who **said** they acted, not who did |
| Status | **Accepted** (PRD, decided for the MVP) |
| MVP treatment | The name is validated (not blank, not over-long) and remembered on the device; a stage move shows it with "not you?" ([#167](https://github.com/dczii/URecruitment/issues/167)). It grants nothing |
| At the real-data release | Once sign-in exists (R-01), audit rows should record the signed-in identity. That design belongs to E15 |
