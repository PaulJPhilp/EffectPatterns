/**
 * Skills generation commands for ep-admin
 *
 * Orchestrates AI skills generation for different platforms:
 * - generate: Generate all skills
 * - generate-skills: Generate Claude skills
 * - skill-generator: Interactive skill generator
 * - generate-readme: Generate README by skill and use-case
 *
 * NOTE: Skills are generated from database patterns.
 */

import {
    createDatabase,
    createEffectPatternRepository,
} from "@effect-patterns/toolkit";
import { Command, Options } from "@effect/cli";
import { FileSystem } from "@effect/platform";
import { Effect, Option } from "effect";
import {
    MESSAGES,
} from "./constants.js";
import { configureLoggerFromOptions, globalOptions } from "./global-options.js";
import { Display } from "./services/display/index.js";

/**
 * skills:generate - Generate all skills
 */
export const skillsGenerateCommand = Command.make("generate", {
    options: {
        ...globalOptions,
        format: Options.choice("format", ["json", "markdown", "yaml"])
            .pipe(
                Options.withDescription("Output format"),
                Options.withDefault("json" as const)
            ),
        output: Options.text("output").pipe(
            Options.withDescription("Output file path"),
            Options.withDefault("content/published/skills/skills.json")
        ),
    },
})
    .pipe(
        Command.withDescription(
            "Generate AI skills from patterns for all platforms"
        ),
        Command.withHandler(({ options }) =>
            Effect.gen(function* () {
                yield* configureLoggerFromOptions(options);
                yield* Display.showInfo("Generating skills from database...");

                yield* Effect.acquireUseRelease(
                    Effect.succeed(createDatabase()),
                    ({ db }) => Effect.gen(function*() {
                        const repo = createEffectPatternRepository(db);
                        const patterns = yield* Effect.promise(() => repo.findAll());
                        yield* Display.showInfo(`Found ${patterns.length} patterns`);

                        // Group by skill level
                        const byLevel = {
                            beginner: patterns.filter(p => p.skillLevel === "beginner"),
                            intermediate: patterns.filter(p => p.skillLevel === "intermediate"),
                            advanced: patterns.filter(p => p.skillLevel === "advanced"),
                        };

                        const skills = patterns.map(p => ({
                            id: p.slug,
                            title: p.title,
                            skillLevel: p.skillLevel,
                            summary: p.summary,
                            tags: p.tags || [],
                        }));

                        const fs = yield* FileSystem.FileSystem;
                        yield* fs.makeDirectory("content/published/skills", { recursive: true });
                        yield* fs.writeFileString(options.output, JSON.stringify(skills, null, 2));

                        yield* Display.showInfo(`\nSkills by level:`)
                        yield* Display.showInfo(`  Beginner: ${byLevel.beginner.length}`);
                        yield* Display.showInfo(`  Intermediate: ${byLevel.intermediate.length}`);
                        yield* Display.showInfo(`  Advanced: ${byLevel.advanced.length}`);
                        yield* Display.showInfo(`\nOutput: ${options.output}`);
                    }),
                    ({ close }) => Effect.promise(() => close())
                );

                yield* Display.showSuccess(MESSAGES.SUCCESS.SKILLS_GENERATED);
            })
        )
    );

/**
 * skills:skill-generator - Interactive skill generator
 */
export const skillsSkillGeneratorCommand = Command.make("skill-generator", {
    options: {
        ...globalOptions,
    },
})
    .pipe(
        Command.withDescription(
            "Interactive generator for creating individual skills from patterns"
        ),
        Command.withHandler(({ options }) =>
            Effect.gen(function* () {
                yield* configureLoggerFromOptions(options);
                yield* Display.showInfo("Interactive Skill Generator");

                yield* Display.showInfo(
                    "\nTo generate skills interactively:\n" +
                    "  1. Use 'ep-admin skills generate' to generate all skills\n" +
                    "  2. Use 'ep-admin skills generate-readme' for README by skill level\n" +
                    "\nOr use the web interface at the Effect Patterns Hub."
                );

                yield* Display.showSuccess(MESSAGES.SUCCESS.SKILL_GENERATION_COMPLETED);
            })
        )
    );

/**
 * skills:generate-readme - Generate README by skill/usecase
 */
export const skillsGenerateReadmeCommand = Command.make("generate-readme", {
    options: {
        ...globalOptions,
        skillLevel: Options.optional(
            Options.text("skill-level").pipe(
                Options.withDescription("Filter by skill level (beginner, intermediate, advanced)")
            )
        ),
        useCase: Options.optional(
            Options.text("use-case").pipe(
                Options.withDescription("Filter by use case")
            )
        ),
    },
})
    .pipe(
        Command.withDescription(
            "Generate README organized by skill level and use case"
        ),
        Command.withHandler(({ options }) =>
            Effect.gen(function* () {
                yield* configureLoggerFromOptions(options);
                yield* Display.showInfo("Generating README by skill level...");

                yield* Effect.acquireUseRelease(
                    Effect.succeed(createDatabase()),
                    ({ db }) => Effect.gen(function*() {
                        const repo = createEffectPatternRepository(db);
                        let patterns = yield* Effect.promise(() => repo.findAll());

                        // Apply filters
                         const skillLevelFilter = Option.getOrUndefined(options.skillLevel);
                         if (skillLevelFilter) {
                             patterns = patterns.filter(
                                 p => p.skillLevel.toLowerCase() === skillLevelFilter.toLowerCase()
                             );
                             yield* Display.showInfo(`Filtered to ${skillLevelFilter}: ${patterns.length} patterns`);
                         }

                        // Generate README content
                        const sections: string[] = [];
                        sections.push("# Effect Patterns by Skill Level\n");

                        const levels = ["beginner", "intermediate", "advanced"];
                        for (const level of levels) {
                            const levelPatterns = patterns.filter(
                                p => p.skillLevel.toLowerCase() === level
                            );

                            if (levelPatterns.length > 0) {
                                const emoji = level === "beginner" ? "🟢" :
                                    level === "intermediate" ? "🟡" : "🟠";
                                sections.push(`## ${emoji} ${level.charAt(0).toUpperCase() + level.slice(1)}\n`);

                                for (const p of levelPatterns) {
                                    sections.push(`- **${p.title}**: ${p.summary}`);
                                }
                                sections.push("");
                            }
                        }

                        const fs = yield* FileSystem.FileSystem;
                        const output = "content/published/skills/README.md";
                        yield* fs.makeDirectory("content/published/skills", { recursive: true });
                        yield* fs.writeFileString(output, sections.join("\n"));

                        yield* Display.showInfo(`\nGenerated README with ${patterns.length} patterns`);
                        yield* Display.showInfo(`Output: ${output}`);
                    }),
                    ({ close }) => Effect.promise(() => close())
                );

                yield* Display.showSuccess(MESSAGES.SUCCESS.README_GENERATED);
            })
        )
    );

/**
 * Compose all skills commands into a single command group
 */
export const skillsCommand = Command.make("skills").pipe(
    Command.withDescription("AI skills generation and management"),
    Command.withSubcommands([
        skillsGenerateCommand,
        skillsSkillGeneratorCommand,
        skillsGenerateReadmeCommand,
    ])
);
