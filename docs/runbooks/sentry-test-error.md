# Send a Sentry test error

Sentry is wired for **server** (`sentry.server.config.ts`), **edge** (`sentry.edge.config.ts`) and **browser** (`src/instrumentation-client.ts`). Browser events go to `/monitoring` on this origin, so the CSP can stay at `connect-src 'self'`.

Deliberately off: performance tracing (`tracesSampleRate: 0`), session replay, source-map upload, and `sendDefaultPii`. The MVP has no user identity — never set a Sentry user.

## Triggers (404 in production)

Both triggers no-op when `VERCEL_ENV` is `production` (API route returns 404; the page calls `notFound()`). Use them on a Vercel Preview deployment, or locally with a DSN set.

| Runtime | How |
|---|---|
| Server | `GET /api/sentry-test` — throws `Sentry server test error (deliberate)` |
| Browser | Open `/sentry-test` and click **Throw a client error** |

## DSN

Set these in the Vercel Preview environment before any event can arrive (names only; there is no value in this repo):

- `SENTRY_DSN` — server and edge
- `NEXT_PUBLIC_SENTRY_DSN` — browser

`SENTRY_DSN` is not a secret (it only identifies the project). `SENTRY_AUTH_TOKEN` would be a secret; this app does not use one, and source maps are not uploaded.

## Scrubbing

`src/lib/sentry-scrub.ts` is the control that keeps names, contact details, CV text, prompts and secret-shaped strings out of events. It runs as `beforeSend` / `beforeBreadcrumb` in every runtime.
