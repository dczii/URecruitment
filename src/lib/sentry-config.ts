import { z } from "zod";
import { EnvError } from "./env-error";
import { scrubBreadcrumb, scrubEvent } from "./sentry-scrub";

const httpOrHttpsUrl = z.url({ protocol: /^https?$/ });

/**
 * Parse a Sentry DSN without loading `server-only` env modules.
 * Sentry initialises outside React's server-component layer.
 */
export function parseSentryDsn(
  value: string | undefined,
  variableName: "SENTRY_DSN" | "NEXT_PUBLIC_SENTRY_DSN" = "SENTRY_DSN",
): string | undefined {
  const normalised = value === "" ? undefined : value;
  if (normalised === undefined) {
    return undefined;
  }

  const parsed = httpOrHttpsUrl.safeParse(normalised);
  if (!parsed.success) {
    throw new EnvError([{ name: variableName, reason: "invalid" }]);
  }
  return parsed.data;
}

export function baseSentryOptions(dsn: string | undefined) {
  return {
    dsn,
    enabled: Boolean(dsn),
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    // Never send IP / cookies / user-agent as PII; the MVP has no user identity.
    sendDefaultPii: false as const,
    // Performance tracing is out of scope; errors only.
    tracesSampleRate: 0,
    // Strip names, contact details, CV text and secrets before an event is sent.
    beforeSend: scrubEvent,
    beforeBreadcrumb: scrubBreadcrumb,
    maxValueLength: 2000,
  };
}
