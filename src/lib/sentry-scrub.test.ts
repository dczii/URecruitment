import { describe, expect, it } from "vitest";
import { scrubBreadcrumb, scrubEvent, scrubValue } from "./sentry-scrub";

const REDACTED = "[redacted]";
const LONG_TEXT = "[redacted: long text]";

describe("sentry-scrub (AC4, AC11)", () => {
  it("AC4: removes a candidate name and email from extra", () => {
    const result = scrubEvent({
      extra: { name: "Mei Ling Tan", email: "mei.ling@example.com" },
    });

    expect(result.extra?.name).toBe(REDACTED);
    expect(result.extra?.email).toBe(REDACTED);
  });

  it("AC4: removes an email embedded in a message", () => {
    const result = scrubEvent({
      message: "failed to parse CV for wei.chen@example.com",
    });

    expect(result.message).toBe("failed to parse CV for [email]");
    expect(String(result.message)).not.toContain("wei.chen@example.com");
  });

  it("AC4: removes CV text", () => {
    const cvText = "A".repeat(2000);
    const details = "B".repeat(600);

    const result = scrubEvent({
      extra: { cv_text: cvText, details },
    });

    expect(result.extra?.cv_text).toBe(REDACTED);
    expect(result.extra?.details).toBe(LONG_TEXT);
    expect(JSON.stringify(result.extra)).not.toContain(cvText.slice(0, 40));
    expect(JSON.stringify(result.extra)).not.toContain(details.slice(0, 40));
  });

  it("AC4: removes secret-shaped values", () => {
    const secrets = [
      "sb_secret_abc123def456",
      "sk-abcdefghijklmnop",
      "eyJhbGciOiJIUzI1NiJ9.aaaaaaaaaa.bbbbbbbbbb",
      "vercel_blob_rw_FAKE1234567890",
      "Bearer abcdef123456",
      "https://fake-store.public.blob.vercel-storage.com/x.pdf",
    ];

    for (const value of secrets) {
      const result = scrubEvent({ extra: { token: value } });
      expect(result.extra?.token, value).toBe(REDACTED);
    }
  });

  it("AC4: removes the request body, cookies and headers", () => {
    const result = scrubEvent({
      request: {
        url: "https://portal.example.com/candidates/42",
        data: {
          name: "Mei Ling Tan",
          email: "mei.ling@example.com",
          cv_text: "A".repeat(2000),
        },
        cookies: { session: "fake-session-cookie" },
        headers: { authorization: "Bearer abcdef123456" },
      },
    });

    expect(result.request).toBeDefined();
    expect(result.request).not.toHaveProperty("data");
    expect(result.request).not.toHaveProperty("cookies");
    expect(result.request).not.toHaveProperty("headers");
  });

  it("AC4: strips the query string but keeps the path", () => {
    const result = scrubEvent({
      request: {
        url: "https://portal.example.com/candidates/42?email=a@example.com",
        query_string: "email=a@example.com",
      },
    });

    expect(result.request?.url).toBe(
      "https://portal.example.com/candidates/42",
    );
    expect(String(result.request?.url)).toContain("/candidates/42");
    expect(String(result.request?.url)).not.toContain("?");
    expect(JSON.stringify(result.request)).not.toContain("a@example.com");
  });

  it("AC4: clears user identity", () => {
    const result = scrubEvent({
      user: { id: "rec-42", username: "mei.ling.tan" },
    });

    expect(result.user).toBeUndefined();
  });

  it("AC4: scrubs nested structures", () => {
    const result = scrubEvent({
      contexts: {
        runtime: {
          debug: {
            email: "wei.chen@example.com",
          },
        },
        items: [{ phone: "+65 8123 4567" }],
      },
    });

    const runtime = result.contexts?.runtime as
      | { debug?: { email?: unknown } }
      | undefined;
    expect(runtime?.debug?.email).toBe(REDACTED);

    const items = result.contexts?.items as { phone?: unknown }[] | undefined;
    expect(items?.[0]?.phone).toBe(REDACTED);

    expect(JSON.stringify(result.contexts)).not.toContain(
      "wei.chen@example.com",
    );
    expect(JSON.stringify(result.contexts)).not.toContain("+65 8123 4567");
  });

  it("AC4: leaves harmless values alone", () => {
    const extra = { jobId: "job-7", durationMs: 1234, status: "ok" };
    const message = "pipeline step finished";
    const result = scrubEvent({ extra, message });

    expect(result.extra).toEqual(extra);
    expect(result.message).toBe(message);
  });

  it("AC4: scrubs exception values", () => {
    const jwt = "eyJhbGciOiJIUzI1NiJ9.aaaaaaaaaa.bbbbbbbbbb";
    const result = scrubEvent({
      exception: {
        values: [
          {
            value: `parse failed for wei.chen@example.com token=${jwt}`,
          },
        ],
      },
    });

    const scrubbed = result.exception?.values?.[0]?.value;
    expect(typeof scrubbed).toBe("string");
    expect(scrubbed).not.toContain("wei.chen@example.com");
    expect(scrubbed).not.toContain(jwt);
  });

  it("AC4: does not mutate a frozen input or throw on odd shapes", () => {
    expect(() => scrubEvent({})).not.toThrow();
    expect(() => scrubEvent({ extra: undefined })).not.toThrow();
    expect(() => scrubValue(null)).not.toThrow();

    const extra = Object.freeze({ name: "Mei Ling Tan", jobId: "job-7" });
    const event = Object.freeze({ extra });
    expect(() => scrubEvent(event)).not.toThrow();

    const result = scrubEvent(event);
    expect(event.extra.name).toBe("Mei Ling Tan");
    expect(event.extra.jobId).toBe("job-7");
    expect(result.extra?.name).toBe(REDACTED);
    expect(result.extra?.jobId).toBe("job-7");
  });

  it("AC11: scrubBreadcrumb scrubs data and message", () => {
    const result = scrubBreadcrumb({
      message: "failed to parse CV for wei.chen@example.com",
      data: {
        name: "Mei Ling Tan",
        email: "mei.ling@example.com",
        jobId: "job-7",
      },
    });

    expect(result.message).toBe("failed to parse CV for [email]");
    expect(result.data?.name).toBe(REDACTED);
    expect(result.data?.email).toBe(REDACTED);
    expect(result.data?.jobId).toBe("job-7");
  });
});
