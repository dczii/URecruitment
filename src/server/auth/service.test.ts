import { beforeEach, describe, expect, it, vi } from "vitest";
import { authService, type AuthDependencies } from "./service";
let deps: AuthDependencies;
beforeEach(() => {
  deps = {
    approvedEmail: vi.fn().mockResolvedValue(true), approvedIdentity: vi.fn().mockResolvedValue(true),
    limit: vi.fn().mockResolvedValue(true), send: vi.fn().mockResolvedValue(true),
    verify: vi.fn().mockResolvedValue({ id: "fictional-user", email: "recruiter@example.test" }),
    complete: vi.fn().mockResolvedValue(undefined), clear: vi.fn().mockResolvedValue(undefined),
  };
});
describe("OTP service", () => {
  it("AC1 sends only after approval and throttling", async () => {
    expect(await authService(deps).request(" Recruiter@Example.test ")).toEqual({ ok: true });
    expect(deps.send).toHaveBeenCalledWith("recruiter@example.test");
  });
  it("AC3 unknown emails get the same acknowledgement but no code", async () => {
    vi.mocked(deps.approvedEmail).mockResolvedValue(false);
    expect(await authService(deps).request("unknown@example.test")).toEqual({ ok: true });
    expect(deps.send).not.toHaveBeenCalled();
  });
  it("AC7 throttling blocks sending and verification", async () => {
    vi.mocked(deps.limit).mockResolvedValue(false);
    expect((await authService(deps).request("recruiter@example.test")).ok).toBe(false);
    expect((await authService(deps).verify("recruiter@example.test", "001234")).ok).toBe(false);
    expect(deps.send).not.toHaveBeenCalled(); expect(deps.verify).not.toHaveBeenCalled();
  });
  it("AC2 valid OTP finishes the session only after identity approval", async () => {
    expect(await authService(deps).verify("recruiter@example.test", "001234")).toEqual({ ok: true });
    expect(deps.verify).toHaveBeenCalledWith("recruiter@example.test", "001234");
    expect(deps.complete).toHaveBeenCalledWith({ id: "fictional-user", email: "recruiter@example.test" });
  });
  it("AC3 revoked identity clears newly created provider session", async () => {
    vi.mocked(deps.approvedIdentity).mockResolvedValue(false);
    expect((await authService(deps).verify("recruiter@example.test", "001234")).ok).toBe(false);
    expect(deps.complete).not.toHaveBeenCalled(); expect(deps.clear).toHaveBeenCalled();
  });
  it("AC2 invalid/expired/reused code never finishes a session", async () => {
    vi.mocked(deps.verify).mockResolvedValue(null);
    expect((await authService(deps).verify("recruiter@example.test", "001234")).ok).toBe(false);
    expect(deps.complete).not.toHaveBeenCalled();
  });
  it("invalid input makes no external call", async () => {
    expect((await authService(deps).request("invalid")).ok).toBe(false);
    expect((await authService(deps).verify("recruiter@example.test", "123")).ok).toBe(false);
    expect(deps.limit).not.toHaveBeenCalled();
  });
  it("provider failure keeps the generic acknowledgement without approval disclosure", async () => {
    vi.mocked(deps.send).mockRejectedValue(new Error("private provider detail"));
    const result = await authService(deps).request("recruiter@example.test");
    expect(result).toEqual({ ok: true }); expect(JSON.stringify(result)).not.toContain("private provider detail");
  });
});
