import { describe, expect, it } from "vitest";
import { createdTable, lintMigrationSql, splitStatements } from "./migration-lint";

/**
 * Every case below was found by the 2026-09-18 security review of the first
 * version of this guard, which both rejected valid lock-down SQL and accepted
 * real escapes. Each one is pinned here so it cannot come back.
 */

const LOCKED = `
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);
alter table public.jobs enable row level security;
revoke all on table public.jobs from anon, authenticated;
`;

function rules(sql: string): string[] {
  return lintMigrationSql(sql).map((violation) => violation.rule);
}

describe("migration lint — compliant SQL is accepted", () => {
  it("accepts the canonical create + enable + revoke", () => {
    expect(lintMigrationSql(LOCKED)).toEqual([]);
  });

  it("accepts a quoted schema and table name", () => {
    // Review F4(a): the old regex captured `public` as the table name here.
    const sql = `
      create table "public"."candidates" (id uuid primary key);
      alter table "public"."candidates" enable row level security;
      revoke all on table "public"."candidates" from anon, authenticated;
    `;
    expect(lintMigrationSql(sql)).toEqual([]);
  });

  it("accepts the roles in either order", () => {
    // Review F4(b): the old regex hard-coded anon before authenticated.
    const sql = `
      create table public.jobs (id uuid primary key);
      alter table public.jobs enable row level security;
      revoke all on public.jobs from authenticated, anon;
    `;
    expect(lintMigrationSql(sql)).toEqual([]);
  });

  it("accepts a migration that also grants to a non-locked role", () => {
    // Review F2: any GRANT anywhere in the file used to trip the guard, because
    // the mandatory revoke guarantees the word `anon` appears somewhere.
    const sql = `
      create table public.jobs (id uuid primary key);
      alter table public.jobs enable row level security;
      grant usage on schema public to postgres;
      grant execute on function public.touch() to service_role;
      revoke all on table public.jobs from anon, authenticated;
    `;
    expect(lintMigrationSql(sql)).toEqual([]);
  });

  it("accepts one revoke covering several tables", () => {
    const sql = `
      create table public.a (id uuid primary key);
      create table public.b (id uuid primary key);
      alter table public.a enable row level security;
      alter table public.b enable row level security;
      revoke all on table public.a, public.b from anon, authenticated;
    `;
    expect(lintMigrationSql(sql)).toEqual([]);
  });

  it("accepts a security_invoker view", () => {
    const sql = `
      create view public.pipeline_status with (security_invoker = true) as select 1;
      revoke all on table public.pipeline_status from anon, authenticated;
    `;
    expect(lintMigrationSql(sql)).toEqual([]);
  });

  it("ignores lock-down statements that are only commented out", () => {
    const sql = `
      create table public.jobs (id uuid primary key);
      -- alter table public.jobs enable row level security;
      /* revoke all on table public.jobs from anon, authenticated; */
    `;
    expect(rules(sql)).toEqual(
      expect.arrayContaining(["missing-rls", "missing-revoke"]),
    );
  });
});

describe("migration lint — escapes are rejected", () => {
  it("rejects a table with no RLS and no revoke", () => {
    const sql = `create table public.jobs (id uuid primary key);`;
    expect(rules(sql)).toEqual(
      expect.arrayContaining(["missing-rls", "missing-revoke"]),
    );
  });

  it("rejects the second table when only the first is locked down", () => {
    // Review F3: `b` used to be satisfied by the letter b inside "ta(b)le".
    const sql = `
      create table public.a (id uuid primary key);
      create table public.b (id uuid primary key);
      alter table public.a enable row level security;
      revoke all on table public.a from anon, authenticated;
    `;
    const violations = lintMigrationSql(sql);
    expect(violations.some((v) => v.detail.includes("public.b"))).toBe(true);
    expect(violations.some((v) => v.detail.includes("public.a"))).toBe(false);
  });

  it("rejects a revoke that names only one of the two locked roles", () => {
    const sql = `
      create table public.jobs (id uuid primary key);
      alter table public.jobs enable row level security;
      revoke all on table public.jobs from anon;
    `;
    expect(rules(sql)).toContain("missing-revoke");
  });

  it("rejects a policy with no `to` clause, which defaults to PUBLIC", () => {
    // Review F5(a): this is the escape that matters most — it grants anon read.
    const sql = `
      ${LOCKED}
      create policy jobs_read on public.jobs for select using (true);
    `;
    expect(rules(sql)).toContain("public-policy");
  });

  it("rejects a policy aimed at anon or authenticated", () => {
    for (const role of ["anon", "authenticated", "public"]) {
      const sql = `
        ${LOCKED}
        create policy jobs_read on public.jobs for select to ${role} using (true);
      `;
      expect(rules(sql), role).toContain("public-policy");
    }
  });

  it("rejects disabling row level security after enabling it", () => {
    // Review F5(b).
    const sql = `
      ${LOCKED}
      alter table public.jobs disable row level security;
    `;
    expect(rules(sql)).toContain("rls-disabled");
  });

  it("rejects unlogged, foreign and temporary tables without lock-down", () => {
    // Review F5(c,d): these were invisible to the old create-table regex.
    for (const kind of [
      "unlogged table",
      "foreign table",
      "global temporary table",
    ]) {
      const sql = `create ${kind} public.cache_rows (id uuid primary key);`;
      expect(rules(sql), kind).toEqual(
        expect.arrayContaining(["missing-rls", "missing-revoke"]),
      );
    }
  });

  it("rejects a grant to anon or authenticated", () => {
    const sql = `
      ${LOCKED}
      grant select on public.jobs to anon;
    `;
    expect(rules(sql)).toContain("role-grant");
  });

  it("rejects a view without security_invoker", () => {
    const sql = `create view public.v as select 1;`;
    expect(rules(sql)).toContain("view-without-security-invoker");
  });
});

describe("statement splitting", () => {
  it("does not split inside a dollar-quoted function body", () => {
    const sql = `
      create function public.f() returns int language plpgsql as $$
      begin
        return 1;  -- a semicolon inside the body
      end;
      $$;
      create table public.jobs (id uuid primary key);
    `;
    const statements = splitStatements(sql);
    expect(statements.some((s) => /create\s+function/i.test(s))).toBe(true);
    expect(statements.filter((s) => createdTable(s) === "jobs")).toHaveLength(1);
  });

  it("does not split on a semicolon inside a string literal", () => {
    const sql = `insert into public.t (v) values ('a;b'); create table public.jobs (id uuid);`;
    expect(splitStatements(sql)).toHaveLength(2);
  });
});
