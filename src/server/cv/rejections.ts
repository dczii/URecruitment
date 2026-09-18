import "server-only";

import { getDb } from "../db";

export type RejectionReasonCode =
  | "image_only_or_scanned"
  | "unsupported_type"
  | "too_large"
  | "no_usable_text"
  | "parse_failed_schema_validation";

export const REJECTION_MESSAGES: Record<RejectionReasonCode, string> = {
  image_only_or_scanned:
    "This file appears to be a scan or image, so it cannot be read. No text recognition is available.",
  unsupported_type:
    "This file type is not supported. Please upload a PDF or DOCX file.",
  too_large: "This file exceeds the size limit of 50 MB.",
  no_usable_text:
    "This file produced no usable text (for example an empty document), so it cannot be turned into a profile.",
  parse_failed_schema_validation:
    "The suggested parse of this file did not match the expected fields, so it cannot be used as a profile yet.",
};

export async function recordCvFileRejection(
  cvFileId: string,
  code: RejectionReasonCode,
): Promise<void> {
  const { error } = await getDb()
    .from("cv_files")
    .update({
      parse_status: "rejected",
      parse_error: `${code}: ${REJECTION_MESSAGES[code]}`,
    })
    .eq("id", cvFileId);

  if (error) {
    throw new Error(
      `Failed to record CV file rejection for ${cvFileId}: ${error.message}`,
    );
  }
}
