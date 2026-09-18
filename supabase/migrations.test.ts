import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { lintMigrationSql } from "./migration-lint";

/**
 * Applies the migration lint to the real files in supabase/migrations/.
 *
 * The rules and their counter-examples live in migration-lint.test.ts, which
 * exercises them against fixture SQL. This file is the thin part: it reads what
 * is actually committed.
 *
 * There are no migrations today, so this passes trivially. It starts biting the
 * first time E03 adds one.
 */

const MIGRATIONS_DIR = join(process.cwd(), "supabase/migrations");

const files = readdirSync(MIGRATIONS_DIR)
  .filter((name) => name.endsWith(".sql"))
  .sort();

describe("committed migrations (supabase-db §Security)", () => {
  it("every migration file is named with the CLI's timestamp prefix", () => {
    for (const name of files) {
      expect(
        name,
        `${name} should look like 20260918123456_snake_case.sql`,
      ).toMatch(/^\d{14}_[a-z0-9_]+\.sql$/);
    }
  });

  it.each(files)("%s locks down every table it creates", (file) => {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    const violations = lintMigrationSql(sql);
    expect(
      violations.map((violation) => `${violation.rule}: ${violation.detail}`),
      `${file} breaks the lock-down rules`,
    ).toEqual([]);
  });
});
