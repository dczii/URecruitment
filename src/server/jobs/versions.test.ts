import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "../db";
import { jobVersionInputSchema } from "./schema";
import { getCurrentJobVersion, saveJobVersion } from "./versions";

vi.mock("../db", () => ({ getDb: vi.fn() }));

/**
 * No-change save (decided in T2a): calling `saveJobVersion` again with
 * identical input still creates a new `job_versions` row. There is no
 * dedup/diff against the current version — every save is a new immutable
 * snapshot. That is the simplest, most predictable behaviour, and it keeps
 * match scores and gap flags keyed to the version they were computed
 * against even when the recruiter hits save without changing anything.
 *
 * T2a contract — implement these signatures in `src/server/jobs/versions.ts`.
 *
 * saveJobVersion(jobId, input) →
 *   insert a new job_versions row (never update an existing one), then
 *   move jobs.current_version_id to that new row's id.
 *
 * getCurrentJobVersion(jobId) →
 *   read jobs.current_version_id, then that job_versions row.
 *   When current_version_id is null (a job with no saved version yet),
 *   return null rather than throwing.
 */

/** Fictional jobs.id — never a real client job. */
const JOB_ID = "00000000-0000-0000-0000-000000000101";

/** Canned ids the mock returns from `job_versions` inserts (DB-generated). */
const VERSION_ID_1 = "00000000-0000-0000-0000-000000000111";
const VERSION_ID_2 = "00000000-0000-0000-0000-000000000112";

const FIRST_INPUT = jobVersionInputSchema.parse({
  fields: { title: "Senior Backend Engineer" },
  must_haves: [
    {
      text: "Five years of Python in a backend role",
      marking: "must_have",
    },
  ],
  nice_to_haves: [
    {
      text: "Experience running services on AWS",
      marking: "nice_to_have",
    },
  ],
  requires_nationality: false,
  nationality_reason: null,
  requires_language: false,
  language_reason: null,
});

const SECOND_INPUT = jobVersionInputSchema.parse({
  fields: { title: "Staff Accountant", location: "Singapore" },
  must_haves: [
    {
      text: "ACCA qualification",
      marking: "must_have",
    },
  ],
  nice_to_haves: [
    {
      text: "Experience with MAS-regulated clients",
      marking: "nice_to_have",
    },
  ],
  requires_nationality: true,
  nationality_reason:
    "The client's MAS-regulated desk requires Singapore citizenship for on-site access.",
  requires_language: false,
  language_reason: null,
});

type InsertCall = { table: string; payload: unknown };
type UpdateCall = {
  table: string;
  payload: unknown;
  eqColumn?: string;
  eqValue?: unknown;
};

type QueryResult = {
  data: unknown;
  error: { message: string } | null;
};

function asRecord(value: unknown): Record<string, unknown> {
  expect(value).toEqual(expect.any(Object));
  expect(value).not.toBeNull();
  return value as Record<string, unknown>;
}

function insertRow(payload: unknown): Record<string, unknown> {
  if (Array.isArray(payload)) {
    expect(payload[0]).toEqual(expect.any(Object));
    expect(payload[0]).not.toBeNull();
    return payload[0] as Record<string, unknown>;
  }
  return asRecord(payload);
}

function thenable(result: QueryResult) {
  const chain: {
    select: () => typeof chain;
    single: () => Promise<QueryResult>;
    maybeSingle: () => Promise<QueryResult>;
    then: Promise<QueryResult>["then"];
  } = {
    select: () => chain,
    single: async () => result,
    maybeSingle: async () => result,
    then: (onfulfilled, onrejected) =>
      Promise.resolve(result).then(onfulfilled, onrejected),
  };
  return chain;
}

function mockJobVersionsDb(seed?: {
  jobs?: Array<{ id: string; current_version_id: string | null }>;
  job_versions?: Array<Record<string, unknown>>;
}) {
  const jobs = (seed?.jobs ?? []).map((row) => ({ ...row }));
  const jobVersions = (seed?.job_versions ?? []).map((row) => ({ ...row }));
  const inserts: InsertCall[] = [];
  const updates: UpdateCall[] = [];
  const cannedIds = [VERSION_ID_1, VERSION_ID_2];
  let generatedInserts = 0;

  const insert = vi.fn((table: string, payload: unknown) => {
    inserts.push({ table, payload });
    const row = insertRow(payload);
    const id =
      typeof row.id === "string"
        ? row.id
        : (cannedIds[generatedInserts] ?? `job_versions-generated-${generatedInserts + 1}`);
    if (table === "job_versions") {
      generatedInserts += 1;
      jobVersions.push({ ...row, id, job_id: row.job_id ?? JOB_ID });
    }
    return thenable({ data: { ...row, id }, error: null });
  });

  const update = vi.fn((table: string, payload: unknown) => {
    const call: UpdateCall = { table, payload };
    updates.push(call);
    return {
      eq(column: string, value: unknown) {
        call.eqColumn = column;
        call.eqValue = value;
        if (table === "jobs") {
          const body = asRecord(payload);
          for (const job of jobs) {
            if (job.id === value) {
              if ("current_version_id" in body) {
                const next = body.current_version_id;
                job.current_version_id =
                  typeof next === "string" || next === null ? next : job.current_version_id;
              }
            }
          }
        }
        return thenable({ data: null, error: null });
      },
    };
  });

  function matchingRows(
    table: string,
    filters: Array<{ column: string; value: unknown }>,
  ): Record<string, unknown>[] {
    const rows: Record<string, unknown>[] =
      table === "jobs" ? jobs : table === "job_versions" ? jobVersions : [];
    return rows.filter((row) =>
      filters.every((filter) => row[filter.column] === filter.value),
    );
  }

  const from = vi.fn((table: string) => {
    const filters: Array<{ column: string; value: unknown }> = [];

    const selectChain = {
      select() {
        return selectChain;
      },
      eq(column: string, value: unknown) {
        filters.push({ column, value });
        return selectChain;
      },
      async maybeSingle(): Promise<QueryResult> {
        const matched = matchingRows(table, filters);
        return { data: matched[0] ?? null, error: null };
      },
      async single(): Promise<QueryResult> {
        const matched = matchingRows(table, filters);
        const row = matched[0];
        if (!row) {
          return { data: null, error: { message: "not found" } };
        }
        return { data: row, error: null };
      },
    };

    return {
      insert: (payload: unknown) => insert(table, payload),
      update: (payload: unknown) => update(table, payload),
      select: (columns?: string) => {
        void columns;
        return selectChain;
      },
    };
  });

  vi.mocked(getDb).mockReturnValue({ from } as never);

  return { from, insert, update, inserts, updates, jobs, jobVersions };
}

function versionInserts(inserts: InsertCall[]): Record<string, unknown>[] {
  return inserts
    .filter((call) => call.table === "job_versions")
    .map((call) => insertRow(call.payload));
}

function jobUpdates(updates: UpdateCall[]): UpdateCall[] {
  return updates.filter((call) => call.table === "jobs");
}

function insertedVersionId(
  row: Record<string, unknown>,
  index: number,
): string {
  if (typeof row.id === "string") {
    return row.id;
  }
  return index === 0 ? VERSION_ID_1 : VERSION_ID_2;
}

beforeEach(() => {
  vi.mocked(getDb).mockReset();
});

describe("job versions (AC3)", () => {
  it("AC3: two saves produce two versions, pointer follows latest, old version unchanged", async () => {
    const db = mockJobVersionsDb({
      jobs: [{ id: JOB_ID, current_version_id: null }],
    });

    await saveJobVersion(JOB_ID, FIRST_INPUT);
    await saveJobVersion(JOB_ID, SECOND_INPUT);

    expect(db.insert).toHaveBeenCalledTimes(2);

    const inserted = versionInserts(db.inserts);
    expect(inserted).toHaveLength(2);

    expect(inserted[0]).toEqual(
      expect.objectContaining({
        job_id: JOB_ID,
        fields: FIRST_INPUT.fields,
        must_haves: FIRST_INPUT.must_haves,
        nice_to_haves: FIRST_INPUT.nice_to_haves,
      }),
    );
    expect(inserted[1]).toEqual(
      expect.objectContaining({
        job_id: JOB_ID,
        fields: SECOND_INPUT.fields,
        must_haves: SECOND_INPUT.must_haves,
        nice_to_haves: SECOND_INPUT.nice_to_haves,
      }),
    );
    expect(inserted[0]?.fields).not.toEqual(inserted[1]?.fields);
    expect(inserted[0]?.must_haves).not.toEqual(inserted[1]?.must_haves);

    const pointerUpdates = jobUpdates(db.updates);
    expect(pointerUpdates).toHaveLength(2);

    const firstId = insertedVersionId(inserted[0] ?? {}, 0);
    const secondId = insertedVersionId(inserted[1] ?? {}, 1);
    expect(secondId).not.toBe(firstId);

    const secondPointer = asRecord(pointerUpdates[1]?.payload);
    expect(secondPointer.current_version_id).toBe(secondId);
    expect(secondPointer.current_version_id).not.toBe(firstId);
    expect(pointerUpdates[1]?.eqColumn).toBe("id");
    expect(pointerUpdates[1]?.eqValue).toBe(JOB_ID);

    expect(db.updates.some((call) => call.table === "job_versions")).toBe(
      false,
    );
    expect(db.update.mock.calls.some((call) => call[0] === "job_versions")).toBe(
      false,
    );

    const firstInsertAfterSecondSave = versionInserts(db.inserts)[0];
    expect(firstInsertAfterSecondSave?.fields).toEqual(FIRST_INPUT.fields);
    expect(firstInsertAfterSecondSave?.must_haves).toEqual(
      FIRST_INPUT.must_haves,
    );
  });

  it("AC3: identical input still creates a new version row (no dedup)", async () => {
    const db = mockJobVersionsDb({
      jobs: [{ id: JOB_ID, current_version_id: null }],
    });

    await saveJobVersion(JOB_ID, FIRST_INPUT);
    await saveJobVersion(JOB_ID, FIRST_INPUT);

    expect(db.insert).toHaveBeenCalledTimes(2);

    const inserted = versionInserts(db.inserts);
    expect(inserted).toHaveLength(2);
    expect(inserted[0]?.fields).toEqual(inserted[1]?.fields);
    expect(inserted[0]?.must_haves).toEqual(inserted[1]?.must_haves);
    expect(inserted[0]?.nice_to_haves).toEqual(inserted[1]?.nice_to_haves);

    const firstId = insertedVersionId(inserted[0] ?? {}, 0);
    const secondId = insertedVersionId(inserted[1] ?? {}, 1);
    expect(secondId).not.toBe(firstId);

    const pointerUpdates = jobUpdates(db.updates);
    expect(pointerUpdates).toHaveLength(2);
    expect(asRecord(pointerUpdates[1]?.payload).current_version_id).toBe(
      secondId,
    );
    expect(asRecord(pointerUpdates[1]?.payload).current_version_id).not.toBe(
      firstId,
    );

    expect(db.updates.some((call) => call.table === "job_versions")).toBe(
      false,
    );
  });

  it("AC3: getCurrentJobVersion resolves jobs.current_version_id then that job_versions row", async () => {
    mockJobVersionsDb({
      jobs: [{ id: JOB_ID, current_version_id: VERSION_ID_2 }],
      job_versions: [
        {
          id: VERSION_ID_1,
          job_id: JOB_ID,
          fields: FIRST_INPUT.fields,
          must_haves: FIRST_INPUT.must_haves,
          nice_to_haves: FIRST_INPUT.nice_to_haves,
          requires_nationality: FIRST_INPUT.requires_nationality,
          nationality_reason: FIRST_INPUT.nationality_reason ?? null,
          requires_language: FIRST_INPUT.requires_language,
          language_reason: FIRST_INPUT.language_reason ?? null,
        },
        {
          id: VERSION_ID_2,
          job_id: JOB_ID,
          fields: SECOND_INPUT.fields,
          must_haves: SECOND_INPUT.must_haves,
          nice_to_haves: SECOND_INPUT.nice_to_haves,
          requires_nationality: SECOND_INPUT.requires_nationality,
          nationality_reason: SECOND_INPUT.nationality_reason ?? null,
          requires_language: SECOND_INPUT.requires_language,
          language_reason: SECOND_INPUT.language_reason ?? null,
        },
      ],
    });

    const current = await getCurrentJobVersion(JOB_ID);
    const row = asRecord(current);

    expect(row.id).toBe(VERSION_ID_2);
    expect(row.id).not.toBe(VERSION_ID_1);
    expect(row.fields).toEqual(SECOND_INPUT.fields);
    expect(row.must_haves).toEqual(SECOND_INPUT.must_haves);
    expect(row.fields).not.toEqual(FIRST_INPUT.fields);
  });

  it("AC3: getCurrentJobVersion returns null when current_version_id is null", async () => {
    mockJobVersionsDb({
      jobs: [{ id: JOB_ID, current_version_id: null }],
      job_versions: [],
    });

    let thrown: unknown;
    let result: unknown;
    try {
      result = await getCurrentJobVersion(JOB_ID);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeUndefined();
    expect(result).toBeNull();
  });
});
