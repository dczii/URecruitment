import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
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

// --- Review fixes (2026-09-18 security review of #88) ------------------------

describe("check-client-bundle: review fixes", () => {
  it("AC8: scans the RSC payload and prerendered HTML, not just .js", () => {
    // Finding F6: `server-only` stops a client component importing the db
    // module, but not a Server Component reading the secret and passing it
    // down as a prop. That lands in the flight payload and the HTML, which
    // live under .next/server/app and were never scanned.
    const root = createFixtureDir();
    writeFixture(root, "page.rsc", 'k:"sb_secret_abcdefghij1234567890"');
    writeFixture(root, "page.html", '<b>sb_secret_abcdefghij1234567890</b>');
    writeFixture(root, "page.body", "sb_secret_abcdefghij1234567890");
    writeFixture(root, "page.meta", "sb_secret_abcdefghij1234567890");

    const leaks = findLeaksInDir(root);
    const paths = leaks.map((leak: { path: string }) => leak.path).sort();
    expect(paths).toEqual(["page.body", "page.html", "page.meta", "page.rsc"]);
  });

  it("AC8: catches a base64url secret that starts with - or _", () => {
    // Finding F14: `[A-Za-z0-9]+` missed the very next character.
    const root = createFixtureDir();
    writeFixture(root, "a.js", 'const k="sb_secret_-Xy9zAbCdEf";');
    writeFixture(root, "b.js", 'const k="sb_secret__Xy9zAbCdEf";');
    expect(findLeaksInDir(root)).toHaveLength(2);
  });

  it("AC8: catches a lone JWT first segment a minifier split apart", () => {
    const root = createFixtureDir();
    writeFixture(root, "a.js", 'const t="eyJhbGciOiJIUzI1NiJ9abcdefghijkl"+"."+"x";');
    expect(findLeaksInDir(root)).toHaveLength(1);
  });

  it("AC8: does not flag the Sentry scrubber's own detector patterns", () => {
    // These ship in the client bundle by design; they are a detector, not a
    // secret. The suffix requirement is what keeps them out.
    const root = createFixtureDir();
    writeFixture(
      root,
      "scrub.js",
      String.raw`const S=["sb_secret_\S+","vercel_blob_rw_\S+","sk-[A-Za-z0-9]{10,}"];`,
    );
    expect(findLeaksInDir(root)).toEqual([]);
  });

  it("AC8: does not flag a path fragment that merely contains sk-", () => {
    const root = createFixtureDir();
    writeFixture(root, "trace.js", 'require("next/dist/task-async-storage");');
    expect(findLeaksInDir(root)).toEqual([]);
  });

  it("AC8: skips Next's file-trace manifests, which are never served", () => {
    const root = createFixtureDir();
    writeFixture(root, "page.js.nft.json", '{"files":["../task-async-storage.js"]}');
    expect(findLeaksInDir(root)).toEqual([]);
  });

  it("AC8: skips binary assets by extension", () => {
    const root = createFixtureDir();
    writeFixture(root, "font.woff2", "sb_secret_abcdefghij1234567890");
    writeFixture(root, "icon.ico", "sb_secret_abcdefghij1234567890");
    expect(findLeaksInDir(root)).toEqual([]);
  });
});

describe("check-client-bundle CLI (AC8 exit codes)", () => {
  // Finding F9: AC8 claimed the test asserts a non-zero exit, but nothing
  // covered main(), isCli() or process.exit. These run the real CLI.
  const script = join(process.cwd(), "scripts/check-client-bundle.mjs");

  function runCli(dir: string): number {
    const result = spawnSync(process.execPath, [script, dir], {
      encoding: "utf8",
    });
    return result.status ?? -1;
  }

  it("AC8: exits 1 when a fixture directory contains a secret", () => {
    const root = createFixtureDir();
    writeFixture(root, "chunk.js", 'const k="sb_secret_abcdefghij1234567890";');
    expect(runCli(root)).toBe(1);
  });

  it("AC8: exits 0 when the fixture directory is clean", () => {
    const root = createFixtureDir();
    writeFixture(root, "chunk.js", 'const greeting="hello";');
    expect(runCli(root)).toBe(0);
  });
});
