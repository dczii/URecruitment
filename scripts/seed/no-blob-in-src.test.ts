import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));
const SRC_DIR = join(repoRoot, "src");

/** Matches `import ... from "@vercel/blob"` and `require("@vercel/blob")`, with either quote style. */
const BLOB_IMPORT_PATTERN = /(?:from\s+|require\()\s*["']@vercel\/blob["']/;

function listFilesRecursively(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      files.push(...listFilesRecursively(full));
    } else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

describe("app code never imports the Blob client (AC117.3)", () => {
  it("AC117.3: no file under src/ imports or requires @vercel/blob", () => {
    const offenders: string[] = [];
    for (const file of listFilesRecursively(SRC_DIR)) {
      const contents = readFileSync(file, "utf8");
      if (BLOB_IMPORT_PATTERN.test(contents)) {
        offenders.push(file.slice(repoRoot.length));
      }
    }
    expect(offenders).toEqual([]);
  });
});
