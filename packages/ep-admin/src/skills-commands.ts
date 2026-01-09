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
import {
	MESSAGES,
	SCRIPTS,
	TASK_NAMES,
} from "./constants.js";
import { configureLoggerFromOptions, globalOptions } from "./global-options.js";
import { Display } from "./services/display/index.js";
import { Execution } from "./services/execution/index.js";

const PROJECT_ROOT = process.cwd();

/**
 * skills:generate - Generate all skills
 */
export const skillsGenerateCommand = Command.make("generate", {
    options: {
        ...globalOptions,
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
            yield* configureLoggerFromOptions(options);

            yield* Execution.executeScriptWithTUI(
                path.join(PROJECT_ROOT, SCRIPTS.SKILLS.GENERATE),
                TASK_NAMES.GENERATING_SKILLS,
                { verbose: options.verbose }
            );

            yield* Display.showSuccess(MESSAGES.SUCCESS.SKILLS_GENERATED);
        }) as any
    )
);

/**
 * skills:skill-generator - Interactive skill generator
 */
export const skillsSkillGeneratorCommand = Command.make("skill-generator", {
    options: {
        ...globalOptions,
    },
}).pipe(
    Command.withDescription(
        "Interactive generator for creating individual skills from patterns"
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* configureLoggerFromOptions(options);

            yield* Execution.executeScriptWithTUI(
                path.join(PROJECT_ROOT, SCRIPTS.SKILLS.GENERATOR),
                TASK_NAMES.RUNNING_SKILL_GENERATOR,
                { verbose: options.verbose }
            );

            yield* Display.showSuccess(MESSAGES.SUCCESS.SKILL_GENERATION_COMPLETED);
        }) as any
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
}).pipe(
    Command.withDescription(
        "Generate README organized by skill level and use case"
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* configureLoggerFromOptions(options);

            yield* Execution.executeScriptWithTUI(
                path.join(PROJECT_ROOT, SCRIPTS.SKILLS.GENERATE_README),
                TASK_NAMES.GENERATING_README_SKILLS,
                {
                    verbose: options.verbose,
                    ...(options.skillLevel && { skillLevel: options.skillLevel }),
                    ...(options.useCase && { useCase: options.useCase })
                }
            );

            yield* Display.showSuccess(MESSAGES.SUCCESS.README_GENERATED);
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
