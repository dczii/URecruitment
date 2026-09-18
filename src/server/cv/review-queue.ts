import "server-only";

import type { Database } from "@/lib/database.types";
import { getModel } from "../ai/provider";
import { createSupabaseAiRunsWriter } from "../ai/run-supabase";
import type { AiModel } from "../ai/types";
import { getDb } from "../db";
import { extractCvText, type CvContentType } from "./extract";
import { parseCv } from "./parse";

const CV_FILES_BUCKET = "cv-files";
const PDF_CONTENT_TYPE: CvContentType = "application/pdf";
const DOCX_CONTENT_TYPE: CvContentType =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

type CvFileRow = Database["public"]["Tables"]["cv_files"]["Row"];
type CvFileUpdate = Database["public"]["Tables"]["cv_files"]["Update"];

export type FailedCvFile = Pick<
  CvFileRow,
  "id" | "source_ref" | "parse_error" | "attempt_count" | "last_attempted_at"
>;

export async function listFailedCvFiles(): Promise<FailedCvFile[]> {
  const { data, error } = await getDb()
    .from("cv_files")
    .select("id, source_ref, parse_error, attempt_count, last_attempted_at")
    .eq("parse_status", "error");

  if (error) {
    throw new Error(`Failed to list failed CV files: ${error.message}`);
  }

  return data ?? [];
}

export async function retryParse(cvFileId: string): Promise<void> {
  const file = await loadCvFile(cvFileId);

  try {
    const fileBytes = await downloadCvFileBytes(file.storage_path);
    const extracted = await extractCvText(
      fileBytes,
      contentTypeFromSourceRef(file.source_ref),
    );

    if (!file.candidate_id) {
      throw new Error(`CV file ${cvFileId} has no candidate_id`);
    }

    await parseCv({
      candidateId: file.candidate_id,
      cvFileId: file.id,
      cvText: extracted.text,
      model: modelForRetry(),
      runs: createSupabaseAiRunsWriter(),
      quality: extracted.quality,
      fileBytes,
    });

    await updateCvFile(cvFileId, {
      parse_status: "parsed",
      parse_error: null,
    });
  } catch (error) {
    await updateCvFile(cvFileId, {
      parse_status: "error",
      parse_error: errorMessage(error),
      attempt_count: file.attempt_count + 1,
      last_attempted_at: new Date().toISOString(),
    });
    throw error;
  }
}

async function loadCvFile(cvFileId: string): Promise<CvFileRow> {
  const { data, error } = await getDb()
    .from("cv_files")
    .select("*")
    .eq("id", cvFileId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load CV file ${cvFileId}: ${error.message}`);
  }
  if (!data) {
    throw new Error(`CV file ${cvFileId} was not found`);
  }

  return data;
}

async function downloadCvFileBytes(storagePath: string): Promise<Uint8Array> {
  const { data, error } = await getDb()
    .storage.from(CV_FILES_BUCKET)
    .download(storagePath);

  if (error || !data) {
    throw new Error(
      error?.message
        ? `Failed to download CV file at ${storagePath}: ${error.message}`
        : `Failed to download CV file at ${storagePath}`,
    );
  }

  return new Uint8Array(await data.arrayBuffer());
}

async function updateCvFile(
  cvFileId: string,
  payload: CvFileUpdate,
): Promise<void> {
  const { error } = await getDb()
    .from("cv_files")
    .update(payload)
    .eq("id", cvFileId);

  if (error) {
    throw new Error(`Failed to update CV file ${cvFileId}: ${error.message}`);
  }
}

function contentTypeFromSourceRef(sourceRef: string | null): CvContentType {
  const ref = sourceRef?.toLowerCase() ?? "";
  if (ref.endsWith(".docx")) {
    return DOCX_CONTENT_TYPE;
  }
  return PDF_CONTENT_TYPE;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * `parseCv` is mocked in unit tests, which never touch AI env. Defer
 * `getModel("parse")` until a method is actually invoked so those tests
 * don't need `AI_MODEL_PARSE` / Supabase env.
 */
function modelForRetry(): AiModel {
  return {
    get modelId() {
      return getModel("parse").modelId;
    },
    get modelVersion() {
      return getModel("parse").modelVersion;
    },
    generateObject(promptText: string) {
      return getModel("parse").generateObject(promptText);
    },
    get supportsFileInput() {
      return getModel("parse").supportsFileInput;
    },
    generateObjectFromFile(fileBytes: Uint8Array) {
      const model = getModel("parse");
      if (typeof model.generateObjectFromFile !== "function") {
        return Promise.reject(
          new Error(
            "File parse path is unavailable: this model does not support file input",
          ),
        );
      }
      return model.generateObjectFromFile(fileBytes);
    },
  };
}
