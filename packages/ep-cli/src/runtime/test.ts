/**
 * Test Runtime for ep-cli
 * 
 * Provides a test environment with optional overrides for testing.
 */

import { Layer } from "effect";
import { createSimpleEnv } from "effect-env";
import { envSchema, type EnvConfig } from "../config/env.js";

/**
 * Create a test environment with optional overrides
 * 
 * Usage:
 * ```typescript
 * const testEnv = createTestEnv({ LOG_LEVEL: "debug" });
 * ```
 */
export const createTestEnv = (overrides: Partial<EnvConfig> = {}) =>
	createSimpleEnv(envSchema as any, {
		NODE_ENV: "test",
			LOG_LEVEL: undefined,
			PATTERN_API_KEY: undefined,
			EP_API_KEY_FILE: undefined,
			EP_CONFIG_FILE: undefined,
			EFFECT_PATTERNS_API_URL: undefined,
			EP_API_TIMEOUT_MS: undefined,
			EP_INSTALLED_STATE_FILE: undefined,
			EP_SKILLS_DIR: undefined,
			DEBUG: undefined,
		VERBOSE: undefined,
		NO_COLOR: undefined,
		CI: undefined,
		TERM: undefined,
		...overrides, // Allow test-specific overrides
	} as any) as any;
