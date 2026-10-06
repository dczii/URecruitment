# Placement consistency evidence

Generated: 2026-10-05T07:28:02.738Z. Node v22.23.2. HEAD 3c39f2e3ed6d169d3a7146fca5a5fb65377acd72; dirty working tree: true.

Pure logic and mocked service tests; browser evidence is separate. SQL/RLS and remote services not verified.

Command: `npm test -- src/lib/placement-countdown.test.ts src/server/placements/list.test.ts src/server/placements/create.test.ts src/server/placements/guarantee.test.ts scripts/demo/comparison.test.ts scripts/demo/fixtures.test.ts` → exit 0.

| Requirement/case | Start | UTC instant | Period | Load before | Save before | Expected | Actual | Result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FR-001/month-end | 2026-01-31 | 2026-02-01T04:00:00Z | 30 | 0 | 1 | 1 | 1 | approved difference |
| FR-001/leap-day | 2024-02-28 | 2024-03-01T04:00:00Z | 30 | 4 | 2 | 2 | 2 | approved difference |
| FR-001/year-end | 2025-12-31 | 2026-01-01T04:00:00Z | 30 | 1 | 1 | 1 | 1 | unchanged |
| FR-001/before-SGT-midnight | 2026-10-04 | 2026-10-04T15:59:59Z | 30 | 0 | 1 | 0 | 0 | approved difference |
| FR-001/at-SGT-midnight | 2026-10-04 | 2026-10-04T16:00:00Z | 30 | 1 | 1 | 1 | 1 | unchanged |
| FR-002/ended | 2026-08-06 | 2026-10-05T04:00:00Z | 30 | 60 | 30 | 30 | 30 | approved difference |
| FR-002/end-today | 2026-09-05 | 2026-10-05T04:00:00Z | 30 | 31 | 30 | 30 | 30 | approved difference |
| FR-002/future | 2026-10-08 | 2026-10-05T04:00:00Z | 30 | 0 | 0 | 0 | 0 | unchanged |
| FR-002/start-today | 2026-10-05 | 2026-10-05T04:00:00Z | 30 | 0 | 0 | 0 | 0 | unchanged |
| FR-002/active | 2026-10-01 | 2026-10-05T04:00:00Z | 30 | 4 | 4 | 4 | 4 | unchanged |
| FR-002/client-period | 2026-08-01 | 2026-10-05T04:00:00Z | 60 | 65 | 60 | 60 | 60 | approved difference |

Both historical load and save paths are compared; the overall result is approved difference when either changes to the specified value. Expected outputs are independently enumerated in scripts/demo/cases.ts. Every actual output must match; a requirement ID alone does not permit a difference.

Full source/spec SHA-256 values and code-state identity: [verification.json](verification.json). Actual focused test output: [focused-tests.txt](focused-tests.txt).
