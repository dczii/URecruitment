import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { serverEnv } from "../env";
import { authEnv } from "./env";
import { sessionCookieOptions } from "./session";
/** Per request: never put this client in a module cache. */
export async function authClient(writable = false) {
  const jar = await cookies();
  return createServerClient(serverEnv().SUPABASE_URL, authEnv().SUPABASE_PUBLISHABLE_KEY, {
    cookieOptions: sessionCookieOptions,
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (values) => {
        if (!writable) return; // Proxy owns refresh writes during rendering.
        for (const { name, value, options } of values) jar.set(name, value, { ...options, ...sessionCookieOptions, maxAge: value ? undefined : 0 });
      },
    },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
}
export async function clearSession() {
  const jar = await cookies();
  // Clear even if the provider is unavailable; browser must lose local access.
  for (const { name } of jar.getAll()) {
    if (name.startsWith("sb-") || name === "recruiter-session-age") jar.set(name, "", { ...sessionCookieOptions, maxAge: 0 });
  }
}
