<!--
Executor prompt template for cursor-agent (Cursor Grok 4.6 or GPT-5.6).
Fill every {{…}}, delete the comments, and save to .orchestrator/<issue>-<slug>/<step-id>.prompt.md.
Cursor executors cannot load Claude skills: inline the binding rules and don't just name them.
-->

You are implementing ONE step of task #{{ISSUE}} in the URecruitment repo (Next.js + Supabase, npm).

## Required reading (read these files first)

- `AGENTS.md`
- `docs/tasks/{{ISSUE}}-{{SLUG}}/spec.md`
- `docs/tasks/{{ISSUE}}-{{SLUG}}/plan.md`, step **{{STEP_ID}}**
{{SKILL_FILES}}   <!-- e.g. - `.claude/skills/supabase-db/SKILL.md` -->

## Goal of the task

{{TASK_GOAL}}   <!-- one or two sentences from the spec Problem -->

## Your step: {{STEP_ID}}

{{STEP_TEXT}}   <!-- copied from plan.md, expanded with exact changes -->

Acceptance criteria this step covers:
{{ACCEPTANCE_CRITERIA}}

## Files

You may create or modify:
{{ALLOWED_FILES}}

Do NOT touch:
- `docs/tasks/**`, `.claude/**`, `.github/**`, `AGENTS.md`, `CLAUDE.md`
{{FORBIDDEN_FILES}}

## Rules you must follow (from the project skills)

{{INLINED_RULES}}
<!-- 3–6 rules, quoted, each tagged with its source, e.g.
1. [supabase-db] Every new table: `alter table … enable row level security;` and NO policies granting anon/authenticated access.
2. [ai-pipeline] Validate model output with the Zod schema and write an ai_runs row before returning.
-->

Always:
- Do not run git commit/push or change branches.
- Do not add npm dependencies other than: {{ALLOWED_DEPS}}   <!-- or "none" -->
- Do not call remote Supabase, Vercel or GitHub.
- Do not delete, skip or weaken tests.

## Verification (run before reporting)

{{VERIFY_COMMANDS}}
<!-- For a failing-test step: say which tests must FAIL and why. -->

## Report

End with the "Changed files / Verification / Deviations from the plan / Open questions" sections from AGENTS.md.
