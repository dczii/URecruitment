# Verification — 2 October 2026

Run with Node 22.23.2 using npm.

| Check | Result |
| --- | --- |
| npm run lint | Pass; 10 existing warnings, zero errors |
| npm run typecheck | Pass |
| npm test | Pass; 414 tests across 63 files |
| npm exec -- next build --webpack | Pass; production build used by browser tests |
| npm run test:e2e | Pass; 56 passed, 38 existing skips, desktop and phone |
| node scripts/check-client-bundle.mjs | Pass; no leaks in two output directories |
| git diff --check | Pass |
| npm run build | Failed: local Turbopack worker port permission error; webpack alternative passed |
| npm run db:types | Blocked: local Supabase/Docker unavailable |
| Local auth.db integration tests | Blocked: local database connection unavailable |

Observed unavailable-environment output:

```text
TurbopackInternalError: Failed to write app endpoint /page
Operation not permitted (os error 1)

db:types: no local Supabase stack is running. Start it with `supabase start` (needs Docker).

connect EPERM 127.0.0.1:54322
```

The new SQL concurrency/RLS/execute-privilege tests exist but have not run successfully against Postgres. The auth schema overlay must be replaced/verified by generated types after migrations are applied to a local stack. Static migration checks passed as part of the unit suite.

The expiry browser test initially raced the send action; waiting for the code form before expiring the fictional provider code fixed the test. No assertions were weakened and no new tests were skipped.

Browser tests use a localhost fictional Auth/data provider. They verify application behavior, not Resend delivery or hosted Supabase settings. No remote migrations, invitations, email, or recruiter provisioning were performed. The initial recruiter address supplied by the user must be provisioned privately during operational setup.

Dependency audit also reported the existing Next.js 16.3.5 critical advisory GHSA-vcvr-r3jv-pc5j (fixed in 16.3.8); upgrading Next.js is outside this feature's dependency plan and remains a pre-deployment concern.

## CI follow-up — 3 October 2026

DB run 37086263700 passed fresh migrations and all 64 integration tests in seven files, including the atomic limiter and private-table checks. Local CLI template paths resolve from the project root; `content_path` now points to `./supabase/templates/login-code.html`, with a regression test that first reproduced ENOENT. The run's schema-only generated-types artifact replaces the stale committed types byte-for-byte, and AuthDatabase now aliases the generated Database rather than maintaining an overlay. The earlier live-SQL/type-generation limitations above are superseded by this CI evidence; the follow-up run rechecks the final generated-type gate.
