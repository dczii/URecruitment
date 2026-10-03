# Implementation Plan: Approved recruiter email OTP

Date: 2026-10-02. Spec: [spec.md](spec.md). Implementation authorized; no branch or GitHub mutation.

## Summary

Supabase Auth generates/verifies OTP and manages sessions; Resend provides custom SMTP. Add @supabase/ssr only. Browser calls Next.js, never Supabase. A separate private admin client handles approval and rate-limit queries; application database HTTP requests check verified active membership before forwarding. Login gets a dedicated brand-themed page and server actions.

## Technical Context

Next.js 16.3.5, React 19, strict TypeScript, Zod 4, existing shadcn/Tailwind tokens. Private Postgres approval and rate-limit tables with service-role-only access. Atomic RPC counters provide distributed limits without another service. Sessions: one-hour access tokens with rotation; browser-session cookies (no persistent remember-me), maximum twelve-hour application login age enforced by a signed HttpOnly cookie. Refresh in proxy; identity and approval checked again at data transport. No shared response caching.

## Constitution Check

I, IV, V, VI, VII: unchanged candidate controls, fictional candidate data, UTC timestamps. II: explicit recruiter-login-only email exception. III: all clients stay server-only, RLS/revokes preserved. VIII: sign-in added without replacing typed-name audit. IX: failing tests before logic, desktop/phone coverage. X: OQ-1 remains open for real data. Governance amendments included. GitHub Story creation omitted because remote GitHub operations are prohibited by the user.

## Project Structure

Feature artifacts: spec.md, plan.md, tasks.md, research.md, data-model.md, quickstart.md, contracts/auth.md, checklists/security.md.
Source: src/server/auth/*, src/lib/auth-schema.ts, src/app/login/*, src/components/features/auth/LoginForm.tsx. Existing db transport, proxy, root layout and navigation integrate auth. New auth migrations and local mail-capture configuration; offline mock provider serves Playwright. No product auth bypass.

## Decisions

- Private approval table contains user UUID, normalized email, active flag, UTC timestamps. Verify UUID and email together; email changes cannot inherit old approval.
- Fixed-window atomic database limiter uses keyed email/source hashes. A separate cooldown counter prevents rapid resends across hour boundaries.
- Proxy overwrites an internal pathname header, refreshes cookies and preserves CSP. Root layout uses that pathname to keep login outside AppShell. Authorization does not rely on layout or proxy alone.
- Guard privileged database transport on every operation; isolate the unguarded admin client in auth/admin.ts. Existing raw clients remain sessionless.
- Session maximum age is cryptographically bound to user ID and checked server-side, so refreshing cannot extend it indefinitely.
- Local tests use a fictional HTTP Auth/database provider; no flags bypass app authorization. Existing screen tests receive a fictional session fixture. The local browser runner uses a webpack production build to avoid developer-extension instrumentation and restricted Turbopack worker ports.
- Generate schema types locally if possible. If Docker is unavailable, keep generated database.types.ts unchanged and isolate auth schema types in auth/types.ts pending CLI verification; report this limitation.

## External setup

Confirm project privately; verify sending domain in Resend; configure SMTP; disable public signup; set OTP template to {{ .Token }}, expiry 600 seconds, resend 60 seconds, access-token lifetime 3600 seconds and refresh rotation. Initial account provisioning is private and sends no invitation. No credentials or personal account seed data committed.

## Implementation evidence and deviations

The privileged transport is guarded before every database/Storage HTTP call without changing existing accessor/caller APIs. Webpack's inline server executables revealed a browser-bundle checker false positive; its scanner now separates executable server modules from delivered HTML/RSC/body/meta, with a failing-then-passing regression test and existing browser JavaScript leak tests retained. Local DB schema generation is blocked; AuthDatabase overlay remains isolated pending CLI verification. No real account provisioning or SMTP/DNS changes occurred. No new tests are skipped. Existing seed/desktop-only skip conditions remain.
