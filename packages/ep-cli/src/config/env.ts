/**
 * Environment variable schema for ep-cli (End-user CLI)
 * 
 * All variables are typed based on the schema below.
 * Validation happens at startup.
 */

import { Layer, Schema as S } from "effect";
import { createSimpleEnv, type EnvService } from "effect-env";

/**
 * Environment schema with type-safe variables and validation
 */
const envSchema = S.Struct({
  // Core runtime environment (optional)
  NODE_ENV: S.optional(
    S.Literal("development", "production", "test")
  ),

  // Logging configuration (optional)
  LOG_LEVEL: S.optional(
    S.Literal("debug", "info", "warn", "error")
  ),

  // API configuration (optional)
  PATTERN_API_KEY: S.optional(S.String),
  EFFECT_PATTERNS_API_URL: S.optional(S.String),
  EP_API_TIMEOUT_MS: S.optional(S.NumberFromString),

  // Debug and verbose flags (optional)
  DEBUG: S.optional(S.BooleanFromString),
  VERBOSE: S.optional(S.BooleanFromString),

  // Display configuration (optional)
  NO_COLOR: S.optional(S.BooleanFromString),
  CI: S.optional(S.BooleanFromString),
  TERM: S.optional(S.String),
});

/**
 * Create the environment layer from the schema
 * 
 * This provides type-safe access to environment variables
 * throughout the application via Effect.Service pattern.
 */
export const envLayer = createSimpleEnv(
  envSchema as any,
  process.env,
  false, // skipValidation - let validation happen at startup
  (error) => {
    // Custom error handler if needed
    console.error("Environment validation error:", error);
  }
) as any;

/**
 * Type export for environment configuration
 * 
 * Use this type when you need to reference the full environment type:
 * 
 * ```typescript
 * const config: EnvConfig = { ... }
 * ```
 */
export type EnvConfig = S.Schema.Type<typeof envSchema>;

/**
 * Export the schema for testing and validation
 */
export { envSchema };

/**
 * Export EnvService type for use in generators
 */
export type { EnvService };
