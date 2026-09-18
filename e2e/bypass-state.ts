import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Where the Vercel bypass cookie is saved. Kept under the runner's temp folder
 * so it is never inside an uploaded artifact path.
 */
export function bypassStatePath(): string {
  return join(process.env.RUNNER_TEMP ?? tmpdir(), "urec-vercel-bypass-state.json");
}
