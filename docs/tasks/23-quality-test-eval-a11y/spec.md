# Spec — #23 Quality is defined before it is built

| | |
|---|---|
| Issue | https://github.com/dczii/URecruitment/issues/23 (Story) |
| Tasks | #78 (E00-S05-T01), #79 (E00-S05-T02), #80 (E00-S05-T03) |
| Parent | Story #23 → Epic #1 "Decisions, architecture & delivery plan" |
| Milestone | MVP |
| Branch | `docs/23-quality-test-eval-a11y` (stacked on `docs/22-security-compliance-baselines`) |
| Created | 2026-09-17 |
| Status | In review <!-- Planned → In progress → In review --> |

## Problem

In December the recruiters will grade the AI, and the product owner will decide go or no-go on that
evidence. If the way quality is measured is settled only when the eval script is written, the bar
will be shaped by whatever was easy to measure. The same applies to tests and accessibility. If each
feature task decides for itself which layer tests it, or what "usable at phone width" means, the
answers will differ from task to task, and the PRD's rules will be checked unevenly. This story fixes
all three contracts before any prompt, screen or test exists.

## PRD references

| PRD section | Item | Status |
|---|---|---|
| Goals → MVP quality bar | *"at least 90% of parsed CV fields are correct, and recruiters agree with at least 80% of top-5 match rankings. The same bar applies to English and Chinese CVs."* | **decided** |
| AI governance → 4 | Recruiters grade the AI on the sample set, with EN and ZH graded separately | **decided** |
| AI pipeline → Quality | A script scores the parser and matcher against the sample answer key before each release | **proposed** |
| Non-functional → Testing | Vitest for logic, Playwright for key screens, the AI quality script | **proposed** |
| Non-functional → Devices | Desktop and mobile browsers | **decided** |
| Non-functional → Languages | English and Simplified Chinese CVs and job descriptions | **decided** |
| UI design → Design rules 1–4 | AI suggestion label; status not colour-only; Noto Sans SC; dashboard and board usable at phone width | **proposed** |
| Parsed profile | The approved fields; total years *"calculated from work history"* | **decided** (approved) |
| Pipeline / matching / gap / search / placements rules | The logic the test-first list protects | as marked in the PRD |

## Scope

**In scope**

- `docs/plans/test-strategy.md` (#78): the four layers, each with tool, location, command and what it runs against; the test-first list T1–T15, each mapped to its PRD rule and owning task; fixture and time rules; e2e rules; a minimum-proof table per MVP area; the gates, and which of them blocks a merge; the flake policy; no coverage gate.
- `docs/plans/ai-eval-plan.md` (#79): the bar; the answer-key layout, keys and JSON formats; the rule for field correctness; the rule for top-5 agreement; verification and coverage; outputs and exit codes; triggers and cost; grading sessions. It records that the `ai-eval` scoring method was **proposed** and is **confirmed** here, and marks each refinement.
- `docs/plans/accessibility-standard.md` (#80): rules A–G, each naming how it is checked (PW, AXE, UT, DR, CR); the overflow rule as an assertable condition; the `aria-label` pattern for delay status; the axe scan specification for #108; a checklist for screen tasks.

- `docs/decisions/open-questions.md`: a new row, **RC-4** (Chinese coverage of the sample set), found while writing #79 (register rule 3).

**Out of scope**

- Writing any test, harness, workflow YAML or eval script.
- Drafting the answer key.
- Choosing a model or provider.
- Token values or component code.
- Adding the axe dependency. #108 does that, under this standard.

## Acceptance criteria

- [x] **AC1** — Given the PRD quality bar, when I read `docs/plans/ai-eval-plan.md`, then the answer-key format, the scoring method and the separate EN and ZH bars (≥ 90% fields, ≥ 80% top-5) are all fixed. _Proved by:_ `V5`.
- [x] **AC2** — Given a logic task, when its plan is written, then `docs/plans/test-strategy.md` already says which layer tests it and which behaviours are test-first. _Proved by:_ `V4`.
- [x] **AC3** — Given the dashboard and board must work at phone width, when a screen is built, then `docs/plans/accessibility-standard.md` states the keyboard, contrast, `lang` and overflow rules it must meet. _Proved by:_ `V6`.
- [x] **AC4** (#78) — All four layers appear with tool, location, command and what each runs against. Every command matches the script names in `CLAUDE.md`. _Proved by:_ `V4`.
- [x] **AC5** (#78) — The test-first list matches the behaviours the PRD makes rules about, and each MVP area has at least one "must prove" line. _Proved by:_ `V4`.
- [x] **AC6** (#79) — One unambiguous rule for field correctness and one for top-5 agreement; EN and ZH specified separately with the same bar; the answer-key format fixed, keyed by SHA-256, with unverified entries excluded; the method recorded as *proposed* in `ai-eval` and confirmed here. _Proved by:_ `V5`.
- [x] **AC7** (#80) — Every PRD design rule about access or device width appears as a checkable rule; each rule names its verification method; the phone-width overflow rule is stated as an assertable condition. _Proved by:_ `V6`.
- [x] **AC8** — Only files under `docs/` change, links and anchors resolve, every issue number exists, and no secret, Blob URL or real personal data appears. _Proved by:_ `V1`, `V2`, `V3`, `V8`.

## Guardrails that apply

- [x] **AI only suggests** — accessibility rule F3; the eval grades suggestions and never acts on them.
- [ ] No email — n/a.
- [ ] Server-only data access — n/a.
- [ ] RLS — the test strategy requires the lock-down proof, but nothing is built here.
- [x] **AI output schema-validated, shows source text** — accessibility rules F1 and F2; test-first items T7 and T12.
- [x] **Protected attributes** — test-first item T6; the drafting rule in the eval plan.
- [x] **UTC / SGT; SG working days** — the time rules in the test strategy; accessibility rule G5.
- [x] **Typed name** — test-first item T15; accessibility rule B6.
- [x] **Phone width; status not colour-only; Chinese text** — accessibility sections C, D and E.
- [x] **Fictional data only; no Blob URLs** — fixture rules; the answer key excludes URLs **and** file names.
- [x] **Free-tier limits** — cost control in the eval; the spend cap bounds every eval run.

## UX / design

n/a (these are standards the design tasks follow).

## Data / API changes

None.

## Assumptions

- **A1 — One PR for the story (user instruction), stacked on #22.** There is one commit per task, and #79 follows #78 as its issue requires.
- **A2 — Claude writes it.** All three issues carry `Executor hint: claude (judgment-heavy)`.
- **A3 — The eval plan confirms the `ai-eval` method and adds refinements**, each marked ⊕:
  - `jobKey` is a file hash;
  - a full `sha256` is stored;
  - no `fileName` in the committed key, which is stricter, following #170;
  - structured `aliases` and `ambiguities`;
  - the rules for expected nulls, extras and alignment;
  - the phone digit rule;
  - the tie-break;
  - the denominator stays 5;
  - coverage minimums;
  - the `--release` exit mode.

  Each one removes a second reading of the proposal. None changes the bar.
- **A4 — Coverage minimums (10 verified CVs and 3 verified jobs per language) are proposed starting values.** The PRD sets no number. Without a minimum, a language with one verified entry could "pass". A PR to the plan can change the values.
- **A5 — A job counts under the language of its JD** (the `ai-eval` proposal, confirmed). The PRD's Languages requirement expects Chinese JDs in the sample set, and the coverage minimum keeps a partial set from passing silently.
- **A6 — A PR-time eval result below the bar is a review finding, not an automatic merge block.** The release-mode run is the gate. This follows `ai-eval` ("runs before each release and on every PR that changes prompts…") without making iterative prompt work unmergeable.
- **A7 — The eval cost is given as an order of magnitude with no provider named.** It is recomputed once DT-1 is decided.
- **A8 — WCAG 2.2 AA is adopted as the reference level.** The PRD names none. The enforced rules are the ones listed.
- **A9 — The 24 px and 44 px target sizes, and the three `aria-label` patterns, are set here.** `ui-build` gives one example label ("Overdue by 3 working days"), and the other two follow the same form.
- **A10 — The PR-checks workflow is called `pr-checks.yml`,** as #89 names it, rather than `ci.yml` from the `ci-setup` sketch.
- **A11 — No test runner** (as #19 A8).
- **A12 — A job with fewer than five plausible candidates is graded on its own size K** (added after review). #171 says such jobs are *"flagged rather than padded"*, and dividing by 5 would penalise the model for the key's own gap.
- **A13 — Chinese coverage is raised as RC-4, not settled.** The PRD grades English and Chinese CVs separately, and the store held no Chinese CVs or JDs on 17 Sep 2026. Grading rankings by CV language was considered and rejected, because a job's top 5 mixes languages.

## Open questions

- None new. The provider (DT-1) affects the eval's cost and correlation note, and is linked, not settled.
