# Local validation guide

Prerequisite: user-authorized tasks; npm dependencies already installed. Use local auth/mocked Supabase fixtures, never a remote project.

1. npm test -- src/components/patterns/AppNavigation.test.tsx src/components/patterns/SidebarAccount.test.tsx src/lib/build-info.test.ts
2. npm run test:e2e -- e2e/shell.spec.ts e2e/sidebar-account.spec.ts e2e/auth.spec.ts
3. Run npm run lint, npm run typecheck, npm test, npm run build, npm run test:e2e.
4. Inspect 1440×900 and 390×844: account controls, Add/Change name, explicit sign out, short/long pages and version footer.
5. Inspect repeated collapse reversals, long Chinese/English names, unavailable storage, phone drawer resize and focus restoration. Emulate reduced motion and use Enter/Space: no animation. Review motion slowed down and confirm no text scaling or overflow.

Expected: all primary routes reachable, name auditing preserved, local logout regression passes, version visible and no horizontal overflow. Build-info tests cover valid/missing/malformed metadata without accessing a deployment.
