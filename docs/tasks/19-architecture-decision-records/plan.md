# Plan — #19 The team builds from one written architecture and data-model record

Spec: [spec.md](./spec.md) · Branch: `docs/19-architecture-decision-records` · Created: 2026-09-17

## Approach

Write four Markdown files under `docs/decisions/`: an index plus one record per task issue
(#71 → ADR-0001, #72 → ADR-0002, #73 → ADR-0003). Each record follows the same shape — **Status**,
**Context**, **Decision**, **Consequences**, **Rejected alternatives** — so a reader can skim any
of them the same way, and each decision line carries the PRD item it comes from *and* that item's
status, so a later task can tell at a glance whether it may revisit the choice. Statuses are the
PRD's own vocabulary (decided / proposed / open) rather than the classic ADR
accepted/superseded set, because the whole point is to preserve which suggestions the team is free
to revisit.

Two alternatives were rejected. Putting this in `CLAUDE.md` or the skills would mix "how Claude
works" with "what the team agreed", and the skills already say they defer the table list and
invariants to `prd-context`; a decision record is what the rest of the backlog can cite. Writing a
single long `architecture.md` was rejected because ADR-0003 has to stay **open** with its own owner
and unblocking condition, which a merged document would bury.

The records are written by Claude, not delegated (spec A2), and verified by shell checks rather
than a test runner (spec A8).

## Skills in scope

- `prd-context` — required for every task. Supplies every claim in all three records: the status
  vocabulary, the technical-choices table, the seventeen tables, the five main flows, the
  guardrails, the free-tier limits and the open questions.
- `testing` — required for every task. Consulted to confirm the right answer here is *no test
  runner*: this task adds no logic, and `npm test` does not exist until #85 (E01-S01-T03).
- `github-workflow` — required for every task. Branch name, Conventional Commit, `Closes` lines for
  the three task issues, Project 4 status moves.
- `nextjs-app` — ADR-0001 records where code runs: `src/server/**` with `import "server-only"`,
  Server Components by default, `/api/ai/*` route handlers, `after()` background work, `sin1`.
- `supabase-db` — ADR-0001's data boundary and all of ADR-0002: the secret key being server-only,
  RLS lock-down, private bucket + signed URLs, `parsed`/`overrides` separation, the `match_scores`
  unique key, `security_invoker` views, the working-day function.
- `security-check` — ADR-0001's trust boundary: no `NEXT_PUBLIC_` on secrets, no browser Supabase
  client, rate-limited AI routes, spend cap, and the public-repo rule that no Blob URL is committed.
- `compliance-review` — ADR-0002's consent/retention columns and ADR-0003's criteria: PDPA
  overseas transfer, protected-attribute redaction enforced in code, `ai_runs` traceability.
- `ai-pipeline` — ADR-0003's contract: the `provider.ts` role indirection, `runAi()`, schema
  validation, verbatim evidence, the spend cap, the embedding-dimension dependency.

## Files

| File | Change |
|---|---|
| `docs/decisions/README.md` | new — what an ADR is here, the status vocabulary, the index, how to supersede |
| `docs/decisions/adr-0001-architecture.md` | new — trust boundary, five main flows, thirteen layer choices with status, the `src/server` import rule |
| `docs/decisions/adr-0002-data-model.md` | new — seventeen tables with purpose / MVP standing / owning migration task, four invariants with PRD lines |
| `docs/decisions/adr-0003-ai-provider.md` | new — decision **open**, criteria, provider-agnostic contract C1–C9, MVP provider requirements, owner slot, blocked tasks |
| `docs/tasks/19-architecture-decision-records/spec.md` | new — this task's spec |
| `docs/tasks/19-architecture-decision-records/plan.md` | new — this plan |

## Dependencies

- none. No npm package, no env var, no migration. The repository stays unscaffolded.

## Steps

- [ ] **S1** `claude` — Write `docs/decisions/README.md` and `docs/decisions/adr-0001-architecture.md` (covers AC1, AC4, AC5, AC6).
  - Rules: `prd-context` (technical choices table and its D/P statuses; main flows; guardrails 4 and 6; free-tier limits), `nextjs-app` §Rules 1, 4, 5, 6, 7, 10, `supabase-db` §Security, `security-check` §Secrets + §Data access.
  - Verify: `V4`.
- [ ] **S2** `claude` — Write `docs/decisions/adr-0002-data-model.md` (covers AC2, AC7, AC8).
  - Rules: `prd-context` → `references/data-model.md` (the seventeen tables verbatim; the key invariant), `supabase-db` §Model notes, `compliance-review` §C (consent/retention columns present but unused in the MVP).
  - Verify: `V5`.
- [ ] **S3** `claude` — Write `docs/decisions/adr-0003-ai-provider.md` (covers AC3, AC9).
  - Rules: `ai-pipeline` §Provider: not chosen yet + §The one wrapper + §Evidence is verbatim + §Fairness is enforced in code, `compliance-review` §C overseas transfer, `prd-context` (AI governance 6; Integrations).
  - Verify: `V6`, `V7`.
- [ ] **S4** `none` — Full verification `V1`–`V7`, then Claude review (`pr-review`, plus `compliance-review` and `security-check` scope).

## Test plan

Every acceptance criterion must name an automated test, or state why automation is not appropriate and name the manual evidence.

**No automated tests are added.** This change adds no logic and no application code. `npm test`
does not exist yet — the test runner arrives with #85 (E01-S01-T03) — and adding `package.json` and
Vitest here would pre-empt the scaffold task #83 and contradict this task's own "docs only, no app
code" verification line. The evidence is the shell checks below, run in Step 7 and pasted verbatim
into **Outcome → Verification**.

| AC | Test or manual evidence | Type / reason |
|---|---|---|
| AC1 | `V4` + reading the "Trust boundary" section | docs-only; grep + manual read |
| AC2 | `V5` — all seventeen table names present, each with an owning task key | docs-only; scripted check |
| AC3 | `V6` (status line) + `V7` (no brand as a decision) | docs-only; scripted check |
| AC4 | `V4` — five main-flow headings present | docs-only; scripted check |
| AC5 | `V4` — thirteen layer rows with a status column | docs-only; scripted check |
| AC6 | `V4` — the `src/server` import rule present | docs-only; scripted check |
| AC7 | `V5` — every table row carries MVP or real-data standing | docs-only; scripted check |
| AC8 | `V5` — four invariants, each with its PRD line | docs-only; scripted check |
| AC9 | `V6` — blocked-task links and the owner slot present | docs-only; scripted check |
| AC10 | `V1` (docs-only diff), `V2` (links resolve), `V3` (no secrets) | docs-only; scripted check |

## Verification

The project scripts (`npm run lint`, `typecheck`, `test`, `build`, `test:e2e`, `eval`) **do not
exist yet** — the repository has no `package.json` before #83. Per `CLAUDE.md` ("the task that
first needs a script adds it"), this task needs none. The verification set is:

```
V1  git diff --name-only origin/main...HEAD | grep -v '^docs/'        # must be empty
V2  every relative markdown link in docs/decisions resolves to a file that exists
V3  git diff origin/main...HEAD | grep -nEi "(secret|api[_-]?key|token|password|service_role|eyJ[a-zA-Z0-9_-]{10,}|sk-[a-zA-Z0-9]{10,}|vercel_blob_rw_|blob\.vercel-storage\.com)"
V4  adr-0001: five main flows, thirteen layer rows with status, the src/server rule
V5  adr-0002: all seventeen PRD table names, each with owning task + MVP standing; four invariants
V6  adr-0003: "Status: **Open**", owner slot, blocked-task links
V7  adr-0003: no provider brand name appears as a decision
```

## Risks & rollback

- **Risk: a record states something the PRD does not support**, and the backlog then cites it as
  agreed. Mitigated by carrying the PRD item and its status on every decision line, and by the
  Claude review reading the records against `prd-context`.
- **Risk: ADR-0003 reads as a recommendation** and a later task treats it as settled. Mitigated by
  `V7` and by the record naming no provider outside an explicitly-labelled illustrative note.
- **Risk: ADR-0002's table partition drifts** from the E03 migration tasks if those are re-cut.
  Mitigated by citing the task keys, so a drift is visible.
- **Rollback:** `git revert` the commit. Nothing else depends on these files yet; no migration, no
  deployment, no data.

## Outcome

<!-- Filled after execution. -->

- **Shipped:** 
- **Changed files / areas:**
- **Tests added or updated:** 
- **Verification:** 
- **Deviations:** 
- **Fix rounds / escalations:** 
- **Models used:** 
- **Claude direct fixes:** 
- **Review findings:** 
- **Follow-ups:**
