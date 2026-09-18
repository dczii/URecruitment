import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));
const RULE_PATH = join(repoRoot, "infra/vercel/ai-rate-limit.rule.json");
const INFRA_PLAN = "docs/plans/infrastructure.md";
const RATE_LIMIT_HEADING = "### Rate limit and spend cap (#93)";

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`expected ${label} to be an object`);
  }
  return value as Record<string, unknown>;
}

function asArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`expected ${label} to be an array`);
  }
  return value;
}

function loadRule(): Record<string, unknown> {
  const parsed: unknown = JSON.parse(readFileSync(RULE_PATH, "utf8"));
  return asRecord(parsed, "ai-rate-limit.rule.json");
}

function mitigateConfig(rule: Record<string, unknown>): Record<string, unknown> {
  const action = asRecord(rule.action, "action");
  return asRecord(action.mitigate, "action.mitigate");
}

function rateLimitConfig(rule: Record<string, unknown>): Record<string, unknown> {
  return asRecord(mitigateConfig(rule).rateLimit, "action.mitigate.rateLimit");
}

function markdownSection(markdown: string, heading: string, sourcePath: string): string {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((line) => line === heading);
  if (start === -1) {
    throw new Error(`Missing heading ${JSON.stringify(heading)} in ${sourcePath}`);
  }
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.startsWith("### ") || line.startsWith("## ")) {
      end = i;
      break;
    }
  }
  return lines.slice(start + 1, end).join("\n");
}

describe("AI rate-limit firewall rule (AC4, AC7)", () => {
  it("AC4: name, description and active match the WAF custom-rule shape", () => {
    const rule = loadRule();
    const name = rule.name;
    const description = rule.description;

    expect(typeof name).toBe("string");
    if (typeof name !== "string") {
      throw new Error("name is not a string");
    }
    expect(name.length).toBeGreaterThan(0);
    expect(name.length).toBeLessThanOrEqual(160);

    expect(typeof description).toBe("string");
    if (typeof description !== "string") {
      throw new Error("description is not a string");
    }
    expect(description.length).toBeLessThanOrEqual(256);

    expect(rule.active).toBe(true);
  });

  it("AC4: exactly one path-prefix condition matches AI_ROUTE_PREFIX", async () => {
    const { AI_ROUTE_PREFIX } = await import("@/lib/ai-routes");
    const rule = loadRule();
    const groups = asArray(rule.conditionGroup, "conditionGroup");
    expect(groups).toHaveLength(1);

    const group = asRecord(groups[0], "conditionGroup[0]");
    const conditions = asArray(group.conditions, "conditionGroup[0].conditions");
    expect(conditions).toHaveLength(1);
    expect(conditions[0]).toEqual({
      type: "path",
      op: "pre",
      value: AI_ROUTE_PREFIX,
    });
    expect(
      asRecord(conditions[0], "condition").neg === true,
      "the path condition must not set neg: true",
    ).toBe(false);
  });

  it("AC4: the action is a Hobby-compatible IP fixed-window rate limit with a 429 and no persistent block", () => {
    const rule = loadRule();
    const mitigate = mitigateConfig(rule);
    const rateLimit = rateLimitConfig(rule);

    expect(mitigate.action).toBe("rate_limit");
    expect(rateLimit.algo).toBe("fixed_window");

    const window = rateLimit.window;
    expect(typeof window).toBe("number");
    expect(Number.isInteger(window)).toBe(true);
    expect(window).toBeGreaterThanOrEqual(10);
    expect(window).toBeLessThanOrEqual(600);

    const limit = rateLimit.limit;
    expect(typeof limit).toBe("number");
    expect(Number.isInteger(limit)).toBe(true);
    expect(limit).toBeGreaterThanOrEqual(1);

    expect(rateLimit.keys).toEqual(["ip"]);
    expect(rateLimit.action).toBe("rate_limit");
    expect(mitigate.actionDuration).toBeNull();
  });

  it("AC7: the infrastructure plan states the committed rule's values", () => {
    const rateLimit = rateLimitConfig(loadRule());
    const window = rateLimit.window;
    const limit = rateLimit.limit;

    const markdown = readFileSync(join(repoRoot, INFRA_PLAN), "utf8");
    const section = markdownSection(markdown, RATE_LIMIT_HEADING, INFRA_PLAN);

    expect(section).toContain("`/api/ai/`");
    expect(section).toContain(`${String(limit)} requests per ${String(window)} seconds`);
    expect(section).toContain("429");
    expect(section).toContain(`--rate-limit-window ${String(window)}`);
    expect(section).toContain(`--rate-limit-requests ${String(limit)}`);
  });
});
