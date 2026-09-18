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

  it("AC5: vercel.json declares the Next.js framework", () => {
    // The Vercel project was created before the app existed, so it auto-detected
    // framework "Other" and the first real build failed with "No Output Directory
    // named \"public\" found". Declaring it here fixes it in version control
    // rather than in dashboard settings that nothing in the repo records.
    const vercel = JSON.parse(
      readFileSync(join(process.cwd(), "vercel.json"), "utf8"),
    ) as { framework?: string };
    expect(vercel.framework).toBe("nextjs");
  });

  it("AC5: the Node version is pinned to the same major everywhere", () => {
    // .nvmrc drives local and CI; engines.node drives Vercel. ">=22" let Vercel
    // build on Node 24 while everything else ran 22.
    const engines = (
      JSON.parse(
        readFileSync(join(process.cwd(), "package.json"), "utf8"),
      ) as { engines?: { node?: string } }
    ).engines;
    const nvmrc = readFileSync(join(process.cwd(), ".nvmrc"), "utf8").trim();

    expect(engines?.node).toBe("22.x");
    expect(nvmrc).toBe("22");
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
