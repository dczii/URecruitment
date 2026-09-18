import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, expectTypeOf, it } from "vitest";
import type { Database } from "./database.types";

const typesPath = join(process.cwd(), "src/lib/database.types.ts");

describe("generated database types (AC5)", () => {
  it("AC5: the types file exists and its header marks it generated", () => {
    const source = readFileSync(typesPath, "utf8");
    expect(source.length).toBeGreaterThan(0);
    expect(source).toMatch(/Generated database types/i);
    expect(source).toContain("npm run db:types");
    expect(source).toMatch(/Do not hand-edit/i);
  });

  it("AC5: Database is usable as a generic", () => {
    type AsClient<T extends Database> = T["public"];
    expectTypeOf<AsClient<Database>>().toHaveProperty("Tables");
    expectTypeOf<Database["public"]["Tables"]>().toEqualTypeOf<{
      [_ in never]: never;
    }>();
  });
});
