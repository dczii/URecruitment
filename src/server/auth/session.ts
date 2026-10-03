import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { serverEnv } from "../env";
export const AGE_COOKIE = "recruiter-session-age";
export const MAX_SESSION_SECONDS = 12 * 60 * 60;
export const sessionCookieOptions = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" };
function signature(payload: string) {
  return createHmac("sha256", serverEnv().SUPABASE_SECRET_KEY).update(`session-age:${payload}`).digest("hex");
}
export function issueSessionAge(userId: string, now = Date.now()) {
  const payload = `${userId}:${Math.floor(now / 1000)}`;
  return `${payload}:${signature(payload)}`;
}
export function validSessionAge(value: string | undefined, userId: string, now = Date.now()): boolean {
  if (!value) return false;
  const parts = value.split(":");
  if (parts.length !== 3 || parts[0] !== userId || !/^[0-9]+$/.test(parts[1]) || !/^[a-f0-9]{64}$/.test(parts[2])) return false;
  const expected = signature(`${parts[0]}:${parts[1]}`);
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(parts[2]))) return false;
  const age = Math.floor(now / 1000) - Number(parts[1]);
  return age >= 0 && age < MAX_SESSION_SECONDS;
}
