import "server-only";

import { z } from "zod";
import {
  EnvError,
  blankEnvStrings,
  envIssuesFromZod,
} from "@/lib/env-error";

export { EnvError };

const httpOrHttpsUrl = z.url({ protocol: /^https?$/ });
const optionalModelId = z.string().min(1).optional();

const serverEnvSchema = z.object({
  SUPABASE_URL: httpOrHttpsUrl,
  SUPABASE_SECRET_KEY: z.string().min(1),
  AI_MODEL_PARSE: optionalModelId,
  AI_MODEL_MATCH: optionalModelId,
  AI_MODEL_GAP: optionalModelId,
  AI_MODEL_SEARCH: optionalModelId,
  AI_MODEL_JD: optionalModelId,
  AI_EMBED_MODEL: optionalModelId,
  AI_MONTHLY_SPEND_CAP: z
    .string()
    .transform((value) => Number(value))
    .pipe(z.number().positive())
    .optional(),
  MUST_HAVE_CAP: z
    .string()
    .transform((value) => Number(value))
    .pipe(z.number().int().min(0).max(100))
    .default(50),
  SENTRY_DSN: httpOrHttpsUrl.optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export const SERVER_ENV_KEYS = Object.keys(
  serverEnvSchema.shape,
) as readonly (keyof ServerEnv)[];

export function parseServerEnv(
  source: Record<string, string | undefined>,
): ServerEnv {
  const parsed = serverEnvSchema.safeParse(blankEnvStrings(source));
  if (!parsed.success) {
    throw new EnvError(envIssuesFromZod(parsed.error.issues, source));
  }
  return parsed.data;
}

let cachedServerEnv: ServerEnv | undefined;

export function serverEnv(): ServerEnv {
  cachedServerEnv ??= parseServerEnv(process.env);
  return cachedServerEnv;
}

export function resetServerEnvCacheForTests(): void {
  cachedServerEnv = undefined;
}
