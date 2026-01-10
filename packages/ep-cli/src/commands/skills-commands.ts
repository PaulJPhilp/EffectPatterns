/**
 * Skills Commands
 *
 * Commands for validating, previewing, and analyzing Claude Skills
 */

import { Args, Command } from "@effect/cli";
import { Console, Effect } from "effect";
import { Display } from "../services/display/index.js";
import { Logger } from "../services/logger/index.js";
import * as SkillsAPI from "../services/skills/api.js";
import { colorize } from "../utils/string.js";

/**
 * skills:list - List all available skills
 */
export const skillsListCommand = Command.make("list").pipe(
	Command.withDescription("List all available Claude Skills"),
	Command.withHandler(() =>
		Effect.gen(function* () {
			yield* Console.log(colorize("\n📚 Claude Skills\n", "bright"));

			const skills = yield* SkillsAPI.listAll();

			if (skills.length === 0) {
				yield* Console.log(colorize("No skills found.\n", "yellow"));
				return;
			}

			yield* Console.log(colorize(`Found ${skills.length} skills:\n`, "cyan"));

			for (const skill of skills) {
				const levels = skill.skillLevels.join(", ");
				yield* Console.log(
					`  ${colorize(skill.category, "bright")} (${skill.patternCount} patterns)`
				);
				yield* Console.log(`    Levels: ${levels}`);
			}

			yield* Console.log("");
		}).pipe(
			Effect.catchAll((error) =>
				Effect.gen(function* () {
					yield* Console.error(colorize(`\n❌ Error: ${error}\n`, "red"));
					return yield* Effect.fail(error);
				})
			)
		)
	)
);

/**
 * skills:preview - Preview a skill's content
 */
export const skillsPreviewCommand = Command.make("preview", {
	args: {
		category: Args.text({ name: "category" }).pipe(
			Args.withDescription("Skill category to preview")
		),
	},
}).pipe(
	Command.withDescription("Preview a skill's content"),
	Command.withHandler(({ args }) =>
		Effect.gen(function* () {
			const skill = yield* SkillsAPI.getByCategory(args.category);

			yield* Display.showPanel(
				skill.content,
				`Skill: ${skill.metadata.title}`,
				{ type: "info" }
			);
		}).pipe(
			Effect.catchAll((error) =>
				Effect.gen(function* () {
					yield* Console.error(
						colorize(`\n❌ Skill not found: ${args.category}\n`, "red")
					);
					yield* Console.error(
						colorize("Run 'ep skills list' to see available skills.\n", "dim")
					);
					return yield* Effect.fail(error);
				})
			)
		)
	)
);

/**
 * skills:validate - Validate skills structure
 */
export const skillsValidateCommand = Command.make("validate").pipe(
	Command.withDescription("Validate all skills for structural issues"),
	Command.withHandler(() =>
		Effect.gen(function* () {
			yield* Console.log(colorize("\n🔍 Validating skills...\n", "bright"));

			const errors = yield* SkillsAPI.validateAll();

			if (errors.length === 0) {
				yield* Display.showSuccess("✓ All skills are valid!");
				return;
			}

			yield* Console.error(
				colorize(`\n❌ Found ${errors.length} validation errors:\n`, "red")
			);

			for (const error of errors) {
				yield* Console.error(
					`  ${colorize(error.category, "bright")}: ${error.error}`
				);
				yield* Console.error(colorize(`    ${error.filePath}`, "dim"));
			}

			yield* Console.error("");
			return yield* Effect.fail(new Error("Validation failed"));
		}).pipe(
			Effect.catchAll((error: unknown) =>
				Effect.gen(function* () {
					const err = error as Error;
					if (err.message !== "Validation failed") {
						yield* Console.error(colorize(`\n❌ Error: ${err}\n`, "red"));
					}
					return yield* Effect.fail(error);
				})
			)
		)
	)
);

/**
 * skills:stats - Show statistics about skills
 */
export const skillsStatsCommand = Command.make("stats").pipe(
	Command.withDescription("Show statistics about Claude Skills"),
	Command.withHandler(() =>
		Effect.gen(function* () {
			const logger = yield* Logger;
			yield* logger.debug("Fetching skills statistics...");

			const stats = yield* SkillsAPI.getStats();

			yield* Console.log(colorize("\n📊 Skills Statistics\n", "bright"));
			yield* Console.log("═".repeat(60));
			yield* Console.log("");

			yield* Console.log(
				`Total Skills:    ${colorize(String(stats.totalSkills), "cyan")}`
			);
			yield* Console.log(
				`Total Patterns:  ${colorize(String(stats.totalPatterns), "cyan")}`
			);
			yield* Console.log("");

			yield* Console.log(colorize("Skills by Level:", "bright"));
			yield* Console.log(
				`  Beginner:      ${stats.skillsByLevel.beginner}`
			);
			yield* Console.log(
				`  Intermediate:  ${stats.skillsByLevel.intermediate}`
			);
			yield* Console.log(
				`  Advanced:      ${stats.skillsByLevel.advanced}`
			);
			yield* Console.log("");

			yield* Console.log(colorize("Top Categories:", "bright"));
			const topCategories = [...stats.categoryCoverage]
				.sort((a, b) => b.patterns - a.patterns)
				.slice(0, 10);

			for (const cat of topCategories) {
				yield* Console.log(
					`  ${cat.category.padEnd(40)} ${colorize(String(cat.patterns), "cyan")} patterns`
				);
			}

			yield* Console.log("");
			yield* Console.log("═".repeat(60));
			yield* Console.log("");
		}).pipe(
			Effect.catchAll((error) =>
				Effect.gen(function* () {
					yield* Console.error(colorize(`\n❌ Error: ${error}\n`, "red"));
					return yield* Effect.fail(error);
				})
			)
		)
	)
);

/**
 * skills - Main skills command
 */
export const skillsCommand = Command.make("skills").pipe(
	Command.withDescription("Manage and validate Claude Skills"),
	Command.withSubcommands([
		skillsListCommand,
		skillsPreviewCommand,
		skillsValidateCommand,
		skillsStatsCommand,
	])
);
