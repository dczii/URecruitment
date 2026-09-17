import { expect, it, vi } from "vitest";

it("AC7: an unexpected fetch fails the test", async () => {
  let error: unknown;
  try {
    await fetch("https://example.com");
  } catch (caught) {
    error = caught;
  }

  expect(error).toBeInstanceOf(Error);
  const message = error instanceof Error ? error.message : String(error);
  expect(message).toContain("Unexpected network call");
});

it("AC7: fake timers are available", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-02T16:00:00Z"));
  expect(new Date().toISOString()).toBe("2026-01-02T16:00:00.000Z");
});
