import { describe, it, expect } from "vitest";
import { EnvError } from "@/lib/env-error";
import { assertBlobUrlInStore, parseSeedEnv } from "./env";

/** Fictional store address — never a real `*.public.blob.vercel-storage.com` URL. */
const VALID_BASE_URL = "https://example.com/sample-store/";
const VALID_TOKEN = "test-blob-read-token";

const COMPLETE_SOURCE = {
  BLOB_READ_WRITE_TOKEN: VALID_TOKEN,
  SEED_BLOB_BASE_URL: VALID_BASE_URL,
};

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

describe("seed env (AC117.1, AC117.2)", () => {
  it("AC117.1: aborts naming the missing variable when SEED_BLOB_BASE_URL is unset", () => {
    const error = expectThrownEnvError(() =>
      parseSeedEnv({
        BLOB_READ_WRITE_TOKEN: VALID_TOKEN,
      }),
    );
    expect(error.message).toContain("SEED_BLOB_BASE_URL");
    expect(error.message).toContain("SEED_BLOB_BASE_URL (missing)");
    expect(error.variables).toContain("SEED_BLOB_BASE_URL");
    expect(error.message).not.toContain(VALID_TOKEN);
  });

  it("AC117.1: aborts naming the missing variable when BLOB_READ_WRITE_TOKEN is unset", () => {
    const error = expectThrownEnvError(() =>
      parseSeedEnv({
        SEED_BLOB_BASE_URL: VALID_BASE_URL,
      }),
    );
    expect(error.message).toContain("BLOB_READ_WRITE_TOKEN");
    expect(error.message).toContain("BLOB_READ_WRITE_TOKEN (missing)");
    expect(error.variables).toContain("BLOB_READ_WRITE_TOKEN");
    expect(error.message).not.toContain(VALID_BASE_URL);
  });

  it("AC117.1: aborts naming both variables when neither is set", () => {
    const error = expectThrownEnvError(() => parseSeedEnv({}));
    expect(error.message).toContain("SEED_BLOB_BASE_URL (missing)");
    expect(error.message).toContain("BLOB_READ_WRITE_TOKEN (missing)");
    expect(error.variables).toEqual(
      expect.arrayContaining(["SEED_BLOB_BASE_URL", "BLOB_READ_WRITE_TOKEN"]),
    );
  });

  it("AC117.1: an empty string counts as missing and the error names the variable with no value", () => {
    const error = expectThrownEnvError(() =>
      parseSeedEnv({
        BLOB_READ_WRITE_TOKEN: "",
        SEED_BLOB_BASE_URL: "",
      }),
    );
    expect(error.message).toContain("BLOB_READ_WRITE_TOKEN (missing)");
    expect(error.message).toContain("SEED_BLOB_BASE_URL (missing)");
    expect(error.variables).toEqual(
      expect.arrayContaining(["BLOB_READ_WRITE_TOKEN", "SEED_BLOB_BASE_URL"]),
    );
  });

  it("AC117.1: NEXT_PUBLIC_ prefixed names do not satisfy the required variables", () => {
    const error = expectThrownEnvError(() =>
      parseSeedEnv({
        NEXT_PUBLIC_BLOB_READ_WRITE_TOKEN: VALID_TOKEN,
        NEXT_PUBLIC_SEED_BLOB_BASE_URL: VALID_BASE_URL,
      }),
    );
    expect(error.variables).toEqual(
      expect.arrayContaining(["BLOB_READ_WRITE_TOKEN", "SEED_BLOB_BASE_URL"]),
    );
    expect(error.message).toContain("BLOB_READ_WRITE_TOKEN (missing)");
    expect(error.message).toContain("SEED_BLOB_BASE_URL (missing)");
    expect(error.message).not.toContain("NEXT_PUBLIC_BLOB_READ_WRITE_TOKEN");
    expect(error.message).not.toContain("NEXT_PUBLIC_SEED_BLOB_BASE_URL");
    expect(error.message).not.toContain(VALID_TOKEN);
    expect(error.message).not.toContain(VALID_BASE_URL);
  });

  it("AC117.1: no value ever appears in the error message", () => {
    const secret = "sk-test-DO-NOT-PRINT-blob-token";
    const badUrl = "definitely-not-a-url";
    const error = expectThrownEnvError(() =>
      parseSeedEnv({
        BLOB_READ_WRITE_TOKEN: secret,
        SEED_BLOB_BASE_URL: badUrl,
      }),
    );
    expect(error.message).not.toContain(secret);
    expect(error.message).not.toContain(badUrl);
    expect(error.message).toContain("SEED_BLOB_BASE_URL");
  });

  it("AC117.1: returns blobToken and blobBaseUrl when both variables are set", () => {
    const env = parseSeedEnv(COMPLETE_SOURCE);
    expect(env.blobToken).toBe(VALID_TOKEN);
    expect(env.blobBaseUrl).toBe(VALID_BASE_URL);
  });

  it("AC117.2: aborts when a listed file URL does not start with SEED_BLOB_BASE_URL", () => {
    expect(() =>
      assertBlobUrlInStore(
        "https://evil.example.net/other-store/cv.pdf",
        VALID_BASE_URL,
      ),
    ).toThrow();
  });

  it("AC117.2: aborts when the URL is a different store that only shares a host prefix", () => {
    expect(() =>
      assertBlobUrlInStore(
        "https://example.com/sample-store-other/file.pdf",
        VALID_BASE_URL,
      ),
    ).toThrow();
  });

  it("AC117.2: the abort does not leak the listed URL or the configured base URL", () => {
    const listedUrl = "https://evil.example.net/other-store/cv.pdf";
    let thrown: unknown;
    try {
      assertBlobUrlInStore(listedUrl, VALID_BASE_URL);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(Error);
    const message = thrown instanceof Error ? thrown.message : String(thrown);
    expect(message).not.toContain(listedUrl);
    expect(message).not.toContain(VALID_BASE_URL);
  });

  it("AC117.2: accepts a listed URL that starts with the configured SEED_BLOB_BASE_URL", () => {
    expect(() =>
      assertBlobUrlInStore(`${VALID_BASE_URL}cv.pdf`, VALID_BASE_URL),
    ).not.toThrow();
  });
});
