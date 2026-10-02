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

/**
 * The MVP never subscribes to Realtime. supabase-js still constructs a
 * RealtimeClient, which on Node 20 throws unless a WebSocket transport is
 * provided. This closed stub satisfies that constructor without opening a
 * socket or depending on Node 22's native WebSocket.
 */
class ClosedWebSocket {
  binaryType = "arraybuffer";
  readonly bufferedAmount = 0;
  readonly extensions = "";
  readonly protocol = "";
  readonly readyState = 3;
  readonly url = "";
  onclose: ((ev: unknown) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;
  onmessage: ((ev: unknown) => void) | null = null;
  onopen: ((ev: unknown) => void) | null = null;
  close(): void {}
  send(): void {}
  addEventListener(): void {}
  removeEventListener(): void {}
  dispatchEvent(): boolean {
    return false;
  }
}

export function getDb(): SupabaseClient<Database> {
  cachedDb ??= createClient<Database>(
    serverEnv().SUPABASE_URL,
    serverEnv().SUPABASE_SECRET_KEY,
    {
      // Server-only: no sign-in in this MVP, so nothing to persist or refresh.
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: {
        // Typed as browser WebSocket; the stub is constructor-compatible.
        transport: ClosedWebSocket as unknown as typeof WebSocket,
      },
    },
  );
  return cachedDb;
}

export function resetDbCacheForTests(): void {
  cachedDb = undefined;
}
