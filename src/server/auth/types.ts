import "server-only";
import type { Database } from "@/lib/database.types";
// Isolated schema overlay until the local Supabase CLI can regenerate types.
// Do not hand-edit the existing generated schema; CI must verify this migration.
type Approval = { user_id: string; email: string; active: boolean; created_at: string; updated_at: string };
export type AuthDatabase = Omit<Database, "public"> & { public: Omit<Database["public"], "Tables" | "Functions"> & {
  Tables: Database["public"]["Tables"] & {
    recruiter_access: { Row: Approval; Insert: Pick<Approval, "user_id" | "email"> & Partial<Approval>; Update: Partial<Approval>; Relationships: [] };
  };
  Functions: Database["public"]["Functions"] & {
    consume_auth_limit: { Args: { bucket_key: string; max_attempts: number; window_seconds: number }; Returns: boolean };
  };
} };
