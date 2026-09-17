import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseServerEnv, EnvError } from "./env";

const VALID_URL = "http://127.0.0.1:54321";
const VALID_SECRET = "test-secret-key";

function firstNonEmptyLine(source: string): string {
  for (const line of source.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return "";
}

function expectThrownEnvError(run: () => unknown): EnvError {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(EnvError);
    if (error instanceof EnvError) {
      return error;
    }
  }
  throw new Error("expected EnvError to be thrown");
}

describe("server env (AC2, AC9)", () => {
  it("AC2: a missing required variable throws naming the variable", () => {
    const error = expectThrownEnvError(() => parseServerEnv({}));
    expect(error.message).toContain("SUPABASE_URL");
    expect(error.message).toContain("SUPABASE_SECRET_KEY");
    expect(error.message).toContain("SUPABASE_URL (missing)");
    expect(error.message).toContain("SUPABASE_SECRET_KEY (missing)");
    expect(error.message).toContain(
      "See .env.example and docs/plans/infrastructure.md.",
    );
    expect(error.variables).toEqual(
      expect.arrayContaining(["SUPABASE_URL", "SUPABASE_SECRET_KEY"]),
    );
  });

  it("AC2: a malformed URL is rejected and named", () => {
    const error = expectThrownEnvError(() =>
      parseServerEnv({
        SUPABASE_URL: "not-a-url",
        SUPABASE_SECRET_KEY: VALID_SECRET,
      }),
    );
    expect(error.message).toContain("SUPABASE_URL");
    expect(error.message).toContain("invalid");
    expect(error.message).not.toContain("not-a-url");
    expect(error.variables).toContain("SUPABASE_URL");
  });

  it("AC2: no value ever appears in the error message", () => {
    const badUrl = "definitely not a url";
    const secret = "sk-test-DO-NOT-PRINT-123";
    const badDsn = "also-bad";
    const badCap = "-5";
    const error = expectThrownEnvError(() =>
      parseServerEnv({
        SUPABASE_URL: badUrl,
        SUPABASE_SECRET_KEY: secret,
        SENTRY_DSN: badDsn,
        AI_MONTHLY_SPEND_CAP: badCap,
      }),
    );
    expect(error.message).not.toContain(badUrl);
    expect(error.message).not.toContain(secret);
    expect(error.message).not.toContain(badDsn);
    expect(error.message).not.toContain(badCap);
    expect(error.message).toContain("SUPABASE_URL");
    expect(error.message).toContain("SENTRY_DSN");
    expect(error.message).toContain("AI_MONTHLY_SPEND_CAP");
  });

  it("AC2: valid input parses, optional values default or stay undefined", () => {
    const requiredOnly = parseServerEnv({
      SUPABASE_URL: VALID_URL,
      SUPABASE_SECRET_KEY: VALID_SECRET,
    });
    expect(requiredOnly.MUST_HAVE_CAP).toBe(50);
    expect(requiredOnly.AI_MODEL_PARSE).toBeUndefined();

    const withSpendCap = parseServerEnv({
      SUPABASE_URL: VALID_URL,
      SUPABASE_SECRET_KEY: VALID_SECRET,
      AI_MONTHLY_SPEND_CAP: "25",
    });
    expect(withSpendCap.AI_MONTHLY_SPEND_CAP).toBe(25);
  });

  it("AC2: an empty string counts as missing for a required variable", () => {
    const error = expectThrownEnvError(() =>
      parseServerEnv({
        SUPABASE_URL: "",
        SUPABASE_SECRET_KEY: VALID_SECRET,
      }),
    );
    expect(error.variables).toContain("SUPABASE_URL");
    expect(error.message).toContain("SUPABASE_URL (missing)");
    expect(error.message).not.toContain(VALID_SECRET);
  });

  it("AC2: MUST_HAVE_CAP outside 0–100 is rejected", () => {
    const tooHigh = expectThrownEnvError(() =>
      parseServerEnv({
        SUPABASE_URL: VALID_URL,
        SUPABASE_SECRET_KEY: VALID_SECRET,
        MUST_HAVE_CAP: "101",
      }),
    );
    expect(tooHigh.variables).toContain("MUST_HAVE_CAP");
    expect(tooHigh.message).toContain("MUST_HAVE_CAP");
    expect(tooHigh.message).toContain("invalid");
    expect(tooHigh.message).not.toContain("101");

    const tooLow = expectThrownEnvError(() =>
      parseServerEnv({
        SUPABASE_URL: VALID_URL,
        SUPABASE_SECRET_KEY: VALID_SECRET,
        MUST_HAVE_CAP: "-1",
      }),
    );
    expect(tooLow.variables).toContain("MUST_HAVE_CAP");
    expect(tooLow.message).toContain("invalid");
    expect(tooLow.message).not.toContain("-1");
  });

  it("AC9: the server env module is server-only", () => {
    const source = readFileSync(
      join(process.cwd(), "src/server/env.ts"),
      "utf8",
    );
    expect(firstNonEmptyLine(source)).toBe('import "server-only";');
  });
});
