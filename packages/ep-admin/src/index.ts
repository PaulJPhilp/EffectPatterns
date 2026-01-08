#!/usr/bin/env bun

/**
 * ep-admin CLI - Administrative CLI for Effect Patterns maintainers
 * 
 * Built with @effect/cli for type-safe, composable command-line interfaces.
 */

import { StateStore } from "@effect-patterns/pipeline-state";
import { Args, Command } from "@effect/cli";
import { FetchHttpClient } from "@effect/platform";
import { NodeContext, NodeFileSystem, NodeRuntime } from "@effect/platform-node";
import { Console, Effect, Layer } from "effect";

// Import command modules
import { autofixCommand } from "./autofix-commands.js";
import { generateCommand, pipelineCommand, testCommand, validateCommand } from "./basic-commands.js";
import { EP_ADMIN_COMMANDS, generateCompletion, getInstallInstructions, installCompletion, type Shell } from "./completions.js";
import { dbCommand } from "./db-commands.js";
import { discordCommand } from "./discord-commands.js";
import { ingestCommand } from "./ingest-commands.js";
import { installCommand, rulesCommand } from "./install-commands.js";
import { lockCommand, unlockCommand } from "./lock-commands.js";
import { migrateCommand } from "./migrate-commands.js";
import { opsCommand } from "./ops-commands.js";
import { pipelineManagementCommand } from "./pipeline-commands.js";
import { publishCommand } from "./publish-commands.js";
import { qaCommand } from "./qa-commands.js";
import { patternNewCommand, releaseCommand } from "./release-commands.js";
import { searchCommand } from "./search-commands.js";
import { Logger } from "./services/logger.js";
import { skillsCommand } from "./skills-commands.js";
import { testUtilsCommand } from "./test-utils-commands.js";
import { utilsCommand } from "./utils-commands.js";

// --- COMPLETIONS COMMAND ---

const completionsGenerateCommand = Command.make(
	"generate",
	{
		shell: Args.text({ name: "shell" }).pipe(
			Args.withDescription("Shell type (bash, zsh, or fish)")
		),
	}
).pipe(
	Command.withDescription("Generate shell completion script"),
	Command.withHandler(({ shell }) =>
		Effect.gen(function* () {
			const shellType = shell.toLowerCase() as Shell;
			if (!["bash", "zsh", "fish"].includes(shellType)) {
				yield* Effect.fail(
					new Error(
						`Invalid shell: ${shell}. Must be one of: bash, zsh, fish`
					)
				);
			}

			const completion = generateCompletion(shellType, EP_ADMIN_COMMANDS);
			yield* Console.log(completion);
		})
	)
);

const completionsInstallCommand = Command.make(
	"install",
	{
		shell: Args.text({ name: "shell" }).pipe(
			Args.withDescription("Shell type (bash, zsh, or fish)")
		),
	}
).pipe(
	Command.withDescription("Install shell completions"),
	Command.withHandler(({ shell }) =>
		Effect.gen(function* () {
			const shellType = shell.toLowerCase() as Shell;
			if (!["bash", "zsh", "fish"].includes(shellType)) {
				yield* Effect.fail(
					new Error(
						`Invalid shell: ${shell}. Must be one of: bash, zsh, fish`
					)
				);
			}

			const filePath = yield* installCompletion(shellType, EP_ADMIN_COMMANDS);

			const instructions = getInstallInstructions(shellType, filePath);
			yield* Console.log(instructions);
		})
	)
);

const completionsCommand = Command.make("completions").pipe(
	Command.withDescription(
		"Generate or install shell completions for bash, zsh, or fish"
	),
	Command.withSubcommands([completionsGenerateCommand, completionsInstallCommand])
);

// --- COMMAND COMPOSITION ---

const adminSubcommands = [
	validateCommand,
	testCommand,
	pipelineCommand,
	generateCommand,
	publishCommand,
	ingestCommand,
	qaCommand,
	dbCommand,
	discordCommand,
	skillsCommand,
	migrateCommand,
	opsCommand,
	testUtilsCommand,
	utilsCommand,
	autofixCommand,
	rulesCommand,
	releaseCommand,
	pipelineManagementCommand,
	lockCommand,
	unlockCommand,
	completionsCommand,
	installCommand,
	patternNewCommand,
	searchCommand,
] as const;

export const adminRootCommand = Command.make("ep-admin").pipe(
	Command.withDescription("Administrative CLI for Effect Patterns maintainers"),
	Command.withSubcommands(adminSubcommands)
);

// --- RUNTIME SETUP ---

// Import TUI layer for ep-admin (optional - lazy loaded)
let EffectCLITUILayer: any = null;
try {
	const tuiModule = require("effect-cli-tui");
	EffectCLITUILayer = tuiModule.EffectCLITUILayer;
} catch {
	// TUI not available, will use standard runtime
}

export const fileSystemLayer = NodeFileSystem.layer.pipe(
	Layer.provide(NodeContext.layer)
);

// Standard runtime for ep-admin (includes Logger service)
// Note: Type assertion needed due to cross-package layer type inference issues
export const runtimeLayer = Layer.merge(
	Layer.merge(
		Layer.merge(fileSystemLayer, FetchHttpClient.layer),
		Logger.Default
	),
	StateStore.Default as unknown as Layer.Layer<StateStore>
);

// TUI-enabled runtime for ep-admin
export const runtimeLayerWithTUI = EffectCLITUILayer
	? Layer.merge(
		Layer.merge(
			Layer.merge(
				Layer.merge(fileSystemLayer, FetchHttpClient.layer),
				Logger.Default
			),
			StateStore.Default as unknown as Layer.Layer<StateStore>
		),
		EffectCLITUILayer
	)
	: runtimeLayer; // Fallback to standard runtime if TUI not available

const adminCliRunner = Command.run(adminRootCommand, {
	name: "EffectPatterns Admin CLI",
	version: "0.4.1",
});

export const createAdminProgram = (
	argv: ReadonlyArray<string> = process.argv
) => adminCliRunner(argv);

// Run CLI when executed directly
if (require.main === module) {
	const program = createAdminProgram(process.argv);
	const provided = Effect.provide(program, runtimeLayer) as Effect.Effect<void, unknown, never>;
	void NodeRuntime.runMain(provided);
}
