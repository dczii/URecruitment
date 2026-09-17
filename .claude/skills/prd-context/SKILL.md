---
name: prd-context
description: >
  URecruitment product knowledge from the PRD (17 Sep 2026): the capabilities, what is decided vs
  proposed vs open, non-goals, users, quality bar, pipeline stages and delay rules (SG working days,
  limit hierarchy, due-soon 80%, 30-day guarantee), data model, screens, release plan, and where
  the sample data comes from. Load before planning any task, and whenever a product question
  comes up ("should the AI…", "what stages…", "is X in the MVP…").
---

# PRD context — URecruitment

This condenses the PRD dated **17 Sep 2026**, which came out of Q&A with the product owner. Every item has a status:

- **decided**: build it as written.
- **proposed**: build it as written, but label the issue `prd:proposed` and say so in the spec.
- **open**: never settle it silently. Label the issue `needs-decision`.

Details live in the references:

| Reference | Covers |
|---|---|
| [references/requirements.md](references/requirements.md) | Every capability's requirements, with their status |
| [references/pipeline-rules.md](references/pipeline-rules.md) | Stages, end states, working days, limits, delay status, placements |
| [references/data-model.md](references/data-model.md) | The 17 tables, main flows, AI pipeline steps |
| [references/screens.md](references/screens.md) | The MVP screens and design rules |
| [references/sample-data.md](references/sample-data.md) | The sample-data Vercel Blob store (public, flat, Singapore), its env vars, the seed flow, the answer key |

## One-paragraph summary

URecruitment is a web portal for the **recruiters (6–20) of a Singapore recruitment agency** that fills jobs for client companies. It **replaces Manatal**, with **no data migrated**. The AI helps in five ways:

1. **CV processing:** PDF/Word CVs in English or Simplified Chinese become structured profiles.
2. **Job matching:** each candidate gets a 0–100 score per job, with quoted reasons.
3. **Talent search:** internal database only.
4. **Job request gap check:** missing, uncertain, conflicting and fair-employment flags, each with a question for the client.
5. **Pipeline tracking:** stage time limits and an overdue dashboard.

**The AI only suggests.** Recruiters make every decision.

## MVP at a glance (decided)

| Item | Decision |
|---|---|
| Users | Recruiters only. **No sign-in** in the MVP; actions are tied to a typed name |
| Data | **Fictional only**: 200 sample CVs (~20 in Simplified Chinese) + 20 sample jobs, preloaded by devs through the real parser. Source files come from a **public Vercel Blob store**, the seed source only; the app stores originals in private Supabase Storage |
| Deadline | Live by **mid-December 2026**. Ends with recruiter feedback sessions and a go/no-go on real data |
| Hosting | Vercel (functions `sin1`) + Supabase (`ap-southeast-1`), **free tiers** |
| AI provider | Chosen by the dev team. **Not chosen yet**, so stay provider-agnostic |
| Devices | Desktop and mobile browsers |
| Speed | A CV parsed in **< 30 s**; search results in **< 3 s** |
| Uptime | 99.5% on working days, **at risk**: best effort on free tiers |
| Backups | None in the MVP; re-seed from the repo. Required before real data |
| Email | **None, ever.** Alerts live on the dashboard |
| Quality bar | **≥ 90%** of parsed CV fields correct; recruiters agree with **≥ 80%** of top-5 match rankings. EN and ZH graded **separately**, same bar |

## Non-goals for the MVP (don't build these)

- Real candidate data: CV upload, email intake, OneDrive/SharePoint import (all real-data release)
- Sending email of any kind: alerts, consent requests
- Backups
- Duplicate candidate detection. **Note:** the sample set contains resubmissions; treat them as separate candidates.
- Sharing shortlists with clients; logins for candidates, hiring managers or clients
- External talent sources (LinkedIn, job boards, partner agencies). The design must allow approved sources to be added later, each with an on/off switch; the agency director approves each one.
- Migrating Manatal data
- AI that rejects, advances or contacts candidates on its own
- Scanned or photographed CVs. There is no OCR; reject them with a clear message.
- Alerts via Microsoft Teams or WhatsApp

## Guardrails every task inherits

1. **AI only suggests.** Label every AI result as a suggestion and show the CV/job text it came from.
2. **Protected attributes.**
   - Scoring ignores name, photo, age, gender, race, religion and marital status (decided).
   - Nationality and language count **only** when the recruiter marks them as a real requirement **and writes why** (decided).
   - Pregnancy, caregiving, disability and mental health are *not yet* explicitly ignored. Revisit before the Workplace Fairness Act takes effect (end-2027). Don't add scoring on them.
3. **Every AI output** is stored with its input, model version and date (proposed). Scores show the model version and date.
4. **The server is the only gate:** secret key server-only, RLS everywhere with no public policies, private bucket, signed URLs.
5. **Rate-limit the AI routes** (Vercel firewall) and **cap monthly AI spend**, because anyone with the link could run up costs.
6. **Store UTC, show Singapore time. Count SG working days.**
7. **Settings and stage changes** log the typed recruiter name. The name is remembered on the device, and the portal asks for it before a recruiter's first change on that device.

## Success metrics (from the real-data release)

These four metrics apply once real data is live. Targets are set after the Manatal baselines are exported (the agency's ops/admin team owns the export).

- Time to shortlist: days from job created to first candidate shortlisted.
- Recruiter screening/search hours per week.
- Share of active candidates overdue.
- Placements per recruiter per month.

## Release plan

| Release | Scope | Timing |
|---|---|---|
| **MVP** | Parsing + matching on the sample set; internal search; gap check; pipeline + delay dashboard; start-date + 30-day guarantee tracking; Vercel Hobby + Supabase Free; feedback sessions + go/no-go | By mid-Dec 2026 |
| **Real-data release** | Recruiter upload; email intake; one-time OneDrive/SharePoint import (last 12 months); recruiter-recorded consent with dashboard reminders and deletion; 12-month retention; duplicate detection; paid plans + backups | After go/no-go |
| **Later** | Approved external sources; shortlist sharing/client access; candidate access; Teams/WhatsApp alerts; scanned CVs; more languages | Not scheduled |

## Open questions (don't settle these)

1. What must be in place before real CVs are loaded: sign-in (Microsoft 365 via Supabase Auth is the suggested fit), consent recording, the retention job, a legal review? No owner is named yet.
2. Which paid plans to move to. Vercel Hobby forbids commercial use; Supabase Free has no backups.
3. How backups work and how long they are kept.
4. The duplicate-candidate rule, decided after go/no-go.
5. The real-data release date, set after go/no-go.
6. Targets for the four success metrics, set after the Manatal baselines.

Setup details owned by the dev team: the AI provider, the intake mailbox, the OneDrive folders, and converting legacy `.doc` files. **Risk:** Vercel Hobby is non-commercial only, so move to Pro before recruiters use the portal for real work.
