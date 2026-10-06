# UI state model

No database entities, migrations, server payload changes or persistence are introduced.

| State | Source | Rules |
| --- | --- | --- |
| Option | Existing server-supplied props | String value, string label, optional disabled; stable value identity, no sorting change |
| Dashboard selection | client/job/stage/owner URL parameters | Empty string is the real All option; preserve unknown values visibly until recruiter clears or changes |
| Job selection | Existing clientId React state | Empty string means absent; nonempty value is the exact client ID; duplicate names retain distinct IDs |
| Open/highlight | Base UI ephemeral state | Highlight never commits; Escape dismisses without changing value |
| Disabled/error | Existing JobForm pending/clients/errors | Forward disabled and ARIA associations; preserve text and focus recovery |

Opening shows the current option; choosing commits once, closes and restores trigger focus. Escape cancels; Tab closes and moves normally. No default client or automatic replacement for stale URL values.
