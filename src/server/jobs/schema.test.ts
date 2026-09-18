import { describe, expect, it } from "vitest";
import { jobVersionInputSchema } from "./schema";

/**
 * T1a contract — implement `jobVersionInputSchema` in `src/server/jobs/schema.ts`.
 *
 * Input mirrors `job_versions` columns: `fields`, `must_haves`, `nice_to_haves`,
 * `requires_nationality`, `nationality_reason`, `requires_language`,
 * `language_reason`.
 *
 * Each requirement in `must_haves` / `nice_to_haves` is `{ text, marking }`
 * where `marking` is `"must_have"` | `"nice_to_have"` — an unmarked row is
 * invalid (AC1).
 *
 * Nationality/language reasons must be non-null and non-blank after trim when
 * the matching `requires_*` flag is true — same rule as
 * `job_versions_nationality_reason_check` /
 * `job_versions_language_reason_check`. When the flag is false or omitted,
 * the reason is optional (AC2).
 */

const NATIONALITY_REASON =
  "The client's MAS-regulated desk requires Singapore citizenship for on-site access.";
const LANGUAGE_REASON =
  "Daily stand-ups with the client's Shanghai team are held in Mandarin.";

function validJobVersionInput(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    fields: { title: "Senior Backend Engineer" },
    must_haves: [
      {
        text: "Five years of Python in a backend role",
        marking: "must_have",
      },
    ],
    nice_to_haves: [
      {
        text: "Experience running services on AWS",
        marking: "nice_to_have",
      },
    ],
    requires_nationality: false,
    nationality_reason: null,
    requires_language: false,
    language_reason: null,
    ...overrides,
  };
}

function omitKeys(
  input: Record<string, unknown>,
  keys: string[],
): Record<string, unknown> {
  const next = { ...input };
  for (const key of keys) {
    delete next[key];
  }
  return next;
}

describe("jobVersionInputSchema", () => {
  it("AC1: rejects a requirement with no must-have/nice-to-have marking", () => {
    const result = jobVersionInputSchema.safeParse(
      validJobVersionInput({
        must_haves: [{ text: "Five years of Python in a backend role" }],
      }),
    );

    expect(result.success).toBe(false);
  });

  it("AC2: rejects requires_nationality true with no nationality_reason", () => {
    const missingField = jobVersionInputSchema.safeParse(
      validJobVersionInput({
        requires_nationality: true,
        nationality_reason: undefined,
      }),
    );
    const absentField = jobVersionInputSchema.safeParse(
      omitKeys(validJobVersionInput({ requires_nationality: true }), [
        "nationality_reason",
      ]),
    );
    const nullReason = jobVersionInputSchema.safeParse(
      validJobVersionInput({
        requires_nationality: true,
        nationality_reason: null,
      }),
    );

    expect(missingField.success).toBe(false);
    expect(absentField.success).toBe(false);
    expect(nullReason.success).toBe(false);
  });

  it("AC2: rejects requires_language true with no language_reason", () => {
    const absentField = jobVersionInputSchema.safeParse(
      omitKeys(validJobVersionInput({ requires_language: true }), [
        "language_reason",
      ]),
    );
    const nullReason = jobVersionInputSchema.safeParse(
      validJobVersionInput({
        requires_language: true,
        language_reason: null,
      }),
    );

    expect(absentField.success).toBe(false);
    expect(nullReason.success).toBe(false);
  });

  it("AC2: rejects a whitespace-only nationality_reason when nationality is required", () => {
    const nationalityWhitespace = jobVersionInputSchema.safeParse(
      validJobVersionInput({
        requires_nationality: true,
        nationality_reason: "   ",
      }),
    );
    const languageWhitespace = jobVersionInputSchema.safeParse(
      validJobVersionInput({
        requires_language: true,
        language_reason: "   ",
      }),
    );

    expect(nationalityWhitespace.success).toBe(false);
    expect(languageWhitespace.success).toBe(false);
  });

  it("AC2: accepts nationality and language as required when each has a real written reason", () => {
    const result = jobVersionInputSchema.safeParse(
      validJobVersionInput({
        requires_nationality: true,
        nationality_reason: NATIONALITY_REASON,
        requires_language: true,
        language_reason: LANGUAGE_REASON,
      }),
    );

    expect(result.success).toBe(true);
  });

  it("AC2: accepts requires_nationality false or omitted with no reason", () => {
    const flagFalse = jobVersionInputSchema.safeParse(
      validJobVersionInput({
        requires_nationality: false,
        nationality_reason: null,
        requires_language: false,
        language_reason: null,
      }),
    );
    const omitted = jobVersionInputSchema.safeParse(
      omitKeys(validJobVersionInput(), [
        "requires_nationality",
        "nationality_reason",
      ]),
    );

    expect(flagFalse.success).toBe(true);
    expect(omitted.success).toBe(true);
  });
});
