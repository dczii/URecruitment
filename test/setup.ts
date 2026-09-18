/**
 * Freeze time with:
 *   vi.useFakeTimers();
 *   vi.setSystemTime(new Date("2026-01-02T16:00:00Z"));
 * which is 00:00 SGT. Tests assert Singapore time explicitly; TZ is UTC so the
 * host zone never leaks in.
 *
 * No unit test may call the network or the sample-data Blob store
 * (docs/plans/test-strategy.md). Unexpected `fetch` is stubbed to throw.
 */
import { afterEach, beforeEach, vi } from "vitest";

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input;
  }
  if (input instanceof URL) {
    return input.href;
  }
  return input.url;
}

beforeEach(() => {
  vi.stubGlobal("fetch", (input: RequestInfo | URL) => {
    throw new Error(
      `Unexpected network call in a unit test: ${requestUrl(input)}. Unit tests must not use the network (docs/plans/test-strategy.md).`,
    );
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.restoreAllMocks();
});
