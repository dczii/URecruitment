import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

export type SourceFile = { path: string; source: string };

const APP_PREFIX = "src/app/";
const AI_ROUTE_DIR = "src/app/api/ai/";
const ROUTE_BASENAME = /^route\.(ts|tsx|js|mjs)$/;
const BARE_AI_ROUTE = /^src\/app\/api\/ai\/route\.(ts|tsx|js|mjs)$/;

const FROM_SPECIFIER = /\bfrom\s+(['"])([^'"]+)\1/g;
const DYNAMIC_IMPORT_SPECIFIER = /\bimport\s*\(\s*(['"])([^'"]+)\1/g;
const REQUIRE_SPECIFIER = /\brequire\s*\(\s*(['"])([^'"]+)\1/g;
const SIDE_EFFECT_IMPORT = /\bimport\s+(['"])([^'"]+)\1/g;

function basename(filePath: string): string {
  const slash = filePath.lastIndexOf("/");
  return slash === -1 ? filePath : filePath.slice(slash + 1);
}

function isRouteHandler(filePath: string): boolean {
  return filePath.startsWith(APP_PREFIX) && ROUTE_BASENAME.test(basename(filePath));
}

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

function isRelativeSpecifier(specifier: string): boolean {
  return specifier.startsWith("./") || specifier.startsWith("../");
}

function containsServerAiPath(specifier: string): boolean {
  return specifier.endsWith("/server/ai") || specifier.includes("/server/ai/");
}

function isAiModuleSpecifier(specifier: string): boolean {
  if (specifier === "ai") {
    return true;
  }
  if (specifier.startsWith("@ai-sdk/")) {
    return true;
  }
  if (specifier === "@/server/ai" || specifier.startsWith("@/server/ai/")) {
    return true;
  }
  return isRelativeSpecifier(specifier) && containsServerAiPath(specifier);
}

function importsAiCode(source: string): boolean {
  return moduleSpecifiers(source).some(isAiModuleSpecifier);
}

export function aiRouteViolations(files: SourceFile[]): string[] {
  const violations: string[] = [];
  for (const file of files) {
    if (!isRouteHandler(file.path)) {
      continue;
    }

    if (BARE_AI_ROUTE.test(file.path)) {
      violations.push(
        `${file.path}: route handler sits at /api/ai (no trailing segment), which escapes the /api/ai/ firewall prefix`,
      );
    }

    if (importsAiCode(file.source) && !file.path.startsWith(AI_ROUTE_DIR)) {
      violations.push(
        `${file.path}: imports AI code but is not under ${AI_ROUTE_DIR}`,
      );
    }
  }
  return violations;
}

function toRepoPath(rootDir: string, fullPath: string): string {
  return relative(rootDir, fullPath).split("\\").join("/");
}

export function collectRouteFiles(rootDir: string): SourceFile[] {
  const appDir = join(rootDir, "src", "app");
  if (!existsSync(appDir) || !statSync(appDir).isDirectory()) {
    return [];
  }

  const files: SourceFile[] = [];
  const stack = [appDir];
  while (stack.length > 0) {
    const dir = stack.pop();
    if (dir === undefined) {
      continue;
    }
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      const repoPath = toRepoPath(rootDir, fullPath);
      if (!isRouteHandler(repoPath)) {
        continue;
      }
      files.push({ path: repoPath, source: readFileSync(fullPath, "utf8") });
    }
  }
  return files;
}
