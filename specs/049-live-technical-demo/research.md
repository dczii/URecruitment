# Research and findings

- Decision: use server-returned daysUsed. Evidence: list.ts calculates on initial read; Placements.tsx recomputes from UTC and rounds after save. A browser clock can disagree with the server. Alternative rejected: duplicate shared calls on browser/server, which still permit clock disagreement.
- Finding F-001: list.ts passes ISO month numbers directly to Date.UTC. January 31 to February 1 yields -2 before clamping rather than 1. Reproduce through listPlacements in tests before editing.
- Finding F-002: server count is uncapped while client caps to period. User approved a capped display on 2026-10-05; see spec clarifications.
- Finding F-003: existing placement e2e covers heading/overflow only and skips phone. Local auth provider needs opt-in placement fixtures and persistent write semantics.
- Decision: no new product evidence route. Markdown and generated report are sufficient for the technical walkthrough.
- Decision: preserve before screenshots from the real pre-fix app, not an emulated UI or image edit. Baseline formulas are copied into a labeled evidence module for repeatable analysis after the app is fixed.
- Limitation: no claim of actual Copilot execution, manual presenter timing, remote CI or database verification. Real browser captures exercise Next.js and Server Actions against a local fictional provider.
