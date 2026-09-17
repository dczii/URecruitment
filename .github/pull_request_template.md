## Summary

<!-- What changed and why, in 2–5 bullets. -->

Closes #

## Task docs

- Spec: `docs/tasks/<issue>-<slug>/spec.md`
- Plan: `docs/tasks/<issue>-<slug>/plan.md`

## Acceptance criteria

| AC | Proved by | Result |
|---|---|---|
| AC1 | `…` | ✅ |

## Verification

```
npm run lint        →
npm run typecheck   →
npm test            →
npm run build       →
npm run test:e2e    →  (n/a if no screen changed)
npm run test:db     →  (n/a if no DB change)
npm run eval        →  (n/a if no AI change; paste EN / ZH results otherwise)
```

## Guardrails

- [ ] AI only suggests; nothing auto-rejects/advances/contacts
- [ ] No email sent
- [ ] Server-only data access; no secrets in client code or the repo
- [ ] New tables/views: RLS + revoke; Storage private
- [ ] AI output schema-validated, logged to `ai_runs`, shows source text
- [ ] Protected attributes excluded from scoring
- [ ] Works at phone width; status not colour-only (if UI)
- [ ] Fictional data only

## Review

<!-- pr-review verdict + blocker/major findings and how they were resolved. -->

## Execution notes

<!-- Executor model, fix rounds, escalations, direct Claude fixes, deviations from the plan. -->

## Follow-ups

<!-- Minor findings or new issues created. -->
