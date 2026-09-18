import { NextResponse } from "next/server";
import { z } from "zod";

import { AI_FAILED_MESSAGE } from "@/lib/ai-routes";
import { getModel } from "@/server/ai/provider";
import { createSupabaseAiRunsWriter } from "@/server/ai/run-supabase";
import { extractCvText, type CvContentType } from "@/server/cv/extract";
import {
  assertSupportedJdFile,
  extractJobDescription,
} from "@/server/jobs/extract";
import { uploadCvFile } from "@/server/storage";

const PDF_CONTENT_TYPE: CvContentType = "application/pdf";
const DOCX_CONTENT_TYPE: CvContentType =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const uploadSchema = z.object({
  file: z.file({ error: "Upload a PDF or DOCX job description." }).min(1),
});

/**
 * POST /api/ai/extract-jd
 *
 * Multipart field `file`: a PDF or DOCX job description. Validates type/size,
 * stores the original in the private bucket under `jd/<uuid>/filename`,
 * extracts text, and returns schema-validated pre-fill JSON. Never returns a
 * signed URL. Never writes `jobs` / `job_versions`.
 */
export async function POST(request: Request) {
  let file: File;
  try {
    const formData = await request.formData();
    const parsed = uploadSchema.safeParse({ file: formData.get("file") });
    if (!parsed.success) {
      return errorJson(400, "Upload a PDF or DOCX job description.");
    }
    file = parsed.data.file;
  } catch {
    return errorJson(400, "Upload a PDF or DOCX job description.");
  }

  try {
    // Extension check first so an unreadable file never hits storage or a model.
    assertSupportedJdFile(file.name);

    const bytes = new Uint8Array(await file.arrayBuffer());
    const contentType = contentTypeFromFilename(file.name);
    const storagePath = `jd/${crypto.randomUUID()}/${storageFilename(file.name)}`;

    // Magic-byte + size validation happen inside uploadCvFile before the write.
    await uploadCvFile(storagePath, bytes, contentType);

    const extracted = await extractCvText(bytes, contentType);
    const prefill = await extractJobDescription({
      jdText: extracted.text,
      model: getModel("jd"),
      runs: createSupabaseAiRunsWriter(),
      filename: file.name,
    });

    return NextResponse.json(prefill);
  } catch (error) {
    return recruiterErrorResponse(error);
  }
}

function contentTypeFromFilename(filename: string): CvContentType {
  return filename.toLowerCase().endsWith(".docx")
    ? DOCX_CONTENT_TYPE
    : PDF_CONTENT_TYPE;
}

/** Basename only, no slashes — matches `ALLOWED_STORAGE_PATH`'s final segment. */
function storageFilename(filename: string): string {
  const base =
    filename.replaceAll("\\", "/").split("/").pop()?.trim() || "jd";
  const safe = base.replace(/[^A-Za-z0-9._-]+/g, "_");
  return safe.length > 0 ? safe : "jd";
}

function recruiterErrorResponse(error: unknown): NextResponse {
  const message =
    error instanceof Error && error.message.trim().length > 0
      ? error.message
      : AI_FAILED_MESSAGE;

  if (/not supported|PDF or DOCX|file type/i.test(message)) {
    return errorJson(400, message);
  }
  if (/too large|oversized|50\s*MB/i.test(message)) {
    return errorJson(413, message);
  }
  if (/magic|content type|allowed types/i.test(message)) {
    return errorJson(415, message);
  }

  return errorJson(500, AI_FAILED_MESSAGE);
}

function errorJson(status: number, error: string): NextResponse {
  return NextResponse.json({ error }, { status });
}
