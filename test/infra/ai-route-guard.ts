import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, posix, relative } from "node:path";

export type SourceFile = { path: string; source: string };

const APP_PREFIX = "src/app/";
const AI_ROUTE_DIR = "src/app/api/ai/";
const ALIAS_PREFIX = "@/";
const SRC_PREFIX = "src/";
const ROUTE_BASENAME = /^route\.(ts|tsx|js|mjs)$/;
const COLLECTED_SOURCE = /\.(ts|tsx|js|mjs)$/;
const TEST_FILE = /\.test\./;
const DECLARATION_FILE = /\.d\.ts$/;
const ROUTE_GROUP_SEGMENT = /^\([^/]+\)$/;
const PARALLEL_ROUTE_SEGMENT = /^@[^/]+$/;
const OPTIONAL_CATCH_ALL_SEGMENT = /^\[\[\.\.\.[^/\]]+\]\]$/;
const RESOLVE_EXTENSIONS = [".ts", ".tsx", ".js", ".mjs"] as const;
const RESOLVE_INDEX_FILES = [
  "index.ts",
  "index.tsx",
  "index.js",
  "index.mjs",
] as const;

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

function isCollectedSourcePath(filePath: string): boolean {
  const name = basename(filePath);
  if (DECLARATION_FILE.test(name) || TEST_FILE.test(name)) {
    return false;
  }
  return COLLECTED_SOURCE.test(name);
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

function specifierBase(fromPath: string, specifier: string): string | undefined {
  if (specifier.startsWith(ALIAS_PREFIX)) {
    return posix.normalize(`${SRC_PREFIX}${specifier.slice(ALIAS_PREFIX.length)}`);
  }
  if (isRelativeSpecifier(specifier)) {
    return posix.normalize(posix.join(posix.dirname(fromPath), specifier));
  }
  return undefined;
}

function resolveImportedPath(
  fromPath: string,
  specifier: string,
  pathSet: Set<string>,
): string | undefined {
  const base = specifierBase(fromPath, specifier);
  if (base === undefined) {
    return undefined;
  }

  const candidates = [
    base,
    ...RESOLVE_EXTENSIONS.map((ext) => `${base}${ext}`),
    ...RESOLVE_INDEX_FILES.map((indexFile) => `${base}/${indexFile}`),
  ];
  return candidates.find((candidate) => pathSet.has(candidate));
}

function filesReachingAi(files: SourceFile[], pathSet: Set<string>): Set<string> {
  const reaches = new Set<string>();

  for (const file of files) {
    if (moduleSpecifiers(file.source).some(isAiModuleSpecifier)) {
      reaches.add(file.path);
    }
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const file of files) {
      if (reaches.has(file.path)) {
        continue;
      }
      for (const specifier of moduleSpecifiers(file.source)) {
        const resolved = resolveImportedPath(file.path, specifier, pathSet);
        if (resolved !== undefined && reaches.has(resolved)) {
          reaches.add(file.path);
          changed = true;
          break;
        }
      }
    }
  }

  return reaches;
}

function firstAiReachingSpecifier(
  file: SourceFile,
  pathSet: Set<string>,
  reaches: Set<string>,
): string | undefined {
  for (const specifier of moduleSpecifiers(file.source)) {
    if (isAiModuleSpecifier(specifier)) {
      return specifier;
    }
    const resolved = resolveImportedPath(file.path, specifier, pathSet);
    if (resolved !== undefined && reaches.has(resolved)) {
      return specifier;
    }
  }
  return undefined;
}

function aiFolderSegments(filePath: string): string[] {
  const remainder = filePath.slice(AI_ROUTE_DIR.length);
  const parts = remainder.split("/");
  return parts.slice(0, -1);
}

function isRouteGroupSegment(segment: string): boolean {
  return ROUTE_GROUP_SEGMENT.test(segment);
}

function isParallelRouteSegment(segment: string): boolean {
  return PARALLEL_ROUTE_SEGMENT.test(segment);
}

function isOptionalCatchAllSegment(segment: string): boolean {
  return OPTIONAL_CATCH_ALL_SEGMENT.test(segment);
}

function firewallPrefixViolation(filePath: string): string | undefined {
  if (!isRouteHandler(filePath) || !filePath.startsWith(AI_ROUTE_DIR)) {
    return undefined;
  }

  const folderSegments = aiFolderSegments(filePath);
  if (folderSegments.some(isRouteGroupSegment)) {
    return `${filePath}: route group on the AI path; never add a route group under ${AI_ROUTE_DIR}`;
  }

  const remaining = folderSegments.filter(
    (segment) => !isRouteGroupSegment(segment) && !isParallelRouteSegment(segment),
  );
  if (remaining.length === 0) {
    return `${filePath}: route handler sits at /api/ai (no trailing segment), which escapes the /api/ai/ firewall prefix`;
  }

  const first = remaining[0];
  if (first !== undefined && isOptionalCatchAllSegment(first)) {
    return `${filePath}: optional catch-all at /api/ai also serves the bare /api/ai, which escapes the /api/ai/ firewall prefix`;
  }

  return undefined;
}

export function aiRouteViolations(files: SourceFile[]): string[] {
  const pathSet = new Set(files.map((file) => file.path));
  const reaches = filesReachingAi(files, pathSet);
  const violations: string[] = [];

  for (const file of files) {
    if (!isRouteHandler(file.path)) {
      continue;
    }

    const prefixEscape = firewallPrefixViolation(file.path);
    if (prefixEscape !== undefined) {
      violations.push(prefixEscape);
    }

    if (file.path.startsWith(AI_ROUTE_DIR)) {
      continue;
    }

    const via = firstAiReachingSpecifier(file, pathSet, reaches);
    if (via === undefined) {
      continue;
    }

    if (isAiModuleSpecifier(via)) {
      violations.push(
        `${file.path}: imports AI code but is not under ${AI_ROUTE_DIR}`,
      );
    } else {
      violations.push(
        `${file.path}: reaches AI code via ${via} but is not under ${AI_ROUTE_DIR}`,
      );
    }
  }
  return violations;
}

function toRepoPath(rootDir: string, fullPath: string): string {
  return relative(rootDir, fullPath).split("\\").join("/");
}

function walkCollectedFiles(
  rootDir: string,
  startDir: string,
  accept: (repoPath: string) => boolean,
): SourceFile[] {
  if (!existsSync(startDir) || !statSync(startDir).isDirectory()) {
    return [];
  }

  const files: SourceFile[] = [];
  const stack = [startDir];
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
      if (!accept(repoPath)) {
        continue;
      }
      files.push({ path: repoPath, source: readFileSync(fullPath, "utf8") });
    }
  }
  return files;
}

export function collectSourceFiles(rootDir: string): SourceFile[] {
  const srcDir = join(rootDir, "src");
  return walkCollectedFiles(rootDir, srcDir, isCollectedSourcePath);
}

export function collectRouteFiles(rootDir: string): SourceFile[] {
  return collectSourceFiles(rootDir).filter((file) => isRouteHandler(file.path));
}
