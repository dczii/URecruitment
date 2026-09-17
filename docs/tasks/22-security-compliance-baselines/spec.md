# Spec — #22 Security and compliance baselines are written before any code

| | |
|---|---|
| Issue | https://github.com/dczii/URecruitment/issues/22 (Story) |
| Tasks | #76 (E00-S04-T01), #77 (E00-S04-T02) |
| Parent | Story #22 → Epic #1 "Decisions, architecture & delivery plan" |
| Milestone | MVP |
| Branch | `docs/22-security-compliance-baselines` (stacked on `docs/21-ux-screen-inventory-flows`) |
| Created | 2026-09-17 |
| Status | In review <!-- Planned → In progress → In review --> |

## Problem

The MVP has no sign-in and lives in a public repository. The only thing protecting it is a set of
server-side controls, spread across the PRD's *Security (suggested)* list, four skills and a dozen
backlog tasks. Nobody can yet answer "which task builds each control, and which test proves it?",
and the agency director has no written record of which privacy risks were accepted, on what
condition, and what must change before a real CV is loaded. This story writes both baselines before
any code exists, so every later task inherits them and every reviewer checks against them.

## PRD references

| PRD section | Item | Status |
|---|---|---|
| Security (suggested) → 1–6 | Secret key server-only; RLS on every table, no public policies; private bucket + short-lived links; typed name remembered on the device; firewall rate limit + monthly spend cap; later, Supabase Auth with Microsoft sign-in | **proposed** (1–4 are also `CLAUDE.md` hard rules 3 and 8) |
| Users | *"The MVP has no sign-in, confirmed on 17 Sep 2026"*; *"Actions are tied to a typed name, not a verified person."* | **decided** |
| Data, privacy & compliance → Protection | Keep CVs from anyone outside the agency; no sign-in accepted for the MVP | **at risk** / **open** |
| → Consent | Consent by phone or own email, with date and method; 7-day reminder; deleted after 14 days; hidden until consented | **decided** |
| → Retention | Delete or anonymise 12 months after last activity; 30-day warning | **decided** (warning **proposed**) |
| → Overseas transfer | Hosting in SG; a provider abroad must protect data to a comparable standard | **decided** |
| → Access & correction | Export or correct on request | **proposed** |
| → Breach notification | Log access and changes; ≥ 500 people → PDPC within 3 calendar days | **proposed** |
| → Risk 1 / Risk 2 | No sign-in (accepted for the MVP); importing old CVs (resolved) | **decided** |
| Job matching → Requirements 1–2 | Nationality and language only with a written reason; scoring ignores name, photo, age, gender, race, religion and marital status | **decided** |
| Fair employment | Workplace Fairness Act end-2027; pregnancy, caregiving, disability and mental health not yet explicitly ignored; revisit | noted in the PRD; **open** revisit |
| Job request gap check | Fair-employment flags: preferences on age, gender, race or religion | **proposed** |
| AI governance → 5 | Follows the voluntary Model AI Governance Framework | **proposed** |
| Free-tier limits and risks | Hobby non-commercial; Supabase pause; no backups; size caps; one region and daily cron; no uptime guarantee; managed job services storing run data in the US | **proposed** (responses); **decided** (plans) |

## Scope

**In scope**

- `docs/security/baseline.md` (#76):
  - the exposure model;
  - the six PRD controls, each with its implementing task(s) and proving test(s);
  - the baseline controls every task inherits (secrets and the public repo; the Blob store as seed
    source only; data access; input; AI; headers; logging; dependencies; deployment exposure);
  - what must change before real CVs are loaded, linking E15 (#16).
- `docs/compliance/baseline.md` (#77):
  - every PDPA row with its MVP position, what the MVP must be designed for and the real-data
    requirement;
  - fair employment: the ignored attributes quoted exactly, the reason rule, gap-check flags, search,
    and the Workplace Fairness Act revisit;
  - Model AI Governance Framework practices mapped to tasks;
  - known inconsistencies.
- `docs/compliance/risk-register.md` (#77):
  - Risk 1, accepted for fictional data only, with the two cheapest fixes;
  - Risk 2, resolved;
  - the free-tier, cost, fairness, sample-store, accidental-real-data, provider-location, breach and
    typed-name risks, each with what it becomes at the real-data release.
- `docs/decisions/open-questions.md`: one new row, **RV-1** (the Workplace Fairness Act attributes),
  because register rule 3 requires any new open item to get a row.

**Out of scope**

- Implementing any control (E01, E03, E11).
- Implementing consent, retention or deletion (E14).
- Designing sign-in (E15).
- Penetration testing.
- Legal advice or sign-off.
- Changing any scoring rule.
- Editing other task issues' bodies. The two gaps this baseline assigns (headers to #83, `npm audit`
  to #89) are recorded here and carried out by those tasks.

## Acceptance criteria

- [x] **AC1** — Given the MVP has no sign-in, when I read `docs/security/baseline.md`, then every control the PRD suggests is listed with the task that implements it and the test that proves it. _Proved by:_ `V4` (C1–C6 rows, each with a task link and a named test, or "not in the MVP" for C6).
- [x] **AC2** — Given PDPA applies from the real-data release, when I read `docs/compliance/baseline.md`, then each PDPA obligation shows its MVP position and what the real-data release must add. _Proved by:_ `V5` (six PDPA sections, each with *MVP position* and *Real-data requirement*; PRD text verbatim).
- [x] **AC3** — Given Risk 1 (anyone with the link can see every CV), when the risk register is written, then it records the risk as accepted for fictional data only and names the two cheapest fixes. _Proved by:_ `V6`.
- [x] **AC4** (#76) — The public-repo rules restate the Blob store as seed-source-only, with no URL committed. _Proved by:_ `V4` + `V3`.
- [x] **AC5** (#76) — The record names what must change before real CVs are loaded and links E15. _Proved by:_ `V4`.
- [x] **AC6** (#77) — The fair-employment section lists the ignored attributes exactly as the PRD decides them, and records the four Act attributes not yet covered as an open revisit. _Proved by:_ `V5` (verbatim rule; the four attributes present; RV-1 in the register).
- [x] **AC7** — Only files under `docs/` change, links and anchors resolve, every issue exists, and no secret, Blob URL or real personal data appears. _Proved by:_ `V1`, `V2`, `V3`, `V8`.

## Guardrails that apply

- [x] **AI only suggests** — the Model AI Governance "human involvement" row; gap flags are suggestions.
- [x] **No email sent** — consent reminders are dashboard-only; "own email" is the recruiter's own mailbox.
- [x] **Server-only data access; secret key never reaches the browser** — C1 and the data-access controls.
- [x] **RLS on new tables; private Storage + signed URLs** — C2, C3.
- [x] **AI output schema-validated, logged, shows source** — the AI controls; the governance table.
- [x] **Protected attributes ignored; nationality/language only with a reason** — the fair-employment section, quoted exactly.
- [x] **UTC / SGT** — the spend-cap month boundary is in Singapore time (C5 proof).
- [x] **Typed recruiter name** — C4 and R-13.
- [ ] Phone width — no UI.
- [x] **Fictional data only; no secrets or Blob URLs** — the variables are named, never valued; R-10 covers accidental real data.
- [x] **Free-tier limits** — R-03 to R-06; the "deletion must fit the daily cron" note.

## UX / design

n/a.

## Data / API changes

None. The baselines *name* columns and tests that later tasks create.

## Assumptions

- **A1 — One PR per story (user instruction), stacked on #21.** #77 depends on #76 inside this story, and the baselines link the register (#20) and the screen inventory (#21).
- **A2 — Claude writes it.** Both issues carry `Executor hint: claude (judgment-heavy)`.
- **A3 — Proving tests are named by the file paths the owning tasks list** in their "Affected files". Where a task lists no test file (the #175 rate limit, #83 headers), the row says "the test that task's spec names" rather than inventing a path.
- **A4 — Two gaps are assigned, not left floating.** No backlog task names security headers or `npm audit`. The baseline assigns headers to #83 (it creates `next.config.ts`) and `npm audit` to #89 (the PR checks workflow). Both are in Epic #2's queue in this same run, so the assignment is carried out rather than only recorded.
- **A5 — Whether Hobby offers a rate-limit rule is not assumed.** The PRD names a firewall rule, and `security-check` says to use it "if the plan supports it". #93 checks.
- **A6 — The Workplace Fairness Act revisit gets register row RV-1** and is **not** implemented by adding the four attributes to redaction. Doing that would settle the revisit inside a PR, which register rule 1 forbids.
- **A7 — R-10 (accidental real data) is a new risk** that the PRD does not list. It exists because the MVP job form has a JD upload and the portal has no sign-in. The mitigation proposed uses existing tasks (#180, #179, #123) and invents no product feature.
- **A8 — The `last_activity_at` inconsistency is recorded, not resolved.** ADR-0002 D3 says the column stays unwritten; the `compliance-review` checklist says it is maintained. Resolving that needs an ADR or a skill change, which is out of scope here.
- **A9 — "Accepted" in the risk register always means for fictional data only**, unless the row says otherwise.
- **A10 — No test runner** (as #19 A8).

## Open questions

- **OQ-1** (what must be in place before real CVs): the baselines list the candidates and link the question. Nothing is settled.
- **RV-1** (new): the four Workplace Fairness Act attributes. Recorded, not settled.
