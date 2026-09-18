import "server-only";

import { z } from "zod";

const requirementRowSchema = z.object({
  text: z.string(),
  marking: z.enum(["must_have", "nice_to_have"]),
});

function hasWrittenReason(reason: string | null | undefined): boolean {
  return reason != null && reason.trim().length > 0;
}

/**
 * App-level guardrail for a `job_versions` insert. Mirrors
 * `job_versions_nationality_reason_check` and
 * `job_versions_language_reason_check`: a written, non-blank reason is
 * required only when the matching `requires_*` flag is true.
 */
export const jobVersionInputSchema = z
  .object({
    fields: z.record(z.string(), z.unknown()),
    must_haves: z.array(requirementRowSchema),
    nice_to_haves: z.array(requirementRowSchema),
    requires_nationality: z.boolean().default(false),
    nationality_reason: z.string().nullable().optional(),
    requires_language: z.boolean().default(false),
    language_reason: z.string().nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.requires_nationality &&
      !hasWrittenReason(value.nationality_reason)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["nationality_reason"],
        message:
          "A written reason is required when nationality is a real requirement.",
      });
    }

    if (value.requires_language && !hasWrittenReason(value.language_reason)) {
      ctx.addIssue({
        code: "custom",
        path: ["language_reason"],
        message:
          "A written reason is required when language is a real requirement.",
      });
    }
  });
