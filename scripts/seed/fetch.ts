import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, extname, join, parse } from "node:path";
import { list } from "@vercel/blob";
// word-extractor ships no type declarations; this is its CJS default export.
// @ts-expect-error -- package has no .d.ts
import WordExtractorUntyped from "word-extractor";
import { assertBlobUrlInStore, type SeedEnv } from "./env";

const SUPPORTED_DOWNLOAD_EXTENSIONS = new Set([".pdf", ".doc", ".docx"]);

export type SampleFile = {
  pathname: string;
  url: string;
  size: number;
  uploadedAt: string;
};

export type DownloadAndHashResult = {
  localPath: string;
  sha256?: string;
  skipped?: { reason: string };
};

export type SeedFileResult = {
  file: SampleFile;
  downloaded?: { sha256: string };
  language?: string;
  skipped?: { reason: string };
};

export type SeedRunReport = {
  countsByType: Record<string, number>;
  countsByLanguage: Record<string, number>;
  skipped: Array<{ pathname: string; reason: string }>;
};

type WordExtractorDocument = {
  getBody: () => string;
};

type WordExtractorConstructor = new () => {
  extract: (source: string) => Promise<WordExtractorDocument>;
};

const WordExtractor = WordExtractorUntyped as WordExtractorConstructor;

function lowerExtension(pathname: string): string {
  return extname(pathname).toLowerCase();
}

function typeFromPathname(pathname: string): string {
  const extension = lowerExtension(pathname);
  return extension.startsWith(".") ? extension.slice(1) : extension;
}

function incrementCount(counts: Record<string, number>, key: string): void {
  counts[key] = (counts[key] ?? 0) + 1;
}

export async function listSampleFiles(env: SeedEnv): Promise<SampleFile[]> {
  const files: SampleFile[] = [];
  let cursor: string | undefined;

  for (;;) {
    const page = await list(
      cursor === undefined
        ? { token: env.blobToken }
        : { token: env.blobToken, cursor },
    );

    for (const blob of page.blobs) {
      assertBlobUrlInStore(blob.url, env.blobBaseUrl);
      files.push({
        pathname: blob.pathname,
        url: blob.url,
        size: blob.size,
        uploadedAt: blob.uploadedAt.toISOString(),
      });
    }

    if (!page.hasMore) {
      return files;
    }
    if (page.cursor === undefined) {
      throw new Error("Blob list() returned hasMore without a cursor.");
    }
    cursor = page.cursor;
  }
}

export async function downloadAndHash(
  file: SampleFile,
  cacheDir: string,
): Promise<DownloadAndHashResult> {
  const extension = lowerExtension(file.pathname);
  if (!SUPPORTED_DOWNLOAD_EXTENSIONS.has(extension)) {
    const named = extension.length > 0 ? extension : "none";
    return {
      // No cache file is written; localPath is required by the result type.
      localPath: "",
      skipped: { reason: `Unsupported file type: ${named}` },
    };
  }

  const response = await fetch(file.url);
  if (!response.ok) {
    throw new Error(
      `Failed to download sample file (${response.status}): ${file.pathname}`,
    );
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  await mkdir(cacheDir, { recursive: true });
  const localPath = join(cacheDir, basename(file.pathname));
  await writeFile(localPath, bytes);

  return {
    localPath,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

export async function convertLegacyDoc(path: string): Promise<string> {
  if (lowerExtension(path) !== ".doc") {
    return path;
  }

  const document = await new WordExtractor().extract(path);
  const parsed = parse(path);
  const txtPath = join(parsed.dir, `${parsed.name}.txt`);
  await writeFile(txtPath, document.getBody(), "utf8");
  return txtPath;
}

export function buildRunReport(
  results: readonly SeedFileResult[],
): SeedRunReport {
  const countsByType: Record<string, number> = {};
  const countsByLanguage: Record<string, number> = {};
  const skipped: SeedRunReport["skipped"] = [];

  for (const result of results) {
    incrementCount(countsByType, typeFromPathname(result.file.pathname));
    if (result.language !== undefined) {
      incrementCount(countsByLanguage, result.language);
    }
    if (result.skipped) {
      skipped.push({
        pathname: result.file.pathname,
        reason: result.skipped.reason,
      });
    }
  }

  return { countsByType, countsByLanguage, skipped };
}
