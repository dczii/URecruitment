# Feature Specification: Approved recruiter email OTP

Created: 2026-10-02. Status: approved for local implementation by the user. Story: not created; remote GitHub work is prohibited. No branch changes.

## User Scenarios & Testing

### US1 — Approved recruiter signs in (P1)
AC1: Given an active approved email, requesting a code sends a Supabase-generated OTP through configured Resend SMTP; signup is never automatic.
AC2: Given the code entry screen, a valid unused code creates an HttpOnly session and redirects to the dashboard. Invalid, expired or reused codes show a safe error. Leading zeros survive.
AC3: Given an unapproved email or identity, no email is sent and no portal access is granted. Request acknowledgement does not disclose approval.

### US2 — Private workspace and session lifecycle (P1)
AC4: Without a verified approved identity, pages, server reads/writes and Storage signed URLs cannot expose data. Cookie contents alone grant nothing. Membership removal blocks the next database request.
AC5: Sessions refresh server-side and logout clears session cookies. No browser Supabase access or cross-request user state. CSP and private response caching remain enforced.

### US3 — Accessible login and bounded attempts (P1)
AC6: Login supports keyboard, paste, labelled controls, pending/error states, resend and change-email at 1440×900 and 390×844 with no overflow.
AC7: Shared database limits apply before sending/verifying: one send per email per 60 seconds, five sends per email per hour, twenty sends per trusted source per hour; five verification attempts per email per ten minutes and thirty per source. Fail closed when limiter/approval/provider is unavailable.

## Requirements

- Codes expire in ten minutes; Supabase configuration enforces expiry and one-time use.
- All existing product pages require login. The login page has no workspace navigation.
- Supabase access remains server-only. Existing secret-key data access is guarded at its HTTP transport, covering all callers and Storage.
- Auth client is per request; existing privileged data client never carries sessions.
- Store only keyed hashes in rate-limit counters. Use platform-trusted source headers on Vercel; unknown sources share a conservative global bucket elsewhere.
- Retain typed-name stage/settings auditing, fictional candidate data, private Storage and no product AI. Only recruiter login emails are permitted.
- Initial approved account is the user-specified email, provisioned privately after review; no real address in fixtures or seeds.

## UI design

Use the existing USER logo, theme tokens, shadcn Button and shared fields. Desktop: spacious two-column canvas with a muted workspace introduction and bordered login card. Phone: single-column logo and card. Email step: “Sign in to your workspace”, work email and “Send login code”. Code step: “Check your inbox”, six-digit input, “Verify and sign in”, countdown resend and change-email. Generic acknowledgement: “If this email is approved, a login code will arrive shortly.” Errors are text and icons, never color alone. No auto-submit.

## Compliance

Authentication is an explicit user-directed exception to constitution II and VIII; amendments accompany implementation. No candidate/client email or real candidate data is introduced. This feature does not resolve the broader real-data-release prerequisites in OQ-1.

## Success Criteria

AC1–AC7 have offline tests; lint, typecheck, unit tests, build and desktop/phone Playwright pass. Local DB integration/type generation are attempted and limitations reported. Remote migrations, SMTP credentials, DNS verification and real delivery are operational prerequisites, not silently performed by coding tests.
