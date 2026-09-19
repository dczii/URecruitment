import { describe, expect, it, vi } from "vitest";
import type { AiModel, AiRunsWriter } from "@/server/ai/types";
import type { Embedder } from "@/server/ai/embeddings";
import { type ClassifiedFile, type LoadDeps, runLoad } from "./load";

const FAKE_MODEL: AiModel = {
  modelId: "fake",
  modelVersion: "fake",
  async generateObject() {
    throw new Error("not used directly in load.ts tests");
  },
};

const FAKE_RUNS: AiRunsWriter = { write: vi.fn().mockResolvedValue(undefined) };

const FAKE_EMBEDDER: Embedder = {
  modelId: "fake-embed",
  async embed() {
    return { vector: [0, 0, 0, 0, 0, 0, 0, 0] };
  },
};

const PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

function jobFile(overrides: Partial<ClassifiedFile> = {}): ClassifiedFile {
  return {
    pathname: "jobs/backend-engineer.pdf",
    kind: "job_description",
    confidence: 0.9,
    text: "Senior Backend Engineer job description text.",
    fileBytes: PDF_BYTES,
    contentType: "application/pdf",
    ...overrides,
  };
}

function cvFile(overrides: Partial<ClassifiedFile> = {}): ClassifiedFile {
  return {
    pathname: "cvs/candidate-01.pdf",
    kind: "cv",
    confidence: 0.9,
    text: "Jamie Tan CV text with experience.",
    fileBytes: PDF_BYTES,
    contentType: "application/pdf",
    ...overrides,
  };
}

function baseDeps(overrides: Partial<LoadDeps> = {}): LoadDeps {
  let clientCount = 0;
  let jobCount = 0;
  let candidateCount = 0;
  let cvFileCount = 0;
  let uuidCount = 0;

  return {
    models: {
      jd: FAKE_MODEL,
      parse: FAKE_MODEL,
      gap: FAKE_MODEL,
      match: FAKE_MODEL,
    },
    embedder: FAKE_EMBEDDER,
    runs: FAKE_RUNS,
    ensureClient: vi.fn(async () => `client-${(clientCount += 1)}`),
    insertJob: vi.fn(async () => `job-${(jobCount += 1)}`),
    saveJobVersion: vi.fn(async (jobId: string) => ({
      id: `version-of-${jobId}`,
      job_id: jobId,
      created_at: new Date().toISOString(),
    })) as unknown as LoadDeps["saveJobVersion"],
    extractJobDescription: vi.fn(async () => ({
      title: "Senior Backend Engineer",
      title_source_text: "Senior Backend Engineer",
      requirements: [
        {
          text: "5+ years backend experience",
          proposed_marking: "must_have" as const,
          source_text: "5+ years backend experience",
        },
        {
          text: "Kubernetes",
          proposed_marking: "nice_to_have" as const,
          source_text: "Kubernetes",
        },
      ],
      requires_nationality: false,
      nationality_reason_proposal: null,
      nationality_source_text: null,
      requires_language: false,
      language_reason_proposal: null,
      language_source_text: null,
      prompt_injection_detected: false,
      prompt_injection_note: null,
    })) as LoadDeps["extractJobDescription"],
    embedJobVersion: vi.fn(async () => "embedding-id"),
    runGapCheck: vi.fn(async () => undefined),
    startRescoreRun: vi.fn(async () => undefined),
    insertCandidate: vi.fn(async () => `candidate-${(candidateCount += 1)}`),
    updateCandidateName: vi.fn(async () => undefined),
    uploadCvFile: vi.fn(async () => undefined),
    insertCvFile: vi.fn(async () => `cv-file-${(cvFileCount += 1)}`),
    parseCv: vi.fn(async () => ({
      name: "Jamie Tan",
      name_source_text: "Jamie Tan",
      skills: [{ skill: "Python", source_text: "Python" }],
      work_history: [],
      total_years: 5,
    })) as unknown as LoadDeps["parseCv"],
    embedCvProfile: vi.fn(async () => "embedding-id"),
    randomUUID: vi.fn(() => `uuid-${(uuidCount += 1)}`),
    ...overrides,
  };
}

describe("runLoad", () => {
  it("loads a job description into jobs, job_versions, embeddings and gap flags", async () => {
    const deps = baseDeps();
    const summary = await runLoad([jobFile()], deps);

    expect(deps.ensureClient).toHaveBeenCalledTimes(1);
    expect(deps.insertJob).toHaveBeenCalledTimes(1);
    expect(deps.saveJobVersion).toHaveBeenCalledTimes(1);
    expect(deps.embedJobVersion).toHaveBeenCalledTimes(1);
    expect(deps.runGapCheck).toHaveBeenCalledTimes(1);
    expect(summary.jobsLoaded).toBe(1);
    expect(summary.skipped).toEqual([]);

    const gapCheckCall = (deps.runGapCheck as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(gapCheckCall.mustHaves).toEqual([
      { text: "5+ years backend experience", marking: "must_have" },
    ]);
  });

  it("loads a CV into cv_files, candidates, candidate_profiles and embeddings", async () => {
    const deps = baseDeps();
    const summary = await runLoad([cvFile()], deps);

    expect(deps.insertCandidate).toHaveBeenCalledTimes(1);
    expect(deps.uploadCvFile).toHaveBeenCalledWith(
      expect.stringMatching(/^cv\/uuid-1\/.+\.pdf$/),
      PDF_BYTES,
      "application/pdf",
    );
    expect(deps.insertCvFile).toHaveBeenCalledTimes(1);
    expect(deps.parseCv).toHaveBeenCalledTimes(1);
    expect(deps.updateCandidateName).toHaveBeenCalledWith(
      "candidate-1",
      "Jamie Tan",
    );
    expect(deps.embedCvProfile).toHaveBeenCalledTimes(1);
    expect(summary.candidatesLoaded).toBe(1);
    expect(summary.skipped).toEqual([]);
  });

  it("scores retrieved candidates per job version up to the retrieval limit", async () => {
    const deps = baseDeps();
    const summary = await runLoad([jobFile(), cvFile()], deps);

    expect(deps.startRescoreRun).toHaveBeenCalledTimes(1);
    expect(deps.startRescoreRun).toHaveBeenCalledWith(
      expect.objectContaining({ jobVersionId: "version-of-job-1" }),
    );
    expect(summary.jobsScored).toBe(1);
  });

  it("skips and reports unclassified/failed files without aborting the run", async () => {
    const deps = baseDeps({
      parseCv: vi.fn(async () => {
        throw new Error("evidence quote not verbatim");
      }) as unknown as LoadDeps["parseCv"],
    });

    const summary = await runLoad(
      [
        jobFile(),
        cvFile({ pathname: "cvs/broken.pdf" }),
        {
          pathname: "unknown/mystery.pdf",
          kind: "unclassified",
          confidence: 0.4,
          text: "ambiguous content",
        },
      ],
      deps,
    );

    expect(summary.jobsLoaded).toBe(1);
    expect(summary.candidatesLoaded).toBe(0);
    expect(summary.skipped).toEqual([
      { pathname: "unknown/mystery.pdf", reason: expect.stringContaining("unclassified") },
      { pathname: "cvs/broken.pdf", reason: "evidence quote not verbatim" },
    ]);
    // The job still gets scored even though a CV failed.
    expect(deps.startRescoreRun).toHaveBeenCalledTimes(1);
  });

  it("skips a CV file with no PDF/DOCX bytes instead of throwing", async () => {
    const deps = baseDeps();
    const summary = await runLoad(
      [cvFile({ fileBytes: undefined, contentType: undefined })],
      deps,
    );

    expect(deps.uploadCvFile).not.toHaveBeenCalled();
    expect(summary.candidatesLoaded).toBe(0);
    expect(summary.skipped).toHaveLength(1);
    expect(summary.skipped[0].reason).toContain("PDF/DOCX");
  });
});
