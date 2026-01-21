/**
 * Rate limiter service API
 */

import { Effect } from "effect";
import { RateLimitResult } from "./types.js";

/**
 * Rate limiter service interface
 */
export interface RateLimiterService {
    /**
     * Check if an IP address is rate limited
     */
    readonly checkRateLimit: (
        ip: string,
    ) => Effect.Effect<RateLimitResult, never, never>;
}
