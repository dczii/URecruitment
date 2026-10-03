---
name: security-compliance
description: >
  Security and compliance checklist for HRManagement (public repo, approved-recruiter sign-in, free tiers):
  secrets hygiene, server-only Supabase access, RLS, private Storage and signed URLs, upload
  validation, headers/CSP, logging without PII, Singapore PDPA, fair-employment rules and the
  protected-attribute rules. Use when a change touches env vars, keys, database access, storage,
  uploads, route handlers, logging, CI secrets, deployment, candidate data, search filters or
  retention/consent; and as part of every review of those areas.
---

# Security & compliance

Read `docs/security/baseline.md`, `docs/compliance/baseline.md`, `docs/compliance/risk-register.md` and `docs/decisions/open-questions.md` first. Code: `src/server/db.ts`, `src/server/storage.ts`, `src/proxy.ts`, `src/lib/security-headers.ts`, `src/lib/sentry-scrub.ts`, `supabase/migrations.test.ts`, `src/server/no-browser-supabase.test.ts`, `scripts/check-client-bundle.mjs`.

**Threat model.** Approved recruiters sign in through server-only Supabase Auth with Resend OTP delivery. Every privileged data request verifies identity, session age and active membership. The repo is public. Data is fictional, but controls must be real because they carry into the real-data release.

## Checklist

**Secrets**
- [ ] No keys, tokens, passwords, `.env*` or sample-data Blob URLs (`*.public.blob.vercel-storage.com`) in the diff, fixtures, docs, issues, PR text or logs. `.env.example` has names only.
- [ ] No `NEXT_PUBLIC_` on the Supabase secret key or `BLOB_READ_WRITE_TOKEN` (only `NEXT_PUBLIC_SENTRY_DSN` is public).
- [ ] CI secrets exist only as GitHub Actions secrets; workflows degrade gracefully on forks.

**Data access**
- [ ] Supabase and Storage are called only from `src/server/**` with `import "server-only"`.
- [ ] Every new table: RLS + `revoke all … from anon, authenticated` in the creating migration; views `security_invoker`; `security definer` functions pin `search_path`; RLS lock-down test updated.
- [ ] Bucket private; signed URLs ≤ 300 s, made on the server, never stored.
- [ ] `src/**` never imports `@vercel/blob`; seed only `list()`s and downloads.

**Input**
- [ ] Every action and route handler validates with Zod, returns typed errors without stack traces.
- [ ] Uploads: type by magic bytes, size ≤ 50 MB, sanitised name, UUID storage path. Scanned/photo CVs rejected with a clear message.
- [ ] No `dangerouslySetInnerHTML` with CV/JD text.

**Transport and logging**
- [ ] CSP via `src/proxy.ts` nonce, `frame-ancestors 'none'`, other headers from `security-headers.ts`.
- [ ] Logs and Sentry events carry no CV text, names, contact details or file contents (`sentry-scrub.ts`). `/api/sentry-test` stays 404 in production.
- [ ] `npm audit` reviewed; no dependency added without the plan listing it.

**Costs and exposure**
- [ ] Free-tier limits respected; one daily cron at most; one region. Preview and production share one Supabase project (see `release-ci`), so treat remote writes as production changes.

## Compliance rules

1. **No autonomous decisions** about candidates, and only user-requested recruiter login-code email (no candidate/client email, consent requests or reminders).
2. **Protected attributes:** name, photo, age, gender, race, religion, marital status never rank or filter. Nationality and language count only as a job requirement with a written reason. Pregnancy, caregiving, disability, mental health: don't add logic on them (Workplace Fairness Act, end-2027).
3. **PDPA:** fictional data only now. Consent, retention (12 months), deletion, access/correction and breach handling are real-data release work; leave the consent/retention columns unused and don't invent behaviour (open questions OQ-*).
4. **Audit:** stage and settings changes record the typed name; `stage_events` is append-only.
5. **Overseas transfer:** data stays in `ap-southeast-1`/`sin1`. Don't add services that move candidate data elsewhere without an ADR.
6. Anything that touches candidate data, search or gap flags gets a note in the spec's Compliance section citing the clause it relies on.

## Review output

List each failed item with file:line and the rule. Findings that touch RLS, secrets, signed URLs or protected attributes are blockers.
