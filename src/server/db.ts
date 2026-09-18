import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { serverEnv } from "./env";

/**
 * Process-level, not per-request: one client is reused for the lifetime of the
 * serverless instance. That is safe only because this client carries no
 * per-request state — the secret key is constant and sessions are off. Never
 * mutate the shared client per request (no `auth.setSession`, no per-request
 * headers): that would leak across requests served by the same instance.
 */
let cachedDb: SupabaseClient<Database> | undefined;

export function getDb(): SupabaseClient<Database> {
  cachedDb ??= createClient<Database>(
    serverEnv().SUPABASE_URL,
    serverEnv().SUPABASE_SECRET_KEY,
    {
      // Server-only: no sign-in in this MVP, so nothing to persist or refresh.
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  return cachedDb;
}

export function resetDbCacheForTests(): void {
  cachedDb = undefined;
}
