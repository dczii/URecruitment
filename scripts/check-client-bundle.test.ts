import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { findLeaksInDir } from "./check-client-bundle.mjs";

const fixtureRoots: string[] = [];

function createFixtureDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "urec-bundle-check-"));
  fixtureRoots.push(dir);
  return dir;
}

function writeFixture(
  root: string,
  relativePath: string,
  contents: string,
): void {
  const fullPath = join(root, relativePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, contents, "utf8");
}

function leakReport(leaks: unknown): string {
  if (!Array.isArray(leaks)) {
    throw new Error(
      `expected findLeaksInDir to return an array, got ${typeof leaks}`,
    );
  }
  return leaks
    .map((leak) => {
      if (typeof leak === "string") {
        return leak;
      }
      if (leak !== null && typeof leak === "object") {
        return JSON.stringify(leak);
      }
      return String(leak);
    })
    .join("\n");
}

afterEach(() => {
  for (const dir of fixtureRoots.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("check-client-bundle (AC8)", () => {
  it("AC8: reports a leak when a bundle file contains SUPABASE_SECRET_KEY", () => {
    const dir = createFixtureDir();
    writeFixture(
      dir,
      "main.js",
      'export const envName = "SUPABASE_SECRET_KEY";',
    );

    const leaks = findLeaksInDir(dir);
    expect(Array.isArray(leaks)).toBe(true);
    expect(leaks.length).toBeGreaterThan(0);
    expect(leakReport(leaks)).toContain("main.js");
  });

  it("AC8: reports a leak when a bundle file contains an sb_secret_ shaped string", () => {
    const dir = createFixtureDir();
    writeFixture(
      dir,
      "chunk.js",
      'const leaked = "sb_secret_testonlyfixture123456";',
    );

    const leaks = findLeaksInDir(dir);
    expect(Array.isArray(leaks)).toBe(true);
    expect(leaks.length).toBeGreaterThan(0);
    expect(leakReport(leaks)).toContain("chunk.js");
  });

  it("AC8: reports no leak for harmless text", () => {
    const dir = createFixtureDir();
    writeFixture(
      dir,
      "app.js",
      "export default function App() { return null; }",
    );

    expect(findLeaksInDir(dir)).toEqual([]);
  });

  it("AC8: scans nested subdirectories", () => {
    const dir = createFixtureDir();
    writeFixture(
      dir,
      "static/chunks/app.js",
      'console.log("SUPABASE_SECRET_KEY");',
    );

    const leaks = findLeaksInDir(dir);
    expect(leaks.length).toBeGreaterThan(0);
    const report = leakReport(leaks);
    expect(report).toContain("app.js");
    expect(report).toContain("chunks");
  });

  it("AC8: ignores non-text assets by extension", () => {
    const dir = createFixtureDir();
    writeFixture(dir, "logo.png", "SUPABASE_SECRET_KEY");
    writeFixture(dir, "font.woff", "sb_secret_testonlyfixture123456");
    writeFixture(dir, "photo.jpg", "SUPABASE_SECRET_KEY");

    expect(findLeaksInDir(dir)).toEqual([]);
  });
});
