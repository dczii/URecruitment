import { readdirSync, readFileSync } from "node:fs";
import { join, sep } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The Vercel Supabase integration sets NEXT_PUBLIC_SUPABASE_URL,
 * NEXT_PUBLIC_SUPABASE_ANON_KEY and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in
 * Preview and Production. They stay set (#193), so nothing but this test stops
 * a future change from building a browser Supabase client with them. Next
 * inlines NEXT_PUBLIC_ values into the bundle, so check-client-bundle.mjs
 * can't see the names once built; the check has to be on the source.
 */

const SRC_DIR = join(process.cwd(), "src");
const SOURCE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];
const SUPABASE_IMPORT = /from\s+["']@supabase\/|import\(\s*["']@supabase\/|require\(\s*["']@supabase\//;

function sourceFiles(): string[] {
  return readdirSync(SRC_DIR, { recursive: true })
    .map(String)
    .filter((path) => SOURCE_EXTENSIONS.some((ext) => path.endsWith(ext)))
    .filter((path) => !/\.test\.[cm]?[jt]sx?$/.test(path))
    .map((path) => path.split(sep).join("/"));
}

function read(path: string): string {
  return readFileSync(join(SRC_DIR, path), "utf8");
}

describe("no browser Supabase access (#193, ADR-0001 D3)", () => {
  it("finds the source files it scans", () => {
    expect(sourceFiles()).toContain("server/db.ts");
  });

  it("no source file reads a NEXT_PUBLIC_SUPABASE_ variable", () => {
    const offenders = sourceFiles().filter((path) =>
      read(path).includes("NEXT_PUBLIC_SUPABASE"),
    );
    expect(offenders).toEqual([]);
  });

  it("only src/server imports a Supabase package", () => {
    const offenders = sourceFiles()
      .filter((path) => !path.startsWith("server/"))
      .filter((path) => SUPABASE_IMPORT.test(read(path)));
    expect(offenders).toEqual([]);
  });

  it("the import pattern catches static, dynamic and require forms", () => {
    expect(SUPABASE_IMPORT.test('import { createClient } from "@supabase/supabase-js";')).toBe(true);
    expect(SUPABASE_IMPORT.test("const m = await import('@supabase/ssr');")).toBe(true);
    expect(SUPABASE_IMPORT.test('const m = require("@supabase/supabase-js");')).toBe(true);
    expect(SUPABASE_IMPORT.test('import type { Json } from "@/lib/database.types";')).toBe(false);
  });
});
