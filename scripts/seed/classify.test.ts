import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { classifyDocument } from "./classify";

/**
 * Minimum confidence for a confident `cv` / `job_description` result.
 * Below this, the classifier must return `unclassified` rather than guess
 * (prd-context sample-data.md; AC119.1–AC119.4).
 */
const CONFIDENT_THRESHOLD = 0.6;

function readSeedFixture(filename: string): string {
  return readFileSync(
    join(process.cwd(), "test/fixtures/seed", filename),
    "utf8",
  );
}

describe("classifyDocument (AC119.1–AC119.4)", () => {
  it("AC119.1: classifies the English CV fixture as cv with confidence at or above the threshold", () => {
    const result = classifyDocument(readSeedFixture("cv-en.txt"));
    expect(result.kind).toBe("cv");
    expect(result.confidence).toBeGreaterThanOrEqual(CONFIDENT_THRESHOLD);
  });

  it("AC119.2: classifies the Simplified Chinese CV fixture as cv with confidence at or above the threshold", () => {
    const result = classifyDocument(readSeedFixture("cv-zh.txt"));
    expect(result.kind).toBe("cv");
    expect(result.confidence).toBeGreaterThanOrEqual(CONFIDENT_THRESHOLD);
  });

  it("AC119.3: classifies the English job-description fixture as job_description with confidence at or above the threshold", () => {
    const result = classifyDocument(readSeedFixture("jd-en.txt"));
    expect(result.kind).toBe("job_description");
    expect(result.confidence).toBeGreaterThanOrEqual(CONFIDENT_THRESHOLD);
  });

  it("AC119.4: classifies the ambiguous fixture as unclassified with a non-empty reason and confidence below the threshold", () => {
    const result = classifyDocument(readSeedFixture("ambiguous.txt"));
    expect(result.kind).toBe("unclassified");
    expect(result.reason).toEqual(expect.any(String));
    expect(result.reason.trim().length).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThan(CONFIDENT_THRESHOLD);
  });

  it("classifies a CV as cv even when its section headers are letter-spaced, as some PDF templates extract them", () => {
    const letterSpaced = [
      "Jordan Rivera-Test",
      "jordan.rivera@example.com · +65 8000 1234",
      "W O R K E X P E R I E N C E",
      "2020–2026 Fictional Corp — Engineer",
      "2017–2020 Imaginary Labs — Junior Engineer",
      "E D U C A T I O N",
      "2013–2017 Fictional University — B.Eng",
    ].join("\n");

    const result = classifyDocument(letterSpaced);
    expect(result.kind).toBe("cv");
    expect(result.confidence).toBeGreaterThanOrEqual(CONFIDENT_THRESHOLD);
  });
});
