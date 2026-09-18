import { describe, expect, it } from "vitest";
import { resolveStageLimit, type StageLimitRow } from "./stage-limits";

const JOB_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER_JOB_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CLIENT_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const OTHER_CLIENT_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const STAGE = "Screening";

const params = { jobId: JOB_ID, clientId: CLIENT_ID, stage: STAGE };

function row(overrides: Partial<StageLimitRow> & Pick<StageLimitRow, "scope">): StageLimitRow {
  return {
    client_id: null,
    job_id: null,
    stage: STAGE,
    limit_days: 7,
    ...overrides,
  };
}

const defaultRow = (overrides: Partial<StageLimitRow> = {}): StageLimitRow =>
  row({ scope: "default", ...overrides });

const clientRow = (overrides: Partial<StageLimitRow> = {}): StageLimitRow =>
  row({ scope: "client", client_id: CLIENT_ID, ...overrides });

const jobRow = (overrides: Partial<StageLimitRow> = {}): StageLimitRow =>
  row({ scope: "job", job_id: JOB_ID, client_id: CLIENT_ID, ...overrides });

describe("resolveStageLimit", () => {
  it("AC1: job limit wins over client and default", () => {
    const rows: StageLimitRow[] = [
      defaultRow({ limit_days: 7 }),
      clientRow({ limit_days: 5 }),
      jobRow({ limit_days: 3 }),
    ];

    expect(resolveStageLimit(rows, params)).toBe(3);
  });

  it("AC1: client limit wins over default when no job limit is set", () => {
    const rows: StageLimitRow[] = [
      defaultRow({ limit_days: 7 }),
      clientRow({ limit_days: 5 }),
      jobRow({ job_id: OTHER_JOB_ID, limit_days: 3 }),
    ];

    expect(resolveStageLimit(rows, params)).toBe(5);
  });

  it("AC1: default limit applies when neither job nor client limit is set", () => {
    const rows: StageLimitRow[] = [
      defaultRow({ limit_days: 7 }),
      clientRow({ client_id: OTHER_CLIENT_ID, limit_days: 5 }),
      jobRow({ job_id: OTHER_JOB_ID, limit_days: 3 }),
    ];

    expect(resolveStageLimit(rows, params)).toBe(7);
  });

  it("AC1: a limit explicitly set to zero is honoured, not treated as unset", () => {
    expect(
      resolveStageLimit(
        [jobRow({ limit_days: 0 }), clientRow({ limit_days: 5 }), defaultRow({ limit_days: 7 })],
        params,
      ),
    ).toBe(0);

    expect(
      resolveStageLimit([clientRow({ limit_days: 0 }), defaultRow({ limit_days: 7 })], params),
    ).toBe(0);

    expect(resolveStageLimit([defaultRow({ limit_days: 0 })], params)).toBe(0);
  });

  it("AC1: an unrecognised stage throws", () => {
    expect(() =>
      resolveStageLimit([defaultRow()], { ...params, stage: "NotAStage" }),
    ).toThrow(Error);
  });

  it("AC1: returns null when no matching limit exists at any scope", () => {
    const rows: StageLimitRow[] = [
      defaultRow({ stage: "Shortlisted", limit_days: 7 }),
      clientRow({ client_id: OTHER_CLIENT_ID, limit_days: 5 }),
      jobRow({ job_id: OTHER_JOB_ID, limit_days: 3 }),
    ];

    expect(resolveStageLimit(rows, params)).toBeNull();
  });
});
