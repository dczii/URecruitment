# Tasks: Approved recruiter email OTP

Scope: full feature authorized by user; execute sequentially. No branch, commits, push, remote GitHub or Supabase operations.

- [x] T001 Amend policy in .specify/memory/constitution.md, CLAUDE.md, AGENTS.md, .claude/skills/{nextjs-app,security-compliance,project-map}/SKILL.md; record docs/decisions/adr-0004-recruiter-auth.md and update docs/security/baseline.md.
- [x] T002 Write failing auth-schema and service/transport tests in src/lib/auth-schema.test.ts, src/server/auth/service.test.ts, src/server/auth/guarded-fetch.test.ts; scaffold src/lib/auth-schema.ts, src/server/auth/{service,guarded-fetch}.ts for assertion failures.
- [x] T003 Add dependency in package.json/package-lock.json; private migrations supabase/migrations/20261002000001_recruiter_access.sql and 20261002000002_auth_rate_limits.sql, local auth/email config in supabase/config.toml and supabase/templates/login-code.html; auth DB integration tests in supabase/tests/auth.db.test.ts. Attempt generated types.
- [x] T004 Implement src/server/auth/{types,admin,client,session,access,limiter,service,guarded-fetch,proxy}.ts, src/lib/auth-schema.ts. Add auth env schema/tests in src/server/auth/env.ts and env.test.ts; names-only .env.example additions and docs/plans/infrastructure.md environment matrix. Guard src/server/db.ts transport. Add session/client/access/proxy tests beside modules.
- [x] T005 Add src/app/login/{page,actions}.tsx/ts, src/components/features/auth/LoginForm.tsx and LoginForm.test.tsx; integrate src/app/layout.tsx, src/proxy.ts, src/components/patterns/AppNavigation.tsx. Update navigation test mocks for new logout action.
- [x] T006 Add e2e/auth.spec.ts, e2e/auth-fixture.ts, e2e/mock-supabase.mjs and e2e/run-local.mjs; wire playwright.config.ts and existing e2e/*.spec.ts imports to fictional approved-session fixture. Preserve existing assertions and skips.
- [x] T007 Run lint, typecheck, unit, build, e2e and local DB generation/integration checks; finish quickstart.md and checklists/security.md with evidence. Review diff for credentials and document operational prerequisites. Correct scripts/check-client-bundle.mjs and its tests if webpack executable server modules are misclassified as browser payloads.

Acceptance mapping: AC1/AC3 → service.test.ts; AC2 → auth-schema, service, session and Playwright; AC4 → access and guarded-fetch; AC5 → client/session/proxy and Playwright; AC6 → LoginForm and Playwright at both widths; AC7 → limiter unit and auth.db integration.

## Handoff limitations

All implementation tasks and available checks were performed. T003/T007's local DB type generation and live database verification remain blocked by unavailable local Supabase/Docker. The generated database.types.ts was preserved; auth schema overlay requires CLI/CI verification before deployment. SMTP/domain configuration and initial real-account approval remain external operational prerequisites. No remote operations or invitation email were performed.
