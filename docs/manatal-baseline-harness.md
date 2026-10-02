# Manatal pipeline baseline harness

|                 |                                                                                                                |
| --------------- | -------------------------------------------------------------------------------------------------------------- |
| Purpose         | Live-demo evidence for GVT(T)26021 (current-state analysis, consistency verification, spec-driven development) |
| Slice           | Pipeline stage movement and key dates (A), with drop-versus-remove semantics folded in (B)                     |
| Legacy system   | Manatal (closed SaaS, **black-box evidence only**: no source code is available)                                |
| Status          | Harness verified against `main` @ `c1358c5` on 2026-10-01: 8 new tests pass, full suite 332/332                |
| Baseline status | **Not yet captured.** Every scenario shipped here is a labelled self-test, not Manatal evidence                |

## 1. What this is for

The tender asks for three things this document supports:

- **Current-state analysis** (Appendix 1 §1): establish what the existing system actually does, document how behaviour was inferred, and state assumptions and gaps. Manatal has no source, so evidence comes from controlled test inputs and outputs, UI observation and exports (§1.5).
- **Consistency verification** (Appendix 1 §2): a repeatable mechanism that compares the new component with the captured behaviour, handles deliberately approved changes, states coverage and confidence for black-box baselines (§2.5) and separates manual from automated steps (§2.6).
- **Spec-driven development** (Appendix 1 §7): the same written rules drive build and verification, with traceability.

The live demo (Part 2, clause 7.3) must show the progression _understand the existing system → specification → implementation → verification_. This harness is the "understand" and "verify" ends of that story for one bounded slice.

## 2. Scope of the slice

In scope:

- Moving a candidate between pipeline stages (forwards, backwards, skipping, "next stage", bulk advance).
- The five Manatal match touchpoints and when they are stamped: added, submitted, interviewed, offer received, hired.
- The audit trail each move leaves.
- Dropped (kept with a reason) versus removed (no job history kept).
- Whether a job has a stage derived from its candidates.

Out of scope for this harness version: CV parsing, match scoring, search, gap checks, stage time limits and delay status. Time limits and delay status are **new** requirements in your PRD. Manatal's public documentation does not describe them, so they are not legacy behaviour.

## 3. What this proves, and what it does not

**It proves:** that for the scenarios you captured, the production move code (`movePipelineStage`, `moveManyPipelineStages`) produces the recorded outcome, or differs in a way someone approved in writing.

**It does not prove:**

- That Manatal behaves this way in cases you did not test. Coverage equals the scenario list and nothing more.
- That Manatal's documentation is right. The baseline is only as good as your observation.
- Equivalence of anything outside the slice.

Say this plainly in the demo (clause 7.8 allows questions on limitations). A narrow slice with honest confidence is stronger than a broad claim.

## 4. How it works

```
Manatal session (manual, you)           Harness (automated)
  scenario steps + observed outcome  -->  scenarios/*.json  (baseline)
                                               |
                                               v
                       replay.ts drives the REAL movePipelineStage /
                       moveManyPipelineStages through an in-memory fake DB
                                               |
                                               v
                       classify(): each field is one of
                       MATCH | APPROVED_DIFFERENCE | UNEXPECTED_DIFFERENCE
                       | NO_COUNTERPART | UNOBSERVED
                                               |
                                               v
                       report.md  (+ strict mode that fails on any gap)
```

Design decisions worth explaining if asked:

- **It replays production code, not a copy.** The fake DB answers exactly the call chains `move.ts` uses and throws on anything else, so a change to `move.ts` cannot silently bypass the harness.
- **Only observed fields are compared.** A field with no baseline is reported `UNOBSERVED`, never passed.
- **Approvals pin the approved value.** If the app later drifts beyond what was approved, the approval stops matching and the field becomes `UNEXPECTED_DIFFERENCE`.
- **No counterpart is its own verdict.** Where the app has no equivalent behaviour, the harness says so instead of passing or failing.
- **Manual versus automated (§2.6):** capturing the baseline in Manatal is manual and judgement-based. Replay, classification and reporting are automated.

## 5. What the repo does today (verified in code)

| Behaviour                                                                                                                                        | Where                                                         | Note                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Stages: Sourced, Screening, Shortlisted, Submitted to client, Client interview, Offer, Placed                                                    | `src/lib/stages.ts`                                           | Seven stages                                                                                          |
| End states: Rejected by agency, Rejected by client, Withdrawn                                                                                    | `src/lib/stages.ts`                                           | Reached by an ordinary move                                                                           |
| "Next stage" is one step along the list; Placed, end states and unknown stages cannot advance                                                    | `nextStage`, `planStageAdvance` in `src/lib/stage-advance.ts` | Blocked reasons: "Left the pipeline", "Already placed", "Stage not recognised"; duplicate ids ignored |
| A move accepts any valid stage, including backwards and into end states; resets `entered_at`; appends one `stage_events` row with the typed name | `src/server/pipeline/move.ts`                                 | Test comment states a backwards move uses the same write path                                         |
| Bulk advance moves each entry one stage, one audited event per candidate, blocked entries are never written                                      | `src/server/pipeline/move-many.ts`                            | New relative to Manatal as far as public docs show                                                    |
| No rejection reason is stored                                                                                                                    | `supabase/migrations/20260918000004_pipeline_audit.sql`       | `pipeline_entries` and `stage_events` have no reason column                                           |
| No stored key dates                                                                                                                              | same migration                                                | Dates must be derived from the first `stage_events` row into each stage                               |
| No code path deletes a pipeline entry                                                                                                            | search for `.delete()` in `src/` found nothing                | No counterpart to Manatal "remove"                                                                    |
| No job-level stage                                                                                                                               | search for "most advanced", `jobStage` found nothing          | No counterpart to "job stage = most advanced candidate"                                               |

## 6. Candidate differences to decide

These come from comparing the repo with Manatal's **public documentation** only. Each needs your observation first, then an owner decision. Record the decision as an approved difference (section 11).

| ID  | Possible difference              | Manatal (documented)                           | Repo                             | Suggested treatment                                            |
| --- | -------------------------------- | ---------------------------------------------- | -------------------------------- | -------------------------------------------------------------- |
| D1  | Reason when leaving the pipeline | A dropped candidate keeps a recorded reason    | No reason stored                 | Decide: add a reason, or approve the difference                |
| D2  | Remove versus drop               | Remove erases job history; drop keeps it       | Only end states exist            | Likely approve: audit-first rule means history is never erased |
| D3  | Backwards and skipping moves     | Drag and drop supported; limits not documented | Any valid stage allowed          | Observe first; likely approve                                  |
| D4  | Job stage                        | Job stage reflects the most advanced candidate | Not computed                     | Decide: build it, or approve its absence for the MVP           |
| D5  | Key dates                        | Five dates recorded per candidate-job link     | Derivable from audit events only | Observe how Manatal stamps them, then decide                   |
| D6  | Bulk advance                     | Not documented                                 | Present, audited per candidate   | Record as an approved new capability                           |
| D7  | Audit by typed name              | Not documented                                 | Required on every move           | Record as an approved difference (hard rule 8)                 |

## 7. Capture protocol (Manatal session)

Rules:

1. **Fictional candidates and jobs only.** The repo is public and `CLAUDE.md` forbids real candidate data. Use your own Manatal trial or account and check Manatal's terms before you start.
2. **Do not scrape or automate Manatal.** Observe by hand.
3. **Evidence stays out of the public repo.** Store screenshots and exports in a private location. The repo holds only an evidence reference id (for example `E-014`), the date captured and who captured it.
4. **One scenario at a time,** starting from a known state, writing down each step and the resulting state before the next.
5. **Record unknowns as unknown.** An unobserved rule stays `unknown` with confidence `unknown`. Do not infer.
6. **Name the mapping assumption.** Manatal's stage names may differ from the seven above. Record the mapping you used for each scenario (assumption M-1) and confirm it by observation.

For each scenario record: start state, steps, resulting stage per candidate, any dates shown, any message or error shown, any event or history shown, evidence id, confidence (high, medium, low, unknown).

## 8. Rule catalogue

Fill the **Observed** and **Confidence** columns from your capture. "Documented" means public Manatal documentation says so; it is not evidence that you observed it.

| Rule | Statement                                                   | Documented           | Observed | Confidence | Scenarios |
| ---- | ----------------------------------------------------------- | -------------------- | -------- | ---------- | --------- |
| R-01 | "Move to next stage" advances exactly one stage             | Action exists        |          |            | S01       |
| R-02 | A candidate can be moved forwards by more than one stage    | Drag and drop exists |          |            | S02       |
| R-03 | A candidate can be moved backwards                          | Unknown              |          |            | S03       |
| R-04 | The last stage has no next stage                            | Unknown              |          |            | S04       |
| R-05 | Dropping keeps the candidate in the database with a reason  | Yes                  |          |            | S05       |
| R-06 | A reason is mandatory when dropping                         | Unknown              |          |            | S06       |
| R-07 | A dropped candidate can return to the pipeline              | Unknown              |          |            | S07       |
| R-08 | Removing erases job history                                 | Yes                  |          |            | S08       |
| R-09 | Each key date is stamped on first entry to its stage        | Dates exist          |          |            | S09       |
| R-10 | Moving back and forward again does not restamp a key date   | Unknown              |          |            | S09       |
| R-11 | Job stage equals the most advanced active candidate's stage | Yes                  |          |            | S11       |
| R-12 | A candidate cannot be on the same job twice                 | Unknown              |          |            | S12       |

## 9. Scenarios to capture

| ID  | Scenario                                                                                              | Replayable in v1 harness            |
| --- | ----------------------------------------------------------------------------------------------------- | ----------------------------------- |
| S01 | Candidate at Sourced, use "next stage"                                                                | Yes                                 |
| S02 | Candidate at Sourced, move two stages ahead in one action                                             | Yes                                 |
| S03 | Candidate at Offer, move back to Screening                                                            | Yes                                 |
| S04 | Candidate at the final stage, try "next stage"                                                        | Yes                                 |
| S05 | Drop a candidate with a reason; check stage totals and dropped count                                  | No: no counterpart (D1)             |
| S06 | Try to drop without a reason                                                                          | No: no counterpart (D1)             |
| S07 | Try to bring a dropped candidate back                                                                 | No: no counterpart                  |
| S08 | Remove a candidate; check history                                                                     | No: no counterpart (D2)             |
| S09 | Move through submitted, interviewed; go back one stage; forward again; read the dates after each step | Yes                                 |
| S10 | Select several candidates and advance together, if Manatal allows it                                  | Yes                                 |
| S11 | Candidates at different stages on one job; read the job stage                                         | Yes: reported `NO_COUNTERPART` (D4) |
| S12 | Add the same candidate to the same job twice                                                          | No: add path not covered in v1      |

Scenarios marked "No" are still captured as evidence for the catalogue. They surface as differences D1 and D2 rather than as replay results.

## 10. Files to add

Add these under `test/baseline/`. Vitest already includes `test/**/*.test.ts`, so no config change is needed. Everything below ran green against the real code.

### `test/baseline/fake-db.ts`

```ts
/**
 * In-memory stand-in for the two tables the pipeline move code touches.
 * It answers exactly the call chains used by `movePipelineStage`, so the
 * harness exercises the PRODUCTION code, not a re-implementation of it.
 * If `move.ts` starts using a new call, this fake throws loudly.
 */
export type EntryRow = { id: string; stage: string; entered_at: string };
export type EventRow = {
  pipeline_entry_id: string;
  from_stage: string | null;
  to_stage: string;
  recruiter_name: string;
  created_at: string;
};

type EventInput = Omit<EventRow, "created_at">;

export function createFakeDb() {
  const entries = new Map<string, EntryRow>();
  const events: EventRow[] = [];

  const db = {
    from(table: string) {
      if (table === "pipeline_entries") {
        return {
          select: () => ({
            eq: (_column: string, id: string) => {
              const result = Promise.resolve({
                data: entries.get(id) ?? null,
                error: null,
              });
              return { maybeSingle: () => result, single: () => result };
            },
          }),
          update: (payload: Partial<EntryRow>) => ({
            eq: (_column: string, id: string) => {
              const row = entries.get(id);
              if (row) entries.set(id, { ...row, ...payload });
              return Promise.resolve({ error: null });
            },
          }),
        };
      }
      if (table === "stage_events") {
        return {
          insert: (payload: EventInput | EventInput[]) => {
            for (const row of Array.isArray(payload) ? payload : [payload]) {
              events.push({ ...row, created_at: new Date().toISOString() });
            }
            return Promise.resolve({ error: null });
          },
        };
      }
      throw new Error(`Fake DB: unexpected table "${table}"`);
    },
  };

  return { db, entries, events };
}
```

### `test/baseline/replay.ts`

```ts
import { isDeepStrictEqual } from "node:util";
import { vi } from "vitest";

import { getDb } from "@/server/db";
import { moveManyPipelineStages } from "@/server/pipeline/move-many";
import { movePipelineStage } from "@/server/pipeline/move";
import { createFakeDb } from "./fake-db";

/* ------------------------------------------------------------------ types */

export type Step =
  | { op: "add"; entry: string; stage: string }
  | { op: "move"; entry: string; to: string }
  | { op: "advance"; entries: string[] }
  | { op: "wait"; days: number };

export type Observation = {
  /** entry -> current stage */
  stages: Record<string, string>;
  /** audit trail, in order */
  events: { entry: string; from: string | null; to: string }[];
  /** entry -> milestone -> YYYY-MM-DD (UTC) of FIRST entry into that stage */
  keyDates: Record<string, Record<string, string>>;
  /** result of the last `advance` step */
  advance: { moved: string[]; blocked: { entry: string; reason: string }[] } | null;
  /** job-level stage; null = the production code has no counterpart */
  jobStage: string | null;
};

export type Scenario = {
  id: string;
  title: string;
  /** where the baseline came from; unobserved scenarios have no baseline yet */
  evidence: {
    source: "observed" | "documented" | "inferred" | "synthetic-self-test";
    ref: string;
    confidence: "high" | "medium" | "low" | "unknown";
    capturedOn?: string;
    capturedBy?: string;
  };
  start: string; // ISO instant the scenario clock starts at
  steps: Step[];
  /** Only fields present here are compared. Absent field = UNOBSERVED. */
  baseline: Partial<Observation>;
};

export type ApprovedDifference = {
  id: string;
  scenario: string;
  field: keyof Observation;
  rationale: string;
  approvedBy: string;
  /** The repo value that was approved. If the repo drifts, this stops matching. */
  approvedActual: unknown;
};

export type Verdict =
  | "MATCH"
  | "APPROVED_DIFFERENCE"
  | "UNEXPECTED_DIFFERENCE"
  | "NO_COUNTERPART"
  | "UNOBSERVED";

export type FieldResult = {
  scenario: string;
  field: keyof Observation;
  verdict: Verdict;
  baseline?: unknown;
  actual: unknown;
  approvedBy?: string;
  note?: string;
};

/* ------------------------------------------------------------- milestones */

/** Manatal's five match touchpoints, mapped onto this app's stages. */
const MILESTONES: Record<string, string> = {
  "Submitted to client": "submitted",
  "Client interview": "interviewed",
  Offer: "offer",
  Placed: "hired",
};

const DAY_MS = 86_400_000;
const RUNNER = "Harness Runner";

/* ----------------------------------------------------------------- replay */

/** Drive the real move code through a scenario and observe the outcome. */
export async function replay(scenario: Scenario): Promise<Observation> {
  const { db, entries, events } = createFakeDb();
  vi.mocked(getDb).mockReturnValue(db as never);
  vi.setSystemTime(new Date(scenario.start));

  const addedOn: Record<string, string> = {};
  let advance: Observation["advance"] = null;

  for (const step of scenario.steps) {
    if (step.op === "add") {
      const now = new Date().toISOString();
      entries.set(step.entry, {
        id: step.entry,
        stage: step.stage,
        entered_at: now,
      });
      addedOn[step.entry] = now.slice(0, 10);
    } else if (step.op === "move") {
      await movePipelineStage({
        pipelineEntryId: step.entry,
        toStage: step.to,
        recruiterName: RUNNER,
      });
    } else if (step.op === "advance") {
      const result = await moveManyPipelineStages({
        entries: step.entries.map((id) => ({
          pipelineEntryId: id,
          stage: entries.get(id)?.stage ?? "",
        })),
        recruiterName: RUNNER,
      });
      advance = {
        moved: result.moved.map((m) => m.pipelineEntryId),
        blocked: result.blocked.map((b) => ({
          entry: b.pipelineEntryId,
          reason: b.reason,
        })),
      };
    } else {
      vi.setSystemTime(new Date(Date.now() + step.days * DAY_MS));
    }
  }

  const keyDates: Observation["keyDates"] = {};
  for (const id of Object.keys(addedOn)) {
    keyDates[id] = { added: addedOn[id] };
  }
  for (const event of events) {
    const milestone = MILESTONES[event.to_stage];
    const dates = keyDates[event.pipeline_entry_id];
    if (milestone && dates && !(milestone in dates)) {
      dates[milestone] = event.created_at.slice(0, 10);
    }
  }

  return {
    stages: Object.fromEntries([...entries].map(([id, row]) => [id, row.stage])),
    events: events.map((e) => ({
      entry: e.pipeline_entry_id,
      from: e.from_stage,
      to: e.to_stage,
    })),
    keyDates,
    advance,
    // The app has no "job stage = most advanced candidate" computation.
    // This is reported as NO_COUNTERPART, never silently passed.
    jobStage: null,
  };
}

/* --------------------------------------------------------------- classify */

const FIELDS: (keyof Observation)[] = ["stages", "events", "keyDates", "advance", "jobStage"];

export function classify(
  scenario: Scenario,
  actual: Observation,
  approved: ApprovedDifference[],
): FieldResult[] {
  return FIELDS.map((field): FieldResult => {
    const base = { scenario: scenario.id, field, actual: actual[field] };

    if (!(field in scenario.baseline)) {
      return { ...base, verdict: "UNOBSERVED" };
    }
    const baseline = scenario.baseline[field];
    if (isDeepStrictEqual(baseline, actual[field])) {
      return { ...base, baseline, verdict: "MATCH" };
    }

    const ruling = approved.find(
      (a) =>
        a.scenario === scenario.id &&
        a.field === field &&
        isDeepStrictEqual(a.approvedActual, actual[field]),
    );
    if (ruling) {
      return {
        ...base,
        baseline,
        verdict: "APPROVED_DIFFERENCE",
        approvedBy: ruling.approvedBy,
        note: `${ruling.id}: ${ruling.rationale}`,
      };
    }
    if (actual[field] === null) {
      return { ...base, baseline, verdict: "NO_COUNTERPART" };
    }
    return { ...base, baseline, verdict: "UNEXPECTED_DIFFERENCE" };
  });
}

/* ----------------------------------------------------------------- report */

export function renderReport(results: FieldResult[]): string {
  const count = (v: Verdict) => results.filter((r) => r.verdict === v).length;
  const lines = [
    "# Baseline replay report",
    "",
    `Generated ${new Date().toISOString()}`,
    "",
    "| Verdict | Count |",
    "|---|---|",
    ...(
      [
        "MATCH",
        "APPROVED_DIFFERENCE",
        "UNEXPECTED_DIFFERENCE",
        "NO_COUNTERPART",
        "UNOBSERVED",
      ] as Verdict[]
    ).map((v) => `| ${v} | ${count(v)} |`),
    "",
    "| Scenario | Field | Verdict | Note |",
    "|---|---|---|---|",
    ...results.map((r) => `| ${r.scenario} | ${r.field} | ${r.verdict} | ${r.note ?? ""} |`),
    "",
  ];
  return lines.join("\n");
}
```

### `test/baseline/manatal-pipeline.baseline.test.ts`

```ts
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  classify,
  renderReport,
  replay,
  type ApprovedDifference,
  type FieldResult,
  type Observation,
  type Scenario,
} from "./replay";

vi.mock("@/server/db", () => ({ getDb: vi.fn() }));

const DIR = __dirname;
const scenarios: Scenario[] = readdirSync(join(DIR, "scenarios"))
  .filter((f) => f.endsWith(".json"))
  .flatMap((f) => JSON.parse(readFileSync(join(DIR, "scenarios", f), "utf8")) as Scenario[]);
const approved = JSON.parse(
  readFileSync(join(DIR, "approved-differences.json"), "utf8"),
) as ApprovedDifference[];

const all: FieldResult[] = [];

beforeEach(() => {
  // Fake only Date so promises keep resolving normally.
  vi.useFakeTimers({ toFake: ["Date"] });
});
afterEach(() => {
  vi.useRealTimers();
});
afterAll(() => {
  if (process.env.BASELINE_REPORT) {
    writeFileSync(join(DIR, "report.md"), renderReport(all));
  }
});

describe("baseline replay against production move code", () => {
  it.each(scenarios.map((s) => [s.id, s] as const))(
    "%s has no unexpected difference",
    async (_id, scenario) => {
      const actual = await replay(scenario);
      const results = classify(scenario, actual, approved);
      all.push(...results);

      const bad = results.filter((r) => r.verdict === "UNEXPECTED_DIFFERENCE");
      expect(bad).toEqual([]);

      if (process.env.BASELINE_STRICT) {
        // Strict mode: nothing may be left unobserved or without a counterpart.
        const open = results.filter(
          (r) => r.verdict === "UNOBSERVED" || r.verdict === "NO_COUNTERPART",
        );
        expect(open).toEqual([]);
      }
    },
  );
});

describe("classifier", () => {
  const actual: Observation = {
    stages: { e1: "Screening" },
    events: [],
    keyDates: {},
    advance: null,
    jobStage: null,
  };
  const scenario: Scenario = {
    id: "X",
    title: "x",
    evidence: { source: "synthetic-self-test", ref: "none", confidence: "unknown" },
    start: "2026-10-05T00:00:00.000Z",
    steps: [],
    baseline: { stages: { e1: "Shortlisted" } },
  };

  it("flags a difference nobody approved", () => {
    const [stages] = classify(scenario, actual, []);
    expect(stages.verdict).toBe("UNEXPECTED_DIFFERENCE");
  });

  it("stops honouring an approval once the app drifts from the approved value", () => {
    const stale: ApprovedDifference = {
      id: "AD-X",
      scenario: "X",
      field: "stages",
      rationale: "approved when e1 was Offer",
      approvedBy: "someone",
      approvedActual: { e1: "Offer" },
    };
    const [stages] = classify(scenario, actual, [stale]);
    expect(stages.verdict).toBe("UNEXPECTED_DIFFERENCE");
  });

  it("reports a field with no baseline as UNOBSERVED rather than passing it", () => {
    const [, events] = classify(scenario, actual, []);
    expect(events.verdict).toBe("UNOBSERVED");
  });
});
```

### `test/baseline/scenarios/self-test.json`

These five scenarios exercise the harness itself. Their baselines are **synthetic**, not Manatal evidence, and are labelled so in every title. Replace or delete them once you have real captures.

```json
[
  {
    "id": "ST01",
    "title": "SELF-TEST ONLY (not Manatal evidence): advance one stage",
    "evidence": { "source": "synthetic-self-test", "ref": "none", "confidence": "unknown" },
    "start": "2026-10-05T02:00:00.000Z",
    "steps": [
      { "op": "add", "entry": "e1", "stage": "Sourced" },
      { "op": "advance", "entries": ["e1"] }
    ],
    "baseline": {
      "stages": { "e1": "Screening" },
      "events": [{ "entry": "e1", "from": "Sourced", "to": "Screening" }],
      "advance": { "moved": ["e1"], "blocked": [] }
    }
  },
  {
    "id": "ST02",
    "title": "SELF-TEST ONLY (not Manatal evidence): a placed candidate cannot advance",
    "evidence": { "source": "synthetic-self-test", "ref": "none", "confidence": "unknown" },
    "start": "2026-10-05T02:00:00.000Z",
    "steps": [
      { "op": "add", "entry": "e1", "stage": "Placed" },
      { "op": "advance", "entries": ["e1"] }
    ],
    "baseline": {
      "stages": { "e1": "Placed" },
      "events": [],
      "advance": { "moved": [], "blocked": [{ "entry": "e1", "reason": "Already placed" }] }
    }
  },
  {
    "id": "ST03",
    "title": "SELF-TEST ONLY (not Manatal evidence): shows how an approved difference is recorded",
    "evidence": { "source": "synthetic-self-test", "ref": "none", "confidence": "unknown" },
    "start": "2026-10-05T02:00:00.000Z",
    "steps": [
      { "op": "add", "entry": "e1", "stage": "Screening" },
      { "op": "move", "entry": "e1", "to": "Sourced" }
    ],
    "baseline": {
      "stages": { "e1": "Screening" }
    }
  },
  {
    "id": "ST04",
    "title": "SELF-TEST ONLY (not Manatal evidence): key dates come from first entry into a stage",
    "evidence": { "source": "synthetic-self-test", "ref": "none", "confidence": "unknown" },
    "start": "2026-10-05T02:00:00.000Z",
    "steps": [
      { "op": "add", "entry": "e1", "stage": "Shortlisted" },
      { "op": "wait", "days": 1 },
      { "op": "move", "entry": "e1", "to": "Submitted to client" },
      { "op": "wait", "days": 2 },
      { "op": "move", "entry": "e1", "to": "Client interview" }
    ],
    "baseline": {
      "keyDates": {
        "e1": { "added": "2026-10-05", "submitted": "2026-10-06", "interviewed": "2026-10-08" }
      }
    }
  },
  {
    "id": "ST05",
    "title": "SELF-TEST ONLY (not Manatal evidence): job stage has no production counterpart",
    "evidence": { "source": "synthetic-self-test", "ref": "none", "confidence": "unknown" },
    "start": "2026-10-05T02:00:00.000Z",
    "steps": [
      { "op": "add", "entry": "e1", "stage": "Screening" },
      { "op": "add", "entry": "e2", "stage": "Offer" }
    ],
    "baseline": {
      "jobStage": "Offer"
    }
  }
]
```

### `test/baseline/approved-differences.json`

```json
[
  {
    "id": "AD-ST03",
    "scenario": "ST03",
    "field": "stages",
    "rationale": "SELF-TEST ONLY. Shows the record format: the app allows a backwards move, the baseline did not.",
    "approvedBy": "Demo owner (self-test)",
    "approvedActual": { "e1": "Sourced" }
  }
]
```

Also add `test/baseline/report.md` to `.gitignore`; it is generated.

## 11. Running it

```bash
npx vitest run test/baseline                      # normal run
BASELINE_REPORT=1 npx vitest run test/baseline    # also writes test/baseline/report.md
BASELINE_STRICT=1 npx vitest run test/baseline    # fails on any UNOBSERVED or NO_COUNTERPART
```

**Adding a real scenario:** copy a self-test entry into a new file such as `scenarios/manatal-pipeline.json`. Set `evidence.source` to `observed`, `ref` to your private evidence id, `capturedOn`, `capturedBy` and `confidence`. Put only what you observed in `baseline`.

**Recording an approved difference:** add an entry to `approved-differences.json` with the scenario, field, rationale, approver, and the exact value the app produces today in `approvedActual`. Run again; the field changes from `UNEXPECTED_DIFFERENCE` to `APPROVED_DIFFERENCE`. Link each approval to the decision record (ADR or plan) that justifies it.

**Behaviour you should expect:**

- Before capture, normal runs pass and the report is mostly `UNOBSERVED`.
- Strict mode fails until every field is observed or has a counterpart. Use it as the pre-demo gate, not as a CI gate for now.
- Key dates are compared as UTC calendar dates. Manatal may display dates in another timezone, so keep scenario times away from midnight to avoid false differences.

## 12. Demo run-sheet (about 6 minutes of the 20)

| Minute | Show                                                                                                                                                    | Tender clause         |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| 1      | The rule catalogue: each rule with evidence id, confidence and what was **not** observed                                                                | Appendix 1 §1.6, §1.7 |
| 2-3    | Run the harness live; read the report: matches, approved differences, unobserved, no counterpart                                                        | §2.4, §2.6            |
| 4      | Open one approved difference: rationale, approver, pinned value; explain why drift breaks the approval                                                  | §2.3                  |
| 5      | **Live change:** take one open difference (for example D1 or D4), record the decision, rerun, show the verdict change and the linked spec or ADR update | §4, §7.2              |
| 6      | State coverage, confidence and limits using the template in section 13                                                                                  | §2.5                  |

If you want the live change to touch code, D4 (job stage) is the cleanest: it has a clear definition, no counterpart today and a pure function to write test-first.

## 13. Limits and confidence statement (template)

> The baseline comes from black-box observation of Manatal on `<date>`, by `<name>`, using fictional data. We captured `<n>` scenarios covering `<rules>`. We could not observe `<list>`. Confidence is high for `<rules>`, medium for `<rules>` and unknown for `<rules>`. Capture is manual and judgement-based; replay and comparison are automated. Differences from Manatal were `<n>` approved by `<role>` on `<date>` and `<n>` are still open.

## 14. Tooling disclosure (clause 7.4)

| Item          | Detail                                                                                                                                                                                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tool          | An AI assistant (Claude) drafted the harness code and this document                                                                                                                                                                   |
| Inputs        | The repo's move code, tests and migrations; Manatal's public documentation                                                                                                                                                            |
| Outputs       | The five files above and this document                                                                                                                                                                                                |
| Remains human | Capturing the Manatal baseline, confirming the stage mapping, deciding and approving each difference, the confidence ratings                                                                                                          |
| Controls      | The harness ran green against production code; self-test scenarios are labelled synthetic; classifier tests check that unapproved and stale approvals fail; strict mode fails on any unobserved field; a person reviews each approval |

## 15. Pre-demo checklist

- [ ] Manatal capture done for S01-S04, S09, S10, S11 at minimum, with evidence ids
- [ ] Stage mapping (M-1) confirmed by observation
- [ ] Every difference D1-D7 has a decision, an approver and a record
- [ ] Self-test scenarios removed or clearly labelled
- [ ] `BASELINE_STRICT=1` run reviewed; every remaining gap is explained in the limits statement
- [ ] Lint, typecheck, unit tests and build green on the exact commit you will demo
- [ ] Generated `report.md` is not committed
- [ ] The live change is rehearsed and fits in about two minutes
- [ ] No Manatal screenshots or real data in the public repo

## 16. Not claimed

- No Manatal behaviour is asserted by this document. Everything in the "Documented" column is from public documentation, which is silent on several rules above.
- The v1 harness does not replay drop, remove, reactivation or duplicate-add scenarios.
- The harness verifies the slice only. It does not show equivalence for the rest of the system.
