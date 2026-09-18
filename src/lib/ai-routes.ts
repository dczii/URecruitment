/**
 * The single prefix every AI route handler lives under. The Vercel firewall
 * rate-limit rule in `infra/vercel/ai-rate-limit.rule.json` matches it. The
 * trailing slash is deliberate: without it the rule would also match paths
 * such as `/api/aid`. A route at the bare `/api/ai` would escape the rule, so
 * `test/infra/ai-route-prefix.test.ts` forbids one. See src/app/api/ai/README.md.
 */
export const AI_ROUTE_PREFIX = "/api/ai/" as const;

export function isAiRoutePath(pathname: string): boolean {
  return (
    pathname.startsWith(AI_ROUTE_PREFIX) &&
    pathname.length > AI_ROUTE_PREFIX.length
  );
}

export const AI_RATE_LIMITED_MESSAGE =
  "Too many AI requests from your network just now. Wait a minute, then try again. Your work hasn't been lost.";

export const AI_FAILED_MESSAGE =
  "The AI suggestion couldn't be produced. Try again in a moment. If it keeps failing, carry on without it.";

/**
 * Call with `response.status` BEFORE parsing the body, because a 429 from the
 * Vercel firewall never reaches our function, so its body is Vercel's, not our
 * JSON. The AI only suggests, so a failure never blocks the recruiter's own work.
 */
export function aiFailureMessage(status: number): string | null {
  if (Number.isInteger(status) && status >= 200 && status <= 299) {
    return null;
  }
  if (status === 429) {
    return AI_RATE_LIMITED_MESSAGE;
  }
  return AI_FAILED_MESSAGE;
}
