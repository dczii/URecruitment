import { readFileSync } from "node:fs";
import { join } from "node:path";
import { crc32 } from "node:zlib";
import { describe, expect, it } from "vitest";
import { MIN_CHARS_PER_PAGE, extractCvText } from "./extract";

const EXTRACT_SOURCE_PATH = join(process.cwd(), "src/server/cv/extract.ts");

const PDF_CONTENT_TYPE = "application/pdf";
const DOCX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const EN_CV_SNIPPET =
  "Jane Tan-Test, 5 years as a Software Engineer at Fictional Corp";
const ZH_CV_SNIPPET =
  "田小明，五年软件工程师经验，曾在虚构科技有限公司负责后端开发与系统架构设计";
const DOCX_CV_SNIPPET =
  "Priya Rao-Test, 3 years as a Product Manager at Imaginary Labs";

function firstNonEmptyLine(source: string): string {
  for (const line of source.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return "";
}

function readExtractSource(): string {
  return readFileSync(EXTRACT_SOURCE_PATH, "utf8");
}

/** Collapse whitespace so PDF extractors that insert glyph gaps still match. */
function foldedText(value: string): string {
  return value.replace(/\s+/g, "").toLowerCase();
}

function concatBytes(parts: readonly Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.byteLength;
  }
  return out;
}

function pdfEscape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function streamObject(content: string): string {
  const length = new TextEncoder().encode(content).byteLength;
  return `<< /Length ${length} >>\nstream\n${content}endstream`;
}

/** Minimal valid PDF 1.4 with correct xref offsets (ASCII objects only). */
function buildPdf(objects: readonly string[]): Uint8Array {
  const encoder = new TextEncoder();
  const header = encoder.encode("%PDF-1.4\n");
  const chunks: Uint8Array[] = [header];
  const offsets = [0];
  let position = header.byteLength;

  objects.forEach((body, index) => {
    const objectBytes = encoder.encode(
      `${index + 1} 0 obj\n${body}\nendobj\n`,
    );
    offsets.push(position);
    chunks.push(objectBytes);
    position += objectBytes.byteLength;
  });

  const xrefEntries = ["xref", `0 ${objects.length + 1}`, "0000000000 65535 f "];
  for (let i = 1; i <= objects.length; i += 1) {
    xrefEntries.push(`${String(offsets[i]).padStart(10, "0")} 00000 n `);
  }
  chunks.push(
    encoder.encode(
      `${xrefEntries.join("\n")}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${position}\n%%EOF\n`,
    ),
  );
  return concatBytes(chunks);
}

function buildTextPdf(snippet: string): Uint8Array {
  const content = [
    "BT",
    "/F1 12 Tf",
    "72 720 Td",
    `(${pdfEscape(snippet)}) Tj`,
    "ET",
    "",
  ].join("\n");

  return buildPdf([
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    streamObject(content),
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ]);
}

function bmpHex(char: string): string {
  const codePoint = char.codePointAt(0);
  if (codePoint === undefined || codePoint > 0xffff) {
    throw new Error("Chinese PDF fixture characters must be in the BMP");
  }
  return codePoint.toString(16).toUpperCase().padStart(4, "0");
}

function buildToUnicodeCmap(snippet: string): string {
  const mappings = [...snippet].map((char, index) => {
    const src = (index + 1).toString(16).toUpperCase().padStart(2, "0");
    return `<${src}> <${bmpHex(char)}>`;
  });
  return [
    "/CIDInit /ProcSet findresource begin",
    "12 dict begin",
    "begincmap",
    "/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def",
    "/CMapName /Adobe-Identity-UCS def",
    "/CMapType 2 def",
    "1 begincodespacerange",
    "<00> <FF>",
    "endcodespacerange",
    `${mappings.length} beginbfchar`,
    ...mappings,
    "endbfchar",
    "endcmap",
    "CMapName currentdict /CMap defineresource pop",
    "end",
    "end",
    "",
  ].join("\n");
}

/**
 * One-page PDF that shows the snippet as single-byte codes with a ToUnicode
 * map, so a real extractor can recover Simplified Chinese from a standard font.
 */
function buildChineseTextPdf(snippet: string): Uint8Array {
  const chars = [...snippet];
  if (chars.length > 255) {
    throw new Error("Chinese PDF fixture is too long for single-byte codes");
  }
  const hex = chars
    .map((_, index) =>
      (index + 1).toString(16).toUpperCase().padStart(2, "0"),
    )
    .join("");
  const content = [
    "BT",
    "/F1 12 Tf",
    "72 720 Td",
    `<${hex}> Tj`,
    "ET",
    "",
  ].join("\n");

  return buildPdf([
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    streamObject(content),
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /FirstChar 1 /LastChar ${chars.length} /ToUnicode 6 0 R >>`,
    streamObject(buildToUnicodeCmap(snippet)),
  ]);
}

/** Valid one-page PDF with a MediaBox and an empty content stream — no BT/ET. */
function buildImageOnlyPdf(): Uint8Array {
  return buildPdf([
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << >> >>",
    streamObject(""),
  ]);
}

function u16le(value: number): Uint8Array {
  const bytes = new Uint8Array(2);
  new DataView(bytes.buffer).setUint16(0, value, true);
  return bytes;
}

function u32le(value: number): Uint8Array {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, true);
  return bytes;
}

/** STORED (method 0) ZIP — no extra zip dependency. */
function buildZip(files: readonly { path: string; content: string }[]): Uint8Array {
  const encoder = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let localOffset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.path);
    const data = encoder.encode(file.content);
    const checksum = crc32(data);

    const localHeader = concatBytes([
      u32le(0x04034b50),
      u16le(20),
      u16le(0),
      u16le(0),
      u16le(0),
      u16le(0),
      u32le(checksum),
      u32le(data.byteLength),
      u32le(data.byteLength),
      u16le(nameBytes.byteLength),
      u16le(0),
      nameBytes,
      data,
    ]);
    locals.push(localHeader);

    centrals.push(
      concatBytes([
        u32le(0x02014b50),
        u16le(20),
        u16le(20),
        u16le(0),
        u16le(0),
        u16le(0),
        u16le(0),
        u32le(checksum),
        u32le(data.byteLength),
        u32le(data.byteLength),
        u16le(nameBytes.byteLength),
        u16le(0),
        u16le(0),
        u16le(0),
        u16le(0),
        u32le(0),
        u32le(localOffset),
        nameBytes,
      ]),
    );
    localOffset += localHeader.byteLength;
  }

  const localBlob = concatBytes(locals);
  const centralBlob = concatBytes(centrals);
  const eocd = concatBytes([
    u32le(0x06054b50),
    u16le(0),
    u16le(0),
    u16le(files.length),
    u16le(files.length),
    u32le(centralBlob.byteLength),
    u32le(localBlob.byteLength),
    u16le(0),
  ]);
  return concatBytes([localBlob, centralBlob, eocd]);
}

function buildDocx(snippet: string): Uint8Array {
  const contentTypes = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
    '<Default Extension="xml" ContentType="application/xml"/>',
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>',
    "</Types>",
  ].join("");

  const rels = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>',
    "</Relationships>",
  ].join("");

  const documentRels = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>',
  ].join("");

  const documentXml = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
    "<w:body><w:p><w:r>",
    `<w:t>${snippet}</w:t>`,
    "</w:r></w:p></w:body></w:document>",
  ].join("");

  return buildZip([
    { path: "[Content_Types].xml", content: contentTypes },
    { path: "_rels/.rels", content: rels },
    { path: "word/_rels/document.xml.rels", content: documentRels },
    { path: "word/document.xml", content: documentXml },
  ]);
}

describe("extract (AC1, AC2)", () => {
  it("AC1: extracts text from an English text PDF", async () => {
    const result = await extractCvText(
      buildTextPdf(EN_CV_SNIPPET),
      PDF_CONTENT_TYPE,
    );

    expect(foldedText(result.text)).toContain(foldedText(EN_CV_SNIPPET));
    expect(result.quality.isLikelyScanned).toBe(false);
  });

  it("AC1: extracts text from a Simplified Chinese text PDF", async () => {
    const result = await extractCvText(
      buildChineseTextPdf(ZH_CV_SNIPPET),
      PDF_CONTENT_TYPE,
    );

    expect(foldedText(result.text)).toContain(foldedText(ZH_CV_SNIPPET));
    expect(result.quality.isLikelyScanned).toBe(false);
  });

  it("AC1: extracts text from a DOCX", async () => {
    const result = await extractCvText(
      buildDocx(DOCX_CV_SNIPPET),
      DOCX_CONTENT_TYPE,
    );

    expect(foldedText(result.text)).toContain(foldedText(DOCX_CV_SNIPPET));
    expect(result.quality.pageCount).toBeNull();
    expect(result.quality.isLikelyScanned).toBe(false);
  });

  it("AC2: flags an image-only PDF as likely scanned", async () => {
    const result = await extractCvText(buildImageOnlyPdf(), PDF_CONTENT_TYPE);

    expect(result.quality.isLikelyScanned).toBe(true);
    expect(result.quality.avgCharsPerPage).toEqual(expect.any(Number));
    expect(result.quality.avgCharsPerPage).toBeLessThan(MIN_CHARS_PER_PAGE);
  });

  it("AC2: image-only threshold is a single documented constant", () => {
    const source = readExtractSource();
    expect(source.match(/MIN_CHARS_PER_PAGE\s*=/g)?.length).toBe(1);
  });

  it("AC2: never imports an OCR/image-recognition package", () => {
    const source = readExtractSource();
    expect(source).not.toMatch(/tesseract|ocr|recognize|vision/i);
  });

  it('AC1: extract.ts starts with import "server-only"', () => {
    const source = readExtractSource();
    expect(firstNonEmptyLine(source)).toBe('import "server-only";');
  });
});
