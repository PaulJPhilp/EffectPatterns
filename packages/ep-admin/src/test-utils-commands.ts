/**
 * Test utility commands for ep-admin
 *
 * Orchestrates integration and component testing:
 * - test-chat-app: Test chat application core
 * - test-harness: Run integration test harness
 * - test-harness-cli: Test harness for CLI
 * - test-llm: Test LLM service integration
 * - test-models: Test ML models
 * - test-patterns: Test pattern system
 * - test-supermemory: Test supermemory integration
 */

import { Command, Options } from "@effect/cli";
import { Effect } from "effect";
import * as path from "node:path";
import { showSuccess } from "./services/display.js";
import { executeScriptWithTUI } from "./services/execution.js";

const PROJECT_ROOT = process.cwd();

/**
 * test-utils:chat-app - Test chat application
 */
export const testUtilsChatAppCommand = Command.make("chat-app", {
    options: {
        verbose: Options.boolean("verbose").pipe(
            Options.withAlias("v"),
            Options.withDescription("Show detailed test output"),
            Options.withDefault(false)
        ),
    },
}).pipe(
    Command.withDescription(
        "Test chat application core functionality"
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* executeScriptWithTUI(
                path.join(PROJECT_ROOT, "scripts/test-chat-app-core.ts"),
                "Testing chat application",
                { verbose: options.verbose }
            );

            yield* showSuccess("Chat app tests passed!");
        }) as any
    )
);

/**
 * test-utils:harness - Run integration test harness
 */
export const testUtilsHarnessCommand = Command.make("harness", {
    options: {
        verbose: Options.boolean("verbose").pipe(
            Options.withAlias("v"),
            Options.withDescription("Show detailed test output"),
            Options.withDefault(false)
        ),
        suite: Options.optional(
            Options.text("suite").pipe(
                Options.withDescription("Specific test suite to run")
            )
        ),
    },
}).pipe(
    Command.withDescription(
        "Run integration test harness with all tests"
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* executeScriptWithTUI(
                path.join(PROJECT_ROOT, "scripts/test-harness.ts"),
                "Running integration tests",
                { verbose: options.verbose }
            );

            yield* showSuccess("Integration tests passed!");
        }) as any
    )
);

/**
 * test-utils:harness-cli - Test CLI harness
 */
export const testUtilsHarnessCliCommand = Command.make("harness-cli", {
    options: {
        verbose: Options.boolean("verbose").pipe(
            Options.withAlias("v"),
            Options.withDescription("Show detailed test output"),
            Options.withDefault(false)
        ),
    },
}).pipe(
    Command.withDescription(
        "Test CLI harness and command parsing"
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* executeScriptWithTUI(
                path.join(PROJECT_ROOT, "scripts/test-harness-cli.ts"),
                "Testing CLI harness",
                { verbose: options.verbose }
            );

            yield* showSuccess("CLI harness tests passed!");
        }) as any
    )
);

/**
 * test-utils:llm - Test LLM service
 */
export const testUtilsLlmCommand = Command.make("llm", {
    options: {
        verbose: Options.boolean("verbose").pipe(
            Options.withAlias("v"),
            Options.withDescription("Show detailed test output"),
            Options.withDefault(false)
        ),
    },
}).pipe(
    Command.withDescription(
        "Test LLM service integration and API calls"
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* executeScriptWithTUI(
                path.join(PROJECT_ROOT, "scripts/test-llm-service.ts"),
                "Testing LLM service",
                { verbose: options.verbose }
            );

            yield* showSuccess("LLM service tests passed!");
        }) as any
    )
);

/**
 * test-utils:models - Test ML models
 */
export const testUtilsModelsCommand = Command.make("models", {
    options: {
        verbose: Options.boolean("verbose").pipe(
            Options.withAlias("v"),
            Options.withDescription("Show detailed test output"),
            Options.withDefault(false)
        ),
    },
}).pipe(
    Command.withDescription(
        "Test machine learning models and predictions"
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* executeScriptWithTUI(
                path.join(PROJECT_ROOT, "scripts/test-models.ts"),
                "Testing ML models",
                { verbose: options.verbose }
            );

            yield* showSuccess("ML model tests passed!");
        }) as any
    )
);

/**
 * test-utils:patterns - Test pattern system
 */
export const testUtilsPatternsCommand = Command.make("patterns", {
    options: {
        verbose: Options.boolean("verbose").pipe(
            Options.withAlias("v"),
            Options.withDescription("Show detailed test output"),
            Options.withDefault(false)
        ),
    },
}).pipe(
    Command.withDescription(
        "Test pattern system loading and validation"
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* executeScriptWithTUI(
                path.join(PROJECT_ROOT, "scripts/test-patterns.ts"),
                "Testing pattern system",
                { verbose: options.verbose }
            );

            yield* showSuccess("Pattern system tests passed!");
        }) as any
    )
);

/**
 * test-utils:supermemory - Test supermemory integration
 */
export const testUtilsSupermemoryCommand = Command.make("supermemory", {
    options: {
        verbose: Options.boolean("verbose").pipe(
            Options.withAlias("v"),
            Options.withDescription("Show detailed test output"),
            Options.withDefault(false)
        ),
    },
}).pipe(
    Command.withDescription(
        "Test supermemory integration and memory operations"
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* executeScriptWithTUI(
                path.join(PROJECT_ROOT, "scripts/test-supermemory.ts"),
                "Testing supermemory",
                { verbose: options.verbose }
            );

            yield* showSuccess("Supermemory tests passed!");
        }) as any
    )
);

/**
 * Compose all test utility commands into a single command group
 */
export const testUtilsCommand = Command.make("test-utils").pipe(
    Command.withDescription("Integration and component testing utilities"),
    Command.withSubcommands([
        testUtilsChatAppCommand,
        testUtilsHarnessCommand,
        testUtilsHarnessCliCommand,
        testUtilsLlmCommand,
        testUtilsModelsCommand,
        testUtilsPatternsCommand,
        testUtilsSupermemoryCommand,
    ])
);
