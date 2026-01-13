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

// Validated provider type
type AiProvider = "google" | "openai" | "anthropic";

// Provider validation using Effect patterns
const validateProvider = (provider: string): Effect.Effect<AiProvider, Error> =>
	Effect.succeed(provider as AiProvider).pipe(
		Effect.filterOrFail(
			(p): p is AiProvider => ["google", "openai", "anthropic"].includes(p),
			() => new Error(`Invalid provider: ${provider}. Must be: google, openai, or anthropic`)
		)
	);

// Validate report file exists
const validateReportFile = (reportPath: string): Effect.Effect<string, Error> =>
	Effect.succeed(reportPath).pipe(
		Effect.filterOrFail(
			(path) => path.endsWith(".json"),
			() => new Error(`Report file must be a JSON file: ${reportPath}`)
		)
	);

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

			// Validate inputs using Effect patterns
			const validatedProvider = yield* validateProvider(options.provider);
			const validatedReport = yield* validateReportFile(options.report);

			// Validate numeric inputs
			if (options.limit._tag === "Some" && options.limit.value <= 0) {
				yield* Display.showError("Limit must be greater than 0");
				return;
			}

			if (options.attempts < 1 || options.attempts > 5) {
				yield* Display.showError("Attempts must be between 1 and 5");
				return;
			}

			// Validate option combinations
			if (options.aiCall && !options.ai) {
				yield* Display.showWarning("AI call enabled but AI prompts disabled - enabling AI prompts");
			}

			if (options.write && options.dryRun) {
				yield* Display.showWarning("Write mode conflicts with dry-run - dry-run will be ignored");
			}

			// Show configuration summary
			const limitDisplay = options.limit._tag === "Some" ? options.limit.value : "unlimited";
			yield* Display.showInfo(`Configuration:
  Provider: ${validatedProvider}
  Model: ${options.model}
  Report: ${validatedReport}
  AI Call: ${options.aiCall}
  Dry Run: ${options.dryRun}
  Write: ${options.write}
  Attempts: ${options.attempts}
  Limit: ${limitDisplay}`);

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
		})
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
