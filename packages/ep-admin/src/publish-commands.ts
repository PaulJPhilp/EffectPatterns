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
import { showError, showInfo, showSuccess } from "./services/display.js";
import { executeScriptWithTUI } from "./services/execution.js";

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
    executeScriptWithTUI(scriptPath, taskName, options).pipe(
        Effect.tapError((error) =>
            showError(`Step '${stepName}' failed: ${error.message}`)
        )
    );

/**
 * publish:validate - Validate patterns before publishing
 */
export const publishValidateCommand = Command.make("validate", {
    options: {
        verbose: Options.boolean("verbose").pipe(
            Options.withAlias("v"),
            Options.withDescription("Show detailed validation output"),
            Options.withDefault(false)
        ),
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
            yield* runScript(
                path.join(PROJECT_ROOT, "scripts/publish/validate-improved.ts"),
                "Validating patterns",
                "validate",
                { verbose: options.verbose }
            );

            yield* showSuccess("All patterns validated successfully!");
        }) as any
    )
);

/**
 * publish:test - Run TypeScript examples in patterns
 */
export const publishTestCommand = Command.make("test", {
    options: {
        verbose: Options.boolean("verbose").pipe(
            Options.withAlias("v"),
            Options.withDescription("Show detailed test output"),
            Options.withDefault(false)
        ),
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
            yield* runScript(
                path.join(PROJECT_ROOT, "scripts/publish/test-improved.ts"),
                "Running TypeScript examples",
                "test",
                { verbose: options.verbose }
            );

            yield* showSuccess("All pattern examples passed!");
        }) as any
    )
);

/**
 * publish:publish - Publish patterns to content/published
 */
export const publishPublishCommand = Command.make("publish", {
    options: {
        verbose: Options.boolean("verbose").pipe(
            Options.withAlias("v"),
            Options.withDescription("Show detailed output"),
            Options.withDefault(false)
        ),
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
            yield* runScript(
                path.join(PROJECT_ROOT, "scripts/publish/publish.ts"),
                "Publishing patterns",
                "publish",
                { verbose: options.verbose }
            );

            yield* showSuccess("Patterns published successfully!");
        }) as any
    )
);

/**
 * publish:generate - Generate README and rules documentation
 */
export const publishGenerateCommand = Command.make("generate", {
    options: {
        verbose: Options.boolean("verbose").pipe(
            Options.withAlias("v"),
            Options.withDescription("Show detailed generation output"),
            Options.withDefault(false)
        ),
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
            const generateReadme =
                options.readme || (!options.readme && !options.rules);
            const generateRules =
                options.rules || (!options.readme && !options.rules);

            if (generateReadme) {
                yield* runScript(
                    path.join(PROJECT_ROOT, "scripts/publish/generate.ts"),
                    "Generating README",
                    "generate-readme",
                    { verbose: options.verbose }
                );
            }

            if (generateRules) {
                yield* runScript(
                    path.join(PROJECT_ROOT, "scripts/publish/rules-improved.ts"),
                    "Generating rules",
                    "generate-rules",
                    { verbose: options.verbose }
                );
            }

            yield* showSuccess("Documentation generated successfully!");
        }) as any
    )
);

/**
 * publish:lint - Lint patterns for Effect-TS best practices
 */
export const publishLintCommand = Command.make("lint", {
    options: {
        verbose: Options.boolean("verbose").pipe(
            Options.withAlias("v"),
            Options.withDescription("Show detailed linting output"),
            Options.withDefault(false)
        ),
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
            yield* runScript(
                path.join(PROJECT_ROOT, "scripts/publish/lint-effect-patterns.ts"),
                "Linting patterns",
                "lint",
                { verbose: options.verbose }
            );

            yield* showSuccess("Linting complete!");
        }) as any
    )
);

/**
 * publish:pipeline - Run full publishing pipeline
 */
export const publishPipelineCommand = Command.make("pipeline", {
    options: {
        verbose: Options.boolean("verbose").pipe(
            Options.withAlias("v"),
            Options.withDescription("Show detailed output from each step"),
            Options.withDefault(false)
        ),
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
            yield* showInfo("Starting publishing pipeline...");

            yield* runScript(
                path.join(PROJECT_ROOT, "scripts/publish/pipeline.ts"),
                "Publishing pipeline",
                "pipeline",
                { verbose: options.verbose }
            );

            yield* showSuccess("Publishing pipeline completed successfully!");
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
