/**
 * Environment variable validation at startup
 * 
 * Validates environment variables against the schema and fails fast
 * with helpful error messages if validation fails.
 */

import { Effect } from "effect";
import { validate } from "effect-env";
import { envSchema } from "./env.js";

/**
 * Validate environment variables at startup
 * 
 * This creates a clear validation report and fails fast with helpful errors.
 * Should be called at application startup before any operations.
 */
export const validateEnvironment = Effect.gen(function* () {
  const processEnv = process.env;
  yield* (validate(envSchema as any, processEnv) as any).pipe(
    Effect.mapError(
      (error: unknown) =>
        new Error(`Environment validation failed.\n${String(error)}`)
    )
  );
});
