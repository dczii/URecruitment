---
name: urecruitment-recruiter-access
description: Provision or check URecruitment recruiter access for user-supplied email addresses in Supabase Auth and the private recruiter_access table. Use for requests to add approved recruiters or verify their portal access, not candidate accounts or general Supabase administration.
---

# URecruitment recruiter access

Read [the recruiter access guide](../../../docs/runbooks/recruiter-access.md) in this repository before acting. Resolve this path relative to the skill directory; if unavailable, stop and report the missing context. Read the current repository instructions and auth approval schema when needed to confirm the workflow.

Treat an email access request as an operational task: inspect the specified project's Auth users and `public.recruiter_access`, reuse existing Auth accounts, and grant individual active approval with the matching UUID/email. Auth account creation alone is insufficient. Follow the guide's procedure for missing accounts, inactive approvals, conflicting identities, timestamp defaults, and verification.

Use a supported Supabase connector/admin tool when available or the authenticated dashboard through computer-use tools. Derive UI actions from current page state. Confirm the project, recipient list, and required authorization before remote mutations; browser access grants require confirmation at action time. The skill and past approvals do not authorize future grants. Do not invite users, send login codes, set passwords, widen public policies, or change signup/SMTP settings as part of approval.

Keep real account details out of public source files, seeds, tests, and migrations. No code changes or deployment are needed for routine provisioning. Verify saved matching active rows and report each recipient's outcome, including unresolved blockers. For browser mutations, save and embed a screenshot of the verified result. Distinguish approval verification from an actual OTP delivery or login test.
