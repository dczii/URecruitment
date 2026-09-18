import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeModel } from "../ai/fake-model";
import {
  PARSE_CV_PROMPT_ID,
  PARSE_CV_PROMPT_VERSION,
  type ParseCvOutput,
} from "../ai/prompts/parse-cv";
import { runAi } from "../ai/run";
import type { AiRunRecord, AiRunsWriter } from "../ai/types";
import { getDb } from "../db";
import { parseCv } from "./parse";
import { computeTotalYears } from "./total-years";

vi.mock("../db", () => ({ getDb: vi.fn() }));

vi.mock("../ai/run", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../ai/run")>();
  return {
    ...actual,
    runAi: vi.fn(actual.runAi),
  };
});

/** Fictional ids — never a real candidate row. */
const CANDIDATE_ID = "00000000-0000-0000-0000-000000000011";
const CV_FILE_ID = "00000000-0000-0000-0000-000000000012";

const MODEL_ID = "fake-parse";
const MODEL_VERSION = "test-1";
const COST_USD = 0.012;

/**
 * Fictional CV. Every source_text in VALID_PARSE_OUTPUT is a verbatim substring.
 * The "20 years" claim is deliberate: total years must come from work history.
 */
const CV_TEXT = `Alex Rivera
alex.rivera.fictional@example.com | +65 8000 0001 | Singapore
Nationality: Canadian. Age: 41. Gender: female. Religion: none. Marital status: married.

20 years of experience.

Work Experience
Accountant, Northgate Logistics, Jan 2018 - Jan 2020
Senior Accountant, Meridian Trading Pte Ltd, Jan 2021 - Jan 2023

Education
Bachelor of Accountancy, Fictional National University, 2017

Skills: SAP FICO, Excel
Languages: English
`;

const VALID_PARSE_OUTPUT: ParseCvOutput = {
  name: "Alex Rivera",
  name_source_text: "Alex Rivera",
  email: "alex.rivera.fictional@example.com",
  email_source_text: "alex.rivera.fictional@example.com",
  phone: "+65 8000 0001",
  phone_source_text: "+65 8000 0001",
  location: "Singapore",
  location_source_text: "Singapore",
  work_history: [
    {
      employer: "Northgate Logistics",
      employer_source_text: "Northgate Logistics",
      job_title: "Accountant",
      job_title_source_text: "Accountant",
      start: "2018-01",
      end: "2020-01",
      current: false,
      source_text: "Accountant, Northgate Logistics, Jan 2018 - Jan 2020",
    },
    {
      employer: "Meridian Trading Pte Ltd",
      employer_source_text: "Meridian Trading Pte Ltd",
      job_title: "Senior Accountant",
      job_title_source_text: "Senior Accountant",
      start: "2021-01",
      end: "2023-01",
      current: false,
      source_text:
        "Senior Accountant, Meridian Trading Pte Ltd, Jan 2021 - Jan 2023",
    },
  ],
  education: [
    {
      institution: "Fictional National University",
      qualification: "Bachelor of Accountancy",
      year: "2017",
      source_text:
        "Bachelor of Accountancy, Fictional National University, 2017",
    },
  ],
  certifications: [],
  skills: [
    { skill: "SAP FICO", source_text: "SAP FICO" },
    { skill: "Excel", source_text: "Excel" },
  ],
  languages_spoken: ["English"],
  prompt_injection_detected: false,
  prompt_injection_note: null,
};

const INVENTED_QUOTE = "INVENTED_QUOTE_NOT_IN_CV";

const PROTECTED_ATTRIBUTE_KEYS = [
  "age",
  "gender",
  "race",
  "religion",
  "marital_status",
  "photo",
  "date_of_birth",
] as const;

type InsertCall = { table: string; payload: unknown };
type UpdateCall = { table: string; payload: unknown };

function thenable(result: { data: unknown; error: null }) {
  const chain: {
    select: () => typeof chain;
    single: () => Promise<typeof result>;
    maybeSingle: () => Promise<typeof result>;
    eq: () => Promise<typeof result>;
    then: Promise<typeof result>["then"];
  } = {
    select: () => chain,
    single: async () => result,
    maybeSingle: async () => result,
    eq: async () => result,
    then: (onFulfilled, onRejected) =>
      Promise.resolve(result).then(onFulfilled, onRejected),
  };
  return chain;
}

function createDbMock() {
  const inserts: InsertCall[] = [];
  const updates: UpdateCall[] = [];

  const from = vi.fn((table: string) => ({
    insert: vi.fn((payload: unknown) => {
      inserts.push({ table, payload });
      const data = Array.isArray(payload)
        ? payload.map((row, index) => ({
            id: `${table}-${index}`,
            ...(row as object),
          }))
        : { id: `${table}-1`, ...(payload as object) };
      return thenable({ data, error: null });
    }),
    update: vi.fn((payload: unknown) => {
      updates.push({ table, payload });
      return {
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    }),
  }));

  vi.mocked(getDb).mockReturnValue({ from } as never);
  return { from, inserts, updates };
}

function createMemoryRuns(): AiRunsWriter & { rows: AiRunRecord[] } {
  const rows: AiRunRecord[] = [];
  return {
    rows,
    write(row) {
      rows.push({ ...row });
    },
  };
}

function rowsFor(
  inserts: InsertCall[],
  table: string,
): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  for (const call of inserts.filter((item) => item.table === table)) {
    if (Array.isArray(call.payload)) {
      for (const row of call.payload) {
        rows.push(row as Record<string, unknown>);
      }
    } else if (call.payload && typeof call.payload === "object") {
      rows.push(call.payload as Record<string, unknown>);
    }
  }
  return rows;
}

function parsedFromInserts(
  inserts: InsertCall[],
): Record<string, unknown> | undefined {
  const profile = rowsFor(inserts, "candidate_profiles")[0];
  if (!profile) {
    return undefined;
  }
  const parsed = profile.parsed;
  if (parsed && typeof parsed === "object") {
    return parsed as Record<string, unknown>;
  }
  return undefined;
}

function expectNumericCostAndDuration(row: AiRunRecord): void {
  expect(typeof row.cost_usd).toBe("number");
  expect(Number.isFinite(row.cost_usd)).toBe(true);
  expect(typeof row.duration_ms).toBe("number");
  expect(Number.isFinite(row.duration_ms)).toBe(true);
}

async function runParse(args: {
  object?: ParseCvOutput;
  cvText?: string;
  runs?: AiRunsWriter & { rows: AiRunRecord[] };
  db?: ReturnType<typeof createDbMock>;
}) {
  const db = args.db ?? createDbMock();
  const runs = args.runs ?? createMemoryRuns();
  const model = createFakeModel({
    modelId: MODEL_ID,
    modelVersion: MODEL_VERSION,
    object: args.object ?? VALID_PARSE_OUTPUT,
    costUsd: COST_USD,
  });

  await parseCv({
    candidateId: CANDIDATE_ID,
    cvFileId: CV_FILE_ID,
    cvText: args.cvText ?? CV_TEXT,
    model,
    runs,
  });

  return { db, runs, model };
}

describe("parseCv (AC1, AC2, AC3, AC4)", () => {
  beforeEach(() => {
    vi.mocked(runAi).mockClear();
  });

  it("AC1: persists profile and skills with source text", async () => {
    const { db } = await runParse({});

    const profiles = rowsFor(db.inserts, "candidate_profiles");
    expect(profiles).toHaveLength(1);
    expect(profiles[0]?.candidate_id).toBe(CANDIDATE_ID);
    expect(profiles[0]?.parsed).toEqual(expect.any(Object));

    const parsed = parsedFromInserts(db.inserts);
    expect(parsed).toBeDefined();
    expect(parsed?.name).toBe("Alex Rivera");
    expect(parsed?.work_history).toEqual(VALID_PARSE_OUTPUT.work_history);
    for (const key of PROTECTED_ATTRIBUTE_KEYS) {
      expect(parsed).not.toHaveProperty(key);
    }

    const skills = rowsFor(db.inserts, "candidate_skills");
    expect(skills).toHaveLength(VALID_PARSE_OUTPUT.skills.length);
    expect(skills).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          candidate_id: CANDIDATE_ID,
          skill: "SAP FICO",
          source_text: "SAP FICO",
        }),
        expect.objectContaining({
          candidate_id: CANDIDATE_ID,
          skill: "Excel",
          source_text: "Excel",
        }),
      ]),
    );
    for (const row of skills) {
      expect(typeof row.source_text).toBe("string");
      expect(String(row.source_text).length).toBeGreaterThan(0);
      expect(CV_TEXT).toContain(String(row.source_text));
    }
  });

  it("AC3: rejects an invented quote", async () => {
    const db = createDbMock();
    const invented: ParseCvOutput = {
      ...VALID_PARSE_OUTPUT,
      skills: [
        { skill: "SAP FICO", source_text: INVENTED_QUOTE },
        { skill: "Excel", source_text: "Excel" },
      ],
    };

    let thrown: unknown;
    try {
      await runParse({ object: invented, db });
    } catch (error) {
      thrown = error;
    }

    expect(CV_TEXT.includes(INVENTED_QUOTE)).toBe(false);
    expect(rowsFor(db.inserts, "candidate_profiles")).toHaveLength(0);
    expect(rowsFor(db.inserts, "candidate_skills")).toHaveLength(0);

    const cvFileFailure = db.updates.some((call) => {
      if (call.table !== "cv_files") {
        return false;
      }
      const payload = call.payload as {
        parse_error?: unknown;
        parse_status?: unknown;
      };
      return (
        typeof payload.parse_error === "string" &&
        payload.parse_error.trim().length > 0
      );
    });
    const thrownReason =
      thrown instanceof Error && thrown.message.trim().length > 0;

    expect(cvFileFailure || thrownReason).toBe(true);
  });

  it("AC2: ignores the CV's own years claim", async () => {
    const { db } = await runParse({});

    const parsed = parsedFromInserts(db.inserts);
    expect(parsed).toBeDefined();

    const expectedYears = computeTotalYears(VALID_PARSE_OUTPUT.work_history);
    expect(expectedYears).toBe(4);
    expect(parsed?.total_years).toBe(expectedYears);
    expect(parsed?.total_years).not.toBe(20);
    expect(CV_TEXT).toContain("20 years of experience");
  });

  it("AC4: writes ai_runs row via runAi", async () => {
    const runs = createMemoryRuns();
    const { model } = await runParse({ runs });

    expect(runAi).toHaveBeenCalledTimes(1);
    const args = vi.mocked(runAi).mock.calls[0]?.[0];
    expect(args).toBeDefined();
    expect(args?.prompt.id).toBe(PARSE_CV_PROMPT_ID);
    expect(args?.prompt.version).toBe(PARSE_CV_PROMPT_VERSION);
    expect(args?.prompt.id).toBe("parse-cv");
    expect(args?.model).toBe(model);
    expect(args?.runs).toBe(runs);

    const completed = runs.rows.filter(
      (row) => row.status === "succeeded" || row.status === "failed",
    );
    expect(completed.length).toBeGreaterThanOrEqual(1);
    const row = completed[0];
    expect(row.model_id).toBe(MODEL_ID);
    expect(row.model_version).toBe(MODEL_VERSION);
    expect(row.prompt_version).toBe(PARSE_CV_PROMPT_VERSION);
    expectNumericCostAndDuration(row);
    expect(row.cost_usd).toBe(COST_USD);
  });
});
