import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { serverEnv } from "./env";

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
