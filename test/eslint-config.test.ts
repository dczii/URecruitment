import { join } from "node:path";

import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const DESIGN_TOKEN_RULE_ID = "design-tokens/no-hardcoded";

function componentPath(filename: string): string {
  return join(process.cwd(), "src/components", filename);
}

function designTokenErrors(messages: ESLint.LintResult["messages"]) {
  return messages.filter(
    (message) =>
      message.ruleId === DESIGN_TOKEN_RULE_ID && message.severity === 2,
  );
}

async function lintVirtualComponent(filename: string, code: string) {
  const eslint = new ESLint({
    cwd: process.cwd(),
    overrideConfigFile: join(process.cwd(), "eslint.config.mjs"),
  });

  const results = await eslint.lintText(code, {
    filePath: componentPath(filename),
  });

  expect(results.length).toBeGreaterThan(0);
  return results[0]?.messages ?? [];
}

describe("design-token ESLint guard (AC6)", () => {
  it("AC6: a hexadecimal colour in src/components reports the design-token guard", async () => {
    const messages = await lintVirtualComponent(
      "hex-colour-literal.tsx",
      `export function HexColourSample() {
  return <span className="text-[#1D4ED8]">hex colour</span>;
}
`,
    );

    expect(
      designTokenErrors(messages),
      `expected ${DESIGN_TOKEN_RULE_ID} error for a hex colour, got: ${JSON.stringify(messages)}`,
    ).not.toHaveLength(0);
  });

  it("AC6: a text-[Npx] font size in src/components reports the design-token guard", async () => {
    const messages = await lintVirtualComponent(
      "pixel-font-size.tsx",
      `export function PixelFontSizeSample() {
  return <span className="text-[13px]">pixel font size</span>;
}
`,
    );

    expect(
      designTokenErrors(messages),
      `expected ${DESIGN_TOKEN_RULE_ID} error for text-[13px], got: ${JSON.stringify(messages)}`,
    ).not.toHaveLength(0);
  });

  it("AC6: semantic token utilities in src/components pass the design-token guard", async () => {
    const messages = await lintVirtualComponent(
      "semantic-tokens.tsx",
      `export function SemanticTokenSample() {
  return (
    <span className="bg-background text-foreground text-body p-4 rounded-md shadow-sm">
      semantic tokens
    </span>
  );
}
`,
    );

    expect(designTokenErrors(messages)).toEqual([]);
  });
});
