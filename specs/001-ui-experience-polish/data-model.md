# Data and state model

No database entities, migrations, policies or API contracts change.

| Concept | Existing source | UI state/constraint |
| --- | --- | --- |
| Dashboard attention row | `DashboardData` in `src/server/dashboard/data.ts` | Render existing IDs, names, job/client, stage, status, waiting party and working-day values; preserve ordering |
| Selection | `SelectableEntry` in `SelectionBar.tsx` | Map keyed by pipelineEntryId; initially empty; keep only visible IDs after filter/results change; clear after existing successful action |
| Filter scope | Existing URLSearchParams / search input | Preserve current parameter semantics and browser history; reset only the current screen's filter keys |
| Recruiter identity | `src/lib/recruiter-name.ts` | Unset → typed-name dialog → validated remembered name; storage failure handled; no invented default or sign-in claim |
| Mutation outcome | Existing discriminated Server Action results | Idle → pending → actual success/partial result/error; pending disables duplicate submission; no optimistic stage change |
| Input modality | New shared UI-only helper if needed | Keyboard/default → instant motion; pointer → allowed transitions; Escape inherits keyboard instant close; reduced-motion overrides transform |
| Job/candidate/placement | Existing component props | Desktop table/detail and phone card show equivalent information; use existing private CV action |

Zod validation, reason gates, stage audit and Singapore working-day rules retain existing server ownership. Input modality is never persisted. No candidate data is stored in browser storage by this feature.
