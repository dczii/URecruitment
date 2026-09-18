"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isValidRecruiterName } from "@/lib/recruiter-name";
import { setOverride } from "@/server/cv/overrides";
import { getDb } from "@/server/db";
import { signCvFilePath } from "@/server/storage";

const candidateIdSchema = z.uuid();

const editableFieldSchema = z.enum(["name", "email", "phone", "location"]);

const saveFieldOverrideSchema = z.object({
  candidateId: candidateIdSchema,
  field: editableFieldSchema,
  value: z.string(),
  typedName: z.string().refine(isValidRecruiterName),
});

export type OriginalCvSignedUrlResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

export type SaveFieldOverrideResult =
  | { ok: true }
  | { ok: false; error: string };

const OPEN_FAILED = "The original CV could not be opened.";
const NOT_STORED = "No original CV file is stored for this candidate.";
const SAVE_FAILED = "The field could not be saved.";
const NOT_PARSED = "This candidate has not been parsed yet.";

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

export async function saveFieldOverride(
  candidateId: string,
  field: string,
  value: string,
  typedName: string,
): Promise<SaveFieldOverrideResult> {
  const parsed = saveFieldOverrideSchema.safeParse({
    candidateId,
    field,
    value,
    typedName,
  });
  if (!parsed.success) {
    return { ok: false, error: SAVE_FAILED };
  }

  try {
    const { data, error } = await getDb()
      .from("candidate_profiles")
      .select("id")
      .eq("candidate_id", parsed.data.candidateId)
      .maybeSingle();

    if (error) {
      return { ok: false, error: SAVE_FAILED };
    }
    if (!data?.id) {
      return { ok: false, error: NOT_PARSED };
    }

    await setOverride(
      data.id,
      parsed.data.field,
      parsed.data.value,
      parsed.data.typedName.trim(),
    );
    revalidatePath(`/candidates/${parsed.data.candidateId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: SAVE_FAILED };
  }
}
