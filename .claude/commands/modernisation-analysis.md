---
description: Code analysis, improvement recommendations and a UI refresh of the existing pages for the recruitment system
---

# Role

You are a senior software engineer reviewing this recruitment-system codebase with our team. The work has three phases:

1. **Understand the codebase** – what it is and how it is built.
2. **Recommend improvements** – architecture, code quality, security, performance and anything else worth fixing.
3. **Modernise the look of the existing web pages** – without changing what they do.

Keep it practical. Report what matters and skip the trivial. Use plain language and short tables, with no filler.

Start by creating a task list for the three phases, then begin Phase 1.

---

# Ground rules

1. **Base findings on the code**, not on README files or comments. Cite `path/to/file:line` for every finding.
2. **Don't guess.** If something can't be determined from the code, say so.
3. **Phases 1 and 2 are read-only.** Do not change any code.
4. **Phase 3 changes the look only** (see the Phase 3 rules), on a new git branch.
5. **Protect sensitive data.** Never copy secrets, passwords, API keys or real personal data (candidate names, emails, phone numbers, NRIC/FIN, CV content) into any file. Write `[REDACTED]` with the file location instead.
6. **Ask first** before installing packages, running migrations, or doing anything that touches a database or the network.
7. **Stop at each ⏸ CHECKPOINT** and wait for my reply.
8. **All reports go in `analysis/`** at the root of the codebase. Create the folder if it doesn't exist:

   ```
   analysis/
   ├── 00-summary.md
   ├── 01-codebase-overview.md
   ├── 02-improvement-recommendations.md
   ├── 03-ui-modernisation-spec.md
   ├── 04-ui-modernisation-report.md
   └── screenshots/
       ├── before/
       └── after/
   ```

---

# Phase 1 — Codebase overview → `analysis/01-codebase-overview.md`

- **Tech stack:** languages, frameworks and versions, database, and front-end approach (server-rendered templates or SPA, and any CSS framework).
- **Folder structure:** what each main folder is for.
- **Architecture:** a simple Mermaid diagram of the main components and how a request flows (browser → routes → controllers → services → database), plus external services (email, file storage, authentication).
- **Main features:** e.g. jobs, applications, candidates, interviews, users and roles.
- **Page inventory:** a table of every existing web page, with columns `Route / URL | Template or component file | Purpose | Used by (candidate / recruiter / admin)`. This table is the fixed scope for Phase 3.
- **Current setup:** tests, build and deployment.

---

# Phase 2 — Improvement recommendations → `analysis/02-improvement-recommendations.md`

Identify what can be improved. Only include areas where you find a real issue:

- **Architecture and structure:** business logic in controllers or views, tight coupling, duplicated code, missing layers
- **Code quality:** oversized files or functions, inconsistent patterns, dead code
- **Security:** input validation, access control, CV file-upload handling, secrets in code
- **Performance:** N+1 queries, missing indexes, unnecessary work per request
- **Dependencies:** outdated or unsupported frameworks and libraries
- **Testing and workflow:** missing tests, no CI, no linting
- **Front end:** dated styling, poor mobile support, accessibility gaps (this feeds Phase 3)

Record each issue in one table:
`# | Area | Issue | Where (file:line) | Why it matters | Recommendation | Priority (High / Med / Low) | Effort (S / M / L)`

Finish with:

- **Top 5 quick wins.**
- **Suggested architecture direction:** a few sentences, plus an optional simple target diagram. Keep it realistic for this codebase. Don't propose a rewrite unless it is clearly justified.

⏸ **CHECKPOINT 1** — Summarise the top findings in no more than 10 lines. Wait for my go-ahead before starting Phase 3.

---

# Phase 3 — Modernise the look of the existing pages

**Goal:** give the current pages a clean, modern, consistent look without changing what they do.

**Scope rules**

- **Existing pages only:** the page inventory from Phase 1. Don't add pages, features or routes, and don't remove any pages.
- **Change presentation only:** layout, typography, colours, spacing, buttons, forms, tables, cards, navigation, icons and responsiveness.
- **Do not change:** routes or URLs, form field names and IDs, JavaScript hooks, validation, backend logic, the database, or page text. If you spot a typo, list it in the report instead of fixing it.
- **Use the existing front-end stack.** If a new library (e.g. a CSS framework) would help significantly, propose it at Checkpoint 2 instead of adding it.
- **Style through shared files:** a shared stylesheet with CSS variables and shared layouts or partials, rather than one-off styles on each page.
- **Work on a new git branch, `ui-modernisation`.** Commit in small steps: shared styles first, then page by page.

**Step 1 — UI spec → `analysis/03-ui-modernisation-spec.md`**

- **Design direction:** colour palette (contrast must meet WCAG AA), typography, spacing scale, corner radius, shadows, and styles for buttons, inputs, tables, cards, alerts and navigation.
- **Per-page plan:** for each page in the inventory, what will change, plus a **"must stay the same" checklist** (fields, buttons, links, behaviour).
- **Before screenshots:** if the app runs locally and a headless browser is available, capture each page at desktop (1440 px) and mobile (390 px) widths into `analysis/screenshots/before/`. If that isn't possible, say so.

⏸ **CHECKPOINT 2** — Show me the design direction and the page plan. Wait for my approval before editing any file.

**Step 2 — Implement** the approved spec: shared styles first, then page by page.

**Step 3 — Verify**

- Run the existing tests before and after the changes.
- Check that every page in the inventory still loads, and that its forms, buttons and links still work.
- Tick off each page's "must stay the same" checklist.
- Check desktop and mobile layouts, keyboard focus states and colour contrast.
- Capture after screenshots into `analysis/screenshots/after/`, using the same file names as the before shots.

**Step 4 — Report → `analysis/04-ui-modernisation-report.md`**

- **Per page:** files changed, what changed, links to the before and after screenshots, and the checklist result (pass or fail).
- **Tests:** results before and after.
- **Open items:** anything not done or needing a human decision, and any typos you noticed.

---

# Summary → `analysis/00-summary.md`

Keep it to one page:

- What the system is, with a one-line health rating per area.
- The top recommendations from Phase 2.
- The UI modernisation result: pages updated, branch name, verification result.
- **How AI was used:**
  - what the AI did in each phase
  - its inputs and outputs
  - what a person decided or reviewed (the checkpoints, the design approval, the final review of the branch)
  - the checks used (file citations, tests, before/after screenshots, per-page checklists)

Finally, print in the terminal:

- the files created
- the number of pages modernised
- the test results
- the top 3 things a person should review first
