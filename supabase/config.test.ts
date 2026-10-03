import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("local Supabase email templates", () => {
  it("resolves configured templates from the project root used by the CLI", () => {
    const config = readFileSync(resolve("supabase/config.toml"), "utf8");
    const paths = [...config.matchAll(/^content_path\s*=\s*"([^"]+)"/gm)];
    expect(paths.length).toBeGreaterThan(0);
    for (const [, path] of paths) {
      const template = readFileSync(resolve(path), "utf8");
      expect(template).toContain("{{ .Token }}");
      expect(template).not.toContain("{{ .ConfirmationURL }}");
    }
  });
});
