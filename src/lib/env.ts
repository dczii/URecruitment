import { z } from "zod";
import {
  EnvError,
  blankEnvStrings,
  envIssuesFromZod,
} from "./env-error";

const httpOrHttpsUrl = z.url({ protocol: /^https?$/ });

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SENTRY_DSN: httpOrHttpsUrl.optional(),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export const PUBLIC_ENV_KEYS = Object.keys(
  publicEnvSchema.shape,
) as readonly (keyof PublicEnv)[];

export function parsePublicEnv(
  source: Record<string, string | undefined>,
): PublicEnv {
  const parsed = publicEnvSchema.safeParse(blankEnvStrings(source));
  if (!parsed.success) {
    throw new EnvError(envIssuesFromZod(parsed.error.issues, source));
  }
  return parsed.data;
}

export function publicEnv(): PublicEnv {
  return parsePublicEnv({
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  });
}

/** Substrings that mark a name as a secret wherever they appear. */
const SECRET_SUBSTRINGS = [
  "SECRET",
  "TOKEN",
  "PASSWORD",
  "PASSWD",
  "PRIVATE",
  "CREDENTIAL",
  "SERVICE_ROLE",
  "SIGNING",
  "APIKEY",
] as const;

/**
 * Whole segments that mark a name as a secret. Matching on the segment rather
 * than the raw substring keeps `KEYBOARD_LAYOUT` out of the net while catching
 * `SUPABASE_SECRET_KEY` and `AI_KEYS`.
 */
const SECRET_SEGMENTS = ["KEY", "KEYS", "PEM", "PAT"] as const;

export function isSecretShapedName(name: string): boolean {
  if (SECRET_SUBSTRINGS.some((token) => name.includes(token))) {
    return true;
  }
  const segments = name.split("_");
  return SECRET_SEGMENTS.some((segment) => segments.includes(segment));
}

export function readEnvExampleNames(text: string): string[] {
  const names: string[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) {
      continue;
    }
    const separator = trimmed.indexOf("=");
    if (separator <= 0) {
      continue;
    }
    names.push(trimmed.slice(0, separator));
  }
  return names;
}
