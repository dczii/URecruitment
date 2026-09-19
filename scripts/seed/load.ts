import type { GapCheckFields, MustHave } from "@/server/gap-check/missing-fields";
import type { JobVersion } from "@/server/jobs/versions";
import type { DocumentKind } from "./classify";

/** One file the classifier has already looked at, ready to be loaded. */
export type ClassifiedFile = {
  pathname: string;
  kind: DocumentKind;
  confidence: number;
  /** Extracted text, used for classification and stored profile/job fields. */
  text: string;
  /** Original bytes, present only for a real PDF/DOCX file (uploadable). */
  fileBytes?: Uint8Array;
  contentType?:
    | "application/pdf"
    | "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
};

/**
 * Every already-tested service call this step orchestrates, injected so
 * `runLoad` can be unit-tested without a network call or a real Supabase
 * client. `index.ts` wires the real implementations.
 */
export type LoadDeps = {
  /** Creates the client row if none with this name exists yet, returns its id. */
  ensureClient(name: string): Promise<string>;
  insertJob(input: { clientId: string; ownerName: string }): Promise<string>;
  saveJobVersion(jobId: string, input: unknown): Promise<JobVersion>;
  persistMissingFieldFlags(
    jobVersionId: string,
    jobVersion: { fields: GapCheckFields; must_haves: MustHave[] },
  ): Promise<void>;

  insertCandidate(fullName: string): Promise<string>;
  updateCandidateName(candidateId: string, fullName: string): Promise<void>;
  uploadCvFile(
    path: string,
    bytes: Uint8Array,
    declaredContentType: string,
  ): Promise<void>;
  insertCvFile(input: {
    candidateId: string;
    storagePath: string;
    sourceRef: string;
  }): Promise<string>;
  insertCandidateProfile(input: {
    candidateId: string;
    cvFileId: string;
    parsed: Record<string, unknown>;
  }): Promise<void>;

  /** `crypto.randomUUID()` by default; injectable for deterministic tests. */
  randomUUID(): string;
};

export type SkippedFile = { pathname: string; reason: string };

export type LoadSummary = {
  jobsLoaded: number;
  candidatesLoaded: number;
  skipped: SkippedFile[];
};

const PLACEHOLDER_CLIENT_NAME = "Fictional sample client";

/**
 * Loads every classified job description, then every classified CV.
 * A single file's failure is collected in `skipped` rather than aborting.
 */
export async function runLoad(
  files: ClassifiedFile[],
  deps: LoadDeps,
): Promise<LoadSummary> {
  const skipped: SkippedFile[] = [];
  let jobsLoaded = 0;

  for (const file of files) {
    if (file.kind === "unclassified") {
      skipped.push({
        pathname: file.pathname,
        reason: `unclassified (confidence ${file.confidence.toFixed(2)})`,
      });
      continue;
    }
    if (file.kind !== "job_description") {
      continue;
    }
    try {
      await loadJobDescription(file, deps);
      jobsLoaded += 1;
    } catch (error) {
      skipped.push({ pathname: file.pathname, reason: errorMessage(error) });
    }
  }

  let candidatesLoaded = 0;
  for (const file of files) {
    if (file.kind !== "cv") {
      continue;
    }
    try {
      await loadCv(file, deps);
      candidatesLoaded += 1;
    } catch (error) {
      skipped.push({ pathname: file.pathname, reason: errorMessage(error) });
    }
  }

  return { jobsLoaded, candidatesLoaded, skipped };
}

async function loadJobDescription(
  file: ClassifiedFile,
  deps: LoadDeps,
): Promise<void> {
  const title = titleFromFile(file);
  const mustHaveText = firstMeaningfulLine(file.text) ?? title;
  const clientName = `${PLACEHOLDER_CLIENT_NAME} — ${title}`;
  const clientId = await deps.ensureClient(clientName);
  const jobId = await deps.insertJob({
    clientId,
    ownerName: "Seed script",
  });

  const mustHaves: MustHave[] = [{ text: mustHaveText, marking: "must_have" }];
  const version = await deps.saveJobVersion(jobId, {
    fields: { title },
    must_haves: mustHaves,
    nice_to_haves: [],
    requires_nationality: false,
    nationality_reason: null,
    requires_language: false,
    language_reason: null,
  });

  await deps.persistMissingFieldFlags(version.id, {
    fields: EMPTY_GAP_CHECK_FIELDS,
    must_haves: mustHaves,
  });
}

async function loadCv(file: ClassifiedFile, deps: LoadDeps): Promise<void> {
  if (!file.fileBytes || !file.contentType) {
    throw new Error(
      "No PDF/DOCX bytes to upload — only PDF and DOCX CVs can be seeded (matches the app's own upload rules).",
    );
  }

  const displayName = nameFromPathname(file.pathname);
  const candidateId = await deps.insertCandidate(displayName);

  const extension = file.contentType === "application/pdf" ? "pdf" : "docx";
  const storagePath = `cv/${deps.randomUUID()}/${sanitizeFilename(file.pathname)}.${extension}`;
  await deps.uploadCvFile(storagePath, file.fileBytes, file.contentType);

  const cvFileId = await deps.insertCvFile({
    candidateId,
    storagePath,
    sourceRef: file.pathname,
  });

  await deps.insertCandidateProfile({
    candidateId,
    cvFileId,
    parsed: {
      name: displayName,
      name_source_text: displayName,
      skills: [],
      work_history: [],
      education: [],
      certifications: [],
      languages_spoken: [],
    },
  });

  await deps.updateCandidateName(candidateId, displayName);
}

function titleFromFile(file: ClassifiedFile): string {
  return firstMeaningfulLine(file.text) ?? basenameWithoutExt(file.pathname);
}

function firstMeaningfulLine(text: string): string | null {
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.length >= 3) {
      return trimmed.slice(0, 200);
    }
  }
  return null;
}

function nameFromPathname(pathname: string): string {
  const base = basenameWithoutExt(pathname).replace(/[_-]+/g, " ").trim();
  if (base.length === 0) {
    return "Seed candidate";
  }
  return base.replace(/\b\w/g, (char) => char.toUpperCase());
}

function basenameWithoutExt(pathname: string): string {
  const base = pathname.split("/").pop() ?? pathname;
  return base.replace(/\.[^./]+$/, "") || "file";
}

function sanitizeFilename(pathname: string): string {
  return basenameWithoutExt(pathname).replace(/[^a-zA-Z0-9_-]/g, "_") || "file";
}

const EMPTY_GAP_CHECK_FIELDS: GapCheckFields = {
  salary_range: null,
  location: null,
  work_arrangement: null,
  employment_type: null,
  headcount: null,
  start_date: null,
  interview_steps: null,
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
