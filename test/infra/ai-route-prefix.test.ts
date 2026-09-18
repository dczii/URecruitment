import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  aiRouteViolations,
  collectSourceFiles,
  type SourceFile,
} from "./ai-route-guard";

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));

function file(path: string, source: string): SourceFile {
  return { path, source };
}

describe("AI route prefix guard (AC5)", () => {
  it("AC5: a handler under /api/ai/ may import from \"ai\"", () => {
    expect(
      aiRouteViolations([
        file(
          "src/app/api/ai/search/route.ts",
          'import { generateObject } from "ai";\n',
        ),
      ]),
    ).toEqual([]);
  });

  it("AC5: a handler outside /api/ai/ that imports \"ai\" is a violation", () => {
    const violations = aiRouteViolations([
      file("src/app/api/search/route.ts", 'import { generateObject } from "ai";\n'),
    ]);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain("src/app/api/search/route.ts");
  });

  it("AC5: importing @ai-sdk/openai outside the prefix is a violation", () => {
    const violations = aiRouteViolations([
      file(
        "src/app/api/search/route.ts",
        'import { openai } from "@ai-sdk/openai";\n',
      ),
    ]);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain("src/app/api/search/route.ts");
  });

  it("AC5: importing @/server/ai/run outside the prefix is a violation", () => {
    const violations = aiRouteViolations([
      file("src/app/api/search/route.ts", 'import { runAi } from "@/server/ai/run";\n'),
    ]);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain("src/app/api/search/route.ts");
  });

  it("AC5: re-exporting from @/server/ai/search outside the prefix is a violation", () => {
    const violations = aiRouteViolations([
      file(
        "src/app/api/search/route.ts",
        'export { POST } from "@/server/ai/search";\n',
      ),
    ]);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain("src/app/api/search/route.ts");
  });

  it("AC5: a dynamic import(\"ai\") outside the prefix is a violation", () => {
    const violations = aiRouteViolations([
      file(
        "src/app/api/search/route.ts",
        'export async function POST() {\n  await import("ai");\n}\n',
      ),
    ]);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain("src/app/api/search/route.ts");
  });

  it("AC5: require('ai') in a .js route outside the prefix is a violation", () => {
    const violations = aiRouteViolations([
      file("src/app/api/search/route.js", "const ai = require('ai');\n"),
    ]);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain("src/app/api/search/route.js");
  });

  it("AC5: @/server/airline and specifier \"aim\" are not treated as AI code", () => {
    expect(
      aiRouteViolations([
        file(
          "src/app/api/search/route.ts",
          'import { status } from "@/server/airline";\nimport helpers from "aim";\n',
        ),
      ]),
    ).toEqual([]);
  });

  it("AC5: a non-AI route outside the prefix is allowed", () => {
    expect(
      aiRouteViolations([
        file(
          "src/app/api/sentry-test/route.ts",
          'import { NextResponse } from "next/server";\n',
        ),
      ]),
    ).toEqual([]);
  });

  it("AC5: a bare /api/ai route.ts is a violation even with no imports", () => {
    const violations = aiRouteViolations([
      file("src/app/api/ai/route.ts", "export function GET() { return null; }\n"),
    ]);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain("src/app/api/ai/route.ts");
  });

  it("AC5: a non-route file that imports \"ai\" is ignored", () => {
    expect(
      aiRouteViolations([
        file("src/app/api/search/helpers.ts", 'import { generateObject } from "ai";\n'),
      ]),
    ).toEqual([]);
  });

  it("AC5: a src/app/[slug] route that imports @/server/ai is a violation", () => {
    const violations = aiRouteViolations([
      file("src/app/[slug]/route.ts", 'import { runAi } from "@/server/ai";\n'),
    ]);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain("src/app/[slug]/route.ts");
  });

  it("AC5: every route handler in src/app keeps AI code under /api/ai/", async () => {
    const files = collectSourceFiles(repoRoot);
    const paths = files.map((entry) => entry.path);
    expect(paths).toContain("src/app/api/sentry-test/route.ts");
    expect(aiRouteViolations(files)).toEqual([]);

    const { AI_ROUTE_PREFIX } = await import("@/lib/ai-routes");
    expect("src/app" + AI_ROUTE_PREFIX).toBe("src/app/api/ai/");
  });

  it("AC5: a handler outside /api/ai/ that imports a service which imports AI is a violation", () => {
    const violations = aiRouteViolations([
      file(
        "src/app/api/search/route.ts",
        'import { search } from "@/server/services/search";\n',
      ),
      file(
        "src/server/services/search.ts",
        'import { runAi } from "@/server/ai/run";\n',
      ),
    ]);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain("src/app/api/search/route.ts");
    expect(violations[0]).toContain("@/server/services/search");
  });

  it("AC5: two-hop relative imports that reach AI outside the prefix are a violation", () => {
    const violations = aiRouteViolations([
      file(
        "src/app/api/x/route.ts",
        'import { a } from "../../../server/services/a";\n',
      ),
      file("src/server/services/a.ts", 'import { b } from "./b";\n'),
      file("src/server/services/b.ts", 'import { generateObject } from "ai";\n'),
    ]);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain("src/app/api/x/route.ts");
  });

  it("AC5: index.ts resolution of a service that imports AI outside the prefix is a violation", () => {
    const violations = aiRouteViolations([
      file(
        "src/app/api/match/route.ts",
        'import { match } from "@/server/services/match";\n',
      ),
      file(
        "src/server/services/match/index.ts",
        'import { openai } from "@ai-sdk/openai";\n',
      ),
    ]);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain("src/app/api/match/route.ts");
  });

  it("AC5: the same transitive AI chain under /api/ai/ is allowed", () => {
    expect(
      aiRouteViolations([
        file(
          "src/app/api/ai/search/route.ts",
          'import { search } from "@/server/services/search";\n',
        ),
        file(
          "src/server/services/search.ts",
          'import { runAi } from "@/server/ai/run";\n',
        ),
      ]),
    ).toEqual([]);
  });

  it("AC5: a cycle with no AI imported by a route outside the prefix is allowed", () => {
    expect(
      aiRouteViolations([
        file(
          "src/app/api/cycle/route.ts",
          'import { a } from "@/server/services/a";\n',
        ),
        file("src/server/services/a.ts", 'import { b } from "./b";\n'),
        file("src/server/services/b.ts", 'import { a } from "./a";\n'),
      ]),
    ).toEqual([]);
  });

  it("AC5: a non-AI service chain outside the prefix is allowed", () => {
    expect(
      aiRouteViolations([
        file(
          "src/app/api/jobs/route.ts",
          'import { listJobs } from "@/server/services/jobs";\n',
        ),
        file(
          "src/server/services/jobs.ts",
          'import { db } from "@/server/db";\n',
        ),
        file("src/server/db.ts", "export const db = {};\n"),
      ]),
    ).toEqual([]);
  });

  it("AC5: a route group under /api/ai/ is a violation", () => {
    const violations = aiRouteViolations([
      file("src/app/api/ai/(x)/route.ts", "export function GET() { return null; }\n"),
    ]);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain("src/app/api/ai/(x)/route.ts");
  });

  it("AC5: an optional catch-all at /api/ai is a violation", () => {
    const violations = aiRouteViolations([
      file(
        "src/app/api/ai/[[...slug]]/route.ts",
        "export function GET() { return null; }\n",
      ),
    ]);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain("src/app/api/ai/[[...slug]]/route.ts");
  });

  it("AC5: a required catch-all under /api/ai/ is allowed", () => {
    expect(
      aiRouteViolations([
        file(
          "src/app/api/ai/[...slug]/route.ts",
          "export function GET() { return null; }\n",
        ),
      ]),
    ).toEqual([]);
  });

  it("AC5: a dynamic segment under /api/ai/ is allowed", () => {
    expect(
      aiRouteViolations([
        file(
          "src/app/api/ai/search/[id]/route.ts",
          "export function GET() { return null; }\n",
        ),
      ]),
    ).toEqual([]);
  });
});
