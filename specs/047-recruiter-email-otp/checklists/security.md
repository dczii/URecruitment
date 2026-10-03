# Security checklist

- [x] Provider/session/approval checked independently of UI.
- [x] No browser Supabase or secret exposure.
- [x] Atomic shared request and verify limits.
- [x] No real email in tests.
- [x] CSP, cookies, cache headers and maximum session age tested.
- [ ] SQL RLS/revokes and service-only RPC execute verified.
- [x] Remote setup prerequisites reported.

SQL RLS/revokes and execute privileges are present and pass static migration lint; live integration and generated types remain unverified without a local stack. Atomic-counter tests are written but blocked by that environment.
