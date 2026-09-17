# MVP screens

The screens are designed in **pen.dev** (decided). The PRD records the screen list, and the designs come later. Everything must work in **desktop and mobile browsers**.

| Screen | Purpose | Key elements |
|---|---|---|
| Dashboard | See what needs attention today | Overdue and due-soon candidates, guarantee end dates; filters for client, job, stage and owner |
| Jobs | Browse all jobs | Status, owner, open gap flags, candidates per stage |
| Job detail | Work one job | Requirements, gap-flag checklist with questions for the client, ranked matches with scores and reasons, pipeline board |
| Job form | Create or edit a job | Must-have and nice-to-have requirements, JD upload, reason field for nationality or language |
| Candidate search | Find people | Plain-language search box, filters, results with CV date |
| Candidate profile | Check one person | Parsed fields with source text, edit mode, original file, stage history |
| Pipeline board | Move candidates through stages | One column per stage, On track / Due soon / Overdue, typed-name prompt on each move |
| Placements | Follow up after Placed | Start date check, 30-day guarantee countdown |
| Settings | Adjust rules | Stage limits by default, client and job; public holidays; change log |

Not listed in the PRD but implied by the requirements. Confirm before designing:
- A **review queue** for CVs that failed to parse (CV processing, requirement 2).
- A **name prompt** before a recruiter's first change on a device.

## Design rules (suggested)

1. Every AI result is **labelled as a suggestion** and shows the text it came from.
2. Delay status uses a **word or icon as well as colour**, never colour alone.
3. The type stack includes a font with Simplified Chinese characters (e.g. **Noto Sans SC**).
4. The **dashboard and pipeline board are fully usable at phone width**.
5. Before a recruiter's first change on a device, the portal **asks for their name**.

## Design workflow (suggested)

- `.pen` files live in `design/` in the repo, so designs and code are reviewed together.
- Designers work on the pen.dev canvas. Coding agents read and update the same files through pen.dev's MCP connection.
- Colours, type and spacing are defined **once as design tokens** and mapped to the Tailwind theme.
- pen.dev's HTML/Tailwind export is only a starting point. Screens are built from shared shadcn/ui components.
