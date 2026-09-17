# Pipeline rules

## Stages (approved)

```
Sourced → Screening → Shortlisted → Submitted to client → Client interview → Offer → Placed
```

A candidate can leave **from any stage** as one of three **end states**, which have **no time limit**:
- Rejected by agency
- Rejected by client
- Withdrawn

Every candidate on a job sits in exactly **one** stage.

| Stage | Starts when | Waiting on | Default limit (working days) |
|---|---|---|---|
| Sourced | Candidate is added to the job | Recruiter | 2 |
| Screening | Recruiter starts review or calls the candidate | Recruiter | 3 |
| Shortlisted | Recruiter picks the candidate for the client | Recruiter | 2 |
| Submitted to client | Profile is sent to the client | Client | 5 |
| Client interview | Client asks for an interview (any round) | Client / candidate | 7 |
| Offer | Client makes an offer | Candidate | 5 |
| Placed | Candidate accepts | — | — |

> The PDF table is partly garbled around Screening and Shortlisted. The values above are the most consistent reading (Screening: Recruiter, 3; Shortlisted: Recruiter, 2). **Confirm with the product owner before seeding limits.** The first task that touches stage limits should label its issue `needs-decision` if the owner hasn't confirmed yet.

## Time limits (decided)

- **Hierarchy:** a **job's** limit overrides the **client's**, which overrides the **default**.
- **Units:** working days, **Monday to Friday**, skipping **Singapore public holidays** (the `sg_public_holidays` table).
- **Editing:** any recruiter can change stages, limits and retention. Every change is logged with the typed name (`settings_log`).

## Delay detection

| # | Rule | Status |
|---|---|---|
| 1 | The clock starts when a candidate **enters** a stage and **resets** on the next stage | P |
| 2 | Status is **On track**, **Due soon** (≥ 80% of the limit used) or **Overdue** (past the limit) | P |
| 3 | A "Waiting on" column shows who the delay is with, so client-side delays stand apart | P |
| 4 | The dashboard lists overdue candidates **by days over**, filterable by client, job and stage | P |
| 5 | Delays appear **only on the dashboard**, filterable by **job owner**. No email | D |
| 6 | Sample candidates get **back-dated** stage entries, so delays show from day one | P |

**Implementation (suggested):** a **database view** derives status from the stage entry time, the limit hierarchy and the holiday table. There's **no scheduled job**, because Vercel Hobby cron runs only once a day.

### Edge cases to test

- Entering a stage on a Friday, a weekend, or the eve of a public holiday.
- A limit changed at job level while candidates are already in the stage: the new limit applies to the running clock (recompute; don't snapshot) unless the spec decides otherwise.
- End states and **Placed** have no status (not On track, not Overdue).
- Due-soon threshold: `used / limit ≥ 0.8`, measured in working days. State the rounding in the spec.
- Timestamps are stored in UTC, but the working-day boundary is **Singapore local midnight**.
- A candidate moved back to an earlier stage: the clock resets on entry, as with any stage change.

## After Placed (decided, in the MVP)

- The portal **confirms the candidate's start date**.
- It tracks a **30-day replacement guarantee** (clients have their own guarantee period in `clients`; the default is 30 days).
- The dashboard flags it **5 working days before the guarantee ends** (timing P).

## Audit

- Every stage change is stored in `stage_events` with the **typed recruiter name**. This is the audit trail.
- Before a recruiter's first change on a device, the portal asks for their name and remembers it on that device.
- Each job has an **owner name** (D), and the dashboard can filter by owner.

## Screens using these rules

- **Pipeline board:** one column per stage, On track / Due soon / Overdue status shown with a **word or icon as well as colour**, and a typed-name prompt on each move. Fully usable at phone width.
- **Dashboard:** overdue and due-soon candidates, and guarantee end dates today, with filters for client, job, stage and owner. Fully usable at phone width.
- **Placements:** start date check and a 30-day guarantee countdown.
- **Settings:** stage limits by default, client and job; public holidays; the change log.
