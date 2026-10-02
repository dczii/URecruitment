# Requirements quality checklist

Planning review, 2026-10-02. Checked items describe document quality, not implemented behavior.

- [x] CHK001 Scope lists existing screens and excludes new product capabilities.
- [x] CHK002 Requirements define observable behavior and measurable widths/contrast/targets.
- [x] CHK003 User stories have independently testable acceptance scenarios.
- [x] CHK004 Dashboard column mismatch is evidenced in source and live UI.
- [x] CHK005 Phone information/action parity, zoom and EN/ZH are specified.
- [x] CHK006 Pending, empty, error, success and invalid-field recovery are defined.
- [x] CHK007 Pointer, keyboard, touch and reduced-motion contracts are separate.
- [x] CHK008 Recruiter name, private data and decision safeguards are preserved.
- [x] CHK009 Existing proposed/open product classifications are preserved.
- [x] CHK010 Task scope and validation map to all FR identifiers.
- [ ] CHK011 Link the Story issue before implementation; no issue invented.
- [ ] CHK012 Claude approves the specification, plan and executor task scope.
- [ ] CHK013 Measured desktop/phone visual baselines captured before implementation.

## Implementation verification

- [x] Supplied logo and named navigation reviewed at measured desktop/phone widths.
- [x] Actual device identity and focus restoration pass component/browser regressions.
- [x] Six dashboard columns align; empty selection area is absent; filtering removes stale IDs.
- [x] Existing itemized protected-requirement errors and written-reason checks remain intact.
- [x] Invalid job and failed placement saves focus the relevant input without losing entries.
- [x] EN/ZH and six routes at 200% text pass both browser projects.
- [x] Keyboard/reduced-motion overlay checks pass; normal pointer overlays use ≤220ms.
- [x] Lint/typecheck/334 unit tests/build pass; build reports no client leaks.
- [ ] Seeded writable-local-database E2E gate: read-only full run has 39 pass/7 fail/30 existing skips. See quickstart and ignored log.
- [ ] Full contrast, candidate-profile/CV, virtual-keyboard and all-control target audit.
- [ ] Story linkage, Claude review and explicit Git override for draft PR publication.
