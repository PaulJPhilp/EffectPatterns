/**
 * Utility commands for ep-admin
 *
 * Data management utilities:
 * - add-seqid: Add sequential IDs to Discord QnA messages
 * - renumber-seqid: Renumber sequential IDs
 */

import { Command, Options } from "@effect/cli";
import { Effect } from "effect";
import * as path from "node:path";
import { SCRIPTS } from "./constants.js";
import { configureLoggerFromOptions, globalOptions } from "./global-options.js";
import { Display } from "./services/display/index.js";
import { Execution } from "./services/execution/index.js";

const PROJECT_ROOT = process.cwd();

/**
 * utils:add-seqid - Add sequential IDs to messages
 */
export const utilsAddSeqIdCommand = Command.make("add-seqid", {
	options: {
		...globalOptions,
		file: Options.text("file").pipe(
			Options.withDescription("Path to JSON file"),
			Options.withDefault("packages/data/discord-qna.json")
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

			const args = [
				options.file,
				`--start=${options.start}`,
				`--keep=${options.keep}`,
			];
			if (options.backup) args.push("--backup");
			if (options.dryRun) args.push("--dry-run");

			yield* Execution.executeScriptWithTUI(
				path.join(PROJECT_ROOT, SCRIPTS.UTILS.ADD_SEQID),
				"Adding sequential IDs",
				{ verbose: options.verbose }
			);

			yield* Display.showSuccess("Sequential IDs added!");
		}) as any
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
			Options.withDefault("packages/data/discord-qna.json")
		),
	},
}).pipe(
	Command.withDescription(
		"Renumber all seqId fields sequentially from 1"
	),
	Command.withHandler(({ options }) =>
		Effect.gen(function* () {
			yield* configureLoggerFromOptions(options);

			yield* Execution.executeScriptWithTUI(
				path.join(PROJECT_ROOT, SCRIPTS.UTILS.RENUMBER_SEQID),
				"Renumbering sequential IDs",
				{ verbose: options.verbose }
			);

			yield* Display.showSuccess("Sequential IDs renumbered!");
		}) as any
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
