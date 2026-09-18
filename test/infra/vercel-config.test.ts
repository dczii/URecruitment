import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));
const ENV_NAME_LINE = /^([A-Z][A-Z0-9_]*)=(.*)$/;
const BACKTICKED_ENV_NAME = /`([A-Z][A-Z0-9_]*)`/g;
const SET_WHERE_HEADING = "### What is set where (#92)";

function envExampleNamesAndValues(): Array<{ name: string; value: string }> {
  const text = readFileSync(join(repoRoot, ".env.example"), "utf8");
  const rows: Array<{ name: string; value: string }> = [];
  for (const line of text.split(/\r?\n/)) {
    const match = ENV_NAME_LINE.exec(line);
    if (match === null) {
      continue;
    }
    const name = match[1];
    const value = match[2];
    if (name === undefined || value === undefined) {
      continue;
    }
    rows.push({ name, value });
  }
  return rows;
}

function markdownSection(markdown: string, heading: string, sourcePath: string): string {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((line) => line === heading);
  if (start === -1) {
    throw new Error(`Missing heading ${JSON.stringify(heading)} in ${sourcePath}`);
  }
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.startsWith("### ") || line.startsWith("## ")) {
      end = i;
      break;
    }
  }
  return lines.slice(start + 1, end).join("\n");
}

function envNamesInSetWhereMatrix(section: string): Set<string> {
  const names = new Set<string>();
  for (const line of section.split(/\r?\n/)) {
    if (!line.startsWith("|")) {
      continue;
    }
    const firstCell = line.split("|")[1] ?? "";
    for (const match of firstCell.matchAll(BACKTICKED_ENV_NAME)) {
      const name = match[1];
      if (name !== undefined) {
        names.add(name);
      }
    }
  }
  return names;
}

describe("vercel config (AC1, AC2)", () => {
  it("AC1: vercel.json pins functions to sin1", () => {
    const json = JSON.parse(
      readFileSync(join(repoRoot, "vercel.json"), "utf8"),
    ) as { regions: unknown };
    expect(json.regions).toEqual(["sin1"]);
  });

  it("AC2: .env.example holds names only", () => {
    const rows = envExampleNamesAndValues();
    expect(rows.length).toBeGreaterThanOrEqual(10);
    for (const row of rows) {
      expect(row.value, `${row.name} must have an empty value in .env.example`).toBe(
        "",
      );
    }
  });

  it("AC2: every .env.example name has a row in the set-where matrix", () => {
    const sourcePath = "docs/plans/infrastructure.md";
    const markdown = readFileSync(join(repoRoot, sourcePath), "utf8");
    const section = markdownSection(markdown, SET_WHERE_HEADING, sourcePath);
    const matrixNames = envNamesInSetWhereMatrix(section);
    const exampleNames = envExampleNamesAndValues().map((row) => row.name);
    const missing = exampleNames.filter((name) => !matrixNames.has(name));
    expect(
      missing,
      `these .env.example names have no row in the set-where matrix: ${missing.join(", ")}`,
    ).toEqual([]);
  });
});
