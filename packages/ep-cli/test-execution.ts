#!/usr/bin/env bun

/**
 * Simple test of ep-cli Execution service
 */

import { Console, Effect } from "effect";
import { runtimeLayer } from "./dist/index.js";
import { Execution } from "./dist/services/execution/index.js";

const testProgram = Effect.gen(function* () {
	const execution = yield* Execution;

	yield* Console.log("Testing ep-cli Execution service...");

	// Test withSpinner
	const result = yield* execution.withSpinner(
		"Test task",
		Effect.succeed("test result"),
		{ verbose: false }
	);

	yield* Console.log(`WithSpinner result: ${result}`);

	yield* Console.log("ep-cli Execution service test completed successfully!");
});

// Run the test
Effect.runPromise(
	Effect.provide(testProgram, runtimeLayer)
).catch(console.error);
