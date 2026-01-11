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
 *
 * NOTE: These commands run vitest for the respective test suites.
 */

import { Command, Options } from "@effect/cli";
import { Effect } from "effect";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { configureLoggerFromOptions, globalOptions } from "./global-options.js";
import { Display } from "./services/display/index.js";

const execAsync = promisify(exec);

const runVitest = (pattern: string): Effect.Effect<void, Error> =>
    Effect.tryPromise({
        try: async () => {
            await execAsync(`bun run vitest run ${pattern}`, {
                timeout: 120_000,
                maxBuffer: 10 * 1024 * 1024,
            });
        },
        catch: (error) => new Error(`Test failed: ${error}`),
    });

/**
 * test-utils:chat-app - Test chat application
 */
export const testUtilsChatAppCommand = Command.make("chat-app", {
    options: {
        ...globalOptions,
    },
}).pipe(
    Command.withDescription(
        "Test chat application core functionality"
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* configureLoggerFromOptions(options);
            yield* Display.showInfo("Running chat app tests...");

            yield* runVitest("chat");

            yield* Display.showSuccess("Chat app tests passed!");
        }) as any
    )
);

/**
 * test-utils:harness - Run integration test harness
 */
export const testUtilsHarnessCommand = Command.make("harness", {
    options: {
        ...globalOptions,
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
            yield* configureLoggerFromOptions(options);
            yield* Display.showInfo("Running integration test harness...");

            yield* runVitest("integration");

            yield* Display.showSuccess("Integration tests passed!");
        }) as any
    )
);

/**
 * test-utils:harness-cli - Test CLI harness
 */
export const testUtilsHarnessCliCommand = Command.make("harness-cli", {
    options: {
        ...globalOptions,
    },
}).pipe(
    Command.withDescription(
        "Test CLI harness and command parsing"
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* configureLoggerFromOptions(options);
            yield* Display.showInfo("Running CLI harness tests...");

            yield* runVitest("cli");

            yield* Display.showSuccess("CLI harness tests passed!");
        }) as any
    )
);

/**
 * test-utils:llm - Test LLM service
 */
export const testUtilsLlmCommand = Command.make("llm", {
    options: {
        ...globalOptions,
    },
}).pipe(
    Command.withDescription(
        "Test LLM service integration and API calls"
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* configureLoggerFromOptions(options);
            yield* Display.showInfo("Running LLM service tests...");

            yield* runVitest("llm");

            yield* Display.showSuccess("LLM service tests passed!");
        }) as any
    )
);

/**
 * test-utils:models - Test ML models
 */
export const testUtilsModelsCommand = Command.make("models", {
    options: {
        ...globalOptions,
    },
}).pipe(
    Command.withDescription(
        "Test machine learning models and predictions"
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* configureLoggerFromOptions(options);
            yield* Display.showInfo("Running ML model tests...");

            yield* runVitest("models");

            yield* Display.showSuccess("ML model tests passed!");
        }) as any
    )
);

/**
 * test-utils:patterns - Test pattern system
 */
export const testUtilsPatternsCommand = Command.make("patterns", {
    options: {
        ...globalOptions,
    },
}).pipe(
    Command.withDescription(
        "Test pattern system loading and validation"
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* configureLoggerFromOptions(options);
            yield* Display.showInfo("Running pattern system tests...");

            yield* runVitest("patterns");

            yield* Display.showSuccess("Pattern system tests passed!");
        }) as any
    )
);

/**
 * test-utils:supermemory - Test supermemory integration
 */
export const testUtilsSupermemoryCommand = Command.make("supermemory", {
    options: {
        ...globalOptions,
    },
}).pipe(
    Command.withDescription(
        "Test supermemory integration and memory operations"
    ),
    Command.withHandler(({ options }) =>
        Effect.gen(function* () {
            yield* configureLoggerFromOptions(options);
            yield* Display.showInfo("Running supermemory tests...");

            yield* runVitest("supermemory");

            yield* Display.showSuccess("Supermemory tests passed!");
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
