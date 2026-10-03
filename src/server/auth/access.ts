import "server-only";
import { cookies } from "next/headers";
import { authClient } from "./client";
import { authAdmin } from "./admin";
import { AGE_COOKIE, validSessionAge } from "./session";
import type { Identity } from "./service";
export async function approvedEmail(email: string): Promise<boolean> {
  const { data, error } = await authAdmin().from("recruiter_access").select("user_id").eq("email", email).eq("active", true).maybeSingle();
  if (error) throw new Error("Approval check unavailable");
  return Boolean(data);
}
export async function approvedIdentity(identity: Identity): Promise<boolean> {
  const { data, error } = await authAdmin().from("recruiter_access").select("user_id").eq("user_id", identity.id).eq("email", identity.email.toLowerCase()).eq("active", true).maybeSingle();
  if (error) throw new Error("Approval check unavailable");
  return Boolean(data);
}
export async function requireRecruiter(): Promise<Identity> {
  const client = await authClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user?.email) throw new Error("Authentication required");
  const identity = { id: data.user.id, email: data.user.email };
  const marker = (await cookies()).get(AGE_COOKIE)?.value;
  if (!validSessionAge(marker, identity.id) || !(await approvedIdentity(identity))) throw new Error("Authentication required");
  return identity;
}
