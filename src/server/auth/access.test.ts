import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), cookie: vi.fn(), valid: vi.fn(), maybeSingle: vi.fn(), eq: vi.fn() }));
vi.mock("./client", () => ({ authClient: async () => ({ auth: { getUser: mocks.getUser } }) }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: mocks.cookie }) }));
vi.mock("./session", () => ({ AGE_COOKIE: "age", validSessionAge: mocks.valid }));
vi.mock("./admin", () => ({ authAdmin: () => ({ from: () => ({ select: () => ({ eq: mocks.eq }) }) }) }));
import { requireRecruiter } from "./access";
beforeEach(() => {
  mocks.getUser.mockResolvedValue({ data: { user: { id: "fictional", email: "a@example.test" } }, error: null });
  mocks.cookie.mockReturnValue({ value: "signed" }); mocks.valid.mockReturnValue(true);
  mocks.eq.mockReturnValue({ eq: mocks.eq, maybeSingle: mocks.maybeSingle });
  mocks.maybeSingle.mockResolvedValue({ data: { user_id: "fictional" }, error: null });
});
it("AC4 no verified identity means no approval query", async () => {
  mocks.getUser.mockResolvedValue({ data: { user: null }, error: new Error("forged") });
  await expect(requireRecruiter()).rejects.toThrow("Authentication required");
  expect(mocks.maybeSingle).not.toHaveBeenCalled();
});
it("AC4 checks user id, email and active membership", async () => {
  expect(await requireRecruiter()).toEqual({ id: "fictional", email: "a@example.test" });
  expect(mocks.eq).toHaveBeenCalledWith("user_id", "fictional"); expect(mocks.eq).toHaveBeenCalledWith("email", "a@example.test"); expect(mocks.eq).toHaveBeenCalledWith("active", true);
});
it("AC4 revoked approval denies the next request", async () => {
  await requireRecruiter(); mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
  await expect(requireRecruiter()).rejects.toThrow("Authentication required");
});
it("AC5 expired age marker denies access despite valid provider token", async () => {
  mocks.valid.mockReturnValue(false); await expect(requireRecruiter()).rejects.toThrow("Authentication required");
});
