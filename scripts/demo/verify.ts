import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { placementDaysUsed } from "../../src/lib/placement-countdown";
import { cases } from "./cases";
import { originalLoad, originalSave } from "./baseline";
import { classify, classifyPaths } from "./comparison";

const historical = process.argv.includes("--baseline");
const rows = cases.map(c => {
  const actual = historical ? originalLoad(c.start, c.now) : placementDaysUsed(c.start, c.period, new Date(c.now));
  const before = originalLoad(c.start, c.now);
  const saveBefore = originalSave(c.start, c.period, c.now);
  return { ...c, before, originalSave: saveBefore, actual, loadResult: classify(before, c.expected, actual), saveResult: classify(saveBefore, c.expected, actual), result: classifyPaths(before, saveBefore, c.expected, actual) };
});
console.table(rows.map(c => ({ case: c.id, loadBefore: c.before, saveBefore: c.originalSave, expected: c.expected, actual: c.actual, result: c.result })));
if (historical) {
  console.log('Historical formulas from 3c39f2e replayed against the approved specification. Expected failure; current app was not reverted.');
  process.exit(rows.some(r => r.result === "unexpected difference") ? 1 : 0);
}
const testArgs = ["test", "--", "src/lib/placement-countdown.test.ts", "src/server/placements/list.test.ts", "src/server/placements/create.test.ts", "src/server/placements/guarantee.test.ts", "scripts/demo/comparison.test.ts", "scripts/demo/fixtures.test.ts"];
const tests = spawnSync("npm", testArgs, { encoding: "utf8", env: process.env });
const output = `${tests.stdout ?? ""}${tests.stderr ?? ""}`;
console.log(output);
const paths = ["specs/049-live-technical-demo/spec.md", "src/lib/placement-countdown.ts", "src/server/placements/list.ts", "src/server/placements/create.ts", "src/components/features/placements/Placements.tsx", "scripts/demo/cases.ts", "scripts/demo/baseline.ts", "scripts/demo/comparison.ts"];
const hashes = Object.fromEntries(paths.map(p => [p, createHash("sha256").update(readFileSync(p)).digest("hex")]));
const report = {
  generatedAt: new Date().toISOString(), node: process.version,
  head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  dirty: execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim().length > 0,
  diffSha256: createHash("sha256").update(execFileSync("git", ["diff", "--", ...paths])).digest("hex"),
  hashes, rows, command: `npm ${testArgs.join(" ")}`, exitCode: tests.status,
  scope: "Pure logic and mocked service tests; browser evidence is separate. SQL/RLS and remote services not verified.",
};
const dir = "docs/engineering/live-demo/evidence";
mkdirSync(dir, { recursive: true });
writeFileSync(`${dir}/verification.json`, JSON.stringify(report, null, 2) + "\n");
writeFileSync(`${dir}/focused-tests.txt`, output);
const lines = ["# Placement consistency evidence", "", `Generated: ${report.generatedAt}. Node ${report.node}. HEAD ${report.head}; dirty working tree: ${report.dirty}.`, "", report.scope, "", `Command: \`${report.command}\` → exit ${tests.status}.`, "", "| Requirement/case | Start | UTC instant | Period | Load before | Save before | Expected | Actual | Result |", "| --- | --- | --- | --- | --- | --- | --- | --- | --- |", ...rows.map(c => `| ${c.id} | ${c.start} | ${c.now} | ${c.period} | ${c.before} | ${c.originalSave} | ${c.expected} | ${c.actual} | ${c.result} |`), "", "Both historical load and save paths are compared; the overall result is approved difference when either changes to the specified value. Expected outputs are independently enumerated in scripts/demo/cases.ts. Every actual output must match; a requirement ID alone does not permit a difference.", "", "Full source/spec SHA-256 values and code-state identity: [verification.json](verification.json). Actual focused test output: [focused-tests.txt](focused-tests.txt).", ""];
writeFileSync(`${dir}/verification.md`, lines.join("\n"));
if (tests.status !== 0 || rows.some(r => r.result === "unexpected difference")) process.exit(1);
console.log(`Evidence written to ${dir}/verification.md`);
