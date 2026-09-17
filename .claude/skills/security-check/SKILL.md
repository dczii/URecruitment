---
name: security-check
description: >
  Security checklist for URecruitment (public repo, no sign-in, free tiers): secrets hygiene,
  server-only Supabase access, RLS lock-down, private Storage + signed URLs, upload validation,
  AI route rate limiting and spend cap, prompt-injection handling, headers, dependency audit,
  logging without PII, and preview/production exposure. Use when a change touches env vars,
  keys, database access, storage, uploads, route handlers, AI calls, logging, CI secrets or
  deployment settings; and as part of pr-review for those areas.
---

# Security check

**Threat model.** The MVP has **no sign-in**, so the server is the only gate. Anyone with the URL can use the app and trigger AI calls. The **repo is public**. The data is fictional, but the controls must be real, because they carry over to the real-data release.

## Checklist

### Secrets
- [ ] No keys, tokens, passwords or sample-data Blob URLs (`*.public.blob.vercel-storage.com`) in the diff, fixtures, docs, issues or logs.
- [ ] `.env*` is gitignored, except `.env.example`, which holds **names only**.
- [ ] No `NEXT_PUBLIC_` prefix on the Supabase secret key, AI keys or `BLOB_READ_WRITE_TOKEN`.
- [ ] The CI secrets named in the workflows exist only as GitHub Actions secrets. Workflows skip gracefully when they're absent (forks).

### Data access
- [ ] Supabase is called only from `src/server/**` (each file has `import "server-only"`).
- [ ] New tables, views and functions: RLS enabled, `revoke all … from anon, authenticated`, views `security_invoker`, `security definer` only with a pinned `search_path`.
- [ ] The RLS lock-down test covers every new table.
- [ ] Storage bucket is private. Signed URLs are created on the server, last ≤ 300 s, and are never persisted.

### Sample-data Blob store (public, seed source only)
- [ ] App runtime code (`src/**`) never imports `@vercel/blob`. Only the seed and eval scripts do.
- [ ] Seed and eval call only `list()` with `BLOB_READ_WRITE_TOKEN`. No `put`, `copy` or `del`.
- [ ] Listed URLs are checked against `SEED_BLOB_BASE_URL` before downloading.
- [ ] Nothing real is ever uploaded to the store. Anyone with a URL can read it.
- [ ] The base URL and blob URLs appear only in env and `.seed-cache/`, never in commits, issues, fixtures or logs.

### Input handling
- [ ] Every Server Action and route handler validates its input with Zod, and returns typed errors with no stack traces.
- [ ] Uploads (JD in the MVP):
  - PDF/DOCX only, checked by **magic bytes** and not only by extension;
  - size ≤ the configured limit (≤ 50 MB, the Supabase Free cap);
  - the filename is sanitised, and the storage path uses a UUID.
- [ ] No `dangerouslySetInnerHTML` with CV/JD/AI text.

### AI
- [ ] AI endpoints live under `/api/ai/*` and are **rate-limited**. Use the Vercel firewall rule if the plan supports it; otherwise an app-level limiter backed by Supabase. Record which in the spec.
- [ ] The monthly **spend cap** is checked before every call (`runAi`). The provider-side cap is documented in `release-deploy`.
- [ ] CV/JD text is passed as delimited **data**. The model output is schema-validated and **never executed**: no tool calls, no URLs fetched, no SQL built from model text except through parameterised filters.
- [ ] Model output that becomes filters is validated against allowed fields and value types.

### Transport and headers
- [ ] Security headers are set in `next.config`:
  - CSP (no inline scripts unless nonce'd);
  - `frame-ancestors 'none'`;
  - `Referrer-Policy: strict-origin-when-cross-origin`;
  - `X-Content-Type-Options: nosniff`;
  - `Permissions-Policy`.
- [ ] No CORS opened on the API routes.

### Logging and monitoring
- [ ] Sentry and console logs contain no CV text, contact details or AI prompts/outputs. Scrub `beforeSend`.
- [ ] `ai_runs.error` holds messages, not payloads.

### Dependencies
- [ ] `package-lock.json` is committed. `npm audit --omit=dev` shows no high or critical findings, or the exceptions are justified.
- [ ] New dependencies are listed in the plan, maintained, and licence-compatible.

### Exposure
- [ ] Preview deployments are as public as production. Check whether the plan offers deployment protection. If it doesn't, previews use the **dev** Supabase project with fictional data only.
- [ ] Vercel Hobby is non-commercial only. Flag this (don't fix it) when the change moves toward real recruiter use.

## Commands

```bash
git diff origin/main...HEAD | grep -nEi "(secret|api[_-]?key|token|password|BEGIN [A-Z ]*PRIVATE KEY|service_role|eyJ[a-zA-Z0-9_-]{10,}|sk-[a-zA-Z0-9]{10,}|vercel_blob_rw_|blob\.vercel-storage\.com)"
git ls-files | grep -E "(^|/)\.env" | grep -v "\.env\.example$"
grep -rlE "^['\"]use client['\"]" src | xargs grep -lE "from ['\"](@/server|.*/server/)" 2>/dev/null   # client files importing server code
npm run build && grep -rlE "SUPABASE_SECRET|AI_[A-Z_]*KEY" .next/static 2>/dev/null
npm audit --omit=dev
```

## Output format

The same table as `compliance-review`. Severity `blocker` covers:
- any secret exposure;
- the browser reaching Supabase;
- a table without RLS lock-down;
- an unbounded AI route.
