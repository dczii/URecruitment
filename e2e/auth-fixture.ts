import { test as base, expect } from "@playwright/test";
import { createHmac } from "node:crypto";
export const test = base.extend({
  context: async ({ context, request }, provideContext) => {
    if (!process.env.PLAYWRIGHT_BASE_URL) {
      await request.post("http://127.0.0.1:54329/test/reset");
      const response = await request.post("http://127.0.0.1:54329/test/session", { data: { email: "recruiter@example.test", token: "001234", type: "email" } });
      const session = await response.json();
      session.expires_at = Math.floor(Date.now() / 1000) + session.expires_in;
      const payload = `${session.user.id}:${Math.floor(Date.now() / 1000)}`;
      const marker = `${payload}:${createHmac("sha256", "fictional-e2e-secret").update(`session-age:${payload}`).digest("hex")}`;
      await context.addCookies([
        { name: "sb-127-auth-token", value: `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`, url: "http://localhost:3000", httpOnly: true, sameSite: "Lax" },
        { name: "recruiter-session-age", value: marker, url: "http://localhost:3000", httpOnly: true, sameSite: "Lax" },
      ]);
    }
    await provideContext(context);
  },
});
export { expect };
