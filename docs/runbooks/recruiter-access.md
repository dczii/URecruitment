# Grant recruiter access by email

Use this guide when the user asks to grant URecruitment access to specific recruiter email addresses. Access requires both an existing Supabase Auth account and an active row in `public.recruiter_access`. Creating an Auth account alone does not grant portal access.

## Scope and authorization

Confirm the intended Supabase project from the user's dashboard or trusted configuration. Never infer a production target from a remembered project ID. Repository rules prohibit remote operations by default; obtain explicit authorization for the requested remote work when needed. Browser permission changes require confirmation immediately before granting access. A skill does not grant authorization, and approval from an earlier completed request does not authorize new recipients.

Keep supplied addresses and Auth UUIDs in the private operational context. This public repository must not contain real account lists, credentials, OTPs, session tokens, or environment values. Examples below are fictional. Grant only individual recruiter access; do not approve an entire email domain or change RLS, public signup, SMTP, or other security settings.

## Procedure

1. Normalize each supplied address by trimming whitespace and lowercasing it. Deduplicate the list. Resolve invalid or ambiguous addresses before writing.
2. In the confirmed project, open **Authentication → Users**. Search each exact email and record its actual Auth UUID. Reuse existing accounts; do not recreate them, reset credentials, or send invitations.
3. If an account is missing, use the provider's non-inviting admin `createUser` operation with `email_confirm: true`, through an authorized supported tool. Never use invite-by-email. If the dashboard requires a new password, hand credential entry to the user under the browser policy; do not invent or enter a password. If non-inviting creation is unavailable, ask the user to create the account and then recheck it.
4. Open **Table Editor → public → recruiter_access** and inspect existing rows for the email and UUID. If the exact pair is already active, report it as already approved. If email and UUID point to conflicting rows, stop and report the conflict rather than replacing another identity's approval.
5. After the required confirmation, insert a missing approval with the matching Auth `user_id`, normalized `email`, and `active = TRUE`. Leave `created_at` and `updated_at` unset on insertion so their `now()` defaults apply. For an existing matching inactive row, set `active = TRUE` and `updated_at` to the current UTC timestamp. Do not reset `created_at`.
6. Re-read the saved table. Verify every requested email has its matching Auth UUID and `active = TRUE`. With multiple inserts, the dashboard's **Create more** option can reuse the form; wait for each successful save before entering the next account.
7. Report which accounts were added, reactivated, or already active. For browser changes, save a screenshot of the verified rows and embed it in the response. Do not claim OTP delivery or successful login unless separately tested with explicit authorization. Provisioning sends no email; recruiters request their own login codes.

## What the application checks

`src/server/auth/access.ts` checks active approval by email before sending a login code, and by both verified Auth UUID and normalized email for workspace access. Approval is rechecked on privileged requests. A generic login acknowledgement does not prove the email is approved.

The schema is defined in `supabase/migrations/20261002000001_recruiter_access.sql`: `user_id` references `auth.users(id)`, email is unique and normalized, and timestamps use UTC. RLS and revoked public privileges stay unchanged. No application code, migration, seed, or deployment is needed for routine account approval.

## Troubleshooting and revocation

- Auth account exists but login code is not sent: first check the matching active approval, then application/provider configuration and rate limits. Do not automatically send test emails or change provider settings.
- Save fails: inspect the error and re-read the table before retrying; a successful write may have occurred. Stop on unresolved UUID/email conflicts or missing schema rather than changing schema as part of access provisioning.
- For explicitly requested revocation, set the matching row's `active = FALSE` and update `updated_at` in UTC. Do not delete the Auth account. Email changes require an explicitly reviewed update to the matching approval.

## Example request

“Grant recruiter access to recruiter.one@example.com and recruiter.two@example.com.” Verify their Auth identities first, then approve exactly those identities after the required authorization.

## References

- [Auth setup and operator procedure](../../specs/047-recruiter-email-otp/quickstart.md)
- [Recruiter authentication decision](../decisions/adr-0004-recruiter-auth.md)
- [Approval checks](../../src/server/auth/access.ts)
- [Approval table migration](../../supabase/migrations/20261002000001_recruiter_access.sql)
