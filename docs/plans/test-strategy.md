# Test strategy

## Status

**Accepted** · 2026-09-17 · created by [#78](https://github.com/dczii/URecruitment/issues/78)
(story [#23](https://github.com/dczii/URecruitment/issues/23), epic
[#1](https://github.com/dczii/URecruitment/issues/1))

This is the testing contract the whole backlog inherits. It says which layer tests what, which
behaviours are **test-first**, what fixtures may contain, how time is frozen, what each area must
prove at minimum, and which gate blocks a merge. The `testing` skill is the working summary. Where
they differ, update both in the same PR.

The PRD's testing layer is **proposed**: *"Vitest for logic, Playwright for key screens, and an AI
quality script run against the sample answer key."* The quality bar the eval enforces is **decided**
(see [ai-eval-plan.md](ai-eval-plan.md)).

**There is no coverage percentage gate.** Quality comes from test-first logic and from mapping every
acceptance criterion to a named test. A coverage number would reward testing what is easy over what
the PRD makes a rule.

## The four layers

| Layer | Tool | Location | Command | Runs against | Network |
|---|---|---|---|---|---|
| **Unit** | Vitest (`vitest.config.ts`) | `src/**/*.test.ts(x)`, next to the code; `scripts/**/*.test.ts` for scripts | `npm test` | Pure code with a **fake DB** and the **fake AI model** | **None.** An unexpected `fetch` fails the test (`test/setup.ts`) |
| **DB integration** | Vitest, separate config (`vitest.db.config.ts`) | `src/**/*.db.test.ts`, `supabase/tests/*.db.test.ts` | `npm run test:db` | A **local Supabase** stack (`supabase start`, needs Docker), migrations applied from scratch | Local stack only. Never a remote project |
| **End-to-end** | Playwright (`playwright.config.ts`), projects **`desktop`** (1440×900) and **`phone`** (390×844, `isMobile: true`) | `e2e/*.spec.ts`, shared helpers in `e2e/helpers/` | `npm run test:e2e` | The local dev server, or a Vercel **preview** URL in CI, with seeded fictional data | The app under test only |
| **AI quality** | The eval script (`eval/run.ts`) | `eval/` (answer key under `eval/answer-key/`; `eval/scoring.ts` is unit-tested in the Unit layer) | `npm run eval` | **Real models** and the **verified** answer key ([ai-eval-plan.md](ai-eval-plan.md)) | Yes: the provider, plus listing and downloading from the sample-data store |

The four commands, plus `npm run lint`, `npm run typecheck` and `npm run build`, are named **exactly**
as in `CLAUDE.md`. The task that first needs a script adds it with that name:

- `test`, `test:e2e` and `test:db` come from [#85](https://github.com/dczii/URecruitment/issues/85);
  `test:db` is wired to the local stack by [#87](https://github.com/dczii/URecruitment/issues/87);
- `eval` comes from [#173](https://github.com/dczii/URecruitment/issues/173);
- `lint`, `typecheck`, `build` and `dev` come from [#83](https://github.com/dczii/URecruitment/issues/83).

### What belongs where

| If the behaviour is… | Test it in | Why |
|---|---|---|
| A rule with inputs and outputs (dates, scores, caps, merges, filters, validation) | **Unit** | Fast, exhaustive over edge cases, no infrastructure |
| A SQL function, view, migration, RLS policy or storage rule | **DB** | Only Postgres can prove Postgres. The TypeScript mirror of a SQL rule shares its **test cases** with the DB test |
| A screen renders, its primary action works, it holds up at 390 px, status carries words, the name prompt appears | **E2E** | Proves the user-visible contract at both widths |
| The AI parses and ranks well enough | **AI quality** | Only real models can prove prompt quality. **Unit tests never assert on prompt quality**; they use the fake model |

A task that adds behaviour names its layer in its plan's test table, per acceptance criterion. When no
automated test is appropriate (docs-only, for example), the plan says `none`, gives the reason and
names the manual evidence.

## Test-first

**Protocol** (from `testing`):

1. Write the tests from the spec's acceptance criteria and edge cases. Test names quote the AC id,
   e.g. `it("AC2: caps score at 50 when a must-have is missing")`.
2. Run them. **They must fail for the stated reason**: an assertion, not an import error or a typo.
   The orchestrator checks this before implementation starts.
3. Implement the minimum to pass.
4. Refactor with the tests green.

**These behaviours are always test-first.** Each one is a rule the PRD (or a `CLAUDE.md` hard rule)
makes, so a regression changes what recruiters see or what the portal is allowed to do.

| # | Behaviour | The rule it protects | Owning task(s) | Layer(s) |
|---|---|---|---|---|
| T1 | **Working days and SG public holidays** | *"Limits count working days, Monday to Friday, skipping Singapore public holidays"* (decided) | [#116](https://github.com/dczii/URecruitment/issues/116), [#166](https://github.com/dczii/URecruitment/issues/166) | Unit + DB (shared cases) |
| T2 | **Limit hierarchy** (job > client > default) | *"A job's limit overrides the client's, and the client's overrides the default"* (decided) | [#157](https://github.com/dczii/URecruitment/issues/157), [#165](https://github.com/dczii/URecruitment/issues/165) | Unit + DB |
| T3 | **Delay status** (on track / due soon at 80% / overdue; days over; end states and Placed have none) | Delay detection 1–2 (proposed) | [#156](https://github.com/dczii/URecruitment/issues/156), [#158](https://github.com/dczii/URecruitment/issues/158) | Unit + DB |
| T4 | **Guarantee end date and the 5-working-day flag** | After Placed (decided; timing proposed) | [#162](https://github.com/dczii/URecruitment/issues/162), [#163](https://github.com/dczii/URecruitment/issues/163) | Unit |
| T5 | **Must-have score cap** | Job matching 3 (proposed) | [#148](https://github.com/dczii/URecruitment/issues/148) | Unit |
| T6 | **Protected-attribute redaction**, including the nationality and language reason rule | Job matching 1–2 (decided) | [#148](https://github.com/dczii/URecruitment/issues/148), [#135](https://github.com/dczii/URecruitment/issues/135) | Unit |
| T7 | **Evidence verification** (a quote not in the source is flagged, never stored as verified) | AI governance 1 (proposed) | [#127](https://github.com/dczii/URecruitment/issues/127), [#142](https://github.com/dczii/URecruitment/issues/142), [#148](https://github.com/dczii/URecruitment/issues/148) | Unit |
| T8 | **Total years of experience** from work history, overlaps counted once | Parsed profile: *"calculated from work history"* (approved) | [#127](https://github.com/dczii/URecruitment/issues/127) | Unit |
| T9 | **Recruiter-override merge** (edits survive re-parse) | CV processing 1 (proposed) | [#132](https://github.com/dczii/URecruitment/issues/132) | Unit + DB |
| T10 | **Missing-field gap rules** (one rule per field, each with its client question) | Gap check → Missing (approved) | [#140](https://github.com/dczii/URecruitment/issues/140) | Unit |
| T11 | **Search filter building and fusion** (protected terms ignored; job-scoped ranking) | Talent search 1–3 (proposed) | [#152](https://github.com/dczii/URecruitment/issues/152), [#153](https://github.com/dczii/URecruitment/issues/153), [#155](https://github.com/dczii/URecruitment/issues/155) | Unit + DB |
| T12 | **Eval scoring rules** (field correctness, top-5 agreement, exclusion of unverified entries, coverage minimum) | Quality bar (decided) | [#173](https://github.com/dczii/URecruitment/issues/173), [#172](https://github.com/dczii/URecruitment/issues/172) | Unit |
| T13 | **Spend cap** (Singapore month boundary; the refusal is recorded) | Security 5 (proposed) | [#175](https://github.com/dczii/URecruitment/issues/175) | Unit |
| T14 | **Env parsing** (a missing or malformed variable names the variable, never its value) | `CLAUDE.md` hard rules 3 and 6 | [#84](https://github.com/dczii/URecruitment/issues/84), [#117](https://github.com/dczii/URecruitment/issues/117) | Unit |
| T15 | **Typed-name validation** (blank, whitespace or over-long names refused; an audited write without a name refused) | Users 2–3 (decided); `CLAUDE.md` hard rule 8 | [#167](https://github.com/dczii/URecruitment/issues/167), [#156](https://github.com/dczii/URecruitment/issues/156) | Unit |

Also test-first, because their tasks say so and the rule is security-relevant: the **Sentry
scrubber** ([#86](https://github.com/dczii/URecruitment/issues/86)), the **server-only client
import refusal** ([#88](https://github.com/dczii/URecruitment/issues/88)), the **signed-URL
helper** ([#114](https://github.com/dczii/URecruitment/issues/114)), the **`runAi()` wrapper**
([#169](https://github.com/dczii/URecruitment/issues/169)), the **RLS lock-down**
([#113](https://github.com/dczii/URecruitment/issues/113)) and the **seed store guard**
([#117](https://github.com/dczii/URecruitment/issues/117)).

## Fixtures

- **Fictional only.** No real person, company contact or CV, ever. Names are obviously invented.
  Emails use `example.com`. Phone numbers use a reserved or clearly fake pattern.
- **Where they live:** small EN and ZH CV and JD **snippets** in `test/fixtures/`. Binary fixtures
  (a text PDF, a Chinese text PDF, a DOCX, an image-only PDF) in `test/fixtures/cv/`, generated
  from fictional text.
- **No Blob store access in unit or DB tests.** The public sample-data store belongs to the seed and
  the eval only. A test never lists it, downloads from it, or names its URL.
- **No network in unit tests.** Use the fake AI model (`src/server/ai/fake-model.ts`,
  [#169](https://github.com/dczii/URecruitment/issues/169)), and make any unexpected `fetch` fail
  the test (`test/setup.ts`, [#85](https://github.com/dczii/URecruitment/issues/85)).
- **Explicit holiday fixtures.** Working-day tests declare the holidays they depend on. They never
  read the live `sg_public_holidays` table, and never depend on "this year's" holidays.
- **Prompt-injection fixtures.** Every prompt task includes at least one CV or JD fixture whose text
  tries to instruct the model. The test proves the output is still schema-valid data and nothing is
  executed ([ADR-0003](../decisions/adr-0003-ai-provider.md) C7).
- **Protected-attribute fixtures** include each attribute the PRD names, so a redaction test can
  prove each one is absent from the model payload.

## Time

- **Freeze it** with `vi.setSystemTime()`. No test depends on the wall clock.
- **Store UTC, assert Singapore.** Cases must cover:
  - **23:59 vs 00:00 SGT** (15:59 / 16:00 UTC), the working-day boundary;
  - **Friday** entry, **weekend** entry, and the **eve and day of a public holiday**;
  - the **Singapore month boundary** for the spend cap;
  - a stage entered, left and re-entered (the clock resets on every move, including backwards).
- **Rounding** for due soon (`used / limit ≥ 0.8`, in working days) is stated in the owning task's spec and tested at, just below and just above the threshold.

## End-to-end rules

- Both projects, `desktop` and `phone`, run **every** key-screen spec.
- **Every key screen proves:**
  - it renders with seeded data;
  - its primary action works;
  - delay badges contain **words**;
  - there is **no horizontal overflow at phone width**.
- The last two use the shared helpers `expectNoHorizontalOverflow(page)` and
  `expectStatusNotColourOnly(page)` in `e2e/helpers/a11y.ts`
  ([#107](https://github.com/dczii/URecruitment/issues/107)), plus `expectNoA11yViolations(page)`
  ([#108](https://github.com/dczii/URecruitment/issues/108)). The conditions they assert are defined
  in [accessibility-standard.md](accessibility-standard.md).
- **Stage moves** exercise the typed-name prompt: first use, remembered name, and "not you?".
- The **core flows** in [../ux/flows.md](../ux/flows.md) are the outline of the journey specs.
- **Locators:** prefer role and label. Add `data-testid` only where no accessible name exists.
- **No `waitForTimeout`.** Wait on UI state.
- **Seeded data:** e2e runs against the fictional seed. A spec that needs a specific state (an
  overdue candidate, say) finds it through the seed's documented back-dated spread
  ([#121](https://github.com/dczii/URecruitment/issues/121)), never by hard-coding an id.

## Minimum proof per area

Every MVP area has at least one **must prove** line. A task in that area names which line(s) its tests
cover.

| Area | Must prove | Layer |
|---|---|---|
| **Foundation** | A missing or malformed env var names the variable and prints no value; the client bundle contains no secret-key name; `npm run build` passes from a clean clone | Unit; build check |
| **Security** | The publishable key reads nothing from **every** table (discovered, not listed); the storage bucket is private; a signed URL expires; a client module cannot import server code; security headers are present on a page response | DB; unit; e2e |
| **Design system** | No horizontal overflow at 390 px; delay status is not colour-only; the axe scan passes on the shell and shared patterns; `AiSuggestion` always shows its label, and its model version and date for scores; `TypedNameDialog` persists the name | E2E; unit (Testing Library) |
| **Data & seed** | Migrations apply from scratch twice; working days match between SQL and TypeScript on the shared cases; the seed aborts on a wrong store or missing variable; after seeding, all three delay statuses exist | DB; unit |
| **CV processing** | Scanned files are rejected with a reason; EN and ZH fixtures parse to the schema; the evidence check flags an invented quote; overrides survive re-parse | Unit; DB |
| **Jobs** | Nationality or language cannot be required without a written reason (form **and** action); every save creates a new version; recruiter-confirmed values win over the AI pre-fill | Unit; e2e |
| **Gap check** | Each missing-field rule; open flags do not block matching; resolve and dismiss need a note and a name | Unit; e2e |
| **Matching** | Redaction removes each protected attribute; nationality and language count only with a reason; the cap is applied at, above and below the boundary; the score key includes job version and model version; stale scores are hidden; opening a job makes no AI call | Unit; DB; e2e |
| **Search** | Filters exclude correctly; a ZH keyword hits; job-scoped ranking follows stored scores with no AI scoring call; protected terms are ignored | Unit; DB; e2e |
| **Pipeline** | Status transitions and thresholds; the "waiting on" mapping; end states and Placed have no status; every move writes one `stage_events` row with a name; a keyboard-only move works | Unit; DB; e2e |
| **Dashboard** | Overdue is ordered by days over; all four filters work alone and combined; empty sections read as good news | E2E |
| **Placements** | The guarantee end date uses the client period (default 30); the flag appears 5 working days before the end | Unit; e2e |
| **Settings & audit** | Invalid limits are refused; a saved limit changes the running clock; each save writes exactly one log row with a name; duplicate holidays are refused; the change log is append-only | Unit; e2e |
| **AI governance** | Every call goes through `runAi()` (a call outside it fails a test); a failed call still writes an `ai_runs` row; the spend cap refuses at the cap; the eval reports EN and ZH separately and does not pass on an empty set | Unit; eval |
| **Release** | CI runs lint, typecheck, unit and build on every PR; the DB job fails on a broken migration; the e2e job skips cleanly without a preview; secret-needing jobs skip with a notice on forks | CI runs |

## Gates

| Gate | Workflow | Runs on | Blocks a merge? |
|---|---|---|---|
| **PR checks:** `npm ci` → lint → typecheck → `npm test` → build (plus `npm audit --omit=dev`, per the [security baseline](../security/baseline.md)) | `.github/workflows/pr-checks.yml` ([#89](https://github.com/dczii/URecruitment/issues/89)) | Every PR and every push to `main` | **Yes**, once the user makes it a required check |
| **DB:** local Supabase → migrations from scratch → `npm run test:db` | `.github/workflows/db.yml` ([#91](https://github.com/dczii/URecruitment/issues/91)) | PRs touching `supabase/**` (and DB services) | **Yes**, when it runs (required once stable) |
| **E2E:** Playwright `desktop` + `phone` against the preview | `.github/workflows/e2e.yml` ([#90](https://github.com/dczii/URecruitment/issues/90)) | When a Vercel preview is ready | **Yes**, once stable. Skips, and does not fail, when no preview exists |
| **AI quality:** `npm run eval` | `.github/workflows/eval.yml` ([#174](https://github.com/dczii/URecruitment/issues/174)) | PRs touching prompts, parser, matcher, schemas or `eval/`; `workflow_dispatch`; before each release | **The release, not every merge.** See [ai-eval-plan.md](ai-eval-plan.md#when-it-runs-and-what-it-costs). Skips with a notice when secrets are absent |
| **Claude review** (`pr-review`) | The orchestrator, Step 8 | Every task PR | **Yes**: blocker and major findings go back to the fix loop |

- **Required checks are a repository setting.** The user enables them. Agents recommend, never change
  settings (`ci-setup`).
- **Workflow file name.** `ci-setup` sketches the PR workflow as `ci.yml`; the owning task #89 names
  it `pr-checks.yml`. The task's name wins, and this record uses it.

## Flakes and failures

- A flaky test is **fixed or quarantined through an issue**. It is never silently retried into green.
- **Never delete, `.skip` or loosen an assertion** to make a build pass. If a test is wrong, fix it
  and explain why in the PR.
- **Keep the unit layer fast:** under ~10 s in total. Push slow cases down to the DB or e2e layers.
- **A red eval is information, not a flake.** A language below the bar is reported and raised as an
  issue. Prompts are not tuned inside the eval task to make it pass.

## Out of scope

- Writing any test or harness; the owning tasks do that ([#85](https://github.com/dczii/URecruitment/issues/85) first).
- Workflow YAML (E01-S03).
- A coverage percentage.
