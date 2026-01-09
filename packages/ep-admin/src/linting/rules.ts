/**
 * Linting rules registry for Effect patterns
 */

import type { LintRule } from "./types.js";

/**
 * Rule Registry - Single source of truth for all linting rules
 */
export const LINT_RULES: LintRule[] = [
	{
		name: "effect-use-taperror",
		description:
			"Use Effect.tapError for side-effect logging instead of " +
			"Effect.catchAll + Effect.gen",
		defaultSeverity: "warning",
		canFix: false,
	},
	{
		name: "effect-explicit-concurrency",
		description:
			"Effect.all should explicitly specify concurrency option " +
			"(runs sequentially by default)",
		defaultSeverity: "warning",
		canFix: true,
	},
	{
		name: "effect-deprecated-api",
		description:
			"Catches usage of deprecated Effect APIs " +
			"(Effect.fromOption, Option.zip, etc.)",
		defaultSeverity: "error",
		canFix: true,
	},
	{
		name: "effect-prefer-pipe",
		description:
			"Consider using pipe() for better readability with long method chains",
		defaultSeverity: "info",
		canFix: false,
	},
	{
		name: "effect-stream-memory",
		description:
			"Detects non-streaming operations in stream patterns that load " +
			"entire content into memory",
		defaultSeverity: "error",
		canFix: false,
	},
	{
		name: "effect-error-model",
		description:
			"Consider using typed errors (Data.TaggedError) instead of " +
			"generic Error",
		defaultSeverity: "info",
		canFix: false,
	},
];
