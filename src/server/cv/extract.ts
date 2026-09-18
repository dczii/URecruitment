import "server-only";

import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import mammoth from "mammoth";
import { getDocument, VerbosityLevel } from "pdfjs-dist/legacy/build/pdf.mjs";

/**
 * Image-only PDF bar: average non-whitespace characters per page.
 * A page with no text layer extracts to about 0, which is below this.
 * A genuine one-page CV — EN or ZH — is far above it.
 */
export const MIN_CHARS_PER_PAGE = 20;

export type CvContentType =
  | "application/pdf"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export interface CvExtractionQuality {
  totalChars: number;
  pageCount: number | null;
  avgCharsPerPage: number | null;
  isLikelyScanned: boolean;
}

export interface CvExtractionResult {
  text: string;
  quality: CvExtractionQuality;
}

const PDF_CONTENT_TYPE: CvContentType = "application/pdf";

// Resolved lazily (not at module scope): Next's build-time page-data
// collection evaluates every module a route imports, and `import.meta.url`
// is unreliable in that phase under the bundler — eagerly resolving here
// broke `npm run build` for the first route to ever import this module
// (`createRequire(import.meta.url).resolve(...)` throws "path argument
// must be of type string"). Deferring to first real call sidesteps that
// build-time evaluation entirely; runtime behavior is unchanged.
let pdfjsAssetUrls: { cMapUrl: string; standardFontDataUrl: string } | null =
  null;

function getPdfjsAssetUrls(): { cMapUrl: string; standardFontDataUrl: string } {
  if (pdfjsAssetUrls === null) {
    const pdfjsRoot = dirname(
      createRequire(import.meta.url).resolve("pdfjs-dist/package.json"),
    );
    pdfjsAssetUrls = {
      cMapUrl: `${join(pdfjsRoot, "cmaps")}/`,
      standardFontDataUrl: `${join(pdfjsRoot, "standard_fonts")}/`,
    };
  }
  return pdfjsAssetUrls;
}

const EMPTY_UNUSABLE: CvExtractionResult = {
  text: "",
  quality: {
    totalChars: 0,
    pageCount: null,
    avgCharsPerPage: null,
    isLikelyScanned: true,
  },
};

function countNonWhitespaceChars(value: string): number {
  return value.replace(/\s/g, "").length;
}

function textFromPdfItems(items: readonly object[]): string {
  let out = "";
  for (const item of items) {
    if ("str" in item && typeof item.str === "string") {
      out += item.str;
    }
  }
  return out;
}

async function extractPdfText(bytes: Uint8Array): Promise<CvExtractionResult> {
  try {
    // v6 Node build already uses a fake (in-process) worker; copy `data`
    // because pdf.js may transfer/detach the ArrayBuffer. Local CMap and
    // standard-font paths keep glyph mapping on disk (no network).
    const { cMapUrl, standardFontDataUrl } = getPdfjsAssetUrls();
    const loadingTask = getDocument({
      data: bytes.slice(),
      cMapUrl,
      cMapPacked: true,
      standardFontDataUrl,
      useSystemFonts: false,
      verbosity: VerbosityLevel.ERRORS,
    });
    try {
      const pdf = await loadingTask.promise;
      const pageCount = pdf.numPages;
      const pageTexts: string[] = [];
      for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        pageTexts.push(textFromPdfItems(content.items));
      }
      const text = pageTexts.join("\n");
      const totalChars = countNonWhitespaceChars(text);
      const avgCharsPerPage = pageCount === 0 ? 0 : totalChars / pageCount;
      return {
        text,
        quality: {
          totalChars,
          pageCount,
          avgCharsPerPage,
          isLikelyScanned: avgCharsPerPage < MIN_CHARS_PER_PAGE,
        },
      };
    } finally {
      await loadingTask.destroy();
    }
  } catch {
    return EMPTY_UNUSABLE;
  }
}

async function extractDocxText(bytes: Uint8Array): Promise<CvExtractionResult> {
  try {
    const extracted = await mammoth.extractRawText({
      buffer: Buffer.from(bytes),
    });
    const text = extracted.value;
    return {
      text,
      quality: {
        totalChars: countNonWhitespaceChars(text),
        pageCount: null,
        avgCharsPerPage: null,
        isLikelyScanned: false,
      },
    };
  } catch {
    return {
      text: "",
      quality: {
        totalChars: 0,
        pageCount: null,
        avgCharsPerPage: null,
        isLikelyScanned: false,
      },
    };
  }
}

export async function extractCvText(
  bytes: Uint8Array,
  contentType: CvContentType,
): Promise<CvExtractionResult> {
  if (contentType === PDF_CONTENT_TYPE) {
    return extractPdfText(bytes);
  }
  return extractDocxText(bytes);
}
