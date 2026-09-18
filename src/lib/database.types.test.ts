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
    expectTypeOf<Database["public"]["Tables"]>().toHaveProperty("clients");
    expectTypeOf<Database["public"]["Tables"]>().toHaveProperty("jobs");
    expectTypeOf<Database["public"]["Tables"]>().toHaveProperty("job_versions");
    expectTypeOf<Database["public"]["Tables"]>().toHaveProperty("gap_flags");
    expectTypeOf<Database["public"]["Tables"]>().toHaveProperty("candidates");
    expectTypeOf<Database["public"]["Tables"]>().toHaveProperty("cv_files");
    expectTypeOf<Database["public"]["Tables"]>().toHaveProperty("candidate_profiles");
    expectTypeOf<Database["public"]["Tables"]>().toHaveProperty("candidate_skills");
    expectTypeOf<Database["public"]["Tables"]>().toHaveProperty("embeddings");
    expectTypeOf<Database["public"]["Tables"]>().toHaveProperty("match_scores");
  });
});
