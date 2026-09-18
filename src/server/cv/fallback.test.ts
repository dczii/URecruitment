import { describe, expect, it, vi } from "vitest";
import { createFakeModel } from "../ai/fake-model";
import type { AiModel, AiModelGenerateResult } from "../ai/types";
import { MIN_CHARS_PER_PAGE, type CvExtractionQuality } from "./extract";
import {
  MIN_CHARS_PER_PAGE_FOR_TEXT_PATH,
  decideParsePath,
  executeParsePath,
} from "./fallback";

const MODEL_ID = "fake-parse";
const MODEL_VERSION = "test-1";

const TEXT_OBJECT = { via: "text" } as const;
const FILE_OBJECT = { via: "file" } as const;

const MANGLED_ZH_TEXT = "锟斤拷 田小明 ����";
const PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);

type FileCapableFakeModel = AiModel & {
  supportsFileInput: boolean;
  generateObject: ReturnType<typeof vi.fn>;
  generateObjectFromFile: ReturnType<typeof vi.fn>;
};

function quality(partial: {
  avgCharsPerPage: number | null;
  isLikelyScanned: boolean;
  totalChars?: number;
  pageCount?: number | null;
}): CvExtractionQuality {
  const avgCharsPerPage = partial.avgCharsPerPage;
  return {
    totalChars:
      partial.totalChars ??
      (avgCharsPerPage === null ? 0 : Math.round(avgCharsPerPage)),
    pageCount: partial.pageCount ?? (avgCharsPerPage === null ? null : 1),
    avgCharsPerPage,
    isLikelyScanned: partial.isLikelyScanned,
  };
}

function textOnlyModel(object: unknown = TEXT_OBJECT): FileCapableFakeModel {
  const base = createFakeModel({
    modelId: MODEL_ID,
    modelVersion: MODEL_VERSION,
    object,
  });
  return {
    ...base,
    supportsFileInput: false,
    generateObject: vi.fn(base.generateObject),
    generateObjectFromFile: vi.fn(async () => {
      throw new Error("generateObjectFromFile must not run on a text-only model");
    }),
  };
}

function fileCapableModel(object: unknown = FILE_OBJECT): FileCapableFakeModel {
  const base = createFakeModel({
    modelId: MODEL_ID,
    modelVersion: MODEL_VERSION,
    object,
  });
  return {
    ...base,
    supportsFileInput: true,
    generateObject: vi.fn(base.generateObject),
    generateObjectFromFile: vi.fn(
      async (): Promise<AiModelGenerateResult> => ({ object }),
    ),
  };
}

describe("Chinese PDF parse-path fallback (AC1, AC4)", () => {
  it("AC1: the text-path threshold is a named export, distinct from the scanned-file bar", () => {
    expect(MIN_CHARS_PER_PAGE_FOR_TEXT_PATH).toEqual(expect.any(Number));
    expect(MIN_CHARS_PER_PAGE_FOR_TEXT_PATH).toBeGreaterThan(MIN_CHARS_PER_PAGE);
  });

  it("AC1: quality at the text-path threshold selects the text path", () => {
    expect(
      decideParsePath(
        quality({
          avgCharsPerPage: MIN_CHARS_PER_PAGE_FOR_TEXT_PATH,
          isLikelyScanned: false,
        }),
      ),
    ).toBe("text");
  });

  it("AC1: quality above the text-path threshold selects the text path", () => {
    expect(
      decideParsePath(
        quality({
          avgCharsPerPage: MIN_CHARS_PER_PAGE_FOR_TEXT_PATH + 400,
          isLikelyScanned: false,
        }),
      ),
    ).toBe("text");
  });

  it("AC1: quality below the text-path threshold selects the file path even when not scanned", () => {
    const avgCharsPerPage = MIN_CHARS_PER_PAGE + 1;
    expect(avgCharsPerPage).toBeGreaterThanOrEqual(MIN_CHARS_PER_PAGE);
    expect(avgCharsPerPage).toBeLessThan(MIN_CHARS_PER_PAGE_FOR_TEXT_PATH);

    const signal = quality({
      avgCharsPerPage,
      isLikelyScanned: false,
    });

    expect(signal.isLikelyScanned).toBe(false);
    expect(decideParsePath(signal)).toBe("file");
  });

  it("AC1: isLikelyScanned does not select the file path when extraction density is high", () => {
    expect(
      decideParsePath(
        quality({
          avgCharsPerPage: MIN_CHARS_PER_PAGE_FOR_TEXT_PATH,
          isLikelyScanned: true,
        }),
      ),
    ).toBe("text");
  });

  it("AC1: missing avgCharsPerPage (DOCX has no page density) selects the text path", () => {
    expect(
      decideParsePath(
        quality({
          avgCharsPerPage: null,
          isLikelyScanned: false,
          pageCount: null,
        }),
      ),
    ).toBe("text");
  });

  it("AC1/AC4: executing the text path calls the text model and records path 'text'", async () => {
    const model = textOnlyModel();

    const result = await executeParsePath({
      quality: quality({
        avgCharsPerPage: MIN_CHARS_PER_PAGE_FOR_TEXT_PATH,
        isLikelyScanned: false,
      }),
      cvText: "Alex Rivera, accountant at Northgate Logistics",
      fileBytes: PDF_BYTES,
      model,
    });

    expect(result.path).toBe("text");
    expect(result.object).toEqual(TEXT_OBJECT);
    expect(model.generateObject).toHaveBeenCalledTimes(1);
    expect(model.generateObject).toHaveBeenCalledWith(
      "Alex Rivera, accountant at Northgate Logistics",
    );
    expect(model.generateObjectFromFile).not.toHaveBeenCalled();
  });

  it("AC1/AC4: executing the file path sends the PDF bytes, not the mangled text, and records path 'file'", async () => {
    const model = fileCapableModel();

    const result = await executeParsePath({
      quality: quality({
        avgCharsPerPage: MIN_CHARS_PER_PAGE + 1,
        isLikelyScanned: false,
      }),
      cvText: MANGLED_ZH_TEXT,
      fileBytes: PDF_BYTES,
      model,
    });

    expect(result.path).toBe("file");
    expect(result.object).toEqual(FILE_OBJECT);
    expect(model.generateObjectFromFile).toHaveBeenCalledTimes(1);
    expect(model.generateObjectFromFile).toHaveBeenCalledWith(PDF_BYTES);
    expect(model.generateObject).not.toHaveBeenCalled();
    expect(model.generateObject).not.toHaveBeenCalledWith(MANGLED_ZH_TEXT);
  });

  it("AC1: file path with a model that does not support file input fails clearly instead of falling back to text", async () => {
    const model = createFakeModel({
      modelId: MODEL_ID,
      modelVersion: MODEL_VERSION,
      object: TEXT_OBJECT,
    });
    const generateObject = vi.spyOn(model, "generateObject");

    let thrown: unknown;
    try {
      await executeParsePath({
        quality: quality({
          avgCharsPerPage: MIN_CHARS_PER_PAGE + 1,
          isLikelyScanned: false,
        }),
        cvText: MANGLED_ZH_TEXT,
        fileBytes: PDF_BYTES,
        model,
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Error);
    const message = thrown instanceof Error ? thrown.message : String(thrown);
    expect(message).toMatch(/file parse path/i);
    expect(message).toMatch(/does not support/i);
    expect(message).toMatch(/file input/i);
    expect(message).not.toMatch(/openai|anthropic|gemini|claude|vertex/i);

    expect(generateObject).not.toHaveBeenCalled();
    expect(model).not.toHaveProperty("supportsFileInput");
    expect(model).not.toHaveProperty("generateObjectFromFile");
  });
});
