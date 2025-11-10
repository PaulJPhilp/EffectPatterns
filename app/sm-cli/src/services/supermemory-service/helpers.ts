import { Effect } from "effect";
import { ApiKeyError } from "./errors.js";

/**
 * SupermemoryService Helpers
 * Utility functions for Supermemory API interactions
 */

const BASE_URL = "https://api.supermemory.ai";

/**
 * Validate API key configuration
 */
export function validateApiKey(
  apiKey: string
): Effect.Effect<void, ApiKeyError> {
  return Effect.gen(function* () {
    if (!apiKey || apiKey.trim().length === 0) {
      return yield* Effect.fail(
        new ApiKeyError({
          message: "SUPERMEMORY_API_KEY is not set or is empty",
        })
      );
    }
  });
}

/**
 * Build authorization headers for API requests
 */
export function buildAuthHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

/**
 * Get full API URL for a given endpoint
 */
export function getApiUrl(endpoint: string, baseUrl?: string): string {
  const url = baseUrl || BASE_URL;
  return `${url}${endpoint}`;
}
