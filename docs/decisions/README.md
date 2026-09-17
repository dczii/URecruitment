# Decision records

These records hold the technical agreements the URecruitment backlog builds on. The product source
of truth is the **PRD dated 17 Sep 2026** (`docs/URecruitment-PRD.pdf`, condensed in the
`prd-context` skill). A decision record exists where the PRD *suggests* a shape and the team has to
commit to one, or where the PRD leaves a question **open** and later tasks still need something
stable to build against.

Cite these records from issues, specs and code comments instead of re-reading the PDF.

## Index

| # | Record | Status | Covers |
|---|---|---|---|
| 0001 | [Application, data and AI boundaries](adr-0001-architecture.md) | Accepted | Where code runs, the trust boundary, the five main flows, every layer choice and whether it may be revisited |
| 0002 | [The seventeen-table data model and its invariants](adr-0002-data-model.md) | Accepted | Each table's purpose, MVP standing and owning migration; the four invariants no task may break |
| 0003 | [AI provider decision brief and provider-agnostic contract](adr-0003-ai-provider.md) | **Open** | The criteria, the contract every AI call must satisfy, and what unblocks the choice |

Alongside the records:

| Register | Covers |
|---|---|
| [Open questions and decision log](open-questions.md) | Every item not yet decided (the six PRD open questions, the repo-level MVP confirmations and the dev-team setup choices), each with its owner slot, deciding issue and blocked tasks, plus the append-only log of answers. **Edited in place**, unlike an ADR |

## Status vocabulary

A record's own status says whether the team has committed:

| Status | Meaning |
|---|---|
| **Accepted** | The team has committed. Build to it. Changing it needs a new record that supersedes this one. |
| **Open** | The decision has not been made. The record exists to hold the question open with a contract, an owner and an unblocking condition. Nothing may silently settle it. |
| **Superseded by ADR-NNNN** | Kept for history. Read the successor. |

Inside a record, each individual claim also carries the **PRD** status of the item it comes from,
because that is what tells a later task whether it may push back:

| PRD status | Meaning for a later task |
|---|---|
| **decided** | Build it as written. Do not revisit without the product owner. |
| **proposed** | Build it as written, but you may revisit it with a reason. Say so in the spec, and label the issue `prd:proposed`. |
| **open** | Never settle it silently. Label the issue `needs-decision`. |

The PRD's own headings sometimes say **"suggested"** — for example *"Data model (suggested)"* and
*"Security (suggested)"*. That is the PRD's word for what this vocabulary calls **proposed**, and the
records use it only inside a verbatim PRD quote. Everywhere else, use one of the three words above.

**A proposed item can still be non-negotiable here.** Where `CLAUDE.md` makes something a hard rule,
that hard rule governs whatever status the PRD gave it. The security boundary is the case that
matters: the PRD lists it under *"Security (suggested)"*, and `CLAUDE.md` hard rules 1–9 make it
binding. `proposed` describes how firmly the **PRD** stated it, never how free a task is to ignore a
hard rule.

An **Accepted** record can still contain **proposed** items: the team has committed to building
that way now, and the PRD status records how much freedom a later task has to argue.

## Shape of a record

Every record uses the same five sections, so any of them can be skimmed the same way:

1. **Status** — the table above, plus the date and the issue that created it.
2. **Context** — what forced the decision, in terms a recruiter sponsor would recognise.
3. **Decision** — numbered, each carrying the PRD item and its status.
4. **Consequences** — what this makes easy, what it makes hard, and what it obliges every later task to do.
5. **Rejected alternatives** — what was considered and why it lost.

## Adding or changing a record

- New record: the next free number, `adr-NNNN-<kebab-slug>.md`, added to the index above.
- **Never rewrite an accepted record to mean something else.** Write a new one, set the old one to
  `Superseded by ADR-NNNN`, and link both ways. The history is the point.
- Correcting a typo, a broken link or a stale task number in place is fine.
- A record that settles an **open** PRD question needs the product owner, not just a PR.
