import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "../db";
import { mergeProfile } from "./overrides";
import { getCandidateProfile } from "./candidate-profile";

vi.mock("../db", () => ({ getDb: vi.fn() }));

/**
 * T1a contract — implement these signatures in `src/server/cv/candidate-profile.ts`.
 *
 * getCandidateProfile(candidateId) →
 *   parseStatus: "ready" | "not_yet_parsed"
 *   identity: { name, email, phone, location } taken from
 *     mergeProfile(parsed, overrides).effective (null when not_yet_parsed)
 *   profile: mergeProfile(parsed, overrides) — reuse that helper, do not
 *     reimplement the spread-merge (null when not_yet_parsed)
 *   skills: { skill, source_text }[] from candidate_skills
 *   stageHistory: { recruiter_name, from_stage, to_stage, created_at }[]
 *     for every pipeline_entries row of this candidate, oldest-to-newest
 */

const PROFILE_SOURCE_PATH = join(
  process.cwd(),
  "src/server/cv/candidate-profile.ts",
);

/** Fictional ids — never a real candidate row. */
const CANDIDATE_ID = "00000000-0000-0000-0000-000000000051";
const OTHER_CANDIDATE_ID = "00000000-0000-0000-0000-000000000052";
const PROFILE_ID = "00000000-0000-0000-0000-000000000061";
const JOB_A_ID = "00000000-0000-0000-0000-000000000071";
const JOB_B_ID = "00000000-0000-0000-0000-000000000072";
const JOB_OTHER_ID = "00000000-0000-0000-0000-000000000073";
const ENTRY_A_ID = "00000000-0000-0000-0000-000000000081";
const ENTRY_B_ID = "00000000-0000-0000-0000-000000000082";
const ENTRY_OTHER_ID = "00000000-0000-0000-0000-000000000083";

/** Fictional recruiter typed names (CLAUDE.md hard rule 8). */
const RECRUITER_MEI = "Mei Lin";
const RECRUITER_PRIYA = "Priya Rao";

const PARSED = {
  name: "Alex Rivera",
  name_source_text: "Alex Rivera",
  email: "alex.rivera.fictional@example.com",
  email_source_text: "alex.rivera.fictional@example.com",
  phone: "+65 8000 0001",
  phone_source_text: "+65 8000 0001",
  location: "Kuala Lumpur",
  location_source_text: "Kuala Lumpur",
};

const OVERRIDES = {
  name: "Alexandra Rivera",
  location: "Singapore",
};

const SKILLS = [
  { skill: "SAP FICO", source_text: "SAP FICO" },
  { skill: "Excel", source_text: "Proficient in Excel" },
] as const;

/** Job A newest event — inserted first so unsorted DB order is not chronological. */
const EVENT_A_SHORTLISTED_AT = "2026-09-10T04:00:00.000Z";
/** Job B, in between the two Job A events. */
const EVENT_B_SCREENING_AT = "2026-09-05T04:00:00.000Z";
const EVENT_A_SOURCED_AT = "2026-09-01T04:00:00.000Z";
/** Other candidate — must not appear in this candidate's history. */
const EVENT_OTHER_AT = "2026-09-03T04:00:00.000Z";

type Row = Record<string, unknown>;

type Filter =
  | { kind: "eq"; column: string; value: unknown }
  | { kind: "in"; column: string; values: readonly unknown[] };

type QueryResult = {
  data: unknown;
  error: { message: string } | null;
};

type QueryChain = {
  select: (columns?: string) => QueryChain;
  eq: (column: string, value: unknown) => QueryChain;
  in: (column: string, values: readonly unknown[]) => QueryChain;
  order: (
    column: string,
    options?: { ascending?: boolean },
  ) => QueryChain;
  limit: (count: number) => QueryChain;
  maybeSingle: () => Promise<QueryResult>;
  single: () => Promise<QueryResult>;
  then: Promise<QueryResult>["then"];
};

type TableStore = Record<string, Row[]>;

function firstNonEmptyLine(source: string): string {
  for (const line of source.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return "";
}

function asRecord(value: unknown): Record<string, unknown> {
  expect(value).toEqual(expect.any(Object));
  expect(value).not.toBeNull();
  return value as Record<string, unknown>;
}

function matchesFilters(row: Row, filters: Filter[]): boolean {
  return filters.every((filter) => {
    const value = row[filter.column];
    if (filter.kind === "eq") {
      return value === filter.value;
    }
    return filter.values.includes(value);
  });
}

function sortRows(
  rows: Row[],
  order: { column: string; ascending: boolean } | null,
): Row[] {
  if (!order) {
    return rows;
  }
  return [...rows].sort((left, right) => {
    const av = String(left[order.column] ?? "");
    const bv = String(right[order.column] ?? "");
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return order.ascending ? cmp : -cmp;
  });
}

function createQuery(rows: Row[]): QueryChain {
  const filters: Filter[] = [];
  let order: { column: string; ascending: boolean } | null = null;

  function matchingRows(): Row[] {
    return sortRows(
      rows.filter((row) => matchesFilters(row, filters)),
      order,
    );
  }

  function execute(): Promise<QueryResult> {
    return Promise.resolve({ data: matchingRows(), error: null });
  }

  const query: QueryChain = {
    select() {
      return query;
    },
    eq(column, value) {
      filters.push({ kind: "eq", column, value });
      return query;
    },
    in(column, values) {
      filters.push({ kind: "in", column, values });
      return query;
    },
    order(column, options) {
      order = { column, ascending: options?.ascending ?? true };
      return query;
    },
    limit() {
      return query;
    },
    async maybeSingle() {
      const matched = matchingRows();
      return { data: matched[0] ?? null, error: null };
    },
    async single() {
      const matched = matchingRows();
      const row = matched[0];
      if (!row) {
        return { data: null, error: { message: "not found" } };
      }
      return { data: row, error: null };
    },
    then(onfulfilled, onrejected) {
      return execute().then(onfulfilled, onrejected);
    },
  };

  return query;
}

function mockProfileDb(tables: TableStore) {
  const store: TableStore = Object.fromEntries(
    Object.entries(tables).map(([table, rows]) => [
      table,
      rows.map((row) => ({ ...row })),
    ]),
  );

  const from = vi.fn((table: string) => createQuery(store[table] ?? []));
  vi.mocked(getDb).mockReturnValue({ from } as never);
  return { from, store };
}

function candidateRow(
  id: string,
  extras?: Partial<{ full_name: string; email: string; phone: string }>,
): Row {
  return {
    id,
    full_name: extras?.full_name ?? "Alex Rivera",
    email: extras?.email ?? "alex.rivera.fictional@example.com",
    phone: extras?.phone ?? "+65 8000 0001",
  };
}

function seedReadyProfile() {
  return mockProfileDb({
    candidates: [
      candidateRow(CANDIDATE_ID),
      candidateRow(OTHER_CANDIDATE_ID, {
        full_name: "Priya Rao",
        email: "priya.rao.fictional@example.com",
        phone: "+65 8000 0002",
      }),
    ],
    candidate_profiles: [
      {
        id: PROFILE_ID,
        candidate_id: CANDIDATE_ID,
        parsed: { ...PARSED },
        overrides: { ...OVERRIDES },
        overridden_by: RECRUITER_MEI,
        overridden_at: "2026-09-18T04:00:00.000Z",
      },
    ],
    candidate_skills: SKILLS.map((entry, index) => ({
      id: `00000000-0000-0000-0000-00000000009${index}`,
      candidate_id: CANDIDATE_ID,
      skill: entry.skill,
      source_text: entry.source_text,
    })),
    pipeline_entries: [
      {
        id: ENTRY_A_ID,
        candidate_id: CANDIDATE_ID,
        job_id: JOB_A_ID,
        stage: "Shortlisted",
        owner_name: RECRUITER_MEI,
      },
      {
        id: ENTRY_B_ID,
        candidate_id: CANDIDATE_ID,
        job_id: JOB_B_ID,
        stage: "Screening",
        owner_name: RECRUITER_PRIYA,
      },
      {
        id: ENTRY_OTHER_ID,
        candidate_id: OTHER_CANDIDATE_ID,
        job_id: JOB_OTHER_ID,
        stage: "Sourced",
        owner_name: RECRUITER_PRIYA,
      },
    ],
    // Insertion order is deliberately not chronological.
    stage_events: [
      {
        id: "00000000-0000-0000-0000-0000000000a1",
        pipeline_entry_id: ENTRY_A_ID,
        from_stage: "Screening",
        to_stage: "Shortlisted",
        recruiter_name: RECRUITER_MEI,
        created_at: EVENT_A_SHORTLISTED_AT,
      },
      {
        id: "00000000-0000-0000-0000-0000000000a2",
        pipeline_entry_id: ENTRY_B_ID,
        from_stage: "Sourced",
        to_stage: "Screening",
        recruiter_name: RECRUITER_PRIYA,
        created_at: EVENT_B_SCREENING_AT,
      },
      {
        id: "00000000-0000-0000-0000-0000000000a3",
        pipeline_entry_id: ENTRY_A_ID,
        from_stage: null,
        to_stage: "Sourced",
        recruiter_name: RECRUITER_MEI,
        created_at: EVENT_A_SOURCED_AT,
      },
      {
        id: "00000000-0000-0000-0000-0000000000a4",
        pipeline_entry_id: ENTRY_OTHER_ID,
        from_stage: null,
        to_stage: "Sourced",
        recruiter_name: RECRUITER_PRIYA,
        created_at: EVENT_OTHER_AT,
      },
    ],
  });
}

function seedUnparsedCandidate() {
  return mockProfileDb({
    candidates: [candidateRow(CANDIDATE_ID)],
    candidate_profiles: [],
    candidate_skills: [],
    pipeline_entries: [],
    stage_events: [],
  });
}

beforeEach(() => {
  vi.mocked(getDb).mockReset();
});

describe("getCandidateProfile (AC1, AC3)", () => {
  it("AC1: identity fields come from mergeProfile so an override wins over the parsed value", async () => {
    seedReadyProfile();
    const merged = mergeProfile(PARSED, OVERRIDES);

    const result = asRecord(await getCandidateProfile(CANDIDATE_ID));
    const identity = asRecord(result.identity);

    expect(result.parseStatus).toBe("ready");
    expect(result.profile).toEqual(merged);

    expect(identity.name).toBe(merged.effective.name);
    expect(identity.email).toBe(merged.effective.email);
    expect(identity.phone).toBe(merged.effective.phone);
    expect(identity.location).toBe(merged.effective.location);

    expect(identity.name).toBe(OVERRIDES.name);
    expect(identity.name).not.toBe(PARSED.name);
    expect(identity.name).not.toBe("Alex Rivera");

    expect(identity.location).toBe(OVERRIDES.location);
    expect(identity.location).not.toBe(PARSED.location);

    expect(OVERRIDES).not.toHaveProperty("email");
    expect(OVERRIDES).not.toHaveProperty("phone");
    expect(identity.email).toBe(PARSED.email);
    expect(identity.phone).toBe(PARSED.phone);
  });

  it("AC1: returns skills with their source_text", async () => {
    seedReadyProfile();

    const result = asRecord(await getCandidateProfile(CANDIDATE_ID));
    expect(Array.isArray(result.skills)).toBe(true);
    const skills = result.skills as unknown[];
    expect(skills).toHaveLength(SKILLS.length);

    for (const expected of SKILLS) {
      const row = asRecord(
        skills.find(
          (item) => asRecord(item).skill === expected.skill,
        ),
      );
      expect(row.source_text).toBe(expected.source_text);
      expect(typeof row.source_text).toBe("string");
      expect(String(row.source_text).trim().length).toBeGreaterThan(0);
    }

    const excel = asRecord(
      skills.find((item) => asRecord(item).skill === "Excel"),
    );
    expect(excel.source_text).not.toBe(excel.skill);
    expect(excel.source_text).toBe("Proficient in Excel");
  });

  it("AC3: joins stage history with recruiter names across every job, oldest-to-newest", async () => {
    seedReadyProfile();

    const result = asRecord(await getCandidateProfile(CANDIDATE_ID));
    expect(Array.isArray(result.stageHistory)).toBe(true);
    const history = (result.stageHistory as unknown[]).map((item) =>
      asRecord(item),
    );

    expect(history).toHaveLength(3);
    expect(history.map((event) => event.created_at)).toEqual([
      EVENT_A_SOURCED_AT,
      EVENT_B_SCREENING_AT,
      EVENT_A_SHORTLISTED_AT,
    ]);

    expect(history[0]).toEqual(
      expect.objectContaining({
        recruiter_name: RECRUITER_MEI,
        from_stage: null,
        to_stage: "Sourced",
        created_at: EVENT_A_SOURCED_AT,
      }),
    );
    expect(history[1]).toEqual(
      expect.objectContaining({
        recruiter_name: RECRUITER_PRIYA,
        from_stage: "Sourced",
        to_stage: "Screening",
        created_at: EVENT_B_SCREENING_AT,
      }),
    );
    expect(history[2]).toEqual(
      expect.objectContaining({
        recruiter_name: RECRUITER_MEI,
        from_stage: "Screening",
        to_stage: "Shortlisted",
        created_at: EVENT_A_SHORTLISTED_AT,
      }),
    );

    for (const event of history) {
      expect(typeof event.recruiter_name).toBe("string");
      expect(String(event.recruiter_name).trim().length).toBeGreaterThan(0);
    }

    const createdAts = history.map((event) => String(event.created_at));
    expect(createdAts).not.toContain(EVENT_OTHER_AT);
    expect(createdAts).toEqual([...createdAts].sort());
  });

  it("returns a not-yet-parsed shape when the candidate has no candidate_profiles row", async () => {
    seedUnparsedCandidate();

    let thrown: unknown;
    let result: unknown;
    try {
      result = await getCandidateProfile(CANDIDATE_ID);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeUndefined();
    const page = asRecord(result);
    expect(page.parseStatus).toBe("not_yet_parsed");
    expect(page.identity).toBeNull();
    expect(page.profile).toBeNull();
    expect(page.skills).toEqual([]);
  });

  it('starts with import "server-only" and reuses mergeProfile from ./overrides', () => {
    const source = readFileSync(PROFILE_SOURCE_PATH, "utf8");
    expect(firstNonEmptyLine(source)).toBe('import "server-only";');
    expect(source).toMatch(/from\s+["']\.\/overrides["']/);
    expect(source).toMatch(/\bmergeProfile\s*\(/);
  });
});
