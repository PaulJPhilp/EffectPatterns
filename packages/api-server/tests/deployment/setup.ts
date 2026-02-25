/**
 * Deployment Test Setup
 *
 * Validates required environment variables before running deployment tests.
 * Ensures API keys and environment configuration are properly set.
 */

import { beforeAll } from "vitest";

beforeAll(() => {
  const env = process.env.DEPLOYMENT_ENV || "staging";

  // Determine which API key env var to check based on environment
  const apiKeyVar =
    env === "production" ? "PRODUCTION_API_KEY" : "STAGING_API_KEY";

  // Validate required environment variables
  if (!process.env[apiKeyVar]) {
    const msg = `Missing required environment variable: ${apiKeyVar}

Deployment tests require API authentication. Set the API key:

  For staging:
    export STAGING_API_KEY="your-staging-api-key"
    bun run test:deployment:staging

  For production:
    export PRODUCTION_API_KEY="your-production-api-key"
    bun run test:deployment:production

Current environment: ${env}
Required variable: ${apiKeyVar}`;

    throw new Error(msg);
  }

  // Validate DEPLOYMENT_ENV is set correctly
  if (!["staging", "production"].includes(env)) {
    throw new Error(
      `Invalid DEPLOYMENT_ENV="${env}". Must be "staging" or "production".`
    );
  }

  // Log which environment tests will run against
  console.log(`[Deployment Tests] Running against ${env} environment`);
  console.log(`[Deployment Tests] Using API key from ${apiKeyVar}`);
});
