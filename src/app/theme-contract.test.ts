import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

type TokenKind = "colour" | "typography" | "spacing" | "radius-shadow";

interface DocumentedToken {
  kind: TokenKind;
  name: string;
  cssVariable: string;
  tailwindTokens: string[];
}

const TOKENS_PATH = join(process.cwd(), "design/tokens.md");
const GLOBALS_PATH = join(process.cwd(), "src/app/globals.css");

function stripTicks(value: string): string {
  return value.replaceAll("`", "").trim();
}

function kindFromHeading(heading: string): TokenKind | null {
  const normalized = heading.trim().toLowerCase();
  if (
    normalized.startsWith("colour") ||
    normalized.includes("delay status") ||
    normalized.includes("ai role")
  ) {
    return "colour";
  }
  if (normalized.startsWith("typography")) {
    return "typography";
  }
  if (normalized.startsWith("spacing")) {
    return "spacing";
  }
  if (normalized.includes("radius") || normalized.includes("shadow")) {
    return "radius-shadow";
  }
  return null;
}

function parseDocumentedTokens(markdown: string): DocumentedToken[] {
  const tokens: DocumentedToken[] = [];
  let kind: TokenKind | null = null;
  let headers: string[] | null = null;

  for (const line of markdown.split("\n")) {
    if (line.startsWith("## ")) {
      kind = kindFromHeading(line.slice(3));
      headers = null;
      continue;
    }

    if (!kind || !line.startsWith("|")) {
      continue;
    }

    const cells = line
      .slice(1, line.endsWith("|") ? -1 : undefined)
      .split("|")
      .map((cell) => cell.trim());

    if (cells.some((cell) => /^:?-{3,}:?$/.test(cell))) {
      continue;
    }

    const headerLike = cells.map((cell) => cell.toLowerCase());
    if (
      headerLike.includes("token") &&
      headerLike.some((cell) => cell.includes("css variable"))
    ) {
      headers = headerLike;
      continue;
    }

    if (!headers) {
      continue;
    }

    const tokenIndex = headers.indexOf("token");
    const cssIndex = headers.findIndex((header) =>
      header.includes("css variable"),
    );
    const tailwindIndex = headers.findIndex((header) =>
      header.includes("tailwind"),
    );
    if (tokenIndex < 0 || cssIndex < 0 || tailwindIndex < 0) {
      continue;
    }

    const name = stripTicks(cells[tokenIndex] ?? "");
    const cssVariable = stripTicks(cells[cssIndex] ?? "");
    const tailwindTokens = stripTicks(cells[tailwindIndex] ?? "")
      .split(",")
      .map((token) => token.trim())
      .filter(Boolean);

    if (!name || !cssVariable.startsWith("--") || tailwindTokens.length === 0) {
      continue;
    }

    tokens.push({ kind, name, cssVariable, tailwindTokens });
  }

  return tokens;
}

function extractBlock(css: string, prelude: string): string {
  const match = css.match(new RegExp(`${prelude}\\s*\\{`));
  if (!match || match.index === undefined) {
    return "";
  }

  let depth = 1;
  let index = match.index + match[0].length;
  const start = index;
  while (index < css.length && depth > 0) {
    const char = css[index];
    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
    }
    index += 1;
  }

  return css.slice(start, index - 1);
}

function declaredCustomProperties(css: string): Set<string> {
  const names = new Set<string>();
  for (const match of css.matchAll(/(--[a-z0-9-]+)\s*:/gi)) {
    names.add(match[1] ?? "");
  }
  names.delete("");
  return names;
}

function expectedThemeMapping(token: DocumentedToken): {
  property: string;
  value?: string;
} {
  const value = `var(${token.cssVariable})`;

  if (token.kind === "colour") {
    return { property: `--color-${token.name}`, value };
  }

  if (token.kind === "spacing") {
    const step = token.name.replace(/^space-/, "");
    return { property: `--spacing-${step}`, value };
  }

  return { property: token.cssVariable };
}

function hasThemeMapping(
  themeCss: string,
  property: string,
  value?: string,
): boolean {
  const collapsed = themeCss.replace(/\s+/g, " ");
  if (!value) {
    return new RegExp(`${property.replaceAll("-", "\\-")}\\s*:`).test(
      collapsed,
    );
  }
  const pattern = new RegExp(
    `${property.replaceAll("-", "\\-")}\\s*:\\s*${value
      .replaceAll("(", "\\(")
      .replaceAll(")", "\\)")
      .replaceAll("-", "\\-")}`,
  );
  return pattern.test(collapsed);
}

describe("design token source", () => {
  it("AC1: documents every required semantic token group", () => {
    const tokensMd = readFileSync(TOKENS_PATH, "utf8");
    const tokenNames = parseDocumentedTokens(tokensMd).map(
      ({ name }) => name,
    );

    for (const heading of [
      "## Colour",
      "## Delay status and AI roles",
      "## Typography",
      "## Spacing",
      "## Radius and shadow",
    ]) {
      expect(tokensMd).toContain(heading);
    }

    expect(tokenNames).toEqual(
      expect.arrayContaining([
        "background",
        "primary",
        "status-on-track",
        "status-due-soon",
        "status-overdue",
        "ai-suggestion-bg",
        "font-sans",
        "text-body",
        "space-4",
        "radius-md",
        "shadow-sm",
      ]),
    );
  });
});

describe("theme contract (AC4)", () => {
  it("AC4: every documented colour, type, spacing, radius and shadow token has a CSS variable and Tailwind v4 mapping", () => {
    const tokensMd = readFileSync(TOKENS_PATH, "utf8");
    const globalsCss = readFileSync(GLOBALS_PATH, "utf8");
    const tokens = parseDocumentedTokens(tokensMd);

    expect(tokens.map((token) => token.name)).toEqual(
      expect.arrayContaining([
        "background",
        "destructive-foreground",
        "status-on-track",
        "ai-suggestion-bg",
        "font-sans",
        "text-display",
        "numeric-tabular",
        "space-4",
        "radius-md",
        "shadow-sm",
      ]),
    );
    expect(tokens).toHaveLength(58);

    const themeInline = extractBlock(globalsCss, "@theme\\s+inline");
    const rootBlock = extractBlock(globalsCss, ":root");
    const darkBlock = extractBlock(globalsCss, "\\.dark");
    const declared = declaredCustomProperties(globalsCss);
    const declaredInRoot = declaredCustomProperties(rootBlock);
    const declaredInDark = declaredCustomProperties(darkBlock);

    expect(themeInline.length).toBeGreaterThan(0);
    expect(rootBlock.length).toBeGreaterThan(0);
    expect(darkBlock.length).toBeGreaterThan(0);

    const missing: string[] = [];

    for (const token of tokens) {
      if (!declared.has(token.cssVariable)) {
        missing.push(
          `${token.cssVariable} is not declared as a CSS custom property in src/app/globals.css`,
        );
      }

      if (token.kind === "colour") {
        if (!declaredInRoot.has(token.cssVariable)) {
          missing.push(`${token.cssVariable} is not assigned in :root`);
        }
        if (!declaredInDark.has(token.cssVariable)) {
          missing.push(`${token.cssVariable} is not assigned in .dark`);
        }
      }

      const mapping = expectedThemeMapping(token);
      if (!hasThemeMapping(themeInline, mapping.property, mapping.value)) {
        missing.push(
          `@theme inline is missing ${mapping.property}${
            mapping.value ? `: ${mapping.value}` : ""
          }`,
        );
      }
    }

    expect(missing, missing.join("\n")).toEqual([]);
  });
});
