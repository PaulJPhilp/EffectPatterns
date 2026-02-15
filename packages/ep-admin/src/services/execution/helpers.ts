/**
 * Execution service helpers
 */

import { Console, Effect } from "effect";
import { spawn } from "node:child_process";
import { ExecutionError } from "./errors.js";
import type { ExecutionOptions } from "./types.js";

type ProgressSignal = {
	readonly isTTY: boolean;
	readonly ci?: string;
	readonly term?: string;
};

const isTruthyEnvFlag = (value: string | undefined): boolean => {
	if (!value) return false;
	const normalized = value.trim().toLowerCase();
	return normalized !== "0" && normalized !== "false" && normalized !== "no";
};

export const shouldRenderProgress = (
	options?: ExecutionOptions,
	signal: ProgressSignal = {
		isTTY: Boolean(process.stdout.isTTY),
		ci: process.env.CI,
		term: process.env.TERM,
	}
): boolean => {
	if (options?.verbose) return false;
	if (!signal.isTTY) return false;
	if (isTruthyEnvFlag(signal.ci)) return false;
	if (signal.term?.toLowerCase() === "dumb") return false;
	return true;
};

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
 * Wrap any Effect with a console spinner
 * Shows progress messages before and after the effect execution.
 */
export const withSpinner = <A, E, R>(
	message: string,
	effect: Effect.Effect<A, E, R>,
	options?: ExecutionOptions
): Effect.Effect<A, E, R> => {
	if (!shouldRenderProgress(options)) {
		return effect;
	}

	const showStart = Console.log(`⣾ ${message}...`);
	const showEnd = Console.log(`✓ ${message} completed`);

	return showStart.pipe(
		Effect.andThen(() => effect),
		Effect.andThen((result) => showEnd.pipe(Effect.map(() => result)))
	);
};
