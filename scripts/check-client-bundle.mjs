import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const TEXT_EXTENSIONS = new Set([
  ".js",
  ".mjs",
  ".cjs",
  ".css",
  ".json",
  ".map",
  ".txt",
  ".html",
]);

const ENV_NAMES = [
  "SUPABASE_SECRET_KEY",
  "SUPABASE_URL",
  "SUPABASE_JWT_SECRET",
  "SUPABASE_SERVICE_ROLE_KEY",
];

const SECRET_SHAPES = [
  // Require a secret-like suffix so regex *patterns* in client code
  // (e.g. sentry-scrub's `sb_secret_\S+`) are not themselves treated as leaks.
  { label: "sb_secret_…", regex: /sb_secret_[A-Za-z0-9]+/ },
  { label: "sk-…", regex: /sk-[A-Za-z0-9_-]{10,}/ },
  { label: "eyJ…", regex: /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/ },
  { label: "vercel_blob_rw_…", regex: /vercel_blob_rw_[A-Za-z0-9_]+/ },
];

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
  const modulePath = decodeURIComponent(new URL(import.meta.url).pathname);
  return path.resolve(entry) === path.resolve(modulePath);
}

function main() {
  const dir = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.join(process.cwd(), ".next", "static");

  if (!existsSync(dir)) {
    console.log(
      `${dir} does not exist; skipping leak check (an unbuilt tree is not a leak).`,
    );
    process.exit(0);
  }

  const leaks = findLeaksInDir(dir);
  if (leaks.length === 0) {
    console.log("no leaks");
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
