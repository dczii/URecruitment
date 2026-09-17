---
name: ui-design
description: >
  Designing URecruitment screens in pen.dev: .pen files in design/, operated only through the
  pencil MCP tools; design tokens (colour, type with Noto Sans SC, spacing) defined from scratch;
  desktop + phone frames; the PRD design rules (AI suggestion labels with source text, delay status
  never colour-only, typed-name prompt); and readable token/spec mirrors so Grok can build from
  them. Use for any design task, new screen, token change or design review. Design steps are
  executed by Claude, never delegated to cursor-agent.
---

# UI design (pen.dev)

## Tooling

- **Access `.pen` files only through the pencil MCP.** They are encrypted, so **never** `Read`, `Grep` or `cat` them. Tools: `mcp__pencil__get_app_state`, `mcp__pencil__read_skill`, `mcp__pencil__get_style`, `mcp__pencil__execute`.
- **Before the first design action in a session:**
  1. Open the target file in the pen.dev app. The tools fail with "A file needs to be open" otherwise.
  2. Call `get_app_state`.
  3. Call `read_skill()` and follow the pen.dev skill's instructions and its `execute` guide.
- **Design steps have the `claude` executor.** Grok has no pen.dev access.

## Files (proposed; confirm in E02-S01)

```
design/
  tokens.pen              # tokens + component patterns
  screens/<screen>.pen    # one file per screen group (desktop + phone frames)
  tokens.md               # readable mirror of every token (name → value → usage)
  specs/<screen>.md       # readable spec per screen: layout, components, states, copy
  exports/<screen>-<frame>.png   # if pen.dev can export images; used by Grok and in PR reviews
```

**Grok can't open `.pen` files.** Every design task must update `tokens.md` and `specs/<screen>.md` in the same PR, or ui-build can't implement it faithfully.

## Starting point: no brand yet

Define the tokens from scratch. Keep them **semantic**, so the theme can change later without touching components.

| Group | Tokens (minimum) |
|---|---|
| Colour | `background`, `foreground`, `muted`, `card`, `border`, `primary`, `primary-foreground`, `accent`, `destructive`, `ring` (these map 1:1 to shadcn CSS variables) |
| Status | `status-on-track`, `status-due-soon`, `status-overdue`, `status-ended` (each with a paired icon and label) |
| AI | `ai-suggestion-bg`, `ai-suggestion-border`, `source-quote-bg` |
| Type | Latin family + **Noto Sans SC** fallback; scale for display/title/body/caption; tabular numerals for scores and day counts |
| Space / radius / shadow | A 4 px based scale; radius sm/md/lg |

- **Contrast:** text ≥ **4.5:1**, large text and UI glyphs ≥ **3:1**.
- **Themes:** light first. Add dark only if the design task asks for it.

## Frames

- **Desktop:** 1440 wide. Content max-width ~1280.
- **Phone:** 390 wide. **The dashboard and pipeline board must be fully usable here** (PRD rule 4). On a phone the board becomes stage tabs or horizontally scrolling columns. Show which in the spec.
- **Every screen shows its states:** default, empty, loading, error, and a long-content case (long Chinese names, 20+ skills, a long employer history).

## PRD design rules (must be visible in every relevant frame)

1. **AI results are labelled "AI suggestion"** and show the text they came from: an expandable `SourceQuote` with the CV/JD excerpt.
2. **Delay status = word or icon + colour**, never colour alone: "On track", "Due soon", "Overdue · 3 days".
3. **Chinese text renders** with Noto Sans SC. Include a ZH candidate in the mocks.
4. **The dashboard and pipeline board work at phone width.**
5. **A typed-name prompt** appears before a recruiter's first change on a device, and on each stage move it shows the remembered name with a "not you?" option.

Product cues to reflect:
- Scores show the **model version and date**.
- The job page shows a **banner with the open gap-flag count**, and matching stays usable.
- Nationality/language requirements show their **written reason**.
- **Nothing looks like an automatic decision.** No "Rejected by AI" style states.

## Screen list

`prd-context` → `references/screens.md` has 9 screens, plus the implied review queue and name prompt. Confirm the implied ones before designing them.

## Output of a design task

- Updated `.pen` file(s): desktop and phone frames, all states.
- `design/tokens.md` and `design/specs/<screen>.md` updated. Exports added if available.
- In the PR description, a list of the new or changed tokens and components, so ui-build knows what to add.
