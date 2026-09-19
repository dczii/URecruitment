import { describe, expect, it, vi } from "vitest";
import { type ClassifiedFile, type LoadDeps, runLoad } from "./load";

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
    pathname: "cvs/jamie-tan.pdf",
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
    ensureClient: vi.fn(async () => `client-${(clientCount += 1)}`),
    insertJob: vi.fn(async () => `job-${(jobCount += 1)}`),
    saveJobVersion: vi.fn(async (jobId: string) => ({
      id: `version-of-${jobId}`,
      job_id: jobId,
      created_at: new Date().toISOString(),
    })) as unknown as LoadDeps["saveJobVersion"],
    persistMissingFieldFlags: vi.fn(async () => undefined),
    insertCandidate: vi.fn(async () => `candidate-${(candidateCount += 1)}`),
    updateCandidateName: vi.fn(async () => undefined),
    uploadCvFile: vi.fn(async () => undefined),
    insertCvFile: vi.fn(async () => `cv-file-${(cvFileCount += 1)}`),
    insertCandidateProfile: vi.fn(async () => undefined),
    randomUUID: vi.fn(() => `uuid-${(uuidCount += 1)}`),
    ...overrides,
  };
}

describe("runLoad", () => {
  it("loads a job description into jobs, job_versions and missing-field flags", async () => {
    const deps = baseDeps();
    const summary = await runLoad([jobFile()], deps);

    expect(deps.ensureClient).toHaveBeenCalledTimes(1);
    expect(deps.insertJob).toHaveBeenCalledTimes(1);
    expect(deps.saveJobVersion).toHaveBeenCalledTimes(1);
    expect(deps.persistMissingFieldFlags).toHaveBeenCalledTimes(1);
    expect(summary.jobsLoaded).toBe(1);
    expect(summary.skipped).toEqual([]);

    const gapCheckCall = (
      deps.persistMissingFieldFlags as ReturnType<typeof vi.fn>
    ).mock.calls[0][1];
    expect(gapCheckCall.must_haves).toEqual([
      {
        text: "Senior Backend Engineer job description text.",
        marking: "must_have",
      },
    ]);
  });

  it("loads a CV into cv_files, candidates and candidate_profiles", async () => {
    const deps = baseDeps();
    const summary = await runLoad([cvFile()], deps);

    expect(deps.insertCandidate).toHaveBeenCalledTimes(1);
    expect(deps.uploadCvFile).toHaveBeenCalledWith(
      expect.stringMatching(/^cv\/uuid-1\/.+\.pdf$/),
      PDF_BYTES,
      "application/pdf",
    );
    expect(deps.insertCvFile).toHaveBeenCalledTimes(1);
    expect(deps.insertCandidateProfile).toHaveBeenCalledTimes(1);
    expect(deps.updateCandidateName).toHaveBeenCalledWith(
      "candidate-1",
      "Jamie Tan",
    );
    expect(summary.candidatesLoaded).toBe(1);
    expect(summary.skipped).toEqual([]);
  });

  it("skips and reports unclassified/failed files without aborting the run", async () => {
    const deps = baseDeps({
      insertCandidateProfile: vi.fn(async () => {
        throw new Error("profile insert failed");
      }),
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
      {
        pathname: "unknown/mystery.pdf",
        reason: expect.stringContaining("unclassified"),
      },
      { pathname: "cvs/broken.pdf", reason: "profile insert failed" },
    ]);
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
