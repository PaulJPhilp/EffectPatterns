/**
 * Skills Commands
 *
 * Commands for validating, previewing, and analyzing Claude Skills
 */

import { Args, Command } from "@effect/cli";
import { Console, Effect } from "effect";
import { Display } from "../services/display/index.js";
import { Logger } from "../services/logger/index.js";
import { ValidationFailedError } from "../errors.js";
import * as SkillsAPI from "../services/skills/api.js";
import { colorize } from "../utils.js";

/**
 * skills:list - List all available skills
 */
export const skillsListCommand = Command.make("list").pipe(
  Command.withDescription("List all available Claude Skills"),
  Command.withHandler(() =>
    Effect.gen(function* () {
      yield* Console.log(colorize("\n📚 Claude Skills\n", "BRIGHT"));

      const skills = yield* SkillsAPI.listAll();

      if (skills.length === 0) {
        yield* Console.log(colorize("No skills found.\n", "YELLOW"));
        return;
      }

      yield* Console.log(colorize(`Found ${skills.length} skills:\n`, "CYAN"));

      for (const skill of skills) {
        const levels = skill.skillLevels.join(", ");
        yield* Console.log(
          `  ${colorize(skill.category, "BRIGHT")} (${skill.patternCount} patterns)`
        );
        yield* Console.log(`    Levels: ${levels}`);
      }

      yield* Console.log("");
    })
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
    })
  )
);

/**
 * skills:validate - Validate skills structure
 */
export const skillsValidateCommand = Command.make("validate").pipe(
  Command.withDescription("Validate all skills for structural issues"),
  Command.withHandler(() =>
    Effect.gen(function* () {
      yield* Console.log(colorize("\n🔍 Validating skills...\n", "BRIGHT"));

      const errors = yield* SkillsAPI.validateAll();

      if (errors.length === 0) {
        yield* Display.showSuccess("✓ All skills are valid!");
        return;
      }

      yield* Console.error(
        colorize(`\n❌ Found ${errors.length} validation errors:\n`, "RED")
      );

      for (const error of errors) {
        yield* Console.error(
          `  ${colorize(error.category, "BRIGHT")}: ${error.error}`
        );
        yield* Console.error(colorize(`    ${error.filePath}`, "DIM"));
      }

      yield* Console.error("");
      return yield* Effect.fail(new ValidationFailedError({
        message: "Validation failed",
        errorCount: errors.length,
      }));
    })
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

      yield* Console.log(colorize("\n📊 Skills Statistics\n", "BRIGHT"));
      yield* Console.log("═".repeat(60));
      yield* Console.log("");

      yield* Console.log(
        `Total Skills:    ${colorize(String(stats.totalSkills), "CYAN")}`
      );
      yield* Console.log(
        `Total Patterns:  ${colorize(String(stats.totalPatterns), "CYAN")}`
      );
      yield* Console.log("");

      yield* Console.log(colorize("Skills by Level:", "BRIGHT"));
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

      yield* Console.log(colorize("Top Categories:", "BRIGHT"));
      const topCategories = [...stats.categoryCoverage]
        .sort((a, b) => b.patterns - a.patterns)
        .slice(0, 10);

      for (const cat of topCategories) {
        yield* Console.log(
          `  ${cat.category.padEnd(40)} ${colorize(String(cat.patterns), "CYAN")} patterns`
        );
      }

      yield* Console.log("");
      yield* Console.log("═".repeat(60));
      yield* Console.log("");
    })
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
