# Recruiter OTP setup and verification

## Local checks

Use Node 22 and npm. `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run test:e2e`. Playwright builds with Next.js’s supported webpack option, starts the production server and a localhost-only fictional Auth/database provider and supplies fictional approved sessions to existing screen tests. No application bypass flag, real emails or remote database calls are involved. Local provider state requires one worker. Existing seed-dependent tests retain their prior skip conditions.

For real local database verification: start Docker/Supabase, run `supabase db reset --local`, `npm run db:types`, `npm run db:types:check`, and `npm run test:db`. Auth is enabled with signups disabled and local mail capture; use the local mail catcher to view OTPs. Auth schema overlay in src/server/auth/types.ts is temporary pending CLI generation.

## Deployment prerequisites (not executed by coding verification)

1. Confirm the app's Supabase project privately and apply both auth migrations through the existing reviewed migration process.
2. Add `SUPABASE_PUBLISHABLE_KEY` alongside server-only `SUPABASE_URL` and `SUPABASE_SECRET_KEY`. Do not add a public-prefixed key or commit values.
3. In Resend, verify a sending domain and sender address. Configure its custom SMTP credentials in Supabase Auth. Keep credentials in provider settings only. Do not enable email tracking for login codes.
4. Disable public signup and anonymous login. Set email OTP expiry to 600 seconds and frequency to at least 60 seconds. Use supabase/templates/login-code.html as the Magic Link template. Keep JWT lifetime 3600 seconds and refresh rotation enabled. The app bounds a login to 12 hours and uses browser-session cookies.
5. Privately create the initially approved user's Supabase Auth account without an invitation, then insert recruiter_access with its UUID and normalized email. Use the email supplied in the user instruction; do not copy real accounts into seeds or tests. Approval is per email, not company domain.
6. After reviewed setup, perform an explicitly authorized real delivery/login test, including logout and membership deactivation. No real candidate data is permitted.

## Operator approval procedure

Only a trusted operator manages access. Create the Auth user using the provider's non-inviting admin createUser operation with `email_confirm: true`; never use invite-by-email. Upsert the matching UUID/email into recruiter_access with active=true. To revoke app access, set active=false and updated_at=now(); every privileged request rechecks it. If an approved user's email changes, explicitly update its approval after reviewing the change. No product approval-management UI is included.

## Limits and privacy

Shared Postgres counters limit sends per email/source and verification attempts. Email/source identifiers are HMAC-hashed with the server secret. Vercel's platform-owned forwarding header identifies the source; elsewhere, unknown clients share a conservative source bucket. Operational errors return safe messages; OTPs and session values are never logged. Changing the server secret invalidates age markers and rate-limit hashes.

## Verification limitations

No local Supabase stack is running, so generated types and database integration tests require local/CI follow-up before deployment. The isolated auth type overlay does not certify schema generation. The default Turbopack build encounters local worker-port EPERM errors; the webpack production build and browser-payload scanner are verified instead. Dependency audit reports an existing critical Next.js ImageResponse advisory (GHSA-vcvr-r3jv-pc5j; patched in 16.3.8); Next.js was not changed in this feature. Review that dependency update separately.
