/**
 * A lint for migration SQL, enforcing the lock-down rules that `supabase-db`
 * §Security requires of "**every new table**":
 *
 *   alter table public.<t> enable row level security;
 *   -- No policies for anon/authenticated. The publishable key must read nothing.
 *   revoke all on table public.<t> from anon, authenticated;
 *
 * This runs as a unit test on every pull request, with no Docker, which is where
 * the mistake is cheapest to catch. `supabase/tests/rls.db.test.ts` proves the
 * same thing against a live stack.
 *
 * Everything here is pure so it can be tested against fixture SQL rather than
 * against files on disk.
 */

export type Violation = {
  rule:
    | "missing-rls"
    | "missing-revoke"
    | "rls-disabled"
    | "public-policy"
    | "role-grant"
    | "view-without-security-invoker";
  detail: string;
};

/**
 * Split SQL into statements, honouring single quotes, double quotes, line and
 * block comments, and dollar-quoted bodies (`$$ … $$`, `$tag$ … $tag$`) so a
 * function body never splits mid-statement.
 */
export function splitStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let i = 0;

  while (i < sql.length) {
    const rest = sql.slice(i);

    // Line comment
    if (rest.startsWith("--")) {
      const end = sql.indexOf("\n", i);
      i = end === -1 ? sql.length : end + 1;
      current += " ";
      continue;
    }

    // Block comment
    if (rest.startsWith("/*")) {
      const end = sql.indexOf("*/", i + 2);
      i = end === -1 ? sql.length : end + 2;
      current += " ";
      continue;
    }

    // Dollar-quoted string
    const dollar = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(rest);
    if (dollar) {
      const tag = dollar[0];
      const end = sql.indexOf(tag, i + tag.length);
      const stop = end === -1 ? sql.length : end + tag.length;
      current += sql.slice(i, stop);
      i = stop;
      continue;
    }

    const char = sql[i];

    // Quoted literal or identifier
    if (char === "'" || char === '"') {
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === char) {
          if (sql[j + 1] === char) {
            j += 2; // escaped quote
            continue;
          }
          break;
        }
        j += 1;
      }
      current += sql.slice(i, j + 1);
      i = j + 1;
      continue;
    }

    if (char === ";") {
      statements.push(current.trim());
      current = "";
      i += 1;
      continue;
    }

    current += char;
    i += 1;
  }

  if (current.trim().length > 0) {
    statements.push(current.trim());
  }
  return statements.filter((statement) => statement.length > 0);
}

/** `"public"."candidates"` / `public.candidates` / `candidates` → `candidates`. */
function normaliseName(raw: string): string {
  const parts = raw
    .split(".")
    .map((part) => part.replace(/^["`]|["`]$/g, "").toLowerCase());
  return parts[parts.length - 1] ?? "";
}

const QUALIFIED = `(?:"?[a-z_][a-z0-9_]*"?\\s*\\.\\s*)?"?([a-z_][a-z0-9_]*)"?`;

/**
 * Tables created by a statement. Covers `unlogged`, `foreign`, `temporary` and
 * `global temporary`, all of which are real tables that need lock-down.
 */
export function createdTable(statement: string): string | undefined {
  const match = new RegExp(
    `^\\s*create\\s+(?:(?:global|local)\\s+)?(?:unlogged\\s+|foreign\\s+|temp(?:orary)?\\s+)*table\\s+(?:if\\s+not\\s+exists\\s+)?((?:"?[a-z_][a-z0-9_]*"?\\s*\\.\\s*)?"?[a-z_][a-z0-9_]*"?)`,
    "i",
  ).exec(statement);
  return match ? normaliseName(match[1]) : undefined;
}

export function createdView(statement: string): string | undefined {
  const match = new RegExp(
    `^\\s*create\\s+(?:or\\s+replace\\s+)?(?:materialized\\s+)?view\\s+((?:"?[a-z_][a-z0-9_]*"?\\s*\\.\\s*)?"?[a-z_][a-z0-9_]*"?)`,
    "i",
  ).exec(statement);
  return match ? normaliseName(match[1]) : undefined;
}

function rlsToggle(
  statement: string,
): { table: string; enabled: boolean } | undefined {
  const match = new RegExp(
    `^\\s*alter\\s+table\\s+(?:if\\s+exists\\s+)?(?:only\\s+)?((?:"?[a-z_][a-z0-9_]*"?\\s*\\.\\s*)?"?[a-z_][a-z0-9_]*"?)[\\s\\S]*?\\b(enable|disable|force)\\s+row\\s+level\\s+security`,
    "i",
  ).exec(statement);
  if (!match) {
    return undefined;
  }
  return {
    table: normaliseName(match[1]),
    enabled: match[2].toLowerCase() !== "disable",
  };
}

const LOCKED_ROLES = ["anon", "authenticated"] as const;

/** Roles named after `from` / `to` in a revoke or grant. */
function rolesAfter(keyword: "from" | "to", statement: string): string[] {
  const match = new RegExp(`\\b${keyword}\\b([\\s\\S]*)$`, "i").exec(statement);
  if (!match) {
    return [];
  }
  return match[1]
    .split(/[,\s]+/)
    .map((role) => role.replace(/^["`]|["`]$/g, "").toLowerCase())
    .filter((role) => role.length > 0);
}

/** Tables named between `on` and `from`/`to`, e.g. `on table public.a, public.b`. */
function objectsBetween(
  statement: string,
  stopKeyword: "from" | "to",
): string[] {
  const match = new RegExp(
    `\\bon\\b\\s*(?:table\\s+|all\\s+tables\\s+in\\s+schema\\s+)?([\\s\\S]*?)\\b${stopKeyword}\\b`,
    "i",
  ).exec(statement);
  if (!match) {
    return [];
  }
  return match[1]
    .split(",")
    .map((part) => normaliseName(part.trim()))
    .filter((name) => name.length > 0);
}

function revokesAllFromLockedRoles(statement: string): string[] {
  if (!/^\s*revoke\s+all\b/i.test(statement)) {
    return [];
  }
  const roles = rolesAfter("from", statement);
  const covers = LOCKED_ROLES.every((role) => roles.includes(role));
  return covers ? objectsBetween(statement, "from") : [];
}

/**
 * A policy with no `to` clause targets `PUBLIC`, which includes `anon`. That is
 * a public policy, which `CLAUDE.md` hard rule 3 forbids outright.
 */
function policyViolation(statement: string): Violation | undefined {
  if (!/^\s*create\s+policy\b/i.test(statement)) {
    return undefined;
  }
  const roles = /\bto\b/i.test(statement) ? rolesAfter("to", statement) : [];
  const named = roles.filter((role) =>
    ["anon", "authenticated", "public"].includes(role),
  );
  if (roles.length === 0) {
    return {
      rule: "public-policy",
      detail:
        "a `create policy` with no `to` clause defaults to PUBLIC, which includes anon; the publishable key must read nothing",
    };
  }
  if (named.length > 0) {
    return {
      rule: "public-policy",
      detail: `a policy targets ${named.join(", ")}; there are no public policies in this MVP`,
    };
  }
  return undefined;
}

function grantViolation(statement: string): Violation | undefined {
  if (!/^\s*grant\b/i.test(statement)) {
    return undefined;
  }
  const roles = rolesAfter("to", statement);
  const hit = roles.filter((role) =>
    (LOCKED_ROLES as readonly string[]).includes(role),
  );
  if (hit.length === 0) {
    return undefined;
  }
  return {
    rule: "role-grant",
    detail: `grants to ${hit.join(", ")}; the publishable key must read nothing`,
  };
}

/** Lint one migration file's SQL. An empty array means it is compliant. */
export function lintMigrationSql(sql: string): Violation[] {
  const statements = splitStatements(sql);
  const violations: Violation[] = [];

  const created: string[] = [];
  const rlsEnabled = new Set<string>();
  const rlsDisabled = new Set<string>();
  const revoked = new Set<string>();
  const views: string[] = [];

  for (const statement of statements) {
    const table = createdTable(statement);
    if (table) {
      created.push(table);
    }

    const view = createdView(statement);
    if (view) {
      views.push(view);
      if (!/security_invoker\s*=\s*true/i.test(statement)) {
        violations.push({
          rule: "view-without-security-invoker",
          detail: `view public.${view} is created without \`with (security_invoker = true)\``,
        });
      }
    }

    const toggle = rlsToggle(statement);
    if (toggle) {
      if (toggle.enabled) {
        rlsEnabled.add(toggle.table);
      } else {
        rlsDisabled.add(toggle.table);
      }
    }

    for (const name of revokesAllFromLockedRoles(statement)) {
      revoked.add(name);
    }

    const policy = policyViolation(statement);
    if (policy) {
      violations.push(policy);
    }

    const grant = grantViolation(statement);
    if (grant) {
      violations.push(grant);
    }
  }

  for (const table of rlsDisabled) {
    violations.push({
      rule: "rls-disabled",
      detail: `row level security is disabled on public.${table}`,
    });
  }

  for (const table of created) {
    if (!rlsEnabled.has(table)) {
      violations.push({
        rule: "missing-rls",
        detail: `creates public.${table} but never enables row level security on it, in the same migration`,
      });
    }
    if (!revoked.has(table)) {
      violations.push({
        rule: "missing-revoke",
        detail: `creates public.${table} but never revokes it from anon, authenticated`,
      });
    }
  }

  return violations;
}
