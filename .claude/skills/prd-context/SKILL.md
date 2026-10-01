---
name: prd-context
description: >
  HRManagement product knowledge from the PRD (17 Sep 2026, docs/URecruitment-PRD.pdf): capabilities,
  what is decided vs proposed vs open, non-goals, pipeline stages and delay rules (SG working days,
  limit hierarchy, due-soon 80%, 30-day guarantee), data model, screens, release plan and sample
  data. Load before writing or planning any spec, and for any product question ("what stages…",
  "is X in the MVP…").
---

# PRD context

Source: `docs/URecruitment-PRD.pdf`, condensed in `references/`. Read `project-map` for where the other documents sit.

**Scope override.** `CLAUDE.md` removes product AI from the MVP (CV/JD parsing, match scores, embeddings, NL search, AI gap flags). The references still describe the PRD's AI target, so read each AI item as "what the recruiter would otherwise enter by hand". Recruiters type job and candidate fields. Keyword + filter search and deterministic missing-field flags stay.

Every PRD item is **decided** (build as written), **proposed** (build, label `prd:proposed`, say so in the spec) or **open** (never settle silently; label `needs-decision`, and list it in `docs/decisions/open-questions.md`).

| Reference                                                    | Covers                                                          |
| ------------------------------------------------------------ | --------------------------------------------------------------- |
| [references/requirements.md](references/requirements.md)     | Every capability's requirements with status                     |
| [references/pipeline-rules.md](references/pipeline-rules.md) | Stages, end states, working days, limits, delay status, placements |
| [references/data-model.md](references/data-model.md)         | The 17 tables and main flows                                    |
| [references/screens.md](references/screens.md)               | MVP screens and design rules                                    |
| [references/sample-data.md](references/sample-data.md)       | Public Vercel Blob sample store, env vars, seed flow            |

## MVP at a glance (decided)

- **Users:** recruiters only, **no sign-in**; actions carry a typed name.
- **Data:** fictional only (200 CVs, ~20 Simplified Chinese; 20 jobs). Blob store is the seed source; the app stores originals in private Supabase Storage.
- **Deadline:** live mid-December 2026, then feedback sessions and a go/no-go on real data.
- **Hosting:** Vercel (`sin1`) + Supabase (`ap-southeast-1`), free tiers. **Email:** none, ever. **Backups:** none in MVP.
- **Speed:** search results < 3 s. **Devices:** desktop and phone browsers.

## Non-goals (don't build)

Real candidate data or upload; any email; backups; duplicate detection (resubmissions in the sample set are separate candidates); client sharing or other logins; external talent sources; Manatal migration; anything that rejects, advances or contacts candidates on its own; OCR (reject scanned CVs with a clear message); Teams/WhatsApp alerts.

## Open questions (don't settle)

Pre-conditions for real CVs (sign-in, consent, retention, legal review); paid plans; backup policy; duplicate-candidate rule; real-data release date; success-metric targets. Dev-owned setup: AI provider (ADR-0003, open), intake mailbox, OneDrive folders, legacy `.doc` conversion. Full register: `docs/decisions/open-questions.md`.

## Guardrails every spec inherits

1. Recruiters make every decision. Nothing is auto-rejected, advanced, shortlisted or sent.
2. Name, photo, age, gender, race, religion, marital status are never used to rank. Nationality and language count only as a marked requirement with a written reason.
3. Server is the only gate: secret key server-only, RLS with no public policies, private bucket, signed URLs.
4. Store UTC, show Singapore time, count SG working days.
5. Settings and stage changes log the typed recruiter name.
