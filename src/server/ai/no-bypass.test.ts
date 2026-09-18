import { readdirSync, readFileSync } from "node:fs";
import { join, sep } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * AC3: a new AI call added outside `runAi` is caught.
 * Files under `src/server/**` other than `src/server/ai/**` must not import
 * the Vercel AI SDK (`ai`) or a provider SDK directly (ADR-0003 C1).
 */

const SERVER_DIR = join(process.cwd(), "src/server");
const SOURCE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];
const TEST_FILE = /\.test\.[cm]?[jt]sx?$/;

const FROM_SPECIFIER = /\bfrom\s+(['"])([^'"]+)\1/g;
const DYNAMIC_IMPORT_SPECIFIER = /\bimport\s*\(\s*(['"])([^'"]+)\1/g;
const REQUIRE_SPECIFIER = /\brequire\s*\(\s*(['"])([^'"]+)\1/g;
const SIDE_EFFECT_IMPORT = /\bimport\s+(['"])([^'"]+)\1/g;

const PROVIDER_PACKAGES = [
  "openai",
  "@anthropic-ai/sdk",
  "@google/generative-ai",
  "@google/genai",
  "groq-sdk",
  "@mistralai/mistralai",
  "@google-cloud/vertexai",
  "@google-cloud/aiplatform",
] as const;

function collectSpecifiers(source: string, pattern: RegExp): string[] {
  const specifiers: string[] = [];
  for (const match of source.matchAll(pattern)) {
    const specifier = match[2];
    if (specifier !== undefined) {
      specifiers.push(specifier);
    }
  }
  return specifiers;
}

function moduleSpecifiers(source: string): string[] {
  return [
    ...collectSpecifiers(source, FROM_SPECIFIER),
    ...collectSpecifiers(source, DYNAMIC_IMPORT_SPECIFIER),
    ...collectSpecifiers(source, REQUIRE_SPECIFIER),
    ...collectSpecifiers(source, SIDE_EFFECT_IMPORT),
  ];
}

function matchesPackage(specifier: string, pkg: string): boolean {
  return specifier === pkg || specifier.startsWith(`${pkg}/`);
}

/** True when the specifier is the Vercel AI SDK or a provider SDK. */
function isDirectAiOrProviderImport(specifier: string): boolean {
  if (specifier === "ai" || specifier.startsWith("ai/")) {
    return true;
  }
  if (specifier.startsWith("@ai-sdk/")) {
    return true;
  }
  return PROVIDER_PACKAGES.some((pkg) => matchesPackage(specifier, pkg));
}

function serverSourceFiles(): string[] {
  return readdirSync(SERVER_DIR, { recursive: true })
    .map(String)
    .filter((path) => SOURCE_EXTENSIONS.some((ext) => path.endsWith(ext)))
    .filter((path) => !TEST_FILE.test(path))
    .map((path) => path.split(sep).join("/"));
}

function readServerFile(relativePath: string): string {
  return readFileSync(join(SERVER_DIR, relativePath), "utf8");
}

function bypassOffenders(files: string[]): string[] {
  return files
    .filter((path) => !path.startsWith("ai/"))
    .filter((path) =>
      moduleSpecifiers(readServerFile(path)).some(isDirectAiOrProviderImport),
    );
}

describe("no AI SDK bypass (AC3)", () => {
  it("finds the source files it scans", () => {
    expect(serverSourceFiles()).toContain("db.ts");
  });

  it("AC3: the import pattern catches static, dynamic and require forms", () => {
    expect(isDirectAiOrProviderImport("ai")).toBe(true);
    expect(isDirectAiOrProviderImport("ai/rsc")).toBe(true);
    expect(isDirectAiOrProviderImport("@ai-sdk/openai")).toBe(true);
    expect(isDirectAiOrProviderImport("openai")).toBe(true);
    expect(isDirectAiOrProviderImport("@anthropic-ai/sdk")).toBe(true);

    expect(isDirectAiOrProviderImport("@/server/ai/run")).toBe(false);
    expect(isDirectAiOrProviderImport("@/lib/ai-routes")).toBe(false);
    expect(isDirectAiOrProviderImport("aim")).toBe(false);
    expect(isDirectAiOrProviderImport("openai-tokenizers")).toBe(false);
  });

  it("AC3: fails if a model call bypasses runAi", () => {
    const files = serverSourceFiles();
    expect(files.length).toBeGreaterThan(0);
    expect(bypassOffenders(files)).toEqual([]);
  });
});
