import "server-only";

import type { Json } from "@/lib/database.types";
import { getDb } from "../db";
import type { AiRunRecord, AiRunsWriter } from "./types";

/**
 * `AiRunsWriter` that inserts into `public.ai_runs` via the server-only
 * service-role client. Unit tests keep using an in-memory writer.
 */
export class SupabaseAiRunsWriter implements AiRunsWriter {
  async write(row: AiRunRecord): Promise<void> {
    const { error } = await getDb()
      .from("ai_runs")
      .insert({
        step: row.step,
        provider: row.provider,
        model_id: row.model_id,
        model_version: row.model_version,
        prompt_version: row.prompt_version,
        input_ref: row.input_ref,
        output: toJson(row.output),
        status: row.status,
        error: row.error,
        cost_usd: row.cost_usd,
        duration_ms: row.duration_ms,
        completed_at: new Date().toISOString(),
      });

    if (error) {
      throw new Error(`Failed to write ai_runs row: ${error.message}`);
    }
  }
}

export function createSupabaseAiRunsWriter(): AiRunsWriter {
  return new SupabaseAiRunsWriter();
}

function toJson(value: unknown | null): Json | null {
  if (value === null) {
    return null;
  }
  return JSON.parse(JSON.stringify(value)) as Json;
}
