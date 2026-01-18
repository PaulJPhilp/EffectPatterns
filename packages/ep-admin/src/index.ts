#!/usr/bin/env bun

/**
 * ep-admin CLI - Administrative CLI for Effect Patterns maintainers
 *
 * Built with @effect/cli for type-safe, composable command-line interfaces.
 */

import { Args, Command } from "@effect/cli";
import { Effect } from "effect";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { CLI, SHELL_TYPES } from "./constants.js";
import { Display } from "./services/display/index.js";

// Import command modules - Hierarchical organization
import {
	configGroup,
	dataGroup,
	dbGroup,
	devGroup,
	opsGroup,
	patternGroup,
	rootLevelCommands,
} from "./command-groups.js";
import {
	EP_ADMIN_COMMANDS,
	generateCompletion,
	getInstallInstructions,
	installCompletion,
	type Shell,
} from "./completions.js";
import { publishCommand } from "./publish-commands.js";

// --- COMPLETIONS COMMAND ---

const completionsGenerateCommand = Command.make("generate", {
	shell: Args.text({ name: "shell" }).pipe(
		Args.withDescription("Shell type (bash, zsh, or fish)"),
	),
}).pipe(
	Command.withDescription("Generate shell completion script"),
	Command.withHandler(({ shell }) =>
		Effect.gen(function* () {
			const shellType = shell.toLowerCase() as Shell;
			if (!SHELL_TYPES.includes(shellType as any)) {
				yield* Effect.fail(
					new Error(
						`Invalid shell: ${shell}. Must be one of: ${SHELL_TYPES.join(", ")}`,
					),
				);
			}

			const completion = generateCompletion(shellType, EP_ADMIN_COMMANDS);
			const display = yield* Display;
			yield* display.showText(completion);
		}),
	),
);

const completionsInstallCommand = Command.make("install", {
	shell: Args.text({ name: "shell" }).pipe(
		Args.withDescription("Shell type (bash, zsh, or fish)"),
	),
}).pipe(
	Command.withDescription("Install shell completions"),
	Command.withHandler(({ shell }) =>
		Effect.gen(function* () {
			const shellType = shell.toLowerCase() as Shell;
			if (!SHELL_TYPES.includes(shellType as any)) {
				yield* Effect.fail(
					new Error(
						`Invalid shell: ${shell}. Must be one of: ${SHELL_TYPES.join(", ")}`,
					),
				);
			}

			const filePath = yield* installCompletion(shellType, EP_ADMIN_COMMANDS);

			const instructions = getInstallInstructions(shellType, filePath);
			const display = yield* Display;
			yield* display.showText(instructions);
		}),
	),
);

const completionsCommand = Command.make("completions").pipe(
	Command.withDescription(
		"Generate or install shell completions for bash, zsh, or fish",
	),
	Command.withSubcommands([
		completionsGenerateCommand,
		completionsInstallCommand,
	]),
);

// --- COMMAND COMPOSITION ---

// Build system group with completions command
const systemGroup = Command.make("system").pipe(
	Command.withDescription("System utilities"),
	Command.withSubcommands([completionsCommand]),
);

// Hierarchical command structure (organized by domain/function)
const adminSubcommands = [
	publishCommand, // Pattern publishing workflow
	patternGroup, // Pattern discovery and management
	dataGroup, // Data ingestion and quality assurance
	dbGroup, // Database operations and migrations
	devGroup, // Development tools and utilities
	opsGroup, // Operations and infrastructure
	configGroup, // Configuration, setup, and entity management
	systemGroup, // System utilities (completions)
	...rootLevelCommands, // Root-level commands (release)
] as const;

export const adminRootCommand = Command.make(CLI.NAME).pipe(
	Command.withDescription(CLI.DESCRIPTION),
	Command.withSubcommands(adminSubcommands),
);

// --- RUNTIME SETUP ---

import { ProductionLayer } from "./runtime/production.js";

// Re-export for backward compatibility
export const runtimeLayer = ProductionLayer;

const adminCliRunner = Command.run(adminRootCommand, {
	name: CLI.RUNNER_NAME,
	version: CLI.VERSION,
});

export const createAdminProgram = (
	argv: ReadonlyArray<string> = process.argv,
) => adminCliRunner(argv);

/**
 * Run CLI when executed directly.
 *
 * ESM-compatible check that works with both direct execution and when imported.
 * Checks if the current module's file path matches the executed argv[1].
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Determine if this module is being run directly
const isDirectExecution = (() => {
	const executedFile = process.argv[1];
	if (!executedFile) return false;

	// Handle direct execution (bun run index.ts)
	if (executedFile === __filename) return true;

	// Handle execution through wrapper script (ep-admin binary)
	if (
		executedFile.endsWith("ep-admin") ||
		executedFile.endsWith("ep-admin.js")
	) {
		return true;
	}

	// Handle execution in development (bun dist/index.js)
	if (executedFile.includes("dist") && executedFile.includes("index.js")) {
		return true;
	}

	return false;
})();

if (isDirectExecution) {
	const program = createAdminProgram(process.argv);
	const provided = Effect.provide(program, ProductionLayer) as Effect.Effect<
		void,
		unknown,
		never
	>;
	void Effect.runPromise(provided);
}
