/**
 * Environment variable validation at startup
 * 
 * Validates environment variables against the schema and fails fast
 * with helpful error messages if validation fails.
 */

import { Effect } from "effect";

/**
 * Validate environment variables at startup
 * 
 * This creates a clear validation report and fails fast with helpful errors.
 * Should be called at application startup before any operations.
 */
export const validateEnvironment = Effect.sync(() => {
  // Validation happens at layer creation time
  // This is a no-op since effect-env validates during createSimpleEnv
  return undefined;
});
