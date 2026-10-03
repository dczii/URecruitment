import { describe, expect, it } from "vitest";
import { emailSchema, codeSchema } from "./auth-schema";
describe("OTP input (AC2, AC6)", () => {
  it("normalizes recruiter email", () => expect(emailSchema.parse(" Recruiter@Example.test ")).toBe("recruiter@example.test"));
  it("rejects invalid email", () => expect(emailSchema.safeParse("not-email").success).toBe(false));
  it("preserves six digits including leading zeros", () => expect(codeSchema.parse("001234")).toBe("001234"));
  it.each(["12345", "1234567", "1e2345", "１２３４５６", "123 45"])("rejects malformed code %s", (code) => expect(codeSchema.safeParse(code).success).toBe(false));
});
