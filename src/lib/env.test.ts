import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  parsePublicEnv,
  PUBLIC_ENV_KEYS,
  isSecretShapedName,
  readEnvExampleNames,
} from "./env";
import { SERVER_ENV_KEYS } from "../server/env";

describe("public env (AC2, AC9, AC10)", () => {
  it("AC9: every public key starts with NEXT_PUBLIC_", () => {
    expect(PUBLIC_ENV_KEYS.length).toBeGreaterThan(0);
    for (const key of PUBLIC_ENV_KEYS) {
      expect(key.startsWith("NEXT_PUBLIC_")).toBe(true);
    }
  });

  it("AC9: no public variable is secret-shaped", () => {
    for (const key of PUBLIC_ENV_KEYS) {
      expect(isSecretShapedName(key)).toBe(false);
    }
  });

  it("AC9: isSecretShapedName recognises secrets and allows DSNs", () => {
    const cases: Array<[string, boolean]> = [
      ["SUPABASE_SECRET_KEY", true],
      ["BLOB_READ_WRITE_TOKEN", true],
      ["SUPABASE_DEV_DB_PASSWORD", true],
      ["OPENAI_API_KEY", true],
      ["NEXT_PUBLIC_SENTRY_DSN", false],
      ["MUST_HAVE_CAP", false],
      ["KEYBOARD_LAYOUT", false],
      // Added by the 2026-09-18 security review: the first guard missed all of
      // these, which are the likeliest names for a leaked secret.
      ["NEXT_PUBLIC_SUPABASE_SERVICE_ROLE", true],
      ["NEXT_PUBLIC_OPENAI_APIKEY", true],
      ["NEXT_PUBLIC_AI_KEYS", true],
      ["NEXT_PUBLIC_AI_CREDENTIALS", true],
      ["SENTRY_SIGNING_KEY", true],
      ["GITHUB_PAT", true],
      ["TLS_PEM", true],
      ["SUPABASE_DEV_DB_PASSWD", true],
    ];
    for (const [name, expected] of cases) {
      expect(isSecretShapedName(name), name).toBe(expected);
    }
  });

  it("AC9: .env.example declares no secret-shaped NEXT_PUBLIC_ name", () => {
    const text = readFileSync(join(process.cwd(), ".env.example"), "utf8");
    const names = readEnvExampleNames(text);
    for (const name of names) {
      if (name.startsWith("NEXT_PUBLIC_")) {
        expect(isSecretShapedName(name)).toBe(false);
      }
    }
  });

  it("AC10: .env.example lists names only", () => {
    const text = readFileSync(join(process.cwd(), ".env.example"), "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.length === 0 || trimmed.startsWith("#")) {
        continue;
      }
      expect(trimmed).toMatch(/^[A-Z][A-Z0-9_]*=$/);
    }
  });

  it("AC10: .env.example lists every variable the schemas know", () => {
    const text = readFileSync(join(process.cwd(), ".env.example"), "utf8");
    const names = readEnvExampleNames(text);
    for (const key of [...SERVER_ENV_KEYS, ...PUBLIC_ENV_KEYS]) {
      expect(names).toContain(key);
    }
  });

  it("AC9: the public env module does not import server code", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/env.ts"), "utf8");
    expect(source).not.toContain("server-only");
    expect(source).not.toContain("@/server");
  });

  it("AC2: parsePublicEnv rejects a malformed DSN without printing it", () => {
    const badDsn = "definitely-not-a-dsn";
    let thrown: unknown;
    try {
      parsePublicEnv({ NEXT_PUBLIC_SENTRY_DSN: badDsn });
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(Error);
    const message = thrown instanceof Error ? thrown.message : String(thrown);
    expect(message).toContain("NEXT_PUBLIC_SENTRY_DSN");
    expect(message).not.toContain(badDsn);
  });
});
