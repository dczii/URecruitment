import "server-only";
import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { serverEnv } from "../env";
import { authAdmin } from "./admin";
export type LimitRule = { bucket: string; attempts: number; seconds: number };
function digest(value: string) { return createHmac("sha256", serverEnv().SUPABASE_SECRET_KEY).update(`auth-limit:${value}`).digest("hex"); }
export function limitRules(email: string, source: string, operation: "send" | "verify"): LimitRule[] {
  const e = digest(email), s = digest(source);
  return operation === "send" ? [
    { bucket: `send:cooldown:${e}`, attempts: 1, seconds: 60 },
    { bucket: `send:email:${e}`, attempts: 5, seconds: 3600 },
    { bucket: `send:source:${s}`, attempts: 20, seconds: 3600 },
  ] : [
    { bucket: `verify:email:${e}`, attempts: 5, seconds: 600 },
    { bucket: `verify:source:${s}`, attempts: 30, seconds: 600 },
  ];
}
export async function consumeLimits(rules: LimitRule[], consume: (rule: LimitRule) => Promise<boolean>): Promise<boolean> {
  // Charge all buckets, including rejected attempts, to cap source-level abuse.
  const results = await Promise.all(rules.map(consume));
  return results.every(Boolean);
}
export async function allowAttempt(email: string, operation: "send" | "verify") {
  const h = await headers();
  // Only Vercel's platform-owned header is trusted; no arbitrary forwarded IP.
  const source = process.env.VERCEL === "1" ? h.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ?? "unknown" : "unknown";
  const admin = authAdmin();
  const consume = async (rule: LimitRule) => {
    const { data, error } = await admin.rpc("consume_auth_limit", { bucket_key: rule.bucket, max_attempts: rule.attempts, window_seconds: rule.seconds });
    if (error) throw new Error("Login limits unavailable");
    return data === true;
  };
  return limitAttempt(limitRules(email, source, operation), consume);
}

export async function limitAttempt(rules: LimitRule[], consume: (rule: LimitRule) => Promise<boolean>) {
  // Reject source abuse before allocating fresh counters for arbitrary emails.
  const sourceRule = rules.at(-1);
  if (!sourceRule || !(await consume(sourceRule))) return false;
  return consumeLimits(rules.slice(0, -1), consume);
}
