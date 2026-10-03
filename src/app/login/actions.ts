"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { authClient, clearSession } from "@/server/auth/client";
import { approvedEmail, approvedIdentity } from "@/server/auth/access";
import { allowAttempt } from "@/server/auth/limiter";
import { authService, type Identity } from "@/server/auth/service";
import { AGE_COOKIE, issueSessionAge, sessionCookieOptions } from "@/server/auth/session";
function service() {
  return authService({
    approvedEmail, approvedIdentity, limit: allowAttempt,
    async send(email) {
      const { error } = await (await authClient(true)).auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
      return !error;
    },
    async verify(email, token): Promise<Identity | null> {
      const { data, error } = await (await authClient(true)).auth.verifyOtp({ email, token, type: "email" });
      return error || !data.user?.email ? null : { id: data.user.id, email: data.user.email };
    },
    async complete(identity) { (await cookies()).set(AGE_COOKIE, issueSessionAge(identity.id), sessionCookieOptions); },
    clear: clearSession,
  });
}
export async function requestCode(email: unknown) { return service().request(email); }
export async function verifyCode(email: unknown, code: unknown) {
  const result = await service().verify(email, code);
  if (result.ok) { revalidatePath("/", "layout"); redirect("/dashboard"); }
  return result;
}
export async function logout() {
  try { await (await authClient(true)).auth.signOut({ scope: "local" }); } catch { /* Clear locally during outages too. */ }
  await clearSession();
  revalidatePath("/", "layout");
  redirect("/login");
}
