import "server-only";
import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "../env";
import type { AuthDatabase } from "./types";
/** Bootstrap access only: approvals and limiter. Never export to product DAL. */
export function authAdmin() {
  const env = serverEnv();
  return createClient<AuthDatabase>(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
}
