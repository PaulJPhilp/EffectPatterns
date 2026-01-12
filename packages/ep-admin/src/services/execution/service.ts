/**
 * Execution service implementation
 */

import { Console, Effect, Option as Opt } from "effect";
import { spawn } from "node:child_process";
import type { ExecutionService } from "./api.js";
import { ExecutionError, ScriptExecutionError } from "./errors.js";
import { getTUISpinner, spawnEffect, withSpinner } from "./helpers.js";
import type { ExecutionOptions } from "./types.js";

/**
 * Execution service using Effect.Service pattern
 */
export class Execution extends Effect.Service<Execution>()("Execution", {
	accessors: true,
	effect: Effect.gen(function* () {
		const executeScriptWithTUI: ExecutionService["executeScriptWithTUI"] = (
			scriptPath: string,
			taskName: string,
			options?: ExecutionOptions
		) =>
			Effect.gen(function* () {
				const task = spawnEffect(scriptPath, options);
				const { spinnerEffectTUI, InkService } = getTUISpinner();

				// Try to use TUI spinner if available
				if (InkService && spinnerEffectTUI) {
					const maybeInk = yield* Effect.serviceOption(InkService as any);
					if (Opt.isSome(maybeInk) && !options?.verbose) {
						// Use TUI spinner
						yield* Effect.promise(() =>
							(spinnerEffectTUI as any)(taskName, task, {
								type: "dots",
								color: "cyan",
							})
						);
						return;
					}
				}

				// Fallback to console with ora-style output
				if (!options?.verbose) {
					yield* Console.log(`⣾ ${taskName}...`);
				}

				yield* task.pipe(
					Effect.catchAll((error) => {
						// Enhance error with script output if available
						if (error instanceof ExecutionError && error.scriptOutput) {
							const msg = `${error.message}\n\nScript output:\n${error.scriptOutput}`;
							return Effect.fail(
								ExecutionError.make(msg, error.scriptOutput, error)
							);
						}
						if (error instanceof ExecutionError) {
							return Effect.fail(error);
						}
						return Effect.fail(
							ExecutionError.make(String(error), undefined, error)
						);
					})
				);

				if (!options?.verbose) {
					yield* Console.log(`✓ ${taskName} completed`);
				}
			});

		const executeScriptCapture: ExecutionService["executeScriptCapture"] = (
			scriptPath: string,
			options?: ExecutionOptions
		) =>
			Effect.async<string, ScriptExecutionError>((resume) => {
				const child = spawn("bun", ["run", scriptPath], {
					stdio: ["ignore", "pipe", "pipe"],
					shell: true,
					timeout: options?.timeout,
				});

				let output = "";
				let errorOutput = "";

				child.stdout?.on("data", (data) => {
					output += data.toString();
				});

				child.stderr?.on("data", (data) => {
					errorOutput += data.toString();
				});

				child.on("error", (error) => {
					resume(
						Effect.fail(
							ScriptExecutionError.make(
								error.message,
								1,
								errorOutput || undefined
							)
						)
					);
				});

				child.on("exit", (code) => {
					if (code === 0) {
						resume(Effect.succeed(output));
					} else {
						resume(
							Effect.fail(
								ScriptExecutionError.make(
									`Script exited with code ${code}`,
									code ?? 1,
									errorOutput || undefined
								)
							)
						);
					}
				});
			});

		const executeScriptStream: ExecutionService["executeScriptStream"] = (
			scriptPath: string,
			options?: ExecutionOptions
		) =>
			Effect.async<void, ExecutionError>((resume) => {
				const child = spawn("bun", ["run", scriptPath], {
					stdio: "inherit",
					shell: true,
					timeout: options?.timeout,
				});

				child.on("error", (error) => {
					resume(
						Effect.fail(ExecutionError.make(error.message, undefined, error))
					);
				});

				child.on("exit", (code) => {
					if (code === 0) {
						resume(Effect.succeed(void 0));
					} else {
						resume(
							Effect.fail(
								ExecutionError.make(`Script exited with code ${code}`)
							)
						);
					}
				});
			});

		const withSpinnerMethod: ExecutionService["withSpinner"] = <A, E, R>(
			message: string,
			effect: Effect.Effect<A, E, R>,
			options?: ExecutionOptions
		) => withSpinner(message, effect, options);

		return {
			executeScriptWithTUI,
			executeScriptCapture,
			executeScriptStream,
			withSpinner: withSpinnerMethod,
		};
	}),
}) { }
