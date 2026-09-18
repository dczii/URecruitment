import { z } from "zod";
import {
  EnvError,
  blankEnvStrings,
  envIssuesFromZod,
} from "@/lib/env-error";

const httpOrHttpsUrl = z.url({ protocol: /^https?$/ });

const seedEnvSchema = z.object({
  BLOB_READ_WRITE_TOKEN: z.string().min(1),
  SEED_BLOB_BASE_URL: httpOrHttpsUrl,
});

export type SeedEnv = {
  blobToken: string;
  blobBaseUrl: string;
};

export function parseSeedEnv(
  source: Record<string, string | undefined>,
): SeedEnv {
  const parsed = seedEnvSchema.safeParse(
    blankEnvStrings({
      BLOB_READ_WRITE_TOKEN: source.BLOB_READ_WRITE_TOKEN,
      SEED_BLOB_BASE_URL: source.SEED_BLOB_BASE_URL,
    }),
  );
  if (!parsed.success) {
    throw new EnvError(envIssuesFromZod(parsed.error.issues, source));
  }
  return {
    blobToken: parsed.data.BLOB_READ_WRITE_TOKEN,
    blobBaseUrl: parsed.data.SEED_BLOB_BASE_URL,
  };
}

export function assertBlobUrlInStore(url: string, baseUrl: string): void {
  if (!url.startsWith(baseUrl)) {
    throw new Error(
      "Listed file URL is not in the configured sample-data store.",
    );
  }
}
