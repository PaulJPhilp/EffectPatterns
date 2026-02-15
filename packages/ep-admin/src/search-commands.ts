/**
 * Search commands for pattern discovery
 */

import {
	EffectPatternRepositoryLive,
	EffectPatternRepositoryService,
} from "@effect-patterns/toolkit";
import { Args, Command } from "@effect/cli";
import { Console, Effect } from "effect";
import { emitJson } from "./cli/output.js";
import { configureLoggerFromOptions, globalOptions } from "./global-options.js";
import { Display } from "./services/display/index.js";

/**
 * search <query> - Search patterns by keyword
 */
export const searchCommand = Command.make("search", {
	options: {
		...globalOptions,
	},
	args: {
		query: Args.text({ name: "query" }),
	},
})
	.pipe(Command.withDescription("Search patterns by keyword"))
	.pipe(
		Command.withHandler(({ args, options }) =>
			Effect.scoped(
				Effect.gen(function* () {
					yield* configureLoggerFromOptions(options);
					if (!options.json) {
						yield* Console.log(
							`\n🔍 Searching for patterns matching "${args.query}"...\n`
						);
					}

					const repo = yield* EffectPatternRepositoryService;
					const dbPatterns = yield* Effect.tryPromise({
						try: () =>
							repo.search({
								query: args.query,
								limit: 10,
							}),
						catch: (error) => {
							const errorMessage =
								error instanceof Error ? error.message : String(error);

							interface PostgresError {
								code?: string;
								message?: string;
								detail?: string;
								hint?: string;
							}

							const postgresError: PostgresError | null =
								error && typeof error === "object"
									? (error as PostgresError)
									: null;
							const pgCode = postgresError?.code;
							const pgMessage = postgresError?.message;
							const pgDetail = postgresError?.detail;
							const pgHint = postgresError?.hint;

							let details = "";
							if (pgCode) {
								details += `\nPostgreSQL Error Code: ${pgCode}`;
							}
							if (pgMessage && pgMessage !== errorMessage) {
								details += `\nPostgreSQL Message: ${pgMessage}`;
							}
							if (pgDetail) {
								details += `\nDetail: ${pgDetail}`;
							}
							if (pgHint) {
								details += `\nHint: ${pgHint}`;
							}
							if (!details && error instanceof Error && "cause" in error) {
								details = `\nCause: ${String(error.cause)}`;
							}

							return new Error(
								`Failed to search patterns: ${errorMessage}${details}`
							);
						},
					});

					if (dbPatterns.length === 0) {
						if (options.json) {
							yield* emitJson({ count: 0, patterns: [], query: args.query });
							return;
						}
						yield* Console.log(
							`❌ No patterns found matching "${args.query}"\n`
						);
						yield* Console.log("💡 Next: ep-admin pattern search <different-query>\n");
					} else {
						if (options.json) {
							yield* emitJson({
								count: dbPatterns.length,
								query: args.query,
								patterns: dbPatterns,
							});
							return;
						}
						yield* Console.log(
							`✓ Found ${dbPatterns.length} pattern(s):\n`
						);
						for (const pattern of dbPatterns) {
							yield* Console.log(
								`  • ${pattern.title} (${pattern.slug})`
							);
						}
						yield* Console.log("\n💡 Next: ep-admin pattern new\n");
					}
				})
			).pipe(
				Effect.provide(EffectPatternRepositoryLive),
				Effect.catchAll((error) =>
					Effect.gen(function* () {
						yield* Display.showError(
							`Database error: ${error instanceof Error ? error.message : String(error)}`
						);
						if (!options.json) {
							yield* Console.log(
								"\n💡 Tip: Make sure PostgreSQL is running and DATABASE_URL " +
									"is set correctly.\n"
							);
						}
						return yield* Effect.fail(error);
					})
				)
			)
		)
	);
