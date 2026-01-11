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
import { FileSystem } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";
import { Effect } from "effect";
import { configureLoggerFromOptions, globalOptions } from "./global-options.js";
import { Display } from "./services/display/index.js";

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
			yield* Display.showInfo(`Adding sequential IDs to ${options.file}...`);

			const fs = yield* FileSystem.FileSystem;
			const exists = yield* fs.exists(options.file);

			if (!exists) {
				yield* Display.showError(`File not found: ${options.file}`);
				return yield* Effect.fail(new Error("File not found"));
			}

			const content = yield* fs.readFileString(options.file);
			const data = JSON.parse(content) as Array<{ seqId?: number }>;

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
					yield* fs.writeFileString(
						`${options.file}.bak`,
						content
					);
					yield* Display.showInfo("Backup created");
				}
				yield* fs.writeFileString(
					options.file,
					JSON.stringify(data, null, 2)
				);
			}

			yield* Display.showSuccess("Sequential IDs added!");
		}).pipe(
			Effect.provide(NodeContext.layer)
		) as any
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
			yield* Display.showInfo(`Renumbering seqIds in ${options.file}...`);

			const fs = yield* FileSystem.FileSystem;
			const exists = yield* fs.exists(options.file);

			if (!exists) {
				yield* Display.showError(`File not found: ${options.file}`);
				return yield* Effect.fail(new Error("File not found"));
			}

			const content = yield* fs.readFileString(options.file);
			const data = JSON.parse(content) as Array<{ seqId?: number }>;

			if (!Array.isArray(data)) {
				yield* Display.showError("File must contain a JSON array");
				return yield* Effect.fail(new Error("Invalid format"));
			}

			// Renumber all seqIds from 1
			let seqId = 1;
			for (const item of data) {
				item.seqId = seqId++;
			}

			yield* fs.writeFileString(
				options.file,
				JSON.stringify(data, null, 2)
			);

			yield* Display.showInfo(`Renumbered ${data.length} items`);
			yield* Display.showSuccess("Sequential IDs renumbered!");
		}).pipe(
			Effect.provide(NodeContext.layer)
		) as any
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
