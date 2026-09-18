import "server-only";

import { getDb } from "../db";

export type ClientOption = {
  id: string;
  name: string;
};

/**
 * Minimal client picker source for the job form: id + name, nothing else.
 */
export async function listClients(): Promise<ClientOption[]> {
  const db = getDb();
  const { data, error } = await db
    .from("clients")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to list clients: ${error.message}`);
  }

  return data ?? [];
}
