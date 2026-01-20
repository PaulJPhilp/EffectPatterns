/**
 * Rate limiter service types
 */

/**
 * Rate limit entry for tracking requests per IP
 */
export interface RateLimitEntry {
    readonly count: number;
    readonly resetTime: number;
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
    readonly allowed: boolean;
    readonly remaining: number;
    readonly resetTime?: number;
}

/**
 * Rate limiter configuration
 */
export interface RateLimitConfig {
    readonly windowMs: number;
    readonly maxRequests: number;
}
