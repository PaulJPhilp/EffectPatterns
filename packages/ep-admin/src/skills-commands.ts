/**
 * Skills generation commands for ep-admin
 *
 * Orchestrates AI skills generation for different platforms:
 * - generate: Generate all skills
 * - generate-skills: Generate Claude skills
 * - skill-generator: Interactive skill generator
 * - generate-readme: Generate README by skill and use-case
 */

import { Command, Options } from "@effect/cli";
import { Effect } from "effect";
import * as path from "node:path";
import { showSuccess } from "./services/display.js";
import { executeScriptWithTUI } from "./services/execution.js";

const PROJECT_ROOT = process.cwd();

/**
 * skills:generate - Generate all skills
 */
export const skillsGenerateCommand = Command.make("generate", {
    options: {
        verbose: Options.boolean("verbose").pipe(
            Options.withAlias("v"),
            Options.withDescription("Show detailed generation output"),
            Options.withDefault(false)
        ),
        format: Options.choice("format", ["json", "markdown", "yaml"]).pipe(
            Options.withDescription("Output format"),
            Options.withDefault("json" as const)
        ),
    },
}).pipe(
    Command.withDescription(
        "Generate AI skills from patterns for all platforms"
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* executeScriptWithTUI(
                path.join(PROJECT_ROOT, "scripts/generate-skills.ts"),
                "Generating skills",
                { verbose: options.verbose }
            );

            yield* showSuccess("Skills generated successfully!");
        }) as any
    )
);

/**
 * skills:skill-generator - Interactive skill generator
 */
export const skillsSkillGeneratorCommand = Command.make("skill-generator", {
    options: {
        verbose: Options.boolean("verbose").pipe(
            Options.withAlias("v"),
            Options.withDescription("Show detailed output"),
            Options.withDefault(false)
        ),
    },
}).pipe(
    Command.withDescription(
        "Interactive generator for creating individual skills from patterns"
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* executeScriptWithTUI(
                path.join(PROJECT_ROOT, "scripts/skill-generator.ts"),
                "Running skill generator",
                { verbose: options.verbose }
            );

            yield* showSuccess("Skill generation completed!");
        }) as any
    )
);

/**
 * skills:generate-readme - Generate README by skill/usecase
 */
export const skillsGenerateReadmeCommand = Command.make("generate-readme", {
    options: {
        verbose: Options.boolean("verbose").pipe(
            Options.withAlias("v"),
            Options.withDescription("Show detailed generation output"),
            Options.withDefault(false)
        ),
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
}).pipe(
    Command.withDescription(
        "Generate README organized by skill level and use case"
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* executeScriptWithTUI(
                path.join(PROJECT_ROOT, "scripts/generate_readme_by_skill_usecase.ts"),
                "Generating README",
                {
                    verbose: options.verbose,
                    ...(options.skillLevel && { skillLevel: options.skillLevel }),
                    ...(options.useCase && { useCase: options.useCase })
                }
            );

            yield* showSuccess("README generated!");
        }) as any
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
