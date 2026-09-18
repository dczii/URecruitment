import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SIGNED_URL_EXPIRES_IN_SECONDS,
  signCvFilePath,
  uploadCvFile,
} from "./storage";

const STORAGE_SOURCE_PATH = join(process.cwd(), "src/server/storage.ts");

/** Path convention inside the private `cv-files` bucket: `<kind>/<uuid>/<filename>`. */
const VALID_CV_PATH =
  "cv/2f1e4c8a-9b3d-4e71-a2c5-8d9f0e1a2b3c/Aisha-Tan-CV.pdf";

const FIFTY_MB = 50 * 1024 * 1024;

/** Synthetic PDF magic (`%PDF`). Not a real CV. */
const PDF_MAGIC = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

/** Synthetic PNG magic. Used to prove type checks are not extension-only. */
const PNG_MAGIC = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

function firstNonEmptyLine(source: string): string {
  for (const line of source.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return "";
}

function readStorageSource(): string {
  return readFileSync(STORAGE_SOURCE_PATH, "utf8");
}

/**
 * Tiny PDF header that *reports* a length over the 50 MB cap, so the unit
 * suite never allocates a 50 MB buffer (testing: small synthetic fixtures).
 * The helper must reject on `bytes.byteLength` / `bytes.length`.
 */
function oversizedPdfBytes(): Uint8Array {
  return new Proxy(PDF_MAGIC, {
    get(target, property, receiver) {
      if (property === "byteLength" || property === "length") {
        return FIFTY_MB + 1;
      }
      const value = Reflect.get(target, property, receiver) as unknown;
      if (typeof value === "function") {
        return (value as (...args: never[]) => unknown).bind(target);
      }
      return value;
    },
  });
}

async function expectRejection(
  run: () => unknown,
  messagePattern: RegExp,
): Promise<Error> {
  try {
    await run();
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    if (error instanceof Error) {
      expect(error.message.length).toBeGreaterThan(0);
      expect(error.message).toMatch(messagePattern);
      return error;
    }
  }
  throw new Error("expected the storage helper to reject with a clear error");
}

describe("storage (AC2, AC4, AC5)", () => {
  it("AC2: signs a path for a short-lived URL", async () => {
    expect(SIGNED_URL_EXPIRES_IN_SECONDS).toBe(300);
    expect(SIGNED_URL_EXPIRES_IN_SECONDS).toBeLessThanOrEqual(300);

    const source = readStorageSource();
    expect(source).toMatch(
      /expiresInSeconds\s*=\s*(?:SIGNED_URL_EXPIRES_IN_SECONDS|300)\b/,
    );

    await expectRejection(
      () => signCvFilePath(VALID_CV_PATH, SIGNED_URL_EXPIRES_IN_SECONDS + 1),
      /300|expires|lifetime|at most|maximum/i,
    );
  });

  it("AC4: rejects a path outside the bucket", async () => {
    const outsideBucket = [
      "public/2f1e4c8a-9b3d-4e71-a2c5-8d9f0e1a2b3c/Aisha-Tan-CV.pdf",
      "avatars/2f1e4c8a-9b3d-4e71-a2c5-8d9f0e1a2b3c/photo.png",
      "../etc/passwd",
      "other-bucket/cv/2f1e4c8a-9b3d-4e71-a2c5-8d9f0e1a2b3c/Aisha-Tan-CV.pdf",
    ];

    for (const path of outsideBucket) {
      const error = await expectRejection(
        () => signCvFilePath(path),
        /cv-files|allowed prefix|kind|bucket|path/i,
      );
      expect(error.message.toLowerCase()).not.toBe("error");
    }
  });

  it("AC4: rejects an oversized or disallowed upload", async () => {
    await expectRejection(
      () => uploadCvFile(VALID_CV_PATH, oversizedPdfBytes(), "application/pdf"),
      /50\s*MB|too large|size|oversized/i,
    );

    // `.pdf` name + `application/pdf` declared type, but PNG magic bytes.
    const spoofedPdfPath =
      "cv/2f1e4c8a-9b3d-4e71-a2c5-8d9f0e1a2b3c/Aisha-Tan-CV.pdf";
    await expectRejection(
      () => uploadCvFile(spoofedPdfPath, PNG_MAGIC, "application/pdf"),
      /pdf|docx|type|magic|content|allowed/i,
    );

    const spoofedDocxPath =
      "cv/2f1e4c8a-9b3d-4e71-a2c5-8d9f0e1a2b3c/Aisha-Tan-CV.docx";
    await expectRejection(
      () =>
        uploadCvFile(
          spoofedDocxPath,
          PNG_MAGIC,
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ),
      /pdf|docx|type|magic|content|allowed/i,
    );
  });

  it("AC5: cannot be imported from client code", () => {
    const source = readStorageSource();
    expect(firstNonEmptyLine(source)).toBe('import "server-only";');
  });
});
