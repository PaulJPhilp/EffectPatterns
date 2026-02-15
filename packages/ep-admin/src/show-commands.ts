/**
 * Show commands for inspecting database contents.
 *
 * Displays summary information about what's stored in the database:
 * - all: Show patterns, skills, and application patterns
 * - patterns: Show effect patterns
 * - skills: Show skills
 */

import {
	ApplicationPatternRepositoryService,
	createSkillRepository,
	DatabaseService,
	DatabaseLayer,
	EffectPatternRepositoryService,
} from "@effect-patterns/toolkit";
import { Command } from "@effect/cli";
import { Console, Effect } from "effect";
import { emitJson } from "./cli/output.js";
import { configureLoggerFromOptions, globalOptions } from "./global-options.js";
import { Display } from "./services/display/index.js";

type CategoryCount = {
	readonly category: string;
	readonly count: number;
};

type PatternSummary = {
	readonly total: number;
	readonly bySkillLevel: {
		readonly beginner: number;
		readonly intermediate: number;
		readonly advanced: number;
	};
	readonly categories: ReadonlyArray<CategoryCount>;
};

type SkillSummary = {
	readonly total: number;
	readonly validated: number;
	readonly totalPatternLinks: number;
	readonly maxVersion: number | null;
	readonly categories: ReadonlyArray<CategoryCount>;
};

type ApplicationPatternSummary = {
	readonly total: number;
	readonly items: ReadonlyArray<{
		readonly learningOrder: number;
		readonly name: string;
		readonly slug: string;
		readonly validated: boolean;
	}>;
};

const toSortedCategoryCounts = (entries: Map<string, number>): ReadonlyArray<CategoryCount> =>
	[...entries.entries()]
		.sort((a, b) => b[1] - a[1])
		.map(([category, count]) => ({ category, count }));

const fetchPatternSummary = Effect.gen(function* () {
	const patternRepo = yield* EffectPatternRepositoryService;

	const patterns = yield* Effect.tryPromise({
		try: () => patternRepo.findAll(),
		catch: (error) => new Error(`Failed to query patterns: ${error}`),
	});

	const counts = yield* Effect.tryPromise({
		try: () => patternRepo.countBySkillLevel(),
		catch: (error) => new Error(`Failed to count patterns: ${error}`),
	});

	const categories = new Map<string, number>();
	for (const pattern of patterns) {
		const category = pattern.category ?? "(none)";
		categories.set(category, (categories.get(category) ?? 0) + 1);
	}

	return {
		total: patterns.length,
		bySkillLevel: {
			beginner: counts.beginner,
			intermediate: counts.intermediate,
			advanced: counts.advanced,
		},
		categories: toSortedCategoryCounts(categories),
	} satisfies PatternSummary;
});

const fetchSkillSummary = Effect.gen(function* () {
	const dbService = yield* DatabaseService;
	const skillRepo = createSkillRepository(dbService.db);

	const skills = yield* Effect.tryPromise({
		try: () => skillRepo.findAll(),
		catch: (error) => new Error(`Failed to query skills: ${error}`),
	});

	const validated = skills.filter((skill) => skill.validated).length;
	const totalPatternLinks = skills.reduce((sum, skill) => sum + skill.patternCount, 0);
	const maxVersion =
		skills.length > 0 ? Math.max(...skills.map((skill) => skill.version)) : null;

	const categories = new Map<string, number>();
	for (const skill of skills) {
		const category = skill.category ?? "(none)";
		categories.set(category, (categories.get(category) ?? 0) + 1);
	}

	return {
		total: skills.length,
		validated,
		totalPatternLinks,
		maxVersion,
		categories: toSortedCategoryCounts(categories),
	} satisfies SkillSummary;
});

const fetchApplicationPatternSummary = Effect.gen(function* () {
	const appPatternRepo = yield* ApplicationPatternRepositoryService;
	const appPatterns = yield* Effect.tryPromise({
		try: () => appPatternRepo.findAll(),
		catch: (error) => new Error(`Failed to query application patterns: ${error}`),
	});

	return {
		total: appPatterns.length,
		items: appPatterns.map((pattern) => ({
			learningOrder: pattern.learningOrder,
			name: pattern.name,
			slug: pattern.slug,
			validated: pattern.validated,
		})),
	} satisfies ApplicationPatternSummary;
});

const renderPatternSummary = (summary: PatternSummary) =>
	Effect.gen(function* () {
		yield* Console.log(`\n  Effect Patterns: ${summary.total}`);
		yield* Console.log(
			`    Beginner: ${summary.bySkillLevel.beginner}  Intermediate: ${summary.bySkillLevel.intermediate}  Advanced: ${summary.bySkillLevel.advanced}`
		);
		if (summary.categories.length > 0) {
			yield* Console.log(`    Categories: ${summary.categories.length}`);
			for (const entry of summary.categories) {
				yield* Console.log(`      ${entry.category}: ${entry.count}`);
			}
		}
	});

const renderSkillSummary = (summary: SkillSummary) =>
	Effect.gen(function* () {
		yield* Console.log(`\n  Skills: ${summary.total}`);

		if (summary.total === 0) {
			yield* Console.log("    (none - run scripts/load-skills.ts to populate)");
			return;
		}

		yield* Console.log(`    Validated: ${summary.validated}/${summary.total}`);
		yield* Console.log(`    Total pattern links: ${summary.totalPatternLinks}`);
		if (summary.maxVersion !== null && summary.maxVersion > 1) {
			yield* Console.log(`    Max version: ${summary.maxVersion}`);
		}

		yield* Console.log(`    Categories: ${summary.categories.length}`);
		for (const entry of summary.categories) {
			yield* Console.log(`      ${entry.category}: ${entry.count}`);
		}
	});

const renderApplicationPatternSummary = (summary: ApplicationPatternSummary) =>
	Effect.gen(function* () {
		yield* Console.log(`\n  Application Patterns: ${summary.total}`);
		for (const item of summary.items) {
			const validated = item.validated ? " [validated]" : "";
			yield* Console.log(
				`    ${item.learningOrder}. ${item.name} (${item.slug})${validated}`
			);
		}
	});

const withDatabaseErrorHandling = <A>(
	effect: Effect.Effect<A, Error, any>,
	jsonMode: boolean
) =>
	effect.pipe(
		Effect.provide(DatabaseLayer),
		Effect.catchAll((error) =>
			Effect.gen(function* () {
				const message = `Database error: ${error.message}`;
				if (jsonMode) {
					yield* Console.error(message);
				} else {
					yield* Display.showError(message);
				}
				return yield* Effect.fail(error);
			})
		)
	);

const showPatternsCommand = Command.make("patterns", {
	options: {
		...globalOptions,
	},
})
	.pipe(Command.withDescription("Show effect patterns stored in the database"))
	.pipe(
		Command.withHandler(({ options }) =>
			Effect.gen(function* () {
				yield* configureLoggerFromOptions(options);

				const summary = yield* withDatabaseErrorHandling(
					Effect.scoped(fetchPatternSummary),
					options.json
				);

				if (options.json) {
					yield* emitJson({
						ok: true,
						patterns: summary,
					});
					return;
				}

				yield* Display.showInfo("Querying database for patterns...");
				yield* renderPatternSummary(summary);
				yield* Display.showInfo("Next: ep-admin pattern search <query>");
			})
		)
	);

const showSkillsCommand = Command.make("skills", {
	options: {
		...globalOptions,
	},
})
	.pipe(Command.withDescription("Show skills stored in the database"))
	.pipe(
		Command.withHandler(({ options }) =>
			Effect.gen(function* () {
				yield* configureLoggerFromOptions(options);

				const summary = yield* withDatabaseErrorHandling(
					Effect.scoped(fetchSkillSummary),
					options.json
				);

				if (options.json) {
					yield* emitJson({
						ok: true,
						skills: summary,
					});
					return;
				}

				yield* Display.showInfo("Querying database for skills...");
				yield* renderSkillSummary(summary);
				yield* Display.showInfo("Next: ep-admin pattern skills generate-from-db --dry-run");
			})
		)
	);

const showAllCommand = Command.make("all", {
	options: {
		...globalOptions,
	},
})
	.pipe(Command.withDescription("Show all data stored in the database"))
	.pipe(
		Command.withHandler(({ options }) =>
			Effect.gen(function* () {
				yield* configureLoggerFromOptions(options);

				const data = yield* withDatabaseErrorHandling(
					Effect.scoped(
						Effect.gen(function* () {
							const applicationPatterns = yield* fetchApplicationPatternSummary;
							const patterns = yield* fetchPatternSummary;
							const skills = yield* fetchSkillSummary;

							return {
								applicationPatterns,
								patterns,
								skills,
							};
						})
					),
					options.json
				);

				if (options.json) {
					yield* emitJson({
						ok: true,
						...data,
						totals: {
							applicationPatterns: data.applicationPatterns.total,
							patterns: data.patterns.total,
							skills: data.skills.total,
						},
					});
					return;
				}

				yield* Display.showInfo("Querying database...");
				yield* renderApplicationPatternSummary(data.applicationPatterns);
				yield* renderPatternSummary(data.patterns);
				yield* renderSkillSummary(data.skills);
				yield* Display.showText(
					`\n  Total: ${data.applicationPatterns.total} application patterns, ${data.patterns.total} effect patterns, ${data.skills.total} skills`
				);
				yield* Display.showInfo("Next: ep-admin db test-quick");
			})
		)
	);

export const showCommand = Command.make("show").pipe(
	Command.withDescription("Show what data is stored in the database"),
	Command.withSubcommands([showAllCommand, showPatternsCommand, showSkillsCommand])
);
