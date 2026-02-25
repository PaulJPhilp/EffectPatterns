import { RateLimitResult, VercelKV } from "./types";

// Safely import kv with fallback for missing environment variables
export function getKvClient(): VercelKV | null {
  try {
    // Only try to import kv if environment variables are properly configured
    const kvUrl = process.env.KV_REST_API_URL;
    const kvToken = process.env.KV_REST_API_TOKEN;

    if (kvUrl && kvToken && kvUrl.trim() !== "" && kvToken.trim() !== "") {
      const kvModule = require("@vercel/kv");
      return kvModule.kv;
    }
  } catch (e) {
    // KV not available (likely missing environment variables in tests/dev)
  }
  return null;
}

/**
 * Legacy rate limiting functions (for backward compatibility)
 */
export function createRateLimitKey(
  identifier: string,
  operation: string
): string {
  return `${operation}:${identifier}`;
}

export function getRemainingRequests(result: RateLimitResult): number {
  return result.remaining;
}

export function getResetTime(result: RateLimitResult): Date {
  return result.resetTime;
}
