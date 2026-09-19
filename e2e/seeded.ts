import { test, type Page, type Response } from "@playwright/test";

/**
 * Sample data is not loaded into the shared Supabase project yet (#121), so a
 * preview deployment has no clients, candidates or jobs. Specs that need those
 * rows skip against an unseeded deployment instead of failing, and run in full
 * — unchanged assertions — the moment the data is there (locally today, on
 * preview once #121 ships). Nothing here weakens a test: it only decides
 * whether the fixture the test needs exists.
 */

const CLIENT_REASON =
  "No seeded client in public.clients — this deployment has no sample data yet (#121)";
const CANDIDATE_REASON =
  "No seeded candidate at this id — this deployment has no sample data yet (#121)";

/**
 * Counts the options in the job form's Client select. A single option is the
 * "Select a client" placeholder, meaning `public.clients` is empty.
 */
export async function countClientOptions(page: Page): Promise<number> {
  return page.getByLabel("Client").locator("option").count();
}

/** Skips the running test when the job form has no client to pick. */
export function skipWithoutSeededClient(optionCount: number): void {
  test.skip(optionCount <= 1, CLIENT_REASON);
}

/** Skips the running test when a candidate page answered 404 (no such row). */
export function skipWithoutSeededCandidate(response: Response | null): void {
  test.skip(response?.status() === 404, CANDIDATE_REASON);
}
