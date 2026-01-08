/**
 * Basic administrative commands
 * 
 * validate, test, pipeline, generate
 */

import { Command, Options } from "@effect/cli";
import { Effect } from "effect";
import * as path from "node:path";
import { showSuccess } from "./services/display.js";
import { executeScriptWithTUI } from "./services/execution.js";
import { getProjectRoot } from "./utils.js";

const PROJECT_ROOT = getProjectRoot();

/**
 * admin:validate - Validates all pattern files
 */
export const validateCommand = Command.make("validate", {
	options: {
		verbose: Options.boolean("verbose").pipe(
			Options.withAlias("v"),
			Options.withDescription("Show detailed validation output"),
			Options.withDefault(false)
		),
	},
	args: {},
}).pipe(
	Command.withDescription(
		"Validates all pattern files for correctness and consistency."
	),
	Command.withHandler(
		({ options }) =>
			Effect.gen(function* () {
				yield* executeScriptWithTUI(
					path.join(PROJECT_ROOT, "scripts/publish/validate-improved.ts"),
					"Validating pattern files",
					{ verbose: options.verbose }
				);
				yield* showSuccess("All patterns are valid!");
			}) as any
	)
);

/**
 * admin:test - Runs all TypeScript example tests
 */
export const testCommand = Command.make("test", {
	options: {
		verbose: Options.boolean("verbose").pipe(
			Options.withAlias("v"),
			Options.withDescription("Show detailed test output"),
			Options.withDefault(false)
		),
	},
	args: {},
}).pipe(
	Command.withDescription(
		"Runs all TypeScript example tests to ensure patterns execute correctly."
	),
	Command.withHandler(({ options }) =>
		executeScriptWithTUI(
			path.join(PROJECT_ROOT, "scripts/publish/test-improved.ts"),
			"Running TypeScript example tests",
			{ verbose: options.verbose }
		)
	)
);

/**
 * admin:pipeline - Runs the full ingestion and publishing pipeline
 */
export const pipelineCommand = Command.make("pipeline", {
	options: {
		verbose: Options.boolean("verbose").pipe(
			Options.withAlias("v"),
			Options.withDescription("Show detailed output from each step"),
			Options.withDefault(false)
		),
	},
	args: {},
}).pipe(
	Command.withDescription(
		"Runs the complete pattern publishing pipeline from test to " +
		"rules generation."
	),
	Command.withHandler(
		({ options }) =>
			executeScriptWithTUI(
				path.join(PROJECT_ROOT, "scripts/publish/pipeline.ts"),
				"Publishing pipeline",
				{ verbose: options.verbose }
			).pipe(
				Effect.andThen(() =>
					showSuccess("Publishing pipeline completed successfully!")
				)
			) as any
	)
);

/**
 * admin:generate - Generates the main project README.md file
 */
export const generateCommand = Command.make("generate", {
	options: {
		verbose: Options.boolean("verbose").pipe(
			Options.withAlias("v"),
			Options.withDescription("Show detailed generation output"),
			Options.withDefault(false)
		),
	},
	args: {},
}).pipe(
	Command.withDescription(
		"Generates the main project README.md file from pattern metadata."
	),
	Command.withHandler(({ options }) =>
		executeScriptWithTUI(
			path.join(PROJECT_ROOT, "scripts/publish/generate.ts"),
			"Generating README.md",
			{ verbose: options.verbose }
		)
	)
);
