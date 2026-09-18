import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "../db";
import { checkMissingFields, persistMissingFieldFlags } from "./missing-fields";

vi.mock("../db", () => ({ getDb: vi.fn() }));

/**
 * T1a contract — implement these in `src/server/gap-check/missing-fields.ts` (T1b).
 *
 * checkMissingFields(jobVersion) → MissingFieldFlag[]
 *   Pure function. No DB, no model. Walks the seven PRD-approved missing-field
 *   rules and returns zero or one flag per rule (a flat array, no duplicate
 *   `field` values in one invocation). Silent when the field has a real value.
 *
 * persistMissingFieldFlags(jobVersionId, flags) → void (async)
 *   Inserts one `gap_flags` row per flag. `gap_flags` has no `field` column
 *   (see `20260918000001_clients_jobs.sql`); persist `job_version_id`,
 *   `flag_type`, `reason`, `suggested_question`, `resolution_state` only.
 *
 * ---------------------------------------------------------------------------
 * `fields` shape this check reads (extension of `job_versions.fields` jsonb).
 * No other module defines this yet — the job form (#43) only stores `title`
 * and free-text `requirements`. Keys below are the contract T1b implements.
 *
 *   fields.salary_range        string   e.g. "SGD 8,000–12,000 per month"
 *   fields.location            string   e.g. "Singapore"
 *   fields.work_arrangement    string   e.g. "Hybrid, three days in the office"
 *   fields.employment_type     string   e.g. "Permanent"
 *   fields.headcount           number   positive integer, e.g. 2
 *   fields.start_date          string   ISO date YYYY-MM-DD, e.g. "2026-11-03"
 *   fields.interview_steps     string   e.g. "Recruiter screen, client final"
 *
 * String fields are present iff `typeof value === "string"` and
 * `value.trim().length > 0`. Missing key, `null`, `undefined`, `""` and
 * whitespace-only all count as absent.
 *
 * `headcount` is present iff it is a finite number `> 0`.
 *
 * Location / work arrangement is ONE rule: present if either
 * `fields.location` OR `fields.work_arrangement` is a non-blank string.
 * Absent only when both are absent/blank. Flag `field` is
 * `"location_or_work_arrangement"`.
 *
 * `must_haves` is NOT in `fields`. It is the existing `job_versions.must_haves`
 * array from `jobVersionInputSchema`: `{ text: string, marking: "must_have" }[]`.
 * Absent when the array is missing or empty. Present when it has at least
 * one entry.
 *
 * Other `fields` keys (`title`, `requirements`, …) are ignored.
 *
 * jobVersion (minimal shape this function reads):
 *   { fields: GapCheckFields, must_haves: MustHave[] }
 *
 * Flag object:
 *   { flag_type: "missing", field: MissingFieldId, reason: string,
 *     suggested_question: string }
 * `reason` is why it matters (recruiter language). `suggested_question` is
 * the client-facing question. Neither is a technical error message.
 */

type MustHave = { text: string; marking: "must_have" };

type GapCheckFields = {
  salary_range?: string | null;
  location?: string | null;
  work_arrangement?: string | null;
  employment_type?: string | null;
  headcount?: number | null;
  start_date?: string | null;
  interview_steps?: string | null;
};

type GapCheckJobVersion = {
  fields: GapCheckFields;
  must_haves: MustHave[];
};

type MissingFieldId =
  | "salary_range"
  | "location_or_work_arrangement"
  | "employment_type"
  | "headcount"
  | "start_date"
  | "must_haves"
  | "interview_steps";

type MissingFieldFlag = {
  flag_type: "missing";
  field: MissingFieldId;
  reason: string;
  suggested_question: string;
};

const MISSING_FIELD_IDS: MissingFieldId[] = [
  "salary_range",
  "location_or_work_arrangement",
  "employment_type",
  "headcount",
  "start_date",
  "must_haves",
  "interview_steps",
];

/** Pinned copy T1b must return — recruiter/client language, not tech errors. */
const MISSING_FIELD_COPY: Record<
  MissingFieldId,
  { reason: string; suggested_question: string }
> = {
  salary_range: {
    reason:
      "Without a salary range, candidates cannot tell if the role is in reach, and recruiters cannot screen or set expectations.",
    suggested_question: "What is the salary range for this role?",
  },
  location_or_work_arrangement: {
    reason:
      "Without a location or work arrangement, candidates cannot tell whether they can take the role, and recruiters may spend time on people who cannot work there.",
    suggested_question:
      "Where is this role based, and is it on-site, hybrid or remote?",
  },
  employment_type: {
    reason:
      "Permanent, contract and part-time roles attract different people. Recruiters cannot search or brief candidates without the employment type.",
    suggested_question: "Is this a permanent, contract or part-time role?",
  },
  headcount: {
    reason:
      "Headcount tells recruiters how many people to source and when this search is filled.",
    suggested_question: "How many people are you looking to hire for this role?",
  },
  start_date: {
    reason:
      "A start date lets recruiters judge candidate availability and plan a realistic search timeline.",
    suggested_question: "When do you need this person to start?",
  },
  must_haves: {
    reason:
      "Without must-have skills, matching cannot tell a deal-breaker from a nice-to-have, and recruiters cannot screen with confidence.",
    suggested_question:
      "Which skills or experience are must-haves for this role?",
  },
  interview_steps: {
    reason:
      "Interview steps set candidate expectations and let recruiters plan the process and stage timings.",
    suggested_question: "What are the interview steps for this role?",
  },
};

const COMPLETE_FIELDS = {
  salary_range: "SGD 8,000–12,000 per month",
  location: "Singapore",
  work_arrangement: "Hybrid, three days in the office",
  employment_type: "Permanent",
  headcount: 2,
  start_date: "2026-11-03",
  interview_steps:
    "Recruiter screen, hiring-manager interview, client final round",
} as const;

const COMPLETE_MUST_HAVES: MustHave[] = [
  {
    text: "Five years of Python in a backend role",
    marking: "must_have",
  },
];

/** Fictional job_versions.id — never a real client job. */
const JOB_VERSION_ID = "00000000-0000-0000-0000-000000000201";

const GAP_FLAGS_INSERT_COLUMNS = [
  "job_version_id",
  "flag_type",
  "reason",
  "suggested_question",
  "resolution_state",
  "resolution_note",
  "id",
  "created_at",
] as const;

function expectedFlag(field: MissingFieldId): MissingFieldFlag {
  return {
    flag_type: "missing",
    field,
    ...MISSING_FIELD_COPY[field],
  };
}

function fullySpecified(
  overrides: {
    fields?: Partial<GapCheckFields>;
    must_haves?: MustHave[];
  } = {},
): GapCheckJobVersion {
  return {
    fields: { ...COMPLETE_FIELDS, ...overrides.fields },
    must_haves: overrides.must_haves ?? [...COMPLETE_MUST_HAVES],
  };
}

function fullySpecifiedOmitting(
  ...keys: Array<keyof typeof COMPLETE_FIELDS>
): GapCheckJobVersion {
  const fields: GapCheckFields = { ...COMPLETE_FIELDS };
  for (const key of keys) {
    delete fields[key];
  }
  return { fields, must_haves: [...COMPLETE_MUST_HAVES] };
}

function emptyJob(): GapCheckJobVersion {
  return { fields: {}, must_haves: [] };
}

function flagFields(flags: MissingFieldFlag[]): MissingFieldId[] {
  return flags.map((flag) => flag.field);
}

type QueryResult = {
  data: unknown;
  error: { message: string } | null;
};

function thenable(result: QueryResult) {
  const chain: {
    select: () => typeof chain;
    single: () => Promise<QueryResult>;
    then: Promise<QueryResult>["then"];
  } = {
    select: () => chain,
    single: async () => result,
    then: (onfulfilled, onrejected) =>
      Promise.resolve(result).then(onfulfilled, onrejected),
  };
  return chain;
}

function mockGapFlagsDb() {
  const insert = vi.fn((payload: unknown) =>
    thenable({ data: payload, error: null }),
  );
  const from = vi.fn((_table: string) => ({ insert }));
  vi.mocked(getDb).mockReturnValue({ from } as never);
  return { from, insert };
}

function insertedRows(
  insert: ReturnType<typeof mockGapFlagsDb>["insert"],
): Record<string, unknown>[] {
  return insert.mock.calls.flatMap((call) => {
    const payload = call[0];
    if (Array.isArray(payload)) {
      return payload as Record<string, unknown>[];
    }
    return [payload as Record<string, unknown>];
  });
}

beforeEach(() => {
  vi.mocked(getDb).mockReset();
});

describe("checkMissingFields", () => {
  it("AC1: missing salary range raises a flag with a question", () => {
    const flags = checkMissingFields(fullySpecifiedOmitting("salary_range"));

    expect(flags).toHaveLength(1);
    expect(flags[0]).toEqual(expectedFlag("salary_range"));
    expect(flags[0]?.reason.trim().length).toBeGreaterThan(0);
    expect(flags[0]?.suggested_question.trim().length).toBeGreaterThan(0);
    expect(flags[0]?.suggested_question).toMatch(/\?/);
  });

  it("AC2: missing location and work arrangement raises exactly one location_or_work_arrangement flag", () => {
    const flags = checkMissingFields(
      fullySpecifiedOmitting("location", "work_arrangement"),
    );

    expect(flags).toHaveLength(1);
    expect(flags[0]).toEqual(expectedFlag("location_or_work_arrangement"));
  });

  it("AC2: missing employment type raises exactly one employment_type flag", () => {
    const flags = checkMissingFields(
      fullySpecifiedOmitting("employment_type"),
    );

    expect(flags).toHaveLength(1);
    expect(flags[0]).toEqual(expectedFlag("employment_type"));
  });

  it("AC2: missing headcount raises exactly one headcount flag", () => {
    const flags = checkMissingFields(fullySpecifiedOmitting("headcount"));

    expect(flags).toHaveLength(1);
    expect(flags[0]).toEqual(expectedFlag("headcount"));
  });

  it("AC2: missing start date raises exactly one start_date flag", () => {
    const flags = checkMissingFields(fullySpecifiedOmitting("start_date"));

    expect(flags).toHaveLength(1);
    expect(flags[0]).toEqual(expectedFlag("start_date"));
  });

  it("AC2: empty must_haves raises exactly one must_haves flag", () => {
    const flags = checkMissingFields(fullySpecified({ must_haves: [] }));

    expect(flags).toHaveLength(1);
    expect(flags[0]).toEqual(expectedFlag("must_haves"));
  });

  it("AC2: missing interview steps raises exactly one interview_steps flag", () => {
    const flags = checkMissingFields(
      fullySpecifiedOmitting("interview_steps"),
    );

    expect(flags).toHaveLength(1);
    expect(flags[0]).toEqual(expectedFlag("interview_steps"));
  });

  it("AC3: a present salary_range raises no salary_range flag", () => {
    const flags = checkMissingFields({
      fields: { salary_range: COMPLETE_FIELDS.salary_range },
      must_haves: [],
    });

    expect(flagFields(flags)).not.toContain("salary_range");
  });

  it("AC3: a present location raises no location_or_work_arrangement flag", () => {
    const flags = checkMissingFields({
      fields: { location: COMPLETE_FIELDS.location },
      must_haves: [],
    });

    expect(flagFields(flags)).not.toContain("location_or_work_arrangement");
  });

  it("AC3: a present work_arrangement with no location raises no location_or_work_arrangement flag", () => {
    const flags = checkMissingFields({
      fields: { work_arrangement: COMPLETE_FIELDS.work_arrangement },
      must_haves: [],
    });

    expect(flagFields(flags)).not.toContain("location_or_work_arrangement");
  });

  it("AC3: a present employment_type raises no employment_type flag", () => {
    const flags = checkMissingFields({
      fields: { employment_type: COMPLETE_FIELDS.employment_type },
      must_haves: [],
    });

    expect(flagFields(flags)).not.toContain("employment_type");
  });

  it("AC3: a present headcount raises no headcount flag", () => {
    const flags = checkMissingFields({
      fields: { headcount: COMPLETE_FIELDS.headcount },
      must_haves: [],
    });

    expect(flagFields(flags)).not.toContain("headcount");
  });

  it("AC3: a present start_date raises no start_date flag", () => {
    const flags = checkMissingFields({
      fields: { start_date: COMPLETE_FIELDS.start_date },
      must_haves: [],
    });

    expect(flagFields(flags)).not.toContain("start_date");
  });

  it("AC3: a non-empty must_haves array raises no must_haves flag", () => {
    const flags = checkMissingFields({
      fields: {},
      must_haves: COMPLETE_MUST_HAVES,
    });

    expect(flagFields(flags)).not.toContain("must_haves");
  });

  it("AC3: a present interview_steps raises no interview_steps flag", () => {
    const flags = checkMissingFields({
      fields: { interview_steps: COMPLETE_FIELDS.interview_steps },
      must_haves: [],
    });

    expect(flagFields(flags)).not.toContain("interview_steps");
  });

  it("AC3: a fully specified job version raises no missing-field flags", () => {
    expect(checkMissingFields(fullySpecified())).toEqual([]);
  });

  it('AC3: whitespace-only salary_range "   " counts as absent', () => {
    const flags = checkMissingFields(
      fullySpecified({ fields: { salary_range: "   " } }),
    );

    expect(flags).toHaveLength(1);
    expect(flags[0]).toEqual(expectedFlag("salary_range"));
  });

  it("exactly one flag per rule: one invocation never duplicates a field", () => {
    const flags = checkMissingFields(emptyJob());
    const fields = flagFields(flags);

    expect(flags).toHaveLength(7);
    expect([...fields].sort()).toEqual([...MISSING_FIELD_IDS].sort());
    expect(new Set(fields).size).toBe(7);
  });
});

describe("persistMissingFieldFlags", () => {
  it("inserts one gap_flags row per flag with flag_type missing and resolution_state open", async () => {
    const db = mockGapFlagsDb();
    const flags: MissingFieldFlag[] = [
      expectedFlag("salary_range"),
      expectedFlag("headcount"),
    ];

    await persistMissingFieldFlags(JOB_VERSION_ID, flags);

    expect(db.from).toHaveBeenCalledWith("gap_flags");

    const rows = insertedRows(db.insert);
    expect(rows).toHaveLength(2);

    for (const row of rows) {
      expect(row.job_version_id).toBe(JOB_VERSION_ID);
      expect(row.flag_type).toBe("missing");
      expect(row.resolution_state).toBe("open");
      expect(typeof row.reason).toBe("string");
      expect(String(row.reason).trim().length).toBeGreaterThan(0);
      expect(typeof row.suggested_question).toBe("string");
      expect(String(row.suggested_question).trim().length).toBeGreaterThan(0);

      for (const key of Object.keys(row)) {
        expect(GAP_FLAGS_INSERT_COLUMNS).toContain(key);
      }
    }

    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          job_version_id: JOB_VERSION_ID,
          flag_type: "missing",
          resolution_state: "open",
          reason: MISSING_FIELD_COPY.salary_range.reason,
          suggested_question:
            MISSING_FIELD_COPY.salary_range.suggested_question,
        }),
        expect.objectContaining({
          job_version_id: JOB_VERSION_ID,
          flag_type: "missing",
          resolution_state: "open",
          reason: MISSING_FIELD_COPY.headcount.reason,
          suggested_question: MISSING_FIELD_COPY.headcount.suggested_question,
        }),
      ]),
    );
  });
});
