import { describe, expect, it, vi } from "vitest";
import { createGuardedFetch } from "./guarded-fetch";
describe("privileged transport (AC4)", () => {
  it("denies DB and Storage before any request when authorization fails", async () => {
    const transport = vi.fn().mockResolvedValue(new Response("{}"));
    const authorize = vi.fn().mockRejectedValue(new Error("Unauthorized"));
    const guarded = createGuardedFetch(authorize, transport);
    for (const path of ["rest/v1/candidates", "storage/v1/object/sign/cv-files/file.pdf"]) {
      await expect(guarded(`http://localhost/${path}`)).rejects.toThrow("Unauthorized");
    }
    expect(transport).not.toHaveBeenCalled();
  });
  it("checks every operation, so revoked membership blocks the next call", async () => {
    const transport = vi.fn().mockResolvedValue(new Response("{}"));
    const authorize = vi.fn().mockResolvedValueOnce({ id: "fictional" }).mockRejectedValueOnce(new Error("Revoked"));
    const guarded = createGuardedFetch(authorize, transport);
    await guarded("http://localhost/rest/v1/jobs");
    await expect(guarded("http://localhost/rest/v1/jobs")).rejects.toThrow("Revoked");
    expect(transport).toHaveBeenCalledTimes(1);
  });
});
