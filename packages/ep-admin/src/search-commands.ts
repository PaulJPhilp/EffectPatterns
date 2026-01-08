/**
 * Search commands for pattern discovery
 */

import {
	createDatabase,
	createEffectPatternRepository,
} from "@effect-patterns/toolkit";
import { Args, Command } from "@effect/cli";
import { Console, Effect } from "effect";
import { showError } from "./services/display.js";

/**
 * search <query> - Search patterns by keyword
 */
export const searchCommand = Command.make("search", {
	options: {},
	args: {
		query: Args.text({ name: "query" }),
	},
})
	.pipe(Command.withDescription("Search patterns by keyword"))
	.pipe(
		Command.withHandler(({ args }) =>
			Effect.gen(function* () {
				yield* Console.log(
					`\n🔍 Searching for patterns matching "${args.query}"...\n`
				);

				let db: ReturnType<typeof createDatabase> | null = null;
				try {
					db = createDatabase();
					const repo = createEffectPatternRepository(db.db);
					const dbPatterns = yield* Effect.tryPromise({
						try: () =>
							repo.search({
								query: args.query,
								limit: 10,
							}),
						catch: (error) => {
							const errorMessage =
								error instanceof Error ? error.message : String(error);

							const postgresError =
								error && typeof error === "object" ? (error as any) : null;
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
						yield* Console.log(
							`❌ No patterns found matching "${args.query}"\n`
						);
					} else {
						yield* Console.log(`✓ Found ${dbPatterns.length} pattern(s):\n`);
						for (const pattern of dbPatterns) {
							yield* Console.log(`  • ${pattern.title} (${pattern.slug})`);
						}
						yield* Console.log("");
					}
				} catch (error) {
					yield* showError(
						`Database error: ${error instanceof Error ? error.message : String(error)
						}`
					);
					yield* Console.log(
						"\n💡 Tip: Make sure PostgreSQL is running and DATABASE_URL " +
						"is set correctly.\n"
					);
				} finally {
					if (db) {
						yield* Effect.tryPromise({
							try: () => db!.close(),
							catch: (error) => {
								console.error("Failed to close database connection:", error);
								return undefined;
							},
						});
					}
				}
			})
		)
	);
