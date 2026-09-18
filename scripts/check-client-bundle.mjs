import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TEXT_EXTENSIONS = new Set([
  ".js",
  ".mjs",
  ".cjs",
  ".css",
  ".json",
  ".map",
  ".txt",
  ".html",
  // The RSC flight payload and the prerendered HTML. `server-only` stops a
  // client component *importing* the db module; it does nothing about a Server
  // Component reading the secret and passing it down as a prop, which is
  // serialised into these. They live under .next/server/app, not .next/static.
  ".rsc",
  ".body",
  ".meta",
]);

/**
 * Both halves of the client-reachable output. .next/static is the browser
 * bundle; .next/server/app holds the RSC payload and prerendered HTML, which
 * the browser also receives.
 */
const SCAN_DIRS = [
  path.join(".next", "static"),
  path.join(".next", "server", "app"),
];

const ENV_NAMES = [
  "SUPABASE_SECRET_KEY",
  "SUPABASE_URL",
  "SUPABASE_JWT_SECRET",
  "SUPABASE_SERVICE_ROLE_KEY",
];

const SECRET_SHAPES = [
  // Require a secret-like suffix so regex *patterns* in client code are not
  // themselves treated as leaks: src/lib/sentry-scrub.ts ships the literal
  // `sb_secret_\S+` into the browser bundle, and `\` is not in these classes.
  // The classes include `-` and `_` so a base64url secret starting with either
  // is still caught.
  { label: "sb_secret_…", regex: /sb_secret_[A-Za-z0-9_-]{8,}/ },
  // \b so a path fragment like `task-async-storage` does not read as `sk-…`.
  { label: "sk-…", regex: /\bsk-[A-Za-z0-9_-]{10,}/ },
  // A whole JWT, and also a lone first segment: a minifier can split a token
  // across string concatenations, which defeats a three-part match.
  { label: "eyJ…", regex: /eyJ[A-Za-z0-9_-]{20,}/ },
  { label: "vercel_blob_rw_…", regex: /vercel_blob_rw_[A-Za-z0-9_-]{8,}/ },
];

/**
 * Next's file-trace manifests. They list node_modules paths so the deploy can
 * bundle a function, and are never served to a browser, so a match in one is
 * not a leak.
 */
const SKIP_SUFFIXES = [".nft.json"];

function toPosix(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function matchesIn(contents) {
  const matched = [];
  for (const name of ENV_NAMES) {
    if (contents.includes(name)) {
      matched.push(name);
    }
  }
  for (const shape of SECRET_SHAPES) {
    if (shape.regex.test(contents)) {
      matched.push(shape.label);
    }
  }
  return matched;
}

/**
 * Scan `dir` recursively for server env names and secret-shaped values.
 * @param {string} dir
 * @returns {{ path: string, matched: string }[]}
 */
export function findLeaksInDir(dir) {
  const leaks = [];
  const entries = readdirSync(dir, { recursive: true });

  for (const relative of entries) {
    const relativePath = String(relative);
    const fullPath = path.join(dir, relativePath);
    let st;
    try {
      st = statSync(fullPath);
    } catch {
      continue;
    }
    if (!st.isFile()) {
      continue;
    }
    const lower = relativePath.toLowerCase();
    if (SKIP_SUFFIXES.some((suffix) => lower.endsWith(suffix))) {
      continue;
    }
    const ext = path.extname(relativePath).toLowerCase();
    if (!TEXT_EXTENSIONS.has(ext)) {
      continue;
    }
    const contents = readFileSync(fullPath, "utf8");
    for (const matched of matchesIn(contents)) {
      leaks.push({ path: toPosix(relativePath), matched });
    }
  }

  return leaks;
}

function isCli() {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }
  // fileURLToPath, not new URL(...).pathname: the latter mangles Windows paths.
  return path.resolve(entry) === path.resolve(fileURLToPath(import.meta.url));
}

function main() {
  const explicitDir = process.argv[2];
  const dirs = explicitDir
    ? [path.resolve(explicitDir)]
    : SCAN_DIRS.map((dir) => path.join(process.cwd(), dir));

  const present = dirs.filter((dir) => existsSync(dir));

  if (present.length === 0) {
    if (explicitDir) {
      console.log(`${dirs[0]} does not exist; nothing to scan.`);
      process.exit(0);
    }
    // No explicit directory means this is the build gate. A missing build
    // output is a broken gate, not a clean bill of health: if `distDir` or the
    // output mode moves, silently exiting 0 would disable this check forever.
    console.error(
      `None of ${dirs.join(", ")} exist. Run \`next build\` first; a missing build output is not a pass.`,
    );
    process.exit(1);
  }

  const leaks = present.flatMap((dir) =>
    findLeaksInDir(dir).map((leak) => ({
      ...leak,
      path: `${path.relative(process.cwd(), dir)}/${leak.path}`,
    })),
  );

  if (leaks.length === 0) {
    console.log(`no leaks (scanned ${present.length} director${present.length === 1 ? "y" : "ies"})`);
    process.exit(0);
  }

  for (const leak of leaks) {
    console.log(`${leak.path}: matched ${leak.matched}`);
  }
  process.exit(1);
}

if (isCli()) {
  main();
}
