import "server-only";

import type { AiModel, FakeModelOptions } from "./types";

/**
 * In-memory `AiModel` for unit tests. No network, no provider SDK.
 * Returns a fixed `object` (and optional `costUsd`), or throws `error`.
 */
export function createFakeModel(options: FakeModelOptions): AiModel {
  return {
    modelId: options.modelId,
    modelVersion: options.modelVersion,
    async generateObject() {
      if (options.error) {
        throw options.error;
      }
      return {
        object: options.object,
        costUsd: options.costUsd,
      };
    },
  };
}
