/**
 * Test command for Execution service
 */

import { Command } from "@effect/cli";
import { Console, Effect } from "effect";
import { Execution } from "./services/execution/index.js";

/**
 * Test execution command
 */
export const testExecutionCommand = Command.make("test-execution", {
	options: {},
	args: {},
}).pipe(
	Command.withDescription("Test the Execution service"),
	Command.withHandler(() =>
		Effect.gen(function* () {
			const execution = yield* Execution;

			yield* Console.log("Testing Execution service...");

			// Test withSpinner
			const result = yield* execution.withSpinner(
				"Test task",
				Effect.succeed("test result"),
				{ verbose: false }
			);

			yield* Console.log(`WithSpinner result: ${result}`);

			// Test executeScriptCapture
			const output = yield* execution.executeScriptCapture(
				"./test-script.ts",
				{ verbose: true }
			);

			yield* Console.log(`Script output: ${output}`);

			yield* Console.log("Execution service test completed successfully!");
		})
	)
);
