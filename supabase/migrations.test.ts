import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The Docker-free half of the RLS guarantee.
 *
 * `supabase/tests/rls.db.test.ts` proves lock-down against a running stack, but
 * it needs Docker, so it does not run on every pull request. This file reads the
 * migration SQL directly and enforces the same rule at the earliest possible
 * moment — a unit test, on every PR, on any machine.
 *
 * `supabase-db` §Security, quoted:
 *   alter table public.<t> enable row level security;
 *   -- No policies for anon/authenticated. The publishable key must read nothing.
 *   revoke all on table public.<t> from anon, authenticated;
 * "**Every new table** gets both statements in the **same migration** that
 * creates it."
 *
 * There are no migrations today, so this passes trivially. It starts biting the
 * first time E03 adds one.
 */

const MIGRATIONS_DIR = join(process.cwd(), "supabase/migrations");

function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith(".sql"))
    .sort();
}

/** Strip `--` and block comments so a commented-out statement never counts. */
function stripSqlComments(sql: string): string {
  return sql.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\n]*/g, " ");
}

function createdTables(sql: string): string[] {
  const names: string[] = [];
  const pattern =
    /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?["']?([a-z0-9_]+)["']?/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(sql)) !== null) {
    names.push(match[1].toLowerCase());
  }
  return names;
}

function createdViews(sql: string): string[] {
  const names: string[] = [];
  const pattern =
    /create\s+(?:or\s+replace\s+)?view\s+(?:public\.)?["']?([a-z0-9_]+)["']?/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(sql)) !== null) {
    names.push(match[1].toLowerCase());
  }
  return names;
}

const files = migrationFiles();

describe("migration lock-down (supabase-db §Security)", () => {
  it("every migration file is named with the CLI's timestamp prefix", () => {
    for (const name of files) {
      expect(name, `${name} should look like 20260918123456_snake_case.sql`).toMatch(
        /^\d{14}_[a-z0-9_]+\.sql$/,
      );
    }
  });

  it.each(files)("%s enables RLS on every table it creates", (file) => {
    const sql = stripSqlComments(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));

    for (const table of createdTables(sql)) {
      const enablesRls = new RegExp(
        `alter\\s+table\\s+(?:public\\.)?["']?${table}["']?\\s+enable\\s+row\\s+level\\s+security`,
        "i",
      );
      expect(
        enablesRls.test(sql),
        `${file} creates public.${table} but never enables row level security on it, in the same migration`,
      ).toBe(true);
    }
  });

  it.each(files)("%s revokes every table it creates from anon and authenticated", (file) => {
    const sql = stripSqlComments(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));

    for (const table of createdTables(sql)) {
      const revokes = new RegExp(
        `revoke\\s+all\\s+[\\s\\S]*?(?:public\\.)?["']?${table}["']?[\\s\\S]*?from[\\s\\S]*?anon[\\s\\S]*?authenticated`,
        "i",
      );
      expect(
        revokes.test(sql),
        `${file} creates public.${table} but never revokes it from anon, authenticated`,
      ).toBe(true);
    }
  });

  it.each(files)("%s creates views with security_invoker", (file) => {
    const sql = stripSqlComments(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));

    for (const view of createdViews(sql)) {
      const invoker = new RegExp(
        `create\\s+(?:or\\s+replace\\s+)?view\\s+(?:public\\.)?["']?${view}["']?[\\s\\S]{0,200}?security_invoker\\s*=\\s*true`,
        "i",
      );
      expect(
        invoker.test(sql),
        `${file} creates view public.${view} without \`with (security_invoker = true)\``,
      ).toBe(true);
    }
  });

  it("grants nothing to anon or authenticated", () => {
    for (const file of files) {
      const sql = stripSqlComments(
        readFileSync(join(MIGRATIONS_DIR, file), "utf8"),
      );
      expect(
        /grant\s+[\s\S]*?\bto\b[\s\S]*?\b(anon|authenticated)\b/i.test(sql),
        `${file} grants something to anon or authenticated; the publishable key must read nothing`,
      ).toBe(false);
      expect(
        /create\s+policy/i.test(sql) &&
          /\bto\s+(anon|authenticated)\b/i.test(sql),
        `${file} creates a policy for anon or authenticated; there are no public policies in this MVP`,
      ).toBe(false);
    }
  });
});
