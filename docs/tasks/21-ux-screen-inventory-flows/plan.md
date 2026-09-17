# Plan — #21 The UX structure is agreed before any screen is designed

Spec: [spec.md](./spec.md) · Branch: `docs/21-ux-screen-inventory-flows` · Created: 2026-09-17

## Approach

Write two records under a new `docs/ux/` folder:

- **The screen inventory.** Screens S1–S11, each in the same key/value shape so a design task can
  lift its own entry. The five PRD design rules come first as R1–R5 checkable constraints, and a
  navigation model covers desktop and phone.
- **The flows.** Three step tables, each with the columns *screen · who · action · state change* and
  a closing "screens crossed / tables written" summary, so a Playwright task can outline its journey
  from them.

Each record also carries a "what this does not decide" section, because the main risk of an IA record
is that it quietly takes decisions from the design tasks.

Two alternatives were rejected:

- **A single `ux.md`.** The flows cite screen IDs, and the design tasks cite screen entries.
  Separate files keep both linkable and short.
- **Drawing the flows as diagrams only.** State changes need words and table names, and a diagram
  cannot carry them legibly. One Mermaid map is used for navigation, where a picture does help.

## Skills in scope

- `prd-context`: required. Covers the screen list, design rules, pipeline rules, main flows and non-goals.
- `testing`: required. It confirms that no test runner applies. The flows are written to be the outline of later Playwright journeys (desktop and phone projects).
- `github-workflow`: required. Covers the branch, commits, PR and Project 4.
- `ui-design`: the frames (1440 / 390), the five states per screen, the PRD design rules "must be visible in every relevant frame", and the pipeline phone-layout choice belonging to the design spec.
- `ui-build`: tables collapse to cards, filters in a sheet, the keyboard move path, `aria-live`, the name dialog, signed URLs fetched on demand, and dates through the SGT formatter.
- `compliance-review`: flow 1.4 (a nationality or language reason is required), 1.11 (protected terms ignored), and "copy and UI never imply automated rejection".
- `security-check`: flow 1.2 (upload validation by content, ≤ 50 MB, private bucket) and 1.12 (a signed URL of ≤ 300 s, never persisted).

## Files

| File | Change |
|---|---|
| `docs/ux/screen-inventory.md` | new — design rules R1–R5, S1–S11, the navigation model and map |
| `docs/ux/flows.md` | new — flows 1–3 and the cross-flow checks |
| `docs/tasks/21-ux-screen-inventory-flows/spec.md` | new |
| `docs/tasks/21-ux-screen-inventory-flows/plan.md` | new |

## Dependencies

- none

## Steps

- [ ] **S1** `claude` — Write `docs/ux/screen-inventory.md` (AC1, AC3, AC4, AC6, AC7).
  - Rules: `prd-context` screens and design rules (quote them verbatim); `ui-design` §Frames and §PRD design rules; `ui-build` §Rules 4–8.
  - Verify: `V4`, `V6`, `V7`.
- [ ] **S2** `claude` — Write `docs/ux/flows.md` (AC2, AC5).
  - Rules: `prd-context` pipeline rules and main flows; `compliance-review` §B; `security-check` §Input handling and §Data access; `CLAUDE.md` hard rules 1, 2, 3, 7 and 8.
  - Verify: `V5`.
- [ ] **S3** `none` — `V1`–`V8`, then Claude review (`pr-review` + `compliance-review` + `security-check` scope).

## Test plan

**No automated tests are added.** The change is documentation only, and no test runner exists until #85.

| AC | Test or manual evidence | Type / reason |
|---|---|---|
| AC1, AC4 | `V4` | docs-only; scripted check |
| AC2, AC5 | `V5` | docs-only; scripted check |
| AC3 | `V6` | docs-only; scripted check |
| AC6, AC7 | `V7` | docs-only; scripted check + verbatim quote check |
| AC8 | `V1`, `V2`, `V3`, `V8` | docs-only; scripted check |

## Verification

```
V1  git diff --name-only <base>...HEAD | grep -v '^docs/'     # empty
V2  relative links and anchors resolve
V3  secret scan on the diff
V4  all nine PRD screen names + review queue + name prompt appear as S1–S11 entries, each with Purpose, Phone width and Design / build rows; the at-a-glance table names a design task for every row
V5  flows.md has Flow 1–3, each step row has five cells, each flow has "Screens crossed" and "Tables written", and every table named there appears in ADR-0002's seventeen
V6  S10 and S11 are both marked "needs product-owner confirmation" and link RC-2
V7  a primary navigation table with Desktop and Phone columns; R1–R5 quoted verbatim from the PRD
V8  every issue number exists
```

`npm run lint`, `typecheck`, `test`, `build`, `test:e2e`, `test:db` and `eval` are n/a because the repository is not scaffolded until #83.

## Risks & rollback

- **Risk: the IA pre-empts a design decision.** Mitigated by the "does not decide" section and A6. A design task may depart from the map if it updates this file.
- **Risk: routes drift from what the build tasks create.** They are marked proposed, and the build task updates the table.
- **Rollback:** revert the commit.

## Outcome

<!-- Filled after execution. -->
