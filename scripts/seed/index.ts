import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { extname, join } from "node:path";
import type { Json } from "@/lib/database.types";
import { extractCvText } from "@/server/cv/extract";
import {
  checkMissingFields,
  persistMissingFieldFlags,
} from "@/server/gap-check/missing-fields";
import { getDb } from "@/server/db";
import { saveJobVersion } from "@/server/jobs/versions";
import { uploadCvFile } from "@/server/storage";
import { classifyDocument } from "./classify";
import { parseSeedEnv } from "./env";
import { convertLegacyDoc, downloadAndHash, listSampleFiles } from "./fetch";
import { runLoad, type ClassifiedFile, type LoadDeps } from "./load";

const CACHE_DIR = join(process.cwd(), ".seed-cache");

async function classifiedFilesFromStore(): Promise<{
  files: ClassifiedFile[];
  downloadSkipped: Array<{ pathname: string; reason: string }>;
}> {
  const env = parseSeedEnv(process.env);
  const sampleFiles = await listSampleFiles(env);
  const files: ClassifiedFile[] = [];
  const downloadSkipped: Array<{ pathname: string; reason: string }> = [];

  for (const sampleFile of sampleFiles) {
    const downloaded = await downloadAndHash(sampleFile, CACHE_DIR);
    if (downloaded.skipped) {
      downloadSkipped.push({
        pathname: sampleFile.pathname,
        reason: downloaded.skipped.reason,
      });
      continue;
    }

    const extension = extname(sampleFile.pathname).toLowerCase();
    if (extension === ".doc") {
      const txtPath = await convertLegacyDoc(downloaded.localPath);
      const text = await readFile(txtPath, "utf8");
      const classified = classifyDocument(text);
      files.push({
        pathname: sampleFile.pathname,
        kind: classified.kind,
        confidence: classified.confidence,
        text,
      });
      continue;
    }

    const contentType =
      extension === ".pdf"
        ? ("application/pdf" as const)
        : ("application/vnd.openxmlformats-officedocument.wordprocessingml.document" as const);
    const fileBytes = new Uint8Array(await readFile(downloaded.localPath));
    const { text } = await extractCvText(fileBytes, contentType);
    const classified = classifyDocument(text);
    files.push({
      pathname: sampleFile.pathname,
      kind: classified.kind,
      confidence: classified.confidence,
      text,
      fileBytes,
      contentType,
    });
  }

  return { files, downloadSkipped };
}

/** Real-world wiring for `runLoad`'s injected deps — never used in tests. */
function realDeps(): LoadDeps {
  const db = getDb();

  return {
    async ensureClient(name) {
      const existing = await db
        .from("clients")
        .select("id")
        .eq("name", name)
        .maybeSingle();
      if (existing.data) {
        return existing.data.id;
      }
      const inserted = await db
        .from("clients")
        .insert({ name })
        .select("id")
        .single();
      if (inserted.error || !inserted.data) {
        throw new Error(
          `Failed to create seed client "${name}": ${inserted.error?.message ?? "no row returned"}`,
        );
      }
      return inserted.data.id;
    },

    async insertJob({ clientId, ownerName }) {
      const inserted = await db
        .from("jobs")
        .insert({ client_id: clientId, owner_name: ownerName, status: "open" })
        .select("id")
        .single();
      if (inserted.error || !inserted.data) {
        throw new Error(
          `Failed to create seed job: ${inserted.error?.message ?? "no row returned"}`,
        );
      }
      return inserted.data.id;
    },

    saveJobVersion,

    async persistMissingFieldFlags(jobVersionId, jobVersion) {
      await persistMissingFieldFlags(
        jobVersionId,
        checkMissingFields(jobVersion),
      );
    },

    async insertCandidate(fullName) {
      const inserted = await db
        .from("candidates")
        .insert({ full_name: fullName })
        .select("id")
        .single();
      if (inserted.error || !inserted.data) {
        throw new Error(
          `Failed to create seed candidate: ${inserted.error?.message ?? "no row returned"}`,
        );
      }
      return inserted.data.id;
    },

    async updateCandidateName(candidateId, fullName) {
      const { error } = await db
        .from("candidates")
        .update({ full_name: fullName })
        .eq("id", candidateId);
      if (error) {
        throw new Error(
          `Failed to update seed candidate ${candidateId} name: ${error.message}`,
        );
      }
    },

    uploadCvFile,

    async insertCvFile({ candidateId, storagePath, sourceRef }) {
      const inserted = await db
        .from("cv_files")
        .insert({
          candidate_id: candidateId,
          storage_path: storagePath,
          doc_kind: "cv",
          source: "seed-blob",
          source_ref: sourceRef,
          parse_status: "parsed",
        })
        .select("id")
        .single();
      if (inserted.error || !inserted.data) {
        throw new Error(
          `Failed to create seed cv_files row: ${inserted.error?.message ?? "no row returned"}`,
        );
      }
      return inserted.data.id;
    },

    async insertCandidateProfile({ candidateId, cvFileId, parsed }) {
      const { error } = await db.from("candidate_profiles").insert({
        candidate_id: candidateId,
        cv_file_id: cvFileId,
        parsed: parsed as Json,
        overrides: {},
      });
      if (error) {
        throw new Error(
          `Failed to create seed candidate_profiles row: ${error.message}`,
        );
      }
    },

    randomUUID,
  };
}

async function main(): Promise<void> {
  console.log("Listing and downloading sample files...");
  const { files, downloadSkipped } = await classifiedFilesFromStore();

  console.log(`Loading ${files.length} classified files (jobs, then CVs)...`);
  const summary = await runLoad(files, realDeps());

  const countsByKind: Record<string, number> = {};
  for (const file of files) {
    countsByKind[file.kind] = (countsByKind[file.kind] ?? 0) + 1;
  }

  console.log("\nSeed run summary");
  console.log("================");
  console.log("Counts by classification:", countsByKind);
  console.log(`Jobs loaded: ${summary.jobsLoaded}`);
  console.log(`Candidates loaded: ${summary.candidatesLoaded}`);
  console.log(
    `Skipped (download): ${downloadSkipped.length}`,
    downloadSkipped,
  );
  console.log(`Skipped (load): ${summary.skipped.length}`, summary.skipped);
}

main().catch((error) => {
  console.error("Seed run failed:", error);
  process.exitCode = 1;
});
