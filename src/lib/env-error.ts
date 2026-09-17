export type EnvIssueReason = "missing" | "invalid";

export type EnvIssue = {
  name: string;
  reason: EnvIssueReason;
};

export class EnvError extends Error {
  readonly variables: string[];

  constructor(issues: readonly EnvIssue[]) {
    const unique = uniqueByName(issues);
    const listed = unique
      .map((issue) => `${issue.name} (${issue.reason})`)
      .join(", ");
    super(
      `Invalid environment: ${listed}. See .env.example and docs/plans/infrastructure.md.`,
    );
    this.name = "EnvError";
    this.variables = unique.map((issue) => issue.name);
  }
}

function uniqueByName(issues: readonly EnvIssue[]): EnvIssue[] {
  const seen = new Set<string>();
  const unique: EnvIssue[] = [];
  for (const issue of issues) {
    if (seen.has(issue.name)) {
      continue;
    }
    seen.add(issue.name);
    unique.push(issue);
  }
  return unique;
}

/** Map Zod issues using the path only. Never read input, received, or message text. */
export function envIssuesFromZod(
  issues: ReadonlyArray<{ readonly path: readonly PropertyKey[] }>,
  source: Record<string, string | undefined>,
): EnvIssue[] {
  const mapped: EnvIssue[] = [];
  for (const issue of issues) {
    const name = issue.path[0];
    if (typeof name !== "string") {
      continue;
    }
    const raw = source[name];
    mapped.push({
      name,
      reason: raw === undefined || raw === "" ? "missing" : "invalid",
    });
  }
  return mapped;
}

export function blankEnvStrings(
  source: Record<string, string | undefined>,
): Record<string, string | undefined> {
  const next: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(source)) {
    next[key] = value === "" ? undefined : value;
  }
  return next;
}
