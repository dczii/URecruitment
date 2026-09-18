# Plan — #30 [Story] Recruiters can navigate the portal on desktop and on a phone

Spec: [spec.md](./spec.md) · Branch: `feat/30-app-shell-navigation` · Created: 2026-09-18

## Approach

Design the shell against the accepted Phase 0 navigation map and the semantic tokens from stacked
PR #201. Desktop uses a quiet persistent sidebar; phone uses a top bar and focus-managed navigation
sheet, keeping the page itself free of horizontal scrolling. The root layout remains a Server
Component and composes a small client island only for pathname-aware active state and sheet
interaction. Static placeholder routes prove the navigation contract without pulling future screen
work into this Story. A five-item bottom bar was rejected because the recruiter-name affordance,
long labels and 320 px reflow make it fragile.

## Skills in scope

<!--
Inventory all repository-local skill descriptions before planning. List every matching skill
and why it applies. Re-run discovery and update this list if the file or subsystem scope expands.
Each step below says which selected skills it must obey.
-->

- `prd-context` — supplies the decided screen list/device support and identifies proposed phone/name
  design rules without silently settling RC-2.
- `testing` — maps every Story criterion to Playwright in desktop and phone projects and prohibits
  networked unit tests, retries, skipped tests or weakened assertions.
- `github-workflow` — governs the stacked Story branch, one commit per Task, issue readiness,
  closing references, Project 4 state and stacked PR metadata.
- `ui-design` — governs pen.dev-only access to `.pen`, 1440/390 frames, semantic token use, phone
  behaviour, readable mirrors and design validation; the design step stays with Claude.
- `ui-build` — requires building from `design/specs/shell.md`, token-only Tailwind styles,
  shadcn-first composition, semantic landmarks, visible focus, a phone sheet and no overflow.
- `nextjs-app` — applies to App Router layouts, route groups, Server Component ownership and the
  minimal client boundary. The installed Next package exposes no `node_modules/next/dist/docs`
  Markdown guide, so implementation must preserve current Next 16.3.5 generated-type conventions.
- `emil-design-eng` — informs restrained hierarchy, touch feedback and a crisp professional shell;
  bespoke motion remains out of scope.

## Files

| File | Change |
|---|---|
| `design/shell.pen` | new — desktop, phone and phone-sheet shell frames |
| `design/specs/shell.md` | new — readable shell structure, states and responsive contract |
| `src/app/layout.tsx` | modify — wrap portal content in the Server Component shell |
| `src/app/page.tsx` | modify — redirect `/` to `/dashboard` |
| `src/app/dashboard/page.tsx` | new — static Dashboard placeholder |
| `src/app/jobs/page.tsx` | new — static Jobs placeholder |
| `src/app/search/page.tsx` | new — static Candidates placeholder |
| `src/app/placements/page.tsx` | new — static Placements placeholder |
| `src/app/settings/page.tsx` | new — static Settings placeholder |
| `src/components/patterns/AppShell.tsx` | new — server-owned shell structure and landmarks |
| `src/components/patterns/AppNavigation.tsx` | new — minimal pathname/sheet client island |
| `src/components/ui/sheet.tsx` | new — shadcn sheet primitive generated against installed Base UI |
| `e2e/shell.spec.ts` | new — desktop, phone, focus, sheet and overflow acceptance tests |
| `e2e/smoke.spec.ts` | modify — follow the intentional `/` redirect and retain scaffold checks |
| `docs/tasks/30-app-shell-navigation/spec.md` | new — Story contract |
| `docs/tasks/30-app-shell-navigation/plan.md` | new — execution and evidence |

## Dependencies

<!-- New npm packages (name@range, why), env vars, migrations. "none" if none. -->

- none

## Steps

<!--
One step = one executor call. Executor tag: grok (default) | gpt (GPT-5.6 Sol; state why) | claude (pen.dev design, or the selected executor failed twice) | none (verification only).
Logic is test-first: (a) failing tests, then (b) implementation.
Mark `parallel-safe` only when files don't overlap with any other step.
-->

- [x] **S1** `claude` — Create `design/shell.pen` and `design/specs/shell.md` for desktop default,
  phone default, phone sheet open, active navigation, named/unnamed recruiter affordances and
  long-title stress cases (covers AC1, AC2, AC4; Task #96).
  - Rules: `ui-design` §Tooling, §Frames and §Output; `prd-context` device/name guardrails;
    `docs/plans/accessibility-standard.md` A1, B4, B6–B8, C1, C5–C6 and E5;
    `emil-design-eng` restrained professional defaults.
  - Verify: pen.dev validation; inspect the three core frames at 1440 and 390 px; confirm the
    Markdown mirror specifies exact dimensions, landmarks, focus, sheet and overflow behaviour.
- [x] **S2a** `grok` — Add failing Playwright acceptance tests in `e2e/shell.spec.ts` and update
  `e2e/smoke.spec.ts` for the intended root redirect (covers AC1–AC4; Task #97).
  - Rules: `testing` both projects/no retries/no skipped tests; `ui-build` role locators, keyboard,
    sheet focus return and 390 px overflow assertions; `nextjs-app` route conventions.
  - Verify: `npm run test:e2e -- e2e/shell.spec.ts` fails because the shell and routes do not exist,
    with assertion failures rather than import/configuration errors.
- [x] **S2b** `grok` — Build the Server Component shell, pathname/sheet client island, shadcn sheet
  and five static destination pages from `design/specs/shell.md` until S2a is green (covers AC1–AC4;
  Task #97).
  - Rules: `ui-build` tokens only, shadcn first, semantic HTML, visible focus, phone sheet and no
    horizontal overflow; `nextjs-app` Server Components by default and minimal `"use client"`
    boundary; `testing` preserve all assertions; no custom animation.
  - Verify: `npm run lint`; `npm run typecheck`; `npm test`; `npm run build`;
    `npm run test:e2e -- e2e/shell.spec.ts e2e/smoke.spec.ts`.
- [x] **S3** `none` — Inspect the complete Story diff, run all applicable verification until green,
  visually compare the running shell with `design/shell.pen`/`design/specs/shell.md` at desktop, phone
  and 320 px. Do not run `pr-review`. Close out docs when checks are green.

## Test plan

Every acceptance criterion must name an automated test, or state why automation is not appropriate and name the manual evidence.

| AC | Test or manual evidence | Type / reason |
|---|---|---|
| AC1 | `e2e/shell.spec.ts › AC1: desktop navigation reaches every primary destination` | E2E, both projects where applicable |
| AC2 | `e2e/shell.spec.ts › AC2: phone sheet navigates without horizontal overflow and returns focus` | E2E phone |
| AC3 | `e2e/shell.spec.ts › AC3: keyboard reaches skip link and navigation with visible focus` | E2E desktop |
| AC4 | `e2e/shell.spec.ts › AC4: title, main region and recruiter-name affordance render`; pen.dev review | E2E + design review |

## Verification

```
npm run lint
npm run typecheck
npm test
npm run build        # if app code changed
npm run test:e2e     # if a screen changed
npm run eval         # if AI parsing/matching changed
```

## Risks & rollback

- **Stack dependency:** PR #201 is still open and its E2E check is red. This PR targets #201's branch
  and inherits its changes; after #201 merges, rebase onto `main`, retarget and confirm a Story-only
  diff.
- **Client-boundary creep:** active navigation and sheet state could turn the full shell into a
  client component. Keep structure in `AppShell.tsx` and isolate only navigation interaction.
- **Route-placeholder drift:** placeholders may be mistaken for screen implementation. Keep them
  static and explicitly labelled; later screen Stories replace their content.
- **Sheet focus/overflow:** generated primitive styles can regress focus return or viewport width.
  Playwright covers open, Escape, restored focus and document width at 390 px.
- **Rollback:** revert the #96 design commit and #97 test/build commits; there is no data migration
  or external resource.

## Outcome

<!-- Filled after execution. -->

- **Shipped:** Desktop sidebar + phone sheet shell, five placeholder destinations, `/` → `/dashboard`.
- **Changed files / areas:** `AppShell`/`AppNavigation`/`sheet`, five route pages, root layout/redirect, Playwright shell + smoke.
- **Tests added or updated:** `e2e/shell.spec.ts` AC1–AC4 (desktop + phone); `e2e/smoke.spec.ts` home heading after redirect.
- **Verification:** `npm run lint` pass (existing unused-var warning in `supabase/migration-lint.ts`); `npm run typecheck` pass; `npm test` 99 pass; `npm run build` pass; `npm run test:e2e -- e2e/shell.spec.ts e2e/smoke.spec.ts` 18 pass. `test:db` n/a; `eval` n/a.
- **Deviations:** Included orchestrator/review-skip skill updates on this branch because they were requested in-session. Phone AC3 focuses the menu button after skip-link tab, not Shift+Tab after skip.
- **Fix rounds / escalations:** Executor stalled twice on branch/worktree; shell built in-session. AC4 phone header copy; eslint ignore for Playwright artifacts.
- **Models used:** Planning/orchestration Cursor Grok 4.6 (this session). Design Claude (pen.dev). S2a/S2b intended `cursor-grok-4.6-high`; implementation completed in Cursor after stall (`unknown` exact executor ID for stalled runs).
- **Claude direct fixes:** Shell implementation, e2e AC3/AC4, eslint ignores, smoke heading.
- **Follow-ups:** Rebase onto `main` after PR #201 merges. Optional `/review`. RC-2 still open. 
