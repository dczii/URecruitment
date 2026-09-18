import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  expectTypeOf,
  it,
  vi,
} from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { resetServerEnvCacheForTests } from "./env";
import { getDb, resetDbCacheForTests } from "./db";

const DB_SOURCE_PATH = join(process.cwd(), "src/server/db.ts");
const VALID_URL = "http://127.0.0.1:54321";
const VALID_SECRET = "test-secret-key-not-for-production";

function firstNonEmptyLine(source: string): string {
  for (const line of source.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return "";
}

function readDbSource(): string {
  return readFileSync(DB_SOURCE_PATH, "utf8");
}

beforeEach(() => {
  vi.stubEnv("SUPABASE_URL", VALID_URL);
  vi.stubEnv("SUPABASE_SECRET_KEY", VALID_SECRET);
  resetServerEnvCacheForTests();
  resetDbCacheForTests();
});

afterEach(() => {
  resetDbCacheForTests();
  resetServerEnvCacheForTests();
  vi.unstubAllEnvs();
});

describe("server db (AC2, AC7, AC9)", () => {
  it("AC2: the db module is server-only", () => {
    const source = readDbSource();
    expect(firstNonEmptyLine(source)).toBe('import "server-only";');
  });

  it("AC7: the db module never mentions NEXT_PUBLIC", () => {
    const source = readDbSource();
    expect(source).not.toContain("NEXT_PUBLIC");
  });

  it("AC7: the db module reads the secret key through serverEnv", () => {
    const source = readDbSource();
    expect(source).toContain("serverEnv");
    expect(source).not.toContain("process.env.SUPABASE_SECRET_KEY");
  });

  it("AC9: the db module imports Database from the generated types", () => {
    const source = readDbSource();
    expect(source).toMatch(/\bDatabase\b/);
    expect(source).toMatch(
      /from\s+["'](?:@\/lib\/database\.types|\.\.\/lib\/database\.types)["']/,
    );
  });

  it("AC9: the exported client is a SupabaseClient<Database>", () => {
    const source = readDbSource();
    expect(source).toMatch(/SupabaseClient\s*<\s*Database\s*>/);
    expectTypeOf(getDb()).toEqualTypeOf<SupabaseClient<Database>>();
  });

  it("AC7: calling the accessor twice returns the same client", () => {
    const first = getDb();
    const second = getDb();
    expect(first).toBe(second);
  });

  it("AC7: no value ever appears in an error when env is missing", () => {
    const secret = "sk-test-DO-NOT-PRINT-123";
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SECRET_KEY", secret);
    resetServerEnvCacheForTests();
    resetDbCacheForTests();

    let thrown: unknown;
    try {
      getDb();
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Error);
    const message = thrown instanceof Error ? thrown.message : String(thrown);
    expect(message).toContain("SUPABASE_URL");
    expect(message).not.toContain(secret);

    vi.stubEnv("SUPABASE_URL", VALID_URL);
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    resetServerEnvCacheForTests();
    resetDbCacheForTests();

    let missingSecret: unknown;
    try {
      getDb();
    } catch (error) {
      missingSecret = error;
    }

    expect(missingSecret).toBeInstanceOf(Error);
    const missingMessage =
      missingSecret instanceof Error
        ? missingSecret.message
        : String(missingSecret);
    expect(missingMessage).toContain("SUPABASE_SECRET_KEY");
    expect(missingMessage).not.toContain(secret);
    expect(missingMessage).not.toContain(VALID_SECRET);
  });
});
