import { createHash } from "node:crypto";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { list } from "@vercel/blob";
import * as seedEnv from "./env";
import {
  buildRunReport,
  convertLegacyDoc,
  downloadAndHash,
  listSampleFiles,
  type SampleFile,
} from "./fetch";

/** Fictional store address — never a real `*.public.blob.vercel-storage.com` URL. */
const BLOB_BASE_URL = "https://example.com/sample-store/";
const BLOB_TOKEN = "test-blob-read-token";
const OUTSIDE_STORE_URL = "https://evil.example.net/other-store/cv.pdf";

const SEED_ENV = {
  blobToken: BLOB_TOKEN,
  blobBaseUrl: BLOB_BASE_URL,
};

const { extractMock } = vi.hoisted(() => ({
  extractMock: vi.fn(),
}));

vi.mock("@vercel/blob", () => ({
  // Seed code may only `list()`. Do not expose put/copy/del to the module under test.
  list: vi.fn(),
}));

vi.mock("word-extractor", () => ({
  default: class WordExtractor {
    extract(...args: unknown[]) {
      return extractMock(...args);
    }
  },
}));

const listMock = vi.mocked(list);

function sampleFile(
  pathname: string,
  overrides: Partial<SampleFile> = {},
): SampleFile {
  return {
    pathname,
    url: `${BLOB_BASE_URL}${pathname}`,
    size: 256,
    uploadedAt: "2026-03-15T04:00:00.000Z",
    ...overrides,
  };
}

function listBlob(file: SampleFile, uploadedAt: Date) {
  return {
    url: file.url,
    downloadUrl: `${file.url}?download=1`,
    pathname: file.pathname,
    size: file.size,
    uploadedAt,
    etag: `"etag-${file.pathname}"`,
  };
}

function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function isInsideDir(dir: string, filePath: string): boolean {
  const rel = relative(dir, filePath);
  return rel !== "" && !rel.startsWith("..") && !rel.startsWith("/");
}

describe("listSampleFiles (AC118.1)", () => {
  beforeEach(() => {
    listMock.mockReset();
  });

  it("AC118.1: walks a faked multi-page list() and keeps pathname/url/size/uploadedAt for every entry", async () => {
    const page1UploadedAt = new Date("2026-03-15T04:00:00.000Z");
    const page2UploadedAt = new Date("2026-04-01T08:30:00.000Z");
    const page1Files = [
      sampleFile("cv-mei-chen.pdf", {
        size: 1024,
        uploadedAt: page1UploadedAt.toISOString(),
      }),
      sampleFile("jd-backend.docx", {
        size: 2048,
        uploadedAt: page1UploadedAt.toISOString(),
      }),
    ];
    const page2Files = [
      sampleFile("cv-arjun-nair.doc", {
        size: 4096,
        uploadedAt: page2UploadedAt.toISOString(),
      }),
    ];
    const page2Cursor = "cursor-from-page-1";

    listMock.mockResolvedValueOnce({
      blobs: page1Files.map((file) => listBlob(file, page1UploadedAt)),
      hasMore: true,
      cursor: page2Cursor,
    });
    listMock.mockResolvedValueOnce({
      blobs: page2Files.map((file) => listBlob(file, page2UploadedAt)),
      hasMore: false,
    });

    const assertSpy = vi.spyOn(seedEnv, "assertBlobUrlInStore");

    const listed = await listSampleFiles(SEED_ENV);

    expect(listMock).toHaveBeenCalledTimes(2);
    expect(listMock.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({ token: BLOB_TOKEN }),
    );
    expect(listMock.mock.calls[0]?.[0]?.cursor).toBeUndefined();
    expect(listMock.mock.calls[1]?.[0]).toEqual(
      expect.objectContaining({
        token: BLOB_TOKEN,
        cursor: page2Cursor,
      }),
    );

    expect(listed).toEqual([...page1Files, ...page2Files]);

    expect(assertSpy).toHaveBeenCalledTimes(3);
    expect(assertSpy).toHaveBeenCalledWith(page1Files[0]?.url, BLOB_BASE_URL);
    expect(assertSpy).toHaveBeenCalledWith(page1Files[1]?.url, BLOB_BASE_URL);
    expect(assertSpy).toHaveBeenCalledWith(page2Files[0]?.url, BLOB_BASE_URL);
  });

  it("AC118.1: throws when a listed URL is outside blobBaseUrl", async () => {
    const inStore = sampleFile("cv-in-store.pdf");
    listMock.mockResolvedValueOnce({
      blobs: [
        listBlob(inStore, new Date(inStore.uploadedAt)),
        listBlob(
          sampleFile("cv-outside.pdf", { url: OUTSIDE_STORE_URL }),
          new Date("2026-03-15T04:00:00.000Z"),
        ),
      ],
      hasMore: false,
    });

    await expect(listSampleFiles(SEED_ENV)).rejects.toThrow(
      "Listed file URL is not in the configured sample-data store.",
    );
  });
});

describe("downloadAndHash (AC118.2, AC118.3)", () => {
  let cacheDir = "";

  beforeEach(async () => {
    cacheDir = await mkdtemp(join(tmpdir(), "seed-fetch-"));
  });

  afterEach(async () => {
    await rm(cacheDir, { recursive: true, force: true });
  });

  it.each(["cv-mei-chen.pdf", "legacy-cv.doc", "profile.docx", "SCAN.PDF"])(
    "AC118.2: hashes a downloaded file's exact bytes (%s)",
    async (pathname) => {
      const file = sampleFile(pathname, { size: 64 });
      const bytes = Buffer.from(`fictional-seed-bytes:${pathname}`, "utf8");
      const expectedHash = sha256Hex(bytes);

      const fetchMock = vi.fn<
        (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
      >(async (input) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : input.url;
        expect(url).toBe(file.url);
        return new Response(bytes, { status: 200 });
      });
      vi.stubGlobal("fetch", fetchMock);

      const result = await downloadAndHash(file, cacheDir);

      expect(result.skipped).toBeUndefined();
      expect(result.sha256).toBe(expectedHash);
      expect(isInsideDir(cacheDir, result.localPath)).toBe(true);

      const written = await readFile(result.localPath);
      expect(written.equals(bytes)).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      const fetchInit = fetchMock.mock.calls[0]?.[1] as
        | RequestInit
        | undefined;
      const headers = new Headers(fetchInit?.headers);
      expect(headers.get("Authorization")).toBeNull();
      expect(JSON.stringify(fetchInit ?? {})).not.toContain(BLOB_TOKEN);
    },
  );

  it.each(["photo.png", "notes.txt", "IMAGE.PNG"])(
    "AC118.3: skips unsupported %s without fetching or writing",
    async (pathname) => {
      const file = sampleFile(pathname);
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);

      const result = await downloadAndHash(file, cacheDir);

      expect(result.skipped).toBeDefined();
      expect(result.skipped?.reason.trim().length).toBeGreaterThan(0);
      expect(result.skipped?.reason).toMatch(/[A-Za-z]/);
      expect(fetchMock).not.toHaveBeenCalled();
      expect(await readdir(cacheDir)).toEqual([]);
    },
  );
});

describe("convertLegacyDoc (AC118.4)", () => {
  let cacheDir = "";

  beforeEach(async () => {
    cacheDir = await mkdtemp(join(tmpdir(), "seed-fetch-doc-"));
    extractMock.mockReset();
  });

  afterEach(async () => {
    await rm(cacheDir, { recursive: true, force: true });
  });

  it("AC118.4: extracts text from a .doc path and writes a .txt sibling", async () => {
    const docPath = join(cacheDir, "cv-mei-chen.doc");
    const extractedBody =
      "Fictional candidate Mei Chen\nExperience at Example Corp.";
    await writeFile(docPath, Buffer.from("fake-ole-doc-bytes"));

    extractMock.mockResolvedValue({
      getBody: () => extractedBody,
    });

    const result = await convertLegacyDoc(docPath);

    expect(extractMock).toHaveBeenCalledWith(docPath);
    expect(result).toBe(join(cacheDir, "cv-mei-chen.txt"));
    expect(await readFile(result, "utf8")).toBe(extractedBody);
  });

  it.each(["job.pdf", "profile.docx"])(
    "AC118.4: is a no-op for a non-.doc path (%s)",
    async (filename) => {
      const inputPath = join(cacheDir, filename);
      await writeFile(inputPath, Buffer.from("not-a-legacy-doc"));

      const result = await convertLegacyDoc(inputPath);

      expect(result).toBe(inputPath);
      expect(extractMock).not.toHaveBeenCalled();
      expect(await readdir(cacheDir)).toEqual([filename]);
    },
  );
});

describe("buildRunReport (AC118.5)", () => {
  it("AC118.5: counts by type and language and lists every skipped file", () => {
    const pdfEn = sampleFile("cv-mei-chen.pdf");
    const pdfEn2 = sampleFile("cv-jordan-lee.pdf");
    const docxZh = sampleFile("cv-li-wei.docx");
    const docEn = sampleFile("legacy-cv.doc");
    const skippedPng = sampleFile("headshot.png");
    const skippedTxt = sampleFile("readme.txt");

    const report = buildRunReport([
      {
        file: pdfEn,
        downloaded: { sha256: sha256Hex(Buffer.from("pdf-en")) },
        language: "en",
      },
      {
        file: pdfEn2,
        downloaded: { sha256: sha256Hex(Buffer.from("pdf-en-2")) },
        language: "en",
      },
      {
        file: docxZh,
        downloaded: { sha256: sha256Hex(Buffer.from("docx-zh")) },
        language: "zh",
      },
      {
        file: docEn,
        downloaded: { sha256: sha256Hex(Buffer.from("doc-en")) },
        language: "en",
      },
      {
        file: skippedPng,
        skipped: { reason: "Unsupported file type: .png" },
      },
      {
        file: skippedTxt,
        skipped: { reason: "Unsupported file type: .txt" },
      },
    ]);

    expect(report.countsByType).toEqual({
      pdf: 2,
      docx: 1,
      doc: 1,
      png: 1,
      txt: 1,
    });
    expect(report.countsByLanguage).toEqual({
      en: 3,
      zh: 1,
    });
    expect(report.skipped).toEqual([
      {
        pathname: skippedPng.pathname,
        reason: "Unsupported file type: .png",
      },
      {
        pathname: skippedTxt.pathname,
        reason: "Unsupported file type: .txt",
      },
    ]);
    expect(report.skipped).toHaveLength(2);
  });
});
