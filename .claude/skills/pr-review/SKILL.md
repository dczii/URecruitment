---
name: pr-review
description: >
  Claude's review gate for URecruitment changes (usually written by Grok via cursor-agent): checks
  the diff against the task's spec.md acceptance criteria and plan.md scope, PRD guardrails, the
  rules of every skill in scope, test quality, migrations, UI fidelity at desktop/phone width and
  git/PR conventions. Use for `/review [PR# | branch]`, in urec-orchestrator Step 8, or whenever asked
  to review a branch or PR in this repo.
---

# PR review

**Posture:** the author is an executor model. **Don't trust its report.** Verify against the files and by running the checks. Every finding **quotes the rule** it applies. "Looks fine" is not a review.

**Model:** run this as an **Opus or Fable** subagent when the diff touches security, data, AI scoring or migrations. Optionally, add a second, uncorrelated lens: `cursor-agent -p "<review prompt>" --mode ask --model cursor-grok-4.6-high` (read-only). Its findings are input for you to verify, not verdicts.

## Inputs

| Target | Diff | Context |
|---|---|---|
| Current branch | `git diff origin/main...HEAD` | `docs/tasks/<issue>-<slug>/` from the branch name |
| `#N` (PR) | `gh pr diff N` and `gh pr view N --json title,body,headRefName,files,statusCheckRollup` | Spec and plan linked in the PR body |

If no spec or plan exists, review against the issue body and the PRD, and flag the missing docs as a `major` finding.

## Procedure

1. **Load context:**
   - the spec, plan and issue;
   - `prd-context`;
   - every skill listed in the plan's "Skills in scope";
   - `security-check` and `compliance-review` if their scope is touched.
2. **Scope:** do the changed files match the plan's Files table? Flag unplanned files, changes under `docs/tasks`/`.claude`/`.github` that the plan didn't call for, new dependencies not in the plan, and deleted or skipped tests.
3. **Acceptance criteria:** for each AC:
   - is there a test that actually proves it (not just touches it)?
   - does it pass?
   - Build a table: AC → test → ✅/❌.
4. **Guardrails:** walk the spec's guardrail checklist, plus the hard rules in `CLAUDE.md`.
5. **Skill rules:** check the diff against each in-scope skill's rules, and quote the rule in each finding.
6. **Run verification yourself:** `npm run lint`, `typecheck`, `test`, plus `build`, `test:e2e`, `test:db` and `eval` as relevant. Paste the results.
7. **Migrations:**
   - new migration file only (merged ones untouched);
   - RLS and revoke in the same migration;
   - `supabase db reset` passes;
   - types regenerated;
   - destructive operations called out.
8. **UI** (if screens changed): run the app. Using the built-in browser, screenshot desktop (1440) and phone (390). Compare with `design/specs` and `exports`. Check that badges have words, AI suggestion labels are present, there's no horizontal overflow, and Chinese renders.
9. **Code quality:**
   - naming and structure follow `nextjs-app`;
   - no dead code;
   - no `any` without a reason;
   - errors handled;
   - no business logic in components;
   - no duplicated helpers.
10. **Conventions:**
    - branch name;
    - Conventional Commit messages;
    - the PR body has `Closes #N`, spec/plan links and verification output;
    - the plan's Outcome is filled in.

## Severity

- **blocker:**
  - breaks a decided PRD rule or a hard rule in `CLAUDE.md`;
  - security exposure;
  - an AC that isn't met or isn't proven;
  - failing checks;
  - weakened tests.
- **major:**
  - breaks a skill rule or a proposed PRD rule;
  - missing edge-case tests;
  - scope creep;
  - missing docs.
- **minor:** readability, naming, copy, small refactors.
- **nit:** optional.

## Output

```
## Review — <PR #/branch> (task #<issue>)
Verdict: approve | changes required
Checks: lint ✅ · typecheck ✅ · test ✅ · build ✅ · e2e n/a · eval n/a

### Acceptance criteria
| AC | Test | Result |

### Findings
| # | Severity | File:line | Rule (quoted, with skill) | Finding | Suggested fix |
```

- **Inside urec-orchestrator:** blockers and majors go back to the fix loop. Minors and nits go in the PR's "Follow-ups" section.
- **Standalone `/review`:** print the review. **Post it to the PR only when asked** (`/review 42 --comment` → `gh pr comment 42 --body-file <file>`). Never approve or merge on GitHub.
