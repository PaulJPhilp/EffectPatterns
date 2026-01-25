/**
 * Environment variable schema for ep-admin
 * 
 * All variables are typed based on the schema below.
 * Validation happens at startup.
 */

import { Schema as S } from "effect";
import { createSimpleEnv, type EnvService } from "effect-env";

/**
 * Environment schema with type-safe variables and validation
 */
const envSchema = S.Struct({
  // Core runtime environment (optional)
  NODE_ENV: S.optional(
    S.Literal("development", "production", "test")
  ),

  // Database connection (optional)
  DATABASE_URL: S.optional(S.String),

  // AI API Keys - all optional with graceful degradation
  OPENAI_API_KEY: S.optional(S.String),
  ANTHROPIC_API_KEY: S.optional(S.String),
  GOOGLE_API_KEY: S.optional(S.String),

  // Discord integration (optional)
  DISCORD_TOKEN: S.optional(S.String),

  // Display configuration (optional)
  NO_COLOR: S.optional(S.BooleanFromString),
  CI: S.optional(S.BooleanFromString),
  TERM: S.optional(S.String),

  // Logging configuration (optional)
  LOG_LEVEL: S.optional(
    S.Literal("debug", "info", "warn", "error")
  ),
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

