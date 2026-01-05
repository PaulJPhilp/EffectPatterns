/**
 * Autofix commands for ep-admin
 *
 * AI-powered autofix utilities:
 * - prepublish: Fix prepublish errors using AI
 */

import { Command, Options } from "@effect/cli";
import { Effect } from "effect";
import * as path from "node:path";
import { configureLoggerFromOptions, globalOptions } from "./global-options.js";
import { showInfo, showSuccess } from "./services/display.js";
import { executeScriptWithTUI } from "./services/execution.js";

const PROJECT_ROOT = process.cwd();

/**
 * autofix:prepublish - AI-powered prepublish error fixes
 */
export const autofixPrepublishCommand = Command.make("prepublish", {
	options: {
		...globalOptions,
		report: Options.text("report").pipe(
			Options.withDescription("Input JSON report from prepublish-check"),
			Options.withDefault("prepublish-report.json")
		),
		only: Options.optional(
			Options.text("only").pipe(
				Options.withDescription("Comma-separated TS error codes to fix (e.g., TS2339,TS2551)")
			)
		),
		limit: Options.optional(
			Options.integer("limit").pipe(
				Options.withDescription("Max files to process")
			)
		),
		dryRun: Options.boolean("dry-run").pipe(
			Options.withDescription("Show summary only, don't apply fixes"),
			Options.withDefault(true)
		),
		write: Options.boolean("write").pipe(
			Options.withDescription("Apply deterministic fixes"),
			Options.withDefault(false)
		),
		ai: Options.boolean("ai").pipe(
			Options.withDescription("Generate AI prompt packs for failing files"),
			Options.withDefault(false)
		),
		aiCall: Options.boolean("ai-call").pipe(
			Options.withDescription("Call AI provider to generate fixes"),
			Options.withDefault(false)
		),
		provider: Options.text("provider").pipe(
			Options.withDescription("AI provider (google, openai, anthropic)"),
			Options.withDefault("google")
		),
		model: Options.text("model").pipe(
			Options.withDescription("Model name"),
			Options.withDefault("gemini-2.5-flash")
		),
		attempts: Options.integer("attempts").pipe(
			Options.withDescription("Max attempts per file"),
			Options.withDefault(1)
		),
		styleGate: Options.boolean("style-gate").pipe(
			Options.withDescription("Enforce style (80 cols, Biome format+lint)"),
			Options.withDefault(false)
		),
	},
}).pipe(
	Command.withDescription(
		"AI-powered autofix for prepublish TypeScript errors"
	),
	Command.withHandler(({ options }) =>
		Effect.gen(function* () {
			yield* configureLoggerFromOptions(options);

			if (options.aiCall) {
				yield* showInfo("AI-powered fixes will be generated and applied");
			} else if (options.ai) {
				yield* showInfo("AI prompt packs will be generated (no API calls)");
			} else if (options.dryRun) {
				yield* showInfo("Dry-run mode: showing summary only");
			}

			yield* executeScriptWithTUI(
				path.join(PROJECT_ROOT, "scripts/autofix/prepublish-autofix.ts"),
				"Running prepublish autofix",
				{ verbose: options.verbose }
			);

			yield* showSuccess("Prepublish autofix completed!");
		}) as any
	)
);

/**
 * Compose all autofix commands into a single command group
 */
export const autofixCommand = Command.make("autofix").pipe(
	Command.withDescription("AI-powered autofix utilities"),
	Command.withSubcommands([
		autofixPrepublishCommand,
	])
);
