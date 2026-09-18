import { describe, expect, it } from "vitest";
import {
  buildContentSecurityPolicy,
  generateNonce,
  staticSecurityHeaders,
} from "./security-headers";

function directive(csp: string, name: string): string {
  const match = csp
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(name));
  expect(match).toBeDefined();
  return match ?? "";
}

describe("security headers (AC6)", () => {
  it("AC6: production CSP has a nonce and no unsafe-inline or unsafe-eval in script-src", () => {
    const nonce = "test-nonce";
    const csp = buildContentSecurityPolicy({ nonce, isDev: false });
    expect(csp).toContain(`'nonce-${nonce}'`);
    const scriptSrc = directive(csp, "script-src");
    expect(scriptSrc).not.toContain("unsafe-inline");
    expect(scriptSrc).not.toContain("unsafe-eval");
  });

  it("AC6: dev CSP allows unsafe-eval only in script-src", () => {
    const csp = buildContentSecurityPolicy({ nonce: "dev-nonce", isDev: true });
    const scriptSrc = directive(csp, "script-src");
    expect(scriptSrc).toContain("unsafe-eval");
    const rest = csp.replace(scriptSrc, "");
    expect(rest).not.toContain("unsafe-eval");
  });

  it("AC6: CSP forbids framing and plugins", () => {
    const csp = buildContentSecurityPolicy({ nonce: "n", isDev: false });
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
  });

  it("AC6: static headers include Referrer-Policy, nosniff, X-Frame-Options and Permissions-Policy", () => {
    const byKey = Object.fromEntries(
      staticSecurityHeaders.map((header) => [header.key, header.value]),
    );
    expect(byKey["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(byKey["X-Content-Type-Options"]).toBe("nosniff");
    expect(byKey["X-Frame-Options"]).toBe("DENY");
    expect(byKey["Permissions-Policy"]).toBe(
      "camera=(), microphone=(), geolocation=(), browsing-topics=()",
    );
  });

  it("AC6: generateNonce returns distinct base64 strings", () => {
    const first = generateNonce();
    const second = generateNonce();
    expect(first).not.toBe(second);
    expect(first).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
    expect(second).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
  });
});
