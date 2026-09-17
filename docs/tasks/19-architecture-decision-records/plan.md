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
| `docs/decisions/adr-0003-ai-provider.md` | new — decision **open**, criteria, provider-agnostic contract C1–C10, MVP provider requirements, owner slot, blocked tasks |
| `docs/tasks/19-architecture-decision-records/spec.md` | new — this task's spec |
| `docs/tasks/19-architecture-decision-records/plan.md` | new — this plan |

## Dependencies

- none. No npm package, no env var, no migration. The repository stays unscaffolded.

## Steps

- [x] **S1** `claude` — Write `docs/decisions/README.md` and `docs/decisions/adr-0001-architecture.md` (covers AC1, AC4, AC5, AC6).
  - Rules: `prd-context` (technical choices table and its D/P statuses; main flows; guardrails 4 and 6; free-tier limits), `nextjs-app` §Rules 1, 4, 5, 6, 7, 10, `supabase-db` §Security, `security-check` §Secrets + §Data access.
  - Verify: `V4`.
- [x] **S2** `claude` — Write `docs/decisions/adr-0002-data-model.md` (covers AC2, AC7, AC8).
  - Rules: `prd-context` → `references/data-model.md` (the seventeen tables verbatim; the key invariant), `supabase-db` §Model notes, `compliance-review` §C (consent/retention columns present but unused in the MVP).
  - Verify: `V5`.
- [x] **S3** `claude` — Write `docs/decisions/adr-0003-ai-provider.md` (covers AC3, AC9).
  - Rules: `ai-pipeline` §Provider: not chosen yet + §The one wrapper + §Evidence is verbatim + §Fairness is enforced in code, `compliance-review` §C overseas transfer, `prd-context` (AI governance 6; Integrations).
  - Verify: `V6`, `V7`.
- [x] **S4** `none` — Full verification `V1`–`V7`, then Claude review (`pr-review`, plus `compliance-review` and `security-check` scope).

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

- **Shipped:** Story #19 in full — all three of its task issues. `docs/decisions/` now holds an index
  plus three records: **ADR-0001** (trust boundary, the five main flows, thirteen layer choices with
  status, the `src/server` import rule) for #71; **ADR-0002** (seventeen tables with purpose, MVP
  standing and owning migration task; the four invariants, each with its PRD line) for #72;
  **ADR-0003** (the provider decision held **open**, contract C1–C10, criteria, MVP requirements,
  owner slot, blocked tasks) for #73.

- **Changed files / areas:** docs only — `docs/decisions/README.md` (+79),
  `docs/decisions/adr-0001-architecture.md` (+240), `docs/decisions/adr-0002-data-model.md` (+242),
  `docs/decisions/adr-0003-ai-provider.md` (+259), plus this task's `spec.md` and `plan.md`. No
  application code, no `package.json`, no migration, no dependency, no env var.

- **Tests added or updated:** **none** — and deliberately. This change adds no logic. The repository
  has no test runner before the scaffold epic (`npm test` arrives with #85), and adding `package.json`
  + Vitest to assert on three Markdown files would pre-empt #83 and contradict this task's own
  "docs only, no app code" verification line. Evidence is the V1–V7 checks below, plus the Opus
  review pass.

- **Verification:** the project scripts do not exist yet (no `package.json` before #83), so
  `npm run lint / typecheck / test / build / test:e2e / test:db / eval` are **n/a**. The planned set:

  | Check | Result |
  |---|---|
  | `V1` docs-only diff | ✅ 6 files, all under `docs/`; `… \| grep -v '^docs/'` empty |
  | `V2` relative links resolve | ✅ 0 broken across all 6 files |
  | `V3` secret scan | ✅ env var **names** only (`BLOB_READ_WRITE_TOKEN`, `SEED_BLOB_BASE_URL`, `AI_MODEL_*`); no value, no `*.public.blob.vercel-storage.com` |
  | `V4` ADR-0001 | ✅ 5/5 main flows; 13/13 layer rows with status, matching `requirements.md` one-for-one; `src/server` import rule present |
  | `V5` ADR-0002 | ✅ 17/17 table names, exact-match diff against the PRD list; each with owning task + MVP standing; 4 invariants, 9 PRD quotes verified verbatim |
  | `V6` ADR-0003 | ✅ status `Open`; owner slot; 5 unblocking conditions; 3 blocked + 9 buildable tasks linked; C1–C10 |
  | `V7` no provider brand as a decision | ✅ **zero** brand names anywhere under `docs/decisions/` |

- **Deviations:**
  1. **The whole story shipped as one change, not the first unblocked task.** `urec-orchestrator`
     Step 1 takes one task from a story; the request named the story, #72 and #73 depend only on
     #71, and the story's three ACs map 1:1 to the three records. Spec assumption A1.
  2. **Claude executed every step; nothing went to `cursor-agent`.** All three issues carry
     `Executor hint: claude (judgment-heavy)`. The records' whole value is that each claim traces to
     a PRD line, and an executor that cannot load `prd-context` would have to be fed the PRD
     wholesale with no cheap way to check for invented claims. Spec assumption A2.
  3. **ADR-0003 names no shortlist**, though #73's "What to build" asks for "the criteria, the
     shortlist and … the contract". The same issue's "Done when" requires the record to "never name
     a chosen provider", and brands inside a record the backlog cites would harden into a choice.
     The refusal and who draws the shortlist instead are stated in the record (D5 preamble, D6).
  4. **ADR-0002 D2 contains two SQL statements**, though #72 puts "RLS policy text" out of scope.
     They are the lock-down (`enable row level security` + `revoke`), not policy text — the point is
     that no policy is ever written — and the record now says so and points policy work at #113.
  5. **The five main flows in ADR-0001 D4 became `####` headings** mid-verification, so they are
     linkable and `V4a` can check them.

- **Fix rounds / escalations:** none on implementation — V1–V7 passed on the first full run (one
  self-corrected check pattern in V4a, not a content defect). One review round: twelve findings
  applied, then re-verified.

- **Models used:** planning, all three writing steps and the fixes — Claude Opus 5 (`claude-opus-5`).
  Review gate — Claude Opus 5 (`claude-opus-5`) subagent. **No `cursor-agent` call was made**, so no
  Grok or GPT model was used at any point.

- **Claude direct fixes:** all of them, by definition (see deviation 2).

- **Review findings:** `pr-review` + `compliance-review` + `security-check` scope, Opus subagent.
  Verdict **pass with follow-ups**; **no blockers**. Confirmed independently: 17/17 table names
  exact, all 15 cited issue numbers correct against `manifest.json` and the roadmap JSONs, all 10
  PRD quotes verbatim, no secret or Blob URL, no provider brand, no decided PRD rule contradicted,
  no open question settled, AC1–AC10 all MET. **All twelve findings were applied**, not deferred:
  - *major 1* — ADR-0001 tagged the three trust-boundary rules `proposed`, contradicting
    `CLAUDE.md` hard rule 3 and ADR-0002 D2's "not negotiable". D1 now carries a callout saying the
    PRD status records only the PRD's wording and licenses nothing.
  - *major 2* — "suggested" was a fourth status word the README never defined. README now maps it to
    **proposed** and states that a proposed item can still be non-negotiable.
  - *major 3* — this Outcome, the AC ticks, the step ticks and the spec status. Done.
  - *minor 4* — "the AI only suggests" was absent from ADR-0001; added to D2 at the call-site list.
  - *minor 5* — due-soon `≥ 0.8` and the end-state rule read as decided; both now tagged **proposed**.
  - *minor 6* — C5 attributed date of birth, ethnicity and contact details to the PRD; the list is
    now split into the seven PRD-decided attributes and the three stricter `ai-pipeline` additions.
  - *minor 7* — the Vercel firewall was stated as *the* rate-limit mechanism; both records now say
    firewall rule if the plan offers one, otherwise an app-level limiter, with #175 recording which.
  - *minor 8* — ADR-0002 claimed `supabase-db` defers the table list to it; corrected to
    `prd-context`, which this record expands.
  - *minor 9* — the SQL in D2 now says why it is not policy text.
  - *minor 10* — ADR-0001 D2 now notes the paths follow `nextjs-app`'s provisional layout, which #83
    confirms.
  - *minor 11* — stale cross-refs fixed: `plan.md` C1–C9 → C1–C10; `spec.md` C2 → C3.
  - *minor 12* — the shortlist deviation is recorded here and in ADR-0003 D5.

- **Follow-ups:** three, none blocking — see the PR body. (1) Point
  `.claude/skills/supabase-db/SKILL.md` and `.claude/skills/ai-pipeline/SKILL.md` at the new records
  so the deferral chain is real in both directions. (2) Re-check ADR-0002 D1's E03 partition and
  ADR-0003 D5's blocked list whenever the backlog is re-cut. (3) Label
  [#111](https://github.com/dczii/URecruitment/issues/111),
  [#145](https://github.com/dczii/URecruitment/issues/145) and
  [#128](https://github.com/dczii/URecruitment/issues/128) `needs-decision`, since ADR-0003 D5 now
  records them as blocked on the open provider question.
