import "server-only";
import { z } from "zod";
import { EnvError, blankEnvStrings, envIssuesFromZod } from "@/lib/env-error";
const schema = z.object({ SUPABASE_PUBLISHABLE_KEY: z.string().min(1) });
export function parseAuthEnv(source: Record<string, string | undefined>) {
  const parsed = schema.safeParse(blankEnvStrings(source));
  if (!parsed.success) throw new EnvError(envIssuesFromZod(parsed.error.issues, source));
  return parsed.data;
}
export function authEnv() { return parseAuthEnv(process.env); }
