import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { getDb } from "../db";
import { REJECTION_MESSAGES, recordCvFileRejection } from "./rejections";

vi.mock("../db", () => ({ getDb: vi.fn() }));

const REJECTIONS_SOURCE_PATH = join(
  process.cwd(),
  "src/server/cv/rejections.ts",
);

/** Hard-coded closed set — do not import a type as a runtime value. */
const EXPECTED_REASON_CODES = [
  "image_only_or_scanned",
  "unsupported_type",
  "too_large",
  "no_usable_text",
  "parse_failed_schema_validation",
] as const;

/** Fictional cv_files.id — never a real candidate row. */
const CV_FILE_ID = "00000000-0000-0000-0000-000000000001";

function firstNonEmptyLine(source: string): string {
  for (const line of source.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return "";
}

function readRejectionsSource(): string {
  return readFileSync(REJECTIONS_SOURCE_PATH, "utf8");
}

function mockCvFilesClient(result: { error: { message: string } | null }) {
  const eq = vi.fn().mockResolvedValue(result);
  const update = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ update });
  vi.mocked(getDb).mockReturnValue({ from } as never);
  return { from, update, eq };
}

describe("cv rejections (AC2, AC3)", () => {
  it("AC3: every one of the five reason codes has a message (exhaustive)", () => {
    expect(Object.keys(REJECTION_MESSAGES).sort()).toEqual(
      [...EXPECTED_REASON_CODES].sort(),
    );

    for (const code of EXPECTED_REASON_CODES) {
      const message = REJECTION_MESSAGES[code];
      expect(typeof message).toBe("string");
      expect(message.trim().length).toBeGreaterThan(0);
    }
  });

  it("AC2: the scanned-file message names the scan as the cause and says no text recognition is available", () => {
    const scannedMessage = REJECTION_MESSAGES.image_only_or_scanned;
    expect(scannedMessage).toMatch(/scan/i);
    expect(scannedMessage).toMatch(/no text recognition/i);
  });

  it("AC3: writes a stored reason code and message to cv_files", async () => {
    const { from, update } = mockCvFilesClient({ error: null });

    await recordCvFileRejection(CV_FILE_ID, "image_only_or_scanned");

    expect(from).toHaveBeenCalledWith("cv_files");
    expect(update).toHaveBeenCalledTimes(1);

    const payload = update.mock.calls[0]?.[0] as {
      parse_status?: unknown;
      parse_error?: unknown;
    };
    expect(payload.parse_status).toBe("rejected");
    expect(typeof payload.parse_error).toBe("string");
    expect(payload.parse_error).toContain("image_only_or_scanned");
    expect(payload.parse_error).toContain(
      REJECTION_MESSAGES.image_only_or_scanned,
    );
  });

  it("AC3: every rejection path leaves cv_files with a status", async () => {
    for (const code of EXPECTED_REASON_CODES) {
      const { update } = mockCvFilesClient({ error: null });

      await recordCvFileRejection(CV_FILE_ID, code);

      expect(update).toHaveBeenCalled();
      const payload = update.mock.calls[0]?.[0] as {
        parse_status?: unknown;
        parse_error?: unknown;
      };
      expect(typeof payload.parse_status).toBe("string");
      expect(String(payload.parse_status).trim().length).toBeGreaterThan(0);
      expect(typeof payload.parse_error).toBe("string");
      expect(String(payload.parse_error).trim().length).toBeGreaterThan(0);
    }
  });

  it("AC3: surfaces a DB error, doesn't swallow it", async () => {
    mockCvFilesClient({ error: { message: "boom" } });

    let thrown: unknown;
    try {
      await recordCvFileRejection(CV_FILE_ID, "too_large");
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect(thrown).not.toBeUndefined();
    expect(thrown).not.toEqual({ message: "boom" });

    const message = thrown instanceof Error ? thrown.message : "";
    expect(message.length).toBeGreaterThan(0);
    expect(message.toLowerCase()).not.toBe("error");
  });

  it('starts with import "server-only"', () => {
    const source = readRejectionsSource();
    expect(firstNonEmptyLine(source)).toBe('import "server-only";');
  });
});
