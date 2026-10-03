import "server-only";
import { emailSchema, codeSchema } from "@/lib/auth-schema";
export type Identity = { id: string; email: string };
export type AuthDependencies = {
  approvedEmail: (email: string) => Promise<boolean>;
  approvedIdentity: (identity: Identity) => Promise<boolean>;
  limit: (email: string, operation: "send" | "verify") => Promise<boolean>;
  send: (email: string) => Promise<boolean>;
  verify: (email: string, code: string) => Promise<Identity | null>;
  complete: (identity: Identity) => Promise<void>;
  clear: () => Promise<void>;
};
export type AuthResult = { ok: true } | { ok: false; error: string };
const UNAVAILABLE = { ok: false, error: "Login is temporarily unavailable. Please try again." } as const;
const INVALID = { ok: false, error: "The code is invalid or expired. Request a new code and try again." } as const;
const THROTTLED = { ok: false, error: "Too many attempts. Please wait before trying again." } as const;
export function authService(deps: AuthDependencies) {
  return {
    async request(input: unknown): Promise<AuthResult> {
      const parsed = emailSchema.safeParse(input);
      if (!parsed.success) return { ok: false, error: "Enter a valid work email." };
      try {
        if (!(await deps.limit(parsed.data, "send"))) return THROTTLED;
        if (!(await deps.approvedEmail(parsed.data))) return { ok: true };
        // Provider failures use the same acknowledgement, preventing approval
        // enumeration through delivery errors. Operational monitoring is private.
        await deps.send(parsed.data).catch(() => false);
        return { ok: true };
      } catch { return UNAVAILABLE; }
    },
    async verify(emailInput: unknown, codeInput: unknown): Promise<AuthResult> {
      const email = emailSchema.safeParse(emailInput);
      const code = codeSchema.safeParse(codeInput);
      if (!email.success || !code.success) return { ok: false, error: "Enter a valid email and six-digit code." };
      try {
        if (!(await deps.limit(email.data, "verify"))) return THROTTLED;
        if (!(await deps.approvedEmail(email.data))) return INVALID;
        const identity = await deps.verify(email.data, code.data);
        if (!identity) return INVALID;
        if (identity.email.toLowerCase() !== email.data || !(await deps.approvedIdentity(identity))) {
          await deps.clear();
          return INVALID;
        }
        await deps.complete(identity);
        return { ok: true };
      } catch {
        // verifyOtp may have set cookies before a later check failed.
        await deps.clear().catch(() => undefined);
        return UNAVAILABLE;
      }
    },
  };
}
