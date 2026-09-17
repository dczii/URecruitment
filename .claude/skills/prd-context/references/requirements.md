# Requirements by capability

Status key: **D** = decided · **P** = proposed · **O** = open.

## CV processing

**Intake**

| Channel | Behaviour | Release |
|---|---|---|
| Preloaded sample CVs | Devs load the fictional CVs and run them through the **real parser** | MVP (D) |
| Recruiter upload | Drag and drop, one file or many | Real-data (D) |
| Email inbox | CVs sent to a set mailbox are processed automatically; mailbox chosen later | Real-data (D) |
| OneDrive / SharePoint | One-time import of CV files changed in the last 12 months | Real-data (D) |

**Formats (D):** text-based PDF, `.doc`, `.docx`, in English or Simplified Chinese. Scanned or image-only files are **rejected with a clear message**.

**Parsed profile (D, approved)**
- Name, email, phone, location
- Work history: employer, job title, start and end dates
- Education and certifications
- Skills, **each with the CV text it came from**
- Languages spoken
- Total years of experience, **calculated from work history** (not taken from the CV's own claim)
- Link to the original file, which is always kept

**Requirements**
1. (P) Recruiters can edit any parsed field. **Their edits survive re-processing.**
2. (P) A file that fails to parse goes to a **review queue** with the reason.
3. (P) From the real-data release, each profile stores consent status and the date of the candidate's last activity (PDPA).
4. (P) Duplicate detection is out of the MVP. Its rule must be decided before real data (O).

## Job matching

**Job input (D).** Recruiters either create a job with a form or upload the client's JD (PDF/Word). An uploaded JD is read **into the same form** for the recruiter to confirm. The MVP uses 20 sample jobs.

**Match output (D)**
- A score from 0 to 100 per candidate per job.
- Skills **matched, missing and uncertain**, each backed by the CV text it came from.
- A ranked list the recruiter can sort and filter. **The AI never shortlists, rejects or advances.**

**Requirements**
1. (D) **Nationality and language** count only when the recruiter marks them as a real job requirement **and writes why**. Otherwise scoring ignores them.
2. (D) Scoring ignores **name, photo, age, gender, race, religion, marital status**.
3. (P) The job form marks each requirement **must-have** or **nice-to-have**. A missing must-have **caps the score** (example cap: 50).
4. (P) The score shows the **model version and date**. Changing the job recalculates all scores.
5. (P) In the MVP, all sample CVs are scored against every sample job. From the real-data release, new CVs are scored on arrival.

## Talent search

Search covers the agency's own database only: the sample CVs in the MVP, and imported, uploaded and emailed CVs later. There are no external sources at launch.

**Requirements (all P)**
1. Plain-language search, e.g. "accountant with SAP experience and 5+ years in Singapore".
2. Filters: skills, years of experience, location, language, CV date.
3. Searching **from a job** ranks results by that job's match score, with the same reasons as Job matching.
4. Results show **when each CV was last updated**.
5. From the real-data release, candidates without consent or past the 12-month retention are hidden.

**External sources later (D).** The design allows approved sources to be added later, each with an on/off switch. The agency director approves each source and its terms.

## Job request gap check

**Scope (D):** client job requests only, whether entered in the form or uploaded as a JD. **CVs are not checked.**

| Flag type | Examples | Status |
|---|---|---|
| Missing | No salary range, location or work arrangement, employment type, headcount, start date, must-have skills, interview steps | D (approved) |
| Uncertain | "Competitive salary", "some experience", a junior title needing 10 years, no must-have/nice-to-have split | P |
| Conflicting | The uploaded JD disagrees with the form (e.g. salary, location) | P |
| Fair employment | Preferences on age, gender, race, religion (disallowed by Singapore's fair employment guidelines) | P |

**Requirements**
1. (P) Each flag shows **why it matters** and a **suggested question for the client**.
2. (P) The recruiter marks each flag **resolved** or **dismissed**, with a short note.
3. (D) Open flags **don't block matching**. The job shows a banner with the count still open.

**Approach (suggested):** code checks for missing fields; one model call finds the uncertain, conflicting and fair-employment issues.

## Pipeline tracking & delays

See [pipeline-rules.md](pipeline-rules.md).

## AI governance

1. (P) Every score, flag and parsed field shows the CV or job text it was based on.
2. (P) Each AI output is stored with its input, model version and date.
3. Protected attributes are handled as under Job matching.
4. (D) Recruiters grade the AI on the sample set against the quality bar, **EN and ZH graded separately**.
5. (P) Follows Singapore's voluntary **Model AI Governance Framework**.
6. (D) The dev team picks the provider, weighing Simplified Chinese quality, cost and **where data is processed**. If real CVs are processed outside Singapore, PDPA overseas-transfer rules apply.

## Data, privacy & compliance (real-data release)

The MVP holds fictional data only, so PDPA risk is low until real CVs arrive.

| PDPA area | Requirement | Status |
|---|---|---|
| Protection | Keep CVs from anyone outside the agency. No sign-in accepted for MVP only; whether it's needed before real data is open | At risk / O |
| Consent | Recruiters get consent by phone or their own email and record the date and method. Dashboard reminds after **7 days**; CV **deleted after 14 days** without consent. Candidates without consent hidden from search and matching | D |
| Retention | Delete or anonymise **12 months after last activity**, warning **30 days** before (warning P) | D |
| Overseas transfer | Hosting stays in SG. A provider processing abroad must protect data to a comparable standard | D |
| Access & correction | Recruiters can export or correct a candidate's data on request | P |
| Breach notification | Log access and changes so a breach's scope can be assessed quickly. ≥ 500 people affected → report to PDPC within **3 calendar days** of confirming it's notifiable | P |

- **Risk 1 (accepted for MVP):** with no sign-in, anyone with the URL sees every CV. Loading real CVs without sign-in breaks the PDPA Protection Obligation (fines up to S$1M or 10% of SG turnover). The cheapest fixes are Microsoft 365 sign-in or office-network-only access.
- **Risk 2 (resolved):** only files changed in the last 12 months are imported, and consent is recorded per imported candidate.
- **Workplace Fairness Act (end-2027):** bars decisions based on age, nationality, sex, marital status, pregnancy, caregiving, race, religion, language ability, disability or mental health.

## Integrations

| System | Used for | Release | Still to decide |
|---|---|---|---|
| AI model provider | Parsing, matching, gap check, search | MVP | Provider (dev team) |
| OneDrive / SharePoint | One-time import (last 12 months) | Real-data | Which folders |
| Intake mailbox | Receiving emailed CVs | Real-data | Address |
| Manatal | Nothing migrated; ops/admin export baseline metrics | — | — |
| LinkedIn, job boards, Teams, WhatsApp | — | Later | — |

## Technical choices

| Layer | Choice | Status |
|---|---|---|
| Design | pen.dev, `.pen` files in the repo | D |
| Frontend | Next.js App Router, TypeScript | D |
| UI components | Tailwind + shadcn/ui themed from pen.dev tokens | P |
| Backend | Supabase Postgres, Storage, Edge Functions if needed | D |
| Hosting | Vercel, functions pinned to `sin1` | D |
| DB region | Supabase `ap-southeast-1` | D |
| Plans | Vercel Hobby, Supabase Free | D |
| Backups | None; rebuild from seed | D |
| Email | None | D |
| Search | pgvector (meaning) + PGroonga (EN/ZH keyword) | P |
| AI access | Vercel AI SDK | P |
| Monitoring | Vercel runtime logs + Sentry | P |
| Testing | Vitest, Playwright, AI quality script | P |

**Security (suggested):**
1. The secret key lives only in Vercel env; it bypasses RLS.
2. RLS is on everywhere with no public policies, so the publishable key reads nothing.
3. Private bucket with short-lived signed links.
4. The typed name is recorded and remembered on the device.
5. A Vercel firewall rate-limits the AI routes, plus a provider monthly spend cap.
6. Later: Supabase Auth with Microsoft sign-in (Vercel Pro password protection costs $20/month).

**Environments (suggested):** one repo holds the app, migrations, seed and `.pen` files. Every PR gets a Vercel preview; `main` deploys to production. Supabase Free allows 2 active projects: dev+preview and prod. CI applies migrations with the Supabase CLI and runs the tests plus the AI quality script. Migrations and seed files are the recovery plan.

**Free-tier limits:**

| Limit | Effect | Response |
|---|---|---|
| Hobby = non-commercial | Agency use breaks Vercel's terms | Move to Pro before real work |
| Supabase Free pauses after 1 week idle | MVP can go offline | Use it weekly or restore from the dashboard |
| No backups | Data loss possible | Re-seed; add backups before real data |
| 500 MB DB, 1 GB storage, 50 MB/file | Enough for samples, not real volume | Upgrade before real data |
| Hobby: one region, cron once/day | No frequent background jobs | Delay status in a DB view |
| No uptime guarantee | 99.5% can't be assured | Best effort in the MVP |
| Some managed job services store run data in the US | CV text could leave SG | Keep job state and queues in Supabase |
