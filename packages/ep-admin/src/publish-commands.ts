/**
 * Publish-related commands for ep-admin
 *
 * Orchestrates the pattern publishing pipeline:
 * - validate: Check pattern structure and content
 * - test: Run TypeScript examples
 * - publish: Move patterns to published directory
 * - generate: Create README and rules documentation
 * - pipeline: Full workflow (validate → test → publish → generate)
 */

import { Command, Options } from "@effect/cli";
import { Effect } from "effect";
import * as path from "node:path";
import {
	MESSAGES,
	SCRIPTS,
	STEP_NAMES,
	TASK_NAMES,
} from "./constants.js";
import { configureLoggerFromOptions, globalOptions } from "./global-options.js";
import { Display } from "./services/display/index.js";
import { Execution } from "./services/execution/index.js";

const PROJECT_ROOT = process.cwd();

/**
 * Helper to run a script with proper error logging
 */
const runScript = (
    scriptPath: string,
    taskName: string,
    stepName: string,
    options: { verbose?: boolean }
) =>
    Execution.executeScriptWithTUI(scriptPath, taskName, options).pipe(
        Effect.tapError((error) =>
            Display.showError(`Step '${stepName}' failed: ${error.message}`)
        )
    );

/**
 * publish:validate - Validate patterns before publishing
 */
export const publishValidateCommand = Command.make("validate", {
    options: {
        ...globalOptions,
        pattern: Options.optional(
            Options.text("pattern").pipe(
                Options.withDescription("Validate specific pattern only")
            )
        ),
    },
}).pipe(
    Command.withDescription(
        "Validate all patterns for correctness and consistency before publishing."
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* configureLoggerFromOptions(options);

            yield* runScript(
                path.join(PROJECT_ROOT, SCRIPTS.PUBLISH.VALIDATE),
                TASK_NAMES.VALIDATING_PATTERNS,
                STEP_NAMES.VALIDATE,
                { verbose: options.verbose }
            );

            yield* Display.showSuccess(MESSAGES.SUCCESS.PATTERNS_VALIDATED);
        }) as any
    )
);

/**
 * publish:test - Run TypeScript examples in patterns
 */
export const publishTestCommand = Command.make("test", {
    options: {
        ...globalOptions,
        pattern: Options.optional(
            Options.text("pattern").pipe(
                Options.withDescription("Test specific pattern only")
            )
        ),
    },
}).pipe(
    Command.withDescription(
        "Run all TypeScript examples to ensure patterns execute correctly."
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* configureLoggerFromOptions(options);

            yield* runScript(
                path.join(PROJECT_ROOT, SCRIPTS.PUBLISH.TEST),
                TASK_NAMES.RUNNING_TYPESCRIPT_EXAMPLES,
                STEP_NAMES.TEST,
                { verbose: options.verbose }
            );

            yield* Display.showSuccess(MESSAGES.SUCCESS.ALL_EXAMPLES_PASSED);
        }) as any
    )
);

/**
 * publish:publish - Publish patterns to content/published
 */
export const publishPublishCommand = Command.make("publish", {
    options: {
        ...globalOptions,
        pattern: Options.optional(
            Options.text("pattern").pipe(
                Options.withDescription("Publish specific pattern only")
            )
        ),
        force: Options.boolean("force").pipe(
            Options.withAlias("f"),
            Options.withDescription("Overwrite existing published patterns"),
            Options.withDefault(false)
        ),
    },
}).pipe(
    Command.withDescription(
        "Publish validated patterns to content/published directory."
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* configureLoggerFromOptions(options);

            yield* runScript(
                path.join(PROJECT_ROOT, SCRIPTS.PUBLISH.PUBLISH),
                TASK_NAMES.PUBLISH_PATTERNS,
                STEP_NAMES.PUBLISH,
                { verbose: options.verbose }
            );

            yield* Display.showSuccess(MESSAGES.SUCCESS.PATTERNS_PUBLISHED);
        }) as any
    )
);

/**
 * publish:generate - Generate README and rules documentation
 */
export const publishGenerateCommand = Command.make("generate", {
    options: {
        ...globalOptions,
        readme: Options.boolean("readme").pipe(
            Options.withDescription("Generate README only"),
            Options.withDefault(false)
        ),
        rules: Options.boolean("rules").pipe(
            Options.withDescription("Generate rules only"),
            Options.withDefault(false)
        ),
    },
}).pipe(
    Command.withDescription(
        "Generate documentation files (README, rules, etc.) from published patterns."
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* configureLoggerFromOptions(options);

            const generateReadme =
                options.readme || (!options.readme && !options.rules);
            const generateRules =
                options.rules || (!options.readme && !options.rules);

            if (generateReadme) {
                yield* runScript(
                    path.join(PROJECT_ROOT, SCRIPTS.PUBLISH.GENERATE),
                    TASK_NAMES.GENERATING_README,
                    STEP_NAMES.GENERATE_README,
                    { verbose: options.verbose }
                );
            }

            if (generateRules) {
                yield* runScript(
                    path.join(PROJECT_ROOT, SCRIPTS.PUBLISH.RULES),
                    "Generating rules",
                    STEP_NAMES.GENERATE_RULES,
                    { verbose: options.verbose }
                );
            }

            yield* Display.showSuccess(MESSAGES.SUCCESS.DOCUMENTATION_GENERATED);
        }) as any
    )
);

/**
 * publish:lint - Lint patterns for Effect-TS best practices
 */
export const publishLintCommand = Command.make("lint", {
    options: {
        ...globalOptions,
        fix: Options.boolean("fix").pipe(
            Options.withDescription("Automatically fix linting issues"),
            Options.withDefault(false)
        ),
    },
}).pipe(
    Command.withDescription(
        "Lint patterns for Effect-TS idioms and best practices."
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* configureLoggerFromOptions(options);

            yield* runScript(
                path.join(PROJECT_ROOT, SCRIPTS.PUBLISH.LINT),
                "Linting patterns",
                STEP_NAMES.LINT,
                { verbose: options.verbose }
            );

            yield* Display.showSuccess(MESSAGES.SUCCESS.LINTING_COMPLETE);
        }) as any
    )
);

/**
 * publish:pipeline - Run full publishing pipeline
 */
export const publishPipelineCommand = Command.make("pipeline", {
    options: {
        ...globalOptions,
        skipValidation: Options.boolean("skip-validation").pipe(
            Options.withDescription("Skip validation step"),
            Options.withDefault(false)
        ),
        skipTests: Options.boolean("skip-tests").pipe(
            Options.withDescription("Skip test execution"),
            Options.withDefault(false)
        ),
    },
}).pipe(
    Command.withDescription(
        "Run the complete pattern publishing pipeline (validate → test → publish → generate)."
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* configureLoggerFromOptions(options);

            yield* Display.showInfo(MESSAGES.INFO.STARTING_PIPELINE);

            yield* runScript(
                path.join(PROJECT_ROOT, SCRIPTS.PUBLISH.PIPELINE),
                TASK_NAMES.PUBLISHING_PIPELINE,
                STEP_NAMES.PIPELINE,
                { verbose: options.verbose }
            );

            yield* Display.showSuccess(MESSAGES.SUCCESS.PIPELINE_COMPLETED);
        }) as any
    )
);

/**
 * Main publish command group
 */
export const publishCommand = Command.make("publish").pipe(
    Command.withDescription(
        "Pattern publishing workflow: validate, test, publish, and generate documentation"
    ),
    Command.withSubcommands([
        publishValidateCommand,
        publishTestCommand,
        publishPublishCommand,
        publishGenerateCommand,
        publishLintCommand,
        publishPipelineCommand,
    ])
);
