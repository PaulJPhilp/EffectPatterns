/**
 * Global constants for Effect Patterns shared services
 */

// =============================================================================
// EXECUTION COMMANDS
// =============================================================================

/**
 * Default execution commands
 */
export const EXECUTION_COMMANDS = {
	/** Default script runner */
	SCRIPT_RUNNER: "bun",
	/** Alternative script runner */
	NODE_RUNNER: "node",
	/** TypeScript compiler */
	TYPESC_COMPILER: "npx tsc",
	/** Test runner */
	TEST_RUNNER: "npx vitest",
	/** Package manager */
	PACKAGE_MANAGER: "npm",
} as const;
