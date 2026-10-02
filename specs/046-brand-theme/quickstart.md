# Validation

From `/workspace/URecruitment`, activate Node 22:

```bash
export PATH=/workspace/.cloud-tools/node_modules/.bin:$PATH
export PLAYWRIGHT_BROWSERS_PATH=/workspace/.playwright
npm run lint
npm run typecheck
npm test
npm run build
# Start the built app in a separate terminal:
npm run start -- --port 3100
# In the test terminal, use that production server:
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 npm run test:e2e -- e2e/brand-theme.spec.ts --workers=2
```

The default Playwright readiness URL is `/`, which redirects to the database-dependent dashboard. Use the production base URL above for the database-independent theme suite. `/settings` exercises the real shell and name dialog without Supabase. Full recruiter-route E2E validation requires local Supabase and fictional fixtures; its previous Postgres extraction exceeded machine capacity. Do not treat absent database suites as passing. Current results are recorded in tasks.md.
