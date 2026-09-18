import { NextResponse } from "next/server";
import { z } from "zod";

import { search } from "@/app/search/actions";
import { AI_FAILED_MESSAGE } from "@/lib/ai-routes";

const bodySchema = z.object({
  query: z.string(),
});

/**
 * POST /api/ai/search
 *
 * JSON `{ query }`. Runs the search-query model then hybrid SQL via
 * `search()`. Lives under `/api/ai/` so the firewall can rate-limit it.
 */
export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return errorJson(400, "Enter a search query.");
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return errorJson(400, "Enter a search query.");
  }

  try {
    const result = await search(parsed.data.query);
    return NextResponse.json(result);
  } catch {
    return errorJson(500, AI_FAILED_MESSAGE);
  }
}

function errorJson(status: number, error: string): NextResponse {
  return NextResponse.json({ error }, { status });
}
