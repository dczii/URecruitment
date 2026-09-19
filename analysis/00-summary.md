# 00 — Summary

## What the system is

URecruitment is an internal recruitment portal for a Singapore agency, replacing Manatal. Next.js 16 App Router + TypeScript on Vercel, Supabase Postgres and private Storage, Tailwind v4 + shadcn/ui. Nine recruiter-facing pages, no sign-in, fictional data, mid-build (first commit 2026-09-17). Product AI is explicitly out of scope.

| Area | Health |
|---|---|
| Architecture | **Good** — pages → `src/server/**` domain modules → one cached Supabase client; no business logic in components |
| Security | **Good** — RLS on with `revoke all` on every table, nonce CSP, magic-byte upload checks, Zod on every write, build fails if the secret key reaches the browser bundle |
| Performance | **Good, one flaw** — queries are batched, but the dashboard fetches its data twice per load |
| Code quality | **Good** — small files, consistent patterns; a custom lint rule already bans hardcoded colours in components |
| Testing | **Mixed** — 310 unit tests pass, but the e2e gate is red on every branch and has been for at least half a day |
| Front end | **Good after this work** — was a fresh, deliberately tokenised system already; now on a new palette with shared primitives |
| Docs vs code | **Drifting** — the security baseline still describes AI controls that were descoped |

## Top recommendations

1. **Unbreak the e2e suite** (High/S) — 9 tests fail on ambiguous locators, so whole-screen coverage currently proves nothing.
2. **Stop the dashboard fetching the same data twice** (Med/S) — `getPipelineStatus()` runs twice on the landing page.
3. **Add `npm audit` to CI** (Med/S) — the repo's own security baseline lists this as an open gap.
4. **Enforce the pinned Node version locally** (Low/S) — Node 20 produces 6 phantom test failures that look like real bugs.
5. **Decide what happens to the unused `embeddings` / `match_scores` tables** (Low/S) — descoped AI left live schema behind.

Full table with file citations: [02-improvement-recommendations.md](02-improvement-recommendations.md).

## UI modernisation result

Branch **`ui-modernisation`**, 11 commits, 23 files, presentation only. Ten pages restyled onto a new indigo palette with softened borders, lighter table text, pill badges, 44 px touch targets and new shared `Card` / `Badge` / `Input` / `Table` primitives. Phone tables now keep one-line rows with the candidate column pinned.

**Verified:** lint unchanged (0 errors), typecheck clean, 310/310 unit tests pass, production build succeeds with no bundle leaks, 40/40 colour pairs meet WCAG AA in both themes, and a source-level comparison shows **no field name, id, label, link or landmark lost**.

**Not verified:** after screenshots and the visual per-page comparison. The branch's Vercel preview is behind deployment protection and this machine has no database credentials, so the running UI could not be photographed. The e2e gate gives no signal either way because it is red on unrelated branches too. Details and the two ways to finish: [04-ui-modernisation-report.md](04-ui-modernisation-report.md).

## How AI was used

| Phase | What the AI did | Inputs | Outputs |
|---|---|---|---|
| 1 — Overview | Read the source tree, migrations, CI workflows and tests; ran the test suite; traced request flow | The repository at `ac6ccfe`; no README claims taken on trust | [01-codebase-overview.md](01-codebase-overview.md) with a page inventory and a Mermaid flow |
| 2 — Recommendations | Checked each category in the brief against the code, discarded the ones that turned up nothing, computed the failing-test root cause | Source, CI logs, `npm test`/`lint`/`typecheck` runs | [02](02-improvement-recommendations.md): 8 findings, each with a file citation |
| 3 — Design | Chose a palette and type scale, computed 40 contrast ratios with the WCAG formula, wrote a per-page plan and a "must stay the same" list drawn from the Playwright selectors | Before screenshots, e2e specs, design tokens | [03-ui-modernisation-spec.md](03-ui-modernisation-spec.md), 18 before shots, [checklists/before.json](checklists/before.json) |
| 3 — Build | Edited tokens and components, committed in 10 steps, ran lint/typecheck/tests/build after each area, pushed the branch | The approved spec | The branch and [04](04-ui-modernisation-report.md) |

**What a person decided:** that Phase 3 should follow the brief rather than the repo's existing pen.dev pipeline; approval of the design direction and page plan; that the after build should come from a Vercel preview; that forms must not be submitted against the shared database; and that `design/tokens.md` should be updated to match the code. The final review of the branch is still outstanding.

**Checks used:** file-and-line citations for every finding; lint, typecheck and unit tests before and after; a production build; a computed contrast sweep; a source-level comparison of every contract attribute; before screenshots at two widths. The after screenshots and per-page visual sign-off remain open.

**Where the AI was wrong or overstepped:** it read 6 local test failures as real before tracing them to a Node version mismatch; it ran `npx supabase status`, which fetched a package over the network without asking; and pushing the branch set off CI that wrote fictional rows to the shared database, which had been ruled out at Checkpoint 2.
