/**
 * Execution service helpers
 */

import { Console, Effect } from "effect";
import { spawn } from "node:child_process";
import { ExecutionError } from "./errors.js";
import type { ExecutionOptions } from "./types.js";

// Import TUI spinner if available
let spinnerEffectTUI: any = null;
let InkService: any = null;

try {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const tuiModule = require("effect-cli-tui");
	spinnerEffectTUI = tuiModule.spinnerEffect;
	InkService = tuiModule.InkService;
} catch {
	// TUI not available, will use console fallback
}

/**
 * Convert child process spawn to Effect
 * Returns void on success, Error on failure
 */
export const spawnEffect = (
	scriptPath: string,
	options?: ExecutionOptions
): Effect.Effect<void, ExecutionError> =>
	Effect.async<void, ExecutionError>((resume) => {
		const child = spawn("bun", ["run", scriptPath], {
			stdio: options?.verbose ? "inherit" : ["ignore", "pipe", "pipe"],
			shell: true,
			timeout: options?.timeout,
		});

		let output = "";

		if (!options?.verbose) {
			child.stdout?.on("data", (data) => {
				output += data.toString();
			});
			child.stderr?.on("data", (data) => {
				output += data.toString();
			});
		}

		child.on("error", (error) => {
			resume(
				Effect.fail(
					ExecutionError.make(
						error.message,
						output || undefined,
						error
					)
				)
			);
		});

		child.on("exit", (code) => {
			if (code === 0) {
				resume(Effect.succeed(void 0));
			} else {
				const error = ExecutionError.make(
					`Script exited with code ${code}`,
					output || undefined
				);
				resume(Effect.fail(error));
			}
		});
	});

/**
 * Get TUI spinner effect if available
 */
export const getTUISpinner = () => {
	return { spinnerEffectTUI, InkService };
};

/**
 * Wrap any Effect with a console spinner
 * Shows progress messages before and after the effect execution.
 */
export const withSpinner = <A, E, R>(
	message: string,
	effect: Effect.Effect<A, E, R>,
	_options?: ExecutionOptions
): Effect.Effect<A, E, R> => {
	const showStart = Console.log(`⣾ ${message}...`);
	const showEnd = Console.log(`✓ ${message} completed`);

	return showStart.pipe(
		Effect.andThen(() => effect),
		Effect.andThen((result) => showEnd.pipe(Effect.map(() => result)))
	);
};
