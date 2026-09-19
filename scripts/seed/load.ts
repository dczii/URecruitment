import type { AiModel, AiRunsWriter } from "@/server/ai/types";
import type { Embedder } from "@/server/ai/embeddings";
import type { ExtractJdOutput } from "@/server/ai/prompts/extract-jd";
import type { GapCheckFields, MustHave } from "@/server/gap-check/missing-fields";
import type { JobVersion } from "@/server/jobs/versions";
import type { ParsedCandidateProfile } from "@/server/cv/parse";
import type { DocumentKind } from "./classify";

/** One file the classifier has already looked at, ready to be loaded. */
export type ClassifiedFile = {
  pathname: string;
  kind: DocumentKind;
  confidence: number;
  /** Extracted text, used for classification, AI calls and embeddings. */
  text: string;
  /** Original bytes, present only for a real PDF/DOCX file (uploadable). */
  fileBytes?: Uint8Array;
  contentType?:
    | "application/pdf"
    | "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
};

export type LoadModels = {
  jd: AiModel;
  parse: AiModel;
  gap: AiModel;
  match: AiModel;
};

/**
 * Every already-tested service call this step orchestrates, injected so
 * `runLoad` can be unit-tested without a network call or a real Supabase
 * client. `index.ts` wires the real implementations.
 */
export type LoadDeps = {
  models: LoadModels;
  embedder: Embedder;
  runs: AiRunsWriter;

  /** Creates the client row if none with this name exists yet, returns its id. */
  ensureClient(name: string): Promise<string>;
  insertJob(input: { clientId: string; ownerName: string }): Promise<string>;
  saveJobVersion(jobId: string, input: unknown): Promise<JobVersion>;
  extractJobDescription(args: {
    jdText: string;
    model: AiModel;
    runs: AiRunsWriter;
    filename?: string;
  }): Promise<ExtractJdOutput>;
  embedJobVersion(args: {
    jobVersionId: string;
    text: string;
    embedder: Embedder;
    runs: AiRunsWriter;
  }): Promise<string>;
  runGapCheck(args: {
    jobVersionId: string;
    fields: GapCheckFields;
    mustHaves: MustHave[];
    formText: string;
    jdText?: string | null;
    model: AiModel;
    runs: AiRunsWriter;
  }): Promise<void>;
  startRescoreRun(args: {
    jobVersionId: string;
    model: AiModel;
    runs: AiRunsWriter;
  }): Promise<void>;

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
  parseCv(args: {
    candidateId: string;
    cvFileId: string;
    cvText: string;
    model: AiModel;
    runs: AiRunsWriter;
  }): Promise<ParsedCandidateProfile>;
  embedCvProfile(args: {
    candidateId: string;
    text: string;
    embedder: Embedder;
    runs: AiRunsWriter;
  }): Promise<string>;

  /** `crypto.randomUUID()` by default; injectable for deterministic tests. */
  randomUUID(): string;
};

export type SkippedFile = { pathname: string; reason: string };

export type LoadSummary = {
  jobsLoaded: number;
  candidatesLoaded: number;
  jobsScored: number;
  skipped: SkippedFile[];
};

const PLACEHOLDER_CLIENT_NAME = "Fictional sample client";
const NATIONALITY_REASON_FALLBACK =
  "Seed default: proposed by JD extraction, no recruiter confirmation in the sample data.";
const LANGUAGE_REASON_FALLBACK =
  "Seed default: proposed by JD extraction, no recruiter confirmation in the sample data.";

/**
 * Loads every classified job description, then every classified CV, then
 * scores every job against the now-fully-embedded candidate pool. A single
 * file's failure is collected in `skipped` rather than aborting the run —
 * an unclassified file is always skipped, never guessed.
 */
export async function runLoad(
  files: ClassifiedFile[],
  deps: LoadDeps,
): Promise<LoadSummary> {
  const skipped: SkippedFile[] = [];
  const jobVersionIds: string[] = [];

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
      jobVersionIds.push(await loadJobDescription(file, deps));
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

  let jobsScored = 0;
  for (const jobVersionId of jobVersionIds) {
    try {
      await deps.startRescoreRun({
        jobVersionId,
        model: deps.models.match,
        runs: deps.runs,
      });
      jobsScored += 1;
    } catch (error) {
      skipped.push({
        pathname: `job_version:${jobVersionId}`,
        reason: errorMessage(error),
      });
    }
  }

  return {
    jobsLoaded: jobVersionIds.length,
    candidatesLoaded,
    jobsScored,
    skipped,
  };
}

async function loadJobDescription(
  file: ClassifiedFile,
  deps: LoadDeps,
): Promise<string> {
  const extracted = await deps.extractJobDescription({
    jdText: file.text,
    model: deps.models.jd,
    runs: deps.runs,
    filename: file.pathname,
  });

  if (extracted.prompt_injection_detected) {
    throw new Error(
      `Prompt injection detected while extracting ${file.pathname}: ${extracted.prompt_injection_note ?? "no detail"}`,
    );
  }

  const clientName = extracted.title
    ? `${PLACEHOLDER_CLIENT_NAME} — ${extracted.title}`
    : PLACEHOLDER_CLIENT_NAME;
  const clientId = await deps.ensureClient(clientName);
  const jobId = await deps.insertJob({
    clientId,
    ownerName: "Seed script",
  });

  const requirements = extracted.requirements.map((row) => ({
    text: row.text,
    marking: row.proposed_marking ?? ("nice_to_have" as const),
  }));

  const versionInput = {
    fields: { title: extracted.title ?? file.pathname },
    must_haves: requirements.filter((row) => row.marking === "must_have"),
    nice_to_haves: requirements.filter(
      (row) => row.marking === "nice_to_have",
    ),
    requires_nationality: extracted.requires_nationality,
    nationality_reason: extracted.requires_nationality
      ? (extracted.nationality_reason_proposal ?? NATIONALITY_REASON_FALLBACK)
      : null,
    requires_language: extracted.requires_language,
    language_reason: extracted.requires_language
      ? (extracted.language_reason_proposal ?? LANGUAGE_REASON_FALLBACK)
      : null,
  };

  const version = await deps.saveJobVersion(jobId, versionInput);

  const embeddingText = buildJobEmbeddingText(extracted, file.text);
  await deps.embedJobVersion({
    jobVersionId: version.id,
    text: embeddingText,
    embedder: deps.embedder,
    runs: deps.runs,
  });

  await deps.runGapCheck({
    jobVersionId: version.id,
    fields: EMPTY_GAP_CHECK_FIELDS,
    mustHaves: versionInput.must_haves.map((row) => ({
      text: row.text,
      marking: "must_have" as const,
    })),
    formText: buildGapCheckFormText(extracted),
    jdText: file.text,
    model: deps.models.gap,
    runs: deps.runs,
  });

  return version.id;
}

async function loadCv(file: ClassifiedFile, deps: LoadDeps): Promise<void> {
  if (!file.fileBytes || !file.contentType) {
    throw new Error(
      "No PDF/DOCX bytes to upload — only PDF and DOCX CVs can be seeded (matches the app's own upload rules).",
    );
  }

  const candidateId = await deps.insertCandidate(
    `Seed candidate (${file.pathname})`,
  );

  const extension = file.contentType === "application/pdf" ? "pdf" : "docx";
  const storagePath = `cv/${deps.randomUUID()}/${sanitizeFilename(file.pathname)}.${extension}`;
  await deps.uploadCvFile(storagePath, file.fileBytes, file.contentType);

  const cvFileId = await deps.insertCvFile({
    candidateId,
    storagePath,
    sourceRef: file.pathname,
  });

  const parsed = await deps.parseCv({
    candidateId,
    cvFileId,
    cvText: file.text,
    model: deps.models.parse,
    runs: deps.runs,
  });

  if (parsed.name) {
    await deps.updateCandidateName(candidateId, parsed.name);
  }

  const embeddingText = buildCvEmbeddingText(parsed, file.text);
  await deps.embedCvProfile({
    candidateId,
    text: embeddingText,
    embedder: deps.embedder,
    runs: deps.runs,
  });
}

function sanitizeFilename(pathname: string): string {
  const base = pathname.split("/").pop() ?? pathname;
  return base.replace(/\.[^./]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_") || "file";
}

/**
 * The JD extraction schema (`extractJdOutputSchema`) has no salary/location/
 * work-arrangement/etc. fields — those come from the recruiter's own form in
 * the real flow, which the seed has no recruiter to fill. Leaving them
 * unset is correct: it lets the gap check's missing-field rules flag them,
 * same as it would for a recruiter who saved without filling them in.
 */
const EMPTY_GAP_CHECK_FIELDS: GapCheckFields = {
  salary_range: null,
  location: null,
  work_arrangement: null,
  employment_type: null,
  headcount: null,
  start_date: null,
  interview_steps: null,
};

function buildGapCheckFormText(extracted: ExtractJdOutput): string {
  const lines = [`Title: ${extracted.title ?? "(untitled)"}`];
  for (const requirement of extracted.requirements) {
    lines.push(`- ${requirement.text}`);
  }
  return lines.join("\n");
}

function buildJobEmbeddingText(
  extracted: ExtractJdOutput,
  jdText: string,
): string {
  const title = extracted.title ? `${extracted.title}\n\n` : "";
  return `${title}${jdText}`;
}

function buildCvEmbeddingText(
  parsed: ParsedCandidateProfile,
  cvText: string,
): string {
  const skillLine =
    parsed.skills.length > 0
      ? `Skills: ${parsed.skills.map((skill) => skill.skill).join(", ")}\n\n`
      : "";
  return `${skillLine}${cvText}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
