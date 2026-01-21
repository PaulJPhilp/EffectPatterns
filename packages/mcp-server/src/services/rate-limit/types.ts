/**
 * Basic types for Vercel KV to avoid 'any'
 */
export interface VercelKV {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, options?: { px?: number }): Promise<string | null>;
  setex(key: string, seconds: number, value: unknown): Promise<string | null>;
  del(key: string): Promise<number>;
}

/**
 * Rate limit entry
 */
export interface RateLimitEntry {
  readonly requests: number;
  readonly windowStart: number;
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly resetTime: Date;
  readonly limit: number;
  readonly windowMs: number;
}
