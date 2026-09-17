import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  buildContentSecurityPolicy,
  generateNonce,
} from "./lib/security-headers";

export function proxy(request: NextRequest) {
  const nonce = generateNonce();
  const isDev = process.env.NODE_ENV === "development";
  const csp = buildContentSecurityPolicy({ nonce, isDev });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  response.headers.set("Content-Security-Policy", csp);

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes; the static headers in next.config.ts still apply)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     *
     * Next's own CSP example also skips prefetch requests (`missing:` on
     * `next-router-prefetch` / `purpose: prefetch`) so a fresh nonce does not
     * bust the prefetch cache. We deliberately do NOT skip them: that exempted
     * document responses from the CSP entirely, which made spec AC6 — "every
     * page response carries CSP" — false. Verified with
     * `curl -sI -H 'purpose: prefetch' /`, and pinned by the e2e smoke test.
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
