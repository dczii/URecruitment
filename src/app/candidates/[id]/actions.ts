"use server";

import { z } from "zod";

import { getDb } from "@/server/db";
import { signCvFilePath } from "@/server/storage";

const candidateIdSchema = z.uuid();

export type OriginalCvSignedUrlResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

const OPEN_FAILED = "The original CV could not be opened.";
const NOT_STORED = "No original CV file is stored for this candidate.";

export async function getOriginalCvSignedUrl(
  candidateId: string,
): Promise<OriginalCvSignedUrlResult> {
  const parsed = candidateIdSchema.safeParse(candidateId);
  if (!parsed.success) {
    return { ok: false, error: OPEN_FAILED };
  }

  try {
    const { data, error } = await getDb()
      .from("cv_files")
      .select("storage_path")
      .eq("candidate_id", parsed.data)
      .eq("doc_kind", "cv")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return { ok: false, error: OPEN_FAILED };
    }
    if (!data?.storage_path) {
      return { ok: false, error: NOT_STORED };
    }

    const url = await signCvFilePath(data.storage_path);
    return { ok: true, url };
  } catch {
    return { ok: false, error: OPEN_FAILED };
  }
}
