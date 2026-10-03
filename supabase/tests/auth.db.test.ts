import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";
const url = process.env.SUPABASE_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
if (!["127.0.0.1", "localhost", "[::1]"].includes(new URL(url).hostname)) throw new Error("Auth DB tests require a local stack");
const sql = postgres(url, { max: 8, connect_timeout: 3 });
afterAll(async () => { await sql.end({ timeout: 3 }); });
describe("AC7 atomic auth counters", () => {
  it("concurrent requests cannot exceed the budget", async () => {
    const bucket = `test:${crypto.randomUUID()}`;
    try {
      const results = await Promise.all(Array.from({ length: 12 }, () => sql<{ allowed: boolean }[]>`select public.consume_auth_limit(${bucket}, 5, 600) as allowed`));
      expect(results.filter(rows => rows[0].allowed)).toHaveLength(5);
    } finally { await sql`delete from public.auth_rate_limits where bucket = ${bucket}`; }
  });
  it("expired window permits a fresh request", async () => {
    const bucket = `test:${crypto.randomUUID()}`;
    await sql.begin(async tx => {
      await tx`insert into public.auth_rate_limits(bucket,window_start,attempts) values (${bucket},now()-interval '61 seconds',1)`;
      const rows = await tx<{ allowed: boolean }[]>`select public.consume_auth_limit(${bucket},1,60) as allowed`;
      expect(rows[0].allowed).toBe(true);
      await tx`delete from public.auth_rate_limits where bucket = ${bucket}`;
    });
  });
  it("anon/authenticated cannot execute the limiter", async () => {
    const rows = await sql<{ anon: boolean; authenticated: boolean }[]>`select has_function_privilege('anon','public.consume_auth_limit(text,integer,integer)','execute') as anon, has_function_privilege('authenticated','public.consume_auth_limit(text,integer,integer)','execute') as authenticated`;
    expect(rows[0]).toEqual({ anon: false, authenticated: false });
  });
});
