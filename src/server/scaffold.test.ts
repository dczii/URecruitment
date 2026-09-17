import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

function firstNonEmptyLine(source: string): string {
  for (const line of source.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return "";
}

function walkServerModules(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkServerModules(fullPath));
      continue;
    }
    if (entry.name.endsWith(".test.ts")) {
      continue;
    }
    if (entry.name.endsWith(".ts")) {
      files.push(fullPath);
    }
  }
  return files;
}

describe("scaffold (AC5)", () => {
  it("AC5: tsconfig has strict true", () => {
    const tsconfig = JSON.parse(
      readFileSync(join(process.cwd(), "tsconfig.json"), "utf8"),
    ) as { compilerOptions?: { strict?: boolean } };
    expect(tsconfig.compilerOptions?.strict).toBe(true);
  });

  it("AC5: vercel.json pins functions to sin1 only", () => {
    const vercel = JSON.parse(
      readFileSync(join(process.cwd(), "vercel.json"), "utf8"),
    ) as { regions?: string[] };
    expect(vercel.regions).toEqual(["sin1"]);
  });

  it('AC5: src/server/index.ts starts with import "server-only"', () => {
    const source = readFileSync(
      join(process.cwd(), "src/server/index.ts"),
      "utf8",
    );
    expect(firstNonEmptyLine(source)).toBe('import "server-only";');
  });

  it('AC5: every module under src/server starts with import "server-only"', () => {
    const files = walkServerModules(join(process.cwd(), "src/server"));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      expect(firstNonEmptyLine(source)).toBe('import "server-only";');
    }
  });
});
