/**
 * Utility commands for ep-admin
 *
 * Data management utilities:
 * - add-seqid: Add sequential IDs to Discord QnA messages
 * - renumber-seqid: Renumber sequential IDs
 *
 * NOTE: These commands provide native JSON manipulation.
 */

import { Command, Options } from "@effect/cli";
import { Effect } from "effect";
import { configureLoggerFromOptions, globalOptions } from "./global-options.js";
import { Display } from "./services/display/index.js";
import { EnhancedFileSystem } from "./services/filesystem/index.js";
import { ValidationService, runValidations } from "./services/validation/index.js";
import { FileNotFoundError, FileOperationError } from "./errors.js";

/**
 * utils:add-seqid - Add sequential IDs to messages
 */
export const utilsAddSeqIdCommand = Command.make("add-seqid", {
	options: {
		...globalOptions,
		file: Options.text("file").pipe(
			Options.withDescription("Path to JSON file"),
			Options.withDefault("content/discord/beginner-questions.json")
		),
		start: Options.integer("start").pipe(
			Options.withDescription("Start numbering at N"),
			Options.withDefault(1)
		),
		backup: Options.boolean("backup").pipe(
			Options.withDescription("Create backup before writing"),
			Options.withDefault(false)
		),
		dryRun: Options.boolean("dry-run").pipe(
			Options.withDescription("Print output without writing"),
			Options.withDefault(false)
		),
		keep: Options.text("keep").pipe(
			Options.withDescription("When deduping by id, keep first or last"),
			Options.withDefault("first")
		),
	},
}).pipe(
	Command.withDescription(
		"Add sequential seqId fields to messages that don't have them"
	),
	Command.withHandler(({ options }) =>
		Effect.gen(function* () {
			yield* configureLoggerFromOptions(options);

			// Pre-validate arguments before processing
			const validator = yield* ValidationService;
			const validationResult = yield* runValidations([
				validator.validateFilePath(options.file, "file"),
				validator.validateFileExists(options.file, "file"),
				validator.validateNumberRange(options.start, 1, 999999, "start"),
			]);

			// If validation failed, show errors and stop
			if (!validationResult.isValid) {
				yield* Display.showError(
					`Validation failed - ${validationResult.errors.length} error(s):`
				);
				for (const error of validationResult.errors) {
					if ("formattedMessage" in error) {
						yield* Display.showText(`  • ${error.formattedMessage}`);
					} else {
						yield* Display.showText(`  • ${String(error)}`);
					}
				}
				return yield* Effect.fail(new Error("Validation failed"));
			}

			yield* Display.showInfo(`Adding sequential IDs to ${options.file}...`);

			const efs = yield* EnhancedFileSystem;

			// Read file with error handling
			const content = yield* efs
				.readFile(options.file, "add-seqid")
				.pipe(
					Effect.catchAll((error) =>
						Effect.gen(function* () {
							if (error instanceof FileNotFoundError) {
								yield* Display.showError(error.formattedMessage);
							} else if (error instanceof FileOperationError) {
								yield* Display.showError(error.formattedMessage);
								if (typeof error.cause === "string") {
									yield* Display.showText(`  💡 ${error.cause}`);
								}
							}
							return yield* Effect.fail(error);
						})
					)
				);

			// Parse JSON with validation
			let data: Array<{ seqId?: number }>;
			try {
				data = JSON.parse(content) as Array<{ seqId?: number }>;
			} catch (parseError) {
				yield* Display.showError(
					`Invalid JSON in ${options.file}`
				);
				yield* Display.showText(
					`  Error: ${parseError instanceof Error ? parseError.message : String(parseError)}`
				);
				return yield* Effect.fail(
					new Error(`JSON parse error in ${options.file}`)
				);
			}

			if (!Array.isArray(data)) {
				yield* Display.showError("File must contain a JSON array");
				return yield* Effect.fail(new Error("Invalid format"));
			}

			// Add seqId to items that don't have one
			let nextId = options.start;
			let added = 0;
			for (const item of data) {
				if (item.seqId === undefined) {
					item.seqId = nextId++;
					added++;
				}
			}

			yield* Display.showInfo(`Added seqId to ${added} items`);

			if (options.dryRun) {
				yield* Display.showInfo("Dry run - no changes written");
			} else {
				if (options.backup) {
					yield* efs
						.writeFile(`${options.file}.bak`, content, "backup")
						.pipe(
							Effect.catchAll((error) =>
								Effect.gen(function* () {
									if (error instanceof FileOperationError) {
										yield* Display.showWarning(
											`Could not create backup: ${error.formattedMessage}`
										);
										if (typeof error.cause === "string") {
											yield* Display.showText(`  ${error.cause}`);
										}
									}
									return yield* Effect.succeed(undefined);
								})
							)
						);

					yield* Display.showInfo("Backup created");
				}

				yield* efs
					.writeFile(options.file, JSON.stringify(data, null, 2), "add-seqid")
					.pipe(
						Effect.catchAll((error) =>
							Effect.gen(function* () {
								if (error instanceof FileOperationError) {
									yield* Display.showError(error.formattedMessage);
									if (typeof error.cause === "string") {
										yield* Display.showText(`  💡 ${error.cause}`);
									}
								}
								return yield* Effect.fail(error);
							})
						)
					);
			}

			yield* Display.showSuccess("Sequential IDs added!");
		})
	)
);

/**
 * utils:renumber-seqid - Renumber sequential IDs
 */
export const utilsRenumberSeqIdCommand = Command.make("renumber-seqid", {
	options: {
		...globalOptions,
		file: Options.text("file").pipe(
			Options.withDescription("Path to JSON file"),
			Options.withDefault("content/discord/beginner-questions.json")
		),
	},
}).pipe(
	Command.withDescription(
		"Renumber all seqId fields sequentially from 1"
	),
	Command.withHandler(({ options }) =>
		Effect.gen(function* () {
			yield* configureLoggerFromOptions(options);

			// Pre-validate arguments before processing
			const validator = yield* ValidationService;
			const validationResult = yield* runValidations([
				validator.validateFilePath(options.file, "file"),
				validator.validateFileExists(options.file, "file"),
			]);

			// If validation failed, show errors and stop
			if (!validationResult.isValid) {
				yield* Display.showError(
					`Validation failed - ${validationResult.errors.length} error(s):`
				);
				for (const error of validationResult.errors) {
					if ("formattedMessage" in error) {
						yield* Display.showText(`  • ${error.formattedMessage}`);
					} else {
						yield* Display.showText(`  • ${String(error)}`);
					}
				}
				return yield* Effect.fail(new Error("Validation failed"));
			}

			yield* Display.showInfo(`Renumbering seqIds in ${options.file}...`);

			const efs = yield* EnhancedFileSystem;

			// Read file with error handling
			const content = yield* efs
				.readFile(options.file, "renumber-seqid")
				.pipe(
					Effect.catchAll((error) =>
						Effect.gen(function* () {
							if (error instanceof FileNotFoundError) {
								yield* Display.showError(error.formattedMessage);
							} else if (error instanceof FileOperationError) {
								yield* Display.showError(error.formattedMessage);
								if (typeof error.cause === "string") {
									yield* Display.showText(`  💡 ${error.cause}`);
								}
							}
							return yield* Effect.fail(error);
						})
					)
				);

			// Parse JSON with validation
			let data: Array<{ seqId?: number }>;
			try {
				data = JSON.parse(content) as Array<{ seqId?: number }>;
			} catch (parseError) {
				yield* Display.showError(
					`Invalid JSON in ${options.file}`
				);
				yield* Display.showText(
					`  Error: ${parseError instanceof Error ? parseError.message : String(parseError)}`
				);
				return yield* Effect.fail(
					new Error(`JSON parse error in ${options.file}`)
				);
			}

			if (!Array.isArray(data)) {
				yield* Display.showError("File must contain a JSON array");
				return yield* Effect.fail(new Error("Invalid format"));
			}

			// Renumber all seqIds from 1
			let seqId = 1;
			for (const item of data) {
				item.seqId = seqId++;
			}

			yield* efs
				.writeFile(options.file, JSON.stringify(data, null, 2), "renumber-seqid")
				.pipe(
					Effect.catchAll((error) =>
						Effect.gen(function* () {
							if (error instanceof FileOperationError) {
								yield* Display.showError(error.formattedMessage);
								if (typeof error.cause === "string") {
									yield* Display.showText(`  💡 ${error.cause}`);
								}
							}
							return yield* Effect.fail(error);
						})
					)
				);

			yield* Display.showInfo(`Renumbered ${data.length} items`);
			yield* Display.showSuccess("Sequential IDs renumbered!");
		})
	)
);

/**
 * Compose all utility commands into a single command group
 */
export const utilsCommand = Command.make("utils").pipe(
	Command.withDescription("Data management utilities"),
	Command.withSubcommands([
		utilsAddSeqIdCommand,
		utilsRenumberSeqIdCommand,
	])
);
