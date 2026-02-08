#!/usr/bin/env bun

/**
 * Simple test of Execution service
 */

import { Console, Effect } from "effect";
import { ProductionLayer } from "./dist/runtime/production.js";
import { Execution } from "./dist/services/execution/index.js";

const testProgram = Effect.gen(function* () {
	const execution = yield* Execution;

	yield* Console.log("Testing Execution service...");

	// Test withSpinner
	const result = yield* execution.withSpinner(
		"Test task",
		Effect.succeed("test result"),
		{ verbose: false }
	);

	yield* Console.log(`WithSpinner result: ${result}`);

	yield* Console.log("Execution service test completed successfully!");
});

// Run the test
Effect.runPromise(
	Effect.provide(testProgram, ProductionLayer) as Effect.Effect<void>
).catch(console.error);
