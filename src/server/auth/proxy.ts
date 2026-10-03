import "server-only";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { serverEnv } from "../env";
import { authEnv } from "./env";
import { sessionCookieOptions } from "./session";
export async function refreshAuth(request: NextRequest, requestHeaders: Headers) {
  let response = NextResponse.next({ request: { headers: requestHeaders } });
  if (!request.cookies.getAll().some(({ name }) => name.startsWith("sb-"))) return response;
  try {
    const client = createServerClient(serverEnv().SUPABASE_URL, authEnv().SUPABASE_PUBLISHABLE_KEY, {
      cookieOptions: sessionCookieOptions,
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(values) {
          for (const { name, value } of values) request.cookies.set(name, value);
          requestHeaders.set("cookie", request.cookies.toString());
          const previous = response.cookies.getAll();
          response = NextResponse.next({ request: { headers: requestHeaders } });
          for (const cookie of previous) response.cookies.set(cookie);
          for (const { name, value, options } of values) response.cookies.set(name, value, { ...options, ...sessionCookieOptions, maxAge: value ? undefined : 0 });
        },
      },
      global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
    });
    await client.auth.getUser();
  } catch {
    // DAL verifies again and fails closed; login still renders during outages.
  }
  return response;
}
