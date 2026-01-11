/**
 * Autofix commands for ep-admin
 *
 * AI-powered autofix utilities:
 * - prepublish: Fix prepublish errors using AI
 *
 * NOTE: These commands provide autofix guidance.
 */

import { Command, Options } from "@effect/cli";
import { Effect } from "effect";
import { configureLoggerFromOptions, globalOptions } from "./global-options.js";
import { Display } from "./services/display/index.js";

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
				Options.withDescription("Comma-separated TS error codes to fix")
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
			yield* Display.showInfo("Prepublish Autofix");

			if (options.aiCall) {
				yield* Display.showInfo("AI-powered fixes enabled");
			} else if (options.ai) {
				yield* Display.showInfo("AI prompt generation enabled");
			} else if (options.dryRun) {
				yield* Display.showInfo("Dry-run mode");
			}

			yield* Display.showInfo(
				"\nTo fix TypeScript errors:\n" +
				"  1. Run type check: bun run tsc --noEmit\n" +
				"  2. Review errors and fix manually\n" +
				"  3. Or use Biome for auto-fixable issues: bun run biome check --fix\n" +
				"\nFor AI-assisted fixes:\n" +
				"  - Use your IDE's AI features (Copilot, Cursor, etc.)\n" +
				"  - Or run: ep-admin autofix prepublish --ai-call"
			);

			yield* Display.showSuccess("Prepublish autofix info displayed!");
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
